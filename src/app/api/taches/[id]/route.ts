import { NextResponse } from "next/server";
import { readDbForUser, updateDbForUser } from "@/lib/db";
import type { TaskItem, TaskPriority } from "@/lib/types";
import { getAuthenticatedUserId, unauthorizedJson } from "@/lib/auth";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) return unauthorizedJson();
    const body = (await request.json()) as Partial<TaskItem>;
    let found = false;
    await updateDbForUser(userId, (db) => {
      const row = db.tasks.find((t) => t.id === id);
      if (!row) return;
      found = true;
      if (body.titre !== undefined) row.titre = body.titre.trim() || row.titre;
      if (body.description !== undefined) row.description = body.description?.trim() || undefined;
      if (body.fait !== undefined) row.fait = Boolean(body.fait);
      if (body.echeance !== undefined) row.echeance = body.echeance || undefined;
      if (body.priorite !== undefined) row.priorite = body.priorite as TaskPriority;
      if (body.chantierId !== undefined) row.chantierId = body.chantierId?.trim() || undefined;
      row.updatedAt = new Date().toISOString();
    });
    if (!found) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
    const db = await readDbForUser(userId);
    return NextResponse.json(db.tasks.find((t) => t.id === id));
  } catch {
    return NextResponse.json({ error: "Requête invalide" }, { status: 400 });
  }
}

export async function DELETE(_request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const userId = await getAuthenticatedUserId();
  if (!userId) return unauthorizedJson();
  let removed = false;
  await updateDbForUser(userId, (db) => {
    const i = db.tasks.findIndex((t) => t.id === id);
    if (i >= 0) {
      db.tasks.splice(i, 1);
      removed = true;
    }
  });
  if (!removed) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
