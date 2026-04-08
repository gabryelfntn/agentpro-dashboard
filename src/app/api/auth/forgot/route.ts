import { NextResponse } from "next/server";
import { requestPasswordReset } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { email?: string };
    const r = await requestPasswordReset(body.email || "");
    // Always 200 to avoid account enumeration.
    return NextResponse.json(r);
  } catch {
    return NextResponse.json({ ok: true });
  }
}

