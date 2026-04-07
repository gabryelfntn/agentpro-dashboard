import { NextResponse } from "next/server";
import { readDb, updateDb } from "@/lib/db";
import type { Devis } from "@/lib/types";

export async function GET() {
  const db = await readDb();
  return NextResponse.json(db.devis);
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      client?: string;
      montantTtc?: number;
      reference?: string;
    };
    const client = body.client?.trim();
    if (!client) {
      return NextResponse.json({ error: "Client requis" }, { status: 400 });
    }
    const montantTtc = Number(body.montantTtc);
    if (!Number.isFinite(montantTtc) || montantTtc <= 0) {
      return NextResponse.json({ error: "Montant invalide" }, { status: 400 });
    }

    let created!: Devis;
    await updateDb((db) => {
      const n = db.devis.length + 200;
      created = {
        id: crypto.randomUUID(),
        reference: body.reference?.trim() || `DEV-2026-${n}`,
        client,
        montantTtc: Math.round(montantTtc * 100) / 100,
        statut: "en_attente",
        createdAt: new Date().toISOString(),
      };
      db.devis.push(created);
    });
    return NextResponse.json(created, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Requête invalide" }, { status: 400 });
  }
}
