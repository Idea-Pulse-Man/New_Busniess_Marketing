import QRCode from "qrcode";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireMfaPending } from "@/lib/auth";
import { site } from "@/lib/site";
import { generateSecret, otpauthUrl } from "@/lib/totp";
import { AuthShell } from "../auth-shell";
import { logout } from "../auth-actions";
import { CodeForm } from "./code-form";

export const metadata = { title: "Authenticator — Admin" };
export const dynamic = "force-dynamic";

export default async function VerifyPage() {
  const email = await requireMfaPending();
  let admin = await db.admin.findUnique({ where: { email } });
  if (!admin) redirect("/admin/login");

  const backToLogin = (
    <form action={logout}>
      <button className="font-medium text-brand-600 hover:underline">Use a different account</button>
    </form>
  );

  if (admin.totpEnabled) {
    return (
      <AuthShell
        title="Enter your code"
        subtitle="Open your authenticator app and enter the 6-digit code for this account."
        footer={backToLogin}
      >
        <CodeForm submitLabel="Verify" />
      </AuthShell>
    );
  }

  // First login: create the secret once (kept until a code is confirmed, so refreshing shows the same QR).
  if (!admin.totpSecret) {
    await db.admin.updateMany({ where: { id: admin.id, totpSecret: null }, data: { totpSecret: generateSecret() } });
    admin = await db.admin.findUniqueOrThrow({ where: { id: admin.id } });
  }
  const secret = admin.totpSecret!;
  const qr = await QRCode.toDataURL(otpauthUrl(secret, email, site.name), { margin: 1, width: 220 });
  const groupedSecret = secret.match(/.{1,4}/g)!.join(" ");

  return (
    <AuthShell
      title="Set up your authenticator"
      subtitle="An authenticator is required for admin accounts. You only do this once."
      footer={backToLogin}
    >
      <ol className="space-y-5 text-sm text-slate-700">
        <li>
          <p className="font-medium text-slate-900">1. Install an authenticator app</p>
          <p className="mt-1 text-slate-500">Google Authenticator, Microsoft Authenticator, Authy or 1Password.</p>
        </li>
        <li>
          <p className="font-medium text-slate-900">2. Scan this QR code in the app</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qr} alt="Authenticator QR code" width={220} height={220} className="mx-auto mt-3 rounded-lg ring-1 ring-slate-200" />
          <details className="mt-3">
            <summary className="cursor-pointer text-slate-500 hover:text-slate-700">Can&apos;t scan? Enter this key instead</summary>
            <code className="mt-2 block break-all rounded-lg bg-slate-100 px-3 py-2 text-center font-mono text-sm tracking-wider text-slate-900">
              {groupedSecret}
            </code>
          </details>
        </li>
        <li>
          <p className="mb-2 font-medium text-slate-900">3. Enter the 6-digit code it shows</p>
          <CodeForm submitLabel="Confirm and continue" />
        </li>
      </ol>
    </AuthShell>
  );
}
