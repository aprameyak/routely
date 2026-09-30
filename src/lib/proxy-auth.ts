import { authorizePayment } from "./payments";

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
  const result = await authorizePayment({
    userId: input.userId,
    amountCents: input.amountCents,
    merchant: input.merchant,
    category: input.category,
    mcc: input.mcc,
    isOnline: input.isOnline,
    autoSettle: input.autoSettle,
    idempotencyKey: input.idempotencyKey,
  });

  const card = result.decision.selectedCard;
  const approved = Boolean(card) && result.transaction?.status !== "declined";

  if (!result.transaction) {
    throw Object.assign(new Error("Authorization produced no transaction"), { status: 500 });
  }

  return {
    approved,
    proxy: {
      last4: result.proxy.virtualLast4,
      walletStatus: result.proxy.walletStatus ?? "none",
      status: result.proxy.status,
      label: result.proxy.label,
    },
    transaction: result.transaction,
    selectedCard: card
      ? {
          id: card.id,
          nickname: card.nickname,
          brand: card.brand,
          last4: card.last4,
          color: card.color,
        }
      : null,
    reason: result.decision.reason,
    rewardsEarned: result.decision.rewardsEarned,
    multiplierUsed: result.decision.multiplierUsed,
    decision: result.decision,
    replayed: result.replayed,
  };
}
