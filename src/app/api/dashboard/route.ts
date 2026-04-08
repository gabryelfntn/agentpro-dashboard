import { NextResponse } from "next/server";
import { normalizeAppDb, readWorkspaceDb } from "@/lib/db";
import { buildDashboardPayload } from "@/lib/metrics";
import { withAuthz } from "@/lib/authz/withAuthz";

export async function GET() {
  return withAuthz("dashboard:read", {
    audit: { action: "read", entity: "dashboard" },
    handler: async () => {
      const db = (await readWorkspaceDb()) ?? normalizeAppDb({});
      const payload = buildDashboardPayload(db);
      return NextResponse.json(payload);
    },
  });
}
