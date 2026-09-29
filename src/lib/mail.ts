import "server-only";
import nodemailer, { type Transporter } from "nodemailer";
import { site } from "@/lib/site";

// Sends through a Gmail account using an app password (Google Account → Security → App passwords).
let transport: Transporter | undefined;

// Tolerates values pasted into a hosting dashboard with surrounding quotes or stray spaces.
function envValue(name: string) {
  return (process.env[name] ?? "").trim().replace(/^(["'])(.*)\1$/, "$2").trim();
}

function gmailUser() {
  return envValue("GMAIL_USER");
}

function getTransport() {
  const user = gmailUser();
  const pass = envValue("GMAIL_APP_PASSWORD").replace(/\s+/g, "");
  if (!user || !pass) throw new Error("GMAIL_USER and GMAIL_APP_PASSWORD must be set to send email.");
  transport ??= nodemailer.createTransport({ service: "gmail", auth: { user, pass } });
  return transport;
}

// Public base URL for links in emails. Never taken from request headers, which a visitor controls.
export function siteUrl() {
  if (process.env.SITE_URL) return process.env.SITE_URL.replace(/\/+$/, "");
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  return "http://localhost:3000";
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

export async function sendVerificationEmail(to: string, firstName: string, link: string) {
  const hi = firstName ? `Hi ${firstName},` : "Hi,";
  await getTransport().sendMail({
    from: { name: site.name, address: gmailUser() },
    to,
    subject: `Confirm your email to finish your ${site.name} application`,
    text: `${hi}\n\nThanks for applying to ${site.name}. Please confirm your email address to send your application:\n\n${link}\n\nThis link expires in 24 hours. If you didn't apply, you can ignore this email.\n`,
    html: `<div style="font-family:system-ui,sans-serif;font-size:15px;line-height:1.5;color:#0f172a">
<p>${escapeHtml(hi)}</p>
<p>Thanks for applying to ${escapeHtml(site.name)}. Please confirm your email address to send your application:</p>
<p><a href="${escapeHtml(link)}" style="display:inline-block;background:#1f55e6;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:600">Confirm my email</a></p>
<p style="color:#64748b;font-size:13px">Or paste this link into your browser:<br>${escapeHtml(link)}</p>
<p style="color:#64748b;font-size:13px">This link expires in 24 hours. If you didn't apply, you can ignore this email.</p>
</div>`,
  });
}
