"use client";

import { startTransition, useCallback, useEffect, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { GlassCard } from "@/components/ui/GlassCard";
import type { Devis, DevisStatut } from "@/lib/types";
import { notifyDataChanged } from "@/lib/notify";
import { Check, Plus, X } from "lucide-react";

const eur = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
});

const statutLabel: Record<DevisStatut, string> = {
  en_attente: "En attente",
  accepte: "Accepté",
  refuse: "Refusé",
};

export default function DevisPage() {
  const [rows, setRows] = useState<Devis[]>([]);
  const [loading, setLoading] = useState(true);
  const [client, setClient] = useState("");
  const [montant, setMontant] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    const r = await fetch("/api/devis");
    if (!r.ok) return;
    const list = (await r.json()) as Devis[];
    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    setRows(list);
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
    const montantTtc = Number(montant.replace(",", "."));
    const r = await fetch("/api/devis", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ client, montantTtc }),
    });
    if (!r.ok) {
      const j = await r.json().catch(() => ({}));
      setErr((j as { error?: string }).error ?? "Erreur");
      return;
    }
    setClient("");
    setMontant("");
    await load();
    notifyDataChanged();
  }

  async function patchStatut(id: string, statut: DevisStatut) {
    await fetch(`/api/devis/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ statut }),
    });
    await load();
    notifyDataChanged();
  }

  return (
    <AppShell title="Devis" subtitle="Pipeline commercial et réponses clients">
      <div className="flex flex-col gap-8">
        <GlassCard className="p-5 sm:p-6">
          <h2 className="text-lg font-semibold text-white">Créer un devis</h2>
          <form onSubmit={add} className="mt-4 flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end">
            <label className="flex min-w-[200px] flex-1 flex-col gap-1 text-sm text-slate-400">
              Client
              <input
                value={client}
                onChange={(e) => setClient(e.target.value)}
                className="rounded-xl border border-white/[0.08] bg-slate-950/50 px-3 py-2 text-white outline-none ring-sky-500/40 focus:ring-2"
                placeholder="Raison sociale"
                required
              />
            </label>
            <label className="flex w-full min-w-[140px] flex-col gap-1 text-sm text-slate-400 sm:w-44">
              Montant TTC (€)
              <input
                value={montant}
                onChange={(e) => setMontant(e.target.value)}
                className="rounded-xl border border-white/[0.08] bg-slate-950/50 px-3 py-2 text-white outline-none ring-sky-500/40 focus:ring-2"
                placeholder="25000"
                inputMode="decimal"
                required
              />
            </label>
            <button
              type="submit"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-sky-500 px-4 py-2.5 text-sm font-medium text-slate-950 transition hover:bg-sky-400"
            >
              <Plus className="h-4 w-4" />
              Enregistrer
            </button>
          </form>
          {err ? <p className="mt-2 text-sm text-red-400">{err}</p> : null}
        </GlassCard>

        <GlassCard className="overflow-hidden">
          <div className="border-b border-white/[0.06] px-5 py-4 sm:px-6">
            <h2 className="text-lg font-semibold text-white">Tous les devis</h2>
            <p className="text-sm text-slate-400">
              Acceptez ou refusez un devis pour mettre à jour le chiffre d&apos;affaires et le taux de conversion.
            </p>
          </div>
          <div className="overflow-x-auto">
            {loading ? (
              <p className="p-6 text-slate-500">Chargement…</p>
            ) : rows.length === 0 ? (
              <p className="p-6 text-slate-500">Aucun devis.</p>
            ) : (
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="border-b border-white/[0.06] bg-slate-950/30 text-slate-400">
                  <tr>
                    <th className="px-5 py-3 font-medium sm:px-6">Réf.</th>
                    <th className="px-5 py-3 font-medium sm:px-6">Client</th>
                    <th className="px-5 py-3 font-medium sm:px-6">Montant TTC</th>
                    <th className="px-5 py-3 font-medium sm:px-6">Statut</th>
                    <th className="px-5 py-3 font-medium sm:px-6">Décision</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.05]">
                  {rows.map((d) => (
                    <tr key={d.id} className="text-slate-200">
                      <td className="px-5 py-3 font-mono text-xs text-sky-300/90 sm:px-6">{d.reference}</td>
                      <td className="px-5 py-3 sm:px-6">{d.client}</td>
                      <td className="px-5 py-3 sm:px-6">{eur.format(d.montantTtc)}</td>
                      <td className="px-5 py-3 sm:px-6 text-slate-400">{statutLabel[d.statut]}</td>
                      <td className="px-5 py-3 sm:px-6">
                        {d.statut === "en_attente" ? (
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => void patchStatut(d.id, "accepte")}
                              className="inline-flex items-center gap-1 rounded-lg bg-emerald-500/15 px-2 py-1 text-xs font-medium text-emerald-300 transition hover:bg-emerald-500/25"
                            >
                              <Check className="h-3.5 w-3.5" />
                              Accepter
                            </button>
                            <button
                              type="button"
                              onClick={() => void patchStatut(d.id, "refuse")}
                              className="inline-flex items-center gap-1 rounded-lg bg-red-500/10 px-2 py-1 text-xs font-medium text-red-300 transition hover:bg-red-500/20"
                            >
                              <X className="h-3.5 w-3.5" />
                              Refuser
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-500">—</span>
                        )}
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
