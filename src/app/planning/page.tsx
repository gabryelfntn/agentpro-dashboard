"use client";

import { startTransition, useCallback, useEffect, useMemo, useState } from "react";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  parseISO,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { fr } from "date-fns/locale";
import { AppShell } from "@/components/layout/AppShell";
import { GlassCard } from "@/components/ui/GlassCard";
import type { Chantier, PlanningEvent, PlanningEventType } from "@/lib/types";
import { notifyDataChanged } from "@/lib/notify";
import { ChevronLeft, ChevronRight, Download, Plus, Trash2 } from "lucide-react";
import { fetchAuthMe } from "@/lib/client/authMe";

const types: { value: PlanningEventType; label: string }[] = [
  { value: "visite", label: "Visite" },
  { value: "chantier", label: "Chantier" },
  { value: "livraison", label: "Livraison" },
  { value: "rdv_client", label: "Rendez-vous client" },
  { value: "admin", label: "Administratif" },
  { value: "autre", label: "Autre" },
];

function eventsForDay(events: PlanningEvent[], day: Date) {
  const start = new Date(day);
  start.setHours(0, 0, 0, 0);
  const end = new Date(day);
  end.setHours(23, 59, 59, 999);
  const t0 = start.getTime();
  const t1 = end.getTime();
  return events.filter((e) => {
    const a = parseISO(e.debut).getTime();
    const b = parseISO(e.fin).getTime();
    return a <= t1 && b >= t0;
  });
}

function toLocalInput(iso: string) {
  const d = parseISO(iso);
  return format(d, "yyyy-MM-dd'T'HH:mm");
}

