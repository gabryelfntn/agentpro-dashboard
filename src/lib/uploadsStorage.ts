import { promises as fs } from "fs";
import path from "path";
import { del, head, list, put } from "@vercel/blob";
import { isVercelRuntime, VERCEL_BLOB_HINT } from "@/lib/vercelStorage";

/** Dossier local (dev / serveur avec disque persistant). */
export const UPLOADS_ROOT = path.join(process.cwd(), "data", "uploads");

const BLOB_PREFIX = "agentpro-uploads";

export function useBlobUploads(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN?.trim());
}

function blobToken(): string {
  const t = process.env.BLOB_READ_WRITE_TOKEN?.trim();
  if (!t) throw new Error("BLOB_READ_WRITE_TOKEN manquant.");
  return t;
}

function toBlobPathname(relPath: string): string {
  const n = relPath.replace(/\\/g, "/").replace(/^\/+/, "");
  return `${BLOB_PREFIX}/${n}`;
}

export async function uploadsWrite(relPath: string, buf: Buffer): Promise<void> {
  const normalized = relPath.replace(/\\/g, "/");
  if (useBlobUploads()) {
    const token = blobToken();
    await put(toBlobPathname(normalized), buf, {
      access: "public",
      addRandomSuffix: false,
      token,
    });
    return;
  }
  if (isVercelRuntime()) {
    throw new Error(
      `Sur Vercel, les fichiers ne peuvent pas être enregistrés dans data/uploads/. ${VERCEL_BLOB_HINT}`,
    );
  }
  const abs = path.join(UPLOADS_ROOT, normalized);
  await fs.mkdir(path.dirname(abs), { recursive: true });
  await fs.writeFile(abs, buf);
}

export async function uploadsRead(relPath: string): Promise<Buffer> {
  const normalized = relPath.replace(/\\/g, "/");
  if (useBlobUploads()) {
    const token = blobToken();
    const pathname = toBlobPathname(normalized);
    try {
      const meta = await head(pathname, { token });
      const res = await fetch(meta.url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return Buffer.from(await res.arrayBuffer());
    } catch {
      const err = new Error("ENOENT") as NodeJS.ErrnoException;
      err.code = "ENOENT";
      throw err;
    }
  }
  if (isVercelRuntime()) {
    throw new Error(
      `Sur Vercel, lecture disque locale impossible. ${VERCEL_BLOB_HINT}`,
    );
  }
  return fs.readFile(path.join(UPLOADS_ROOT, normalized));
}

/** Supprime un dossier logique (ex. `terrain/<id>`, `documents/<id>`). */
export async function uploadsRemovePrefix(relDir: string): Promise<void> {
  const normalized = relDir.replace(/\\/g, "/").replace(/^\/+|\/+$/g, "");
  if (useBlobUploads()) {
    const token = blobToken();
    const prefix = toBlobPathname(normalized);
    let cursor: string | undefined;
    for (;;) {
      const page = await list({ prefix, token, cursor, limit: 500 });
      await Promise.all(page.blobs.map((b) => del(b.url, { token })));
      if (!page.hasMore) break;
      cursor = page.cursor;
    }
    return;
  }
  if (isVercelRuntime()) {
    return;
  }
  await fs.rm(path.join(UPLOADS_ROOT, normalized), { recursive: true, force: true });
}
