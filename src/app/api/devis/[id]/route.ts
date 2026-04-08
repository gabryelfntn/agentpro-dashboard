import { NextResponse } from "next/server";
import { readWorkspaceDb, updateWorkspaceDb } from "@/lib/db";
import type { DevisStatut } from "@/lib/types";
import { withAuthz } from "@/lib/authz/withAuthz";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  return withAuthz("devis:update", {
    audit: { action: "update", entity: "devis", entityId: id },
    handler: async (auth) => {
      try {
        const body = (await request.json()) as {
          statut?: DevisStatut;
          montantTtc?: number;
          client?: string;
        };
        if (body.statut !== undefined && auth.role !== "owner") {
          return NextResponse.json({ error: "Seul le patron peut changer le statut" }, { status: 403 });
        }
        let found = false;
        await updateWorkspaceDb((db) => {
          const row = db.devis.find((d) => d.id === id);
          if (!row) return;
          found = true;
          if (body.statut !== undefined) row.statut = body.statut;
          if (body.montantTtc !== undefined) {
            const m = Number(body.montantTtc);
            if (Number.isFinite(m) && m > 0) row.montantTtc = Math.round(m * 100) / 100;
          }
          if (body.client !== undefined) row.client = body.client.trim() || row.client;
        });
        if (!found) {
          return NextResponse.json({ error: "Introuvable" }, { status: 404 });
        }
        const db = await readWorkspaceDb();
        return NextResponse.json(db?.devis.find((d) => d.id === id));
      } catch {
        return NextResponse.json({ error: "Requête invalide" }, { status: 400 });
      }
    },
  });
}

export async function DELETE(_request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  return withAuthz("devis:delete", {
    audit: { action: "delete", entity: "devis", entityId: id },
    handler: async () => {
      let removed = false;
      await updateWorkspaceDb((db) => {
        const i = db.devis.findIndex((d) => d.id === id);
        if (i >= 0) {
          db.devis.splice(i, 1);
          removed = true;
        }
      });
      if (!removed) {
        return NextResponse.json({ error: "Introuvable" }, { status: 404 });
      }
      return NextResponse.json({ ok: true });
    },
  });
}
