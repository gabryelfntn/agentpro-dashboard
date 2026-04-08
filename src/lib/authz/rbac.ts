import type { WorkspaceRole } from "@/lib/types";
import type { Permission } from "./permissions";

export function roleHasPermission(role: WorkspaceRole, perm: Permission): boolean {
  if (role === "owner") return true;

  // Default employee policy (general salarié).
  // Keep it intentionally conservative for destructive / financial / export actions.
  if (role === "employee" || role === "manager") {
    switch (perm) {
      case "chantiers:read":
      case "chantiers:create":
      case "chantiers:update":
      case "chantiers:delete":
      case "planning:read":
      case "planning:create":
      case "planning:update":
      case "planning:delete":
      case "tasks:read":
      case "tasks:create":
      case "tasks:update":
      case "tasks:delete":
      case "medias:read":
      case "medias:upload":
      case "medias:delete":
      case "terrain:read":
      case "terrain:create":
      case "terrain:delete":
      case "dashboard:read":
      case "contacts:read":
      case "contacts:create":
      case "contacts:update":
      case "devis:read":
      case "devis:create":
      case "devis:update":
      case "profile:read":
      case "profile:update":
      case "uploads:read":
      case "workspace:read":
        return true;

      case "devis:delete":
      case "contacts:delete":
      case "planning:export":
      case "export:download":
      case "reset:run":
      case "workspace:manage_employees":
      case "workspace:invite_by_email":
        return false;
    }
  }

  if (role === "accountant") {
    switch (perm) {
      case "dashboard:read":
      case "devis:read":
      case "contacts:read":
      case "export:download":
      case "planning:export":
      case "workspace:read":
      case "profile:read":
      case "uploads:read":
        return true;
      default:
        return false;
    }
  }

  return false;
}

