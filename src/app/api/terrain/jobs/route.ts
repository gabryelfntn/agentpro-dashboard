import { after } from "next/server";
import { NextResponse } from "next/server";
import { readDbForUser, updateDbForUser, uploadsWrite } from "@/lib/db";
import { processTerrainJob } from "@/lib/terrain/processJob";
import type { TerrainJob } from "@/lib/types";
import { getAuthenticatedUserId, unauthorizedJson } from "@/lib/auth";

export const runtime = "nodejs";
export const maxDuration = 300;

const MAX_BYTES = 12 * 1024 * 1024;
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function GET() {
  const userId = await getAuthenticatedUserId();
  if (!userId) return unauthorizedJson();
  const db = await readDbForUser(userId);
  const jobs = [...db.terrainJobs].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
  return NextResponse.json(jobs);
}

export async function POST(request: Request) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) return unauthorizedJson();
    const form = await request.formData();
    const file = form.get("image");
    const briefEntreprise = String(form.get("briefEntreprise") ?? "").trim();
    const consigne = String(form.get("consigne") ?? "").trim();
    const chantierIdRaw = form.get("chantierId");
    const chantierId =
      typeof chantierIdRaw === "string" && chantierIdRaw.trim() ? chantierIdRaw.trim() : undefined;

    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: "Image requise" }, { status: 400 });
    }
    if (!briefEntreprise || briefEntreprise.length > 4000) {
      return NextResponse.json({ error: "Brief entreprise invalide (1–4000 caractères)" }, { status: 400 });
    }
    if (!consigne || consigne.length > 4000) {
      return NextResponse.json({ error: "Consigne projet invalide (1–4000 caractères)" }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "Fichier trop volumineux (max 12 Mo)" }, { status: 400 });
    }
    const mime = file.type || "application/octet-stream";
    if (!ALLOWED.has(mime)) {
      return NextResponse.json({ error: "Format accepté : JPEG, PNG ou WebP" }, { status: 400 });
    }

    const jobId = crypto.randomUUID();
    const ext =
      mime === "image/png" ? ".png" : mime === "image/webp" ? ".webp" : ".jpg";
    const relDir = `terrain/${jobId}`;
    const sourceRelPath = `${relDir}/source${ext}`;
    const buf = Buffer.from(await file.arrayBuffer());
    await uploadsWrite(sourceRelPath, buf);

    const now = new Date().toISOString();
    const job: TerrainJob = {
      id: jobId,
      userId,
      createdAt: now,
      updatedAt: now,
      briefEntreprise,
      consigne,
      chantierId,
      sourceRelPath,
      status: "en_attente",
    };

    await updateDbForUser(userId, (db) => {
      db.terrainJobs.push(job);
    });

    after(() => {
      void processTerrainJob(userId, jobId);
    });

    return NextResponse.json(job, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erreur";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
