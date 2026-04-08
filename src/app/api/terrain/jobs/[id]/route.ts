import { NextResponse } from "next/server";
import { readDbForUser, updateDbForUser, uploadsRemovePrefix } from "@/lib/db";
import { getAuthenticatedUserId, unauthorizedJson } from "@/lib/auth";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const userId = await getAuthenticatedUserId();
  if (!userId) return unauthorizedJson();
  const db = await readDbForUser(userId);
  const job = db.terrainJobs.find((j) => j.id === id);
  if (!job) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  return NextResponse.json(job);
}

export async function DELETE(_request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const userId = await getAuthenticatedUserId();
  if (!userId) return unauthorizedJson();
  let found = false;
  let relPrefix: string | undefined;
  await updateDbForUser(userId, (db) => {
    const i = db.terrainJobs.findIndex((j) => j.id === id);
    if (i < 0) return;
    found = true;
    const j = db.terrainJobs[i]!;
    const parts = j.sourceRelPath.replace(/\\/g, "/").split("/");
    if (parts[0] === "terrain" && parts[1]) {
      relPrefix = `${parts[0]}/${parts[1]}`;
    }
    db.terrainJobs.splice(i, 1);
  });
  if (!found) {
    return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  }
  if (relPrefix) {
    try {
      await uploadsRemovePrefix(relPrefix);
    } catch {
      /* ignore */
    }
  }
  return NextResponse.json({ ok: true });
}
