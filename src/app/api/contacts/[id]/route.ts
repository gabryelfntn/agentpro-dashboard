import { NextResponse } from "next/server";
import { readDbForUser, updateDbForUser } from "@/lib/db";
import type { Contact } from "@/lib/types";
import { getAuthenticatedUserId, unauthorizedJson } from "@/lib/auth";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) return unauthorizedJson();
    const body = (await request.json()) as Partial<Contact>;
    let found = false;
    await updateDbForUser(userId, (db) => {
      const row = db.contacts.find((c) => c.id === id);
      if (!row) return;
      found = true;
      if (body.nom !== undefined) row.nom = body.nom.trim() || row.nom;
      if (body.societe !== undefined) row.societe = body.societe?.trim() || undefined;
      if (body.email !== undefined) row.email = body.email?.trim() || undefined;
      if (body.telephone !== undefined) row.telephone = body.telephone?.trim() || undefined;
      if (body.role !== undefined) row.role = body.role?.trim() || row.role;
      if (body.notes !== undefined) row.notes = body.notes?.trim() || undefined;
    });
    if (!found) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
    const db = await readDbForUser(userId);
    return NextResponse.json(db.contacts.find((c) => c.id === id));
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
    const i = db.contacts.findIndex((c) => c.id === id);
    if (i >= 0) {
      db.contacts.splice(i, 1);
      removed = true;
    }
  });
  if (!removed) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
