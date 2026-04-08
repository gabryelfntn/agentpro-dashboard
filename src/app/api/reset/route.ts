import { NextResponse } from "next/server";
import { readDbForUser, wipeDbStorage, writeDbForUser } from "@/lib/db";
import { getAuthenticatedUserId, unauthorizedJson } from "@/lib/auth";

export async function POST() {
  const userId = await getAuthenticatedUserId();
  if (!userId) return unauthorizedJson();
  const db = await readDbForUser(userId);
  const profile = db.profile;
  await wipeDbStorage(userId);
  const fresh = await readDbForUser(userId);
  fresh.profile = profile;
  await writeDbForUser(userId, fresh);
  return NextResponse.json({ ok: true });
}
