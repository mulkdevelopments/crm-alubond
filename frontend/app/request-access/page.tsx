"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

import { AuthShell } from "@/components/auth/AuthShell";
import { requestAccountAccess } from "@/lib/auth-api";

export default function RequestAccessPage() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSuccess(null);
    setError(null);
    setSubmitting(true);

    try {
      const result = await requestAccountAccess({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim().toLowerCase(),
        message: message.trim(),
      });
      setSuccess(result.message);
      setFirstName("");
      setLastName("");
      setEmail("");
      setMessage("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit access request.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell
      title="Request access"
      subtitle="CRM accounts are created by an administrator. Submit your details and we will review your request."
    >
      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label htmlFor="firstName" className="text-sm font-medium">
              First name
            </label>
            <input
              id="firstName"
              placeholder="First name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm placeholder:text-3 focus:outline-none focus:ring-2 focus:ring-brand-600/20"
              required
            />
          </div>
          <div>
            <label htmlFor="lastName" className="text-sm font-medium">
              Last name
            </label>
            <input
              id="lastName"
              placeholder="Last name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm placeholder:text-3 focus:outline-none focus:ring-2 focus:ring-brand-600/20"
              required
            />
          </div>
        </div>

        <div>
          <label htmlFor="email" className="text-sm font-medium">
            Work email
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
          <label htmlFor="message" className="text-sm font-medium">
            Message <span className="text-3 font-normal">(optional)</span>
          </label>
          <textarea
            id="message"
            placeholder="Tell us your role or why you need access"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={4}
            className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm placeholder:text-3 focus:outline-none focus:ring-2 focus:ring-brand-600/20"
          />
        </div>

        {success ? <p className="text-sm text-emerald-600">{success}</p> : null}
        {error ? <p className="text-sm text-red-500">{error}</p> : null}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
        >
          {submitting ? "Submitting..." : "Submit request"}
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-3">
        <Link href="/login" className="font-medium text-brand-600 hover:text-brand-700">
          Sign in
        </Link>
        <span className="mx-1">/</span>
        <Link href="/forgot-password" className="font-medium text-brand-600 hover:text-brand-700">
          Forgot password
        </Link>
      </p>
    </AuthShell>
  );
}
