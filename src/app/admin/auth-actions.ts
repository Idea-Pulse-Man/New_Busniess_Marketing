"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { endSession, requireMfaPending, startSession } from "@/lib/auth";
import { isAdminEmail } from "@/lib/session";
import { verifyCode } from "@/lib/totp";

export type AuthState = { error?: string; email?: string };

const MAX_FAILS = 5;
const LOCK_MINUTES = 15;

// Compared against when the email has no account, so response time doesn't reveal which emails exist.
const DUMMY_HASH = "$2b$12$GfzJvROatommeL9IZXNy9eFyQyIVYPC1r05RM1tJp6bBqcFKxKhCa";

function lockedMessage(until: Date) {
  const mins = Math.max(1, Math.ceil((until.getTime() - Date.now()) / 60000));
  return `Too many failed attempts. Try again in ${mins} minute${mins === 1 ? "" : "s"}.`;
}

/** Counts a failed password/code attempt; locks the account after MAX_FAILS. */
async function recordFailure(id: string) {
  // Atomic increment so parallel guesses can't slip past the limit.
  const { failedLogins } = await db.admin.update({ where: { id }, data: { failedLogins: { increment: 1 } } });
  if (failedLogins >= MAX_FAILS) {
    await db.admin.update({
      where: { id },
      data: { failedLogins: 0, lockedUntil: new Date(Date.now() + LOCK_MINUTES * 60000) },
    });
  }
}

export async function login(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const invalid = { error: "Invalid email or password.", email };

  const admin = isAdminEmail(email) ? await db.admin.findUnique({ where: { email } }) : null;
  if (!admin) {
    await bcrypt.compare(password, DUMMY_HASH);
    return invalid;
  }
  if (admin.lockedUntil && admin.lockedUntil > new Date()) {
    return { error: lockedMessage(admin.lockedUntil), email };
  }
  if (!(await bcrypt.compare(password, admin.passwordHash))) {
    await recordFailure(admin.id);
    return invalid;
  }

  // Password OK — now the authenticator step (setup on first login, code otherwise).
  await startSession(email, "mfa");
  redirect("/admin/verify");
}

export type VerifyState = { error?: string };

export async function verifyAuthenticator(_prev: VerifyState, formData: FormData): Promise<VerifyState> {
  const email = await requireMfaPending();
  const code = String(formData.get("code") ?? "");

  const admin = await db.admin.findUnique({ where: { email } });
  if (!admin?.totpSecret) redirect("/admin/login");
  if (admin.lockedUntil && admin.lockedUntil > new Date()) {
    return { error: lockedMessage(admin.lockedUntil) };
  }

  const step = verifyCode(admin.totpSecret, code, admin.totpLastStep);
  if (step === null) {
    await recordFailure(admin.id);
    return { error: "That code isn't right. Check the 6 digits in your authenticator app and try again." };
  }

  // Only succeeds if no other request already used this (or a later) code.
  const { count } = await db.admin.updateMany({
    where: { id: admin.id, OR: [{ totpLastStep: null }, { totpLastStep: { lt: step } }] },
    data: { totpEnabled: true, totpLastStep: step, failedLogins: 0, lockedUntil: null },
  });
  if (count === 0) return { error: "That code was already used. Wait for the next code and try again." };
  await startSession(email, "full");
  redirect("/admin");
}

export async function logout() {
  await endSession();
  redirect("/admin/login");
}
