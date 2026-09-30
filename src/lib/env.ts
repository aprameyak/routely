function isBuildPhase() {
    return (process.env.NEXT_PHASE === "phase-production-build" ||
        process.env.npm_lifecycle_event === "build" ||
        process.env.SKIP_ENV_VALIDATION === "1");
}
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
};
if (env.isProd && !isBuildPhase()) {
    if (!/^[0-9a-fA-F]{64}$/.test(env.ENCRYPTION_KEY)) {
        throw new Error("ENCRYPTION_KEY must be 64 hex chars in production");
    }
    if (env.AUTH_SECRET.includes("change-me") ||
        env.AUTH_SECRET.includes("routely-dev") ||
        env.AUTH_SECRET.includes("build-time-placeholder")) {
        throw new Error("AUTH_SECRET must be rotated for production");
    }
}
