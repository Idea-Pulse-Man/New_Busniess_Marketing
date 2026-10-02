import "server-only";
import nodemailer, { type Transporter } from "nodemailer";
import { getSettings, type MailProvider } from "@/lib/settings";
import { site } from "@/lib/site";

// Sends through the provider chosen on the admin dashboard (Settings):
//   gmail    — a Gmail account with an app password (Google Account → Security → App passwords)
//   sendgrid — SendGrid's API, from a sender verified in SendGrid
type Mail = { to: string; subject: string; text: string; html: string };

// Tolerates values pasted into a hosting dashboard with surrounding quotes or stray spaces.
function envValue(name: string) {
  return (process.env[name] ?? "").trim().replace(/^(["'])(.*)\1$/, "$2").trim();
}

/** Whether the environment variables a provider needs are set (shown on the admin dashboard). */
export function mailProviderConfigured(provider: MailProvider) {
  return provider === "gmail"
    ? Boolean(envValue("GMAIL_USER") && envValue("GMAIL_APP_PASSWORD"))
    : Boolean(envValue("SENDGRID_API_KEY") && envValue("SENDGRID_FROM"));
}

let transport: Transporter | undefined;

async function sendWithGmail(mail: Mail, replyTo: string) {
  const user = envValue("GMAIL_USER");
  const pass = envValue("GMAIL_APP_PASSWORD").replace(/\s+/g, "");
  if (!user || !pass) throw new Error("GMAIL_USER and GMAIL_APP_PASSWORD must be set to send email with Gmail.");
  transport ??= nodemailer.createTransport({ service: "gmail", auth: { user, pass } });
  await transport.sendMail({ from: { name: site.name, address: user }, ...(replyTo && { replyTo }), ...mail });
}

async function sendWithSendGrid(mail: Mail, replyTo: string) {
  const key = envValue("SENDGRID_API_KEY");
  const from = envValue("SENDGRID_FROM");
  if (!key || !from) throw new Error("SENDGRID_API_KEY and SENDGRID_FROM must be set to send email with SendGrid.");
  const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: mail.to }] }],
      from: { email: from, name: site.name },
      ...(replyTo && { reply_to: { email: replyTo } }),
      subject: mail.subject,
      // SendGrid requires text/plain before text/html.
      content: [
        { type: "text/plain", value: mail.text },
        { type: "text/html", value: mail.html },
      ],
    }),
  });
  if (!res.ok) throw new Error(`SendGrid returned ${res.status}: ${await res.text()}`);
}

