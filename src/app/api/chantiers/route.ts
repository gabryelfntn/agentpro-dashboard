import { NextResponse } from "next/server";
import { readDbForUser, updateDbForUser } from "@/lib/db";
import type { Chantier, ChantierStatut } from "@/lib/types";
import { getAuthenticatedUserId, unauthorizedJson } from "@/lib/auth";

export async function GET() {
  const userId = await getAuthenticatedUserId();
  if (!userId) return unauthorizedJson();
  const db = await readDbForUser(userId);
  return NextResponse.json(db.chantiers);
}

export async function POST(request: Request) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) return unauthorizedJson();
    const body = (await request.json()) as {
      nom?: string;
      client?: string;
      statut?: ChantierStatut;
    };
    const nom = body.nom?.trim();
    if (!nom) {
      return NextResponse.json({ error: "Nom requis" }, { status: 400 });
    }
    const statut = body.statut ?? "en_cours";
    const client = body.client?.trim() || "Client à préciser";

    let created!: Chantier;
    await updateDbForUser(userId, (db) => {
      created = {
        id: crypto.randomUUID(),
        nom,
        client,
        statut,
        updatedAt: new Date().toISOString(),
      };
      db.chantiers.push(created);
    });
    return NextResponse.json(created, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Requête invalide" }, { status: 400 });
  }
}
