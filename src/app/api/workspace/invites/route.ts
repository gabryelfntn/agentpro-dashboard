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
      const origin = new URL(request.url).origin;
      // Ne pas rediriger directement vers /dashboard : le middleware bloque avant l’échange du ?code=.
      const defaultRedirect = `${origin}/auth/callback?next=${encodeURIComponent("/dashboard")}`;
      const redirectTo =
        typeof body.redirectTo === "string" && body.redirectTo.trim()
          ? body.redirectTo.trim()
          : defaultRedirect;
      try {
        const admin = supabaseAdmin();
        const { error } = await admin.auth.admin.inviteUserByEmail(email, {
          redirectTo,
          data: { agentpro_invited: true },
        });
        if (error) {
          const em = (error.message || "").toLowerCase();
          // Compte déjà créé dans Supabase : l’invite est enregistrée, le salarié n’a qu’à se connecter.
          if (
            em.includes("already") ||
            em.includes("registered") ||
            em.includes("exists") ||
            em.includes("duplicate")
          ) {
            return NextResponse.json({
              ok: true,
              info:
                "Ce compte existe déjà dans Supabase. L’invitation est enregistrée : le salarié peut se connecter avec cet e-mail et sera rattaché automatiquement.",
            });
          }
          return NextResponse.json(
            {
              error:
                error.message ||
                "Invitation impossible. Vérifiez Supabase Auth (SMTP) et les URL de redirection.",
            },
            { status: 400 },
          );
        }
      } catch (e) {
        const raw = e instanceof Error ? e.message : String(e);
        if (raw.includes("SUPABASE_SERVICE_ROLE_KEY") || raw.includes("Supabase admin env")) {
          return NextResponse.json(
            {
              error:
                "Invitation par e-mail désactivée : ajoutez SUPABASE_SERVICE_ROLE_KEY (clé service_role) et NEXT_PUBLIC_SUPABASE_URL sur Vercel, puis redéployez.",
            },
            { status: 501 },
          );
        }
        return NextResponse.json({ error: raw || "Erreur serveur" }, { status: 501 });
      }

      return NextResponse.json({ ok: true });
    },
  });
}