async function sendMail(mail: Mail) {
  const { mailProvider } = await getSettings();
  const replyTo = envValue("MAIL_REPLY_TO");
  if (mailProvider === "sendgrid") await sendWithSendGrid(mail, replyTo);
  else await sendWithGmail(mail, replyTo);
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

export async function sendVerificationCode(to: string, firstName: string, code: string, minutesValid: number) {
  const hi = firstName ? `Hi ${firstName},` : "Hi,";
  const name = escapeHtml(site.name);
  await sendMail({
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

// Sent once an applicant has booked their video call. `when` is the call time, already formatted.
export async function sendCallBooked(to: string, name: string, when: string) {
  const { whatsapp, email, hiringManager } = site.interview;
  const details: [string, string][] = [
    ["Call time", when],
    ["With", hiringManager],
    ["Email", email],
    ["WhatsApp", whatsapp],
  ];
  const intro = `Thanks for applying to ${site.name}. Your video call is booked — here are the details. On the call we'll go over your application, the available roles, and answer your questions.`;
  const footer = `You're receiving this because you applied at ${site.name} and booked a call. If that wasn't you, you can ignore this email.`;
  const brand = escapeHtml(site.name);
  const rows = details
    .map(
      ([label, value]) =>
        `<tr><td style="padding:6px 0;width:130px;font-size:14px;color:#64748b;vertical-align:top">${label}:</td><td style="padding:6px 0;font-size:14px;font-weight:600;color:#0f172a">${escapeHtml(value)}</td></tr>`,
    )
    .join("");
  await sendMail({
    to,
    subject: `Your video call with ${site.name} is booked`,
    text: `Hi ${name},\n\n${intro}\n\n${details.map(([l, v]) => `${l}: ${v}`).join("\n")}\n\nNeed to reschedule or have a question? Just reply to this email.\n\n${site.name}\n\n--\n${footer}\n`,
    html: `<!doctype html>
<html><body style="margin:0;padding:0;background:#f1f5f9">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 16px">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:16px;border:1px solid #e2e8f0">
<tr><td style="padding:32px;font-family:Inter,system-ui,-apple-system,'Segoe UI',sans-serif;color:#0f172a">
<table role="presentation" cellpadding="0" cellspacing="0"><tr>
<td style="width:32px;height:32px;background:#1f55e6;border-radius:8px;color:#ffffff;font-weight:700;font-size:16px;text-align:center;vertical-align:middle">${escapeHtml(site.name[0])}</td>
<td style="padding-left:10px;font-weight:700;font-size:16px">${brand}</td>
</tr></table>
<p style="margin:28px 0 8px;font-size:15px">Hi ${escapeHtml(name)},</p>
<p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#334155">${escapeHtml(intro)}</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef4ff;border:1px solid #d9e6ff;border-radius:12px;padding:14px 20px">${rows}</table>
<p style="margin:24px 0 0;font-size:15px;line-height:1.6;color:#334155">Need to reschedule or have a question? Just reply to this email.</p>
<p style="margin:16px 0 0;font-size:15px;color:#334155">${brand}</p>
</td></tr>
<tr><td style="padding:24px 32px 28px;font-family:Inter,system-ui,-apple-system,'Segoe UI',sans-serif;font-size:12px;line-height:1.6;color:#94a3b8;border-top:1px solid #f1f5f9">
${escapeHtml(footer)}
</td></tr>
</table>
</td></tr>
</table>
</body></html>`,
  });
}

// Sent to applicants from an interview country once their email is confirmed (and again from the
// admin dashboard), so they can book their video call even if they left the page before booking.
export async function sendBookingLink(to: string, name: string, link: string) {
  const { whatsapp, hiringManager } = site.interview;
  const intro = `Thanks for applying to ${site.name}. One last step: pick a time for a short video call with our hiring manager, ${hiringManager}. On the call we'll go over your application and the available roles.`;
  const footer = `You're receiving this because you applied at ${site.name}. If that wasn't you, you can ignore this email.`;
  const brand = escapeHtml(site.name);
  await sendMail({
    to,
    subject: `Book your video call with ${site.name}`,
    text: `Hi ${name},\n\n${intro}\n\nBook your call here:\n${link}\n\nQuestions? Reply to this email or message us on WhatsApp at ${whatsapp}.\n\n${site.name}\n\n--\n${footer}\n`,
    html: `<!doctype html>
<html><body style="margin:0;padding:0;background:#f1f5f9">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 16px">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:16px;border:1px solid #e2e8f0">
<tr><td style="padding:32px;font-family:Inter,system-ui,-apple-system,'Segoe UI',sans-serif;color:#0f172a">
<table role="presentation" cellpadding="0" cellspacing="0"><tr>
<td style="width:32px;height:32px;background:#1f55e6;border-radius:8px;color:#ffffff;font-weight:700;font-size:16px;text-align:center;vertical-align:middle">${escapeHtml(site.name[0])}</td>
<td style="padding-left:10px;font-weight:700;font-size:16px">${brand}</td>
</tr></table>
<p style="margin:28px 0 8px;font-size:15px">Hi ${escapeHtml(name)},</p>
<p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#334155">${escapeHtml(intro)}</p>
<p style="margin:0;text-align:center"><a href="${escapeHtml(link)}" style="display:inline-block;background:#1f55e6;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:12px 28px;border-radius:10px">Book your call</a></p>
<p style="margin:24px 0 0;font-size:15px;line-height:1.6;color:#334155">Questions? Reply to this email or message us on WhatsApp at ${escapeHtml(whatsapp)}.</p>
<p style="margin:16px 0 0;font-size:15px;color:#334155">${brand}</p>
</td></tr>
<tr><td style="padding:24px 32px 28px;font-family:Inter,system-ui,-apple-system,'Segoe UI',sans-serif;font-size:12px;line-height:1.6;color:#94a3b8;border-top:1px solid #f1f5f9">
${escapeHtml(footer)}
</td></tr>
</table>
</td></tr>
</table>
</body></html>`,
  });
}

// Sent from the admin dashboard to check the chosen provider works.
export async function sendTestEmail(to: string) {
  const { mailProvider } = await getSettings();
  const via = mailProvider === "sendgrid" ? "SendGrid" : "Gmail";
  const text = `This is a test email from the ${site.name} admin dashboard, sent with ${via}. If you can read this, email is working.`;
  await sendMail({
    to,
    subject: `${site.name} test email (${via})`,
    text: `${text}\n`,
    html: `<p style="font-family:Inter,system-ui,-apple-system,'Segoe UI',sans-serif;font-size:15px;color:#0f172a">${escapeHtml(text)}</p>`,
  });
}
