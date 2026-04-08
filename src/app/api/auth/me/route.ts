import { NextResponse } from "next/server";
import { getAuthenticatedUserProfile, unauthorizedJson } from "@/lib/auth";

export async function GET() {
  const me = await getAuthenticatedUserProfile();
  if (!me) return unauthorizedJson();
  return NextResponse.json({ user: me });
}

