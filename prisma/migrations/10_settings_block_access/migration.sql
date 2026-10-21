-- Block VPN/proxy and Russian visitors from opening the public site at all.
ALTER TABLE "Settings" ADD COLUMN "blockAccess" BOOLEAN NOT NULL DEFAULT false;
