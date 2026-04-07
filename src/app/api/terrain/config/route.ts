import { NextResponse } from "next/server";

export async function GET() {
  const hf = Boolean(process.env.HUGGINGFACE_API_TOKEN?.trim());
  const replicate = Boolean(process.env.REPLICATE_API_TOKEN?.trim());
  return NextResponse.json({
    huggingfaceConfigured: hf,
    replicateConfigured: replicate,
    configured: hf || replicate,
    providerHint: hf
      ? "huggingface"
      : replicate
        ? "replicate"
        : "none",
    modeleDefaut: hf
      ? (process.env.HUGGINGFACE_IMG2IMG_MODEL?.trim() ||
          "black-forest-labs/FLUX.2-klein-4B (Hugging Face Inference Providers)")
      : (process.env.REPLICATE_TERRAIN_MODEL?.trim() ||
          "stability-ai/stable-diffusion-img2img (Replicate)"),
  });
}
