import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import type { Profile } from "@/lib/types";
import { readDb, writeDb } from "@/lib/db";

const DB_PATH = path.join(process.cwd(), "data", "db.json");

export async function POST() {
  let profile: Profile = { displayName: "Gabryel FEUNTEUN" };
  try {
    const raw = await fs.readFile(DB_PATH, "utf-8");
    const parsed = JSON.parse(raw) as { profile?: Profile };
    if (parsed.profile?.displayName) profile = parsed.profile;
  } catch {
    /* pas de fichier */
  }
  try {
    await fs.unlink(DB_PATH);
  } catch {
    /* fichier absent */
  }
  const fresh = await readDb();
  fresh.profile = profile;
  await writeDb(fresh);
  return NextResponse.json({ ok: true });
}
