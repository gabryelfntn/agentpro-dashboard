import { NextResponse } from "next/server";
import { readDbForUser, updateDbForUser } from "@/lib/db";
import type { TaskItem, TaskPriority } from "@/lib/types";
import { getAuthenticatedUserId, unauthorizedJson } from "@/lib/auth";

export async function GET() {
  const userId = await getAuthenticatedUserId();
  if (!userId) return unauthorizedJson();
  const db = await readDbForUser(userId);
  const tasks = [...db.tasks].sort((a, b) => {
    if (a.fait !== b.fait) return a.fait ? 1 : -1;
    const da = a.echeance ? new Date(a.echeance).getTime() : Infinity;
    const db_ = b.echeance ? new Date(b.echeance).getTime() : Infinity;
    return da - db_;
  });
  return NextResponse.json(tasks);
}

export async function POST(request: Request) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) return unauthorizedJson();
    const body = (await request.json()) as Partial<TaskItem>;
    const titre = body.titre?.trim();
    if (!titre) {
      return NextResponse.json({ error: "titre requis" }, { status: 400 });
    }
    const now = new Date().toISOString();
    const priorite = (body.priorite ?? "normale") as TaskPriority;
    const row: TaskItem = {
      id: crypto.randomUUID(),
      titre,
      description: body.description?.trim() || undefined,
      fait: Boolean(body.fait),
      echeance: body.echeance || undefined,
      priorite,
      chantierId: body.chantierId?.trim() || undefined,
      createdAt: now,
      updatedAt: now,
    };
    await updateDbForUser(userId, (db) => {
      db.tasks.push(row);
    });
    return NextResponse.json(row, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Requête invalide" }, { status: 400 });
  }
}
