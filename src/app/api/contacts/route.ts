import { NextResponse } from "next/server";
import { readDbForUser, updateDbForUser } from "@/lib/db";
import type { Contact } from "@/lib/types";
import { getAuthenticatedUserId, unauthorizedJson } from "@/lib/auth";

export async function GET() {
  const userId = await getAuthenticatedUserId();
  if (!userId) return unauthorizedJson();
  const db = await readDbForUser(userId);
  const list = [...db.contacts].sort((a, b) => a.nom.localeCompare(b.nom, "fr"));
  return NextResponse.json(list);
}

export async function POST(request: Request) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) return unauthorizedJson();
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
    await updateDbForUser(userId, (db) => {
      db.contacts.push(row);
    });
    return NextResponse.json(row, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Requête invalide" }, { status: 400 });
  }
}
