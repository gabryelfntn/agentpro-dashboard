import { promises as fs } from "fs";
import path from "path";
import { addDays, formatISO, setHours, setMinutes, startOfDay } from "date-fns";
import {
  pgDeleteValue,
  pgReadValue,
  pgSql,
  pgWriteValue,
  usesPostgresDb,
} from "@/lib/dbPostgres";
import { isVercelRuntime, VERCEL_DB_HINT } from "@/lib/vercelStorage";
import type {
  AppDatabase,
  AuditEvent,
  Chantier,
  Contact,
  Devis,
  PlanningEvent,
  Profile,
  TaskItem,
  Workspace,
  WorkspaceRole,
} from "./types";

const DB_ROOT = path.join(process.cwd(), "data", "users");

function dbPathForUser(userId: string) {
  return path.join(DB_ROOT, userId, "db.json");
}

function dbKeyForUser(userId: string) {
  return `db:v1:${userId}`;
}

function profileKeyForUser(userId: string) {
  return `profile:v1:${userId}`;
}

const WORKSPACE_KEY = "workspace:v1";
const WORKSPACE_LOCAL_PATH = path.join(process.cwd(), "data", "workspace.json");
const WORKSPACE_DB_KEY = "workspace_db:v1";
const WORKSPACE_DB_LOCAL_PATH = path.join(process.cwd(), "data", "workspace-db.json");

export function usesRemoteDb(): boolean {
  return usesPostgresDb();
}

function nowIso() {
  return new Date().toISOString();
}

function isWorkspace(x: unknown): x is Workspace {
  return (
    typeof x === "object" &&
    x !== null &&
    (x as Workspace).version === 1 &&
    typeof (x as Workspace).ownerUserId === "string" &&
    typeof (x as Workspace).employees === "object" &&
    (x as Workspace).employees !== null
  );
}

