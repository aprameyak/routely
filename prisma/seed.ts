import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { createCipheriv, randomBytes } from "crypto";
const prisma = new PrismaClient();
function getKey(): Buffer {
    const hex = process.env.ENCRYPTION_KEY!;
    return Buffer.from(hex, "hex");
}
function encrypt(plaintext: string) {
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", getKey(), iv);
    const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
    const tag = cipher.getAuthTag();
    return {
        cipher: encrypted.toString("base64"),
        iv: iv.toString("base64"),
        tag: tag.toString("base64"),
    };
}
async function main() {
    console.log("Seeding Routely demo data…");
    await prisma.auditLog.deleteMany();
    await prisma.transaction.deleteMany();
    await prisma.rule.deleteMany();
    await prisma.rewardRate.deleteMany();
    await prisma.proxyCard.deleteMany();
    await prisma.session.deleteMany();
    await prisma.card.deleteMany();
    await prisma.user.deleteMany();
    const passwordHash = await bcrypt.hash("DemoPass123!", 12);
    const user = await prisma.user.create({
        data: {
            email: "demo@routely.app",
            name: "Alex Rivera",
            passwordHash,
        },
    });
    function tok(brand: string, last4: string) {
        const enc = encrypt(`tok_${brand}_${last4}_seed`);
        return enc;
    }
    const sapphire = await prisma.card.create({
        data: {
            userId: user.id,
            nickname: "Sapphire Preferred",
            brand: "visa",
            last4: "4242",
            ...(() => {
                const e = tok("visa", "4242");
                return { tokenCipher: e.cipher, tokenIv: e.iv, tokenTag: e.tag };
            })(),
            expiryMonth: 12,
            expiryYear: 2028,
            color: "#1e3a5f",
            isDefault: true,
            creditLimit: 12000,
            currentBalance: 2100,
            rewards: {
                create: [
                    { category: "travel", multiplier: 5, note: "Chase Ultimate Rewards" },
                    { category: "dining", multiplier: 3 },
                    { category: "online", multiplier: 3, note: "Through portal" },
                    { category: "other", multiplier: 1 },
                ],
            },
        },
    });
    const amexGold = await prisma.card.create({
        data: {
            userId: user.id,
            nickname: "Amex Gold",
            brand: "amex",
            last4: "1005",
            ...(() => {
                const e = tok("amex", "1005");
                return { tokenCipher: e.cipher, tokenIv: e.iv, tokenTag: e.tag };
            })(),
            expiryMonth: 8,
            expiryYear: 2027,
            color: "#b45309",
            creditLimit: 15000,
            currentBalance: 4200,
            rewards: {
                create: [
                    { category: "dining", multiplier: 4 },
                    { category: "grocery", multiplier: 4, note: "Up to $25k/year (~monthly tracked)", capCents: 208333 },
                    { category: "travel", multiplier: 3 },
                    { category: "other", multiplier: 1 },
                ],
            },
        },
    });
    const freedom = await prisma.card.create({
        data: {
            userId: user.id,
            nickname: "Freedom Flex",
            brand: "mastercard",
            last4: "5555",
            ...(() => {
                const e = tok("mastercard", "5555");
                return { tokenCipher: e.cipher, tokenIv: e.iv, tokenTag: e.tag };
            })(),
            expiryMonth: 3,
            expiryYear: 2029,
            color: "#0f766e",
            creditLimit: 8000,
            currentBalance: 900,
            rewards: {
                create: [
                    { category: "gas", multiplier: 5, isRotating: true, note: "Q current: gas" },
                    { category: "grocery", multiplier: 5, isRotating: true },
                    { category: "dining", multiplier: 3 },
                    { category: "other", multiplier: 1 },
                ],
            },
        },
    });
    const doubleCash = await prisma.card.create({
        data: {
            userId: user.id,
            nickname: "Double Cash",
            brand: "mastercard",
            last4: "8888",
            ...(() => {
                const e = tok("mastercard", "8888");
                return { tokenCipher: e.cipher, tokenIv: e.iv, tokenTag: e.tag };
            })(),
            expiryMonth: 6,
            expiryYear: 2028,
            color: "#171717",
            creditLimit: 10000,
            currentBalance: 1500,
            rewards: {
                create: [{ category: "other", multiplier: 2, note: "Flat 2% everywhere" }],
            },
        },
    });
    await prisma.rule.createMany({
        data: [
            {
                userId: user.id,
                name: "Always Amex for restaurants",
                description: "Force Gold on dining to hit the credit",
                action: "force",
                priority: 200,
                conditions: JSON.stringify({ categories: ["dining"] }),
                forceCardId: amexGold.id,
            },
            {
                userId: user.id,
                name: "Prefer Flex at the pump",
                description: "Boost Freedom Flex for gas while 5% is active",
                action: "prefer",
                priority: 150,
                conditions: JSON.stringify({ categories: ["gas"] }),
                preferCardId: freedom.id,
            },
            {
                userId: user.id,
                name: "Skip Sapphire for big online carts",
                description: "Exclude Sapphire over $500 online — use Double Cash instead",
                action: "exclude",
                priority: 120,
                conditions: JSON.stringify({ categories: ["online"], minAmount: 500, onlineOnly: true }),
                excludeCardId: sapphire.id,
            },
        ],
    });
    const proxyEnc = encrypt(`proxy_${user.id}_seed`);
    await prisma.proxyCard.create({
        data: {
            userId: user.id,
            virtualLast4: "9012",
            virtualPrefix: "4000 00",
            credentialCipher: proxyEnc.cipher,
            credentialIv: proxyEnc.iv,
            credentialTag: proxyEnc.tag,
            status: "active",
        },
    });
    await prisma.transaction.createMany({
        data: [
            {
                userId: user.id,
                cardId: amexGold.id,
                amountCents: 6840,
                merchant: "Osteria Verde",
                category: "dining",
                isOnline: false,
                status: "settled",
                routingReason: "Forced by rule “Always Amex for restaurants”",
                routingDetail: "{}",
                rewardsEarned: 273.6,
                multiplierUsed: 4,
                settledAt: new Date(),
            },
            {
                userId: user.id,
                cardId: freedom.id,
                amountCents: 4520,
                merchant: "Shell #4421",
                category: "gas",
                isOnline: false,
                status: "settled",
                routingReason: "Maximized rewards: 5x on gas via Freedom Flex",
                routingDetail: "{}",
                rewardsEarned: 226,
                multiplierUsed: 5,
                settledAt: new Date(),
            },
            {
                userId: user.id,
                cardId: sapphire.id,
                amountCents: 31200,
                merchant: "United Airlines",
                category: "travel",
                isOnline: true,
                status: "authorized",
                routingReason: "Maximized rewards: 5x on travel via Sapphire Preferred",
                routingDetail: "{}",
                rewardsEarned: 1560,
                multiplierUsed: 5,
            },
        ],
    });
    void doubleCash;
    console.log("Done.");
    console.log("  Email:    demo@routely.app");
    console.log("  Password: DemoPass123!");
}
main()
    .catch((e) => {
    console.error(e);
    process.exit(1);
})
    .finally(() => prisma.$disconnect());
