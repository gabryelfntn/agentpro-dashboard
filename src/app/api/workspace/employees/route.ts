import { NextResponse } from "next/server";
import { withAuthz } from "@/lib/authz/withAuthz";
import { initWorkspaceIfMissing, readWorkspace, writeWorkspace } from "@/lib/db";
import type { WorkspaceRole } from "@/lib/types";

type Body = { userId?: string; role?: WorkspaceRole };

export async function POST(request: Request) {
  return withAuthz("workspace:manage_employees", {
    audit: { action: "create", entity: "workspace" },
    handler: async (ctx) => {
      const body = (await request.json()) as Body;
      const targetUserId = String(body.userId ?? "").trim();
      const role = body.role;
      if (!targetUserId) {
        return NextResponse.json({ error: "userId requis" }, { status: 400 });
      }
      if (targetUserId === ctx.userId) {
        return NextResponse.json({ error: "Impossible de se modifier soi-même" }, { status: 400 });
      }
      if (role !== "employee" && role !== "manager" && role !== "accountant") {
        return NextResponse.json({ error: "Rôle invalide" }, { status: 400 });
      }

      const ws = (await readWorkspace()) ?? (await initWorkspaceIfMissing(ctx.userId));
      if (ws.ownerUserId !== ctx.userId) {
        return NextResponse.json({ error: "Interdit" }, { status: 403 });
      }
      if (ws.ownerUserId === targetUserId) {
        return NextResponse.json({ error: "Déjà patron" }, { status: 400 });
      }

      const t = new Date().toISOString();
      ws.employees[targetUserId] = { role, createdAt: t };
      ws.updatedAt = t;
      await writeWorkspace(ws);
      return NextResponse.json({ ok: true });
    },
  });
}

