import { requireUser } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { clientIp, handleApiError, jsonError, jsonOk } from "@/lib/api";
import { authorizePayment, IdempotencyConflictError, } from "@/lib/payments";
import { paySchema } from "@/lib/validators";
import { rateLimit } from "@/lib/rate-limit";
import { z } from "zod";
const routeBody = paySchema.extend({
    idempotencyKey: z.string().min(8).max(128).optional(),
    autoSettle: z.boolean().optional(),
});
export async function POST(req: Request) {
    try {
        const user = await requireUser();
        const ip = clientIp(req) ?? "unknown";
        const rl = rateLimit(`route:${user.id}:${ip}`, 60, 60000);
        if (!rl.ok) {
            return jsonError("Too many requests", 429, { retryAfterMs: rl.retryAfterMs });
        }
        const body = routeBody.parse(await req.json());
        const result = await authorizePayment({
            userId: user.id,
            amountCents: body.amountCents,
            merchant: body.merchant,
            category: body.category,
            mcc: body.mcc,
            isOnline: body.isOnline,
            dryRun: body.dryRun,
            idempotencyKey: body.idempotencyKey,
            autoSettle: body.autoSettle,
        });
        if (!body.dryRun && !result.replayed) {
            await audit("payment.authorize", {
                userId: user.id,
                resource: "transaction",
                resourceId: result.transaction?.id,
                meta: {
                    amountCents: body.amountCents,
                    merchant: body.merchant,
                    status: result.transaction?.status,
                    cardId: result.transaction?.cardId,
                },
                ip,
            });
        }
        return jsonOk({
            dryRun: !!body.dryRun,
            replayed: !!result.replayed,
            proxy: result.proxy,
            decision: {
                reason: result.decision.reason,
                strategy: result.decision.detail.strategy,
                rewardsEarned: result.decision.rewardsEarned,
                multiplierUsed: result.decision.multiplierUsed,
                declinedReason: result.decision.declinedReason,
                selectedCard: result.decision.selectedCard
                    ? {
                        id: result.decision.selectedCard.id,
                        nickname: result.decision.selectedCard.nickname,
                        brand: result.decision.selectedCard.brand,
                        last4: result.decision.selectedCard.last4,
                        color: result.decision.selectedCard.color,
                    }
                    : null,
                scores: result.decision.detail.scores,
            },
            transaction: result.transaction ?? null,
        });
    }
    catch (err) {
        if (err instanceof IdempotencyConflictError) {
            return jsonError(err.message, 409);
        }
        return handleApiError(err);
    }
}
