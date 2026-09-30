import { requireUser } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { clientIp, handleApiError, jsonError, jsonOk } from "@/lib/api";
import { reverseTransaction, settleTransaction } from "@/lib/payments";
import { z } from "zod";
type Params = {
    params: Promise<{
        id: string;
    }>;
};
const actionSchema = z.object({
    action: z.enum(["settle", "reverse"]),
});
export async function PATCH(req: Request, { params }: Params) {
    try {
        const user = await requireUser();
        const { id } = await params;
        const body = actionSchema.parse(await req.json());
        if (body.action === "settle") {
            const result = await settleTransaction(user.id, id);
            if ("error" in result) {
                if (result.error === "not_found")
                    return jsonError("Transaction not found", 404);
                return jsonError(`Cannot settle transaction in state ${result.status}`, 409);
            }
            await audit("payment.settle", {
                userId: user.id,
                resource: "transaction",
                resourceId: id,
                ip: clientIp(req),
            });
            return jsonOk({ transaction: result.transaction });
        }
        const result = await reverseTransaction(user.id, id);
        if ("error" in result) {
            if (result.error === "not_found")
                return jsonError("Transaction not found", 404);
            return jsonError(`Cannot reverse transaction in state ${result.status}`, 409);
        }
        await audit("payment.reverse", {
            userId: user.id,
            resource: "transaction",
            resourceId: id,
            ip: clientIp(req),
        });
        return jsonOk({ transaction: result.transaction });
    }
    catch (err) {
        return handleApiError(err);
    }
}
