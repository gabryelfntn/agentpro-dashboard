import { NextResponse } from "next/server";
import { withAuthz } from "@/lib/authz/withAuthz";
import { readProfileForUser, writeProfileForUser } from "@/lib/db";

export async function GET() {
  return withAuthz("profile:read", {
    audit: { action: "read", entity: "profile" },
    handler: async (ctx) => {
      const profile = await readProfileForUser(ctx.userId);
      return NextResponse.json(profile);
    },
  });
}

export async function PATCH(request: Request) {
  return withAuthz("profile:update", {
    audit: { action: "update", entity: "profile" },
    handler: async (ctx) => {
      try {
        const body = (await request.json()) as { displayName?: string };
        const name = body.displayName?.trim();
        if (!name || name.length > 80) {
          return NextResponse.json({ error: "Nom invalide" }, { status: 400 });
        }
        await writeProfileForUser(ctx.userId, { displayName: name });
        const profile = await readProfileForUser(ctx.userId);
        return NextResponse.json(profile);
      } catch {
        return NextResponse.json({ error: "Requête invalide" }, { status: 400 });
      }
    },
  });
}
