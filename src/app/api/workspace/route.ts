import { NextResponse } from "next/server";
import { getAuthenticatedUserId, unauthorizedJson } from "@/lib/authSupabase";
import { getWorkspaceRole, initWorkspaceIfMissing, readWorkspace } from "@/lib/db";

export async function GET() {
  const userId = await getAuthenticatedUserId();
  if (!userId) return unauthorizedJson();

  const ws = (await readWorkspace()) ?? (await initWorkspaceIfMissing(userId));
  const role = getWorkspaceRole(ws, userId);
  if (!role) {
    return NextResponse.json({ error: "Compte non rattaché à l’entreprise" }, { status: 403 });
  }

  return NextResponse.json({
    workspace: {
      version: ws.version,
      ownerUserId: ws.ownerUserId,
      role,
      employeesCount: Object.keys(ws.employees).length,
      updatedAt: ws.updatedAt,
      createdAt: ws.createdAt,
      // Only owner can see the full employee map.
      employees: role === "owner" ? ws.employees : undefined,
    },
  });
}

