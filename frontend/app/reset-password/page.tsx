import { Suspense } from "react";

import ResetPasswordForm from "./ResetPasswordForm";

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen grid place-items-center p-4 bg-[var(--surface)] text-sm text-3">
          Loading reset form...
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
