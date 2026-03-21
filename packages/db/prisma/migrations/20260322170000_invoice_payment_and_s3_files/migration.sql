-- AlterTable
ALTER TABLE "invoices" ADD COLUMN "payment_url" TEXT,
ADD COLUMN "lemon_variant_id" TEXT;

-- CreateEnum
CREATE TYPE "FileStorageProvider" AS ENUM ('LOCAL', 'S3');

-- AlterTable
ALTER TABLE "project_files" ADD COLUMN "storage_provider" "FileStorageProvider" NOT NULL DEFAULT 'LOCAL';
