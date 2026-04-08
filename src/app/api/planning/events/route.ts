import { NextResponse } from "next/server";
import { readWorkspaceDb, updateWorkspaceDb } from "@/lib/db";
import type { PlanningEvent, PlanningEventType } from "@/lib/types";
import { withAuthz } from "@/lib/authz/withAuthz";

export async function GET() {
  return withAuthz("planning:read", {
    audit: { action: "read", entity: "planning_event" },
    handler: async () => {
      const db = await readWorkspaceDb();
      const events = [...(db?.planningEvents ?? [])].sort(
        (a, b) => new Date(a.debut).getTime() - new Date(b.debut).getTime(),
      );
      return NextResponse.json(events);
    },
  });
}

export async function POST(request: Request) {
  return withAuthz("planning:create", {
    audit: { action: "create", entity: "planning_event" },
    handler: async () => {
      try {
        const body = (await request.json()) as Partial<PlanningEvent>;
        const titre = body.titre?.trim();
        const debut = body.debut;
        const fin = body.fin;
        if (!titre || titre.length > 140 || !debut || !fin) {
          return NextResponse.json({ error: "titre, debut et fin requis" }, { status: 400 });
        }
        if (new Date(debut).getTime() >= new Date(fin).getTime()) {
          return NextResponse.json({ error: "La fin doit être après le début" }, { status: 400 });
        }
        const type = (body.type ?? "autre") as PlanningEventType;
        const chantierId = body.chantierId?.trim() || undefined;
        if (chantierId) {
          const db = await readWorkspaceDb();
          const exists = Boolean(db?.chantiers.some((c) => c.id === chantierId));
          if (!exists) return NextResponse.json({ error: "Chantier introuvable" }, { status: 400 });
        }

        const row: PlanningEvent = {
          id: crypto.randomUUID(),
          titre,
          description: body.description?.trim().slice(0, 2000) || undefined,
          debut,
          fin,
          toutJournee: Boolean(body.toutJournee),
          type,
          chantierId,
          lieu: body.lieu?.trim().slice(0, 120) || undefined,
          rappelMinutes:
            typeof body.rappelMinutes === "number" && body.rappelMinutes > 0
              ? body.rappelMinutes
              : undefined,
          couleur: body.couleur?.trim().slice(0, 40) || undefined,
        };
        await updateWorkspaceDb((db) => {
          db.planningEvents.push(row);
        });
        return NextResponse.json(row, { status: 201 });
      } catch {
        return NextResponse.json({ error: "Requête invalide" }, { status: 400 });
      }
    },
  });
}
