-- AlterTable
ALTER TABLE "Application" ADD COLUMN     "emailVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "verifySentAt" TIMESTAMP(3),
ADD COLUMN     "verifyTokenExpires" TIMESTAMP(3),
ADD COLUMN     "verifyTokenHash" TEXT;

-- Applications submitted before email confirmation existed stay visible to admins.
UPDATE "Application" SET "emailVerified" = true;

-- CreateIndex
CREATE UNIQUE INDEX "Application_verifyTokenHash_key" ON "Application"("verifyTokenHash");

-- CreateIndex
CREATE INDEX "Application_emailVerified_idx" ON "Application"("emailVerified");
