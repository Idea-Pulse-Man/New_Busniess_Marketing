import { createHash } from "node:crypto";
import Link from "next/link";
import { db } from "@/lib/db";
import { site } from "@/lib/site";

export const metadata = { title: `Confirm your email — ${site.name}`, robots: { index: false } };
export const dynamic = "force-dynamic";

type Result = "confirmed" | "already" | "expired" | "invalid";

async function confirm(token: string): Promise<{ result: Result; name?: string }> {
  if (!token || token.length > 100) return { result: "invalid" };
  const verifyTokenHash = createHash("sha256").update(token).digest("hex");
  const app = await db.application.findUnique({ where: { verifyTokenHash } });
  if (!app) return { result: "invalid" };
  const name = app.name.split(" ")[0];
  if (app.emailVerified) return { result: "already", name };
  if (!app.verifyTokenExpires || app.verifyTokenExpires < new Date()) return { result: "expired" };

  // Keep the hash so a second click shows "already confirmed" instead of "invalid".
  await db.application.update({
    where: { id: app.id },
    data: { emailVerified: true, verifyTokenExpires: null, createdAt: new Date() },
  });
  return { result: "confirmed", name };
}

const COPY: Record<Result, { icon: string; title: (name?: string) => string; body: string; ok: boolean }> = {
  confirmed: {
    icon: "✓",
    title: (name) => `Thanks${name ? `, ${name}` : ""}! Your application is in.`,
    body: "Your email is confirmed. We review every application personally and will reply by email, usually within 48 hours.",
    ok: true,
  },
  already: {
    icon: "✓",
    title: (name) => `You're all set${name ? `, ${name}` : ""}.`,
    body: "This email is already confirmed and your application is with our team. We'll be in touch soon.",
    ok: true,
  },
  expired: {
    icon: "!",
    title: () => "This link has expired",
    body: "Confirmation links last 24 hours. Please fill in the application form again and we'll send you a new one.",
    ok: false,
  },
  invalid: {
    icon: "!",
    title: () => "This link isn't valid",
    body: "It may have been copied incompletely, or replaced by a newer link. Use the latest email we sent you, or apply again.",
    ok: false,
  },
};

export default async function VerifyPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  const { result, name } = await confirm(typeof token === "string" ? token : "");
  const c = COPY[result];

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-brand-50 to-white px-4 py-16">
      <div
        className={`w-full max-w-lg rounded-2xl border p-8 text-center shadow-sm ${
          c.ok ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"
        }`}
      >
        <div
          className={`mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full text-2xl font-bold text-white ${
            c.ok ? "bg-emerald-600" : "bg-amber-500"
          }`}
        >
          {c.icon}
        </div>
        <h1 className={`text-xl font-semibold ${c.ok ? "text-emerald-900" : "text-amber-900"}`}>{c.title(name)}</h1>
        <p className={`mt-2 ${c.ok ? "text-emerald-800" : "text-amber-800"}`}>{c.body}</p>
        <Link href={c.ok ? "/" : "/#apply"} className="btn btn-primary mt-6">
          {c.ok ? `Back to ${site.name}` : "Apply again"}
        </Link>
      </div>
    </div>
  );
}
