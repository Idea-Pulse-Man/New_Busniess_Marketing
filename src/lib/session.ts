// Edge-safe session helpers (used by middleware and server code).
import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "admin_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

// Emails allowed to sign up / log in to /admin. Each gets its own account.
const ADMIN_EMAILS = ["cat383437@gmail.com", "goldenstar0124@gmail.com"];

/** Built-in list plus any extra comma-separated emails from the ADMIN_EMAILS env var. */
export function isAdminEmail(email: string) {
  const extra = (process.env.ADMIN_EMAILS ?? process.env.ADMIN_EMAIL ?? "").split(",");
  return [...ADMIN_EMAILS, ...extra].some((e) => e.trim().toLowerCase() === email);
}

function secretKey() {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error("AUTH_SECRET is missing or too short. Set it in .env");
  }
  return new TextEncoder().encode(secret);
}

export async function signSession(email: string) {
  return new SignJWT({ email })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(secretKey());
}

/** Returns the admin email if the token is valid and belongs to the admin. */
export async function verifySession(token: string | undefined) {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey());
    const email = typeof payload.email === "string" ? payload.email : null;
    return email && isAdminEmail(email) ? email : null;
  } catch {
    return null;
  }
}
