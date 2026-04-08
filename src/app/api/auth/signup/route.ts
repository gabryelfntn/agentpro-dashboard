import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { email?: string; password?: string; displayName?: string };
    const email = body.email?.trim() || "";
    const password = body.password || "";
    const displayName = body.displayName?.trim();
    if (!email || !email.includes("@") || email.length > 120) {
      return NextResponse.json({ error: "Email invalide" }, { status: 400 });
    }
    if (!password || password.length < 8 || password.length > 200) {
      return NextResponse.json({ error: "Mot de passe invalide (min 8 caractères)" }, { status: 400 });
    }

    const supabase = await supabaseServer();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { displayName: displayName || undefined } },
    });
    if (error) {
      const message = error.message || "Inscription impossible";
      const status = message.toLowerCase().includes("already") || message.toLowerCase().includes("exist") ? 409 : 400;
      return NextResponse.json({ error: message }, { status });
    }

    return NextResponse.json(
      {
        user: data.user
          ? {
              id: data.user.id,
              email: data.user.email,
              displayName:
                (data.user.user_metadata as { displayName?: string } | null)?.displayName ??
                (data.user.email?.split("@")[0] || "Utilisateur"),
            }
          : null,
      },
      { status: 201 },
    );
  } catch {
    return NextResponse.json({ error: "Requête invalide" }, { status: 400 });
  }
}

