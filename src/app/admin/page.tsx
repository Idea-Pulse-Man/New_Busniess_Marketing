import Link from "next/link";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { mailProviderConfigured } from "@/lib/mail";
import { getSettings } from "@/lib/settings";
import { site } from "@/lib/site";
import { logout } from "./auth-actions";
import { ApplicationsTable, type Row } from "./applications-table";
import { SettingsPanel } from "./settings-panel";

export const metadata = { title: "Applications — Admin" };
export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const email = await requireAdmin();
  // Unconfirmed emails may be fake or mistyped; admins only see applications whose email was confirmed.
  // Deleted applications are kept in the database but not shown.
  const [apps, settings] = await Promise.all([
    db.application.findMany({ where: { emailVerified: true, deletedAt: null }, orderBy: { createdAt: "desc" } }),
    getSettings(),
  ]);

  const rows: Row[] = apps.map((a) => ({
    id: a.id,
    name: a.name,
    email: a.email,
    whatsapp: a.whatsapp,
    birthday: a.birthday,
    country: a.country,
    address: a.address,
    experience: a.experience,
    experienceDetail: a.experienceDetail,
    note: a.note,
    status: a.status as Row["status"],
    callAt: a.callAt?.toISOString() ?? null,
    createdAt: a.createdAt.toISOString(),
  }));

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2 font-bold">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white">
              {site.name[0]}
            </span>
            {site.name} <span className="font-normal text-slate-400">/ Admin</span>
          </Link>
          <div className="flex items-center gap-4 text-sm">
            <span className="hidden text-slate-500 sm:inline">{email}</span>
            <form action={logout}>
              <button className="btn btn-ghost py-1.5">Log out</button>
            </form>
          </div>
        </div>
      </header>
      <main className="px-4 py-8 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-bold tracking-tight">Applications</h1>
        <p className="mt-1 text-sm text-slate-500">Review, search, approve or decline applicants.</p>
        <SettingsPanel
          settings={settings}
          configured={{ gmail: mailProviderConfigured("gmail"), sendgrid: mailProviderConfigured("sendgrid") }}
        />
        <ApplicationsTable rows={rows} />
      </main>
    </div>
  );
}
