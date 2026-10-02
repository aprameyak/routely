import { createSession, hashPassword } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { clientIp, handleApiError, jsonCreated, jsonError } from "@/lib/api";
import { prisma } from "@/lib/db";
import { ensureProxyCard } from "@/lib/proxy";
import { registerSchema } from "@/lib/validators";
import { rateLimit } from "@/lib/rate-limit";
export async function POST(req: Request) {
    try {
        const ip = clientIp(req) ?? "direct";
        const rl = rateLimit(`register:${ip}`, 5, 60000);
        if (!rl.ok) {
            return jsonError("Too many registrations from this network", 429, {
                retryAfterMs: rl.retryAfterMs,
            });
        }
        const body = registerSchema.parse(await req.json());
        const existing = await prisma.user.findUnique({ where: { email: body.email.toLowerCase() } });
        if (existing)
            return jsonError("Email already registered", 409);
        const passwordHash = await hashPassword(body.password);
        const user = await prisma.user.create({
            data: {
                email: body.email.toLowerCase(),
                name: body.name,
                passwordHash,
            },
        });
        await ensureProxyCard(user.id);
        await createSession(user.id, {
            userAgent: req.headers.get("user-agent") ?? undefined,
            ip,
        });
        await audit("auth.register", { userId: user.id, ip });
        return jsonCreated({ user: { id: user.id, email: user.email, name: user.name } });
    }
    catch (err) {
        return handleApiError(err);
    }
}
