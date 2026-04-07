import { promises as fs } from "fs";
import path from "path";
import { addDays, formatISO, setHours, setMinutes, startOfDay } from "date-fns";
import { pgDeletePayload, pgReadPayload, pgSql, pgWritePayload, usesPostgresDb } from "@/lib/dbPostgres";
import { isVercelRuntime, VERCEL_DB_HINT } from "@/lib/vercelStorage";
import type {
  AppDatabase,
  Chantier,
  Contact,
  Devis,
  PlanningEvent,
  Profile,
  TaskItem,
} from "./types";

const DB_PATH = path.join(process.cwd(), "data", "db.json");

export function usesRemoteDb(): boolean {
  return usesPostgresDb();
}

export async function wipeDbStorage(): Promise<void> {
  const sql = pgSql();
  if (sql) {
    await pgDeletePayload(sql);
    return;
  }
  if (isVercelRuntime()) {
    throw new Error(`Réinitialisation impossible sans base Postgres sur Vercel. ${VERCEL_DB_HINT}`);
  }
  try {
    await fs.unlink(DB_PATH);
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
  };
}

export async function readDb(): Promise<AppDatabase> {
  const sql = pgSql();
  if (sql) {
    const raw = await pgReadPayload(sql);
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
    const raw = await fs.readFile(DB_PATH, "utf-8");
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
  const payload = JSON.stringify(data, null, 2);
  const sql = pgSql();
  if (sql) {
    await pgWritePayload(sql, payload);
    return;
  }
  if (isVercelRuntime()) {
    throw new Error(`Impossible d’écrire data/db.json sur Vercel. ${VERCEL_DB_HINT}`);
  }
  await fs.mkdir(path.dirname(DB_PATH), { recursive: true });
  await fs.writeFile(DB_PATH, payload, "utf-8");
}

export async function updateDb(mutator: (db: AppDatabase) => void): Promise<AppDatabase> {
  const db = await readDb();
  mutator(db);
  await writeDb(db);
  return db;
}

export {
  UPLOADS_ROOT,
  uploadsWrite,
  uploadsRead,
  uploadsRemovePrefix,
  useBlobUploads,
} from "./uploadsStorage";
