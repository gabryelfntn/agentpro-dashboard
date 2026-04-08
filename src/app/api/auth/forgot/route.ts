import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { email?: string };
    const email = body.email?.trim() || "";
    const supabase = await supabaseServer();
    const origin = new URL(request.url).origin;
    const redirectTo = `${origin}/reinitialiser-mot-de-passe`;
    // Always 200 to avoid account enumeration.
    await supabase.auth.resetPasswordForEmail(email, { redirectTo });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true });
  }
}

