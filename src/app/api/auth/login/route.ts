import { createSession, verifyPassword } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { clientIp, handleApiError, jsonError, jsonOk } from "@/lib/api";
import { prisma } from "@/lib/db";
import { loginSchema } from "@/lib/validators";
import { rateLimit } from "@/lib/rate-limit";
export async function POST(req: Request) {
    try {
        const ip = clientIp(req) ?? "direct";
        const rl = rateLimit(`login:${ip}`, 10, 60000);
        if (!rl.ok) {
            return jsonError("Too many login attempts. Try again shortly.", 429, {
                retryAfterMs: rl.retryAfterMs,
            });
        }
        const body = loginSchema.parse(await req.json());
        const user = await prisma.user.findUnique({ where: { email: body.email.toLowerCase() } });
        if (!user)
            return jsonError("Invalid email or password", 401);
        const valid = await verifyPassword(body.password, user.passwordHash);
        if (!valid)
            return jsonError("Invalid email or password", 401);
        await createSession(user.id, {
            userAgent: req.headers.get("user-agent") ?? undefined,
            ip,
        });
        await audit("auth.login", { userId: user.id, ip });
        return jsonOk({ user: { id: user.id, email: user.email, name: user.name } });
    }
    catch (err) {
        return handleApiError(err);
    }
}
