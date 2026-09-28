"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { endSession, startSession } from "@/lib/auth";
import { isAdminEmail } from "@/lib/session";

export type AuthState = { error?: string; email?: string };

export async function signup(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (!isAdminEmail(email)) {
    return { error: "This email is not allowed to create an admin account.", email };
  }
  if (password.length < 8) return { error: "Password must be at least 8 characters.", email };
  if (password !== confirm) return { error: "Passwords do not match.", email };

  const existing = await db.admin.findUnique({ where: { email } });
  if (existing) return { error: "An account for this email already exists. Please log in.", email };

  await db.admin.create({ data: { email, passwordHash: await bcrypt.hash(password, 12) } });
  await startSession(email);
  redirect("/admin");
}

export async function login(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const invalid = { error: "Invalid email or password.", email };

  if (!isAdminEmail(email)) return invalid;
  const admin = await db.admin.findUnique({ where: { email } });
  if (!admin) return { error: "No admin account yet. Please sign up first.", email };
  if (!(await bcrypt.compare(password, admin.passwordHash))) return invalid;

  await startSession(email);
  redirect("/admin");
}

export async function logout() {
  await endSession();
  redirect("/admin/login");
}
