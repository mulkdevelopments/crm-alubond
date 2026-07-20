import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var __prisma__: PrismaClient | undefined;
}

function createPrismaClient() {
  return new PrismaClient({
    log: ["error", "warn"],
  });
}

// In dev, drop any cached client when this module reloads so `prisma generate`
// is picked up (tsx/hot reload otherwise keeps a stale DMMF in global).
if (process.env.NODE_ENV !== "production" && global.__prisma__) {
  void global.__prisma__.$disconnect().catch(() => undefined);
  global.__prisma__ = undefined;
}

export const prisma = global.__prisma__ ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  global.__prisma__ = prisma;
}
