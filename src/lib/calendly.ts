import "server-only";

// Reads bookings through Calendly's API with a personal access token
// (Calendly → Integrations → API & Webhooks). Works on the free plan.

const INVITEE_URI_RE = /^https:\/\/api\.calendly\.com\/scheduled_events\/[\w-]+\/invitees\/[\w-]+$/;

async function get(url: string) {
  const token = (process.env.CALENDLY_TOKEN ?? "").trim().replace(/^(["'])(.*)\1$/, "$2");
  if (!token) throw new Error("CALENDLY_TOKEN is not set");
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
  if (!res.ok) throw new Error(`Calendly API ${res.status} for ${url}`);
  return (await res.json()).resource;
}

export type Booking = { start: Date; timezone: string };

// The booking behind an invitee URI (as reported by the embedded Calendly widget), or null if the
// URI isn't a Calendly invitee or the booking was canceled. Throws if the API can't be reached.
export async function getBooking(inviteeUri: string): Promise<Booking | null> {
  if (!INVITEE_URI_RE.test(inviteeUri)) return null;
  const invitee = await get(inviteeUri);
  if (invitee?.status !== "active" || typeof invitee.event !== "string") return null;
  const event = await get(invitee.event);
  const start = new Date(event?.start_time);
  if (event?.status !== "active" || Number.isNaN(start.getTime())) return null;
  return { start, timezone: typeof invitee.timezone === "string" ? invitee.timezone : "" };
}

// "September 30, 2026 at 2:00 PM CDT", in the applicant's own time zone.
export function formatCallTime(start: Date, timezone: string) {
  const opts: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  };
  try {
    return start.toLocaleString("en-US", { ...opts, timeZone: timezone || "UTC" });
  } catch {
    return start.toLocaleString("en-US", { ...opts, timeZone: "UTC" });
  }
}
