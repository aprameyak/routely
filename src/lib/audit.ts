import { prisma } from "./db";
import { hashIdentifier } from "./crypto";
export async function audit(action: string, opts?: {
    userId?: string | null;
    resource?: string;
    resourceId?: string;
    meta?: Record<string, unknown>;
    ip?: string;
}) {
    await prisma.auditLog.create({
        data: {
            action,
            userId: opts?.userId ?? null,
            resource: opts?.resource,
            resourceId: opts?.resourceId,
            meta: JSON.stringify(opts?.meta ?? {}),
            ipHash: opts?.ip ? hashIdentifier(opts.ip) : null,
        },
    });
}
