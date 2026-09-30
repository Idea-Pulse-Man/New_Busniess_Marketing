-- Optional WhatsApp number, stored as +<country code><number> ('' when not given).
ALTER TABLE "Application" ADD COLUMN "whatsapp" TEXT NOT NULL DEFAULT '';
