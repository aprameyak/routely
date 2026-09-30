import { destroySession, hashPassword, requireUser, verifyPassword } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { clientIp, handleApiError, jsonError, jsonOk } from "@/lib/api";
import { prisma } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import { z } from "zod";
export async function GET() {
    try {
        const user = await requireUser();
        const full = await prisma.user.findUniqueOrThrow({
            where: { id: user.id },
            select: {
                id: true,
                email: true,
                name: true,
                createdAt: true,
                _count: {
                    select: { cards: true, rules: true, transactions: true, sessions: true, auditLogs: true },
                },
            },
        });
        return jsonOk({ user: full });
    }
    catch (err) {
        return handleApiError(err);
    }
}
const passwordSchema = z.object({
    currentPassword: z.string().min(1),
    newPassword: z
        .string()
        .min(10)
        .max(128)
        .regex(/[A-Za-z]/)
        .regex(/[0-9]/),
});
const profileSchema = z.object({
    name: z.string().trim().min(1).max(80).optional(),
});
export async function PATCH(req: Request) {
    try {
        const user = await requireUser();
        const ip = clientIp(req) ?? "unknown";
        const rl = rateLimit(`settings:${user.id}:${ip}`, 20, 60000);
        if (!rl.ok)
            return jsonError("Too many requests", 429);
        const raw = await req.json();
        if (raw.currentPassword || raw.newPassword) {
            const body = passwordSchema.parse(raw);
            const record = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
            const ok = await verifyPassword(body.currentPassword, record.passwordHash);
            if (!ok)
                return jsonError("Current password is incorrect", 401);
            const passwordHash = await hashPassword(body.newPassword);
            await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });
            await prisma.session.deleteMany({ where: { userId: user.id } });
            await audit("auth.password_change", { userId: user.id, ip });
            return jsonOk({ ok: true, reauth: true });
        }
        const body = profileSchema.parse(raw);
        const updated = await prisma.user.update({
            where: { id: user.id },
            data: { name: body.name },
            select: { id: true, email: true, name: true },
        });
        await audit("user.profile_update", { userId: user.id, ip });
        return jsonOk({ user: updated });
    }
    catch (err) {
        return handleApiError(err);
    }
}
export async function DELETE(req: Request) {
    try {
        const user = await requireUser();
        const confirm = z.object({ confirmEmail: z.email() }).parse(await req.json());
        if (confirm.confirmEmail.toLowerCase() !== user.email.toLowerCase()) {
            return jsonError("Email confirmation mismatch", 400);
        }
        await audit("user.delete", { userId: user.id, ip: clientIp(req) });
        await prisma.user.delete({ where: { id: user.id } });
        await destroySession();
        return jsonOk({ ok: true });
    }
    catch (err) {
        return handleApiError(err);
    }
}
