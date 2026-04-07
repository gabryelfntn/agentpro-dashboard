"use client";

import { startTransition, useCallback, useEffect, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { GlassCard } from "@/components/ui/GlassCard";
import type { DashboardPayload } from "@/lib/types";
import { Download, FileSpreadsheet } from "lucide-react";

const eur = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

export default function RapportsPage() {
  const [summary, setSummary] = useState<DashboardPayload | null>(null);

  const load = useCallback(async () => {
    const r = await fetch("/api/dashboard");
    if (!r.ok) return;
    setSummary(await r.json());
  }, []);

  useEffect(() => {
    startTransition(() => {
      void load();
    });
    const h = () => {
      startTransition(() => {
        void load();
      });
    };
    window.addEventListener("agentpro-data-changed", h);
    return () => window.removeEventListener("agentpro-data-changed", h);
  }, [load]);

  return (
    <AppShell title="Rapports" subtitle="Exports et synthèses">
      <div className="flex flex-col gap-8">
        <div className="grid gap-4 sm:grid-cols-2">
          <GlassCard className="p-5 sm:p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-500/15 text-sky-400">
                <FileSpreadsheet className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-semibold text-white">Export CSV</h2>
                <p className="text-sm text-slate-400">
                  Chantiers, devis, planning, tâches, contacts et historique IA
                </p>
              </div>
            </div>
            <a
              href="/api/export"
              download
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/[0.1] bg-white/[0.04] py-3 text-sm font-medium text-white transition hover:bg-white/[0.08] sm:w-auto sm:px-6"
            >
              <Download className="h-4 w-4" />
              Télécharger l&apos;export
            </a>
          </GlassCard>
          <GlassCard className="p-5 sm:p-6">
            <h2 className="font-semibold text-white">Instantané KPI</h2>
            <p className="mt-1 text-sm text-slate-400">Valeurs actuelles du tableau de bord</p>
            {summary ? (
              <ul className="mt-4 space-y-2 text-sm text-slate-300">
                <li>
                  Chiffre d&apos;affaires :{" "}
                  <span className="font-medium text-white">{eur.format(summary.kpis.chiffreAffaires)}</span>
                </li>
                <li>
                  Chantiers actifs :{" "}
                  <span className="font-medium text-white">{summary.kpis.chantiersActifs}</span>
                </li>
                <li>
                  Devis en attente :{" "}
                  <span className="font-medium text-white">{summary.kpis.devisEnAttente}</span>
                </li>
                <li>
                  Taux de conversion :{" "}
                  <span className="font-medium text-white">{summary.kpis.tauxConversion}%</span>
                </li>
              </ul>
            ) : (
              <p className="mt-4 text-sm text-slate-500">Chargement…</p>
            )}
          </GlassCard>
        </div>

        <GlassCard className="p-5 sm:p-6">
          <h2 className="font-semibold text-white">Planning (Calendrier)</h2>
          <p className="mt-1 text-sm text-slate-400">
            Import dans Outlook, Google Agenda ou Apple Calendrier (fichier .ics).
          </p>
          <a
            href="/api/planning/export"
            download
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/[0.1] bg-white/[0.04] py-3 text-sm font-medium text-white transition hover:bg-white/[0.08] sm:w-auto sm:px-6"
          >
            <Download className="h-4 w-4" />
            Télécharger agentpro-planning.ics
          </a>
        </GlassCard>
      </div>
    </AppShell>
  );
}
