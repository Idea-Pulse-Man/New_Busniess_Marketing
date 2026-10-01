-- Video call booked on Calendly after the email is confirmed (applicants from the United States).
ALTER TABLE "Application" ADD COLUMN "callAt" TIMESTAMP(3),
ADD COLUMN "callTimezone" TEXT NOT NULL DEFAULT '',
ADD COLUMN "callInvitee" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Application_callInvitee_key" ON "Application"("callInvitee");
