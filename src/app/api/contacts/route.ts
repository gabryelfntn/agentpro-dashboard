import { NextResponse } from "next/server";
import { readWorkspaceDb, updateWorkspaceDb } from "@/lib/db";
import type { Contact } from "@/lib/types";
import { withAuthz } from "@/lib/authz/withAuthz";

export async function GET() {
  return withAuthz("contacts:read", {
    audit: { action: "read", entity: "contact" },
    handler: async () => {
      const db = await readWorkspaceDb();
      const list = [...(db?.contacts ?? [])].sort((a, b) => a.nom.localeCompare(b.nom, "fr"));
      return NextResponse.json(list);
    },
  });
}

export async function POST(request: Request) {
  return withAuthz("contacts:create", {
    audit: { action: "create", entity: "contact" },
    handler: async () => {
      try {
        const body = (await request.json()) as Partial<Contact>;
        const nom = body.nom?.trim();
        if (!nom || nom.length > 120) {
          return NextResponse.json({ error: "nom requis" }, { status: 400 });
        }
        const row: Contact = {
          id: crypto.randomUUID(),
          nom,
          societe: body.societe?.trim().slice(0, 120) || undefined,
          email: body.email?.trim().slice(0, 160) || undefined,
          telephone: body.telephone?.trim().slice(0, 40) || undefined,
          role: body.role?.trim().slice(0, 80) || "Contact",
          notes: body.notes?.trim().slice(0, 2000) || undefined,
          createdAt: new Date().toISOString(),
        };
        await updateWorkspaceDb((db) => {
          db.contacts.push(row);
        });
        return NextResponse.json(row, { status: 201 });
      } catch {
        return NextResponse.json({ error: "Requête invalide" }, { status: 400 });
      }
    },
  });
}
