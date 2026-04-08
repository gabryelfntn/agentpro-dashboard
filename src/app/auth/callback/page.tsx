import { Suspense } from "react";
import { AuthCallbackClient } from "./AuthCallbackClient";

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center px-4">
          <p className="text-sm text-slate-400">Chargement…</p>
        </div>
      }
    >
      <AuthCallbackClient />
    </Suspense>
  );
}
