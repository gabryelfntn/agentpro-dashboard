import { NextResponse } from "next/server";
import { withAuthz } from "@/lib/authz/withAuthz";
import { initWorkspaceIfMissing, readWorkspace, writeWorkspace } from "@/lib/db";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { WorkspaceRole } from "@/lib/types";

type Body = { email?: string; role?: WorkspaceRole; redirectTo?: string };

export async function POST(request: Request) {
  return withAuthz("workspace:invite_by_email", {
    audit: { action: "create", entity: "workspace" },
    handler: async (ctx) => {
      let body: Body;
      try {
        body = (await request.json()) as Body;
      } catch {
        return NextResponse.json({ error: "Requête invalide" }, { status: 400 });
      }

      const email = String(body.email ?? "").trim().toLowerCase();
      const role = body.role;
      if (!email || !email.includes("@") || email.length > 160) {
        return NextResponse.json({ error: "Email invalide" }, { status: 400 });
      }
      if (role !== "employee" && role !== "manager" && role !== "accountant") {
        return NextResponse.json({ error: "Rôle invalide" }, { status: 400 });
      }

      const ws = (await readWorkspace()) ?? (await initWorkspaceIfMissing(ctx.userId));
      if (ws.ownerUserId !== ctx.userId) {
        return NextResponse.json({ error: "Interdit" }, { status: 403 });
      }

      const t = new Date().toISOString();
      ws.invites = ws.invites ?? {};
      ws.invites[email] = { role, createdAt: t, createdByUserId: ctx.userId };
      ws.updatedAt = t;
      await writeWorkspace(ws);

      // Send email invite via Supabase Admin API.
      // The user will land in the app authenticated; we auto-attach by email on first access.
      const redirectTo =
        typeof body.redirectTo === "string" && body.redirectTo.trim()
          ? body.redirectTo.trim()
          : `${new URL(request.url).origin}/dashboard`;
      try {
        const admin = supabaseAdmin();
        const { error } = await admin.auth.admin.inviteUserByEmail(email, { redirectTo });
        if (error) {
          return NextResponse.json({ error: error.message || "Invitation impossible" }, { status: 400 });
        }
      } catch (e) {
        const msg =
          e instanceof Error ? e.message : "Supabase admin non configuré (SUPABASE_SERVICE_ROLE_KEY)";
        return NextResponse.json({ error: msg }, { status: 501 });
      }

      return NextResponse.json({ ok: true });
    },
  });
}

