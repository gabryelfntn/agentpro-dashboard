import { NextResponse } from "next/server";
import { readWorkspaceDb, updateWorkspaceDb } from "@/lib/db";
import type { TaskItem, TaskPriority } from "@/lib/types";
import { withAuthz } from "@/lib/authz/withAuthz";

export async function GET() {
  return withAuthz("tasks:read", {
    audit: { action: "read", entity: "task" },
    handler: async () => {
      const db = await readWorkspaceDb();
      const tasks = [...(db?.tasks ?? [])].sort((a, b) => {
        if (a.fait !== b.fait) return a.fait ? 1 : -1;
        const da = a.echeance ? new Date(a.echeance).getTime() : Infinity;
        const db_ = b.echeance ? new Date(b.echeance).getTime() : Infinity;
        return da - db_;
      });
      return NextResponse.json(tasks);
    },
  });
}

export async function POST(request: Request) {
  return withAuthz("tasks:create", {
    audit: { action: "create", entity: "task" },
    handler: async () => {
      try {
        const body = (await request.json()) as Partial<TaskItem>;
        const titre = body.titre?.trim();
        if (!titre || titre.length > 160) {
          return NextResponse.json({ error: "titre requis" }, { status: 400 });
        }
        const chantierId = body.chantierId?.trim() || undefined;
        if (chantierId) {
          const db = await readWorkspaceDb();
          const exists = Boolean(db?.chantiers.some((c) => c.id === chantierId));
          if (!exists) return NextResponse.json({ error: "Chantier introuvable" }, { status: 400 });
        }

        const now = new Date().toISOString();
        const priorite = (body.priorite ?? "normale") as TaskPriority;
        const row: TaskItem = {
          id: crypto.randomUUID(),
          titre,
          description: body.description?.trim().slice(0, 2000) || undefined,
          fait: Boolean(body.fait),
          echeance: body.echeance || undefined,
          priorite,
          chantierId,
          createdAt: now,
          updatedAt: now,
        };
        await updateWorkspaceDb((db) => {
          db.tasks.push(row);
        });
        return NextResponse.json(row, { status: 201 });
      } catch {
        return NextResponse.json({ error: "Requête invalide" }, { status: 400 });
      }
    },
  });
}
