"use server";

import { createHash, randomBytes } from "node:crypto";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { sendVerificationEmail, siteUrl } from "@/lib/mail";
import { COUNTRIES, EXPERIENCE_OPTIONS } from "@/lib/options";

export type ApplyState =
  | { status: "idle" }
  | { status: "sent"; name: string; email: string }
  | { status: "error"; message: string; fields?: Record<string, string>; values?: Record<string, string> };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TOKEN_TTL_MS = 24 * 60 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;

export async function submitApplication(_prev: ApplyState, formData: FormData): Promise<ApplyState> {
  // Honeypot: real people never see or fill this field.
  if (String(formData.get("website") ?? "").trim()) {
    return { status: "sent", name: "", email: "" };
  }

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const country = String(formData.get("country") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();
  const experience = String(formData.get("experience") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();

  const values = { name, email, country, address, experience, note };
  const fields: Record<string, string> = {};
  if (name.length < 2 || name.length > 100) fields.name = "Please enter your full name.";
  if (!EMAIL_RE.test(email) || email.length > 200) fields.email = "Please enter a valid email address.";
  if (!COUNTRIES.includes(country)) fields.country = "Please choose your country.";
  if (address.length < 5 || address.length > 300) fields.address = "Please enter your address.";
  if (!EXPERIENCE_OPTIONS.some((o) => o.value === experience)) fields.experience = "Please choose one option.";
  if (note.length > 1000) fields.note = "Please keep this under 1000 characters.";

  if (Object.keys(fields).length) {
    return { status: "error", message: "Please check the highlighted fields.", fields, values };
  }

  const alreadyApplied: ApplyState = {
    status: "error",
    message: "We already have an application from this email. We'll be in touch soon!",
    fields: { email: "Already applied with this email." },
    values,
  };

  // An unconfirmed application for this email is replaced, so someone who typed another
  // person's address can't stop the real owner from applying.
  const existing = await db.application.findUnique({ where: { email } });
  if (existing?.emailVerified) return alreadyApplied;
  if (existing?.verifySentAt && Date.now() - existing.verifySentAt.getTime() < RESEND_COOLDOWN_MS) {
    return {
      status: "error",
      message: "We just sent a confirmation email to this address. Check your inbox and spam folder, or try again in a minute.",
      values,
    };
  }

  const token = randomBytes(32).toString("base64url");
  const verification = {
    verifyTokenHash: createHash("sha256").update(token).digest("hex"),
    verifyTokenExpires: new Date(Date.now() + TOKEN_TTL_MS),
    verifySentAt: new Date(),
  };
  const data = { name, email, country, address, experience, note, ...verification };

  if (existing) {
    // Only ever overwrite an unconfirmed application, even if it was confirmed a moment ago.
    const { count } = await db.application.updateMany({ where: { email, emailVerified: false }, data });
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

  const firstName = name.split(" ")[0];
  const link = `${siteUrl()}/apply/verify?token=${token}`;
  const dev = process.env.NODE_ENV !== "production";
  // Local testing: the link is also printed, so the flow works even where Gmail is unreachable.
  if (dev) console.log(`[dev] Confirmation link for ${email}: ${link}`);
  try {
    await sendVerificationEmail(email, firstName, link);
  } catch (e) {
    console.error("Failed to send verification email", e);
    if (dev) return { status: "sent", name: firstName, email };
    await db.application.update({ where: { email }, data: { verifySentAt: null } });
    // Short, non-sensitive reason (e.g. EAUTH, ETIMEDOUT, CONFIG) so failures can be diagnosed from the page.
    const code = (e as { code?: string })?.code ?? (String(e).includes("must be set") ? "CONFIG" : "UNKNOWN");
    return {
      status: "error",
      message: `We couldn't send a confirmation email right now. Please check your address and try again. (${code})`,
      values,
    };
  }

  return { status: "sent", name: firstName, email };
}
