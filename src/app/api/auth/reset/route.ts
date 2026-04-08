import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { code?: string; token?: string; password?: string };
    const code = (body.code || body.token || "").trim();
    const password = body.password || "";
    if (!code) return NextResponse.json({ error: "Jeton invalide" }, { status: 400 });
    if (!password || password.length < 8 || password.length > 200) {
      return NextResponse.json({ error: "Mot de passe invalide (min 8 caractères)" }, { status: 400 });
    }

    const supabase = await supabaseServer();
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
    if (exchangeError) {
      return NextResponse.json({ error: "Lien expiré ou invalide" }, { status: 400 });
    }
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      return NextResponse.json({ error: updateError.message || "Réinitialisation impossible" }, { status: 400 });
    }
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch {
    return NextResponse.json({ error: "Requête invalide" }, { status: 400 });
  }
}

