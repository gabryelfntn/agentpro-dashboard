import { NextResponse } from "next/server";
import { readDb, wipeDbStorage, writeDb } from "@/lib/db";

export async function POST() {
  const db = await readDb();
  const profile = db.profile;
  await wipeDbStorage();
  const fresh = await readDb();
  fresh.profile = profile;
  await writeDb(fresh);
  return NextResponse.json({ ok: true });
}
