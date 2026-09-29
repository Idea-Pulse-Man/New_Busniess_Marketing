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

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

export async function sendVerificationCode(to: string, firstName: string, code: string, minutesValid: number) {
  const hi = firstName ? `Hi ${firstName},` : "Hi,";
  const name = escapeHtml(site.name);
  await getTransport().sendMail({
    from: { name: site.name, address: gmailUser() },
    to,
    // Code first in the subject so it shows in the inbox preview and phone notifications.
    subject: `${code} is your ${site.name} confirmation code`,
    text: `${hi}\n\nYour ${site.name} confirmation code is:\n\n${code}\n\nEnter it on the application form to send your application. It expires in ${minutesValid} minutes.\n\nIf you didn't apply, you can ignore this email.\n`,
    html: `<!doctype html>
<html><body style="margin:0;padding:0;background:#f1f5f9">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 16px">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:16px;border:1px solid #e2e8f0">
<tr><td style="padding:32px 32px 8px;font-family:Inter,system-ui,-apple-system,'Segoe UI',sans-serif;color:#0f172a">
<table role="presentation" cellpadding="0" cellspacing="0"><tr>
<td style="width:32px;height:32px;background:#1f55e6;border-radius:8px;color:#ffffff;font-weight:700;font-size:16px;text-align:center;vertical-align:middle">${escapeHtml(site.name[0])}</td>
<td style="padding-left:10px;font-weight:700;font-size:16px">${name}</td>
</tr></table>
<p style="margin:28px 0 8px;font-size:15px">${escapeHtml(hi)}</p>
<p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#334155">Here is your code to confirm your email and send your application:</p>
<div style="background:#eef4ff;border:1px solid #d9e6ff;border-radius:12px;padding:20px;text-align:center;font-family:'SFMono-Regular',Consolas,'Liberation Mono',monospace;font-size:34px;font-weight:700;letter-spacing:10px;color:#1a45b8">${escapeHtml(code)}</div>
<p style="margin:20px 0 0;font-size:13px;line-height:1.6;color:#64748b">This code expires in ${minutesValid} minutes. Don't share it with anyone.</p>
</td></tr>
<tr><td style="padding:24px 32px 28px;font-family:Inter,system-ui,-apple-system,'Segoe UI',sans-serif;font-size:12px;line-height:1.6;color:#94a3b8;border-top:1px solid #f1f5f9">
If you didn't apply to ${name}, you can safely ignore this email.
</td></tr>
</table>
</td></tr>
</table>
</body></html>`,
  });
}
