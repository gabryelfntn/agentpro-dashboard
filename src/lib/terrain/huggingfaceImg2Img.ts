/**
 * Génération via Inference Providers (routeur officiel — remplace l’ancienne api-inference.huggingface.co).
 * Jeton : https://huggingface.co/settings/tokens (permission « Make calls to Inference Providers » recommandée).
 *
 * « auto » peut viser nscale (sans img2img). **hf-inference** ne propose en pratique que le text-to-image pour SDXL.
 * Sans `HUGGINGFACE_INFERENCE_PROVIDER`, on essaie une liste de providers qui exposent souvent l’image-to-image.
 */
import { InferenceClient, type InferenceProvider } from "@huggingface/inference";

/**
 * Le Hub doit exposer `inferenceProviderMapping` non vide pour au moins un provider (sinon erreur SDK
 * « find inference provider information »). instruct-pix2pix renvoie `{}` → aucun provider utilisable.
 * FLUX.2 klein 4B : fal-ai + replicate en image-to-image (live). Modèle souvent « gated » : accepter sur la page Hub.
 */
const DEFAULT_HF_MODEL = "black-forest-labs/FLUX.2-klein-4B";

/** Ordre si aucun provider n’est fixé dans .env (hf-inference exclu : rarement compatible img2img). */
const DEFAULT_IMG2IMG_PROVIDERS: InferenceProvider[] = [
  "fal-ai",
  "deepinfra",
  "together",
  "replicate",
];

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function isInferenceProvidersPermissionError(message: string): boolean {
  const m = message.toLowerCase();
  return (
    (m.includes("sufficient permissions") && m.includes("inference providers")) ||
    m.includes("inference.serverless") ||
    m.includes("serverless inference api")
  );
}

const HF_INFERENCE_PERMISSIONS_HINT =
  "Jeton Hugging Face sans permission Inference Providers. Créez un jeton fine-grained avec « Make calls to the serverless Inference API » (Inference Providers) : " +
  "https://huggingface.co/settings/tokens/new?ownUserPermissions=inference.serverless.write&tokenType=fineGrained — " +
  "puis remplacez HUGGINGFACE_API_TOKEN dans .env et redémarrez npm run dev.";

export async function huggingFaceImageToImage(
  imageBuffer: Buffer,
  mime: string,
  prompt: string,
): Promise<{ buffer: Buffer; model: string }> {
  const token = process.env.HUGGINGFACE_API_TOKEN?.trim();
  if (!token) {
    throw new Error("HUGGINGFACE_API_TOKEN manquant.");
  }

  const model = process.env.HUGGINGFACE_IMG2IMG_MODEL?.trim() || DEFAULT_HF_MODEL;
  const strength = Math.min(
    0.95,
    Math.max(0.2, Number(process.env.HUGGINGFACE_IMG2IMG_STRENGTH || "0.72")),
  );
  const steps = Math.min(50, Math.max(10, Number(process.env.HUGGINGFACE_IMG2IMG_STEPS || "26")));

  const negativePrompt =
    process.env.HUGGINGFACE_NEGATIVE_PROMPT ||
    "blurry, low quality, deformed, ugly, watermark, text, logo, cartoon, sketch";

  const guidanceScale = Number(process.env.HUGGINGFACE_GUIDANCE_SCALE || "7.5");

  const inputBlob = new Blob([new Uint8Array(imageBuffer)], {
    type: mime || "image/jpeg",
  });

  const client = new InferenceClient(token);

  const explicitProvider = process.env.HUGGINGFACE_INFERENCE_PROVIDER?.trim();
  const providersToTry: InferenceProvider[] = explicitProvider
    ? [explicitProvider as InferenceProvider]
    : DEFAULT_IMG2IMG_PROVIDERS;

  const baseParams: Record<string, string | number> = {
    prompt,
    negative_prompt: negativePrompt,
    guidance_scale: guidanceScale,
    num_inference_steps: steps,
    strength,
  };

  function isUnsupportedOrMissingProvider(msg: string): boolean {
    const m = msg.toLowerCase();
    return (
      m.includes("not supported for task") ||
      (m.includes("image-to-image") && m.includes("supported task")) ||
      m.includes("no inference provider") ||
      m.includes("unknown provider") ||
      m.includes("find inference provider information")
    );
  }

  async function run(
    inferenceProvider: InferenceProvider,
    params: Record<string, string | number>,
  ) {
    const imageBlob = await client.imageToImage({
      model,
      provider: inferenceProvider,
      inputs: inputBlob,
      parameters: params,
    });
    return Buffer.from(await imageBlob.arrayBuffer());
  }

  let lastError: Error | undefined;

  for (const inferenceProvider of providersToTry) {
    for (let attempt = 0; attempt < 4; attempt++) {
      try {
        const buf = await run(inferenceProvider, baseParams);
        return { buffer: buf, model: `hf:${model}@${inferenceProvider}` };
      } catch (e) {
        const err = e instanceof Error ? e : new Error(String(e));
        lastError = err;
        const msg = err.message;
        if (isInferenceProvidersPermissionError(msg)) {
          throw new Error(HF_INFERENCE_PERMISSIONS_HINT);
        }
        if (isUnsupportedOrMissingProvider(msg)) {
          break;
        }
        const maybeLoading =
          msg.includes("503") ||
          msg.toLowerCase().includes("loading") ||
          msg.includes("unavailable");
        if (maybeLoading && attempt < 3) {
          await sleep(8000 + attempt * 4000);
          continue;
        }
        break;
      }
    }
  }

  if (baseParams.strength !== undefined) {
    const { strength: _omit, ...withoutStrength } = baseParams;
    void _omit;
    for (const inferenceProvider of providersToTry) {
      try {
        const buf = await run(inferenceProvider, withoutStrength);
        return { buffer: buf, model: `hf:${model}@${inferenceProvider}` };
      } catch (e) {
        lastError = e instanceof Error ? e : new Error(String(e));
        const msg = lastError.message;
        if (isInferenceProvidersPermissionError(msg)) {
          throw new Error(HF_INFERENCE_PERMISSIONS_HINT);
        }
        if (isUnsupportedOrMissingProvider(msg)) continue;
      }
    }
  }

  const msg = lastError?.message ?? "Erreur inconnue";
  if (isInferenceProvidersPermissionError(msg)) {
    throw new Error(HF_INFERENCE_PERMISSIONS_HINT);
  }
  throw new Error(
    msg.includes("503") || msg.toLowerCase().includes("loading")
      ? "Hugging Face : modèle en veille ou saturé. Réessayez dans quelques minutes."
      : msg,
  );
}
