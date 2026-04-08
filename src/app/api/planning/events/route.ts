import { NextResponse } from "next/server";
import { readDbForUser, updateDbForUser } from "@/lib/db";
import type { PlanningEvent, PlanningEventType } from "@/lib/types";
import { getAuthenticatedUserId, unauthorizedJson } from "@/lib/auth";

export async function GET() {
  const userId = await getAuthenticatedUserId();
  if (!userId) return unauthorizedJson();
  const db = await readDbForUser(userId);
  const events = [...db.planningEvents].sort(
    (a, b) => new Date(a.debut).getTime() - new Date(b.debut).getTime(),
  );
  return NextResponse.json(events);
}

export async function POST(request: Request) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) return unauthorizedJson();
    const body = (await request.json()) as Partial<PlanningEvent>;
    const titre = body.titre?.trim();
    const debut = body.debut;
    const fin = body.fin;
    if (!titre || !debut || !fin) {
      return NextResponse.json({ error: "titre, debut et fin requis" }, { status: 400 });
    }
    if (new Date(debut).getTime() >= new Date(fin).getTime()) {
      return NextResponse.json({ error: "La fin doit être après le début" }, { status: 400 });
    }
    const type = (body.type ?? "autre") as PlanningEventType;
    const row: PlanningEvent = {
      id: crypto.randomUUID(),
      titre,
      description: body.description?.trim() || undefined,
      debut,
      fin,
      toutJournee: Boolean(body.toutJournee),
      type,
      chantierId: body.chantierId?.trim() || undefined,
      lieu: body.lieu?.trim() || undefined,
      rappelMinutes:
        typeof body.rappelMinutes === "number" && body.rappelMinutes > 0
          ? body.rappelMinutes
          : undefined,
      couleur: body.couleur?.trim() || undefined,
    };
    await updateDbForUser(userId, (db) => {
      db.planningEvents.push(row);
    });
    return NextResponse.json(row, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Requête invalide" }, { status: 400 });
  }
}
