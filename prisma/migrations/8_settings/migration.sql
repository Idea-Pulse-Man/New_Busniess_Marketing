-- Site-wide admin settings: VPN/proxy check on or off, and which service sends email.
CREATE TABLE "Settings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "proxyCheck" BOOLEAN NOT NULL DEFAULT true,
    "mailProvider" TEXT NOT NULL DEFAULT 'gmail',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Settings_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Settings" ENABLE ROW LEVEL SECURITY;
