"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

import { AuthShell } from "@/components/auth/AuthShell";
import { requestPasswordReset } from "@/lib/auth-api";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setError(null);
    setSubmitting(true);

    try {
      const result = await requestPasswordReset(email.trim().toLowerCase());
      setMessage(result.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send reset email.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell
      title="Forgot password"
      subtitle="Enter your work email and we will send reset instructions."
    >
      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <div>
          <label htmlFor="email" className="text-sm font-medium">
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm placeholder:text-3 focus:outline-none focus:ring-2 focus:ring-brand-600/20"
            required
          />
        </div>

        {message ? <p className="text-sm text-emerald-600">{message}</p> : null}
        {error ? <p className="text-sm text-red-500">{error}</p> : null}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
        >
          {submitting ? "Sending..." : "Send reset link"}
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-3">
        <Link href="/request-access" className="font-medium text-brand-600 hover:text-brand-700">
          Request access
        </Link>
        <span className="mx-1">/</span>
        <Link href="/login" className="font-medium text-brand-600 hover:text-brand-700">
          Sign in
        </Link>
      </p>
    </AuthShell>
  );
}
