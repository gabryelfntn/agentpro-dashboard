import { promises as fs } from "fs";
import path from "path";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { pgReadValue, pgSql, pgWriteValue } from "@/lib/dbPostgres";
import { isVercelRuntime, VERCEL_DB_HINT } from "@/lib/vercelStorage";

type StoredUser = {
  id: string;
  email: string;
  displayName: string;
  passwordHash: string;
  salt: string;
  createdAt: string;
};

type StoredSession = {
  token: string;
  userId: string;
  createdAt: string;
  expiresAt: string;
};

type PasswordReset = {
  token: string;
  userId: string;
  createdAt: string;
  expiresAt: string;
  usedAt?: string;
};

type AuthStore = {
  users: StoredUser[];
  sessions: StoredSession[];
  resets?: PasswordReset[];
};

const AUTH_PATH = path.join(process.cwd(), "data", "auth.json");
const AUTH_KV_KEY = "auth:v1";
const SESSION_COOKIE = "agentpro_session";

function nowIso() {
  return new Date().toISOString();
}

function addDaysIso(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

function safeEmail(email: string) {
  return email.trim().toLowerCase();
}

function randomToken() {
  // URL-safe-ish base64 without padding.
  return Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString("base64url");
}

async function scryptHash(password: string, salt: string): Promise<string> {
  const { scrypt } = await import("crypto");
  return await new Promise((resolve, reject) => {
    scrypt(password, salt, 64, { N: 16384, r: 8, p: 1 }, (err, derivedKey) => {
      if (err) reject(err);
      else resolve((derivedKey as Buffer).toString("hex"));
    });
  });
}

async function readAuthStore(): Promise<AuthStore> {
  const sql = pgSql();
  if (sql) {
    const raw = await pgReadValue(sql, AUTH_KV_KEY);
    if (!raw) return { users: [], sessions: [], resets: [] };
    try {
      const parsed = JSON.parse(raw) as AuthStore;
      return {
        users: Array.isArray(parsed.users) ? parsed.users : [],
        sessions: Array.isArray(parsed.sessions) ? parsed.sessions : [],
        resets: Array.isArray(parsed.resets) ? parsed.resets : [],
      };
    } catch {
      return { users: [], sessions: [], resets: [] };
    }
  }

  try {
    const raw = await fs.readFile(AUTH_PATH, "utf-8");
    const parsed = JSON.parse(raw) as AuthStore;
    return {
      users: Array.isArray(parsed.users) ? parsed.users : [],
      sessions: Array.isArray(parsed.sessions) ? parsed.sessions : [],
      resets: Array.isArray(parsed.resets) ? parsed.resets : [],
    };
  } catch {
    if (isVercelRuntime()) {
      throw new Error(`Impossible de lire le store d'auth sur Vercel sans Postgres. ${VERCEL_DB_HINT}`);
    }
    return { users: [], sessions: [], resets: [] };
  }
}

async function writeAuthStore(store: AuthStore): Promise<void> {
  const payload = JSON.stringify(store, null, 2);
  const sql = pgSql();
  if (sql) {
    await pgWriteValue(sql, AUTH_KV_KEY, payload);
    return;
  }
  if (isVercelRuntime()) {
    throw new Error(`Impossible d’écrire le store d'auth sur Vercel sans Postgres. ${VERCEL_DB_HINT}`);
  }
  await fs.mkdir(path.dirname(AUTH_PATH), { recursive: true });
  await fs.writeFile(AUTH_PATH, payload, "utf-8");
}

export async function clearSessionCookieAsync() {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(0),
  });
}

export async function setSessionCookie(token: string, expiresAtIso: string) {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(expiresAtIso),
  });
}

export async function getAuthenticatedUserId(): Promise<string | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value?.trim();
  if (!token) return null;

  const store = await readAuthStore();
  const s = store.sessions.find((x) => x.token === token);
  if (!s) return null;
  if (new Date(s.expiresAt).getTime() <= Date.now()) return null;
  return s.userId;
}

export function unauthorizedJson() {
  return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
}

