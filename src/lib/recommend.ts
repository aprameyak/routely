import { prisma } from "./db";
import { categoryFromMcc, type CategoryId } from "./categories";
import { resolveMerchant } from "./merchants";
import { routePayment } from "./router";
import { getMonthlySpendMap } from "./payments";

export type RecommendInput = {
  userId: string;
  merchant: string;
  category?: string;
  amountCents?: number;
  isOnline?: boolean;
  save?: boolean;
};

export async function recommendCard(input: RecommendInput) {
  const resolved = resolveMerchant(input.merchant);
  const category = (input.category ?? resolved.category ?? categoryFromMcc(resolved.mcc)) as CategoryId;
  const isOnline = input.isOnline ?? resolved.isOnline;
  const amountCents = input.amountCents && input.amountCents > 0 ? input.amountCents : 10000;

  const [cards, rules, monthlySpend] = await Promise.all([
    prisma.card.findMany({
      where: { userId: input.userId },
      include: { rewards: true },
    }),
    prisma.rule.findMany({ where: { userId: input.userId } }),
    getMonthlySpendMap(input.userId),
  ]);

  const decision = routePayment(cards, rules, {
    amountCents,
    merchant: resolved.merchant,
    category,
    mcc: resolved.mcc,
    isOnline,
    monthlySpendByCardCategory: monthlySpend,
  });

  const selected = decision.selectedCard
    ? {
        id: decision.selectedCard.id,
        nickname: decision.selectedCard.nickname,
        brand: decision.selectedCard.brand,
        last4: decision.selectedCard.last4,
        color: decision.selectedCard.color,
      }
    : null;

  let savedId: string | null = null;
  if (input.save !== false) {
    const row = await prisma.decision.create({
      data: {
        userId: input.userId,
        merchant: resolved.merchant,
        category,
        amountCents: input.amountCents ?? null,
        isOnline,
        cardId: selected?.id,
        cardNickname: selected?.nickname,
        cardLast4: selected?.last4,
        cardBrand: selected?.brand,
        cardColor: selected?.color,
        multiplierUsed: decision.multiplierUsed,
        rewardsEstimated: decision.rewardsEarned,
        routingReason: decision.reason,
        routingDetail: JSON.stringify(decision.detail),
      },
    });
    savedId = row.id;
  }

  const runners = decision.detail.scores
    .filter((s) => !s.excluded && s.cardId !== selected?.id && s.score >= 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  return {
    decisionId: savedId,
    merchant: resolved.merchant,
    merchantMatched: resolved.matched,
    category,
    isOnline,
    amountCents: input.amountCents ?? null,
    assumedAmountCents: input.amountCents ? null : amountCents,
    selectedCard: selected,
    reason: decision.reason,
    strategy: decision.detail.strategy,
    multiplierUsed: decision.multiplierUsed,
    rewardsEstimated: decision.rewardsEarned,
    declinedReason: decision.declinedReason,
    runnersUp: runners,
    scores: decision.detail.scores,
    instruction: selected
      ? `Pull your ${selected.nickname} (•••• ${selected.last4})`
      : "No eligible card — check your vault or rules",
  };
}

export async function recentDecisions(userId: string, limit = 12) {
  return prisma.decision.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export async function frequentMerchants(userId: string, limit = 8) {
  const rows = await prisma.decision.groupBy({
    by: ["merchant", "category"],
    where: { userId },
    _count: { merchant: true },
    orderBy: { _count: { merchant: "desc" } },
    take: limit,
  });
  return rows.map((r) => ({
    merchant: r.merchant,
    category: r.category,
    count: r._count.merchant,
  }));
}
