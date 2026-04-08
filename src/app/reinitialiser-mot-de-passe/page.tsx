import { Suspense } from "react";
import { ResetPasswordClient } from "./ResetPasswordClient";

export default function ReinitialiserMotDePassePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-full px-4 py-12 sm:px-8">
          <div className="mx-auto w-full max-w-md">
            <div className="rounded-3xl border border-white/[0.08] bg-slate-950/40 p-6 backdrop-blur-xl">
              <div className="h-6 w-64 rounded bg-white/[0.06]" />
              <div className="mt-4 h-4 w-80 rounded bg-white/[0.06]" />
              <div className="mt-8 h-11 w-full rounded-xl bg-white/[0.06]" />
            </div>
          </div>
        </div>
      }
    >
      <ResetPasswordClient />
    </Suspense>
  );
}

