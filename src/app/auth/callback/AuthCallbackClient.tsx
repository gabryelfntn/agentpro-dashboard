"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";

function safeNext(raw: string | null): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return "/dashboard";
  return raw;
}

export function AuthCallbackClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [message, setMessage] = useState("Connexion en cours…");

  useEffect(() => {
    const next = safeNext(searchParams.get("next"));
    const code = searchParams.get("code");
    const tokenHash = searchParams.get("token_hash");
    const type = searchParams.get("type") as
      | "invite"
      | "signup"
      | "magiclink"
      | "recovery"
      | "email_change"
      | null;

    void (async () => {
      try {
        const supabase = supabaseBrowser();

        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) {
            setMessage(error.message || "Lien invalide ou expiré.");
            return;
          }
          router.replace(next);
          return;
        }

        if (tokenHash && type) {
          const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
          if (error) {
            setMessage(error.message || "Lien invalide ou expiré.");
            return;
          }
          router.replace(next);
          return;
        }

        setMessage("Lien incomplet. Ouvre le lien depuis l’e-mail d’invitation, ou reconnecte-toi.");
      } catch {
        setMessage("Erreur lors de la connexion.");
      }
    })();
  }, [router, searchParams]);

  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center px-4 text-center">
      <p className="text-sm text-slate-300">{message}</p>
      <a href="/connexion" className="mt-4 text-sm text-sky-400 underline">
        Aller à la connexion
      </a>
    </div>
  );
}
