"use client";

import { startTransition, useCallback, useEffect, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { GlassCard } from "@/components/ui/GlassCard";
import { notifyDataChanged, notifyProfileChanged } from "@/lib/notify";
import { AlertTriangle } from "lucide-react";

export default function ParametresPage() {
  const [displayName, setDisplayName] = useState("");
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    const r = await fetch("/api/profile");
    if (!r.ok) return;
    const p = (await r.json()) as { displayName: string };
    setDisplayName(p.displayName);
  }, []);

  useEffect(() => {
    startTransition(() => {
      void load();
    });
  }, [load]);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setSaved(false);
    const r = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ displayName }),
    });
    if (!r.ok) {
      const j = await r.json().catch(() => ({}));
      setErr((j as { error?: string }).error ?? "Erreur");
      return;
    }
    setSaved(true);
    notifyProfileChanged();
  }

  async function resetData() {
    if (
      !confirm(
        "Réinitialiser toutes les données (chantiers, devis, planning, tâches, contacts, médias, rendus IA) aux valeurs de démonstration ? Cette action est irréversible.",
      )
    ) {
      return;
    }
    await fetch("/api/reset", { method: "POST" });
    notifyDataChanged();
    notifyProfileChanged();
    await load();
    window.location.reload();
  }

  return (
    <AppShell title="Paramètres" subtitle="Profil et données locales">
      <div className="flex max-w-xl flex-col gap-8">
        <GlassCard className="p-5 sm:p-6">
          <h2 className="text-lg font-semibold text-white">Profil affiché</h2>
          <p className="text-sm text-slate-400">Nom visible dans l&apos;en-tête (comme sur la maquette).</p>
          <form onSubmit={saveProfile} className="mt-4 flex flex-col gap-4">
            <label className="flex flex-col gap-1 text-sm text-slate-400">
              Nom complet
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="rounded-xl border border-white/[0.08] bg-slate-950/50 px-3 py-2 text-white outline-none ring-sky-500/40 focus:ring-2"
                maxLength={80}
                required
              />
            </label>
            <button
              type="submit"
              className="w-fit rounded-xl bg-sky-500 px-5 py-2.5 text-sm font-medium text-slate-950 transition hover:bg-sky-400"
            >
              Enregistrer
            </button>
            {saved ? <p className="text-sm text-emerald-400">Modifications enregistrées.</p> : null}
            {err ? <p className="text-sm text-red-400">{err}</p> : null}
          </form>
        </GlassCard>

        <GlassCard className="p-5 sm:p-6">
          <h2 className="text-lg font-semibold text-white">Données & IA</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-slate-400">
            <li>
              Base métier : en local <code className="rounded bg-white/5 px-1 text-slate-300">data/db.json</code> ; en
              production (Vercel) : Postgres via{" "}
              <code className="rounded bg-white/5 px-1 text-slate-300">DATABASE_URL</code> (ex. Neon).
            </li>
            <li>
              Fichiers (terrains, médias) : en local{" "}
              <code className="rounded bg-white/5 px-1 text-slate-300">data/uploads/</code> ; en prod :{" "}
              <code className="rounded bg-white/5 px-1 text-slate-300">BLOB_READ_WRITE_TOKEN</code> (Vercel Blob).
            </li>
            <li>
              Visions terrain (gratuit) :{" "}
              <code className="rounded bg-white/5 px-1 text-slate-300">HUGGINGFACE_API_TOKEN</code> sur{" "}
              <a href="https://huggingface.co/settings/tokens" className="text-sky-400 underline" target="_blank" rel="noreferrer">
                huggingface.co
              </a>
              . Replicate est optionnel et payant après crédits (erreur 402).
            </li>
          </ul>
        </GlassCard>

        <GlassCard className="border-red-500/20 p-5 sm:p-6">
          <div className="flex gap-3">
            <AlertTriangle className="h-5 w-5 shrink-0 text-amber-400" />
            <div>
              <h2 className="text-lg font-semibold text-white">Zone sensible</h2>
              <p className="mt-1 text-sm text-slate-400">
                Supprime les chantiers et devis personnalisés et recharge le jeu de démonstration. Votre nom affiché dans
                l&apos;en-tête est conservé.
              </p>
              <button
                type="button"
                onClick={() => void resetData()}
                className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm font-medium text-red-300 transition hover:bg-red-500/20"
              >
                Réinitialiser les données
              </button>
            </div>
          </div>
        </GlassCard>
      </div>
    </AppShell>
  );
}
