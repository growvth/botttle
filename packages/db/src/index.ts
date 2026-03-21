/**
 * Database client and re-exports for botttle.
 * Usage: import { prisma } from '@botttle/db'
 */
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env['NODE_ENV'] === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env['NODE_ENV'] !== 'production') {
  globalForPrisma.prisma = prisma;
}

export { PrismaClient };
export type {
  Prisma,
  Role,
  ProjectStatus,
  MilestoneStatus,
  InvoiceStatus,
  PaymentStatus,
  NotificationKind,
  FileStorageProvider,
} from '@prisma/client';
