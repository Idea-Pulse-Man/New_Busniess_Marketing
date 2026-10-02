"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { bookingLink } from "@/lib/booking";
import { sendBookingLink, sendTestEmail } from "@/lib/mail";
import { STATUSES, type Status } from "@/lib/options";
import { MAIL_PROVIDERS, saveSettings, type MailProvider, type Settings } from "@/lib/settings";
import { isInterviewCountry } from "@/lib/site";

function cleanIds(ids: unknown) {
  if (!Array.isArray(ids)) return [];
  return ids.filter((id): id is string => typeof id === "string").slice(0, 5000);
}

export async function setStatus(ids: string[], status: Status) {
  await requireAdmin();
  if (!STATUSES.includes(status)) throw new Error("Invalid status");
  const list = cleanIds(ids);
  if (!list.length) return { count: 0 };
  const { count } = await db.application.updateMany({ where: { id: { in: list }, deletedAt: null }, data: { status } });
  revalidatePath("/admin");
  return { count };
}

// Deleting only hides applications from the dashboard; their information is kept, and the same
// email can apply again.
export async function deleteApplications(ids: string[]) {
  await requireAdmin();
  const list = cleanIds(ids);
  if (!list.length) return { count: 0 };
  const { count } = await db.application.updateMany({
    where: { id: { in: list }, deletedAt: null },
    data: { deletedAt: new Date() },
  });
  revalidatePath("/admin");
  return { count };
}

export async function updateSettings(patch: { proxyCheck?: boolean; mailProvider?: string }) {
  await requireAdmin();
  const next: Partial<Settings> = {};
  if (typeof patch.proxyCheck === "boolean") next.proxyCheck = patch.proxyCheck;
  if (patch.mailProvider !== undefined) {
    if (!MAIL_PROVIDERS.includes(patch.mailProvider as MailProvider)) throw new Error("Invalid mail provider");
    next.mailProvider = patch.mailProvider as MailProvider;
  }
  await saveSettings(next);
  revalidatePath("/admin");
}

// Emails the booking link again to applicants from an interview country who haven't booked their call.
export async function sendBookingLinks(ids: string[]) {
  await requireAdmin();
  const list = cleanIds(ids);
  if (!list.length) return { count: 0, failed: 0 };
  const apps = await db.application.findMany({
    where: { id: { in: list }, emailVerified: true, deletedAt: null, callAt: null },
  });
  let count = 0;
  let failed = 0;
  for (const app of apps.filter((a) => isInterviewCountry(a.country))) {
    try {
      await sendBookingLink(app.email, app.name, await bookingLink(app.id));
      count++;
    } catch (e) {
      console.error("Failed to send booking link", e);
      failed++;
    }
  }
  return { count, failed };
}

// Emails the signed-in admin through the chosen provider. Returns an error message, or null when sent.
export async function sendTestEmailToMe(): Promise<string | null> {
  const email = await requireAdmin();
  try {
    await sendTestEmail(email);
    return null;
  } catch (e) {
    console.error("Test email failed", e);
    return e instanceof Error ? e.message : "Sending failed.";
  }
}
