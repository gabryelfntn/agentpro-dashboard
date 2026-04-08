import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { email?: string; password?: string };
    const email = body.email?.trim() || "";
    const password = body.password || "";
    if (!email || !password) {
      return NextResponse.json({ error: "Identifiants invalides" }, { status: 400 });
    }

    const supabase = await supabaseServer();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.user) {
      return NextResponse.json({ error: "Email ou mot de passe incorrect" }, { status: 401 });
    }

    return NextResponse.json(
      {
        user: {
          id: data.user.id,
          email: data.user.email,
          displayName:
            (data.user.user_metadata as { displayName?: string } | null)?.displayName ??
            (data.user.email?.split("@")[0] || "Utilisateur"),
        },
      },
      { status: 200 },
    );
  } catch {
    return NextResponse.json({ error: "Requête invalide" }, { status: 400 });
  }
}

