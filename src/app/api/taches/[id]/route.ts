import { NextResponse } from "next/server";
import { readWorkspaceDb, updateWorkspaceDb } from "@/lib/db";
import type { TaskItem, TaskPriority } from "@/lib/types";
import { withAuthz } from "@/lib/authz/withAuthz";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  return withAuthz("tasks:update", {
    audit: { action: "update", entity: "task", entityId: id },
    handler: async () => {
      try {
        const body = (await request.json()) as Partial<TaskItem>;
        const chantierId =
          body.chantierId !== undefined ? body.chantierId?.trim() || undefined : undefined;
        if (chantierId) {
          const db = await readWorkspaceDb();
          const exists = Boolean(db?.chantiers.some((c) => c.id === chantierId));
          if (!exists) return NextResponse.json({ error: "Chantier introuvable" }, { status: 400 });
        }
        let found = false;
        await updateWorkspaceDb((db) => {
          const row = db.tasks.find((t) => t.id === id);
          if (!row) return;
          found = true;
          if (body.titre !== undefined) row.titre = body.titre.trim().slice(0, 160) || row.titre;
          if (body.description !== undefined) row.description = body.description?.trim().slice(0, 2000) || undefined;
          if (body.fait !== undefined) row.fait = Boolean(body.fait);
          if (body.echeance !== undefined) row.echeance = body.echeance || undefined;
          if (body.priorite !== undefined) row.priorite = body.priorite as TaskPriority;
          if (body.chantierId !== undefined) row.chantierId = chantierId;
          row.updatedAt = new Date().toISOString();
        });
        if (!found) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
        const db = await readWorkspaceDb();
        return NextResponse.json(db?.tasks.find((t) => t.id === id));
      } catch {
        return NextResponse.json({ error: "Requête invalide" }, { status: 400 });
      }
    },
  });
}

export async function DELETE(_request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  return withAuthz("tasks:delete", {
    audit: { action: "delete", entity: "task", entityId: id },
    handler: async () => {
      let removed = false;
      await updateWorkspaceDb((db) => {
        const i = db.tasks.findIndex((t) => t.id === id);
        if (i >= 0) {
          db.tasks.splice(i, 1);
          removed = true;
        }
      });
      if (!removed) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
      return NextResponse.json({ ok: true });
    },
  });
}
