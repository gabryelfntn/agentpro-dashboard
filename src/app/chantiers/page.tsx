"use client";

import { startTransition, useCallback, useEffect, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { GlassCard } from "@/components/ui/GlassCard";
import type { Chantier, ChantierStatut } from "@/lib/types";
import { notifyDataChanged } from "@/lib/notify";
import { Plus, Trash2 } from "lucide-react";

const statutLabel: Record<ChantierStatut, string> = {
  en_cours: "En cours",
  planifie: "Planifié",
  termine: "Terminé",
};

export default function ChantiersPage() {
  const [rows, setRows] = useState<Chantier[]>([]);
  const [loading, setLoading] = useState(true);
  const [nom, setNom] = useState("");
  const [client, setClient] = useState("");
  const [statut, setStatut] = useState<ChantierStatut>("en_cours");
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    const r = await fetch("/api/chantiers");
    if (!r.ok) return;
    setRows(await r.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    startTransition(() => {
      void load();
    });
  }, [load]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    const r = await fetch("/api/chantiers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nom, client, statut }),
    });
    if (!r.ok) {
      const j = await r.json().catch(() => ({}));
      setErr((j as { error?: string }).error ?? "Erreur");
      return;
    }
    setNom("");
    setClient("");
    setStatut("en_cours");
    await load();
    notifyDataChanged();
  }

  async function patchStatut(id: string, s: ChantierStatut) {
    await fetch(`/api/chantiers/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ statut: s }),
    });
    await load();
    notifyDataChanged();
  }

  async function remove(id: string) {
    if (!confirm("Supprimer ce chantier ?")) return;
    await fetch(`/api/chantiers/${id}`, { method: "DELETE" });
    await load();
    notifyDataChanged();
  }

  return (
    <AppShell title="Chantiers" subtitle="Suivi des chantiers et statuts">
      <div className="flex flex-col gap-8">
        <GlassCard className="p-5 sm:p-6">
          <h2 className="text-lg font-semibold text-white">Nouveau chantier</h2>
          <form onSubmit={add} className="mt-4 flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end">
            <label className="flex min-w-[200px] flex-1 flex-col gap-1 text-sm text-slate-400">
              Nom du chantier
              <input
                value={nom}
                onChange={(e) => setNom(e.target.value)}
                className="rounded-xl border border-white/[0.08] bg-slate-950/50 px-3 py-2 text-white outline-none ring-sky-500/40 focus:ring-2"
                placeholder="Rénovation cuisine…"
                required
              />
            </label>
            <label className="flex min-w-[180px] flex-1 flex-col gap-1 text-sm text-slate-400">
              Client
              <input
                value={client}
                onChange={(e) => setClient(e.target.value)}
                className="rounded-xl border border-white/[0.08] bg-slate-950/50 px-3 py-2 text-white outline-none ring-sky-500/40 focus:ring-2"
                placeholder="Nom ou société"
              />
            </label>
            <label className="flex w-full min-w-[140px] flex-col gap-1 text-sm text-slate-400 sm:w-40">
              Statut
              <select
                value={statut}
                onChange={(e) => setStatut(e.target.value as ChantierStatut)}
                className="rounded-xl border border-white/[0.08] bg-slate-950/50 px-3 py-2 text-white outline-none ring-sky-500/40 focus:ring-2"
              >
                <option value="planifie">Planifié</option>
                <option value="en_cours">En cours</option>
                <option value="termine">Terminé</option>
              </select>
            </label>
            <button
              type="submit"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-sky-500 px-4 py-2.5 text-sm font-medium text-slate-950 transition hover:bg-sky-400"
            >
              <Plus className="h-4 w-4" />
              Ajouter
            </button>
          </form>
          {err ? <p className="mt-2 text-sm text-red-400">{err}</p> : null}
        </GlassCard>

        <GlassCard className="overflow-hidden">
          <div className="border-b border-white/[0.06] px-5 py-4 sm:px-6">
            <h2 className="text-lg font-semibold text-white">Liste des chantiers</h2>
            <p className="text-sm text-slate-400">Les indicateurs du tableau de bord se mettent à jour automatiquement.</p>
          </div>
          <div className="overflow-x-auto">
            {loading ? (
              <p className="p-6 text-slate-500">Chargement…</p>
            ) : rows.length === 0 ? (
              <p className="p-6 text-slate-500">Aucun chantier.</p>
            ) : (
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="border-b border-white/[0.06] bg-slate-950/30 text-slate-400">
                  <tr>
                    <th className="px-5 py-3 font-medium sm:px-6">Chantier</th>
                    <th className="px-5 py-3 font-medium sm:px-6">Client</th>
                    <th className="px-5 py-3 font-medium sm:px-6">Statut</th>
                    <th className="px-5 py-3 font-medium sm:px-6">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.05]">
                  {rows.map((c) => (
                    <tr key={c.id} className="text-slate-200">
                      <td className="px-5 py-3 sm:px-6">{c.nom}</td>
                      <td className="px-5 py-3 sm:px-6 text-slate-400">{c.client}</td>
                      <td className="px-5 py-3 sm:px-6">
                        <select
                          value={c.statut}
                          onChange={(e) => void patchStatut(c.id, e.target.value as ChantierStatut)}
                          className="rounded-lg border border-white/[0.08] bg-slate-950/60 px-2 py-1 text-xs text-white outline-none"
                        >
                          {(Object.keys(statutLabel) as ChantierStatut[]).map((k) => (
                            <option key={k} value={k}>
                              {statutLabel[k]}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-5 py-3 sm:px-6">
                        <button
                          type="button"
                          onClick={() => void remove(c.id)}
                          className="inline-flex items-center gap-1 rounded-lg p-2 text-slate-400 transition hover:bg-red-500/10 hover:text-red-400"
                          aria-label="Supprimer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </GlassCard>
      </div>
    </AppShell>
  );
}
