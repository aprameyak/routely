import { requireUser } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { clientIp, handleApiError, jsonError, jsonOk } from "@/lib/api";
import { ensureProxyCard, provisionWallet, publicProxyView, revealProxySecrets, setProxyStatus } from "@/lib/proxy";
import { authorizeProxyCharge } from "@/lib/proxy-auth";
import { z } from "zod";
import { rateLimit } from "@/lib/rate-limit";

export async function GET() {
  try {
    const user = await requireUser();
    const proxy = await ensureProxyCard(user.id);
    return jsonOk({ proxy: publicProxyView(proxy) });
  } catch (err) {
    return handleApiError(err);
  }
}

const patchSchema = z.object({
  status: z.enum(["active", "frozen", "revoked"]).optional(),
  walletPlatform: z.enum(["apple", "google"]).optional(),
  action: z.enum(["provision_wallet", "reveal"]).optional(),
});

export async function PATCH(req: Request) {
  try {
    const user = await requireUser();
    const ip = clientIp(req) ?? "direct";
    const body = patchSchema.parse(await req.json());

    if (body.action === "reveal") {
      const rl = rateLimit(`proxy-reveal:${user.id}`, 5, 60_000);
      if (!rl.ok) return jsonError("Too many reveal attempts", 429);
      const secrets = await revealProxySecrets(user.id);
      await audit("proxy.reveal", {
        userId: user.id,
        resource: "proxy",
        ip,
        meta: { mode: secrets.mode },
      });
      return jsonOk({ secrets });
    }

    if (body.action === "provision_wallet") {
      if (!body.walletPlatform) return jsonError("walletPlatform required", 400);
      const proxy = await provisionWallet(user.id, body.walletPlatform);
      await audit("proxy.wallet_provision", {
        userId: user.id,
        resource: "proxy",
        resourceId: proxy.id,
        ip,
        meta: { platform: body.walletPlatform },
      });
      return jsonOk({
        proxy: publicProxyView(proxy),
        nextSteps:
          body.walletPlatform === "apple"
            ? {
                title: "Apple Wallet",
                body: "In production, Routely provisions via an issuing partner (MDES). In this build, your Routely card is marked wallet-ready; use Reveal to copy sandbox card details for testing, or connect Stripe Issuing for live virtual cards.",
              }
            : {
                title: "Google Wallet",
                body: "Marked as Google Wallet provisioned for this account. Connect an issuer for live NFC / wallet tokens.",
              },
      });
    }

    if (body.status) {
      const proxy = await setProxyStatus(user.id, body.status);
      await audit("proxy.status", {
        userId: user.id,
        resource: "proxy",
        resourceId: proxy.id,
        meta: { status: body.status },
        ip,
      });
      return jsonOk({ proxy: publicProxyView(proxy) });
    }

    return jsonError("No changes requested", 400);
  } catch (err) {
    return handleApiError(err);
  }
}

const authSchema = z.object({
  amountCents: z.number().int().positive().max(10_000_000),
  merchant: z.string().trim().min(1).max(120),
  category: z
    .enum([
      "grocery",
      "dining",
      "travel",
      "gas",
      "online",
      "entertainment",
      "streaming",
      "pharmacy",
      "utilities",
      "other",
    ])
    .optional(),
  mcc: z.string().regex(/^\d{4}$/).optional(),
  isOnline: z.boolean().optional(),
  autoSettle: z.boolean().optional(),
  idempotencyKey: z.string().min(8).max(128).optional(),
});

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const ip = clientIp(req) ?? "direct";
    const rl = rateLimit(`proxy-auth:${user.id}:${ip}`, 60, 60_000);
    if (!rl.ok) return jsonError("Too many requests", 429);

    const body = authSchema.parse(await req.json());
    const result = await authorizeProxyCharge({
      userId: user.id,
      amountCents: body.amountCents,
      merchant: body.merchant,
      category: body.category,
      mcc: body.mcc,
      isOnline: body.isOnline,
      autoSettle: body.autoSettle ?? true,
      idempotencyKey: body.idempotencyKey,
    });

    await audit("proxy.authorize", {
      userId: user.id,
      resource: "transaction",
      resourceId: result.transaction.id,
      meta: {
        approved: result.approved,
        merchant: body.merchant,
        amountCents: body.amountCents,
        cardId: result.selectedCard?.id,
      },
      ip,
    });

    return jsonOk({
      approved: result.approved,
      reason: result.reason,
      proxy: result.proxy,
      selectedCard: result.selectedCard,
      rewardsEarned: result.rewardsEarned ?? 0,
      multiplierUsed: result.multiplierUsed ?? 0,
      transaction: {
        id: result.transaction.id,
        status: result.transaction.status,
        amountCents: result.transaction.amountCents,
        merchant: result.transaction.merchant,
        category: result.transaction.category,
      },
      scores: result.decision?.detail.scores ?? [],
    });
  } catch (err) {
    return handleApiError(err);
  }
}
