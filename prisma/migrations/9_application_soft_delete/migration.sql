-- Deleting an application only hides it: the row is kept, and the same email can apply again
-- (a new row), so an email is unique among applications that aren't deleted.
ALTER TABLE "Application" ADD COLUMN "deletedAt" TIMESTAMP(3);

DROP INDEX "Application_email_key";
CREATE UNIQUE INDEX "Application_email_active_key" ON "Application"("email") WHERE "deletedAt" IS NULL;
CREATE INDEX "Application_email_idx" ON "Application"("email");
CREATE INDEX "Application_deletedAt_idx" ON "Application"("deletedAt");
