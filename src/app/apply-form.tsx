"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { confirmBooking, confirmCode, submitApplication, type ApplyState, type BookResult, type CodeState } from "./actions";
import { COUNTRIES, EXPERIENCE_OPTIONS } from "@/lib/options";
import { site } from "@/lib/site";

const initial: ApplyState = { status: "idle" };
const RESEND_SECONDS = 60;

export function ApplyForm() {
  const [state, action, pending] = useActionState(submitApplication, initial);
  // Set when the applicant taps "Change email" on the code step; cleared by the next submit.
  const [editing, setEditing] = useState<ApplyState | null>(null);
  const err = state.status === "error" ? state.fields ?? {} : {};
  // React resets the form after an action; feed back what was typed so nothing is lost.
  const v = state.status === "error" || state.status === "code" ? state.values : undefined;

  if (state.status === "book") {
    return <BookStep name={state.name} fullName={state.fullName} email={state.email} />;
  }

  if (state.status === "code" && editing !== state) {
    return (
      <CodeStep
        key={state.at}
        name={state.name}
        fullName={state.values.name}
        email={state.email}
        notice={state.notice}
        onChangeEmail={() => setEditing(state)}
      />
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

      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="whatsapp" label="WhatsApp number (optional)" error={err.whatsapp}>
          <input
            id="whatsapp"
            name="whatsapp"
            type="tel"
            defaultValue={v?.whatsapp}
            className="input"
            placeholder="+1 555 123 4567"
            autoComplete="tel"
            inputMode="tel"
            maxLength={30}
          />
        </Field>
        <Field id="birthday" label="Date of birth" error={err.birthday}>
          <input
            id="birthday"
            name="birthday"
            type="date"
            defaultValue={v?.birthday}
            className="input"
            autoComplete="bday"
            min="1900-01-01"
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

      <div className="space-y-3">
        <Field id="experience" label="Work experience" error={err.experience}>
          <p className="-mt-1 mb-2 text-sm text-slate-500">
            Be honest — <span className="font-medium text-brand-700">no experience is perfectly fine</span>. We
            train you.
          </p>
          <select
            id="experience"
            name="experience"
            className="input"
            defaultValue={v?.experience ?? "none"}
            required
          >
            {EXPERIENCE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </Field>
        <Field id="experienceDetail" label="Previous jobs or experience (optional)" error={err.experienceDetail}>
          <input
            id="experienceDetail"
            name="experienceDetail"
            defaultValue={v?.experienceDetail}
            maxLength={500}
            className="input"
            placeholder="e.g. 2 years in customer support, some freelance data entry"
          />
        </Field>
      </div>

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

const codeInitial: CodeState = { status: "idle" };

function CodeStep({
  name,
  fullName,
  email,
  notice,
  onChangeEmail,
}: {
  name: string;
  fullName: string;
  email: string;
  notice?: string;
  onChangeEmail: () => void;
}) {
  const [state, action, pending] = useActionState(confirmCode, codeInitial);
  const [code, setCode] = useState("");
  const [focused, setFocused] = useState(false);
  const [wait, setWait] = useState(RESEND_SECONDS);
  const boxRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  // The code step replaces a taller form: keep it on screen (only scrolls if it ended up out of
  // view) and put the cursor in the code field so the applicant can type straight away.
  useEffect(() => {
    const box = boxRef.current;
    if (box) {
      const r = box.getBoundingClientRect();
      if (r.top < 0 || r.bottom > window.innerHeight) box.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
    inputRef.current?.focus({ preventScroll: true });
  }, []);

  // After a wrong code or a new code, clear the boxes and put the cursor back.
  useEffect(() => {
    if (state.status === "error" || state.status === "resent") {
      setCode("");
      inputRef.current?.focus({ preventScroll: true });
    }
    if (state.status === "resent") setWait(RESEND_SECONDS);
  }, [state]);

  useEffect(() => {
    if (wait <= 0) return;
    const t = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  if (state.status === "verified" && state.book) {
    return <BookStep name={name} fullName={fullName} email={email} />;
  }

  if (state.status === "verified") {
    return (
      <div ref={boxRef} className="rounded-2xl border border-emerald-200 bg-emerald-50 p-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-600 text-2xl text-white">
          ✓
        </div>
        <h3 className="text-xl font-semibold text-emerald-900">
          Thanks{name ? `, ${name}` : ""}! Your application is in.
        </h3>
        <p className="mt-2 text-emerald-800">
          Your email is confirmed. We review every application personally and will reply by email, usually within 48
          hours.
        </p>
      </div>
    );
  }

  const active = Math.min(code.length, 5);

  return (
    <div ref={boxRef} className="py-2 text-center">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-brand-600">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-6 w-6" aria-hidden="true">
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <path d="m3 7 9 6 9-6" />
        </svg>
      </div>
      <h3 className="text-xl font-semibold text-slate-900">
        Check your email{name ? `, ${name}` : ""}
      </h3>
      <p className="mx-auto mt-2 max-w-sm text-slate-600">
        {notice ? `${notice} ` : ""}Enter the 6-digit code we sent to{" "}
        <span className="font-medium break-all text-slate-900">{email || "your email"}</span>
      </p>

      <form ref={formRef} action={action} className="mt-6" noValidate>
        <input type="hidden" name="email" value={email} />
        <label htmlFor="code" className="sr-only">
          6-digit code
        </label>
        <div className="relative mx-auto w-fit">
          <div className="flex gap-1.5 sm:gap-3" aria-hidden="true">
            {Array.from({ length: 6 }, (_, i) => (
              <div
                key={i}
                className={`flex h-14 w-10 items-center justify-center rounded-xl border-2 bg-white text-2xl font-semibold text-slate-900 transition sm:h-16 sm:w-12 ${
                  state.status === "error"
                    ? "border-red-300"
                    : focused && i === active
                      ? "border-brand-500 ring-4 ring-brand-100"
                      : code[i]
                        ? "border-slate-300"
                        : "border-slate-200"
                }`}
              >
                {code[i] ?? ""}
              </div>
            ))}
          </div>
          {/* One real input over the boxes: supports paste and the phone's "from Messages/Mail" autofill. */}
          <input
            ref={inputRef}
            id="code"
            name="code"
            value={code}
            onChange={(e) => {
              const next = e.target.value.replace(/\D/g, "").slice(0, 6);
              setCode(next);
              if (next.length === 6 && !pending) queueMicrotask(() => formRef.current?.requestSubmit());
            }}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]*"
            maxLength={6}
            className="absolute inset-0 h-full w-full cursor-text text-base opacity-0"
          />
        </div>

        <p aria-live="polite" className="mt-4 min-h-5 text-sm">
          {state.status === "error" && <span className="text-red-600">{state.message}</span>}
          {state.status === "resent" && <span className="text-emerald-700">{state.message}</span>}
        </p>

        <button
          type="submit"
          name="intent"
          value="verify"
          disabled={pending || code.length !== 6}
          className="btn btn-primary mt-3 w-full py-3 text-base disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? "Checking…" : "Confirm and send application"}
        </button>

        <div className="mt-5 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-sm">
          <span className="text-slate-500">Didn&apos;t get it? Check spam, or</span>
          <button
            type="submit"
            name="intent"
            value="resend"
            disabled={pending || wait > 0}
            className="font-medium text-brand-600 hover:text-brand-700 disabled:cursor-not-allowed disabled:text-slate-400"
          >
            {wait > 0 ? `send a new code (${wait}s)` : "send a new code"}
          </button>
          <span className="text-slate-300" aria-hidden="true">
            ·
          </span>
          <button type="button" onClick={onChangeEmail} className="font-medium text-slate-600 hover:text-slate-900">
            Change email
          </button>
        </div>
      </form>
    </div>
  );
}

type CalendlyWindow = Window & {
  Calendly?: {
    initInlineWidget: (o: { url: string; parentElement: HTMLElement; prefill?: { name?: string; email?: string } }) => void;
  };
};

const CALENDLY_SCRIPT = "https://assets.calendly.com/assets/external/widget.js";

// Loads Calendly's embed script once per page.
function loadCalendly() {
  const w = window as CalendlyWindow;
  if (w.Calendly) return Promise.resolve(w.Calendly);
  return new Promise<NonNullable<CalendlyWindow["Calendly"]>>((resolve, reject) => {
    let script = document.querySelector<HTMLScriptElement>(`script[src="${CALENDLY_SCRIPT}"]`);
    if (!script) {
      script = document.createElement("script");
      script.src = CALENDLY_SCRIPT;
      script.async = true;
      document.head.appendChild(script);
    }
    script.addEventListener("load", () => (w.Calendly ? resolve(w.Calendly) : reject(new Error("Calendly missing"))));
    script.addEventListener("error", reject);
  });
}

// Next step for applicants from the interview country: book a video call on Calendly.
function BookStep({ name, fullName, email }: { name: string; fullName: string; email: string }) {
  const url = site.interview.calendlyUrl;
  const widgetRef = useRef<HTMLDivElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [booked, setBooked] = useState<BookResult | null>(null);

  useEffect(() => {
    boxRef.current?.scrollIntoView({ block: "start", behavior: "smooth" });
    let cancelled = false;
    loadCalendly().then(
      (calendly) => {
        const el = widgetRef.current;
        if (cancelled || !el) return;
        el.innerHTML = "";
        calendly.initInlineWidget({ url, parentElement: el, prefill: { name: fullName, email } });
      },
      () => !cancelled && setFailed(true),
    );
    return () => {
      cancelled = true;
    };
  }, [url, fullName, email]);

  // The widget reports a finished booking with a message; the server confirms it with Calendly.
  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== "https://calendly.com" || e.data?.event !== "calendly.event_scheduled") return;
      const invitee = e.data.payload?.invitee?.uri;
      if (typeof invitee !== "string") return;
      setSaving(true);
      confirmBooking(email, invitee)
        .catch(() => ({ when: null, emailed: false }))
        .then((r) => {
          setBooked(r);
          setSaving(false);
        });
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [email]);

  if (booked) {
    return (
      <div ref={boxRef} className="scroll-mt-24 rounded-2xl border border-emerald-200 bg-emerald-50 p-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-600 text-2xl text-white">
          🎉
        </div>
        <h3 className="text-xl font-semibold text-emerald-900">
          Congratulations{name ? `, ${name}` : ""}! Your call is booked.
        </h3>
        {booked.when && <p className="mt-3 text-lg font-medium text-emerald-900">{booked.when}</p>}
        <p className="mt-2 text-emerald-800">
          {booked.emailed ? (
            <>
              We&apos;ve emailed the details to <span className="font-medium break-all">{email}</span>.
            </>
          ) : (
            "Calendly will email you a confirmation with the details."
          )}{" "}
          Questions before the call? Message us on WhatsApp at {site.interview.whatsapp} or email{" "}
          <a href={`mailto:${site.interview.email}`} className="font-medium underline">
            {site.interview.email}
          </a>
          .
        </p>
      </div>
    );
  }

  return (
    <div ref={boxRef} className="scroll-mt-24">
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-600 text-2xl text-white">
          ✓
        </div>
        <h3 className="text-xl font-semibold text-slate-900">
          Email confirmed{name ? `, ${name}` : ""}! One last step.
        </h3>
        <p className="mx-auto mt-2 max-w-md text-slate-600">
          Pick a time for a short video call with our hiring manager, {site.interview.hiringManager}. We&apos;ll walk
          you through the next steps.
        </p>
      </div>

      {failed ? (
        <p className="mt-6 text-center">
          <a href={url} target="_blank" rel="noreferrer" className="btn btn-primary px-6 py-3 text-base">
            Book your call →
          </a>
        </p>
      ) : (
        <div className="relative mt-4">
          <div ref={widgetRef} className="h-[700px] min-w-[280px]" />
          {saving && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/80 text-slate-700">
              Confirming your booking…
            </div>
          )}
        </div>
      )}
    </div>
  );
}
