import Link from "next/link";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { site } from "@/lib/site";
import { logout } from "./auth-actions";
import { ApplicationsTable, type Row } from "./applications-table";

export const metadata = { title: "Applications — Admin" };
export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const email = await requireAdmin();
  const apps = await db.application.findMany({ orderBy: { createdAt: "desc" } });

  const rows: Row[] = apps.map((a) => ({
    id: a.id,
    name: a.name,
    email: a.email,
    country: a.country,
    address: a.address,
    experience: a.experience,
    note: a.note,
    status: a.status as Row["status"],
    createdAt: a.createdAt.toISOString(),
  }));

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
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
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <h1 className="text-2xl font-bold tracking-tight">Applications</h1>
        <p className="mt-1 text-sm text-slate-500">Review, search, approve or decline applicants.</p>
        <ApplicationsTable rows={rows} />
      </main>
    </div>
  );
}
