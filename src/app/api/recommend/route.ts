import { requireUser } from "@/lib/auth";
import { clientIp, handleApiError, jsonError, jsonOk } from "@/lib/api";
import { frequentMerchants, recentDecisions, recommendCard } from "@/lib/recommend";
import { searchMerchants } from "@/lib/merchants";
import { z } from "zod";
import { rateLimit } from "@/lib/rate-limit";

const recommendSchema = z.object({
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
  amountCents: z.number().int().positive().max(10_000_000).optional().nullable(),
  isOnline: z.boolean().optional(),
  save: z.boolean().optional(),
});

export async function GET(req: Request) {
  try {
    const user = await requireUser();
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q");

    if (q != null) {
      return jsonOk({ merchants: searchMerchants(q, 10) });
    }

    const [recent, frequent] = await Promise.all([
      recentDecisions(user.id, 10),
      frequentMerchants(user.id, 8),
    ]);

    return jsonOk({ recent, frequent });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const ip = clientIp(req) ?? "direct";
    const rl = rateLimit(`recommend:${user.id}:${ip}`, 120, 60_000);
    if (!rl.ok) {
      return jsonError("Too many requests", 429, { retryAfterMs: rl.retryAfterMs });
    }

    const body = recommendSchema.parse(await req.json());
    const result = await recommendCard({
      userId: user.id,
      merchant: body.merchant,
      category: body.category,
      amountCents: body.amountCents ?? undefined,
      isOnline: body.isOnline,
      save: body.save,
    });

    return jsonOk(result);
  } catch (err) {
    return handleApiError(err);
  }
}
