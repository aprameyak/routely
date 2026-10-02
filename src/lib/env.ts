function isBuildPhase() {
    return (process.env.NEXT_PHASE === "phase-production-build" ||
        process.env.npm_lifecycle_event === "build" ||
        process.env.SKIP_ENV_VALIDATION === "1");
}
const WEAK_ENCRYPTION_KEYS = new Set([
    "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
    "0".repeat(64),
    "0000000000000000000000000000000000000000000000000000000000000000",
    // Build/CI placeholder — never reuse at runtime
    "f".repeat(64),
]);
function requireEnv(name: string, minLen = 1): string {
    const value = process.env[name];
    if (!value || value.length < minLen) {
        if (process.env.NODE_ENV === "production" && !isBuildPhase()) {
            throw new Error(`Missing required env ${name}`);
        }
        console.warn(`[env] ${name} is missing or too short — using insecure dev fallback`);
        return "0".repeat(Math.max(minLen, 32));
    }
    return value;
}
export const env = {
    DATABASE_URL: process.env.DATABASE_URL ?? "file:./dev.db",
    ENCRYPTION_KEY: requireEnv("ENCRYPTION_KEY", 64),
    AUTH_SECRET: requireEnv("AUTH_SECRET", 16),
    NODE_ENV: process.env.NODE_ENV ?? "development",
    isProd: process.env.NODE_ENV === "production",
    trustProxy: process.env.TRUST_PROXY === "1" || process.env.TRUST_PROXY === "true",
};
if (env.isProd && !isBuildPhase()) {
    if (!/^[0-9a-fA-F]{64}$/.test(env.ENCRYPTION_KEY)) {
        throw new Error("ENCRYPTION_KEY must be 64 hex chars in production");
    }
    if (WEAK_ENCRYPTION_KEYS.has(env.ENCRYPTION_KEY.toLowerCase())) {
        throw new Error("ENCRYPTION_KEY is a known insecure default — generate with openssl rand -hex 32");
    }
    if (env.AUTH_SECRET.includes("change-me") ||
        env.AUTH_SECRET.includes("routely-dev") ||
        env.AUTH_SECRET.includes("build-time-placeholder") ||
        env.AUTH_SECRET.length < 32) {
        throw new Error("AUTH_SECRET must be a strong unique secret (32+ chars) in production");
    }
}