export async function signup(emailRaw: string, password: string, displayNameRaw?: string) {
  const email = safeEmail(emailRaw);
  const displayName = (displayNameRaw?.trim() || email.split("@")[0] || "Utilisateur").slice(0, 80);

  if (!email || !email.includes("@") || email.length > 120) {
    return { ok: false as const, status: 400, error: "Email invalide" };
  }
  if (!password || password.length < 8 || password.length > 200) {
    return { ok: false as const, status: 400, error: "Mot de passe invalide (min 8 caractères)" };
  }

  const store = await readAuthStore();
  if (store.users.some((u) => u.email === email)) {
    return { ok: false as const, status: 409, error: "Un compte existe déjà avec cet email" };
  }

  const salt = Buffer.from(crypto.getRandomValues(new Uint8Array(16))).toString("hex");
  const passwordHash = await scryptHash(password, salt);
  const user: StoredUser = {
    id: crypto.randomUUID(),
    email,
    displayName,
    passwordHash,
    salt,
    createdAt: nowIso(),
  };

  store.users.push(user);
  await writeAuthStore(store);

  return { ok: true as const, user: { id: user.id, email: user.email, displayName: user.displayName } };
}

export async function login(emailRaw: string, password: string) {
  const email = safeEmail(emailRaw);
  if (!email || !password) {
    return { ok: false as const, status: 400, error: "Identifiants invalides" };
  }

  const store = await readAuthStore();
  const user = store.users.find((u) => u.email === email);
  if (!user) return { ok: false as const, status: 401, error: "Email ou mot de passe incorrect" };

  const hash = await scryptHash(password, user.salt);
  if (hash !== user.passwordHash) {
    return { ok: false as const, status: 401, error: "Email ou mot de passe incorrect" };
  }

  // Single active session per user (simple + avoids store growth).
  store.sessions = store.sessions.filter((s) => s.userId !== user.id);
  const session: StoredSession = {
    token: randomToken(),
    userId: user.id,
    createdAt: nowIso(),
    expiresAt: addDaysIso(30),
  };
  store.sessions.push(session);
  await writeAuthStore(store);

  await setSessionCookie(session.token, session.expiresAt);

  return {
    ok: true as const,
    user: { id: user.id, email: user.email, displayName: user.displayName },
  };
}

export async function logout() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value?.trim();
  await clearSessionCookieAsync();
  if (!token) return;

  const store = await readAuthStore();
  const before = store.sessions.length;
  store.sessions = store.sessions.filter((s) => s.token !== token);
  if (store.sessions.length !== before) {
    await writeAuthStore(store);
  }
}

export async function getAuthenticatedUserProfile() {
  const userId = await getAuthenticatedUserId();
  if (!userId) return null;
  const store = await readAuthStore();
  const u = store.users.find((x) => x.id === userId);
  if (!u) return null;
  return { id: u.id, email: u.email, displayName: u.displayName };
}

export async function requestPasswordReset(emailRaw: string) {
  const email = safeEmail(emailRaw);
  if (!email || !email.includes("@")) {
    return { ok: true as const }; // avoid enumeration
  }

  const store = await readAuthStore();
  const user = store.users.find((u) => u.email === email);
  if (!user) {
    return { ok: true as const }; // avoid enumeration
  }

  // Invalidate previous active resets
  store.resets = (store.resets ?? []).filter((r) => r.userId !== user.id || r.usedAt);
  const reset: PasswordReset = {
    token: randomToken(),
    userId: user.id,
    createdAt: nowIso(),
    expiresAt: addDaysIso(1),
  };
  store.resets.push(reset);
  await writeAuthStore(store);

  // For now, return the token so the UI can show a link.
  // In production, you should send this link via email.
  return { ok: true as const, token: reset.token };
}

export async function resetPassword(tokenRaw: string, newPassword: string) {
  const token = tokenRaw.trim();
  if (!token) return { ok: false as const, status: 400, error: "Jeton invalide" };
  if (!newPassword || newPassword.length < 8 || newPassword.length > 200) {
    return { ok: false as const, status: 400, error: "Mot de passe invalide (min 8 caractères)" };
  }

  const store = await readAuthStore();
  const resets = store.resets ?? [];
  const r = resets.find((x) => x.token === token);
  if (!r) return { ok: false as const, status: 400, error: "Lien expiré ou invalide" };
  if (r.usedAt) return { ok: false as const, status: 400, error: "Lien déjà utilisé" };
  if (new Date(r.expiresAt).getTime() <= Date.now()) {
    return { ok: false as const, status: 400, error: "Lien expiré" };
  }

  const user = store.users.find((u) => u.id === r.userId);
  if (!user) return { ok: false as const, status: 400, error: "Lien invalide" };

  const salt = Buffer.from(crypto.getRandomValues(new Uint8Array(16))).toString("hex");
  const passwordHash = await scryptHash(newPassword, salt);
  user.salt = salt;
  user.passwordHash = passwordHash;
  r.usedAt = nowIso();

  // Revoke all sessions for this user
  store.sessions = store.sessions.filter((s) => s.userId !== user.id);
  await writeAuthStore(store);

  return { ok: true as const };
}

