"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

import { AuthBrandHeader } from "@/components/brand/BrandLogo";
import { login } from "@/lib/auth-api";
import { setSession } from "@/lib/auth";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const result = await login(email.trim().toLowerCase(), password);
      setSession(result.token, result.user);
      router.push("/");
    } catch (_error) {
      setError("Login failed. Check email and password.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen grid place-items-center p-4 bg-[var(--surface)]">
      <div className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-6 md:p-8">
        <div className="flex justify-center pb-1">
          <AuthBrandHeader priority />
        </div>

        <form onSubmit={onSubmit} className="mt-8 space-y-4">
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

          <div>
            <label htmlFor="password" className="text-sm font-medium">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm placeholder:text-3 focus:outline-none focus:ring-2 focus:ring-brand-600/20"
              required
            />
          </div>

          {error ? <p className="text-sm text-red-500">{error}</p> : null}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
          >
            {submitting ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-3">
          <Link href="/request-access" className="font-medium text-brand-600 hover:text-brand-700">
            Request access
          </Link>
          <span className="mx-1">/</span>
          <Link href="/forgot-password" className="font-medium text-brand-600 hover:text-brand-700">
            Forgot password
          </Link>
        </p>
      </div>
    </div>
  );
}
