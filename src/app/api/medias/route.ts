import { NextResponse } from "next/server";
import { readDbForUser, updateDbForUser, uploadsWrite } from "@/lib/db";
import type { MediaDocument } from "@/lib/types";
import { getAuthenticatedUserId, unauthorizedJson } from "@/lib/auth";

export const runtime = "nodejs";

const MAX_BYTES = 15 * 1024 * 1024;
const ALLOWED = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

export async function GET() {
  const userId = await getAuthenticatedUserId();
  if (!userId) return unauthorizedJson();
  const db = await readDbForUser(userId);
  const list = [...db.mediaDocuments].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
  return NextResponse.json(list);
}

export async function POST(request: Request) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) return unauthorizedJson();
    const form = await request.formData();
    const file = form.get("file");
    const chantierIdRaw = form.get("chantierId");
    const chantierId =
      typeof chantierIdRaw === "string" && chantierIdRaw.trim() ? chantierIdRaw.trim() : undefined;

    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: "Fichier requis" }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "Fichier trop volumineux (max 15 Mo)" }, { status: 400 });
    }
    const mime = file.type || "application/octet-stream";
    if (!ALLOWED.has(mime)) {
      return NextResponse.json(
        { error: "Types acceptés : PDF, DOCX, JPEG, PNG, WebP" },
        { status: 400 },
      );
    }

    const id = crypto.randomUUID();
    const safeName = file.name.replace(/[^\w.\-àâäéèêëïîôùûüç\s]/gi, "_").slice(0, 120);
    const relDir = `documents/${id}`;
    const relPath = `${relDir}/${safeName || "document"}`;
    const buf = Buffer.from(await file.arrayBuffer());
    await uploadsWrite(relPath, buf);

    const row: MediaDocument = {
      id,
      nomFichier: safeName || "document",
      relPath,
      mime,
      taille: buf.length,
      createdAt: new Date().toISOString(),
      chantierId,
    };

    await updateDbForUser(userId, (db) => {
      db.mediaDocuments.push(row);
    });

    return NextResponse.json(row, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erreur";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
