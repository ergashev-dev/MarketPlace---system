-- AlterTable
ALTER TABLE "Inquiry" ADD COLUMN     "readAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Property" ADD COLUMN     "rejectReason" TEXT;
