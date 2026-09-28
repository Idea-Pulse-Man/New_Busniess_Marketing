"use server";

import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { COUNTRIES, EXPERIENCE_OPTIONS } from "@/lib/options";

export type ApplyState =
  | { status: "idle" }
  | { status: "success"; name: string }
  | { status: "error"; message: string; fields?: Record<string, string>; values?: Record<string, string> };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function submitApplication(_prev: ApplyState, formData: FormData): Promise<ApplyState> {
  // Honeypot: real people never see or fill this field.
  if (String(formData.get("website") ?? "").trim()) {
    return { status: "success", name: "" };
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

  try {
    await db.application.create({ data: { name, email, country, address, experience, note } });
  } catch (e) {
    // Unique constraint on email: this person already applied.
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return {
        status: "error",
        message: "We already have an application from this email. We'll be in touch soon!",
        fields: { email: "Already applied with this email." },
        values,
      };
    }
    throw e;
  }
  return { status: "success", name: name.split(" ")[0] };
}
