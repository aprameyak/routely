import { requireUser } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { clientIp, handleApiError, jsonOk } from "@/lib/api";
import { ensureProxyCard, setProxyStatus } from "@/lib/cards";
import { z } from "zod";
export async function GET() {
    try {
        const user = await requireUser();
        const proxy = await ensureProxyCard(user.id);
        return jsonOk({
            proxy: {
                id: proxy.id,
                label: proxy.label,
                status: proxy.status,
                virtualLast4: proxy.virtualLast4,
                virtualPrefix: proxy.virtualPrefix,
                displayNumber: `${proxy.virtualPrefix}•• ${proxy.virtualLast4}`,
            },
        });
    }
    catch (err) {
        return handleApiError(err);
    }
}
const statusSchema = z.object({
    status: z.enum(["active", "frozen", "revoked"]),
});
export async function PATCH(req: Request) {
    try {
        const user = await requireUser();
        const body = statusSchema.parse(await req.json());
        const proxy = await setProxyStatus(user.id, body.status);
        await audit("proxy.status", {
            userId: user.id,
            resource: "proxy",
            resourceId: proxy.id,
            meta: { status: body.status },
            ip: clientIp(req),
        });
        return jsonOk({
            proxy: {
                id: proxy.id,
                label: proxy.label,
                status: proxy.status,
                virtualLast4: proxy.virtualLast4,
                virtualPrefix: proxy.virtualPrefix,
                displayNumber: `${proxy.virtualPrefix}•• ${proxy.virtualLast4}`,
            },
        });
    }
    catch (err) {
        return handleApiError(err);
    }
}
