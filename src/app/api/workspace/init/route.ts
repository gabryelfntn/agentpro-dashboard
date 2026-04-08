import { NextResponse } from "next/server";
import { getAuthenticatedUserId, unauthorizedJson } from "@/lib/authSupabase";
import { initWorkspaceIfMissing } from "@/lib/db";

export async function POST() {
  const userId = await getAuthenticatedUserId();
  if (!userId) return unauthorizedJson();

  const ws = await initWorkspaceIfMissing(userId);
  const role = ws.ownerUserId === userId ? "owner" : ws.employees[userId]?.role ?? null;
  if (!role) {
    return NextResponse.json({ error: "Compte non rattaché à l’entreprise" }, { status: 403 });
  }
  return NextResponse.json({
    workspace: {
      version: ws.version,
      ownerUserId: ws.ownerUserId,
      role,
      employeesCount: Object.keys(ws.employees).length,
      createdAt: ws.createdAt,
      updatedAt: ws.updatedAt,
    },
  });
}

