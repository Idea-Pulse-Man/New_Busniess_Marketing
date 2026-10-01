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
| `GMAIL_USER`   | Gmail address that sends the "confirm your email" messages             |
| `GMAIL_APP_PASSWORD` | 16-character [app password](https://myaccount.google.com/apppasswords) for that account (needs 2-Step Verification) |

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
Gmail allows about 500 sent emails per day. In `npm run dev` the code is also printed in the
terminal, and the form still moves on if the email can't be sent (e.g. a network that blocks
`smtp.gmail.com`).

**Admin dashboard:** search, filters (status, experience, country), sort, show/hide columns,
row checkboxes + select-all (page, or all matching), bulk Approve / Decline / Mark pending / Delete,
per-row Approve / Decline / Undo, click a name for full details, CSV export.
The list updates itself (every 10s while open, every minute in a background tab); new applications
get a "New" badge and show as a count in the browser tab title.

## Customising

- All landing-page wording (brand name, about text, steps, FAQ): `src/lib/site.ts`
- Experience options and country list: `src/lib/options.ts`
- Admin emails: `ADMIN_EMAILS` list in `src/lib/session.ts` (currently cat383437@gmail.com and
  goldenstar0124@gmail.com)
