"use client";

import { Fragment, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { deleteApplications, setStatus } from "./actions";
import { EXPERIENCE_OPTIONS, EXPERIENCE_SHORT, STATUSES, type Status } from "@/lib/options";

export type Row = {
  id: string;
  name: string;
  email: string;
  country: string;
  address: string;
  experience: string;
  note: string;
  status: Status;
  createdAt: string;
};

type ColumnKey = "email" | "country" | "address" | "experience" | "status" | "createdAt";
type SortKey = "newest" | "oldest" | "name" | "country";

const COLUMNS: { key: ColumnKey; label: string }[] = [
  { key: "email", label: "Email" },
  { key: "country", label: "Country" },
  { key: "address", label: "Address" },
  { key: "experience", label: "Experience" },
  { key: "status", label: "Status" },
  { key: "createdAt", label: "Applied" },
];

const PAGE_SIZE = 50;

const STATUS_STYLE: Record<Status, string> = {
  pending: "bg-amber-50 text-amber-700 ring-amber-200",
  approved: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  declined: "bg-red-50 text-red-700 ring-red-200",
};

export function ApplicationsTable({ rows }: { rows: Row[] }) {
  const [query, setQuery] = useState("");
  const [status, setStatusFilter] = useState<"all" | Status>("all");
  const [experience, setExperience] = useState("all");
  const [country, setCountry] = useState("all");
  const [sort, setSort] = useState<SortKey>("newest");
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [visible, setVisible] = useState<Set<ColumnKey>>(new Set(COLUMNS.map((c) => c.key)));
  const [expanded, setExpanded] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const countries = useMemo(() => [...new Set(rows.map((r) => r.country))].sort(), [rows]);

  const counts = useMemo(() => {
    const c = { total: rows.length, pending: 0, approved: 0, declined: 0, none: 0 };
    for (const r of rows) {
      c[r.status]++;
      if (r.experience === "none") c.none++;
    }
    return c;
  }, [rows]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = rows.filter(
      (r) =>
        (status === "all" || r.status === status) &&
        (experience === "all" || r.experience === experience) &&
        (country === "all" || r.country === country) &&
        (!q || [r.name, r.email, r.country, r.address, r.note].some((f) => f.toLowerCase().includes(q))),
    );
    const byDate = (a: Row, b: Row) => a.createdAt.localeCompare(b.createdAt);
    list.sort(
      sort === "newest"
        ? (a, b) => byDate(b, a)
        : sort === "oldest"
          ? byDate
          : sort === "name"
            ? (a, b) => a.name.localeCompare(b.name)
            : (a, b) => a.country.localeCompare(b.country) || a.name.localeCompare(b.name),
    );
    return list;
  }, [rows, query, status, experience, country, sort]);

  // Reset to first page when filters change; drop selections that no longer exist.
  useEffect(() => setPage(0), [query, status, experience, country, sort]);
  useEffect(() => {
    const ids = new Set(rows.map((r) => r.id));
    setSelected((prev) => new Set([...prev].filter((id) => ids.has(id))));
  }, [rows]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const pageAllSelected = pageRows.length > 0 && pageRows.every((r) => selected.has(r.id));
  const pageSomeSelected = pageRows.some((r) => selected.has(r.id));
  const allFilteredSelected = filtered.length > 0 && filtered.every((r) => selected.has(r.id));

  const headerBox = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (headerBox.current) headerBox.current.indeterminate = pageSomeSelected && !pageAllSelected;
  }, [pageSomeSelected, pageAllSelected]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function togglePage() {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const r of pageRows) {
        if (pageAllSelected) next.delete(r.id);
        else next.add(r.id);
      }
      return next;
    });
  }

  function flash(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }

  function run(ids: string[], next: Status | "delete") {
    if (!ids.length) return;
    if (next === "delete" && !confirm(`Permanently delete ${ids.length} application(s)?`)) return;
    startTransition(async () => {
      if (next === "delete") {
        const { count } = await deleteApplications(ids);
        flash(`Deleted ${count} application(s)`);
      } else {
        const { count } = await setStatus(ids, next);
        flash(`${count} application(s) marked ${next}`);
      }
      setSelected(new Set());
    });
  }

  function exportCsv() {
    const source = selected.size ? rows.filter((r) => selected.has(r.id)) : filtered;
    const header = ["Name", "Email", "Country", "Address", "Experience", "Status", "Applied", "Note"];
    const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const lines = source.map((r) =>
      [r.name, r.email, r.country, r.address, EXPERIENCE_SHORT[r.experience] ?? r.experience, r.status, r.createdAt, r.note]
        .map(esc)
        .join(","),
    );
    const blob = new Blob([[header.join(","), ...lines].join("\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `applications-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  const hasFilters = query || status !== "all" || experience !== "all" || country !== "all";
  const selectedIds = [...selected];
  const colSpan = 2 + visible.size + 1;

  return (
    <div className="mt-6 space-y-4">
      {/* Summary cards (click to filter) */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <Stat label="Total" value={counts.total} active={status === "all"} onClick={() => setStatusFilter("all")} />
        {STATUSES.map((s) => (
          <Stat
            key={s}
            label={cap(s)}
            value={counts[s]}
            active={status === s}
            onClick={() => setStatusFilter(s)}
          />
        ))}
        <Stat
          label="No experience"
          value={counts.none}
          active={experience === "none"}
          onClick={() => setExperience(experience === "none" ? "all" : "none")}
        />
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-3 rounded-xl bg-white p-4 ring-1 ring-slate-200 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <svg className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.45 4.39l3.08 3.08a.75.75 0 11-1.06 1.06l-3.08-3.08A7 7 0 012 9z" clipRule="evenodd" />
          </svg>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, email, country, address, notes…"
            className="input pl-9"
            aria-label="Search applications"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <select value={status} onChange={(e) => setStatusFilter(e.target.value as typeof status)} className="input w-auto" aria-label="Status filter">
            <option value="all">All statuses</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>{cap(s)}</option>
            ))}
          </select>
          <select value={experience} onChange={(e) => setExperience(e.target.value)} className="input w-auto" aria-label="Experience filter">
            <option value="all">All experience</option>
            {EXPERIENCE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{EXPERIENCE_SHORT[o.value]}</option>
            ))}
          </select>
          <select value={country} onChange={(e) => setCountry(e.target.value)} className="input w-auto max-w-44" aria-label="Country filter">
            <option value="all">All countries</option>
            {countries.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)} className="input w-auto" aria-label="Sort">
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="name">Name A–Z</option>
            <option value="country">Country A–Z</option>
          </select>
          <ColumnPicker visible={visible} onChange={setVisible} />
          <button onClick={exportCsv} className="btn btn-ghost" title={selected.size ? "Export selected" : "Export filtered"}>
            Export CSV
          </button>
          {hasFilters && (
            <button
              onClick={() => {
                setQuery("");
                setStatusFilter("all");
                setExperience("all");
                setCountry("all");
              }}
              className="btn px-2 text-slate-500 hover:text-slate-900"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="sticky top-2 z-10 flex flex-wrap items-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm text-white shadow-lg">
          <span className="mr-2 font-medium">{selected.size} selected</span>
          {!allFilteredSelected && filtered.length > selected.size && (
            <button onClick={() => setSelected(new Set(filtered.map((r) => r.id)))} className="underline underline-offset-2 hover:text-brand-100">
              Select all {filtered.length} matching
            </button>
          )}
          <div className="ml-auto flex flex-wrap gap-2">
            <button disabled={pending} onClick={() => run(selectedIds, "approved")} className="btn bg-emerald-600 py-1.5 hover:bg-emerald-500">Approve</button>
            <button disabled={pending} onClick={() => run(selectedIds, "declined")} className="btn bg-red-600 py-1.5 hover:bg-red-500">Decline</button>
            <button disabled={pending} onClick={() => run(selectedIds, "pending")} className="btn bg-slate-700 py-1.5 hover:bg-slate-600">Mark pending</button>
            <button disabled={pending} onClick={() => run(selectedIds, "delete")} className="btn bg-slate-700 py-1.5 text-red-300 hover:bg-slate-600">Delete</button>
            <button onClick={() => setSelected(new Set())} className="btn py-1.5 text-slate-300 hover:text-white">Clear</button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto rounded-xl bg-white ring-1 ring-slate-200">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="w-10 px-4 py-3">
                <input
                  ref={headerBox}
                  type="checkbox"
                  checked={pageAllSelected}
                  onChange={togglePage}
                  className="h-4 w-4 accent-brand-600"
                  aria-label="Select all on this page"
                />
              </th>
              <th className="px-3 py-3">Name</th>
              {COLUMNS.filter((c) => visible.has(c.key)).map((c) => (
                <th key={c.key} className="whitespace-nowrap px-3 py-3">{c.label}</th>
              ))}
              <th className="px-3 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {pageRows.length === 0 && (
              <tr>
                <td colSpan={colSpan} className="px-4 py-16 text-center text-slate-500">
                  {rows.length === 0 ? "No applications yet." : "No applications match your filters."}
                </td>
              </tr>
            )}
            {pageRows.map((r) => (
              <Fragment key={r.id}>
                <tr className={selected.has(r.id) ? "bg-brand-50/60" : "hover:bg-slate-50"}>
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selected.has(r.id)}
                      onChange={() => toggle(r.id)}
                      className="h-4 w-4 accent-brand-600"
                      aria-label={`Select ${r.name}`}
                    />
                  </td>
                  <td className="px-3 py-3">
                    <button onClick={() => setExpanded(expanded === r.id ? null : r.id)} className="text-left font-medium text-slate-900 hover:text-brand-700">
                      {r.name}
                    </button>
                    {r.note && <span className="ml-1.5 text-xs text-slate-400" title="Has a note">✎</span>}
                  </td>
                  {visible.has("email") && (
                    <td className="px-3 py-3">
                      <a href={`mailto:${r.email}`} className="text-slate-600 hover:text-brand-700">{r.email}</a>
                    </td>
                  )}
                  {visible.has("country") && <td className="whitespace-nowrap px-3 py-3 text-slate-600">{r.country}</td>}
                  {visible.has("address") && (
                    <td className="max-w-56 truncate px-3 py-3 text-slate-600" title={r.address}>{r.address}</td>
                  )}
                  {visible.has("experience") && (
                    <td className="whitespace-nowrap px-3 py-3">
                      <span className={r.experience === "none" ? "font-medium text-brand-700" : "text-slate-600"}>
                        {EXPERIENCE_SHORT[r.experience] ?? r.experience}
                      </span>
                    </td>
                  )}
                  {visible.has("status") && (
                    <td className="px-3 py-3">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${STATUS_STYLE[r.status]}`}>
                        {cap(r.status)}
                      </span>
                    </td>
                  )}
                  {visible.has("createdAt") && (
                    <td className="whitespace-nowrap px-3 py-3 text-slate-500" title={new Date(r.createdAt).toLocaleString()}>
                      {new Date(r.createdAt).toLocaleDateString()}
                    </td>
                  )}
                  <td className="whitespace-nowrap px-3 py-3 text-right">
                    {r.status !== "approved" && (
                      <button disabled={pending} onClick={() => run([r.id], "approved")} className="rounded px-2 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-50 disabled:opacity-50">
                        Approve
                      </button>
                    )}
                    {r.status !== "declined" && (
                      <button disabled={pending} onClick={() => run([r.id], "declined")} className="rounded px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50">
                        Decline
                      </button>
                    )}
                    {r.status !== "pending" && (
                      <button disabled={pending} onClick={() => run([r.id], "pending")} className="rounded px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-50">
                        Undo
                      </button>
                    )}
                  </td>
                </tr>
                {expanded === r.id && (
                  <tr className="bg-slate-50">
                    <td />
                    <td colSpan={colSpan - 1} className="px-3 py-4">
                      <dl className="grid gap-3 text-sm sm:grid-cols-3">
                        <Detail label="Email" value={r.email} />
                        <Detail label="Country" value={r.country} />
                        <Detail label="Experience" value={EXPERIENCE_SHORT[r.experience] ?? r.experience} />
                        <Detail label="Address" value={r.address} wide />
                        <Detail label="Note" value={r.note || "—"} wide />
                      </dl>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer / pagination */}
      <div className="flex items-center justify-between text-sm text-slate-500">
        <span>
          Showing {filtered.length === 0 ? 0 : page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filtered.length)} of{" "}
          {filtered.length}
          {filtered.length !== rows.length && ` (filtered from ${rows.length})`}
        </span>
        {pageCount > 1 && (
          <div className="flex items-center gap-2">
            <button disabled={page === 0} onClick={() => setPage(page - 1)} className="btn btn-ghost py-1.5">Previous</button>
            <span>Page {page + 1} / {pageCount}</span>
            <button disabled={page >= pageCount - 1} onClick={() => setPage(page + 1)} className="btn btn-ghost py-1.5">Next</button>
          </div>
        )}
      </div>

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm text-white shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, active, onClick }: { label: string; value: number; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-xl bg-white p-4 text-left ring-1 transition hover:ring-brand-500 ${
        active ? "ring-2 ring-brand-600" : "ring-slate-200"
      }`}
    >
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 text-2xl font-bold">{value}</div>
    </button>
  );
}

function Detail({ label, value, wide }: { label: string; value: string; wide?: boolean }) {
  return (
    <div className={wide ? "sm:col-span-3" : undefined}>
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className="mt-0.5 whitespace-pre-wrap break-words text-slate-800">{value}</dd>
    </div>
  );
}

function ColumnPicker({ visible, onChange }: { visible: Set<ColumnKey>; onChange: (v: Set<ColumnKey>) => void }) {
  return (
    <details className="relative">
      <summary className="btn btn-ghost list-none">Columns</summary>
      <div className="absolute right-0 z-20 mt-2 w-44 rounded-lg bg-white p-2 shadow-lg ring-1 ring-slate-200">
        {COLUMNS.map((c) => (
          <label key={c.key} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-slate-50">
            <input
              type="checkbox"
              checked={visible.has(c.key)}
              onChange={() => {
                const next = new Set(visible);
                if (next.has(c.key)) next.delete(c.key);
                else next.add(c.key);
                onChange(next);
              }}
              className="h-4 w-4 accent-brand-600"
            />
            {c.label}
          </label>
        ))}
      </div>
    </details>
  );
}

function cap(s: string) {
  return s[0].toUpperCase() + s.slice(1);
}
