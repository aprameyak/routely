import type { CategoryId } from "./categories";
export type Merchant = {
    name: string;
    aliases: string[];
    category: CategoryId;
    mcc: string;
    online?: boolean;
};
export const MERCHANTS: Merchant[] = [
    { name: "Whole Foods", aliases: ["whole foods", "wholefoods"], category: "grocery", mcc: "5411" },
    { name: "Amazon Fresh", aliases: ["amazon fresh"], category: "grocery", mcc: "5411", online: true },
    { name: "Trader Joe's", aliases: ["trader joe", "trader joes", "tj"], category: "grocery", mcc: "5411" },
    { name: "Costco", aliases: ["costco"], category: "grocery", mcc: "5411" },
    { name: "Kroger", aliases: ["kroger"], category: "grocery", mcc: "5411" },
    { name: "Safeway", aliases: ["safeway"], category: "grocery", mcc: "5411" },
    { name: "Walmart", aliases: ["walmart", "wal-mart"], category: "grocery", mcc: "5411" },
    { name: "Target", aliases: ["target"], category: "online", mcc: "5311" },
    { name: "Shell", aliases: ["shell"], category: "gas", mcc: "5541" },
    { name: "Chevron", aliases: ["chevron"], category: "gas", mcc: "5541" },
    { name: "Exxon", aliases: ["exxon", "exxonmobil", "mobil"], category: "gas", mcc: "5541" },
    { name: "BP", aliases: ["bp"], category: "gas", mcc: "5541" },
    { name: "Uber", aliases: ["uber"], category: "travel", mcc: "4121" },
    { name: "Lyft", aliases: ["lyft"], category: "travel", mcc: "4121" },
    { name: "Uber Eats", aliases: ["uber eats", "ubereats"], category: "dining", mcc: "5812", online: true },
    { name: "DoorDash", aliases: ["doordash", "door dash"], category: "dining", mcc: "5812", online: true },
    { name: "Starbucks", aliases: ["starbucks", "sbux"], category: "dining", mcc: "5814" },
    { name: "McDonald's", aliases: ["mcdonalds", "mcdonald", "mcd"], category: "dining", mcc: "5814" },
    { name: "Chipotle", aliases: ["chipotle"], category: "dining", mcc: "5812" },
    { name: "Amazon", aliases: ["amazon", "amazon.com", "amzn"], category: "online", mcc: "5999", online: true },
    { name: "Apple", aliases: ["apple", "apple.com", "app store"], category: "online", mcc: "5732", online: true },
    { name: "Best Buy", aliases: ["best buy", "bestbuy"], category: "online", mcc: "5732" },
    { name: "United Airlines", aliases: ["united", "united airlines"], category: "travel", mcc: "3000", online: true },
    { name: "Delta", aliases: ["delta", "delta air"], category: "travel", mcc: "3000", online: true },
    { name: "Southwest", aliases: ["southwest", "swa"], category: "travel", mcc: "3000", online: true },
    { name: "Airbnb", aliases: ["airbnb"], category: "travel", mcc: "7011", online: true },
    { name: "Marriott", aliases: ["marriott"], category: "travel", mcc: "7011" },
    { name: "Hilton", aliases: ["hilton"], category: "travel", mcc: "7011" },
    { name: "Netflix", aliases: ["netflix"], category: "streaming", mcc: "4899", online: true },
    { name: "Spotify", aliases: ["spotify"], category: "streaming", mcc: "4899", online: true },
    { name: "Disney+", aliases: ["disney+", "disney plus"], category: "streaming", mcc: "4899", online: true },
    { name: "CVS", aliases: ["cvs", "cvs pharmacy"], category: "pharmacy", mcc: "5912" },
    { name: "Walgreens", aliases: ["walgreens"], category: "pharmacy", mcc: "5912" },
    { name: "PG&E", aliases: ["pge", "pg&e"], category: "utilities", mcc: "4900", online: true },
    { name: "Comcast", aliases: ["comcast", "xfinity"], category: "utilities", mcc: "4900", online: true },
    { name: "AMC Theatres", aliases: ["amc", "amc theatres"], category: "entertainment", mcc: "7832" },
    { name: "Steam", aliases: ["steam", "steampowered"], category: "entertainment", mcc: "5816", online: true },
];
function toResult(hit: Merchant) {
    return {
        merchant: hit.name,
        category: hit.category,
        mcc: hit.mcc,
        isOnline: !!hit.online,
        matched: true as const,
    };
}
export function resolveMerchant(query: string): {
    merchant: string;
    category: CategoryId;
    mcc?: string;
    isOnline: boolean;
    matched: boolean;
} {
    const q = query.trim().toLowerCase();
    if (!q) {
        return { merchant: query, category: "other", isOnline: true, matched: false };
    }
    const exactName = MERCHANTS.find((m) => m.name.toLowerCase() === q);
    if (exactName)
        return toResult(exactName);
    const exactAlias = MERCHANTS.find((m) => m.aliases.some((a) => a === q));
    if (exactAlias)
        return toResult(exactAlias);
    const starts = MERCHANTS.find((m) => m.name.toLowerCase().startsWith(q) ||
        m.aliases.some((a) => a.startsWith(q)));
    if (starts)
        return toResult(starts);
    return { merchant: query.trim(), category: "other", isOnline: true, matched: false };
}
export function searchMerchants(query: string, limit = 8): Merchant[] {
    const q = query.trim().toLowerCase();
    if (!q)
        return MERCHANTS.slice(0, limit);
    const scored = MERCHANTS.map((m) => {
        const name = m.name.toLowerCase();
        let score = 0;
        if (name === q || m.aliases.includes(q))
            score = 100;
        else if (name.startsWith(q) || m.aliases.some((a) => a.startsWith(q)))
            score = 80;
        else if (name.includes(q) || m.aliases.some((a) => a.includes(q)))
            score = 40;
        return { m, score };
    })
        .filter((x) => x.score > 0)
        .sort((a, b) => b.score - a.score || a.m.name.localeCompare(b.m.name));
    return scored.slice(0, limit).map((x) => x.m);
}
