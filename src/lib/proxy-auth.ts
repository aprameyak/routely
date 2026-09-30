import { prisma } from "./db";
import { categoryFromMcc, type CategoryId } from "./categories";
import { resolveMerchant } from "./merchants";
import { routePayment } from "./router";
import { getMonthlySpendMap } from "./payments";
import { ensureProxyCard } from "./proxy";

export type ProxyAuthInput = {
  userId: string;
  amountCents: number;
  merchant: string;
  category?: string;
  mcc?: string;
  isOnline?: boolean;
  autoSettle?: boolean;
  idempotencyKey?: string;
};

export async function authorizeProxyCharge(input: ProxyAuthInput) {
  const proxy = await ensureProxyCard(input.userId);

  if (proxy.status !== "active") {
    const declined = await prisma.transaction.create({
      data: {
        userId: input.userId,
        amountCents: input.amountCents,
        merchant: input.merchant,
        category: input.category ?? resolveMerchant(input.merchant).category,
        mcc: input.mcc,
        isOnline: input.isOnline ?? true,
        status: "declined",
        routingReason: `Proxy ${proxy.status}`,
        routingDetail: "{}",
        declinedReason: `Proxy card is ${proxy.status}`,
        proxyUsed: true,
        idempotencyKey: input.idempotencyKey,
      },
    });
    return {
      approved: false,
      proxy: {
        last4: proxy.virtualLast4,
        walletStatus: proxy.walletStatus,
        status: proxy.status,
      },
      transaction: declined,
      selectedCard: null,
      reason: `Proxy card is ${proxy.status}`,
    };
  }

  const resolved = resolveMerchant(input.merchant);
  const category = (input.category ?? resolved.category ?? categoryFromMcc(input.mcc)) as CategoryId;
  const isOnline = input.isOnline ?? resolved.isOnline;

  const [cards, rules, monthlySpend] = await Promise.all([
    prisma.card.findMany({ where: { userId: input.userId }, include: { rewards: true } }),
    prisma.rule.findMany({ where: { userId: input.userId } }),
    getMonthlySpendMap(input.userId),
  ]);

  const decision = routePayment(cards, rules, {
    amountCents: input.amountCents,
    merchant: resolved.merchant,
    category,
    mcc: input.mcc ?? resolved.mcc,
    isOnline,
    monthlySpendByCardCategory: monthlySpend,
  });

  if (!decision.selectedCard) {
    const declined = await prisma.transaction.create({
      data: {
        userId: input.userId,
        amountCents: input.amountCents,
        merchant: resolved.merchant,
        category,
        mcc: input.mcc ?? resolved.mcc,
        isOnline,
        status: "declined",
        routingReason: decision.reason,
        routingDetail: JSON.stringify(decision.detail),
        declinedReason: decision.declinedReason,
        proxyUsed: true,
        idempotencyKey: input.idempotencyKey,
      },
    });
    return {
      approved: false,
      proxy: {
        last4: proxy.virtualLast4,
        walletStatus: proxy.walletStatus,
        status: proxy.status,
      },
      transaction: declined,
      selectedCard: null,
      reason: decision.reason,
      decision,
    };
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
        merchant: resolved.merchant,
        category,
        mcc: input.mcc ?? resolved.mcc,
        isOnline,
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

  return {
    approved: true,
    proxy: {
      last4: proxy.virtualLast4,
      walletStatus: proxy.walletStatus,
      status: proxy.status,
      label: proxy.label,
    },
    transaction: tx,
    selectedCard: {
      id: card.id,
      nickname: card.nickname,
      brand: card.brand,
      last4: card.last4,
      color: card.color,
    },
    reason: decision.reason,
    rewardsEarned: decision.rewardsEarned,
    multiplierUsed: decision.multiplierUsed,
    decision,
  };
}
