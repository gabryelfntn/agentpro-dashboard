import { NextResponse } from "next/server";
import { readWorkspaceDb, updateWorkspaceDb } from "@/lib/db";
import type { ChantierStatut } from "@/lib/types";
import { withAuthz } from "@/lib/authz/withAuthz";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  return withAuthz("chantiers:update", {
    audit: { action: "update", entity: "chantier", entityId: id },
    handler: async () => {
      try {
        const body = (await request.json()) as {
          nom?: string;
          client?: string;
          statut?: ChantierStatut;
        };
        let found = false;
        await updateWorkspaceDb((db) => {
          const row = db.chantiers.find((c) => c.id === id);
          if (!row) return;
          found = true;
          if (body.nom !== undefined) row.nom = body.nom.trim() || row.nom;
          if (body.client !== undefined) row.client = body.client.trim() || row.client;
          if (body.statut !== undefined) row.statut = body.statut;
          row.updatedAt = new Date().toISOString();
        });
        if (!found) {
          return NextResponse.json({ error: "Introuvable" }, { status: 404 });
        }
        const db = await readWorkspaceDb();
        return NextResponse.json(db?.chantiers.find((c) => c.id === id));
      } catch {
        return NextResponse.json({ error: "Requête invalide" }, { status: 400 });
      }
    },
  });
}

export async function DELETE(_request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  return withAuthz("chantiers:delete", {
    audit: { action: "delete", entity: "chantier", entityId: id },
    handler: async () => {
      let removed = false;
      await updateWorkspaceDb((db) => {
        const i = db.chantiers.findIndex((c) => c.id === id);
        if (i >= 0) {
          db.chantiers.splice(i, 1);
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
