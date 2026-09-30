import { requireUser } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { clientIp, handleApiError, jsonCreated, jsonError, jsonOk } from "@/lib/api";
import { prisma } from "@/lib/db";
import { ruleSchema } from "@/lib/validators";

async function assertOwnedCards(
  userId: string,
  ids: Array<string | null | undefined>
): Promise<string | null> {
  const wanted = [...new Set(ids.filter((id): id is string => !!id))];
  if (wanted.length === 0) return null;
  const count = await prisma.card.count({
    where: { userId, id: { in: wanted } },
  });
  if (count !== wanted.length) return "Rule must reference your own cards";
  return null;
}

export async function GET() {
  try {
    const user = await requireUser();
    const rules = await prisma.rule.findMany({
      where: { userId: user.id },
      orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
      include: {
        forceCard: { select: { id: true, nickname: true, last4: true } },
        preferCard: { select: { id: true, nickname: true, last4: true } },
        excludeCard: { select: { id: true, nickname: true, last4: true } },
      },
    });
    return jsonOk({
      rules: rules.map((r) => ({
        ...r,
        conditions: JSON.parse(r.conditions),
      })),
    });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const body = ruleSchema.parse(await req.json());
    const ownershipError = await assertOwnedCards(user.id, [
      body.forceCardId,
      body.preferCardId,
      body.excludeCardId,
    ]);
    if (ownershipError) return jsonError(ownershipError, 400);

    const rule = await prisma.rule.create({
      data: {
        userId: user.id,
        name: body.name,
        description: body.description ?? null,
        enabled: body.enabled ?? true,
        priority: body.priority ?? 100,
        action: body.action,
        conditions: JSON.stringify(body.conditions),
        forceCardId: body.forceCardId ?? null,
        preferCardId: body.preferCardId ?? null,
        excludeCardId: body.excludeCardId ?? null,
      },
    });
    await audit("rule.create", {
      userId: user.id,
      resource: "rule",
      resourceId: rule.id,
      ip: clientIp(req),
    });
    return jsonCreated({ rule: { ...rule, conditions: body.conditions } });
  } catch (err) {
    return handleApiError(err);
  }
}
