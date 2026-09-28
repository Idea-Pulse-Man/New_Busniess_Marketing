"use client";

import Link from "next/link";
import { useActionState } from "react";
import { login, signup, type AuthState } from "./auth-actions";
import { site } from "@/lib/site";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const isSignup = mode === "signup";
  const [state, action, pending] = useActionState<AuthState, FormData>(isSignup ? signup : login, {});

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm">
        <Link href="/" className="mb-8 flex items-center justify-center gap-2 font-bold">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white">
            {site.name[0]}
          </span>
          {site.name} Admin
        </Link>
        <div className="rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
          <h1 className="text-xl font-semibold">{isSignup ? "Create admin account" : "Admin login"}</h1>
          <p className="mt-1 text-sm text-slate-500">
            {isSignup ? "Only the authorised admin email can register." : "Sign in to manage applications."}
          </p>

          <form action={action} className="mt-6 space-y-4">
            <div>
              <label htmlFor="email" className="label">Email</label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                defaultValue={state.email}
                className="input"
                required
              />
            </div>
            <div>
              <label htmlFor="password" className="label">Password</label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete={isSignup ? "new-password" : "current-password"}
                minLength={isSignup ? 8 : undefined}
                className="input"
                required
              />
            </div>
            {isSignup && (
              <div>
                <label htmlFor="confirm" className="label">Confirm password</label>
                <input
                  id="confirm"
                  name="confirm"
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  className="input"
                  required
                />
              </div>
            )}

            {state.error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>}

            <button type="submit" disabled={pending} className="btn btn-primary w-full">
              {pending ? "Please wait…" : isSignup ? "Create account" : "Log in"}
            </button>
          </form>
        </div>
        <p className="mt-6 text-center text-sm text-slate-500">
          {isSignup ? (
            <>
              Already have an account?{" "}
              <Link href="/admin/login" className="font-medium text-brand-600 hover:underline">Log in</Link>
            </>
          ) : (
            <>
              First time here?{" "}
              <Link href="/admin/signup" className="font-medium text-brand-600 hover:underline">Sign up</Link>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
