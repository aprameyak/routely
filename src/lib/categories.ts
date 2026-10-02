export const CATEGORIES = [
    { id: "grocery", label: "Groceries", mccs: ["5411", "5412"] },
    { id: "dining", label: "Dining", mccs: ["5812", "5814"] },
    { id: "travel", label: "Travel", mccs: ["3000", "4511", "7011"] },
    { id: "gas", label: "Gas", mccs: ["5541", "5542"] },
    { id: "online", label: "Online shopping", mccs: ["5999", "5311"] },
    { id: "entertainment", label: "Entertainment", mccs: ["7832", "7922"] },
    { id: "streaming", label: "Streaming", mccs: ["4899"] },
    { id: "pharmacy", label: "Pharmacy", mccs: ["5912"] },
    { id: "utilities", label: "Utilities", mccs: ["4900"] },
    { id: "other", label: "Everything else", mccs: ["0000"] },
] as const;
export type CategoryId = (typeof CATEGORIES)[number]["id"];
export function categoryFromMcc(mcc?: string | null): CategoryId {
    if (!mcc)
        return "other";
    for (const cat of CATEGORIES) {
        if ((cat.mccs as readonly string[]).includes(mcc))
            return cat.id;
    }
    return "other";
}
export const CARD_BRANDS = ["visa", "mastercard", "amex", "discover"] as const;
export type CardBrand = (typeof CARD_BRANDS)[number];
export const CARD_COLORS = [
    "#0f766e",
    "#1e3a5f",
    "#7c2d12",
    "#365314",
    "#4c1d95",
    "#0c4a6e",
    "#881337",
    "#171717",
];
