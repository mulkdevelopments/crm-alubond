'use client';

import { BrandMark } from '@/components/brand/BrandLogo';
import { Badge } from '@/components/ui/Badge';

function AppleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 256 315" aria-hidden className={className} preserveAspectRatio="xMidYMid meet" fill="currentColor">
      <path d="M213.803 167.03c.442 47.58 41.74 63.413 42.197 63.615c-.35 1.116-6.599 22.563-21.757 44.716c-13.104 19.153-26.705 38.235-48.13 38.63c-21.05.388-27.82-12.483-51.888-12.483c-24.061 0-31.582 12.088-51.51 12.871c-20.68.783-36.428-20.71-49.64-39.793c-27-39.033-47.633-110.3-19.928-158.406c13.763-23.89 38.36-39.017 65.056-39.405c20.307-.387 39.475 13.662 51.889 13.662c12.406 0 35.699-16.895 60.186-14.414c10.25.427 39.026 4.14 57.503 31.186c-1.49.923-34.335 20.044-33.978 59.822M174.24 50.199c10.98-13.29 18.369-31.79 16.353-50.199c-15.826.636-34.962 10.546-46.314 23.828c-10.173 11.763-19.082 30.589-16.678 48.633c17.64 1.365 35.66-8.964 46.64-22.262" />
    </svg>
  );
}

function GooglePlayIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 256 283" aria-hidden className={className} preserveAspectRatio="xMidYMid meet">
      <path
        fill="#EA4335"
        d="M119.553 134.916 1.06 259.061a32.14 32.14 0 0 0 47.062 19.071l133.327-75.934z"
      />
      <path
        fill="#FBBC04"
        d="M239.37 113.814 181.715 80.79l-64.898 56.95 65.162 64.28 57.216-32.67a31.345 31.345 0 0 0 0-55.537z"
      />
      <path
        fill="#4285F4"
        d="M1.06 23.487A30.6 30.6 0 0 0 0 31.61v219.327a32.3 32.3 0 0 0 1.06 8.124l122.555-120.966z"
      />
      <path
        fill="#34A853"
        d="m120.436 141.274 61.278-60.483L48.564 4.503A32.85 32.85 0 0 0 32.051 0C17.644-.028 4.978 9.534 1.06 23.399z"
      />
    </svg>
  );
}

export function MobileAppNotificationPromo() {
  return (
    <section
      aria-label="Alubond CRM mobile app coming soon"
      className="border-b border-[var(--border)] bg-gradient-to-br from-brand-600/10 via-[var(--surface)] to-[var(--surface-2)] px-3.5 py-3"
    >
      <div className="flex items-start gap-3">
        <BrandMark size="sm" className="mt-0.5" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs font-semibold tracking-tight text-[var(--text)]">Alubond CRM mobile app</p>
            <Badge tone="brand" className="text-[10px] px-1.5 py-0">
              Coming soon
            </Badge>
          </div>
          <p className="mt-1 text-[11px] leading-relaxed text-3">
            Our iOS and Android apps are coming soon. You&apos;ll be notified here once they&apos;re available to
            download.
          </p>
          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-[10px] font-medium text-3">
              <AppleIcon className="h-3.5 w-auto shrink-0" />
              App Store
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-[10px] font-medium text-3">
              <GooglePlayIcon className="h-3.5 w-auto shrink-0" />
              Google Play
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
