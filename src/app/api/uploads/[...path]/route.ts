import { NextResponse } from "next/server";
import path from "path";
import { UPLOADS_ROOT, blobUploadsEnabled, uploadsRead } from "@/lib/db";
import { readDbForUser } from "@/lib/db";
import { getAuthenticatedUserId, unauthorizedJson } from "@/lib/auth";

const MIME: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".pdf": "application/pdf",
};

type Ctx = { params: Promise<{ path: string[] }> };

export async function GET(_request: Request, ctx: Ctx) {
  const { path: segments } = await ctx.params;
  if (!segments?.length) {
    return NextResponse.json({ error: "Chemin invalide" }, { status: 400 });
  }

  const relPath = segments.join("/");
  if (!relPath || relPath.includes("..")) {
    return NextResponse.json({ error: "Interdit" }, { status: 403 });
  }

  const userId = await getAuthenticatedUserId();
  if (!userId) return unauthorizedJson();
  const db = await readDbForUser(userId);
  const normalized = relPath.replace(/\\/g, "/");
  const allowed =
    db.mediaDocuments.some((d) => d.relPath.replace(/\\/g, "/") === normalized) ||
    db.terrainJobs.some(
      (j) =>
        j.sourceRelPath.replace(/\\/g, "/") === normalized ||
        (j.resultRelPath ? j.resultRelPath.replace(/\\/g, "/") === normalized : false),
    );
  if (!allowed) {
    return NextResponse.json({ error: "Interdit" }, { status: 403 });
  }

  if (!blobUploadsEnabled()) {
    const base = path.resolve(UPLOADS_ROOT);
    const target = path.resolve(base, ...segments);
    const rel = path.relative(base, target);
    if (rel.startsWith("..") || path.isAbsolute(rel)) {
      return NextResponse.json({ error: "Interdit" }, { status: 403 });
    }
  }

  try {
    const buf = await uploadsRead(relPath);
    const ext = path.extname(relPath).toLowerCase();
    const contentType = MIME[ext] || "application/octet-stream";
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch {
    return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  }
}
