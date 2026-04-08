import { NextResponse } from "next/server";
import { readWorkspaceDb, updateWorkspaceDb } from "@/lib/db";
import type { Chantier, ChantierStatut } from "@/lib/types";
import { withAuthz } from "@/lib/authz/withAuthz";

export async function GET() {
  return withAuthz("chantiers:read", {
    audit: { action: "read", entity: "chantier" },
    handler: async () => {
      const db = await readWorkspaceDb();
      return NextResponse.json(db?.chantiers ?? []);
    },
  });
}

export async function POST(request: Request) {
  return withAuthz("chantiers:create", {
    audit: { action: "create", entity: "chantier" },
    handler: async () => {
      try {
        const body = (await request.json()) as {
          nom?: string;
          client?: string;
          statut?: ChantierStatut;
        };
        const nom = body.nom?.trim();
        if (!nom || nom.length > 140) {
          return NextResponse.json({ error: "Nom requis" }, { status: 400 });
        }
        const statut = body.statut ?? "en_cours";
        const client = body.client?.trim() || "Client à préciser";

        let created!: Chantier;
        await updateWorkspaceDb((db) => {
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
    },
  });
}
