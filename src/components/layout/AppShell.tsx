"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  CalendarDays,
  CheckSquare,
  FileSpreadsheet,
  FolderOpen,
  LayoutDashboard,
  Menu,
  Settings,
  Sparkles,
  Users,
  X,
  HardHat,
  FileSignature,
} from "lucide-react";
import { startTransition, useCallback, useEffect, useState } from "react";

const navGroups = [
  {
    label: "Pilotage",
    items: [
      { href: "/dashboard", label: "Tableau de bord", icon: LayoutDashboard },
      { href: "/rapports", label: "Rapports", icon: FileSpreadsheet },
    ],
  },
  {
    label: "Chantier",
    items: [
      { href: "/chantiers", label: "Chantiers", icon: HardHat },
      { href: "/devis", label: "Devis", icon: FileSignature },
    ],
  },
  {
    label: "Opérations",
    items: [
      { href: "/planning", label: "Planning", icon: CalendarDays },
      { href: "/taches", label: "Tâches", icon: CheckSquare },
    ],
  },
  {
    label: "Relations",
    items: [{ href: "/contacts", label: "Contacts", icon: Users }],
  },
  {
    label: "IA & fichiers",
    items: [
      { href: "/visions-terrain", label: "Visions terrain IA", icon: Sparkles },
      { href: "/medias", label: "Médias", icon: FolderOpen },
    ],
  },
  {
    label: "Système",
    items: [{ href: "/parametres", label: "Paramètres", icon: Settings }],
  },
] as const;

export function AppShell({
  children,
  title,
  subtitle,
}: {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [displayName, setDisplayName] = useState("…");

  const loadProfile = useCallback(async () => {
    const r = await fetch("/api/profile");
    if (!r.ok) return;
    const p = (await r.json()) as { displayName: string };
    setDisplayName(p.displayName);
  }, []);

  useEffect(() => {
    startTransition(() => {
      void loadProfile();
    });
    const h = () => {
      startTransition(() => {
        void loadProfile();
      });
    };
    window.addEventListener("agentpro-profile-changed", h);
    return () => window.removeEventListener("agentpro-profile-changed", h);
  }, [loadProfile]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        setCollapsed(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    startTransition(() => {
      setOpen(false);
    });
  }, [pathname]);

  return (
    <div className="relative min-h-full">
      <div
        className={[
          "fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity lg:pointer-events-none lg:opacity-0",
          open ? "opacity-100 pointer-events-auto" : "pointer-events-none opacity-0",
        ].join(" ")}
        aria-hidden={!open}
        onClick={() => setOpen(false)}
      />

      <aside
        className={[
          "fixed left-0 top-0 z-50 flex h-full w-[min(100%,280px)] flex-col border-r border-white/[0.06] bg-slate-950/80 px-4 py-6 backdrop-blur-2xl transition-[transform,width,padding] duration-300 lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
          collapsed ? "lg:w-20 lg:px-2" : "lg:w-[280px]",
        ].join(" ")}
      >
        <div
          className={[
            "mb-8 flex items-center gap-2 px-2",
            collapsed ? "lg:flex-col lg:gap-3" : "",
          ].join(" ")}
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-500/20 text-sky-400">
            <BarChart3 className="h-5 w-5" />
          </div>
          <div className={collapsed ? "lg:hidden" : ""}>
            <p className="text-sm font-semibold tracking-tight text-white">AgentPro</p>
            <p className="text-xs text-slate-500">Pilotage activité</p>
          </div>
        </div>
        <nav className="flex flex-1 flex-col gap-4 overflow-y-auto pr-1">
          {navGroups.map((group) => (
            <div key={group.label}>
              <p
                className={[
                  "mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-wider text-slate-600",
                  collapsed ? "lg:hidden" : "",
                ].join(" ")}
              >
                {group.label}
              </p>
              <div className="flex flex-col gap-0.5">
                {group.items.map(({ href, label, icon: Icon }) => {
                  const active = pathname === href || pathname.startsWith(`${href}/`);
                  return (
                    <Link
                      key={href}
                      href={href}
                      title={label}
                      className={[
                        "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
                        collapsed ? "lg:justify-center lg:px-2" : "",
                        active
                          ? "bg-sky-500/15 text-sky-300"
                          : "text-slate-400 hover:bg-white/[0.04] hover:text-slate-200",
                      ].join(" ")}
                    >
                      <Icon className="h-5 w-5 shrink-0 opacity-90" strokeWidth={1.5} />
                      <span className={collapsed ? "lg:sr-only" : ""}>{label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
        <p className={`mt-auto px-2 text-xs text-slate-600 ${collapsed ? "lg:hidden" : ""}`}>
          Données : en local <code className="text-slate-500">data/db.json</code> ; en prod : Postgres (
          <code className="text-slate-500">DATABASE_URL</code>, ex. Neon). Fichiers :{" "}
          <code className="text-slate-500">data/uploads/</code> ou Blob (
          <code className="text-slate-500">BLOB_READ_WRITE_TOKEN</code>).
        </p>
      </aside>

      <div
        className={[
          "transition-[padding] duration-300",
          collapsed ? "lg:pl-20" : "lg:pl-[280px]",
        ].join(" ")}
      >
        <header className="sticky top-0 z-30 border-b border-white/[0.06] bg-slate-950/40 px-4 py-4 backdrop-blur-xl sm:px-8">
          <div className="mx-auto flex max-w-7xl items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.04] text-white transition hover:bg-white/[0.08] lg:hidden"
                aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
              >
                {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
              <button
                type="button"
                onClick={() => setCollapsed((v) => !v)}
                className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.04] text-white transition hover:bg-white/[0.08] lg:flex"
                aria-label={collapsed ? "Agrandir le menu" : "Réduire le menu"}
              >
                <Menu className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">{title}</h1>
                {subtitle ? <p className="mt-0.5 text-sm text-slate-400">{subtitle}</p> : null}
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.04] py-1 pl-1 pr-4 backdrop-blur-md">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 text-xs font-bold text-white">
                {displayName
                  .split(/\s+/)
                  .map((w) => w[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase() || "?"}
              </span>
              <span className="hidden text-sm font-medium text-slate-200 sm:inline">{displayName}</span>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-[88rem] px-4 py-8 sm:px-8">{children}</main>
      </div>
    </div>
  );
}
