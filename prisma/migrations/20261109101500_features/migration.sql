-- AlterTable
ALTER TABLE "Property" ADD COLUMN "lat" DOUBLE PRECISION,
ADD COLUMN "lng" DOUBLE PRECISION,
ADD COLUMN "viewCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "closedAt" TIMESTAMP(3),
ADD COLUMN "expiresAt" TIMESTAMP(3);

-- Mavjud e'lonlarga 60 kunlik muddat
UPDATE "Property" SET "expiresAt" = NOW() + INTERVAL '60 days';

-- CreateTable
CREATE TABLE "Report" (
    "id" SERIAL NOT NULL,
    "reason" TEXT NOT NULL,
    "message" TEXT,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "propertyId" INTEGER NOT NULL,
    "reporterId" INTEGER NOT NULL,

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Report_reporterId_propertyId_key" ON "Report"("reporterId", "propertyId");

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
