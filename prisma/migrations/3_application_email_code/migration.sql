-- Switch email confirmation from an emailed link to a 6-digit code.
-- Codes are short and can repeat across applicants, so the hash is no longer unique.
DROP INDEX "Application_verifyTokenHash_key";

ALTER TABLE "Application" RENAME COLUMN "verifyTokenHash" TO "verifyCodeHash";
ALTER TABLE "Application" RENAME COLUMN "verifyTokenExpires" TO "verifyCodeExpires";
ALTER TABLE "Application" ADD COLUMN "verifyAttempts" INTEGER NOT NULL DEFAULT 0;

-- Links already sent out stop working; those applicants just apply again to get a code.
UPDATE "Application" SET "verifyCodeHash" = NULL, "verifyCodeExpires" = NULL WHERE "emailVerified" = false;
