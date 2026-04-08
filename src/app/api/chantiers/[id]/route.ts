import { NextResponse } from "next/server";
import { readDbForUser, updateDbForUser } from "@/lib/db";
import type { ChantierStatut } from "@/lib/types";
import { getAuthenticatedUserId, unauthorizedJson } from "@/lib/auth";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) return unauthorizedJson();
    const body = (await request.json()) as {
      nom?: string;
      client?: string;
      statut?: ChantierStatut;
    };
    let found = false;
    await updateDbForUser(userId, (db) => {
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
    const db = await readDbForUser(userId);
    return NextResponse.json(db.chantiers.find((c) => c.id === id));
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
}
