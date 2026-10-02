import { handleApiError, jsonOk } from "@/lib/api";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";

export async function GET() {
  try {
    const started = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    return jsonOk({
      status: "ok",
      service: "routely",
      env: env.isProd ? "production" : "development",
      dbMs: Date.now() - started,
      time: new Date().toISOString(),
    });
  } catch (err) {
    return handleApiError(err);
  }
}
