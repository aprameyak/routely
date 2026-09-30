import { requireUser } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { clientIp, handleApiError, jsonError, jsonOk } from "@/lib/api";
import { prisma } from "@/lib/db";
import { rulePatchSchema } from "@/lib/validators";
type Params = {
    params: Promise<{
        id: string;
    }>;
};
export async function PATCH(req: Request, { params }: Params) {
    try {
        const user = await requireUser();
        const { id } = await params;
        const body = rulePatchSchema.parse(await req.json());
        const existing = await prisma.rule.findFirst({ where: { id, userId: user.id } });
        if (!existing)
            return jsonError("Rule not found", 404);
        const rule = await prisma.rule.update({
            where: { id },
            data: {
                name: body.name,
                description: body.description === undefined ? undefined : body.description,
                enabled: body.enabled,
                priority: body.priority,
                action: body.action,
                conditions: body.conditions ? JSON.stringify(body.conditions) : undefined,
                forceCardId: body.forceCardId === undefined ? undefined : body.forceCardId,
                preferCardId: body.preferCardId === undefined ? undefined : body.preferCardId,
                excludeCardId: body.excludeCardId === undefined ? undefined : body.excludeCardId,
            },
        });
        await audit("rule.update", {
            userId: user.id,
            resource: "rule",
            resourceId: id,
            ip: clientIp(req),
        });
        return jsonOk({ rule: { ...rule, conditions: JSON.parse(rule.conditions) } });
    }
    catch (err) {
        return handleApiError(err);
    }
}
export async function DELETE(req: Request, { params }: Params) {
    try {
        const user = await requireUser();
        const { id } = await params;
        const existing = await prisma.rule.findFirst({ where: { id, userId: user.id } });
        if (!existing)
            return jsonError("Rule not found", 404);
        await prisma.rule.delete({ where: { id } });
        await audit("rule.delete", {
            userId: user.id,
            resource: "rule",
            resourceId: id,
            ip: clientIp(req),
        });
        return jsonOk({ ok: true });
    }
    catch (err) {
        return handleApiError(err);
    }
}
