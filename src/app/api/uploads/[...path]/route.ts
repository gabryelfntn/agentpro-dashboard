import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { UPLOADS_ROOT } from "@/lib/db";

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

  const base = path.resolve(UPLOADS_ROOT);
  const target = path.resolve(base, ...segments);
  const rel = path.relative(base, target);
  if (rel.startsWith("..") || path.isAbsolute(rel)) {
    return NextResponse.json({ error: "Interdit" }, { status: 403 });
  }

  try {
    const stat = await fs.stat(target);
    if (!stat.isFile()) {
      return NextResponse.json({ error: "Introuvable" }, { status: 404 });
    }
    const buf = await fs.readFile(target);
    const ext = path.extname(target).toLowerCase();
    const contentType = MIME[ext] || "application/octet-stream";
    return new NextResponse(buf, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch {
    return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  }
}
