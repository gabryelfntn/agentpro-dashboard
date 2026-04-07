import { NextResponse } from "next/server";
import { readDb, updateDb } from "@/lib/db";
import type { DevisStatut } from "@/lib/types";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  try {
    const body = (await request.json()) as {
      statut?: DevisStatut;
      montantTtc?: number;
      client?: string;
    };
    let found = false;
    await updateDb((db) => {
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
    const db = await readDb();
    return NextResponse.json(db.devis.find((d) => d.id === id));
  } catch {
    return NextResponse.json({ error: "Requête invalide" }, { status: 400 });
  }
}

export async function DELETE(_request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  let removed = false;
  await updateDb((db) => {
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
}
