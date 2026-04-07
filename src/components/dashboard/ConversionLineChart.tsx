"use client";

import { startTransition, useCallback, useEffect, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ChartPoint, DashboardPayload } from "@/lib/types";
import { GlassCard } from "@/components/ui/GlassCard";

export function ConversionLineChart() {
  const [data, setData] = useState<ChartPoint[]>([]);
  const [mounted, setMounted] = useState(false);

  const load = useCallback(async () => {
    const r = await fetch("/api/dashboard");
    if (!r.ok) return;
    const payload = (await r.json()) as DashboardPayload;
    setData(payload.conversion);
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
      <h2 className="text-lg font-semibold text-white">Taux de Conversion</h2>
      <p className="text-sm text-slate-400">Tendance hebdomadaire (indicateur de pilotage)</p>
      <div className="mt-4 h-[280px] w-full min-h-[240px] min-w-0">
        {!mounted ? (
          <div className="h-full min-h-[240px] rounded-lg bg-slate-800/40" aria-hidden />
        ) : (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.12)" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fill: "#94a3b8", fontSize: 12 }}
              axisLine={{ stroke: "rgba(148,163,184,0.2)" }}
              tickLine={false}
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fill: "#94a3b8", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `${v}%`}
              width={40}
            />
            <Tooltip
              contentStyle={{
                background: "rgba(15,23,42,0.92)",
                border: "1px solid rgba(148,163,184,0.2)",
                borderRadius: 12,
                color: "#f8fafc",
              }}
              formatter={(value) => [`${value ?? 0}%`, "Conversion"]}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke="#7dd3fc"
              strokeWidth={2.5}
              dot={{ r: 4, fill: "#38bdf8", stroke: "#0c4a6e", strokeWidth: 1.5 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
        )}
      </div>
    </GlassCard>
  );
}
