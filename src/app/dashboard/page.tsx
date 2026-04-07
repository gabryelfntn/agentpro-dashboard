import { AppShell } from "@/components/layout/AppShell";
import { KpiGrid } from "@/components/dashboard/KpiGrid";
import { RevenueAreaChart } from "@/components/dashboard/RevenueAreaChart";
import { ConversionLineChart } from "@/components/dashboard/ConversionLineChart";

export default function DashboardPage() {
  return (
    <AppShell title="Dashboard" subtitle="Vue d'ensemble de votre activité">
      <div className="flex flex-col gap-8">
        <KpiGrid />
        <div className="grid min-w-0 gap-6 lg:grid-cols-2">
          <RevenueAreaChart />
          <ConversionLineChart />
        </div>
      </div>
    </AppShell>
  );
}
