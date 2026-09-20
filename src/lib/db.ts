import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createClient() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL manque : copiez .env.example vers .env.");
  return new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
}

/** Client Prisma unique, réutilisé entre les rechargements à chaud en développement. */
export const db = globalForPrisma.prisma ?? createClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
