import { requireUser } from "@/lib/auth";
import { handleApiError, jsonOk } from "@/lib/api";
import { prisma } from "@/lib/db";
export async function GET(req: Request) {
    try {
        const user = await requireUser();
        const { searchParams } = new URL(req.url);
        const limit = Math.min(Number(searchParams.get("limit") ?? 50), 100);
        const transactions = await prisma.transaction.findMany({
            where: { userId: user.id },
            orderBy: { createdAt: "desc" },
            take: limit,
            include: {
                card: { select: { id: true, nickname: true, last4: true, brand: true, color: true } },
            },
        });
        return jsonOk({ transactions });
    }
    catch (err) {
        return handleApiError(err);
    }
}
