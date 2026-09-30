import { requireUser } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { clientIp, handleApiError, jsonError, jsonOk } from "@/lib/api";
import { deleteCard, sanitizeCard, updateCard } from "@/lib/cards";
import { cardSchema } from "@/lib/validators";
import { z } from "zod";
const patchSchema = cardSchema.partial().extend({
    isActive: z.boolean().optional(),
    currentBalance: z.number().min(0).optional(),
});
type Params = {
    params: Promise<{
        id: string;
    }>;
};
export async function PATCH(req: Request, { params }: Params) {
    try {
        const user = await requireUser();
        const { id } = await params;
        const body = patchSchema.parse(await req.json());
        const card = await updateCard(user.id, id, body);
        if (!card)
            return jsonError("Card not found", 404);
        await audit("card.update", {
            userId: user.id,
            resource: "card",
            resourceId: id,
            ip: clientIp(req),
        });
        return jsonOk({ card: sanitizeCard(card) });
    }
    catch (err) {
        return handleApiError(err);
    }
}
export async function DELETE(req: Request, { params }: Params) {
    try {
        const user = await requireUser();
        const { id } = await params;
        const ok = await deleteCard(user.id, id);
        if (!ok)
            return jsonError("Card not found", 404);
        await audit("card.delete", {
            userId: user.id,
            resource: "card",
            resourceId: id,
            ip: clientIp(req),
        });
        return jsonOk({ ok: true });
    }
    catch (err) {
        return handleApiError(err);
    }
}
