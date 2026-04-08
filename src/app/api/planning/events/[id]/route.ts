import { NextResponse } from "next/server";
import { readWorkspaceDb, updateWorkspaceDb } from "@/lib/db";
import type { PlanningEvent, PlanningEventType } from "@/lib/types";
import { withAuthz } from "@/lib/authz/withAuthz";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  return withAuthz("planning:update", {
    audit: { action: "update", entity: "planning_event", entityId: id },
    handler: async () => {
      try {
        const body = (await request.json()) as Partial<PlanningEvent>;
        const dbBefore = await readWorkspaceDb();
        const row = dbBefore?.planningEvents.find((e) => e.id === id);
        if (!row) {
          return NextResponse.json({ error: "Introuvable" }, { status: 404 });
        }

        const debut = body.debut ?? row.debut;
        const fin = body.fin ?? row.fin;
        if (new Date(debut).getTime() >= new Date(fin).getTime()) {
          return NextResponse.json({ error: "La fin doit être après le début" }, { status: 400 });
        }

        const chantierId =
          body.chantierId !== undefined ? body.chantierId?.trim() || undefined : row.chantierId;
        if (chantierId) {
          const exists = Boolean(dbBefore?.chantiers.some((c) => c.id === chantierId));
          if (!exists) return NextResponse.json({ error: "Chantier introuvable" }, { status: 400 });
        }

        await updateWorkspaceDb((db) => {
          const r = db.planningEvents.find((e) => e.id === id);
          if (!r) return;
          if (body.titre !== undefined) r.titre = body.titre.trim().slice(0, 140) || r.titre;
          if (body.description !== undefined) r.description = body.description?.trim().slice(0, 2000) || undefined;
          r.debut = debut;
          r.fin = fin;
          if (body.toutJournee !== undefined) r.toutJournee = Boolean(body.toutJournee);
          if (body.type !== undefined) r.type = body.type as PlanningEventType;
          if (body.chantierId !== undefined) r.chantierId = chantierId;
          if (body.lieu !== undefined) r.lieu = body.lieu?.trim().slice(0, 120) || undefined;
          if (body.rappelMinutes !== undefined) {
            r.rappelMinutes =
              typeof body.rappelMinutes === "number" && body.rappelMinutes > 0
                ? body.rappelMinutes
                : undefined;
          }
          if (body.couleur !== undefined) r.couleur = body.couleur?.trim().slice(0, 40) || undefined;
        });

        const db = await readWorkspaceDb();
        return NextResponse.json(db?.planningEvents.find((e) => e.id === id));
      } catch {
        return NextResponse.json({ error: "Requête invalide" }, { status: 400 });
      }
    },
  });
}

export async function DELETE(_request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  return withAuthz("planning:delete", {
    audit: { action: "delete", entity: "planning_event", entityId: id },
    handler: async () => {
      let removed = false;
      await updateWorkspaceDb((db) => {
        const i = db.planningEvents.findIndex((e) => e.id === id);
        if (i >= 0) {
          db.planningEvents.splice(i, 1);
          removed = true;
        }
      });
      if (!removed) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
      return NextResponse.json({ ok: true });
    },
  });
}
