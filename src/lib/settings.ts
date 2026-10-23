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

// Same, but reused for up to 30 s so every landing-page view doesn't wait on a database round-trip.
// Other server instances may see a saved change up to 30 s late; this one sees it immediately.
const CACHE_MS = 30_000;
let cached: { settings: Promise<Settings>; at: number } | null = null;

export function getCachedSettings(): Promise<Settings> {
  if (!cached || Date.now() - cached.at > CACHE_MS) {
    const settings = getSettings();
    cached = { settings, at: Date.now() };
    settings.catch(() => (cached = null)); // don't keep a failed lookup around
  }
  return cached.settings;
}

export async function saveSettings(patch: Partial<Settings>) {
  await db.settings.upsert({ where: { id: 1 }, create: { id: 1, ...DEFAULTS, ...patch }, update: patch });
  cached = null;
}
