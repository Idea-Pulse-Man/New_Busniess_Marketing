import "server-only";
import { headers } from "next/headers";
import { getSettings } from "@/lib/settings";

// VPN / proxy detection through proxycheck.io. Works without a key (100 checks a day); a free
// account key (PROXYCHECK_KEY) raises that to 1,000 a day.

const PRIVATE_IP_RE = /^(127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|::1$|::ffff:127\.|f[cd]|fe80:)/i;

// Visitors from these countries (ISO codes) can't open the site while "Block site access" is on.
export const BLOCKED_COUNTRIES = ["RU"];

type IpInfo = { proxy: boolean; country: string | null };

// Successful lookups are kept for an hour so page views and form steps from the same visitor
// don't each use up a proxycheck.io check.
const CACHE_MS = 60 * 60 * 1000;
const cache = new Map<string, { info: IpInfo; at: number }>();

// The visitor's IP as reported by Vercel's proxy (first x-forwarded-for entry).
export async function clientIp() {
  const h = await headers();
  return (h.get("x-forwarded-for")?.split(",")[0] ?? h.get("x-real-ip") ?? "").trim();
}

// Whether the IP is a known VPN, proxy or Tor exit, and its country. Clean, local, or the check
// couldn't run (service down, daily limit reached) → not a proxy, so visitors aren't blocked by an outage.
async function lookupIp(ip: string): Promise<IpInfo> {
  const clean: IpInfo = { proxy: false, country: null };
  if (!ip || PRIVATE_IP_RE.test(ip)) return clean;
  const hit = cache.get(ip);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.info;

  const key = (process.env.PROXYCHECK_KEY ?? "").trim().replace(/^(["'])(.*)\1$/, "$2");
  const url = `https://proxycheck.io/v2/${encodeURIComponent(ip)}?vpn=1&asn=1${key ? `&key=${encodeURIComponent(key)}` : ""}`;
  try {
    const res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(4000) });
    const data = await res.json();
    // "ok", or "warning" (e.g. close to the daily limit) still carries a result.
    if (data?.status !== "ok" && data?.status !== "warning") {
      console.error("proxycheck.io:", data?.status, data?.message);
      return clean;
    }
    const info: IpInfo = { proxy: data[ip]?.proxy === "yes", country: data[ip]?.isocode ?? null };
    if (cache.size > 5000) cache.clear();
    cache.set(ip, { info, at: Date.now() });
    return info;
  } catch (e) {
    console.error("proxycheck.io lookup failed", e);
    return clean;
  }
}

export async function isProxy(ip: string): Promise<boolean> {
  return (await lookupIp(ip)).proxy;
}

export type BlockReason = "proxy" | "country";

export const BLOCKED_MESSAGES: Record<BlockReason, string> = {
  proxy: "It looks like you're using a VPN or proxy. Please turn it off and try again.",
  country: "Sorry, this site isn't available in your region.",
};

// Why this visitor isn't allowed on the public site, or null. Only applies while "Block site
// access" is on (admin dashboard → Settings).
export async function accessBlocked(): Promise<BlockReason | null> {
  if (!(await getSettings()).blockAccess) return null;
  const ip = await clientIp();
  // Vercel tells us the country for free; fall back to proxycheck.io's answer elsewhere.
  const vercelCountry = (await headers()).get("x-vercel-ip-country")?.toUpperCase();
  if (vercelCountry && BLOCKED_COUNTRIES.includes(vercelCountry)) return "country";
  const info = await lookupIp(ip);
  if (info.proxy) return "proxy";
  if (!vercelCountry && info.country && BLOCKED_COUNTRIES.includes(info.country.toUpperCase())) return "country";
  return null;
}
