"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function InscriptionPage() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const r = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, displayName }),
      });
      const json = (await r.json()) as { error?: string };
      if (!r.ok) {
        setError(json.error || "Inscription impossible");
        return;
      }
      // Auto-login after signup.
      const r2 = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!r2.ok) {
        router.replace("/connexion");
        return;
      }
      router.replace("/dashboard");
    } catch {
      setError("Inscription impossible");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-full px-4 py-12 sm:px-8">
      <div className="mx-auto w-full max-w-md">
        <div className="rounded-3xl border border-white/[0.08] bg-slate-950/40 p-6 backdrop-blur-xl">
          <h1 className="text-2xl font-semibold tracking-tight text-white">Créer un compte</h1>
          <p className="mt-1 text-sm text-slate-400">Chaque compte a ses propres données.</p>

          <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-4">
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Nom</span>
              <input
                className="h-11 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-sky-500/40"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                type="text"
                autoComplete="name"
                placeholder="Ex: Gabryel"
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Email</span>
              <input
                className="h-11 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-sky-500/40"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                autoComplete="email"
                required
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Mot de passe</span>
              <input
                className="h-11 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-sky-500/40"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
              />
              <span className="text-xs text-slate-500">Min. 8 caractères.</span>
            </label>

            {error ? (
              <p className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={loading}
              className="mt-2 inline-flex h-11 items-center justify-center rounded-xl bg-sky-500 px-4 text-sm font-semibold text-slate-950 transition hover:bg-sky-400 disabled:opacity-60"
            >
              {loading ? "Création…" : "Créer le compte"}
            </button>
          </form>

          <p className="mt-6 text-sm text-slate-400">
            Déjà un compte ?{" "}
            <Link href="/connexion" className="font-medium text-sky-300 hover:text-sky-200">
              Se connecter
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

