// Edge-safe session helpers (used by middleware and server code).
import { SignJWT } from "jose/jwt/sign";
import { jwtVerify } from "jose/jwt/verify";

export const SESSION_COOKIE = "admin_session";

// "mfa": password checked, authenticator code still required. "full": fully logged in.
export type SessionStage = "mfa" | "full";
export type Session = { email: string; stage: SessionStage };

export const SESSION_MAX_AGE: Record<SessionStage, number> = {
  mfa: 60 * 10, // 10 minutes to enter the code
  full: 60 * 60 * 24 * 7, // 7 days
};

// The only emails that can log in to /admin. Accounts are created with `npm run admin`.
const ADMIN_EMAILS = ["cat383437@gmail.com", "goldenstar0124@gmail.com"];

export function isAdminEmail(email: string) {
  return ADMIN_EMAILS.includes(email);
}

function secretKey() {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error("AUTH_SECRET is missing or too short. Set it in .env");
  }
  return new TextEncoder().encode(secret);
}

export async function signSession({ email, stage }: Session) {
  return new SignJWT({ email, stage })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE[stage]}s`)
    .sign(secretKey());
}

/** Returns the session if the token is valid and belongs to an admin. */
export async function verifySession(token: string | undefined): Promise<Session | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey());
    const { email, stage } = payload;
    if (typeof email !== "string" || !isAdminEmail(email)) return null;
    if (stage !== "mfa" && stage !== "full") return null;
    return { email, stage };
  } catch {
    return null;
  }
}
