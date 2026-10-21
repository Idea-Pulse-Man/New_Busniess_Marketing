# New_Busniess_Marketing

Job/talent site: a public landing page that explains the business and takes applications
(no account needed), plus a private admin dashboard for reviewing applicants.

Built with Next.js 15 (App Router), Tailwind CSS 4, Prisma + Supabase (Postgres). Deployed on Vercel.

## Run locally

```bash
npm install
cp .env.example .env        # paste Supabase URLs, set AUTH_SECRET
npm run db:migrate          # creates the tables in Supabase
npm run admin -- set-password you@example.com 'your-password'
npm run dev                 # http://localhost:3000
```

## Environment variables

Set these in `.env` locally and in Vercel → Project → Settings → Environment Variables:

| Name           | Value                                                                  |
| -------------- | ---------------------------------------------------------------------- |
| `DATABASE_URL` | Supabase **transaction pooler** URL (port 6543) + `?pgbouncer=true`   |
| `DIRECT_URL`   | Supabase **session pooler** URL (port 5432)                            |
| `AUTH_SECRET`  | Long random string (signs admin login cookies)                         |
| `GMAIL_USER`   | Gmail address that sends the emails (when Gmail is chosen)             |
| `GMAIL_APP_PASSWORD` | 16-character [app password](https://myaccount.google.com/apppasswords) for that account (needs 2-Step Verification) |
| `SENDGRID_API_KEY` | SendGrid API key with Mail Send permission (when SendGrid is chosen) |
| `SENDGRID_FROM` | Verified sender address in SendGrid, ideally on your own domain       |
| `MAIL_REPLY_TO` | Optional: address applicants' replies go to                           |
| `PROXYCHECK_KEY` | Optional [proxycheck.io](https://proxycheck.io) key for VPN/proxy blocking: 1,000 checks/day free (100/day without a key) |
| `CALENDLY_TOKEN` | Calendly personal access token (Calendly → Integrations → API & Webhooks). Works on the free plan |

Find the URLs in Supabase → **Connect** (top bar) → **ORMs** → Prisma. Every Vercel build (production
and `dev` previews) applies pending migrations in `prisma/migrations` first (`vercel-build` script,
uses `DIRECT_URL`); if a migration fails, the build fails and the previous version stays live.
Local `npm run build` does not touch the database — run `npm run db:migrate` yourself if needed.
Row Level Security is enabled on all tables, so they are not readable through Supabase's public API.

## Pages

| URL             | Who            | What                                                          |
| --------------- | -------------- | ------------------------------------------------------------- |
| `/`             | Everyone       | Business intro, how it works, FAQ, application form           |
| `/admin/login`  | Admin          | Log in with email + password                                  |
| `/admin/verify` | Admin          | Authenticator code (first login: scan QR code to set it up)   |
| `/admin`        | Admin          | Applications table                                            |

## Admin accounts

There is no sign-up page. Admin login is **email + password + authenticator app code** (TOTP —
Google Authenticator, Microsoft Authenticator, Authy, 1Password…). On an admin's first login they
must scan a QR code to set up their authenticator before they can reach the dashboard.
After 5 wrong passwords/codes the account is locked for 15 minutes.

Manage accounts from a terminal (with `.env` pointing at Supabase):

```bash
npm run admin -- list                                   # show admins + authenticator status
npm run admin -- set-password <email> '<password>'      # create account or change password
npm run admin -- reset-2fa <email>                      # lost phone: set up authenticator again
```

Only emails in the `ADMIN_EMAILS` list in `src/lib/session.ts` can log in.

**Application form fields:** name, email, optional WhatsApp number, date of birth (16+), country, address, experience dropdown + optional
“previous jobs” text box
(“No experience” is the default and highlighted as welcome), optional note.
One application per email. After submitting, the applicant is emailed a 6-digit code and types it
into the form, right where the form was (valid 15 minutes, 5 tries, new code after 60 seconds);
only confirmed applications appear in the admin dashboard. An unconfirmed application is replaced
if the same email applies again, so a fake entry can't block the real owner.

**VPN / proxy block:** when the form is sent, the applicant's IP is checked with proxycheck.io; VPN,
proxy and Tor IPs get an error asking them to turn it off. If the check can't run (service down,
daily limit reached), the application goes through. Local `npm run dev` (localhost) isn't checked.

**Video call (US, Canada, UK, Australia, Mexico, Brazil, Argentina, Colombia, Philippines, Vietnam,
Türkiye, Georgia, Armenia, Azerbaijan, Kazakhstan and Europe):** once their email is confirmed, applicants from these countries see the Calendly booking page (`calendly.com/goldenstar0124/30min`) right in the form,
with their name and email filled in. When they book, the site looks the booking up through Calendly's
API (needs `CALENDLY_TOKEN`), saves the call time, and emails them “Your video call with Pulse
Talent is booked” with the call date/time (in their time zone), hiring manager, email and WhatsApp.
If they leave before booking, applying again with the same email takes them back to the booking step.
The Calendly link, contact details and the country list are in `site.interview` in `src/lib/site.ts`.

**Settings** (top of the admin dashboard, saved in the database):
- **VPN / proxy check** on/off. When on, applications from VPN, proxy or Tor IPs are blocked.
- **Block site access** on/off (off by default). When on, visitors using a VPN, proxy or Tor, or from
  Russia, can't open the site (`/` and `/book`) at all; they see a short "not available" message.
  The country comes from Vercel's `x-vercel-ip-country` header (proxycheck.io elsewhere); the list
  is `BLOCKED_COUNTRIES` in `src/lib/proxycheck.ts`. Every page view uses a proxycheck.io check
  (each IP is remembered for an hour), so add `PROXYCHECK_KEY` before turning this on.
  The admin pages are never blocked.
- **Send emails with** Gmail or SendGrid. A dot marks a provider whose environment variables are
  missing. **Send test email to me** sends a test to the signed-in admin through the chosen provider.

Gmail allows about 500 sent emails per day. For SendGrid, send from your own domain with domain
authentication set up (SPF/DKIM); a @gmail.com sender through SendGrid usually lands in spam.
In `npm run dev` the code is also printed in the terminal, and the form still moves on if the email
can't be sent.

**Admin dashboard:** search, filters (status, experience, country), sort, show/hide columns,
row checkboxes + select-all (page, or all matching), bulk Approve / Decline / Mark pending / Delete,
per-row Approve / Decline / Undo, click a name for full details, CSV export. **Delete** only hides
applications from the dashboard: their information stays in the database, and the same email can apply
again (as a new application, while the old one is kept). Every field has its own
column (long addresses, previous jobs and notes wrap), and the Actions column stays pinned on the right
when the table scrolls sideways.
The list updates itself (every 10s while open, every minute in a background tab); new applications
get a "New" badge and show as a count in the browser tab title. Click **Enable desktop alerts** (top
right) once to get a desktop notification for each new application from a video-call country — this works while
the dashboard is open in a tab, even in the background (checked every minute there). The **Call**
column shows the video call time an applicant booked.

## Customising

- All landing-page wording (brand name, about text, steps, FAQ): `src/lib/site.ts`
- Experience options and country list: `src/lib/options.ts`
- Admin emails: `ADMIN_EMAILS` list in `src/lib/session.ts` (currently cat383437@gmail.com and
  goldenstar0124@gmail.com)
