import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    env: {
      ENCRYPTION_KEY: "abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789",
      AUTH_SECRET: "vitest-auth-secret-at-least-32-chars",
      DATABASE_URL: "file:./dev.db",
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
