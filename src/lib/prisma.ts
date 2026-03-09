import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@/generated/prisma/client";
import path from "path";

function resolveDbPath() {
  const url = process.env.DATABASE_URL ?? "file:./prisma/dev.db";
  // Strip the "file:" prefix if present
  const filePath = url.startsWith("file:") ? url.slice(5) : url;
  return path.resolve(process.cwd(), filePath);
}

function createPrismaClient() {
  const adapter = new PrismaBetterSqlite3({ url: resolveDbPath() });
  return new PrismaClient({ adapter });
}

const globalForPrisma = global as unknown as { prisma: PrismaClient };

const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export default prisma;
