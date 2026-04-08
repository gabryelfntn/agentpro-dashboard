import { NextResponse } from "next/server";
import { readWorkspaceDb, updateWorkspaceDb } from "@/lib/db";
import type { Devis } from "@/lib/types";
import { withAuthz } from "@/lib/authz/withAuthz";

export async function GET() {
  return withAuthz("devis:read", {
    audit: { action: "read", entity: "devis" },
    handler: async () => {
      const db = await readWorkspaceDb();
      return NextResponse.json(db?.devis ?? []);
    },
  });
}

export async function POST(request: Request) {
  return withAuthz("devis:create", {
    audit: { action: "create", entity: "devis" },
    handler: async () => {
      try {
        const body = (await request.json()) as {
          client?: string;
          montantTtc?: number;
          reference?: string;
        };
        const client = body.client?.trim();
        if (!client || client.length > 120) {
          return NextResponse.json({ error: "Client requis" }, { status: 400 });
        }
        const montantTtc = Number(body.montantTtc);
        if (!Number.isFinite(montantTtc) || montantTtc <= 0) {
          return NextResponse.json({ error: "Montant invalide" }, { status: 400 });
        }

        let created!: Devis;
        await updateWorkspaceDb((db) => {
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
    },
  });
}
