import { requireUser } from "@/lib/auth";
import { handleApiError, jsonOk } from "@/lib/api";
import { prisma } from "@/lib/db";
export async function GET(req: Request) {
    try {
        const user = await requireUser();
        const { searchParams } = new URL(req.url);
        const limit = Math.min(Number(searchParams.get("limit") ?? 100), 500);
        const logs = await prisma.auditLog.findMany({
            where: { userId: user.id },
            orderBy: { createdAt: "desc" },
            take: limit,
            select: {
                id: true,
                action: true,
                resource: true,
                resourceId: true,
                meta: true,
                createdAt: true,
            },
        });
        return jsonOk({
            logs: logs.map((l) => ({
                ...l,
                meta: JSON.parse(l.meta),
            })),
        });
    }
    catch (err) {
        return handleApiError(err);
    }
}
