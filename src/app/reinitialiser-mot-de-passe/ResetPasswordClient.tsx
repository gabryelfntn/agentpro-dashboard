"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase/client";

export function ResetPasswordClient() {
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const supabase = supabaseBrowser();
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        setError("Lien invalide ou expiré. Recommence la procédure.");
        return;
      }
      const { error: err } = await supabase.auth.updateUser({ password });
      if (err) {
        setError(err.message || "Réinitialisation impossible");
        return;
      }
      setDone(true);
      window.setTimeout(() => {
        router.replace("/connexion");
      }, 600);
    } catch {
      setError("Réinitialisation impossible");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-full px-4 py-12 sm:px-8">
      <div className="mx-auto w-full max-w-md">
        <div className="rounded-3xl border border-white/[0.08] bg-slate-950/40 p-6 backdrop-blur-xl">
          <h1 className="text-2xl font-semibold tracking-tight text-white">Réinitialiser le mot de passe</h1>
          <p className="mt-1 text-sm text-slate-400">Choisis un nouveau mot de passe (min. 8 caractères).</p>

          <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-4">
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Nouveau mot de passe
              </span>
              <div className="relative">
                <input
                  className="h-11 w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 pr-10 text-sm text-white outline-none placeholder:text-slate-600 focus:border-sky-500/40"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  minLength={8}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-300 hover:bg-white/[0.06] hover:text-white"
                  aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <span className="text-xs text-slate-500">Min. 8 caractères.</span>
            </label>

            {error ? (
              <p className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
                {error}
              </p>
            ) : null}

            {done ? (
              <p className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
                Mot de passe mis à jour. Redirection…
              </p>
            ) : null}

            <button
              type="submit"
              disabled={loading}
              className="mt-2 inline-flex h-11 items-center justify-center rounded-xl bg-sky-500 px-4 text-sm font-semibold text-slate-950 transition hover:bg-sky-400 disabled:opacity-60"
            >
              {loading ? "Mise à jour…" : "Mettre à jour"}
            </button>
          </form>

          <p className="mt-6 text-sm text-slate-400">
            <Link href="/connexion" className="font-medium text-sky-300 hover:text-sky-200">
              Retour à la connexion
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

