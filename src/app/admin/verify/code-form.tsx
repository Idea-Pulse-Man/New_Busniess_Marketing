"use client";

import { useActionState } from "react";
import { verifyAuthenticator, type VerifyState } from "../auth-actions";

export function CodeForm({ submitLabel }: { submitLabel: string }) {
  const [state, action, pending] = useActionState<VerifyState, FormData>(verifyAuthenticator, {});

  return (
    <form action={action} className="space-y-4">
      <input
        name="code"
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="[0-9 ]{6,7}"
        maxLength={7}
        placeholder="123456"
        aria-label="6-digit code"
        className="input text-center font-mono text-2xl tracking-[0.4em]"
        autoFocus
        required
      />
      {state.error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>}
      <button type="submit" disabled={pending} className="btn btn-primary w-full">
        {pending ? "Checking…" : submitLabel}
      </button>
    </form>
  );
}
