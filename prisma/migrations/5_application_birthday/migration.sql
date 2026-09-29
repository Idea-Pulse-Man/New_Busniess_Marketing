-- Applicant's date of birth as YYYY-MM-DD ('' for applications sent before this field existed).
ALTER TABLE "Application" ADD COLUMN "birthday" TEXT NOT NULL DEFAULT '';
