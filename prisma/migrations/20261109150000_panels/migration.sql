-- AlterTable
ALTER TABLE "Property" ADD COLUMN     "expiryReminderSentAt" TIMESTAMP(3);
-- AlterTable
ALTER TABLE "User" ADD COLUMN     "blockedAt" TIMESTAMP(3),
ADD COLUMN     "lastLoginAt" TIMESTAMP(3);
-- CreateTable
CREATE TABLE "Notification" (
    "id" SERIAL NOT NULL,
    "type" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "link" TEXT,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" INTEGER NOT NULL,
    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);
-- CreateTable
CREATE TABLE "AuditLog" (
    "id" SERIAL NOT NULL,
    "action" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" INTEGER,
    "details" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "adminId" INTEGER,
    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);
-- CreateTable
CREATE TABLE "PropertyViewDaily" (
    "id" SERIAL NOT NULL,
    "day" DATE NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "propertyId" INTEGER NOT NULL,
    CONSTRAINT "PropertyViewDaily_pkey" PRIMARY KEY ("id")
);
-- CreateIndex
CREATE INDEX "Notification_userId_readAt_idx" ON "Notification"("userId", "readAt");
-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");
-- CreateIndex
CREATE UNIQUE INDEX "PropertyViewDaily_propertyId_day_key" ON "PropertyViewDaily"("propertyId", "day");
-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "PropertyViewDaily" ADD CONSTRAINT "PropertyViewDaily_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;