export async function readWorkspace(): Promise<Workspace | null> {
  const sql = pgSql();
  if (sql) {
    const raw = await pgReadValue(sql, WORKSPACE_KEY);
    if (raw != null && raw !== "") {
      try {
        const parsed = JSON.parse(raw) as unknown;
        return isWorkspace(parsed) ? parsed : null;
      } catch {
        return null;
      }
    }
    return null;
  }

  try {
    const raw = await fs.readFile(WORKSPACE_LOCAL_PATH, "utf-8");
    const parsed = JSON.parse(raw) as unknown;
    return isWorkspace(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export async function writeWorkspace(workspace: Workspace): Promise<void> {
  const payload = JSON.stringify(workspace, null, 2);
  const sql = pgSql();
  if (sql) {
    await pgWriteValue(sql, WORKSPACE_KEY, payload);
    return;
  }
  if (isVercelRuntime()) {
    throw new Error(`Impossible d’écrire workspace.json sur Vercel sans Postgres. ${VERCEL_DB_HINT}`);
  }
  await fs.mkdir(path.dirname(WORKSPACE_LOCAL_PATH), { recursive: true });
  await fs.writeFile(WORKSPACE_LOCAL_PATH, payload, "utf-8");
}

export async function wipeWorkspaceStorage(): Promise<void> {
  const sql = pgSql();
  if (sql) {
    await pgDeleteValue(sql, WORKSPACE_KEY);
    return;
  }
  if (isVercelRuntime()) {
    throw new Error(`Réinitialisation impossible sans base Postgres sur Vercel. ${VERCEL_DB_HINT}`);
  }
  try {
    await fs.unlink(WORKSPACE_LOCAL_PATH);
  } catch {
    /* absent */
  }
}

export async function initWorkspaceIfMissing(ownerUserId: string): Promise<Workspace> {
  const existing = await readWorkspace();
  if (existing) return existing;
  const t = nowIso();
  const created: Workspace = {
    version: 1,
    ownerUserId,
    employees: {},
    invites: {},
    createdAt: t,
    updatedAt: t,
  };
  await writeWorkspace(created);
  return created;
}

export function getWorkspaceRole(workspace: Workspace, userId: string): WorkspaceRole | null {
  if (workspace.ownerUserId === userId) return "owner";
  const emp = workspace.employees[userId];
  return emp?.role ?? null;
}

export async function tryAcceptInviteForUser(args: {
  userId: string;
  email: string;
}): Promise<{ accepted: boolean; workspace: Workspace | null }> {
  const emailKey = args.email.trim().toLowerCase();
  if (!emailKey) return { accepted: false, workspace: null };
  const ws = await readWorkspace();
  if (!ws) return { accepted: false, workspace: null };
  if (ws.ownerUserId === args.userId) return { accepted: false, workspace: ws };
  if (ws.employees[args.userId]) return { accepted: false, workspace: ws };
  const inv = ws.invites?.[emailKey];
  if (!inv) return { accepted: false, workspace: ws };

  const t = nowIso();
  ws.employees[args.userId] = { role: inv.role, createdAt: t };
  if (ws.invites) delete ws.invites[emailKey];
  ws.updatedAt = t;
  await writeWorkspace(ws);
  return { accepted: true, workspace: ws };
}

export function appendAuditEvent(db: AppDatabase, ev: AuditEvent) {
  if (!Array.isArray(db.auditEvents)) db.auditEvents = [];
  db.auditEvents.push(ev);
  // Keep last 2000 events to avoid unbounded growth in KV/JSON.
  if (db.auditEvents.length > 2000) {
    db.auditEvents.splice(0, db.auditEvents.length - 2000);
  }
}

function isProfilePayload(x: unknown): x is Profile {
  return isProfile(x);
}

export async function readProfileForUser(userId: string): Promise<Profile> {
  const sql = pgSql();
  if (sql) {
    const raw = await pgReadValue(sql, profileKeyForUser(userId));
    if (raw != null && raw !== "") {
      try {
        const parsed = JSON.parse(raw) as unknown;
        if (isProfilePayload(parsed)) return parsed;
      } catch {
        /* fallback */
      }
    }
  } else {
    try {
      const raw = await fs.readFile(path.join(DB_ROOT, userId, "profile.json"), "utf-8");
      const parsed = JSON.parse(raw) as unknown;
      if (isProfilePayload(parsed)) return parsed;
    } catch {
      /* fallback */
    }
  }

  // Backward compat: read from legacy per-user db.
  const legacyDb = await readDbForUser(userId);
  const p = legacyDb.profile;
  await writeProfileForUser(userId, p);
  return p;
}

export async function writeProfileForUser(userId: string, profile: Profile): Promise<void> {
  const payload = JSON.stringify(profile, null, 2);
  const sql = pgSql();
  if (sql) {
    await pgWriteValue(sql, profileKeyForUser(userId), payload);
    return;
  }
  if (isVercelRuntime()) {
    throw new Error(`Impossible d’écrire le profil utilisateur sur Vercel sans Postgres. ${VERCEL_DB_HINT}`);
  }
  const p = path.join(DB_ROOT, userId, "profile.json");
  await fs.mkdir(path.dirname(p), { recursive: true });
  await fs.writeFile(p, payload, "utf-8");
}

export async function readWorkspaceDb(): Promise<AppDatabase | null> {
  const sql = pgSql();
  if (sql) {
    const raw = await pgReadValue(sql, WORKSPACE_DB_KEY);
    if (raw != null && raw !== "") {
      try {
        return normalizeAppDb(JSON.parse(raw));
      } catch {
        return null;
      }
    }
    return null;
  }
  try {
    const raw = await fs.readFile(WORKSPACE_DB_LOCAL_PATH, "utf-8");
    return normalizeAppDb(JSON.parse(raw));
  } catch {
    return null;
  }
}

export async function writeWorkspaceDb(db: AppDatabase): Promise<void> {
  const payload = JSON.stringify(db, null, 2);
  const sql = pgSql();
  if (sql) {
    await pgWriteValue(sql, WORKSPACE_DB_KEY, payload);
    return;
  }
  if (isVercelRuntime()) {
    throw new Error(`Impossible d’écrire workspace-db.json sur Vercel sans Postgres. ${VERCEL_DB_HINT}`);
  }
  await fs.mkdir(path.dirname(WORKSPACE_DB_LOCAL_PATH), { recursive: true });
  await fs.writeFile(WORKSPACE_DB_LOCAL_PATH, payload, "utf-8");
}

export async function initWorkspaceDbFromOwnerIfMissing(ownerUserId: string): Promise<AppDatabase> {
  const existing = await readWorkspaceDb();
  if (existing) return existing;
  // Seed from the owner's current per-user database for a smooth transition.
  const ownerDb = await readDbForUser(ownerUserId);
  await writeWorkspaceDb(ownerDb);
  return ownerDb;
}

export async function updateWorkspaceDb(mutator: (db: AppDatabase) => void): Promise<AppDatabase> {
  const db = (await readWorkspaceDb()) ?? buildDefaultDatabase();
  mutator(db);
  await writeWorkspaceDb(db);
  return db;
}

export async function wipeWorkspaceDbStorage(): Promise<void> {
  const sql = pgSql();
  if (sql) {
    await pgDeleteValue(sql, WORKSPACE_DB_KEY);
    return;
  }
  if (isVercelRuntime()) {
    throw new Error(`Réinitialisation impossible sans base Postgres sur Vercel. ${VERCEL_DB_HINT}`);
  }
  try {
    await fs.unlink(WORKSPACE_DB_LOCAL_PATH);
  } catch {
    /* absent */
  }
}

export async function wipeDbStorage(userId?: string): Promise<void> {
  const sql = pgSql();
  if (sql) {
    const key = userId ? dbKeyForUser(userId) : "main";
    await pgDeleteValue(sql, key);
    return;
  }
  if (isVercelRuntime()) {
    throw new Error(`Réinitialisation impossible sans base Postgres sur Vercel. ${VERCEL_DB_HINT}`);
  }
  try {
    if (!userId) {
      await fs.rm(DB_ROOT, { recursive: true, force: true });
      return;
    }
    await fs.unlink(dbPathForUser(userId));
  } catch {
    /* absent */
  }
}

function iso(d: Date) {
  return d.toISOString();
}

function rid() {
  return crypto.randomUUID();
}

function isProfile(x: unknown): x is Profile {
  return (
    typeof x === "object" &&
    x !== null &&
    "displayName" in x &&
    typeof (x as Profile).displayName === "string"
  );
}

export function normalizeAppDb(parsed: unknown): AppDatabase {
  const o = (parsed && typeof parsed === "object" ? parsed : {}) as Record<string, unknown>;
  const d = buildDefaultDatabase();
  const chantiers = Array.isArray(o.chantiers) ? (o.chantiers as Chantier[]) : d.chantiers;
  const legacy = !("planningEvents" in o);
  const now = new Date();
  const ids = chantiers.map((c) => c.id);
  const auditEvents = Array.isArray(o.auditEvents) ? (o.auditEvents as AuditEvent[]) : [];

  return {
    profile: isProfile(o.profile) ? o.profile : d.profile,
    chantiers,
    devis: Array.isArray(o.devis) ? (o.devis as Devis[]) : d.devis,
    planningEvents: Array.isArray(o.planningEvents)
      ? (o.planningEvents as PlanningEvent[])
      : legacy
        ? seedPlanning(now, ids)
        : [],
    tasks: Array.isArray(o.tasks) ? (o.tasks as TaskItem[]) : legacy ? seedTasks(now, ids) : [],
    contacts: Array.isArray(o.contacts) ? (o.contacts as Contact[]) : legacy ? seedContacts(now) : [],
    terrainJobs: Array.isArray(o.terrainJobs) ? o.terrainJobs : [],
    mediaDocuments: Array.isArray(o.mediaDocuments) ? o.mediaDocuments : [],
    auditEvents,
  };
}

function seedPlanning(now: Date, chantierIds: string[]): PlanningEvent[] {
  const c0 = chantierIds[0] ?? undefined;
  const c1 = chantierIds[1] ?? c0;
  const day = startOfDay(now);
  const mk = (offset: number, h0: number, m0: number, h1: number, m1: number) => {
    const d = addDays(day, offset);
    return {
      debut: formatISO(setMinutes(setHours(d, h0), m0)),
      fin: formatISO(setMinutes(setHours(d, h1), m1)),
    };
  };
  return [
    {
      id: rid(),
      titre: "Visite chantier — électricité",
      description: "Relevé tableau et préparation MES",
      ...mk(1, 9, 0, 11, 0),
      toutJournee: false,
      type: "visite" as const,
      chantierId: c0,
      lieu: "Sur place",
      rappelMinutes: 60,
    },
    {
      id: rid(),
      titre: "Livraison menuiseries",
      ...mk(2, 14, 0, 15, 30),
      toutJournee: false,
      type: "livraison" as const,
      chantierId: c1,
      lieu: "Base logistique",
    },
    {
      id: rid(),
      titre: "Rendez-vous client",
      description: "Validation choix finitions salle de bain",
      ...mk(3, 10, 30, 12, 0),
      toutJournee: false,
      type: "rdv_client" as const,
      chantierId: c0,
    },
    {
      id: rid(),
      titre: "Réunion interne planning",
      ...mk(4, 8, 0, 9, 0),
      toutJournee: false,
      type: "admin" as const,
    },
    {
      id: rid(),
      titre: "Intervention gros œuvre",
      ...mk(5, 7, 0, 16, 0),
      toutJournee: true,
      type: "chantier" as const,
      chantierId: c1,
    },
  ];
}

function seedTasks(now: Date, chantierIds: string[]): TaskItem[] {
  const c0 = chantierIds[0];
  const t = iso(now);
  return [
    {
      id: rid(),
      titre: "Envoyer devis relance clients « en attente »",
      fait: false,
      priorite: "haute",
      echeance: formatISO(addDays(startOfDay(now), 2)),
      createdAt: t,
      updatedAt: t,
    },
    {
      id: rid(),
      titre: "Commander matériaux isolation Lot 2",
      description: "Fournisseur principal + plan B",
      fait: false,
      priorite: "normale",
      chantierId: c0,
      createdAt: t,
      updatedAt: t,
    },
    {
      id: rid(),
      titre: "Mettre à jour photos dossier assurance",
      fait: true,
      priorite: "basse",
      createdAt: t,
      updatedAt: t,
    },
  ];
}

function seedContacts(now: Date): Contact[] {
  const t = iso(now);
  return [
    {
      id: rid(),
      nom: "Claire Dumont",
      societe: "SARL Patrimoine 1",
      email: "c.dumont@example.com",
      telephone: "+33 6 12 34 56 78",
      role: "Maître d’ouvrage",
      notes: "Préfère les échanges par e-mail le matin.",
      createdAt: t,
    },
    {
      id: rid(),
      nom: "Karim Benali",
      societe: "Gym Impact",
      telephone: "+33 7 98 76 54 32",
      role: "Gérant",
      createdAt: t,
    },
  ];
}

function buildDefaultDatabase(): AppDatabase {
  const now = new Date();
  const chantiers: Chantier[] = [];
  for (let i = 1; i <= 12; i++) {
    chantiers.push({
      id: `c-${i}`,
      nom: `Rénovation appartement — Lot ${i}`,
      client: `SARL Patrimoine ${i}`,
      statut: "en_cours",
      updatedAt: iso(now),
    });
  }
  chantiers.push(
    {
      id: "c-13",
      nom: "Extension maison individuelle",
      client: "M. & Mme Dupont",
      statut: "planifie",
      updatedAt: iso(now),
    },
    {
      id: "c-14",
      nom: "Salle de bain complète",
      client: "SCI Bellevue",
      statut: "termine",
      updatedAt: iso(now),
    },
  );

  const chantierIds = chantiers.map((c) => c.id);

  const devis: Devis[] = [];
  const pendingClients = [
    "Atelier Lumière",
    "Cabinet Médical Verdun",
    "Résidence Les Pins",
    "Boulangerie Martin",
    "Garage Auto-Nord",
    "École Jean Jaurès",
    "Hôtel Riviera",
    "Startup Flowdesk",
  ];
  for (let i = 0; i < 8; i++) {
    devis.push({
      id: `d-p-${i + 1}`,
      reference: `DEV-2026-${String(120 + i)}`,
      client: pendingClients[i] ?? `Client ${i}`,
      montantTtc: 12000 + i * 3500,
      statut: "en_attente",
      createdAt: iso(new Date(now.getFullYear(), now.getMonth() - 1, 5 + i)),
    });
  }

  const acceptes: { ref: string; client: string; montantTtc: number; day: number }[] = [
    { ref: "DEV-2026-081", client: "Résidence Les Alpilles", montantTtc: 20800, day: 4 },
    { ref: "DEV-2026-084", client: "Clinique Sud", montantTtc: 20400, day: 11 },
    { ref: "DEV-2026-086", client: "Restaurant Le Phare", montantTtc: 20600, day: 18 },
    { ref: "DEV-2026-089", client: "Coworking Latitude", montantTtc: 20700, day: 25 },
    { ref: "DEV-2026-093", client: "Mairie annexe", montantTtc: 20500, day: 6 },
    { ref: "DEV-2026-095", client: "Gym Impact", montantTtc: 20900, day: 15 },
    { ref: "DEV-2026-098", client: "Pharmacie du Parc", montantTtc: 20300, day: 22 },
    { ref: "DEV-2026-102", client: "Bureaux Horizon", montantTtc: 20800, day: 28 },
  ];
  acceptes.forEach((row, i) => {
    devis.push({
      id: `d-a-${i + 1}`,
      reference: row.ref,
      client: row.client,
      montantTtc: row.montantTtc,
      statut: "accepte",
      createdAt: iso(new Date(now.getFullYear(), now.getMonth() - 3 + (i % 4), row.day)),
    });
  });

  devis.push(
    {
      id: "d-r-1",
      reference: "DEV-2026-055",
      client: "Commerce Centre-Ville",
      montantTtc: 28000,
      statut: "refuse",
      createdAt: iso(new Date(now.getFullYear(), now.getMonth() - 2, 20)),
    },
    {
      id: "d-r-2",
      reference: "DEV-2026-061",
      client: "Bureaux Delta",
      montantTtc: 45000,
      statut: "refuse",
      createdAt: iso(new Date(now.getFullYear(), now.getMonth() - 1, 2)),
    },
    {
      id: "d-r-3",
      reference: "DEV-2026-108",
      client: "Parking Municipal",
      montantTtc: 12000,
      statut: "refuse",
      createdAt: iso(new Date(now.getFullYear(), now.getMonth() - 1, 19)),
    },
  );

  return {
    profile: { displayName: "Gabryel FEUNTEUN" },
    chantiers,
    devis,
    planningEvents: seedPlanning(now, chantierIds),
    tasks: seedTasks(now, chantierIds),
    contacts: seedContacts(now),
    terrainJobs: [],
    mediaDocuments: [],
    auditEvents: [],
  };
}

export async function readDb(): Promise<AppDatabase> {
  // Backward compatibility: single shared DB (legacy).
  const sql = pgSql();
  if (sql) {
    const raw = await pgReadValue(sql, "main");
    if (raw != null && raw !== "") {
      try {
        return normalizeAppDb(JSON.parse(raw));
      } catch {
        /* fallback fresh */
      }
    }
    const fresh = buildDefaultDatabase();
    await writeDb(fresh);
    return fresh;
  }

  try {
    const raw = await fs.readFile(path.join(process.cwd(), "data", "db.json"), "utf-8");
    return normalizeAppDb(JSON.parse(raw));
  } catch {
    if (isVercelRuntime()) {
      throw new Error(
        `Aucune base Postgres configurée sur Vercel (fichier local absent). ${VERCEL_DB_HINT}`,
      );
    }
    const fresh = buildDefaultDatabase();
    await writeDb(fresh);
    return fresh;
  }
}

export async function writeDb(data: AppDatabase): Promise<void> {
  // Backward compatibility: single shared DB (legacy).
  const payload = JSON.stringify(data, null, 2);
  const sql = pgSql();
  if (sql) {
    await pgWriteValue(sql, "main", payload);
    return;
  }
  if (isVercelRuntime()) {
    throw new Error(`Impossible d’écrire data/db.json sur Vercel. ${VERCEL_DB_HINT}`);
  }
  const legacyPath = path.join(process.cwd(), "data", "db.json");
  await fs.mkdir(path.dirname(legacyPath), { recursive: true });
  await fs.writeFile(legacyPath, payload, "utf-8");
}

export async function updateDb(mutator: (db: AppDatabase) => void): Promise<AppDatabase> {
  const db = await readDb();
  mutator(db);
  await writeDb(db);
  return db;
}

export async function readDbForUser(userId: string): Promise<AppDatabase> {
  const sql = pgSql();
  if (sql) {
    const raw = await pgReadValue(sql, dbKeyForUser(userId));
    if (raw != null && raw !== "") {
      try {
        return normalizeAppDb(JSON.parse(raw));
      } catch {
        /* fallback fresh */
      }
    }
    const fresh = buildDefaultDatabase();
    await writeDbForUser(userId, fresh);
    return fresh;
  }

  try {
    const raw = await fs.readFile(dbPathForUser(userId), "utf-8");
    return normalizeAppDb(JSON.parse(raw));
  } catch {
    if (isVercelRuntime()) {
      throw new Error(
        `Aucune base Postgres configurée sur Vercel (stockage local absent). ${VERCEL_DB_HINT}`,
      );
    }
    const fresh = buildDefaultDatabase();
    await writeDbForUser(userId, fresh);
    return fresh;
  }
}

export async function writeDbForUser(userId: string, data: AppDatabase): Promise<void> {
  const payload = JSON.stringify(data, null, 2);
  const sql = pgSql();
  if (sql) {
    await pgWriteValue(sql, dbKeyForUser(userId), payload);
    return;
  }
  if (isVercelRuntime()) {
    throw new Error(`Impossible d’écrire la base utilisateur sur Vercel sans Postgres. ${VERCEL_DB_HINT}`);
  }
  const p = dbPathForUser(userId);
  await fs.mkdir(path.dirname(p), { recursive: true });
  await fs.writeFile(p, payload, "utf-8");
}

export async function updateDbForUser(
  userId: string,
  mutator: (db: AppDatabase) => void,
): Promise<AppDatabase> {
  const db = await readDbForUser(userId);
  mutator(db);
  await writeDbForUser(userId, db);
  return db;
}

export {
  UPLOADS_ROOT,
  uploadsWrite,
  uploadsRead,
  uploadsRemovePrefix,
  blobUploadsEnabled,
} from "./uploadsStorage";
