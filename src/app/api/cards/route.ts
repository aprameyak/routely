import { requireUser } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { clientIp, handleApiError, jsonCreated, jsonOk } from "@/lib/api";
import { createCard, listCards, sanitizeCard } from "@/lib/cards";
import { cardSchema } from "@/lib/validators";
export async function GET() {
    try {
        const user = await requireUser();
        const cards = await listCards(user.id);
        return jsonOk({ cards: cards.map(sanitizeCard) });
    }
    catch (err) {
        return handleApiError(err);
    }
}
export async function POST(req: Request) {
    try {
        const user = await requireUser();
        const body = cardSchema.parse(await req.json());
        const card = await createCard(user.id, body);
        await audit("card.create", {
            userId: user.id,
            resource: "card",
            resourceId: card.id,
            ip: clientIp(req),
            meta: { last4: card.last4, brand: card.brand },
        });
        return jsonCreated({ card: sanitizeCard(card) });
    }
    catch (err) {
        return handleApiError(err);
    }
}
