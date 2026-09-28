# New_Busniess_Marketing

Job/talent site: a public landing page that explains the business and takes applications
(no account needed), plus a private admin dashboard for reviewing applicants.

Built with Next.js 15 (App Router), Tailwind CSS 4, Prisma + Supabase (Postgres). Deployed on Vercel.

## Run locally

```bash
npm install
cp .env.example .env        # paste Supabase URLs, set AUTH_SECRET
npm run db:migrate          # creates the tables in Supabase
npm run dev                 # http://localhost:3000
```

## Environment variables

Set these in `.env` locally and in Vercel → Project → Settings → Environment Variables:

| Name           | Value                                                                  |
| -------------- | ---------------------------------------------------------------------- |
| `DATABASE_URL` | Supabase **transaction pooler** URL (port 6543) + `?pgbouncer=true`   |
| `DIRECT_URL`   | Supabase **session pooler** URL (port 5432)                            |
| `AUTH_SECRET`  | Long random string (signs admin login cookies)                         |
| `ADMIN_EMAIL`  | `cat383437@gmail.com`                                                  |

Find the URLs in Supabase → **Connect** (top bar) → **ORMs** → Prisma. Vercel builds do **not**
touch the database — apply new migrations in `prisma/migrations` yourself with `npm run db:migrate`
(with `.env` pointing at Supabase) before deploying code that needs them.
Row Level Security is enabled on all tables, so they are not readable through Supabase's public API.

## Pages

| URL             | Who            | What                                                          |
| --------------- | -------------- | ------------------------------------------------------------- |
| `/`             | Everyone       | Business intro, how it works, FAQ, application form           |
| `/admin/signup` | Admin (once)   | Create the admin account — only `ADMIN_EMAIL` is accepted     |
| `/admin/login`  | Admin          | Log in                                                        |
| `/admin`        | Admin          | Applications table                                            |

**Application form fields:** name, email, country, address, experience
(“No experience” is the default and highlighted as welcome), optional note.
One application per email.

**Admin dashboard:** search, filters (status, experience, country), sort, show/hide columns,
row checkboxes + select-all (page, or all matching), bulk Approve / Decline / Mark pending / Delete,
per-row Approve / Decline / Undo, click a name for full details, CSV export.

## Customising

- All landing-page wording (brand name, about text, steps, FAQ): `src/lib/site.ts`
- Experience options and country list: `src/lib/options.ts`
- Admin email: `ADMIN_EMAIL` in `.env`
