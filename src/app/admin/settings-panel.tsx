"use client";

import { useState, useTransition } from "react";
import type { MailProvider, Settings } from "@/lib/settings";
import { sendTestEmailToMe, updateSettings } from "./actions";

const PROVIDERS: { value: MailProvider; label: string; env: string }[] = [
  { value: "gmail", label: "Gmail", env: "GMAIL_USER, GMAIL_APP_PASSWORD" },
  { value: "sendgrid", label: "SendGrid", env: "SENDGRID_API_KEY, SENDGRID_FROM" },
];

export function SettingsPanel({
  settings,
  configured,
}: {
  settings: Settings;
  configured: Record<MailProvider, boolean>;
}) {
  const [pending, startTransition] = useTransition();
  const [testing, startTest] = useTransition();
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  function save(patch: Partial<Settings>) {
    setTestResult(null);
    startTransition(() => updateSettings(patch));
  }

  function test() {
    setTestResult(null);
    startTest(async () => {
      const error = await sendTestEmailToMe();
      setTestResult(error ? { ok: false, message: error } : { ok: true, message: "Sent — check your inbox (and spam folder)." });
    });
  }

  const current = PROVIDERS.find((p) => p.value === settings.mailProvider)!;

  return (
    <section className="mt-6 grid gap-3 md:grid-cols-2">
      {/* VPN / proxy check */}
      <div className="flex items-start justify-between gap-4 rounded-xl bg-white p-4 ring-1 ring-slate-200">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">VPN / proxy check</h2>
          <p className="mt-1 text-xs leading-relaxed text-slate-500">
            {settings.proxyCheck
              ? "On — applications sent through a VPN, proxy or Tor are blocked."
              : "Off — anyone can apply, including through a VPN or proxy."}
          </p>
        </div>
        <button
          role="switch"
          aria-checked={settings.proxyCheck}
          aria-label="VPN / proxy check"
          disabled={pending}
          onClick={() => save({ proxyCheck: !settings.proxyCheck })}
          className={`relative mt-0.5 inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-60 ${
            settings.proxyCheck ? "bg-brand-600" : "bg-slate-300"
          }`}
        >
          <span
            className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${
              settings.proxyCheck ? "translate-x-5" : "translate-x-0.5"
            }`}
          />
        </button>
      </div>

      {/* Email provider */}
      <div className="rounded-xl bg-white p-4 ring-1 ring-slate-200">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-slate-900">Send emails with</h2>
          <div className="inline-flex rounded-lg bg-slate-100 p-0.5" role="radiogroup" aria-label="Email provider">
            {PROVIDERS.map((p) => (
              <button
                key={p.value}
                role="radio"
                aria-checked={settings.mailProvider === p.value}
                disabled={pending}
                onClick={() => settings.mailProvider !== p.value && save({ mailProvider: p.value })}
                className={`rounded-md px-3 py-1 text-sm font-medium transition disabled:opacity-60 ${
                  settings.mailProvider === p.value ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-900"
                }`}
              >
                {p.label}
                {!configured[p.value] && <span className="ml-1 text-amber-600" title="Not set up">•</span>}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs">
          {configured[current.value] ? (
            <span className="text-slate-500">{current.label} is set up.</span>
          ) : (
            <span className="text-amber-700">
              {current.label} isn&apos;t set up — add {current.env} in Vercel → Settings → Environment Variables.
            </span>
          )}
          <button
            onClick={test}
            disabled={testing || pending}
            className="rounded-md px-2 py-1 font-medium text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50 hover:text-slate-900 disabled:opacity-60"
          >
            {testing ? "Sending…" : "Send test email to me"}
          </button>
        </div>
        {testResult && (
          <p className={`mt-2 break-words text-xs ${testResult.ok ? "text-emerald-700" : "text-red-700"}`}>{testResult.message}</p>
        )}
      </div>
    </section>
  );
}
