import { NextResponse } from "next/server";
import path from "path";
import { readDbForUser, updateDbForUser, uploadsRemovePrefix } from "@/lib/db";
import { getAuthenticatedUserId, unauthorizedJson } from "@/lib/auth";

type Ctx = { params: Promise<{ id: string }> };

export async function DELETE(_request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const userId = await getAuthenticatedUserId();
  if (!userId) return unauthorizedJson();
  let relPath: string | undefined;
  await updateDbForUser(userId, (db) => {
    const i = db.mediaDocuments.findIndex((m) => m.id === id);
    if (i < 0) return;
    relPath = db.mediaDocuments[i]!.relPath;
    db.mediaDocuments.splice(i, 1);
  });
  if (!relPath) {
    return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  }
  try {
    const dir = path.posix.dirname(relPath.replace(/\\/g, "/"));
    await uploadsRemovePrefix(dir);
  } catch {
    /* ignore */
  }
  return NextResponse.json({ ok: true });
}

export async function GET(_request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const userId = await getAuthenticatedUserId();
  if (!userId) return unauthorizedJson();
  const db = await readDbForUser(userId);
  const doc = db.mediaDocuments.find((m) => m.id === id);
  if (!doc) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  return NextResponse.json(doc);
}