export default function PlanningPage() {
  /** null jusqu’au montage client : évite SSR `new Date()` ≠ navigateur (fuseau / jour) → hydratation. */
  const [cursor, setCursor] = useState<Date | null>(() => {
    if (typeof window === "undefined") return null;
    return startOfMonth(new Date());
  });
  const [events, setEvents] = useState<PlanningEvent[]>([]);
  const [chantiers, setChantiers] = useState<Chantier[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Date | null>(() => {
    if (typeof window === "undefined") return null;
    return new Date();
  });

  const [titre, setTitre] = useState("");
  const [type, setType] = useState<PlanningEventType>("chantier");
  const [debut, setDebut] = useState("");
  const [fin, setFin] = useState("");
  const [toutJournee, setToutJournee] = useState(false);
  const [lieu, setLieu] = useState("");
  const [description, setDescription] = useState("");
  const [chantierId, setChantierId] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isOwner, setIsOwner] = useState<boolean | null>(null);

  const load = useCallback(async () => {
    const [er, cr] = await Promise.all([fetch("/api/planning/events"), fetch("/api/chantiers")]);
    if (er.ok) setEvents(await er.json());
    if (cr.ok) setChantiers(await cr.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    startTransition(() => {
      void load();
    });
    startTransition(() => {
      void (async () => {
        const me = await fetchAuthMe();
        setIsOwner(me?.workspace?.role === "owner");
      })();
    });
    const h = () => {
      startTransition(() => {
        void load();
      });
    };
    window.addEventListener("agentpro-data-changed", h);
    return () => window.removeEventListener("agentpro-data-changed", h);
  }, [load]);

  const monthStart = cursor ? startOfMonth(cursor) : startOfMonth(new Date(0));
  const monthEnd = cursor ? endOfMonth(cursor) : endOfMonth(new Date(0));
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = useMemo(
    () => eachDayOfInterval({ start: gridStart, end: gridEnd }),
    [gridStart, gridEnd],
  );

  const dayEvents = useMemo(
    () => (selected ? eventsForDay(events, selected) : []),
    [events, selected],
  );

  function openEdit(e: PlanningEvent) {
    setEditingId(e.id);
    setTitre(e.titre);
    setType(e.type);
    setDebut(toLocalInput(e.debut));
    setFin(toLocalInput(e.fin));
    setToutJournee(e.toutJournee);
    setLieu(e.lieu ?? "");
    setDescription(e.description ?? "");
    setChantierId(e.chantierId ?? "");
  }

  async function saveEvent(e: React.FormEvent) {
    e.preventDefault();
    const body = {
      titre,
      type,
      debut: new Date(debut).toISOString(),
      fin: new Date(fin).toISOString(),
      toutJournee,
      lieu: lieu.trim() || undefined,
      description: description.trim() || undefined,
      chantierId: chantierId || undefined,
    };
    const url = editingId ? `/api/planning/events/${editingId}` : "/api/planning/events";
    const r = await fetch(url, {
      method: editingId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!r.ok) return;
    await load();
    notifyDataChanged();
    setEditingId(null);
  }

  async function removeEvent(id: string) {
    if (!confirm("Supprimer cet événement ?")) return;
    await fetch(`/api/planning/events/${id}`, { method: "DELETE" });
    await load();
    notifyDataChanged();
  }

  useEffect(() => {
    if (editingId) return;
    if (!selected) return;
    startTransition(() => {
      setTitre("");
      setType("chantier");
      const base = new Date(selected);
      base.setHours(9, 0, 0, 0);
      const endH = new Date(base);
      endH.setHours(10, 0, 0, 0);
      setDebut(format(base, "yyyy-MM-dd'T'HH:mm"));
      setFin(format(endH, "yyyy-MM-dd'T'HH:mm"));
      setToutJournee(false);
      setLieu("");
      setDescription("");
      setChantierId("");
    });
  }, [selected, editingId]);

  if (!cursor || !selected) {
    return (
      <AppShell
        title="Planning"
        subtitle="Calendrier des interventions, livraisons et rendez-vous"
      >
        <div className="flex flex-col gap-6 xl:flex-row">
          <GlassCard className="flex-1 min-h-[520px] animate-pulse bg-slate-800/30 p-4 sm:p-6" />
          <div className="flex w-full flex-col gap-6 xl:w-[420px] xl:shrink-0">
            <GlassCard className="h-48 animate-pulse bg-slate-800/30" />
            <GlassCard className="min-h-[280px] animate-pulse bg-slate-800/30" />
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell
      title="Planning"
      subtitle="Calendrier des interventions, livraisons et rendez-vous"
    >
      <div className="flex flex-col gap-6 xl:flex-row">
        <GlassCard className="flex-1 overflow-hidden p-4 sm:p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold capitalize text-white">
              {format(cursor, "MMMM yyyy", { locale: fr })}
            </h2>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCursor((c) => (c ? addMonths(c, -1) : c))}
                className="rounded-lg border border-white/[0.1] p-2 text-slate-300 hover:bg-white/[0.06]"
                aria-label="Mois précédent"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={() => setCursor(startOfMonth(new Date()))}
                className="rounded-lg border border-white/[0.1] px-3 py-1.5 text-xs font-medium text-sky-300 hover:bg-white/[0.06]"
              >
                Aujourd&apos;hui
              </button>
              <button
                type="button"
                onClick={() => setCursor((c) => (c ? addMonths(c, 1) : c))}
                className="rounded-lg border border-white/[0.1] p-2 text-slate-300 hover:bg-white/[0.06]"
                aria-label="Mois suivant"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-slate-500">
            {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map((d) => (
              <div key={d} className="py-2">
                {d}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {days.map((day) => {
              const inMonth = isSameMonth(day, cursor);
              const sel = isSameDay(day, selected);
              const list = eventsForDay(events, day);
              return (
                <button
                  key={day.toISOString()}
                  type="button"
                  onClick={() => setSelected(day)}
                  className={[
                    "relative min-h-[72px] rounded-xl border p-1 text-left text-sm transition",
                    inMonth ? "border-white/[0.06] bg-slate-950/30 text-slate-200" : "border-transparent text-slate-600",
                    sel ? "ring-2 ring-sky-500/50" : "hover:border-white/[0.12]",
                  ].join(" ")}
                >
                  <span className="block px-1 font-medium">{format(day, "d")}</span>
                  <div className="mt-1 flex flex-wrap gap-0.5 px-0.5">
                    {list.slice(0, 3).map((ev) => (
                      <span
                        key={ev.id}
                        className="block h-1.5 w-1.5 rounded-full bg-sky-400/90"
                        title={ev.titre}
                      />
                    ))}
                    {list.length > 3 ? (
                      <span className="text-[9px] text-slate-500">+{list.length - 3}</span>
                    ) : null}
                  </div>
                </button>
              );
            })}
          </div>
        </GlassCard>

        <div className="flex w-full flex-col gap-6 xl:w-[420px] xl:shrink-0">
          <GlassCard className="p-5 sm:p-6">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-lg font-semibold text-white capitalize">
                {format(selected, "EEEE d MMMM", { locale: fr })}
              </h2>
              <a
                href="/api/planning/export"
                download
                aria-disabled={isOwner === false}
                className={[
                  "inline-flex items-center gap-1 rounded-lg border border-white/[0.1] px-2 py-1.5 text-xs text-slate-300",
                  isOwner === false ? "pointer-events-none opacity-40" : "hover:bg-white/[0.06]",
                ].join(" ")}
              >
                <Download className="h-3.5 w-3.5" />
                .ics
              </a>
            </div>
            {loading ? (
              <p className="mt-4 text-sm text-slate-500">Chargement…</p>
            ) : dayEvents.length === 0 ? (
              <p className="mt-4 text-sm text-slate-500">Aucun événement ce jour.</p>
            ) : (
              <ul className="mt-4 space-y-2">
                {dayEvents.map((ev) => (
                  <li
                    key={ev.id}
                    className="flex items-start justify-between gap-2 rounded-xl border border-white/[0.06] bg-slate-950/40 p-3"
                  >
                    <button
                      type="button"
                      onClick={() => openEdit(ev)}
                      className="min-w-0 flex-1 text-left"
                    >
                      <p className="font-medium text-white">{ev.titre}</p>
                      <p className="text-xs text-slate-400">
                        {format(parseISO(ev.debut), "HH:mm")} – {format(parseISO(ev.fin), "HH:mm")}{" "}
                        · {types.find((t) => t.value === ev.type)?.label}
                      </p>
                    </button>
                    <button
                      type="button"
                      onClick={() => void removeEvent(ev.id)}
                      className="shrink-0 rounded-lg p-2 text-slate-500 hover:bg-red-500/10 hover:text-red-400"
                      aria-label="Supprimer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </GlassCard>

          <GlassCard className="p-5 sm:p-6">
            <h2 className="text-lg font-semibold text-white">
              {editingId ? "Modifier l’événement" : "Nouvel événement"}
            </h2>
            <form onSubmit={saveEvent} className="mt-4 flex flex-col gap-3">
              <label className="flex flex-col gap-1 text-xs text-slate-400">
                Titre
                <input
                  value={titre}
                  onChange={(e) => setTitre(e.target.value)}
                  required
                  className="rounded-xl border border-white/[0.08] bg-slate-950/50 px-3 py-2 text-sm text-white outline-none ring-sky-500/40 focus:ring-2"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs text-slate-400">
                Type
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as PlanningEventType)}
                  className="rounded-xl border border-white/[0.08] bg-slate-950/50 px-3 py-2 text-sm text-white outline-none"
                >
                  {types.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex items-center gap-2 text-xs text-slate-400">
                <input
                  type="checkbox"
                  checked={toutJournee}
                  onChange={(e) => setToutJournee(e.target.checked)}
                  className="rounded border-white/20"
                />
                Toute la journée
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="flex flex-col gap-1 text-xs text-slate-400">
                  Début
                  <input
                    type="datetime-local"
                    value={debut}
                    onChange={(e) => setDebut(e.target.value)}
                    required
                    className="rounded-xl border border-white/[0.08] bg-slate-950/50 px-3 py-2 text-sm text-white outline-none"
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs text-slate-400">
                  Fin
                  <input
                    type="datetime-local"
                    value={fin}
                    onChange={(e) => setFin(e.target.value)}
                    required
                    className="rounded-xl border border-white/[0.08] bg-slate-950/50 px-3 py-2 text-sm text-white outline-none"
                  />
                </label>
              </div>
              <label className="flex flex-col gap-1 text-xs text-slate-400">
                Chantier lié (optionnel)
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
              <label className="flex flex-col gap-1 text-xs text-slate-400">
                Lieu
                <input
                  value={lieu}
                  onChange={(e) => setLieu(e.target.value)}
                  className="rounded-xl border border-white/[0.08] bg-slate-950/50 px-3 py-2 text-sm text-white outline-none"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs text-slate-400">
                Description
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  className="rounded-xl border border-white/[0.08] bg-slate-950/50 px-3 py-2 text-sm text-white outline-none"
                />
              </label>
              <div className="flex flex-wrap gap-2 pt-2">
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 rounded-xl bg-sky-500 px-4 py-2.5 text-sm font-medium text-slate-950 hover:bg-sky-400"
                >
                  <Plus className="h-4 w-4" />
                  {editingId ? "Enregistrer" : "Ajouter"}
                </button>
                {editingId ? (
                  <button
                    type="button"
                    onClick={() => setEditingId(null)}
                    className="rounded-xl border border-white/[0.1] px-4 py-2.5 text-sm text-slate-300 hover:bg-white/[0.06]"
                  >
                    Annuler
                  </button>
                ) : null}
              </div>
            </form>
          </GlassCard>
        </div>
      </div>
    </AppShell>
  );
}
