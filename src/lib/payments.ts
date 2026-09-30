import { createHash } from "crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "./db";
import { categoryFromMcc, type CategoryId } from "./categories";
import { routePayment, type RouteDecision } from "./router";
import { ensureProxyCard } from "./cards";

export type PayInput = {
  userId: string;
  amountCents: number;
  merchant: string;
  category?: string;
  mcc?: string;
  isOnline?: boolean;
  dryRun?: boolean;
  idempotencyKey?: string;
  autoSettle?: boolean;
};

export type PayResult = {
  decision: RouteDecision;
  transaction?: {
    id: string;
    status: string;
    amountCents: number;
    merchant: string;
    category: string;
    rewardsEarned: number;
    multiplierUsed: number;
    routingReason: string;
    cardId: string | null;
    cardNickname?: string;
  };
  proxy: { status: string; virtualLast4: string; label: string };
  replayed?: boolean;
};

const PENDING = "__pending__";

function monthBounds(at = new Date()) {
  const start = new Date(at.getFullYear(), at.getMonth(), 1);
  const end = new Date(at.getFullYear(), at.getMonth() + 1, 1);
  return { start, end };
}

export async function getMonthlySpendMap(userId: string, at = new Date()) {
  const { start, end } = monthBounds(at);
  const rows = await prisma.transaction.findMany({
    where: {
      userId,
      createdAt: { gte: start, lt: end },
      status: { in: ["authorized", "settled"] },
      cardId: { not: null },
    },
    select: { cardId: true, category: true, amountCents: true },
  });
  const map: Record<string, number> = {};
  for (const row of rows) {
    if (!row.cardId) continue;
    const key = `${row.cardId}:${row.category}`;
    map[key] = (map[key] ?? 0) + row.amountCents;
  }
  return map;
}

function hashRequest(input: PayInput): string {
  return createHash("sha256")
    .update(
      JSON.stringify({
        amountCents: input.amountCents,
        merchant: input.merchant,
        category: input.category,
        mcc: input.mcc,
        isOnline: input.isOnline,
        dryRun: input.dryRun,
        autoSettle: input.autoSettle,
      })
    )
    .digest("hex");
}

export class IdempotencyConflictError extends Error {
  status = 409;
  constructor(message = "Idempotency key reused with different payload") {
    super(message);
    this.name = "IdempotencyConflictError";
  }
}

export class IdempotencyInProgressError extends Error {
  status = 409;
  constructor() {
    super("A request with this idempotency key is already in progress");
    this.name = "IdempotencyInProgressError";
  }
}

async function claimIdempotent(
  userId: string,
  key: string,
  requestHash: string
): Promise<"claimed" | PayResult> {
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 24);

  try {
    await prisma.idempotencyKey.create({
      data: {
        userId,
        key,
        requestHash,
        responseJson: PENDING,
        expiresAt,
      },
    });
    return "claimed";
  } catch (err) {
    if (!(err instanceof Prisma.PrismaClientKnownRequestError) || err.code !== "P2002") {
      throw err;
    }
  }

  const existing = await prisma.idempotencyKey.findUnique({
    where: { userId_key: { userId, key } },
  });
  if (!existing) {
    throw new IdempotencyConflictError("Idempotency race — retry");
  }
  if (existing.expiresAt < new Date()) {
    await prisma.idempotencyKey.delete({ where: { id: existing.id } });
    return claimIdempotent(userId, key, requestHash);
  }
  if (existing.requestHash !== requestHash) {
    throw new IdempotencyConflictError();
  }
  if (existing.responseJson === PENDING) {
    throw new IdempotencyInProgressError();
  }
  return JSON.parse(existing.responseJson) as PayResult;
}

async function completeIdempotent(userId: string, key: string, result: PayResult) {
  await prisma.idempotencyKey.update({
    where: { userId_key: { userId, key } },
    data: { responseJson: JSON.stringify(result) },
  });
}

function toTxView(
  tx: {
    id: string;
    status: string;
    amountCents: number;
    merchant: string;
    category: string;
    rewardsEarned: number;
    multiplierUsed: number;
    routingReason: string;
    cardId: string | null;
  },
  cardNickname?: string
) {
  return {
    id: tx.id,
    status: tx.status,
    amountCents: tx.amountCents,
    merchant: tx.merchant,
    category: tx.category,
    rewardsEarned: tx.rewardsEarned,
    multiplierUsed: tx.multiplierUsed,
    routingReason: tx.routingReason,
    cardId: tx.cardId,
    cardNickname,
  };
}

