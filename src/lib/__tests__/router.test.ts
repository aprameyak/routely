import { describe, expect, it } from "vitest";
import { activeMultiplier, routePayment, type CardWithRewards } from "../router";
import type { Rule } from "@prisma/client";
function card(partial: Partial<CardWithRewards> & {
    id: string;
    nickname: string;
}): CardWithRewards {
    return {
        userId: "u1",
        brand: "visa",
        last4: "1111",
        tokenCipher: "x",
        tokenIv: "y",
        tokenTag: "z",
        expiryMonth: 12,
        expiryYear: 2030,
        color: "#000",
        isActive: true,
        isDefault: false,
        creditLimit: 10000,
        currentBalance: 0,
        networkHint: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        rewards: [{ category: "other", multiplier: 1, id: "r", cardId: partial.id, capCents: null, isRotating: false, validFrom: null, validTo: null, note: null }],
        ...partial,
    } as CardWithRewards;
}
function rule(partial: Partial<Rule> & {
    id: string;
    action: string;
}): Rule {
    return {
        userId: "u1",
        name: "rule",
        description: null,
        enabled: true,
        priority: 100,
        conditions: "{}",
        forceCardId: null,
        preferCardId: null,
        excludeCardId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        ...partial,
    } as Rule;
}
describe("routePayment", () => {
    const sapphire = card({
        id: "sapphire",
        nickname: "Sapphire",
        isDefault: true,
        rewards: [
            { id: "1", cardId: "sapphire", category: "travel", multiplier: 5, capCents: null, isRotating: false, validFrom: null, validTo: null, note: null },
            { id: "2", cardId: "sapphire", category: "other", multiplier: 1, capCents: null, isRotating: false, validFrom: null, validTo: null, note: null },
        ],
    });
    const amex = card({
        id: "amex",
        nickname: "Amex Gold",
        brand: "amex",
        last4: "1005",
        rewards: [
            { id: "3", cardId: "amex", category: "dining", multiplier: 4, capCents: null, isRotating: false, validFrom: null, validTo: null, note: null },
            { id: "4", cardId: "amex", category: "grocery", multiplier: 4, capCents: 10000, isRotating: false, validFrom: null, validTo: null, note: null },
            { id: "5", cardId: "amex", category: "other", multiplier: 1, capCents: null, isRotating: false, validFrom: null, validTo: null, note: null },
        ],
    });
    const flex = card({
        id: "flex",
        nickname: "Freedom Flex",
        rewards: [
            { id: "6", cardId: "flex", category: "gas", multiplier: 5, capCents: null, isRotating: true, validFrom: null, validTo: null, note: null },
            { id: "7", cardId: "flex", category: "other", multiplier: 1, capCents: null, isRotating: false, validFrom: null, validTo: null, note: null },
        ],
    });
    const cash = card({
        id: "cash",
        nickname: "Double Cash",
        rewards: [
            { id: "8", cardId: "cash", category: "other", multiplier: 2, capCents: null, isRotating: false, validFrom: null, validTo: null, note: null },
        ],
    });
    const cards = [sapphire, amex, flex, cash];
    it("maximizes travel rewards on Sapphire", () => {
        const d = routePayment(cards, [], {
            amountCents: 20000,
            merchant: "United",
            category: "travel",
            isOnline: true,
        });
        expect(d.selectedCard?.id).toBe("sapphire");
        expect(d.multiplierUsed).toBe(5);
        expect(d.detail.strategy).toBe("maximize_rewards");
    });
    it("forces Amex on dining when rule matches", () => {
        const d = routePayment(cards, [
            rule({
                id: "force-dining",
                name: "Always Amex dining",
                action: "force",
                priority: 200,
                conditions: JSON.stringify({ categories: ["dining"] }),
                forceCardId: "amex",
            }),
        ], { amountCents: 5000, merchant: "Restaurant", category: "dining", isOnline: false });
        expect(d.selectedCard?.id).toBe("amex");
        expect(d.detail.strategy).toBe("force_rule");
        expect(d.multiplierUsed).toBe(4);
    });
    it("excludes Sapphire on large online carts", () => {
        const d = routePayment(cards, [
            rule({
                id: "ex",
                name: "Skip Sapphire online",
                action: "exclude",
                priority: 120,
                conditions: JSON.stringify({ categories: ["online"], minAmount: 500, onlineOnly: true }),
                excludeCardId: "sapphire",
            }),
        ], { amountCents: 60000, merchant: "Amazon", category: "online", isOnline: true });
        expect(d.selectedCard?.id).toBe("cash");
        expect(d.detail.scores.find((s) => s.cardId === "sapphire")?.excluded).toBe(true);
    });
    it("picks Flex for gas at 5x", () => {
        const d = routePayment(cards, [], {
            amountCents: 4000,
            merchant: "Shell",
            category: "gas",
            isOnline: false,
        });
        expect(d.selectedCard?.id).toBe("flex");
        expect(d.multiplierUsed).toBe(5);
    });
    it("falls back to base rate when grocery cap exhausted", () => {
        const d = routePayment(cards, [], {
            amountCents: 5000,
            merchant: "Whole Foods",
            category: "grocery",
            isOnline: false,
            monthlySpendByCardCategory: { "amex:grocery": 10000 },
        });
        expect(d.selectedCard?.id).toBe("cash");
        expect(d.multiplierUsed).toBe(2);
    });
    it("declines when all cards exceed credit limit", () => {
        const limited = cards.map((c) => ({ ...c, creditLimit: 10, currentBalance: 9 }));
        const d = routePayment(limited, [], {
            amountCents: 50000,
            merchant: "Big Purchase",
            category: "other",
            isOnline: true,
        });
        expect(d.selectedCard).toBeNull();
        expect(d.detail.strategy).toBe("declined");
    });
    it("ignores inactive cards", () => {
        const d = routePayment([{ ...flex, isActive: false }, cash], [], { amountCents: 4000, merchant: "Shell", category: "gas", isOnline: false });
        expect(d.selectedCard?.id).toBe("cash");
    });
});
describe("activeMultiplier", () => {
    it("reports rotating note", () => {
        const c = card({
            id: "flex",
            nickname: "Flex",
            rewards: [
                {
                    id: "1",
                    cardId: "flex",
                    category: "gas",
                    multiplier: 5,
                    capCents: null,
                    isRotating: true,
                    validFrom: null,
                    validTo: null,
                    note: null,
                },
            ],
        });
        const r = activeMultiplier(c, "gas", new Date());
        expect(r.multiplier).toBe(5);
        expect(r.note).toMatch(/Rotating/);
    });
});
