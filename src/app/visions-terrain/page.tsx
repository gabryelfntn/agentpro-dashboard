"use client";

import { startTransition, useCallback, useEffect, useState } from "react";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { AppShell } from "@/components/layout/AppShell";
import { GlassCard } from "@/components/ui/GlassCard";
import { uploadPublicUrl } from "@/lib/uploadUrl";
import type { Chantier, TerrainJob } from "@/lib/types";
import { Loader2, Sparkles, Trash2, Upload } from "lucide-react";

export default function VisionsTerrainPage() {
  const [jobs, setJobs] = useState<TerrainJob[]>([]);
  const [chantiers, setChantiers] = useState<Chantier[]>([]);
  const [aiOk, setAiOk] = useState<boolean | null>(null);
  const [providerHint, setProviderHint] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [brief, setBrief] = useState(
    "Entreprise de rénovation haut de gamme, style contemporain, matériaux pierre naturelle et bois clair.",
  );
  const [consigne, setConsigne] = useState(
    "Ajouter une extension de 40 m² en rez-de-jardin avec baies vitrées, terrasse bois et garde-corps verre.",
  );
  const [chantierId, setChantierId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  /** Évite mismatch d’hydratation sur le submit (SSR vs client autour de l’input file / disabled). */
  const [clientMounted, setClientMounted] = useState(false);

  const load = useCallback(async () => {
    const [jr, cr, cfg] = await Promise.all([
      fetch("/api/terrain/jobs"),
      fetch("/api/chantiers"),
      fetch("/api/terrain/config"),
    ]);
    if (jr.ok) setJobs(await jr.json());
    if (cr.ok) setChantiers(await cr.json());
    if (cfg.ok) {
      const j = (await cfg.json()) as {
        configured?: boolean;
        replicateConfigured?: boolean;
        providerHint?: string;
      };
      setAiOk(j.configured ?? j.replicateConfigured ?? false);
      setProviderHint(j.providerHint ?? "");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    setClientMounted(true);
    startTransition(() => void load());
  }, [load]);

  useEffect(() => {
    const active = jobs.some((j) => j.status === "en_attente" || j.status === "en_cours");
    if (!active) return;
    const t = setInterval(() => {
      void (async () => {
        const r = await fetch("/api/terrain/jobs");
        if (r.ok) setJobs(await r.json());
      })();
    }, 2500);
    return () => clearInterval(t);
  }, [jobs]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("image", file);
      fd.append("briefEntreprise", brief);
      fd.append("consigne", consigne);
      if (chantierId) fd.append("chantierId", chantierId);
      const r = await fetch("/api/terrain/jobs", { method: "POST", body: fd });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        alert((j as { error?: string }).error ?? "Erreur envoi");
        return;
      }
      setFile(null);
      await load();
    } finally {
      setSubmitting(false);
    }
  }

  async function removeJob(id: string) {
    if (!confirm("Supprimer ce rendu et les fichiers associés ?")) return;
    await fetch(`/api/terrain/jobs/${id}`, { method: "DELETE" });
    await load();
  }

  return (
    <AppShell
      title="Visions terrain IA"
      subtitle="Photo du terrain + consignes métier → image de projection (Hugging Face gratuit ou Replicate payant)"
    >
      <div className="flex flex-col gap-8">
        {aiOk === false ? (
          <GlassCard className="border-amber-500/30 bg-amber-500/5 p-4 text-sm text-amber-100">
            <p className="font-medium">Intelligence artificielle non configurée</p>
            <p className="mt-1 text-amber-200/80">
              <strong className="text-amber-100">Sans payer :</strong> compte gratuit sur{" "}
              <a href="https://huggingface.co" className="underline" target="_blank" rel="noreferrer">
                huggingface.co
              </a>
              , puis{" "}
              <a
                href="https://huggingface.co/settings/tokens/new?ownUserPermissions=inference.serverless.write&tokenType=fineGrained"
                className="underline"
                target="_blank"
                rel="noreferrer"
              >
                jeton fine-grained
              </a>{" "}
              avec la permission <strong className="text-amber-100">Inference Providers</strong> (appels serverless),
              ajoutez{" "}
              <code className="rounded bg-black/30 px-1">HUGGINGFACE_API_TOKEN=hf_...</code> dans{" "}
              <code className="rounded bg-black/30 px-1">.env</code>, redémarrez{" "}
              <code className="rounded bg-black/30 px-1">npm run dev</code>. Replicate fonctionne aussi mais exige des
              crédits payants après l’essai (erreur 402).
            </p>
          </GlassCard>
        ) : null}
        {aiOk === true && providerHint === "huggingface" ? (
          <GlassCard className="border-emerald-500/25 bg-emerald-500/5 p-3 text-sm text-emerald-100">
            Fournisseur actif : <strong>Hugging Face</strong> (quota gratuit, parfois file d’attente si le modèle se
            met en veille).
          </GlassCard>
        ) : null}
        {aiOk === true && providerHint === "replicate" ? (
          <GlassCard className="border-sky-500/25 bg-sky-500/5 p-3 text-sm text-sky-100">
            Fournisseur actif : <strong>Replicate</strong> (facturation au-delà des crédits inclus).
          </GlassCard>
        ) : null}

        <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_minmax(0,420px)]">
          <GlassCard className="p-5 sm:p-6">
            <h2 className="text-lg font-semibold text-white">Nouvelle simulation</h2>
            <p className="mt-1 text-sm text-slate-400">
              Importez une photo du terrain ou du bâtiment existant. Le brief décrit votre entreprise et son style ;
              la consigne précise ce que le client ou l&apos;équipe souhaite voir réalisé.
            </p>
            <form onSubmit={submit} className="mt-6 flex flex-col gap-4">
              <label className="flex flex-col gap-2 text-sm text-slate-400">
                Photo (JPEG, PNG, WebP — max 12 Mo)
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  className="text-sm text-slate-300 file:mr-3 file:rounded-lg file:border-0 file:bg-sky-500 file:px-3 file:py-2 file:text-sm file:font-medium file:text-slate-950"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs text-slate-400">
                Brief entreprise (style, positionnement, matériaux habituels…)
                <textarea
                  value={brief}
                  onChange={(e) => setBrief(e.target.value)}
                  required
                  rows={4}
                  className="rounded-xl border border-white/[0.08] bg-slate-950/50 px-3 py-2 text-sm text-white outline-none"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs text-slate-400">
                Consigne précise du projet sur cette photo
                <textarea
                  value={consigne}
                  onChange={(e) => setConsigne(e.target.value)}
                  required
                  rows={4}
                  className="rounded-xl border border-white/[0.08] bg-slate-950/50 px-3 py-2 text-sm text-white outline-none"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs text-slate-400">
                Lier à un chantier (optionnel)
                <select
                  value={chantierId}
                  onChange={(e) => setChantierId(e.target.value)}
                  className="rounded-xl border border-white/[0.08] bg-slate-950/50 px-3 py-2 text-sm text-white outline-none"
                >
                  <option value="">—</option>
                  {chantiers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nom}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="submit"
                disabled={!clientMounted || !file || submitting}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-sky-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-sky-900/30 disabled:opacity-40"
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                Lancer la génération IA
              </button>
            </form>
          </GlassCard>

          <GlassCard className="h-fit p-5 sm:p-6">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
              <Sparkles className="h-5 w-5 text-sky-400" />
              Comment ça marche
            </h2>
            <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm text-slate-400">
              <li>Le fichier est enregistré sur votre serveur (dossier data/uploads).</li>
              <li>
                Par défaut avec <code className="rounded bg-white/5 px-1">HUGGINGFACE_API_TOKEN</code> : envoi à
                l’API Inference Hugging Face (quota gratuit, parfois attente 503 le temps du réveil du modèle).
              </li>
              <li>Sinon, avec Replicate uniquement : exécution img2img payante après épuisement des crédits.</li>
              <li>Le rendu est stocké localement sur votre machine.</li>
            </ol>
          </GlassCard>
        </div>

        <GlassCard className="overflow-hidden">
          <div className="border-b border-white/[0.06] px-5 py-4 sm:px-6">
            <h2 className="text-lg font-semibold text-white">Historique des rendus</h2>
          </div>
          {loading ? (
            <p className="p-6 text-slate-500">Chargement…</p>
          ) : jobs.length === 0 ? (
            <p className="p-6 text-slate-500">Aucune génération pour le moment.</p>
          ) : (
            <ul className="divide-y divide-white/[0.05]">
              {jobs.map((j) => (
                <li key={j.id} className="px-5 py-6 sm:px-6">
                  <div className="flex flex-col gap-4 lg:flex-row lg:justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-slate-500">
                        {format(parseISO(j.createdAt), "d MMM yyyy HH:mm", { locale: fr })} ·{" "}
                        <span
                          className={
                            j.status === "termine"
                              ? "text-emerald-400"
                              : j.status === "erreur"
                                ? "text-red-400"
                                : "text-amber-300"
                          }
                        >
                          {j.status === "en_attente"
                            ? "En file"
                            : j.status === "en_cours"
                              ? "Génération…"
                              : j.status === "termine"
                                ? "Terminé"
                                : "Erreur"}
                        </span>
                        {j.meta?.dureeMs != null ? ` · ${Math.round(j.meta.dureeMs / 1000)} s` : null}
                      </p>
                      <p className="mt-2 text-sm font-medium text-white">{j.consigne.slice(0, 120)}…</p>
                      <p className="mt-1 text-xs text-slate-500 line-clamp-2">{j.briefEntreprise}</p>
                      {j.erreur ? (
                        <p className="mt-2 text-xs text-red-400">{j.erreur}</p>
                      ) : null}
                    </div>
                    <button
                      type="button"
                      onClick={() => void removeJob(j.id)}
                      className="self-start rounded-lg p-2 text-slate-500 hover:bg-red-500/10 hover:text-red-400 lg:self-center"
                      aria-label="Supprimer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <div>
                      <p className="mb-2 text-xs font-medium text-slate-500">Photo source</p>
                      {/* eslint-disable-next-line @next/next/no-img-element -- URLs dynamiques locales */}
                      <img
                        src={uploadPublicUrl(j.sourceRelPath)}
                        alt="Source"
                        className="max-h-64 w-full rounded-xl border border-white/[0.08] object-contain"
                      />
                    </div>
                    <div>
                      <p className="mb-2 text-xs font-medium text-slate-500">Rendu IA</p>
                      {j.resultRelPath ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={uploadPublicUrl(j.resultRelPath)}
                          alt="Rendu"
                          className="max-h-64 w-full rounded-xl border border-white/[0.08] object-contain"
                        />
                      ) : (
                        <div className="flex h-48 items-center justify-center rounded-xl border border-dashed border-white/[0.12] text-sm text-slate-500">
                          {j.status === "en_cours" || j.status === "en_attente" ? (
                            <span className="flex items-center gap-2">
                              <Loader2 className="h-5 w-5 animate-spin text-sky-400" />
                              Génération en cours…
                            </span>
                          ) : (
                            "Pas de rendu"
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </GlassCard>
      </div>
    </AppShell>
  );
}
