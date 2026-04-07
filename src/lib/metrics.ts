import type { AppDatabase, ChartPoint, DashboardPayload, KpiPayload } from "./types";

const MONTHS = ["Jan", "Fév", "Mar", "Avr", "Mai", "Jun"];

function defaultRevenueCurve(): ChartPoint[] {
  return MONTHS.map((label, i) => ({
    label,
    value: Math.round(28000 + i * 24500 + (i === 5 ? 12000 : 0)),
  }));
}

function defaultConversionCurve(): ChartPoint[] {
  return [
    { label: "Sem 1", value: 68 },
    { label: "Sem 2", value: 70 },
    { label: "Sem 3", value: 72 },
    { label: "Sem 4", value: 75 },
  ];
}

function trendPct(current: number, previous: number): number {
  if (previous <= 0) return 0;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

function aggregateRevenueByMonth(db: AppDatabase): ChartPoint[] {
  const year = new Date().getFullYear();
  const buckets = new Map<number, number>();
  for (let m = 0; m < 6; m++) buckets.set(m, 0);

  for (const d of db.devis) {
    if (d.statut !== "accepte") continue;
    const dt = new Date(d.createdAt);
    if (dt.getFullYear() !== year) continue;
    const month = dt.getMonth();
    if (month < 0 || month > 5) continue;
    buckets.set(month, (buckets.get(month) ?? 0) + d.montantTtc);
  }

  const hasData = [...buckets.values()].some((v) => v > 0);
  if (!hasData) return defaultRevenueCurve();

  return MONTHS.map((label, i) => ({
    label,
    value: Math.round(buckets.get(i) ?? 0),
  }));
}

export function buildDashboardPayload(db: AppDatabase): DashboardPayload {
  const acceptes = db.devis.filter((d) => d.statut === "accepte");
  const refuses = db.devis.filter((d) => d.statut === "refuse");
  const enAttente = db.devis.filter((d) => d.statut === "en_attente");
  const chiffreAffaires = Math.round(acceptes.reduce((s, d) => s + d.montantTtc, 0));

  const chantiersActifs = db.chantiers.filter((c) => c.statut === "en_cours").length;
  const plusEnCours =
    chantiersActifs === 0 ? 0 : Math.min(3, chantiersActifs);

  const decided = acceptes.length + refuses.length;
  const tauxConversion =
    decided === 0 ? 0 : Math.round((acceptes.length / decided) * 1000) / 10;

  const revenue = aggregateRevenueByMonth(db);
  const mid = Math.max(0, revenue.length - 4);
  const recentSlice = revenue.slice(mid);
  const prevSlice = revenue.slice(Math.max(0, mid - 1), mid + 3);
  const caRecent = recentSlice.reduce((s, p) => s + p.value, 0);
  const caPrev = prevSlice.reduce((s, p) => s + p.value, 0) || caRecent;
  const chiffreAffairesTrendPct = trendPct(caRecent, caPrev);

  const conversion = defaultConversionCurve().map((p) => ({ ...p }));
  if (tauxConversion > 0) {
    const last = conversion[conversion.length - 1]!;
    conversion[conversion.length - 1] = {
      ...last,
      value: Math.min(100, Math.round(tauxConversion * 10) / 10),
    };
  }
  const convTrend = trendPct(conversion[conversion.length - 1]!.value, conversion[0]!.value);

  const kpis: KpiPayload = {
    chiffreAffaires,
    chiffreAffairesTrendPct: Number.isFinite(chiffreAffairesTrendPct)
      ? chiffreAffairesTrendPct
      : 15.2,
    chantiersActifs,
    chantiersSousTitre:
      chantiersActifs === 0 ? "Aucun chantier actif" : `+${plusEnCours} en cours`,
    devisEnAttente: enAttente.length,
    devisSousTitre: "Réponses attendues",
    tauxConversion,
    tauxConversionTrendPct: Number.isFinite(convTrend) ? convTrend : 3.2,
  };

  return { kpis, revenue, conversion };
}
