"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

import { AuthShell } from "@/components/auth/AuthShell";
import { resetPasswordWithToken } from "@/lib/auth-api";

export default function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = useMemo(() => searchParams.get("token")?.trim() ?? "", [searchParams]);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setError(null);

    if (!token) {
      setError("Reset link is missing or invalid.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    try {
      const result = await resetPasswordWithToken(token, password);
      setMessage(result.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not reset password.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell title="Reset password" subtitle="Choose a new password for your CRM account.">
      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <div>
          <label htmlFor="password" className="text-sm font-medium">
            New password
          </label>
          <input
            id="password"
            type="password"
            autoComplete="new-password"
            placeholder="At least 8 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm placeholder:text-3 focus:outline-none focus:ring-2 focus:ring-brand-600/20"
            required
            minLength={8}
          />
        </div>

        <div>
          <label htmlFor="confirmPassword" className="text-sm font-medium">
            Confirm password
          </label>
          <input
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            placeholder="Re-enter your new password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm placeholder:text-3 focus:outline-none focus:ring-2 focus:ring-brand-600/20"
            required
            minLength={8}
          />
        </div>

        {message ? <p className="text-sm text-emerald-600">{message}</p> : null}
        {error ? <p className="text-sm text-red-500">{error}</p> : null}

        <button
          type="submit"
          disabled={submitting || Boolean(message)}
          className="w-full rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
        >
          {submitting ? "Saving..." : "Update password"}
        </button>
      </form>

      {message ? (
        <p className="mt-4 text-center text-sm text-3">
          <Link href="/login" className="font-medium text-brand-600 hover:text-brand-700">
            Continue to sign in
          </Link>
        </p>
      ) : (
        <p className="mt-4 text-center text-sm text-3">
          <Link href="/request-access" className="font-medium text-brand-600 hover:text-brand-700">
            Request access
          </Link>
          <span className="mx-1">/</span>
          <Link href="/forgot-password" className="font-medium text-brand-600 hover:text-brand-700">
            Forgot password
          </Link>
        </p>
      )}
    </AuthShell>
  );
}
