"use client";

import { startTransition, useCallback, useEffect, useState } from "react";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { AppShell } from "@/components/layout/AppShell";
import { GlassCard } from "@/components/ui/GlassCard";
import { uploadPublicUrl } from "@/lib/uploadUrl";
import type { Chantier, MediaDocument } from "@/lib/types";
import { Download, FileText, ImageIcon, Plus, Trash2 } from "lucide-react";

function iconFor(mime: string) {
  if (mime.startsWith("image/")) return <ImageIcon className="h-5 w-5 text-sky-400" />;
  return <FileText className="h-5 w-5 text-slate-400" />;
}

export default function MediasPage() {
  const [docs, setDocs] = useState<MediaDocument[]>([]);
  const [chantiers, setChantiers] = useState<Chantier[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [chantierId, setChantierId] = useState("");

  const load = useCallback(async () => {
    const [dr, cr] = await Promise.all([fetch("/api/medias"), fetch("/api/chantiers")]);
    if (dr.ok) setDocs(await dr.json());
    if (cr.ok) setChantiers(await cr.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    startTransition(() => void load());
  }, [load]);

  async function upload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const input = (e.currentTarget.elements.namedItem("file") as HTMLInputElement | null)?.files?.[0];
    if (!input) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", input);
      if (chantierId) fd.append("chantierId", chantierId);
      const r = await fetch("/api/medias", { method: "POST", body: fd });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        alert((j as { error?: string }).error ?? "Erreur");
        return;
      }
      e.currentTarget.reset();
      await load();
    } finally {
      setUploading(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Supprimer ce fichier ?")) return;
    await fetch(`/api/medias/${id}`, { method: "DELETE" });
    await load();
  }

  return (
    <AppShell title="Médias" subtitle="Plans, photos et documents rattachés aux chantiers">
      <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
        <GlassCard className="overflow-hidden">
          <div className="border-b border-white/[0.06] px-5 py-4 sm:px-6">
            <h2 className="text-lg font-semibold text-white">Bibliothèque</h2>
            <p className="text-sm text-slate-400">PDF, DOCX, images — stockage local sous data/uploads.</p>
          </div>
          {loading ? (
            <p className="p-6 text-slate-500">Chargement…</p>
          ) : docs.length === 0 ? (
            <p className="p-6 text-slate-500">Aucun document.</p>
          ) : (
            <ul className="divide-y divide-white/[0.05]">
              {docs.map((d) => (
                <li
                  key={d.id}
                  className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6"
                >
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="mt-0.5 shrink-0">{iconFor(d.mime)}</div>
                    <div className="min-w-0">
                      <p className="truncate font-medium text-white">{d.nomFichier}</p>
                      <p className="text-xs text-slate-500">
                        {format(parseISO(d.createdAt), "d MMM yyyy HH:mm", { locale: fr })} ·{" "}
                        {(d.taille / 1024).toFixed(1)} Ko
                        {d.chantierId
                          ? ` · ${chantiers.find((c) => c.id === d.chantierId)?.nom ?? ""}`
                          : ""}
                      </p>
                      {d.mime.startsWith("image/") ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={uploadPublicUrl(d.relPath)}
                          alt=""
                          className="mt-2 max-h-32 rounded-lg border border-white/[0.08] object-contain"
                        />
                      ) : null}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <a
                      href={uploadPublicUrl(d.relPath)}
                      download={d.nomFichier}
                      className="inline-flex items-center gap-1 rounded-lg border border-white/[0.1] px-3 py-2 text-xs text-slate-300 hover:bg-white/[0.06]"
                    >
                      <Download className="h-3.5 w-3.5" />
                      Télécharger
                    </a>
                    <button
                      type="button"
                      onClick={() => void remove(d.id)}
                      className="rounded-lg p-2 text-slate-500 hover:bg-red-500/10 hover:text-red-400"
                      aria-label="Supprimer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </GlassCard>

        <GlassCard className="h-fit p-5 sm:p-6">
          <h2 className="text-lg font-semibold text-white">Ajouter un fichier</h2>
          <form onSubmit={upload} className="mt-4 flex flex-col gap-4">
            <label className="flex flex-col gap-2 text-sm text-slate-400">
              Fichier (max 15 Mo)
              <input
                name="file"
                type="file"
                accept=".pdf,.docx,image/*"
                required
                className="text-sm text-slate-300 file:mr-3 file:rounded-lg file:border-0 file:bg-sky-500 file:px-3 file:py-2 file:text-sm file:font-medium file:text-slate-950"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-slate-400">
              Chantier (optionnel)
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
              disabled={uploading}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-sky-500 px-4 py-2.5 text-sm font-medium text-slate-950 hover:bg-sky-400 disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              {uploading ? "Envoi…" : "Enregistrer"}
            </button>
          </form>
        </GlassCard>
      </div>
    </AppShell>
  );
}
