"use client";

import { useActionState } from "react";
import { submitApplication, type ApplyState } from "./actions";
import { COUNTRIES, EXPERIENCE_OPTIONS } from "@/lib/options";

const initial: ApplyState = { status: "idle" };

export function ApplyForm() {
  const [state, action, pending] = useActionState(submitApplication, initial);
  const err = state.status === "error" ? state.fields ?? {} : {};
  // React resets the form after an action; feed back what was typed so nothing is lost.
  const v = state.status === "error" ? state.values : undefined;

  if (state.status === "sent") {
    return (
      <div className="rounded-2xl border border-brand-100 bg-brand-50 p-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-brand-600 text-2xl text-white">
          ✉
        </div>
        <h3 className="text-xl font-semibold text-slate-900">
          Almost done{state.name ? `, ${state.name}` : ""}! Check your email.
        </h3>
        <p className="mt-2 text-slate-700">
          We sent a confirmation link to{" "}
          {state.email ? <span className="font-medium text-slate-900">{state.email}</span> : "your email"}. Click it
          to send your application — we can&apos;t review it until you do.
        </p>
        <p className="mt-2 text-sm text-slate-500">
          Not there? Check your spam folder. The link expires in 24 hours.
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-5" noValidate>
      {/* Honeypot — hidden from people, filled by bots */}
      <div className="hidden" aria-hidden="true">
        <label>
          Website
          <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="name" label="Full name" error={err.name}>
          <input
            id="name"
            name="name"
            className="input"
            placeholder="Jane Doe"
            autoComplete="name"
            defaultValue={v?.name}
            required
          />
        </Field>
        <Field id="email" label="Email address" error={err.email}>
          <input
            id="email"
            name="email"
            defaultValue={v?.email}
            type="email"
            className="input"
            placeholder="you@example.com"
            autoComplete="email"
            required
          />
        </Field>
      </div>

      <Field id="country" label="Country" error={err.country}>
        <select id="country" name="country" className="input" defaultValue={v?.country ?? ""} required>
          <option value="" disabled>
            Select your country
          </option>
          {COUNTRIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </Field>

      <Field id="address" label="Address" error={err.address}>
        <input
          id="address"
          name="address"
          defaultValue={v?.address}
          className="input"
          placeholder="Street, city, postal code"
          autoComplete="street-address"
          required
        />
      </Field>

      <fieldset>
        <legend className="label">Work experience</legend>
        <p className="-mt-1 mb-3 text-sm text-slate-500">
          Be honest — <span className="font-medium text-brand-700">no experience is perfectly fine</span>. We
          train you.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {EXPERIENCE_OPTIONS.map((o) => (
            <label
              key={o.value}
              className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-300 px-4 py-3 text-sm transition hover:border-brand-500 has-[:checked]:border-brand-600 has-[:checked]:bg-brand-50 has-[:checked]:ring-2 has-[:checked]:ring-brand-100"
            >
              <input
                type="radio"
                name="experience"
                value={o.value}
                defaultChecked={o.value === (v?.experience ?? "none")}
                className="h-4 w-4 accent-brand-600"
              />
              <span className="font-medium text-slate-800">{o.label}</span>
            </label>
          ))}
        </div>
        {err.experience && <p className="mt-1.5 text-sm text-red-600">{err.experience}</p>}
      </fieldset>

      <Field id="note" label="Anything you'd like us to know? (optional)" error={err.note}>
        <textarea
          id="note"
          name="note"
          defaultValue={v?.note}
          rows={3}
          maxLength={1000}
          className="input resize-y"
          placeholder="Languages you speak, hours you're available, what kind of work interests you…"
        />
      </Field>

      {state.status === "error" && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{state.message}</p>
      )}

      <button type="submit" disabled={pending} className="btn btn-primary w-full py-3 text-base">
        {pending ? "Sending…" : "Send my application"}
      </button>
      <p className="text-center text-xs text-slate-500">
        No account needed. We only use your details to contact you about work.
      </p>
    </form>
  );
}

function Field({
  id,
  label,
  error,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="label">
        {label}
      </label>
      <div className={error ? "[&_.input]:border-red-400" : undefined}>{children}</div>
      {error && <p className="mt-1.5 text-sm text-red-600">{error}</p>}
    </div>
  );
}
