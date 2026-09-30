import { destroySession, getSessionUser } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { clientIp, handleApiError, jsonOk } from "@/lib/api";
export async function POST(req: Request) {
    try {
        const user = await getSessionUser();
        await destroySession();
        if (user) {
            await audit("auth.logout", { userId: user.id, ip: clientIp(req) });
        }
        return jsonOk({ ok: true });
    }
    catch (err) {
        return handleApiError(err);
    }
}
