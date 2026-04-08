import { NextResponse } from "next/server";
import { readWorkspaceDb, updateWorkspaceDb } from "@/lib/db";
import type { Contact } from "@/lib/types";
import { withAuthz } from "@/lib/authz/withAuthz";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  return withAuthz("contacts:update", {
    audit: { action: "update", entity: "contact", entityId: id },
    handler: async () => {
      try {
        const body = (await request.json()) as Partial<Contact>;
        let found = false;
        await updateWorkspaceDb((db) => {
          const row = db.contacts.find((c) => c.id === id);
          if (!row) return;
          found = true;
          if (body.nom !== undefined) row.nom = body.nom.trim().slice(0, 120) || row.nom;
          if (body.societe !== undefined) row.societe = body.societe?.trim().slice(0, 120) || undefined;
          if (body.email !== undefined) row.email = body.email?.trim().slice(0, 160) || undefined;
          if (body.telephone !== undefined) row.telephone = body.telephone?.trim().slice(0, 40) || undefined;
          if (body.role !== undefined) row.role = body.role?.trim().slice(0, 80) || row.role;
          if (body.notes !== undefined) row.notes = body.notes?.trim().slice(0, 2000) || undefined;
        });
        if (!found) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
        const db = await readWorkspaceDb();
        return NextResponse.json(db?.contacts.find((c) => c.id === id));
      } catch {
        return NextResponse.json({ error: "Requête invalide" }, { status: 400 });
      }
    },
  });
}

export async function DELETE(_request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  return withAuthz("contacts:delete", {
    audit: { action: "delete", entity: "contact", entityId: id },
    handler: async () => {
      let removed = false;
      await updateWorkspaceDb((db) => {
        const i = db.contacts.findIndex((c) => c.id === id);
        if (i >= 0) {
          db.contacts.splice(i, 1);
          removed = true;
        }
      });
      if (!removed) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
      return NextResponse.json({ ok: true });
    },
  });
}
