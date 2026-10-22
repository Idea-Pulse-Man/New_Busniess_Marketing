import Link from "next/link";
import { validBookingLink } from "@/lib/booking";
import { formatCallTime } from "@/lib/calendly";
import { db } from "@/lib/db";
import { accessBlocked } from "@/lib/proxycheck";
import { isInterviewCountry, site } from "@/lib/site";
import { AccessBlocked } from "../access-blocked";
import { BookStep } from "../apply-form";
import { LogoMark } from "../logo";

export const metadata = { title: `Book your call — ${site.name}`, robots: { index: false } };
export const dynamic = "force-dynamic";

// Opened from the booking link we email to applicants from an interview country.
export default async function BookPage({ searchParams }: { searchParams: Promise<{ id?: string; s?: string }> }) {
  const blocked = await accessBlocked();
  if (blocked) return <AccessBlocked reason={blocked} />;

  const { id = "", s = "" } = await searchParams;
  const app =
    id && s && validBookingLink(id, s)
      ? await db.application.findFirst({ where: { id, emailVerified: true, deletedAt: null } })
      : null;

  let body;
  if (!app || !isInterviewCountry(app.country)) {
    body = (
      <div className="py-8 text-center">
        <h1 className="text-xl font-semibold text-slate-900">This link doesn&apos;t work</h1>
        <p className="mx-auto mt-2 max-w-md text-slate-600">
          Please use the link from your email, or message us at{" "}
          <a href={`mailto:${site.interview.email}`} className="font-medium text-brand-600 underline">
            {site.interview.email}
          </a>
          .
        </p>
      </div>
    );
  } else if (app.callAt) {
    body = (
      <div className="py-8 text-center">
        <h1 className="text-xl font-semibold text-slate-900">Your call is already booked</h1>
        <p className="mt-3 text-lg font-medium text-slate-900">{formatCallTime(app.callAt, app.callTimezone)}</p>
        <p className="mx-auto mt-2 max-w-md text-slate-600">
          Need to change it? Message us on WhatsApp at {site.interview.whatsapp} or email{" "}
          <a href={`mailto:${site.interview.email}`} className="font-medium text-brand-600 underline">
            {site.interview.email}
          </a>
          .
        </p>
      </div>
    );
  } else {
    body = <BookStep name={app.name.split(" ")[0]} fullName={app.name} email={app.email} />;
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <header className="border-b border-white/10 bg-[#0d1033] text-white">
        <div className="mx-auto flex h-16 max-w-3xl items-center px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2 font-bold tracking-tight">
            <LogoMark className="ring-white/15! shadow-amber-400/10!" />
            {site.name}
          </Link>
        </div>
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/60 sm:p-8">{body}</div>
      </main>
    </div>
  );
}
