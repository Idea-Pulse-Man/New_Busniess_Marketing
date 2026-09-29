-- Free-text description of the applicant's previous jobs, next to the experience dropdown.
ALTER TABLE "Application" ADD COLUMN "experienceDetail" TEXT NOT NULL DEFAULT '';
