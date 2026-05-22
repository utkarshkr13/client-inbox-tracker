import { PrismaClient } from "@/generated/prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

function createPrismaClient() {
  // Prisma v7: pass datasource URL via adapter or env
  if (process.env.DATABASE_URL?.includes("neon.tech")) {
    const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL });
    return new PrismaClient({ adapter } as any);
  }
  // Fallback for non-Neon Postgres (local / other providers)
  return new PrismaClient({ datasources: { db: { url: process.env.DATABASE_URL } } } as any);
}

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };
export const prisma = globalForPrisma.prisma || createPrismaClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
