import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { unauthorizedJson } from "@/lib/authSupabase";
import { getUiIdentity } from "@/lib/authz/withAuthz";

export async function GET() {
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user) return unauthorizedJson();
  const identity = await getUiIdentity();
  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      displayName:
        (user.user_metadata as { displayName?: string } | null)?.displayName ??
        (user.email?.split("@")[0] || "Utilisateur"),
    },
    workspace: identity
      ? {
          role: identity.role,
          ownerUserId: identity.ownerUserId,
        }
      : null,
  });
}

