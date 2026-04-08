"use client";

import Link from "next/link";
import { useState } from "react";

export default function MotDePasseOubliePage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [resetLink, setResetLink] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResetLink(null);
    try {
      const r = await fetch("/api/auth/forgot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const json = (await r.json()) as { token?: string };
      setSent(true);
      // In this app we show the link directly (no email integration yet).
      if (json.token) {
        setResetLink(`${window.location.origin}/reinitialiser-mot-de-passe?token=${encodeURIComponent(json.token)}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-full px-4 py-12 sm:px-8">
      <div className="mx-auto w-full max-w-md">
        <div className="rounded-3xl border border-white/[0.08] bg-slate-950/40 p-6 backdrop-blur-xl">
          <h1 className="text-2xl font-semibold tracking-tight text-white">Mot de passe oublié</h1>
          <p className="mt-1 text-sm text-slate-400">
            Saisis ton email. Si un compte existe, tu pourras créer un nouveau mot de passe.
          </p>

          <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-4">
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

            <button
              type="submit"
              disabled={loading}
              className="mt-2 inline-flex h-11 items-center justify-center rounded-xl bg-sky-500 px-4 text-sm font-semibold text-slate-950 transition hover:bg-sky-400 disabled:opacity-60"
            >
              {loading ? "Envoi…" : "Obtenir un lien"}
            </button>
          </form>

          {sent ? (
            <div className="mt-6 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
              <p className="text-sm text-slate-200">Si un compte existe, un lien de réinitialisation est prêt.</p>
              {resetLink ? (
                <p className="mt-2 break-all text-sm text-sky-300">
                  <a className="hover:text-sky-200" href={resetLink}>
                    {resetLink}
                  </a>
                </p>
              ) : (
                <p className="mt-2 text-sm text-slate-400">
                  (En prod, ce lien devrait être envoyé par email.)
                </p>
              )}
            </div>
          ) : null}

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

