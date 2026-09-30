import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { AuthError } from "./auth";
import { env } from "./env";
export function jsonOk<T>(data: T, init?: ResponseInit) {
    return NextResponse.json(data, { status: 200, ...init });
}
export function jsonCreated<T>(data: T) {
    return NextResponse.json(data, { status: 201 });
}
export function jsonError(message: string, status = 400, extra?: Record<string, unknown>) {
    return NextResponse.json({ error: message, ...extra }, { status });
}
export function handleApiError(err: unknown) {
    if (err instanceof AuthError) {
        return jsonError(err.message, 401);
    }
    if (err instanceof ZodError) {
        return jsonError("Validation failed", 400, {
            issues: err.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
        });
    }
    if (err &&
        typeof err === "object" &&
        "status" in err &&
        typeof (err as {
            status: unknown;
        }).status === "number") {
        const e = err as unknown as Error & {
            status: number;
        };
        return jsonError(e.message || "Request failed", e.status);
    }
    console.error(err);
    return jsonError("Internal server error", 500);
}
export function clientIp(req: Request): string | undefined {
    if (env.trustProxy) {
        return (req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
            req.headers.get("x-real-ip") ||
            undefined);
    }
    return undefined;
}
export function rateLimitKey(prefix: string, req: Request, userId?: string): string {
    const ip = clientIp(req) ?? "direct";
    return userId ? `${prefix}:${userId}:${ip}` : `${prefix}:${ip}`;
}
