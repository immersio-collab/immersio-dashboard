"use client";

import type { Metadata } from "next";
import { useFormState, useFormStatus } from "react-dom";

import { login, type LoginState } from "@/lib/auth";

// Metadata cannot live in a Client Component — assigned below via a
// dedicated server file. The LoginPage component itself is client-only.

/**
 * Submit button wired up to `react-dom` `useFormStatus` for disabled/pending
 * state while the login Server Action runs.
 */
function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="btn-primary w-full"
      aria-busy={pending}
    >
      {pending ? "Signing in…" : "Sign in"}
    </button>
  );
}

/**
 * Login form (Client Component, so react-dom hooks are allowed).
 *
 * Design: minimal, centred, no decoration. Single password input.
 * Error banner appears above the input on bad password; never reveals
 * *why* the password failed (enum attacks are already impossible, but
 * keeping the message generic avoids leaking hash-config state either).
 */
export default function LoginPage() {
  // Initial state: no error, not OK (user hasn't submitted yet).
  const initialState: LoginState = { ok: false };
  // Server Action binding via react-dom. The action redirects on success
  // and returns a typed error state on failure.
  const [state, formAction] = useFormState(login, initialState);

  return (
    <div className="card p-6">
      <div className="mb-6">
        <h1 className="mb-1">Sign in</h1>
        <p className="text-sm text-text-muted">
          Access your Immersio dashboard.
        </p>
      </div>

      <form action={formAction} className="space-y-4" noValidate>
        {state.error ? (
          <div
            role="alert"
            className="border border-border rounded px-3 py-2 text-sm text-text bg-surface-muted"
          >
            {state.error}
          </div>
        ) : null}

        <div>
          <label
            htmlFor="password"
            className="block text-sm font-medium text-text mb-1.5"
          >
            Password
          </label>
          <input
            id="password"
            type="password"
            name="password"
            autoComplete="current-password"
            required
            autoFocus
            className="input-base"
            placeholder="••••••••"
          />
        </div>

        <SubmitButton />
      </form>
    </div>
  );
}
