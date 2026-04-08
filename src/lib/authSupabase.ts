import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export function unauthorizedJson() {
  return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
}

export async function getAuthenticatedUserId(): Promise<string | null> {
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

