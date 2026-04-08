import { NextResponse } from "next/server";
import { normalizeAppDb, wipeWorkspaceDbStorage, writeWorkspaceDb } from "@/lib/db";
import { withAuthz } from "@/lib/authz/withAuthz";

export async function POST() {
  return withAuthz("reset:run", {
    audit: { action: "reset", entity: "reset" },
    handler: async () => {
      await wipeWorkspaceDbStorage();
      const fresh = normalizeAppDb({});
      await writeWorkspaceDb(fresh);
      return NextResponse.json({ ok: true });
    },
  });
}
