"use client";

import { startTransition, useCallback, useEffect, useState } from "react";
import { Euro, FileText, Smartphone, TrendingUp } from "lucide-react";
import type { DashboardPayload, KpiPayload } from "@/lib/types";
import { GlassCard } from "@/components/ui/GlassCard";

const eur = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

function KpiCard({
  label,
  value,
  sub,
  subTone,
  icon,
}: {
  label: string;
  value: string;
  sub: string;
  subTone: "green" | "cyan" | "muted";
  icon: React.ReactNode;
}) {
  const subClass =
    subTone === "green"
      ? "text-emerald-400"
      : subTone === "cyan"
        ? "text-sky-300/90"
        : "text-slate-400";
  return (
    <GlassCard glow className="relative overflow-hidden p-5 sm:p-6">
      <div className="absolute right-4 top-4 opacity-90 text-sky-400/80">{icon}</div>
      <p className="text-sm font-medium text-slate-400">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-white sm:text-3xl">{value}</p>
      <p className={`mt-1 text-sm ${subClass}`}>{sub}</p>
    </GlassCard>
  );
}

const emptyKpis: KpiPayload = {
  chiffreAffaires: 0,
  chiffreAffairesTrendPct: 0,
  chantiersActifs: 0,
  chantiersSousTitre: "—",
  devisEnAttente: 0,
  devisSousTitre: "—",
  tauxConversion: 0,
  tauxConversionTrendPct: 0,
};

export function KpiGrid() {
  const [kpis, setKpis] = useState<KpiPayload>(emptyKpis);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const r = await fetch("/api/dashboard");
    if (!r.ok) return;
    const data = (await r.json()) as DashboardPayload;
    setKpis(data.kpis);
    setLoading(false);
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

  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <GlassCard key={i} className="h-32 animate-pulse bg-slate-800/40" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <KpiCard
        label="Chiffre d'Affaires"
        value={eur.format(kpis.chiffreAffaires)}
        sub={`+${kpis.chiffreAffairesTrendPct}%`}
        subTone="green"
        icon={<Euro className="h-6 w-6" strokeWidth={1.5} />}
      />
      <KpiCard
        label="Chantiers Actifs"
        value={String(kpis.chantiersActifs)}
        sub={kpis.chantiersSousTitre}
        subTone="cyan"
        icon={<Smartphone className="h-6 w-6" strokeWidth={1.5} />}
      />
      <KpiCard
        label="Devis En Attente"
        value={String(kpis.devisEnAttente)}
        sub={kpis.devisSousTitre}
        subTone="cyan"
        icon={<FileText className="h-6 w-6" strokeWidth={1.5} />}
      />
      <KpiCard
        label="Taux de Conversion"
        value={`${kpis.tauxConversion}%`}
        sub={`+${kpis.tauxConversionTrendPct}%`}
        subTone="green"
        icon={<TrendingUp className="h-6 w-6" strokeWidth={1.5} />}
      />
    </div>
  );
}
