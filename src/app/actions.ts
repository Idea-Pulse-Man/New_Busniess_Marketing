"use server";

import { createHmac, randomInt, timingSafeEqual } from "node:crypto";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { formatCallTime, getBooking } from "@/lib/calendly";
import { sendCallBooked, sendVerificationCode } from "@/lib/mail";
import { ageFrom, COUNTRIES, EXPERIENCE_OPTIONS, MAX_AGE, MIN_AGE } from "@/lib/options";
import { clientIp, isProxy } from "@/lib/proxycheck";
import { getSettings } from "@/lib/settings";
import { isInterviewCountry } from "@/lib/site";

export type ApplyValues = Record<"name" | "email" | "whatsapp" | "birthday" | "country" | "address" | "experience" | "experienceDetail" | "note", string>;

export type ApplyState =
  | { status: "idle" }
  | { status: "code"; name: string; email: string; values: ApplyValues; notice?: string; at: number }
  // Already confirmed, but the video call isn't booked yet.
  | { status: "book"; name: string; fullName: string; email: string }
  | { status: "error"; message: string; fields?: Record<string, string>; values?: ApplyValues };

export type CodeState =
  | { status: "idle" }
  | { status: "verified"; book: boolean } // book: show the Calendly step next
  | { status: "resent"; message: string }
  | { status: "error"; message: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CODE_MINUTES = 15;
const MAX_ATTEMPTS = 5;
const RESEND_COOLDOWN_MS = 60 * 1000;

// Keyed hash, so a leaked database row can't be brute-forced back to the code offline.
function hashCode(email: string, code: string) {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not set");
  return createHmac("sha256", secret).update(`${email}:${code}`).digest("hex");
}

function newCode(email: string) {
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  return {
    code,
    fields: {
      verifyCodeHash: hashCode(email, code),
      verifyCodeExpires: new Date(Date.now() + CODE_MINUTES * 60 * 1000),
      verifyAttempts: 0,
      verifySentAt: new Date(),
    },
  };
}

// Emails the code. Returns an error message for the applicant, or null when sent.
async function deliverCode(email: string, firstName: string, code: string): Promise<string | null> {
  const dev = process.env.NODE_ENV !== "production";
  // Local testing: the code is also printed, so the flow works even without email set up.
  if (dev) console.log(`[dev] Confirmation code for ${email}: ${code}`);
  try {
    await sendVerificationCode(email, firstName, code, CODE_MINUTES);
    return null;
  } catch (e) {
    console.error("Failed to send verification email", e);
    if (dev) return null;
    await db.application.updateMany({ where: { email, emailVerified: false, deletedAt: null }, data: { verifySentAt: null } });
    // Short, non-sensitive reason (e.g. EAUTH 535, ETIMEDOUT, CONFIG) so failures can be diagnosed from the page.
    const err = e as { code?: string; responseCode?: number };
    const reason =
      (err?.code ?? (String(e).includes("must be set") ? "CONFIG" : "UNKNOWN")) +
      (err?.responseCode ? ` ${err.responseCode}` : "");
    return `We couldn't send a confirmation email right now. Please check your address and try again. (${reason})`;
  }
}

// "+44 (7700) 900-123" → "+447700900123"; "" stays "" (optional field); null if it isn't a plausible
// international number. A leading 00 counts as +.
function normalizePhone(raw: string): string | null {
  if (!raw) return "";
  const compact = raw.replace(/[\s().-]/g, "").replace(/^00/, "+");
  return /^\+[1-9]\d{6,14}$/.test(compact) ? compact : null;
}

function firstNameOf(name: string) {
  return name.split(" ")[0];
}

// Applicants from an interview country book a video call once their email is confirmed.
function needsCall(app: { country: string; callAt: Date | null }) {
  return isInterviewCountry(app.country) && !app.callAt;
}

export async function submitApplication(_prev: ApplyState, formData: FormData): Promise<ApplyState> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const whatsappRaw = String(formData.get("whatsapp") ?? "").trim();
  const whatsapp = normalizePhone(whatsappRaw);
  const birthday = String(formData.get("birthday") ?? "").trim();
  const country = String(formData.get("country") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();
  const experience = String(formData.get("experience") ?? "").trim();
  const experienceDetail = String(formData.get("experienceDetail") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();
  const values: ApplyValues = { name, email, whatsapp: whatsappRaw, birthday, country, address, experience, experienceDetail, note };

  // Honeypot: real people never see or fill this field.
  if (String(formData.get("website") ?? "").trim()) {
    return { status: "code", name: "", email, values, at: Date.now() };
  }

  const fields: Record<string, string> = {};
  if (name.length < 2 || name.length > 100) fields.name = "Please enter your full name.";
  if (!EMAIL_RE.test(email) || email.length > 200) fields.email = "Please enter a valid email address.";
  if (whatsapp === null) fields.whatsapp = "Please enter the number with your country code, e.g. +44 7700 900123.";
  const age = ageFrom(birthday);
  if (age === null) fields.birthday = "Please enter your date of birth.";
  else if (age < MIN_AGE) fields.birthday = `You must be at least ${MIN_AGE} years old to apply.`;
  else if (age > MAX_AGE) fields.birthday = "Please check your date of birth.";
  if (!COUNTRIES.includes(country)) fields.country = "Please choose your country.";
  if (address.length < 5 || address.length > 300) fields.address = "Please enter your address.";
  if (!EXPERIENCE_OPTIONS.some((o) => o.value === experience)) fields.experience = "Please choose one option.";
  if (experienceDetail.length > 500) fields.experienceDetail = "Please keep this under 500 characters.";
  if (note.length > 1000) fields.note = "Please keep this under 1000 characters.";

  if (Object.keys(fields).length) {
    return { status: "error", message: "Please check the highlighted fields.", fields, values };
  }

  // The VPN/proxy check can be switched off on the admin dashboard (Settings).
  if ((await getSettings()).proxyCheck && (await isProxy(await clientIp()))) {
    return {
      status: "error",
      message: "It looks like you're using a VPN or proxy. Please turn it off and send your application again.",
      values,
    };
  }

  const alreadyApplied: ApplyState = {
    status: "error",
    message: "We already have an application from this email. We'll be in touch soon!",
    fields: { email: "Already applied with this email." },
    values,
  };
  const details = { name, email, whatsapp: whatsapp ?? "", birthday, country, address, experience, experienceDetail, note };
  const firstName = firstNameOf(name);

  // An unconfirmed application for this email is replaced, so someone who typed another
  // person's address can't stop the real owner from applying.
  const existing = await db.application.findFirst({ where: { email, deletedAt: null } });
  if (existing?.emailVerified) {
    // Left before booking the call (e.g. closed the tab): pick up where they stopped.
    return needsCall(existing) ? { status: "book", name: firstName, fullName: name, email } : alreadyApplied;
  }

  // A code went out moments ago (e.g. they pressed submit twice): keep it, just save any edits.
  if (existing?.verifySentAt && Date.now() - existing.verifySentAt.getTime() < RESEND_COOLDOWN_MS) {
    const { count } = await db.application.updateMany({ where: { email, emailVerified: false, deletedAt: null }, data: details });
    if (!count) return alreadyApplied;
    return { status: "code", name: firstName, email, values, notice: "We sent you a code a moment ago.", at: Date.now() };
  }

  const { code, fields: codeFields } = newCode(email);
  const data = { ...details, ...codeFields };
  if (existing) {
    // Only ever overwrite an unconfirmed application, even if it was confirmed a moment ago.
    const { count } = await db.application.updateMany({ where: { email, emailVerified: false, deletedAt: null }, data });
    if (!count) return alreadyApplied;
  } else {
    try {
      await db.application.create({ data });
    } catch (e) {
      // Lost a race with another submission for the same email.
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") return alreadyApplied;
      throw e;
    }
  }

  const failed = await deliverCode(email, firstName, code);
  if (failed) return { status: "error", message: failed, values };
  return { status: "code", name: firstName, email, values, at: Date.now() };
}

export async function confirmCode(_prev: CodeState, formData: FormData): Promise<CodeState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const intent = String(formData.get("intent") ?? "verify");

  const app = email ? await db.application.findFirst({ where: { email, deletedAt: null } }) : null;
  if (!app) return { status: "error", message: "We couldn't find your application. Please fill in the form again." };
  if (app.emailVerified) return { status: "verified", book: needsCall(app) };

  if (intent === "resend") {
    if (app.verifySentAt && Date.now() - app.verifySentAt.getTime() < RESEND_COOLDOWN_MS) {
      return { status: "error", message: "Please wait a minute before asking for another code." };
    }
    const { code, fields } = newCode(email);
    const { count } = await db.application.updateMany({ where: { id: app.id, emailVerified: false }, data: fields });
    if (!count) return { status: "verified", book: needsCall(app) };
    const failed = await deliverCode(email, firstNameOf(app.name), code);
    if (failed) return { status: "error", message: failed };
    return { status: "resent", message: `We sent a new code to ${email}.` };
  }

  const code = String(formData.get("code") ?? "").replace(/\D/g, "");
  if (code.length !== 6) return { status: "error", message: "Please enter the 6-digit code from the email." };
  if (!app.verifyCodeHash || !app.verifyCodeExpires || app.verifyCodeExpires < new Date()) {
    return { status: "error", message: "This code has expired. Tap “Send a new code” below." };
  }

  // Use up one attempt before checking, so parallel guesses can't exceed the limit.
  const { count: allowed } = await db.application.updateMany({
    where: { id: app.id, emailVerified: false, verifyCodeHash: app.verifyCodeHash, verifyAttempts: { lt: MAX_ATTEMPTS } },
    data: { verifyAttempts: { increment: 1 } },
  });
  if (!allowed) return { status: "error", message: "Too many wrong codes. Tap “Send a new code” below." };

  const expected = Buffer.from(app.verifyCodeHash, "hex");
  const given = Buffer.from(hashCode(email, code), "hex");
  if (!timingSafeEqual(expected, given)) {
    const left = MAX_ATTEMPTS - app.verifyAttempts - 1;
    return {
      status: "error",
      message: left > 0
        ? `That code isn't right. ${left} ${left === 1 ? "try" : "tries"} left.`
        : "That code isn't right. Tap “Send a new code” below.",
    };
  }

  await db.application.update({
    where: { id: app.id },
    data: { emailVerified: true, verifyCodeHash: null, verifyCodeExpires: null, verifyAttempts: 0, createdAt: new Date() },
  });
  return { status: "verified", book: needsCall(app) };
}

export type BookResult = { when: string | null; emailed: boolean };

// Called by the embedded Calendly widget once the applicant has booked. The booking is looked up
// through Calendly's API (so it can't be faked), saved, and the "call booked" email is sent.
// The call is booked on Calendly either way, so failures here are only logged.
export async function confirmBooking(emailRaw: string, inviteeUri: string): Promise<BookResult> {
  const email = String(emailRaw ?? "").trim().toLowerCase();
  const uri = String(inviteeUri ?? "");
  const none: BookResult = { when: null, emailed: false };

  const app = email ? await db.application.findFirst({ where: { email, deletedAt: null } }) : null;
  if (!app?.emailVerified || !isInterviewCountry(app.country)) return none;
  // Same booking reported twice (e.g. the page was reloaded): don't email again.
  if (app.callInvitee === uri && app.callAt) return { when: formatCallTime(app.callAt, app.callTimezone), emailed: true };

  let booking;
  try {
    booking = await getBooking(uri);
  } catch (e) {
    console.error("Failed to look up Calendly booking", e);
    return none;
  }
  if (!booking) return none;
  const when = formatCallTime(booking.start, booking.timezone);

  try {
    // A new booking replaces an earlier one (they booked again to change the time).
    const { count } = await db.application.updateMany({
      where: { id: app.id, OR: [{ callInvitee: null }, { callInvitee: { not: uri } }] },
      data: { callAt: booking.start, callTimezone: booking.timezone, callInvitee: uri },
    });
    if (!count) return { when, emailed: true };
  } catch (e) {
    // This booking is already attached to another application.
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") return none;
    throw e;
  }

  try {
    await sendCallBooked(app.email, app.name, when);
    return { when, emailed: true };
  } catch (e) {
    console.error("Failed to send call-booked email", e);
    return { when, emailed: false };
  }
}
