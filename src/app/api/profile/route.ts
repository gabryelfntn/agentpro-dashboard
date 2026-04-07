import { NextResponse } from "next/server";
import { readDb, updateDb } from "@/lib/db";

export async function GET() {
  const db = await readDb();
  return NextResponse.json(db.profile);
}

export async function PATCH(request: Request) {
  try {
    const body = (await request.json()) as { displayName?: string };
    const name = body.displayName?.trim();
    if (!name || name.length > 80) {
      return NextResponse.json({ error: "Nom invalide" }, { status: 400 });
    }
    await updateDb((db) => {
      db.profile.displayName = name;
    });
    const db = await readDb();
    return NextResponse.json(db.profile);
  } catch {
    return NextResponse.json({ error: "Requête invalide" }, { status: 400 });
  }
}
