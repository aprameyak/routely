import { getSessionUser } from "@/lib/auth";
import { handleApiError, jsonOk } from "@/lib/api";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
export async function GET() {
    try {
        const started = Date.now();
        await prisma.$queryRaw `SELECT 1`;
        const user = await getSessionUser();
        return jsonOk({
            status: "ok",
            service: "routely",
            env: env.isProd ? "production" : "development",
            dbMs: Date.now() - started,
            authenticated: !!user,
            time: new Date().toISOString(),
        });
    }
    catch (err) {
        return handleApiError(err);
    }
}
