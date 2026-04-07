"use client";

import { startTransition, useCallback, useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ChartPoint, DashboardPayload } from "@/lib/types";
import { GlassCard } from "@/components/ui/GlassCard";

const eurShort = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

export function RevenueAreaChart() {
  const [data, setData] = useState<ChartPoint[]>([]);
  /** Recharts ResponsiveContainer mesure le DOM : rendu SSR ≠ client → erreur d’hydratation sans ce garde. */
  const [mounted, setMounted] = useState(false);

  const load = useCallback(async () => {
    const r = await fetch("/api/dashboard");
    if (!r.ok) return;
    const payload = (await r.json()) as DashboardPayload;
    setData(payload.revenue);
  }, []);

  useEffect(() => {
    setMounted(true);
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
    <GlassCard className="p-5 sm:p-6">
      <h2 className="text-lg font-semibold text-white">Évolution des Revenus</h2>
      <p className="text-sm text-slate-400">CA reconnu sur les devis acceptés (6 mois)</p>
      <div className="mt-4 h-[280px] w-full min-h-[240px] min-w-0">
        {!mounted ? (
          <div className="h-full min-h-[240px] rounded-lg bg-slate-800/40" aria-hidden />
        ) : (
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="fillRevenue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#38bdf8" stopOpacity={0.55} />
                <stop offset="100%" stopColor="#38bdf8" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.12)" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fill: "#94a3b8", fontSize: 12 }}
              axisLine={{ stroke: "rgba(148,163,184,0.2)" }}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: "#94a3b8", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => eurShort.format(Number(v)).replace(/\u00a0/g, " ")}
              domain={[0, "auto"]}
              width={72}
            />
            <Tooltip
              contentStyle={{
                background: "rgba(15,23,42,0.92)",
                border: "1px solid rgba(148,163,184,0.2)",
                borderRadius: 12,
                color: "#f8fafc",
              }}
              formatter={(value) => [eurShort.format(Number(value ?? 0)), "CA"]}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke="#38bdf8"
              strokeWidth={2}
              fill="url(#fillRevenue)"
              dot={false}
              activeDot={{ r: 5, fill: "#7dd3fc", stroke: "#0c4a6e" }}
            />
          </AreaChart>
        </ResponsiveContainer>
        )}
      </div>
    </GlassCard>
  );
}
