import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { headers } from "next/headers";

// Personal links to the booking page (/book?id=…&s=…), emailed to applicants from an interview
// country so they can book their video call later. Signed, so an id alone can't open someone's page.

function signature(id: string) {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not set");
  return createHmac("sha256", secret).update(`book:${id}`).digest("base64url").slice(0, 32);
}

export function validBookingLink(id: string, sig: string) {
  const expected = Buffer.from(signature(id));
  const given = Buffer.from(sig);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

// The full link, on the domain the current request came in on.
export async function bookingLink(id: string) {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}/book?id=${encodeURIComponent(id)}&s=${signature(id)}`;
}
