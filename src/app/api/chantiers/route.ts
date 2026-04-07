import { NextResponse } from "next/server";
import { readDb, updateDb } from "@/lib/db";
import type { Chantier, ChantierStatut } from "@/lib/types";

export async function GET() {
  const db = await readDb();
  return NextResponse.json(db.chantiers);
}

export async function POST(request: Request) {
  try {
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
    await updateDb((db) => {
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
