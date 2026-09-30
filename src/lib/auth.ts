import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { prisma } from "./db";
import { hashIdentifier } from "./crypto";
import { env } from "./env";
const SESSION_COOKIE = "routely_session";
const SESSION_DAYS = 14;
const BCRYPT_ROUNDS = 12;
function getSecret(): Uint8Array {
    return new TextEncoder().encode(env.AUTH_SECRET);
}
export async function hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, BCRYPT_ROUNDS);
}
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
}
export type SessionUser = {
    id: string;
    email: string;
    name: string;
};
export async function createSession(userId: string, meta?: {
    userAgent?: string;
    ip?: string;
}): Promise<string> {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + SESSION_DAYS);
    const token = await new SignJWT({ sub: userId })
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime(`${SESSION_DAYS}d`)
        .setJti(crypto.randomUUID())
        .sign(getSecret());
    await prisma.session.create({
        data: {
            userId,
            token,
            expiresAt,
            userAgent: meta?.userAgent?.slice(0, 256),
            ipHash: meta?.ip ? hashIdentifier(meta.ip) : null,
        },
    });
    const jar = await cookies();
    jar.set(SESSION_COOKIE, token, {
        httpOnly: true,
        secure: env.isProd,
        sameSite: "lax",
        path: "/",
        expires: expiresAt,
    });
    return token;
}
export async function destroySession(): Promise<void> {
    const jar = await cookies();
    const token = jar.get(SESSION_COOKIE)?.value;
    if (token) {
        await prisma.session.deleteMany({ where: { token } });
        jar.delete(SESSION_COOKIE);
    }
}
export async function getSessionUser(): Promise<SessionUser | null> {
    const jar = await cookies();
    const token = jar.get(SESSION_COOKIE)?.value;
    if (!token)
        return null;
    try {
        const { payload } = await jwtVerify(token, getSecret());
        const userId = payload.sub;
        if (!userId)
            return null;
        const session = await prisma.session.findUnique({
            where: { token },
            include: { user: { select: { id: true, email: true, name: true } } },
        });
        if (!session || session.expiresAt < new Date()) {
            if (session)
                await prisma.session.delete({ where: { id: session.id } });
            return null;
        }
        return session.user;
    }
    catch {
        return null;
    }
}
export async function requireUser(): Promise<SessionUser> {
    const user = await getSessionUser();
    if (!user) {
        throw new AuthError("Unauthorized");
    }
    return user;
}
export class AuthError extends Error {
    status = 401;
    constructor(message: string) {
        super(message);
        this.name = "AuthError";
    }
}
