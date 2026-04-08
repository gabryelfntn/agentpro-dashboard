import { NextResponse } from "next/server";
import { readDbForUser, updateDbForUser } from "@/lib/db";
import { getAuthenticatedUserId, unauthorizedJson } from "@/lib/auth";

export async function GET() {
  const userId = await getAuthenticatedUserId();
  if (!userId) return unauthorizedJson();
  const db = await readDbForUser(userId);
  return NextResponse.json(db.profile);
}

export async function PATCH(request: Request) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) return unauthorizedJson();
    const body = (await request.json()) as { displayName?: string };
    const name = body.displayName?.trim();
    if (!name || name.length > 80) {
      return NextResponse.json({ error: "Nom invalide" }, { status: 400 });
    }
    await updateDbForUser(userId, (db) => {
      db.profile.displayName = name;
    });
    const db = await readDbForUser(userId);
    return NextResponse.json(db.profile);
  } catch {
    return NextResponse.json({ error: "Requête invalide" }, { status: 400 });
  }
}
