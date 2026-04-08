import { NextResponse } from "next/server";
import { withAuthz } from "@/lib/authz/withAuthz";
import { initWorkspaceIfMissing, readWorkspace, writeWorkspace } from "@/lib/db";

type Ctx = { params: Promise<{ id: string }> };

export async function DELETE(_request: Request, ctxParams: Ctx) {
  const { id } = await ctxParams.params;
  const targetUserId = String(id ?? "").trim();

  return withAuthz("workspace:manage_employees", {
    audit: { action: "delete", entity: "workspace", entityId: targetUserId },
    handler: async (ctx) => {
      const ws = (await readWorkspace()) ?? (await initWorkspaceIfMissing(ctx.userId));
      if (ws.ownerUserId !== ctx.userId) {
        return NextResponse.json({ error: "Interdit" }, { status: 403 });
      }
      if (!targetUserId || targetUserId === ws.ownerUserId) {
        return NextResponse.json({ error: "Cible invalide" }, { status: 400 });
      }
      if (!ws.employees[targetUserId]) {
        return NextResponse.json({ error: "Introuvable" }, { status: 404 });
      }
      delete ws.employees[targetUserId];
      ws.updatedAt = new Date().toISOString();
      await writeWorkspace(ws);
      return NextResponse.json({ ok: true });
    },
  });
}

