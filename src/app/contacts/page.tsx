"use client";

import { startTransition, useCallback, useEffect, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { GlassCard } from "@/components/ui/GlassCard";
import type { Contact } from "@/lib/types";
import { Mail, Phone, Plus, Trash2, User } from "lucide-react";

export default function ContactsPage() {
  const [rows, setRows] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [nom, setNom] = useState("");
  const [societe, setSociete] = useState("");
  const [email, setEmail] = useState("");
  const [telephone, setTelephone] = useState("");
  const [role, setRole] = useState("Contact");
  const [notes, setNotes] = useState("");
  const [editing, setEditing] = useState<Contact | null>(null);

  const load = useCallback(async () => {
    const r = await fetch("/api/contacts");
    if (r.ok) setRows(await r.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    startTransition(() => void load());
  }, [load]);

  function startEdit(c: Contact) {
    setEditing(c);
    setNom(c.nom);
    setSociete(c.societe ?? "");
    setEmail(c.email ?? "");
    setTelephone(c.telephone ?? "");
    setRole(c.role);
    setNotes(c.notes ?? "");
  }

  function clearForm() {
    setEditing(null);
    setNom("");
    setSociete("");
    setEmail("");
    setTelephone("");
    setRole("Contact");
    setNotes("");
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const body = {
      nom,
      societe: societe.trim() || undefined,
      email: email.trim() || undefined,
      telephone: telephone.trim() || undefined,
      role: role.trim() || "Contact",
      notes: notes.trim() || undefined,
    };
    const url = editing ? `/api/contacts/${editing.id}` : "/api/contacts";
    const r = await fetch(url, {
      method: editing ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!r.ok) return;
    clearForm();
    await load();
  }

  async function remove(id: string) {
    if (!confirm("Supprimer ce contact ?")) return;
    await fetch(`/api/contacts/${id}`, { method: "DELETE" });
    await load();
    if (editing?.id === id) clearForm();
  }

  return (
    <AppShell title="Contacts" subtitle="Interlocuteurs clients et partenaires">
      <div className="grid gap-8 lg:grid-cols-[1fr_400px]">
        <GlassCard className="overflow-hidden">
          <div className="border-b border-white/[0.06] px-5 py-4 sm:px-6">
            <h2 className="text-lg font-semibold text-white">Annuaire</h2>
          </div>
          {loading ? (
            <p className="p-6 text-slate-500">Chargement…</p>
          ) : rows.length === 0 ? (
            <p className="p-6 text-slate-500">Aucun contact.</p>
          ) : (
            <ul className="divide-y divide-white/[0.05]">
              {rows.map((c) => (
                <li
                  key={c.id}
                  className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6"
                >
                  <button
                    type="button"
                    onClick={() => startEdit(c)}
                    className="min-w-0 flex-1 text-left"
                  >
                    <p className="flex items-center gap-2 font-medium text-white">
                      <User className="h-4 w-4 shrink-0 text-slate-500" />
                      {c.nom}
                    </p>
                    {c.societe ? <p className="text-sm text-slate-400">{c.societe}</p> : null}
                    <p className="text-xs text-sky-400/80">{c.role}</p>
                    <div className="mt-1 flex flex-wrap gap-3 text-xs text-slate-500">
                      {c.email ? (
                        <span className="inline-flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {c.email}
                        </span>
                      ) : null}
                      {c.telephone ? (
                        <span className="inline-flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {c.telephone}
                        </span>
                      ) : null}
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => void remove(c.id)}
                    className="self-end rounded-lg p-2 text-slate-500 hover:bg-red-500/10 hover:text-red-400 sm:self-center"
                    aria-label="Supprimer"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </GlassCard>

        <GlassCard className="h-fit p-5 sm:p-6">
          <h2 className="text-lg font-semibold text-white">{editing ? "Modifier" : "Nouveau contact"}</h2>
          <form onSubmit={save} className="mt-4 flex flex-col gap-3">
            <label className="flex flex-col gap-1 text-xs text-slate-400">
              Nom
              <input
                value={nom}
                onChange={(e) => setNom(e.target.value)}
                required
                className="rounded-xl border border-white/[0.08] bg-slate-950/50 px-3 py-2 text-sm text-white outline-none"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-slate-400">
              Société
              <input
                value={societe}
                onChange={(e) => setSociete(e.target.value)}
                className="rounded-xl border border-white/[0.08] bg-slate-950/50 px-3 py-2 text-sm text-white outline-none"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-slate-400">
              Rôle
              <input
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="rounded-xl border border-white/[0.08] bg-slate-950/50 px-3 py-2 text-sm text-white outline-none"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-slate-400">
              E-mail
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="rounded-xl border border-white/[0.08] bg-slate-950/50 px-3 py-2 text-sm text-white outline-none"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-slate-400">
              Téléphone
              <input
                value={telephone}
                onChange={(e) => setTelephone(e.target.value)}
                className="rounded-xl border border-white/[0.08] bg-slate-950/50 px-3 py-2 text-sm text-white outline-none"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-slate-400">
              Notes
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="rounded-xl border border-white/[0.08] bg-slate-950/50 px-3 py-2 text-sm text-white outline-none"
              />
            </label>
            <div className="flex flex-wrap gap-2 pt-2">
              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-xl bg-sky-500 px-4 py-2.5 text-sm font-medium text-slate-950 hover:bg-sky-400"
              >
                <Plus className="h-4 w-4" />
                Enregistrer
              </button>
              {editing ? (
                <button
                  type="button"
                  onClick={clearForm}
                  className="rounded-xl border border-white/[0.1] px-4 py-2.5 text-sm text-slate-300 hover:bg-white/[0.06]"
                >
                  Annuler
                </button>
              ) : null}
            </div>
          </form>
        </GlassCard>
      </div>
    </AppShell>
  );
}
