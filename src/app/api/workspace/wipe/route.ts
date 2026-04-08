import { NextResponse } from "next/server";
import { withAuthz } from "@/lib/authz/withAuthz";
import { wipeWorkspaceDbStorage, wipeWorkspaceStorage } from "@/lib/db";

export async function POST() {
  return withAuthz("workspace:manage_employees", {
    audit: { action: "delete", entity: "workspace" },
    handler: async () => {
      await wipeWorkspaceDbStorage();
      await wipeWorkspaceStorage();
      return NextResponse.json({ ok: true });
    },
  });
}