export async function authorizePayment(input: PayInput): Promise<PayResult> {
  const requestHash = hashRequest(input);
  let claimedKey: string | null = null;

  if (input.idempotencyKey && !input.dryRun) {
    const claim = await claimIdempotent(input.userId, input.idempotencyKey, requestHash);
    if (claim !== "claimed") {
      return { ...claim, replayed: true };
    }
    claimedKey = input.idempotencyKey;
  }

  try {
    const proxy = await ensureProxyCard(input.userId);
    const category = (input.category ?? categoryFromMcc(input.mcc)) as CategoryId;

    if (proxy.status !== "active" && !input.dryRun) {
      const decision: RouteDecision = {
        selectedCard: null,
        reason: `Proxy card is ${proxy.status}`,
        detail: { appliedRuleIds: [], scores: [], strategy: "declined" },
        rewardsEarned: 0,
        multiplierUsed: 0,
        declinedReason: `Proxy ${proxy.status}`,
      };
      const tx = await prisma.transaction.create({
        data: {
          userId: input.userId,
          amountCents: input.amountCents,
          merchant: input.merchant,
          category,
          mcc: input.mcc,
          isOnline: input.isOnline ?? true,
          status: "declined",
          routingReason: decision.reason,
          routingDetail: JSON.stringify(decision.detail),
          declinedReason: decision.declinedReason,
          proxyUsed: true,
          idempotencyKey: input.idempotencyKey,
        },
      });
      const result: PayResult = {
        decision,
        transaction: toTxView(tx),
        proxy: { status: proxy.status, virtualLast4: proxy.virtualLast4, label: proxy.label },
      };
      if (claimedKey) await completeIdempotent(input.userId, claimedKey, result);
      return result;
    }

    const [cards, rules, monthlySpend] = await Promise.all([
      prisma.card.findMany({
        where: { userId: input.userId },
        include: { rewards: true },
      }),
      prisma.rule.findMany({ where: { userId: input.userId } }),
      getMonthlySpendMap(input.userId),
    ]);

    const decision = routePayment(cards, rules, {
      amountCents: input.amountCents,
      merchant: input.merchant,
      category,
      mcc: input.mcc,
      isOnline: input.isOnline ?? true,
      monthlySpendByCardCategory: monthlySpend,
    });

    if (input.dryRun) {
      return {
        decision,
        proxy: { status: proxy.status, virtualLast4: proxy.virtualLast4, label: proxy.label },
      };
    }

    if (!decision.selectedCard) {
      const tx = await prisma.transaction.create({
        data: {
          userId: input.userId,
          amountCents: input.amountCents,
          merchant: input.merchant,
          category,
          mcc: input.mcc,
          isOnline: input.isOnline ?? true,
          status: "declined",
          routingReason: decision.reason,
          routingDetail: JSON.stringify(decision.detail),
          declinedReason: decision.declinedReason,
          proxyUsed: true,
          idempotencyKey: input.idempotencyKey,
        },
      });
      const result: PayResult = {
        decision,
        transaction: toTxView(tx),
        proxy: { status: proxy.status, virtualLast4: proxy.virtualLast4, label: proxy.label },
      };
      if (claimedKey) await completeIdempotent(input.userId, claimedKey, result);
      return result;
    }

    const card = decision.selectedCard;
    const amount = input.amountCents / 100;
    const status = input.autoSettle ? "settled" : "authorized";
    const settledAt = input.autoSettle ? new Date() : null;

    const [tx] = await prisma.$transaction([
      prisma.transaction.create({
        data: {
          userId: input.userId,
          cardId: card.id,
          amountCents: input.amountCents,
          merchant: input.merchant,
          category,
          mcc: input.mcc,
          isOnline: input.isOnline ?? true,
          status,
          routingReason: decision.reason,
          routingDetail: JSON.stringify(decision.detail),
          rewardsEarned: decision.rewardsEarned,
          multiplierUsed: decision.multiplierUsed,
          proxyUsed: true,
          idempotencyKey: input.idempotencyKey,
          settledAt,
        },
      }),
      prisma.card.update({
        where: { id: card.id },
        data: { currentBalance: { increment: amount } },
      }),
    ]);

    const result: PayResult = {
      decision,
      transaction: toTxView(tx, card.nickname),
      proxy: { status: proxy.status, virtualLast4: proxy.virtualLast4, label: proxy.label },
    };
    if (claimedKey) await completeIdempotent(input.userId, claimedKey, result);
    return result;
  } catch (err) {
    if (claimedKey) {
      await prisma.idempotencyKey.deleteMany({
        where: { userId: input.userId, key: claimedKey, responseJson: PENDING },
      });
    }
    throw err;
  }
}

export async function settleTransaction(userId: string, transactionId: string) {
  const tx = await prisma.transaction.findFirst({
    where: { id: transactionId, userId },
  });
  if (!tx) return { error: "not_found" as const };
  if (tx.status !== "authorized") return { error: "invalid_state" as const, status: tx.status };
  const updated = await prisma.transaction.update({
    where: { id: tx.id },
    data: { status: "settled", settledAt: new Date() },
    include: { card: { select: { nickname: true, last4: true } } },
  });
  return { transaction: updated };
}

export async function reverseTransaction(userId: string, transactionId: string) {
  const tx = await prisma.transaction.findFirst({
    where: { id: transactionId, userId },
  });
  if (!tx) return { error: "not_found" as const };
  if (tx.status !== "authorized" && tx.status !== "settled") {
    return { error: "invalid_state" as const, status: tx.status };
  }
  const amount = tx.amountCents / 100;
  const updated = await prisma.$transaction(async (db) => {
    if (tx.cardId) {
      await db.card.update({
        where: { id: tx.cardId },
        data: { currentBalance: { decrement: amount } },
      });
    }
    return db.transaction.update({
      where: { id: tx.id },
      data: { status: "reversed" },
      include: { card: { select: { nickname: true, last4: true } } },
    });
  });
  return { transaction: updated };
}
