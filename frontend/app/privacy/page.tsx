import Link from "next/link";

import { AuthBrandHeader } from "@/components/brand/BrandLogo";

export const metadata = {
  title: "Privacy Policy — Alubond CRM",
  description: "Privacy policy for the Alubond CRM web and mobile applications.",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[var(--surface)] px-4 py-10">
      <div className="mx-auto max-w-2xl rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-6 md:p-8">
        <div className="flex justify-center">
          <AuthBrandHeader priority />
        </div>

        <h1 className="mt-8 text-2xl font-semibold tracking-tight">Privacy Policy</h1>
        <p className="mt-2 text-sm text-2">Last updated: June 28, 2026</p>

        <div className="mt-6 space-y-5 text-sm leading-relaxed text-[var(--text)]">
          <p>
            Alubond CRM is an internal sales application for authorized Alubond team members. This policy
            describes how we handle information in the web and mobile apps.
          </p>

          <section>
            <h2 className="font-semibold">Information we collect</h2>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-2">
              <li>Account information you provide (name, email, role, team assignments).</li>
              <li>Sales and project data entered in the CRM (projects, customers, activities, follow-ups).</li>
              <li>Location data when you log site visits or use map features (with your permission).</li>
              <li>Photos you attach to project activities (with your permission).</li>
            </ul>
          </section>

          <section>
            <h2 className="font-semibold">How we use information</h2>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-2">
              <li>To operate the CRM, pipeline, team views, and follow-up workflows.</li>
              <li>To authenticate users and enforce role-based access.</li>
              <li>To support sales reporting and internal coordination.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-semibold">Data storage and security</h2>
            <p className="mt-2 text-2">
              Data is stored on secure cloud infrastructure used to run Alubond CRM. Access is limited to
              authenticated users. We use industry-standard transport encryption (HTTPS/TLS) for data in
              transit.
            </p>
          </section>

          <section>
            <h2 className="font-semibold">Sharing</h2>
            <p className="mt-2 text-2">
              We do not sell personal data. Information is shared only within your organization through the
              CRM according to user roles, or when required by law.
            </p>
          </section>

          <section>
            <h2 className="font-semibold">Your choices</h2>
            <p className="mt-2 text-2">
              You can deny location or photo permissions in your device settings; some features may not work
              without them. Contact your Alubond CRM administrator to update or remove your account.
            </p>
          </section>

          <section>
            <h2 className="font-semibold">Contact</h2>
            <p className="mt-2 text-2">
              For privacy questions, contact{" "}
              <a href="mailto:crm@alubond.com" className="text-brand-600 hover:underline">
                crm@alubond.com
              </a>
              .
            </p>
          </section>
        </div>

        <p className="mt-8 text-center text-sm text-2">
          <Link href="/login" className="text-brand-600 hover:underline">
            Back to login
          </Link>
        </p>
      </div>
    </div>
  );
}
