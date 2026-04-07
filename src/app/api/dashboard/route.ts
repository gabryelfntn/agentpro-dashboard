import { NextResponse } from "next/server";
import { readDb } from "@/lib/db";
import { buildDashboardPayload } from "@/lib/metrics";

export async function GET() {
  const db = await readDb();
  const payload = buildDashboardPayload(db);
  return NextResponse.json(payload);
}
