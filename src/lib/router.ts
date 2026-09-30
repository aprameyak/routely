import type { Card, RewardRate, Rule } from "@prisma/client";
import type { CategoryId } from "./categories";
export type RuleConditions = {
    categories?: string[];
    merchants?: string[];
    minAmount?: number;
    maxAmount?: number;
    daysOfWeek?: number[];
    onlineOnly?: boolean;
    inStoreOnly?: boolean;
};
export type RouteContext = {
    amountCents: number;
    merchant: string;
    category: CategoryId | string;
    mcc?: string;
    isOnline: boolean;
    at?: Date;
    monthlySpendByCardCategory?: Record<string, number>;
};
export type CardWithRewards = Card & {
    rewards: RewardRate[];
};
export type ScoredCard = {
    card: CardWithRewards;
    multiplier: number;
    estimatedRewards: number;
    score: number;
    utilization: number | null;
    notes: string[];
};
export type RouteDecision = {
    selectedCard: CardWithRewards | null;
    reason: string;
    detail: {
        appliedRuleIds: string[];
        scores: Array<{
            cardId: string;
            nickname: string;
            multiplier: number;
            estimatedRewards: number;
            score: number;
            excluded: boolean;
            excludeReason?: string;
        }>;
        strategy: "force_rule" | "maximize_rewards" | "default_card" | "declined";
    };
    rewardsEarned: number;
    multiplierUsed: number;
    declinedReason?: string;
};
function parseConditions(raw: string): RuleConditions {
    try {
        return JSON.parse(raw) as RuleConditions;
    }
    catch {
        return {};
    }
}
export function conditionsMatch(conditions: RuleConditions, ctx: RouteContext): boolean {
    if (conditions.categories?.length && !conditions.categories.includes(ctx.category)) {
        return false;
    }
    if (conditions.merchants?.length) {
        const m = ctx.merchant.toLowerCase();
        const hit = conditions.merchants.some((x) => m.includes(x.toLowerCase()));
        if (!hit)
            return false;
    }
    const amount = ctx.amountCents / 100;
    if (conditions.minAmount != null && amount < conditions.minAmount)
        return false;
    if (conditions.maxAmount != null && amount > conditions.maxAmount)
        return false;
    const day = (ctx.at ?? new Date()).getDay();
    if (conditions.daysOfWeek?.length && !conditions.daysOfWeek.includes(day))
        return false;
    if (conditions.onlineOnly && !ctx.isOnline)
        return false;
    if (conditions.inStoreOnly && ctx.isOnline)
        return false;
    return true;
}
function spendKey(cardId: string, category: string) {
    return `${cardId}:${category}`;
}
export function activeMultiplier(card: CardWithRewards, category: string, at: Date, monthlySpendByCardCategory?: Record<string, number>): {
    multiplier: number;
    note?: string;
    capped: boolean;
} {
    const categoryRate = card.rewards.find((r) => r.category === category);
    const otherRate = card.rewards.find((r) => r.category === "other");
    const applyCap = (rate: RewardRate): {
        multiplier: number;
        note?: string;
        capped: boolean;
    } | null => {
        if (rate.validFrom && at < rate.validFrom)
            return null;
        if (rate.validTo && at > rate.validTo)
            return null;
        if (rate.capCents != null && rate.capCents > 0) {
            const spent = monthlySpendByCardCategory?.[spendKey(card.id, rate.category)] ?? 0;
            if (spent >= rate.capCents) {
                return null;
            }
            const remaining = rate.capCents - spent;
            if (remaining <= 0)
                return null;
        }
        return {
            multiplier: rate.multiplier,
            note: rate.isRotating
                ? "Rotating category active"
                : rate.capCents
                    ? `Bonus active (${Math.max(0, rate.capCents - (monthlySpendByCardCategory?.[spendKey(card.id, rate.category)] ?? 0))}¢ headroom)`
                    : undefined,
            capped: false,
        };
    };
    if (categoryRate) {
        const hit = applyCap(categoryRate);
        if (hit)
            return hit;
        if (otherRate) {
            const other = applyCap(otherRate);
            if (other) {
                return {
                    ...other,
                    note: "Category bonus cap reached — using base rate",
                    capped: true,
                };
            }
        }
        return { multiplier: 1, note: "Category bonus cap reached — using 1x", capped: true };
    }
    if (otherRate) {
        const other = applyCap(otherRate);
        if (other)
            return other;
    }
    return { multiplier: 1, capped: false };
}
function utilization(card: CardWithRewards): number | null {
    if (!card.creditLimit || card.creditLimit <= 0)
        return null;
    return card.currentBalance / card.creditLimit;
}
function wouldExceedLimit(card: CardWithRewards, amount: number): boolean {
    return card.creditLimit != null && card.currentBalance + amount > card.creditLimit;
}
export function routePayment(cards: CardWithRewards[], rules: Rule[], ctx: RouteContext): RouteDecision {
    const at = ctx.at ?? new Date();
    const amount = ctx.amountCents / 100;
    const appliedRuleIds: string[] = [];
    const spend = ctx.monthlySpendByCardCategory;
    const active = cards.filter((c) => {
        if (!c.isActive)
            return false;
        const exp = new Date(c.expiryYear, c.expiryMonth);
        return exp >= new Date(at.getFullYear(), at.getMonth());
    });
    if (active.length === 0) {
        return {
            selectedCard: null,
            reason: "No active cards available",
            detail: { appliedRuleIds: [], scores: [], strategy: "declined" },
            rewardsEarned: 0,
            multiplierUsed: 0,
            declinedReason: "No active cards",
        };
    }
    const enabledRules = [...rules]
        .filter((r) => r.enabled)
        .sort((a, b) => b.priority - a.priority);
    const excluded = new Map<string, string>();
    for (const rule of enabledRules) {
        if (rule.action !== "exclude" || !rule.excludeCardId)
            continue;
        const conditions = parseConditions(rule.conditions);
        if (!conditionsMatch(conditions, ctx))
            continue;
        excluded.set(rule.excludeCardId, rule.name);
        appliedRuleIds.push(rule.id);
    }
    for (const rule of enabledRules) {
        if (rule.action !== "force" || !rule.forceCardId)
            continue;
        const conditions = parseConditions(rule.conditions);
        if (!conditionsMatch(conditions, ctx))
            continue;
        const card = active.find((c) => c.id === rule.forceCardId);
        if (!card || excluded.has(card.id))
            continue;
        if (wouldExceedLimit(card, amount))
            continue;
        appliedRuleIds.push(rule.id);
        const { multiplier, note } = activeMultiplier(card, ctx.category, at, spend);
        const rewards = amount * multiplier;
        return {
            selectedCard: card,
            reason: `Forced by rule “${rule.name}”${note ? ` (${note})` : ""}`,
            detail: {
                appliedRuleIds,
                scores: active.map((c) => {
                    const m = activeMultiplier(c, ctx.category, at, spend).multiplier;
                    return {
                        cardId: c.id,
                        nickname: c.nickname,
                        multiplier: m,
                        estimatedRewards: amount * m,
                        score: c.id === card.id ? 1000000 : 0,
                        excluded: excluded.has(c.id),
                        excludeReason: excluded.get(c.id),
                    };
                }),
                strategy: "force_rule",
            },
            rewardsEarned: rewards,
            multiplierUsed: multiplier,
        };
    }
    const preferBoost = new Map<string, {
        boost: number;
        ruleName: string;
    }>();
    for (const rule of enabledRules) {
        if (rule.action !== "prefer" || !rule.preferCardId)
            continue;
        const conditions = parseConditions(rule.conditions);
        if (!conditionsMatch(conditions, ctx))
            continue;
        const existing = preferBoost.get(rule.preferCardId);
        const boost = 0.15 * (rule.priority / 100);
        if (!existing || boost > existing.boost) {
            preferBoost.set(rule.preferCardId, { boost, ruleName: rule.name });
        }
        appliedRuleIds.push(rule.id);
    }
    const candidates = active.filter((c) => !excluded.has(c.id));
    if (candidates.length === 0) {
        return {
            selectedCard: null,
            reason: "All cards excluded by rules",
            detail: {
                appliedRuleIds,
                scores: active.map((c) => ({
                    cardId: c.id,
                    nickname: c.nickname,
                    multiplier: 0,
                    estimatedRewards: 0,
                    score: 0,
                    excluded: true,
                    excludeReason: excluded.get(c.id),
                })),
                strategy: "declined",
            },
            rewardsEarned: 0,
            multiplierUsed: 0,
            declinedReason: "All cards excluded by rules",
        };
    }
    const scored: ScoredCard[] = candidates.map((card) => {
        const { multiplier, note } = activeMultiplier(card, ctx.category, at, spend);
        const estimatedRewards = amount * multiplier;
        const util = utilization(card);
        const notes: string[] = [];
        if (note)
            notes.push(note);
        let score = estimatedRewards;
        if (util != null) {
            if (util >= 0.9) {
                score *= 0.4;
                notes.push("High utilization penalty (90%+)");
            }
            else if (util >= 0.7) {
                score *= 0.75;
                notes.push("Elevated utilization penalty (70%+)");
            }
        }
        const pref = preferBoost.get(card.id);
        if (pref) {
            score *= 1 + pref.boost;
            notes.push(`Prefer boost from “${pref.ruleName}”`);
        }
        if (card.isDefault) {
            score += 0.001;
            notes.push("Default card tie-break");
        }
        if (wouldExceedLimit(card, amount)) {
            score = -1;
            notes.push("Would exceed credit limit");
        }
        return { card, multiplier, estimatedRewards, score, utilization: util, notes };
    });
    scored.sort((a, b) => b.score - a.score);
    const best = scored.find((s) => s.score >= 0) ?? null;
    const scoreRows = [
        ...scored.map((s) => ({
            cardId: s.card.id,
            nickname: s.card.nickname,
            multiplier: s.multiplier,
            estimatedRewards: s.estimatedRewards,
            score: s.score,
            excluded: false as boolean,
            excludeReason: undefined as string | undefined,
        })),
        ...active
            .filter((c) => excluded.has(c.id))
            .map((c) => ({
            cardId: c.id,
            nickname: c.nickname,
            multiplier: activeMultiplier(c, ctx.category, at, spend).multiplier,
            estimatedRewards: 0,
            score: 0,
            excluded: true,
            excludeReason: excluded.get(c.id),
        })),
    ];
    if (!best) {
        return {
            selectedCard: null,
            reason: "No card can authorize this charge",
            detail: { appliedRuleIds, scores: scoreRows, strategy: "declined" },
            rewardsEarned: 0,
            multiplierUsed: 0,
            declinedReason: "Credit limit exceeded on all cards",
        };
    }
    return {
        selectedCard: best.card,
        reason: `Maximized rewards: ${best.multiplier}x on ${ctx.category} via ${best.card.nickname}${best.notes.length ? ` (${best.notes[0]})` : ""}`,
        detail: { appliedRuleIds, scores: scoreRows, strategy: "maximize_rewards" },
        rewardsEarned: best.estimatedRewards,
        multiplierUsed: best.multiplier,
    };
}
