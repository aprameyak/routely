type Bucket = {
    count: number;
    resetAt: number;
};
const store = new Map<string, Bucket>();
export function rateLimit(key: string, limit: number, windowMs: number): {
    ok: boolean;
    remaining: number;
    retryAfterMs: number;
} {
    const now = Date.now();
    const bucket = store.get(key);
    if (!bucket || now >= bucket.resetAt) {
        store.set(key, { count: 1, resetAt: now + windowMs });
        return { ok: true, remaining: limit - 1, retryAfterMs: 0 };
    }
    if (bucket.count >= limit) {
        return { ok: false, remaining: 0, retryAfterMs: bucket.resetAt - now };
    }
    bucket.count += 1;
    return { ok: true, remaining: limit - bucket.count, retryAfterMs: 0 };
}
if (typeof setInterval !== "undefined") {
    setInterval(() => {
        const now = Date.now();
        for (const [k, v] of store) {
            if (now >= v.resetAt)
                store.delete(k);
        }
    }, 60000).unref?.();
}
