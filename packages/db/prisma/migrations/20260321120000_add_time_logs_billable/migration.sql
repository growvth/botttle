-- AlterTable: billable flag for time entries (schema already expects column)
ALTER TABLE "time_logs" ADD COLUMN "billable" BOOLEAN NOT NULL DEFAULT 1;
