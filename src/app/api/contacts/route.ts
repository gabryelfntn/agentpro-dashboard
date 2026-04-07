import { NextResponse } from "next/server";
import { readDb, updateDb } from "@/lib/db";
import type { Contact } from "@/lib/types";

export async function GET() {
  const db = await readDb();
  const list = [...db.contacts].sort((a, b) => a.nom.localeCompare(b.nom, "fr"));
  return NextResponse.json(list);
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Partial<Contact>;
    const nom = body.nom?.trim();
    if (!nom) {
      return NextResponse.json({ error: "nom requis" }, { status: 400 });
    }
    const row: Contact = {
      id: crypto.randomUUID(),
      nom,
      societe: body.societe?.trim() || undefined,
      email: body.email?.trim() || undefined,
      telephone: body.telephone?.trim() || undefined,
      role: body.role?.trim() || "Contact",
      notes: body.notes?.trim() || undefined,
      createdAt: new Date().toISOString(),
    };
    await updateDb((db) => {
      db.contacts.push(row);
    });
    return NextResponse.json(row, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Requête invalide" }, { status: 400 });
  }
}
