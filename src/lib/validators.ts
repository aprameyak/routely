import { z } from "zod";
import { CARD_BRANDS } from "./categories";
const categoryEnum = z.enum([
    "grocery",
    "dining",
    "travel",
    "gas",
    "online",
    "entertainment",
    "streaming",
    "pharmacy",
    "utilities",
    "other",
]);
export const registerSchema = z.object({
    name: z.string().trim().min(1).max(80),
    email: z.email().max(255),
    password: z
        .string()
        .min(10, "Password must be at least 10 characters")
        .max(128)
        .regex(/[A-Za-z]/, "Password must include a letter")
        .regex(/[0-9]/, "Password must include a number"),
});
export const loginSchema = z.object({
    email: z.email(),
    password: z.string().min(1),
});
export const cardSchema = z.object({
    nickname: z.string().trim().min(1).max(60),
    brand: z.enum(CARD_BRANDS),
    last4: z.string().regex(/^\d{4}$/),
    expiryMonth: z.number().int().min(1).max(12),
    expiryYear: z.number().int().min(new Date().getFullYear()).max(2100),
    color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
    creditLimit: z.number().positive().optional().nullable(),
    isDefault: z.boolean().optional(),
    rewards: z
        .array(z.object({
        category: categoryEnum,
        multiplier: z.number().min(0).max(20),
        note: z.string().max(120).optional(),
    }))
        .optional(),
});
const ruleConditionsSchema = z.object({
    categories: z.array(z.string()).optional(),
    merchants: z.array(z.string()).optional(),
    minAmount: z.number().min(0).optional(),
    maxAmount: z.number().min(0).optional(),
    daysOfWeek: z.array(z.number().int().min(0).max(6)).optional(),
    onlineOnly: z.boolean().optional(),
    inStoreOnly: z.boolean().optional(),
});
export const ruleBaseSchema = z.object({
    name: z.string().trim().min(1).max(80),
    description: z.string().max(240).optional().nullable(),
    enabled: z.boolean().optional(),
    priority: z.number().int().min(0).max(1000).optional(),
    action: z.enum(["force", "prefer", "exclude"]),
    conditions: ruleConditionsSchema,
    forceCardId: z.string().optional().nullable(),
    preferCardId: z.string().optional().nullable(),
    excludeCardId: z.string().optional().nullable(),
});
export const ruleSchema = ruleBaseSchema.superRefine((val, ctx) => {
    if (val.action === "force" && !val.forceCardId) {
        ctx.addIssue({ code: "custom", message: "forceCardId required", path: ["forceCardId"] });
    }
    if (val.action === "prefer" && !val.preferCardId) {
        ctx.addIssue({ code: "custom", message: "preferCardId required", path: ["preferCardId"] });
    }
    if (val.action === "exclude" && !val.excludeCardId) {
        ctx.addIssue({ code: "custom", message: "excludeCardId required", path: ["excludeCardId"] });
    }
});
export const rulePatchSchema = ruleBaseSchema.partial();
export const paySchema = z.object({
    amountCents: z.number().int().positive().max(10000000),
    merchant: z.string().trim().min(1).max(120),
    category: categoryEnum.optional(),
    mcc: z.string().regex(/^\d{4}$/).optional(),
    isOnline: z.boolean().optional(),
    dryRun: z.boolean().optional(),
});
