import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { readDb, updateDb, UPLOADS_ROOT } from "@/lib/db";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const db = await readDb();
  const job = db.terrainJobs.find((j) => j.id === id);
  if (!job) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  return NextResponse.json(job);
}

export async function DELETE(_request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  let found = false;
  let jobDir: string | undefined;
  await updateDb((db) => {
    const i = db.terrainJobs.findIndex((j) => j.id === id);
    if (i < 0) return;
    found = true;
    const j = db.terrainJobs[i]!;
    const parts = j.sourceRelPath.replace(/\\/g, "/").split("/");
    if (parts[0] === "terrain" && parts[1]) {
      jobDir = path.join(UPLOADS_ROOT, parts[0], parts[1]);
    }
    db.terrainJobs.splice(i, 1);
  });
  if (!found) {
    return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  }
  if (jobDir) {
    try {
      await fs.rm(jobDir, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  }
  return NextResponse.json({ ok: true });
}
