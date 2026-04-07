import { promises as fs } from "fs";
import path from "path";
import Replicate from "replicate";
import { updateDb, UPLOADS_ROOT } from "@/lib/db";
import type { TerrainJob } from "@/lib/types";
import { huggingFaceImageToImage } from "@/lib/terrain/huggingfaceImg2Img";

const DEFAULT_REPLICATE_MODEL =
  "stability-ai/stable-diffusion-img2img:15a3689ee13b0d2616e98820eca31d4c3abcd36672df6afce5cb6feb1d66087d";

function isHfRouterImg2ImgUnsupported(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes("not supported for task") ||
    (m.includes("image-to-image") && m.includes("supported task"))
  );
}

export function buildTerrainPrompt(briefEntreprise: string, consigne: string) {
  const parts = [
    briefEntreprise.trim(),
    `Consigne de réalisation : ${consigne.trim()}`,
    "Photorealistic architectural visualization for a French construction and renovation company, professional presentation quality, natural daylight, coherent perspective with the original terrain or plot photo, high detail, no text, no watermark.",
  ];
  return parts.filter(Boolean).join("\n\n");
}

async function uploadToReplicate(buffer: Buffer, filename: string, mime: string, token: string) {
  const form = new FormData();
  form.append("content", new Blob([new Uint8Array(buffer)], { type: mime }), filename);
  const res = await fetch("https://api.replicate.com/v1/files", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Envoi du fichier vers Replicate impossible (${res.status}) : ${t.slice(0, 400)}`);
  }
  const json = (await res.json()) as { urls?: { get?: string } };
  const url = json.urls?.get;
  if (!url) throw new Error("Réponse Replicate (fichiers) invalide : URL manquante.");
  return url;
}

function extractFirstUrl(out: unknown): string {
  if (!out) throw new Error("Le modèle n’a renvoyé aucune image.");
  if (typeof out === "string") return out;
  if (Array.isArray(out)) {
    const x = out[0];
    if (typeof x === "string") return x;
    if (x && typeof x === "object") {
      if ("url" in x && typeof (x as { url: unknown }).url === "function") {
        return String((x as { url: () => string }).url());
      }
      if ("url" in x && typeof (x as { url: unknown }).url === "string") {
        return (x as { url: string }).url;
      }
    }
  }
  throw new Error("Format de sortie du modèle non reconnu. Essayez un autre REPLICATE_TERRAIN_MODEL.");
}

async function runReplicateImg2Img(
  buffer: Buffer,
  mime: string,
  ext: string,
  fullPrompt: string,
): Promise<{ buffer: Buffer; model: string }> {
  const token = process.env.REPLICATE_API_TOKEN?.trim();
  if (!token) throw new Error("REPLICATE_API_TOKEN manquant.");

  const fileUrl = await uploadToReplicate(buffer, `terrain${ext}`, mime, token);
  const replicate = new Replicate({ auth: token });
  const model = (process.env.REPLICATE_TERRAIN_MODEL?.trim() ||
    DEFAULT_REPLICATE_MODEL) as `${string}/${string}:${string}`;

  const promptStrength = Math.min(
    1,
    Math.max(0.15, Number(process.env.REPLICATE_PROMPT_STRENGTH || "0.72")),
  );
  const steps = Math.min(80, Math.max(12, Number(process.env.REPLICATE_STEPS || "30")));

  const output = await replicate.run(model, {
    input: {
      image: fileUrl,
      prompt: fullPrompt,
      prompt_strength: promptStrength,
      num_inference_steps: steps,
      negative_prompt:
        process.env.REPLICATE_NEGATIVE_PROMPT ||
        "blurry, low quality, deformed, watermark, text overlay, logo, cartoon, illustration, sketch",
      num_outputs: 1,
    },
  });

  const outUrl = extractFirstUrl(output);
  const imgRes = await fetch(outUrl);
  if (!imgRes.ok) throw new Error("Impossible de télécharger l’image générée (URL expirée ou réseau).");
  const outBuf = Buffer.from(await imgRes.arrayBuffer());
  return { buffer: outBuf, model };
}

export async function processTerrainJob(jobId: string): Promise<void> {
  let snapshot: TerrainJob | undefined;
  await updateDb((db) => {
    const j = db.terrainJobs.find((x) => x.id === jobId);
    if (!j || (j.status !== "en_attente" && j.status !== "en_cours")) return;
    j.status = "en_cours";
    j.updatedAt = new Date().toISOString();
    snapshot = { ...j };
  });
  if (!snapshot) return;

  const t0 = Date.now();
  try {
    const hf = process.env.HUGGINGFACE_API_TOKEN?.trim();
    const rep = process.env.REPLICATE_API_TOKEN?.trim();

    if (!hf && !rep) {
      throw new Error(
        "Aucun fournisseur IA configuré. Sans payer : créez un compte sur https://huggingface.co , " +
          "générez un jeton (réglages → Access Tokens), ajoutez HUGGINGFACE_API_TOKEN dans .env . " +
          "Replicate est payant une fois les crédits épuisés (erreur 402).",
      );
    }

    const absSource = path.join(UPLOADS_ROOT, snapshot.sourceRelPath);
    const buffer = await fs.readFile(absSource);
    const ext = path.extname(snapshot.sourceRelPath).toLowerCase() || ".jpg";
    const mime =
      ext === ".png" ? "image/png" : ext === ".webp" ? "image/webp" : "image/jpeg";

    const fullPrompt = buildTerrainPrompt(snapshot.briefEntreprise, snapshot.consigne);

    const dir = path.posix.dirname(snapshot.sourceRelPath.replace(/\\/g, "/"));
    const resultRelPath = `${dir}/result.png`;
    const absResult = path.join(UPLOADS_ROOT, resultRelPath);

    let outBuf: Buffer;
    let modelLabel: string;

    if (hf) {
      try {
        const r = await huggingFaceImageToImage(buffer, mime, fullPrompt);
        outBuf = r.buffer;
        modelLabel = r.model;
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (isHfRouterImg2ImgUnsupported(msg) && rep) {
          const r = await runReplicateImg2Img(buffer, mime, ext, fullPrompt);
          outBuf = r.buffer;
          modelLabel = r.model;
        } else {
          throw e;
        }
      }
    } else {
      try {
        const r = await runReplicateImg2Img(buffer, mime, ext, fullPrompt);
        outBuf = r.buffer;
        modelLabel = r.model;
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        const is402 =
          msg.includes("402") ||
          msg.includes("Payment Required") ||
          msg.includes("Insufficient credit");
        if (is402) {
          throw new Error(
            "Replicate exige des crédits payants (erreur 402). Pour un usage gratuit : " +
              "ajoutez HUGGINGFACE_API_TOKEN dans .env (compte gratuit sur huggingface.co) " +
              "et retirez ou laissez vide REPLICATE_API_TOKEN pour utiliser Hugging Face en priorité.",
          );
        }
        throw e;
      }
    }

    await fs.mkdir(path.dirname(absResult), { recursive: true });
    await fs.writeFile(absResult, outBuf);

    const dureeMs = Date.now() - t0;

    await updateDb((db) => {
      const j = db.terrainJobs.find((x) => x.id === jobId);
      if (!j) return;
      j.status = "termine";
      j.resultRelPath = resultRelPath;
      j.erreur = undefined;
      j.updatedAt = new Date().toISOString();
      j.meta = { modele: modelLabel, dureeMs };
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erreur inconnue";
    await updateDb((db) => {
      const j = db.terrainJobs.find((x) => x.id === jobId);
      if (!j) return;
      j.status = "erreur";
      j.erreur = msg;
      j.updatedAt = new Date().toISOString();
    });
  }
}
