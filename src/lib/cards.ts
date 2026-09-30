import { prisma } from "./db";
import { createPaymentToken, encrypt, generateVirtualLast4 } from "./crypto";
import type { z } from "zod";
import type { cardSchema } from "./validators";
import { CARD_COLORS } from "./categories";
type CardInput = z.infer<typeof cardSchema>;
export async function listCards(userId: string) {
    return prisma.card.findMany({
        where: { userId },
        include: { rewards: true },
        orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
    });
}
export async function createCard(userId: string, input: CardInput) {
    const token = createPaymentToken(input.brand, input.last4);
    const enc = encrypt(token);
    if (input.isDefault) {
        await prisma.card.updateMany({
            where: { userId },
            data: { isDefault: false },
        });
    }
    const count = await prisma.card.count({ where: { userId } });
    const color = input.color ?? CARD_COLORS[count % CARD_COLORS.length];
    return prisma.card.create({
        data: {
            userId,
            nickname: input.nickname,
            brand: input.brand,
            last4: input.last4,
            tokenCipher: enc.cipher,
            tokenIv: enc.iv,
            tokenTag: enc.tag,
            expiryMonth: input.expiryMonth,
            expiryYear: input.expiryYear,
            color,
            creditLimit: input.creditLimit ?? null,
            isDefault: input.isDefault ?? count === 0,
            rewards: input.rewards?.length
                ? {
                    create: input.rewards.map((r) => ({
                        category: r.category,
                        multiplier: r.multiplier,
                        note: r.note,
                    })),
                }
                : {
                    create: [{ category: "other", multiplier: 1 }],
                },
        },
        include: { rewards: true },
    });
}
export async function updateCard(userId: string, cardId: string, patch: Partial<CardInput> & {
    isActive?: boolean;
    currentBalance?: number;
}) {
    const existing = await prisma.card.findFirst({ where: { id: cardId, userId } });
    if (!existing)
        return null;
    if (patch.isDefault) {
        await prisma.card.updateMany({
            where: { userId },
            data: { isDefault: false },
        });
    }
    if (patch.rewards) {
        await prisma.rewardRate.deleteMany({ where: { cardId } });
    }
    return prisma.card.update({
        where: { id: cardId },
        data: {
            nickname: patch.nickname,
            brand: patch.brand,
            last4: patch.last4,
            expiryMonth: patch.expiryMonth,
            expiryYear: patch.expiryYear,
            color: patch.color,
            creditLimit: patch.creditLimit === undefined ? undefined : patch.creditLimit,
            isDefault: patch.isDefault,
            isActive: patch.isActive,
            currentBalance: patch.currentBalance,
            ...(patch.rewards
                ? {
                    rewards: {
                        create: patch.rewards.map((r) => ({
                            category: r.category,
                            multiplier: r.multiplier,
                            note: r.note,
                        })),
                    },
                }
                : {}),
        },
        include: { rewards: true },
    });
}
export async function deleteCard(userId: string, cardId: string) {
    const existing = await prisma.card.findFirst({ where: { id: cardId, userId } });
    if (!existing)
        return false;
    await prisma.card.delete({ where: { id: cardId } });
    return true;
}
export async function ensureProxyCard(userId: string) {
    const existing = await prisma.proxyCard.findUnique({ where: { userId } });
    if (existing)
        return existing;
    const secret = `proxy_${userId}_${crypto.randomUUID()}`;
    const enc = encrypt(secret);
    return prisma.proxyCard.create({
        data: {
            userId,
            virtualLast4: generateVirtualLast4(),
            credentialCipher: enc.cipher,
            credentialIv: enc.iv,
            credentialTag: enc.tag,
        },
    });
}
export async function setProxyStatus(userId: string, status: "active" | "frozen" | "revoked") {
    await ensureProxyCard(userId);
    return prisma.proxyCard.update({
        where: { userId },
        data: { status },
    });
}
export function sanitizeCard<T extends {
    tokenCipher?: string;
    tokenIv?: string;
    tokenTag?: string;
}>(card: T) {
    const { tokenCipher: _c, tokenIv: _i, tokenTag: _t, ...safe } = card;
    return safe;
}
