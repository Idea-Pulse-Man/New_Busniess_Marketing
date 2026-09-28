import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, SESSION_MAX_AGE, signSession, verifySession, type SessionStage } from "./session";

export async function getSession() {
  const store = await cookies();
  return verifySession(store.get(SESSION_COOKIE)?.value);
}

/** Use at the top of every admin page and admin server action. Returns the admin email. */
export async function requireAdmin() {
  const session = await getSession();
  if (session?.stage !== "full") redirect("/admin/login");
  return session.email;
}

/** For the authenticator step: password already checked, code not yet. */
export async function requireMfaPending() {
  const session = await getSession();
  if (!session) redirect("/admin/login");
  if (session.stage === "full") redirect("/admin");
  return session.email;
}

export async function startSession(email: string, stage: SessionStage) {
  const store = await cookies();
  store.set(SESSION_COOKIE, await signSession({ email, stage }), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE[stage],
  });
}

export async function endSession() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}
