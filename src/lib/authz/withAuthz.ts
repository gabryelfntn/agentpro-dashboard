import { NextResponse } from "next/server";
import { getAuthenticatedUserId, unauthorizedJson } from "@/lib/authSupabase";
import {
  appendAuditEvent,
  getWorkspaceRole,
  initWorkspaceDbFromOwnerIfMissing,
  initWorkspaceIfMissing,
  readProfileForUser,
  readWorkspace,
  tryAcceptInviteForUser,
  updateWorkspaceDb,
} from "@/lib/db";
import type { AuditAction, AuditEntity, WorkspaceRole } from "@/lib/types";
import type { Permission } from "./permissions";
import { roleHasPermission } from "./rbac";
import { supabaseServer } from "@/lib/supabase/server";

export type AuthzContext = {
  userId: string;
  role: WorkspaceRole;
};

function forbiddenJson(message = "Interdit") {
  return NextResponse.json({ error: message }, { status: 403 });
}

function mkAudit(action: AuditAction, entity: AuditEntity, ctx: AuthzContext, ok: boolean, reason?: string, entityId?: string) {
  return {
    id: crypto.randomUUID(),
    at: new Date().toISOString(),
    actorUserId: ctx.userId,
    actorRole: ctx.role,
    action,
    entity,
    entityId,
    ok,
    reason,
  };
}

export async function requireAuthz(perm: Permission): Promise<
  | { ok: true; ctx: AuthzContext }
  | { ok: false; res: Response; userId?: string; role?: WorkspaceRole }
> {
  const userId = await getAuthenticatedUserId();
  if (!userId) return { ok: false, res: unauthorizedJson() };

  // Ensure workspace exists (first authenticated user becomes owner).
  let workspace = await initWorkspaceIfMissing(userId);
  let role = getWorkspaceRole(workspace, userId);

  // Auto-attach invited users by email on first authentication.
  if (!role) {
    try {
      const supabase = await supabaseServer();
      const { data } = await supabase.auth.getUser();
      const email = data.user?.email;
      if (email) {
        const accepted = await tryAcceptInviteForUser({ userId, email });
        if (accepted.workspace) {
          workspace = accepted.workspace;
          role = getWorkspaceRole(workspace, userId);
        }
      }
    } catch {
      /* ignore */
    }
  }
  if (!role) {
    return {
      ok: false,
      res: forbiddenJson("Compte non rattaché à l’entreprise"),
      userId,
    };
  }
  if (!roleHasPermission(role, perm)) {
    return {
      ok: false,
      res: forbiddenJson("Accès refusé"),
      userId,
      role,
    };
  }

  // Ensure shared DB exists (seeded from owner on first run).
  await initWorkspaceDbFromOwnerIfMissing(workspace.ownerUserId);

  return { ok: true, ctx: { userId, role } };
}

export async function withAuthz<T>(
  perm: Permission,
  opts: {
    audit: { action: AuditAction; entity: AuditEntity; entityId?: string };
    handler: (ctx: AuthzContext) => Promise<NextResponse<T> | NextResponse>;
  },
): Promise<Response> {
  const gate = await requireAuthz(perm);
  if (!gate.ok) {
    // Best-effort audit of denied access in shared DB (if possible).
    if (gate.userId) {
      try {
        const ws = await readWorkspace();
        const role = gate.role ?? (ws ? getWorkspaceRole(ws, gate.userId) : null) ?? "employee";
        await updateWorkspaceDb((db) => {
          appendAuditEvent(
            db,
            mkAudit("authz_denied", opts.audit.entity, { userId: gate.userId!, role }, false, "permission_denied", opts.audit.entityId),
          );
        });
      } catch {
        /* ignore */
      }
    }
    return gate.res;
  }

  try {
    const res = await opts.handler(gate.ctx);
    // Success audit
    await updateWorkspaceDb((db) => {
      appendAuditEvent(db, mkAudit(opts.audit.action, opts.audit.entity, gate.ctx, true, undefined, opts.audit.entityId));
    });
    return res;
  } catch (e) {
    // Failure audit
    try {
      await updateWorkspaceDb((db) => {
        const reason = e instanceof Error ? e.message.slice(0, 300) : "error";
        appendAuditEvent(db, mkAudit(opts.audit.action, opts.audit.entity, gate.ctx, false, reason, opts.audit.entityId));
      });
    } catch {
      /* ignore */
    }
    const msg = e instanceof Error ? e.message : "Erreur";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function getUiIdentity() {
  const userId = await getAuthenticatedUserId();
  if (!userId) return null;
  const workspace = await readWorkspace();
  if (!workspace) return null;
  const role = getWorkspaceRole(workspace, userId);
  if (!role) return null;
  const profile = await readProfileForUser(userId);
  return { userId, role, profile, ownerUserId: workspace.ownerUserId };
}

