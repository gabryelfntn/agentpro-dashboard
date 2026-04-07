import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { readDb, updateDb, UPLOADS_ROOT } from "@/lib/db";

type Ctx = { params: Promise<{ id: string }> };

export async function DELETE(_request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  let relPath: string | undefined;
  await updateDb((db) => {
    const i = db.mediaDocuments.findIndex((m) => m.id === id);
    if (i < 0) return;
    relPath = db.mediaDocuments[i]!.relPath;
    db.mediaDocuments.splice(i, 1);
  });
  if (!relPath) {
    return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  }
  try {
    const abs = path.join(UPLOADS_ROOT, relPath);
    await fs.rm(path.dirname(abs), { recursive: true, force: true });
  } catch {
    /* ignore */
  }
  return NextResponse.json({ ok: true });
}

export async function GET(_request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const db = await readDb();
  const doc = db.mediaDocuments.find((m) => m.id === id);
  if (!doc) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  return NextResponse.json(doc);
}
