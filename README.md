# New_Busniess_Marketing

Job/talent site: a public landing page that explains the business and takes applications
(no account needed), plus a private admin dashboard for reviewing applicants.

Built with Next.js 15 (App Router), Tailwind CSS 4, Prisma + SQLite.

## Run locally

```bash
npm install
cp .env.example .env        # then set AUTH_SECRET to a long random string
npx prisma db push          # creates prisma/dev.db
npm run dev                 # http://localhost:3000
```

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

## Deploying

SQLite is for local development. For hosting (e.g. Vercel), switch `provider` in
`prisma/schema.prisma` to `postgresql`, point `DATABASE_URL` at a hosted Postgres database,
and set `AUTH_SECRET` and `ADMIN_EMAIL` in the host's environment variables.
