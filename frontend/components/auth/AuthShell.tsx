import Link from "next/link";

import { AuthBrandHeader } from "@/components/brand/BrandLogo";

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="min-h-screen grid place-items-center p-4 bg-[var(--surface)]">
      <div className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-6 md:p-8">
        <div className="flex justify-center pb-1">
          <AuthBrandHeader />
        </div>
        <Link href="/login" className="mt-5 inline-block text-xs text-3 hover:text-[var(--text)]">
          ← Back to sign in
        </Link>
        <h1 className="mt-3 text-2xl font-bold tracking-tight">{title}</h1>
        <p className="text-sm text-3 mt-1">{subtitle}</p>
        {children}
        {footer ? <div className="mt-6 border-t border-[var(--border)] pt-4">{footer}</div> : null}
      </div>
    </div>
  );
}
