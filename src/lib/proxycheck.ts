import "server-only";
import { headers } from "next/headers";

// VPN / proxy detection through proxycheck.io. Works without a key (100 checks a day); a free
// account key (PROXYCHECK_KEY) raises that to 1,000 a day.

const PRIVATE_IP_RE = /^(127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|::1$|::ffff:127\.|f[cd]|fe80:)/i;

// The visitor's IP as reported by Vercel's proxy (first x-forwarded-for entry).
export async function clientIp() {
  const h = await headers();
  return (h.get("x-forwarded-for")?.split(",")[0] ?? h.get("x-real-ip") ?? "").trim();
}

// True if the IP is a known VPN, proxy or Tor exit; false if it's clean, local, or the check
// couldn't run (service down, daily limit reached) — applicants aren't blocked by an outage.
export async function isProxy(ip: string): Promise<boolean> {
  if (!ip || PRIVATE_IP_RE.test(ip)) return false;
  const key = (process.env.PROXYCHECK_KEY ?? "").trim().replace(/^(["'])(.*)\1$/, "$2");
  const url = `https://proxycheck.io/v2/${encodeURIComponent(ip)}?vpn=1${key ? `&key=${encodeURIComponent(key)}` : ""}`;
  try {
    const res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(4000) });
    const data = await res.json();
    // "ok", or "warning" (e.g. close to the daily limit) still carries a result.
    if (data?.status !== "ok" && data?.status !== "warning") {
      console.error("proxycheck.io:", data?.status, data?.message);
      return false;
    }
    return data[ip]?.proxy === "yes";
  } catch (e) {
    console.error("proxycheck.io lookup failed", e);
    return false;
  }
}
