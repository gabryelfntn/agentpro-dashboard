"use client";

import { startTransition, useCallback, useEffect, useState } from "react";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { AppShell } from "@/components/layout/AppShell";
import { GlassCard } from "@/components/ui/GlassCard";
import type { Chantier, TaskItem, TaskPriority } from "@/lib/types";
import { notifyDataChanged } from "@/lib/notify";
import { Plus, Trash2 } from "lucide-react";

const prioriteClass: Record<TaskPriority, string> = {
  basse: "bg-slate-500/20 text-slate-300",
  normale: "bg-sky-500/15 text-sky-300",
  haute: "bg-amber-500/15 text-amber-300",
  urgente: "bg-red-500/15 text-red-300",
};

export default function TachesPage() {
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [chantiers, setChantiers] = useState<Chantier[]>([]);
  const [loading, setLoading] = useState(true);
  const [titre, setTitre] = useState("");
  const [description, setDescription] = useState("");
  const [priorite, setPriorite] = useState<TaskPriority>("normale");
  const [echeance, setEcheance] = useState("");
  const [chantierId, setChantierId] = useState("");

  const load = useCallback(async () => {
    const [tr, ch] = await Promise.all([fetch("/api/taches"), fetch("/api/chantiers")]);
    if (tr.ok) setTasks(await tr.json());
    if (ch.ok) setChantiers(await ch.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    startTransition(() => void load());
    const h = () => startTransition(() => void load());
    window.addEventListener("agentpro-data-changed", h);
    return () => window.removeEventListener("agentpro-data-changed", h);
  }, [load]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const r = await fetch("/api/taches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        titre,
        description: description.trim() || undefined,
        priorite,
        echeance: echeance
          ? (() => {
              const [y, m, d] = echeance.split("-").map(Number);
              return new Date(y!, m! - 1, d!, 12, 0, 0).toISOString();
            })()
          : undefined,
        chantierId: chantierId || undefined,
      }),
    });
    if (!r.ok) return;
    setTitre("");
    setDescription("");
    setPriorite("normale");
    setEcheance("");
    setChantierId("");
    await load();
    notifyDataChanged();
  }

  async function toggleFait(t: TaskItem) {
    await fetch(`/api/taches/${t.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fait: !t.fait }),
    });
    await load();
    notifyDataChanged();
  }

  async function patchPriorite(id: string, priorite: TaskPriority) {
    await fetch(`/api/taches/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ priorite }),
    });
    await load();
    notifyDataChanged();
  }

  async function remove(id: string) {
    if (!confirm("Supprimer cette tâche ?")) return;
    await fetch(`/api/taches/${id}`, { method: "DELETE" });
    await load();
    notifyDataChanged();
  }

  return (
    <AppShell title="Tâches" subtitle="Suivi opérationnel lié aux chantiers">
      <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
        <GlassCard className="overflow-hidden">
          <div className="border-b border-white/[0.06] px-5 py-4 sm:px-6">
            <h2 className="text-lg font-semibold text-white">Liste</h2>
            <p className="text-sm text-slate-400">Cochez pour marquer comme fait. Priorité modifiable.</p>
          </div>
          {loading ? (
            <p className="p-6 text-slate-500">Chargement…</p>
          ) : tasks.length === 0 ? (
            <p className="p-6 text-slate-500">Aucune tâche.</p>
          ) : (
            <ul className="divide-y divide-white/[0.05]">
              {tasks.map((t) => (
                <li
                  key={t.id}
                  className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6"
                >
                  <div className="flex min-w-0 flex-1 items-start gap-3">
                    <input
                      type="checkbox"
                      checked={t.fait}
                      onChange={() => void toggleFait(t)}
                      className="mt-1 h-4 w-4 rounded border-white/20"
                    />
                    <div className="min-w-0">
                      <p className={`font-medium ${t.fait ? "text-slate-500 line-through" : "text-white"}`}>
                        {t.titre}
                      </p>
                      {t.description ? (
                        <p className="text-sm text-slate-500">{t.description}</p>
                      ) : null}
                      <div className="mt-1 flex flex-wrap gap-2 text-xs text-slate-500">
                        {t.echeance ? (
                          <span>
                            Échéance :{" "}
                            {format(parseISO(t.echeance), "d MMM yyyy", { locale: fr })}
                          </span>
                        ) : null}
                        {t.chantierId ? (
                          <span>
                            Chantier :{" "}
                            {chantiers.find((c) => c.id === t.chantierId)?.nom ?? t.chantierId}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
                    <select
                      value={t.priorite}
                      onChange={(e) => void patchPriorite(t.id, e.target.value as TaskPriority)}
                      className={`rounded-lg border border-white/[0.08] px-2 py-1 text-xs font-medium outline-none ${prioriteClass[t.priorite]}`}
                    >
                      {(Object.keys(prioriteClass) as TaskPriority[]).map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => void remove(t.id)}
                      className="rounded-lg p-2 text-slate-500 hover:bg-red-500/10 hover:text-red-400"
                      aria-label="Supprimer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </GlassCard>

        <GlassCard className="h-fit p-5 sm:p-6">
          <h2 className="text-lg font-semibold text-white">Nouvelle tâche</h2>
          <form onSubmit={add} className="mt-4 flex flex-col gap-3">
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
              Description
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="rounded-xl border border-white/[0.08] bg-slate-950/50 px-3 py-2 text-sm text-white outline-none"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-slate-400">
              Priorité
              <select
                value={priorite}
                onChange={(e) => setPriorite(e.target.value as TaskPriority)}
                className="rounded-xl border border-white/[0.08] bg-slate-950/50 px-3 py-2 text-sm text-white outline-none"
              >
                {(Object.keys(prioriteClass) as TaskPriority[]).map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs text-slate-400">
              Échéance
              <input
                type="date"
                value={echeance}
                onChange={(e) => setEcheance(e.target.value)}
                className="rounded-xl border border-white/[0.08] bg-slate-950/50 px-3 py-2 text-sm text-white outline-none"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-slate-400">
              Chantier
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
            <button
              type="submit"
              className="mt-2 inline-flex items-center justify-center gap-2 rounded-xl bg-sky-500 px-4 py-2.5 text-sm font-medium text-slate-950 hover:bg-sky-400"
            >
              <Plus className="h-4 w-4" />
              Ajouter
            </button>
          </form>
        </GlassCard>
      </div>
    </AppShell>
  );
}
