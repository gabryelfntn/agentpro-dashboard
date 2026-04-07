import { neon, type NeonQueryFunction } from "@neondatabase/serverless";

const ROW_KEY = "main";

let sqlSingleton: NeonQueryFunction<false, false> | null | undefined;

/** Client Postgres serverless (Neon, Vercel Postgres, etc.) si `DATABASE_URL` est défini. */
export function pgSql(): NeonQueryFunction<false, false> | null {
  if (sqlSingleton !== undefined) return sqlSingleton;
  const url = process.env.DATABASE_URL?.trim();
  sqlSingleton = url ? neon(url) : null;
  return sqlSingleton;
}

export function usesPostgresDb(): boolean {
  return pgSql() !== null;
}

async function ensureSchema(sql: NeonQueryFunction<false, false>) {
  await sql`
    CREATE TABLE IF NOT EXISTS agentpro_kv (
      key text PRIMARY KEY,
      value text NOT NULL
    )
  `;
}

export async function pgReadPayload(sql: NeonQueryFunction<false, false>): Promise<string | null> {
  await ensureSchema(sql);
  const rows = await sql`SELECT value FROM agentpro_kv WHERE key = ${ROW_KEY}`;
  const row = rows[0] as { value: string } | undefined;
  return row?.value ?? null;
}

export async function pgWritePayload(sql: NeonQueryFunction<false, false>, payload: string): Promise<void> {
  await ensureSchema(sql);
  await sql`
    INSERT INTO agentpro_kv (key, value)
    VALUES (${ROW_KEY}, ${payload})
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
  `;
}

export async function pgDeletePayload(sql: NeonQueryFunction<false, false>): Promise<void> {
  await ensureSchema(sql);
  await sql`DELETE FROM agentpro_kv WHERE key = ${ROW_KEY}`;
}
