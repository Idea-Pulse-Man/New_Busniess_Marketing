import "server-only";
import { db } from "@/lib/db";

export const MAIL_PROVIDERS = ["gmail", "sendgrid"] as const;
export type MailProvider = (typeof MAIL_PROVIDERS)[number];

export type Settings = { proxyCheck: boolean; blockAccess: boolean; mailProvider: MailProvider };

const DEFAULTS: Settings = { proxyCheck: true, blockAccess: false, mailProvider: "gmail" };

// The single settings row; defaults until an admin saves something.
export async function getSettings(): Promise<Settings> {
  const row = await db.settings.findUnique({ where: { id: 1 } });
  if (!row) return DEFAULTS;
  return {
    proxyCheck: row.proxyCheck,
    blockAccess: row.blockAccess,
    mailProvider: MAIL_PROVIDERS.includes(row.mailProvider as MailProvider) ? (row.mailProvider as MailProvider) : DEFAULTS.mailProvider,
  };
}

export async function saveSettings(patch: Partial<Settings>) {
  await db.settings.upsert({ where: { id: 1 }, create: { id: 1, ...DEFAULTS, ...patch }, update: patch });
}
