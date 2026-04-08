import { NextResponse } from "next/server";
import { readDbForUser } from "@/lib/db";
import { buildDashboardPayload } from "@/lib/metrics";
import { getAuthenticatedUserId, unauthorizedJson } from "@/lib/auth";

export async function GET() {
  const userId = await getAuthenticatedUserId();
  if (!userId) return unauthorizedJson();
  const db = await readDbForUser(userId);
  const payload = buildDashboardPayload(db);
  return NextResponse.json(payload);
}
