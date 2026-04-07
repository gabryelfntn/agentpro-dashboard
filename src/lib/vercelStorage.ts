/** True lors d’un déploiement Vercel (serverless, disque non persistant). */
export function isVercelRuntime(): boolean {
  return process.env.VERCEL === "1";
}

export const VERCEL_DB_HINT =
  "Ajoutez DATABASE_URL (chaîne PostgreSQL Neon) dans Vercel → Settings → Environment Variables, puis redéployez.";

export const VERCEL_BLOB_HINT =
  "Ajoutez BLOB_READ_WRITE_TOKEN : Vercel → Storage → Blob → créer un store lié au projet, puis redéployez.";
