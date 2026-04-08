import { NextResponse } from "next/server";
import { login } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { email?: string; password?: string };
    const r = await login(body.email || "", body.password || "");
    if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status });
    return NextResponse.json({ user: r.user }, { status: 200 });
  } catch {
    return NextResponse.json({ error: "Requête invalide" }, { status: 400 });
  }
}

