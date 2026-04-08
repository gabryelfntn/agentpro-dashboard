export type ChantierStatut = "en_cours" | "planifie" | "termine";

export type DevisStatut = "en_attente" | "accepte" | "refuse";

export type Chantier = {
  id: string;
  nom: string;
  client: string;
  statut: ChantierStatut;
  updatedAt: string;
};

export type Devis = {
  id: string;
  reference: string;
  client: string;
  montantTtc: number;
  statut: DevisStatut;
  createdAt: string;
};

export type Profile = {
  displayName: string;
};

export type PlanningEventType = "visite" | "chantier" | "livraison" | "admin" | "rdv_client" | "autre";

export type PlanningEvent = {
  id: string;
  titre: string;
  description?: string;
  debut: string;
  fin: string;
  toutJournee: boolean;
  type: PlanningEventType;
  chantierId?: string;
  lieu?: string;
  rappelMinutes?: number;
  couleur?: string;
};

export type TaskPriority = "basse" | "normale" | "haute" | "urgente";

export type TaskItem = {
  id: string;
  titre: string;
  description?: string;
  fait: boolean;
  echeance?: string;
  priorite: TaskPriority;
  chantierId?: string;
  createdAt: string;
  updatedAt: string;
};

export type Contact = {
  id: string;
  nom: string;
  societe?: string;
  email?: string;
  telephone?: string;
  role: string;
  notes?: string;
  createdAt: string;
};

export type TerrainJobStatus = "en_attente" | "en_cours" | "termine" | "erreur";

export type TerrainJob = {
  id: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
  briefEntreprise: string;
  consigne: string;
  chantierId?: string;
  sourceRelPath: string;
  resultRelPath?: string;
  status: TerrainJobStatus;
  erreur?: string;
  meta?: { modele?: string; dureeMs?: number };
};

export type MediaDocument = {
  id: string;
  nomFichier: string;
  relPath: string;
  mime: string;
  taille: number;
  createdAt: string;
  chantierId?: string;
};

export type WorkspaceRole = "owner" | "employee" | "manager" | "accountant";

export type WorkspaceEmployee = {
  role: Exclude<WorkspaceRole, "owner">;
  createdAt: string;
};

export type WorkspaceInvite = {
  role: Exclude<WorkspaceRole, "owner">;
  createdAt: string;
  createdByUserId: string;
};

export type Workspace = {
  version: 1;
  ownerUserId: string;
  employees: Record<string, WorkspaceEmployee>;
  invites?: Record<string, WorkspaceInvite>;
  createdAt: string;
  updatedAt: string;
};

export type AuditEntity =
  | "chantier"
  | "devis"
  | "contact"
  | "planning_event"
  | "task"
  | "media"
  | "terrain_job"
  | "profile"
  | "dashboard"
  | "export"
  | "planning_export"
  | "uploads"
  | "reset"
  | "workspace";

export type AuditAction =
  | "read"
  | "create"
  | "update"
  | "delete"
  | "export"
  | "upload"
  | "reset"
  | "authz_denied";

export type AuditEvent = {
  id: string;
  at: string;
  actorUserId: string;
  actorRole: WorkspaceRole;
  action: AuditAction;
  entity: AuditEntity;
  entityId?: string;
  ok: boolean;
  reason?: string;
};

export type AppDatabase = {
  profile: Profile;
  chantiers: Chantier[];
  devis: Devis[];
  planningEvents: PlanningEvent[];
  tasks: TaskItem[];
  contacts: Contact[];
  terrainJobs: TerrainJob[];
  mediaDocuments: MediaDocument[];
  auditEvents: AuditEvent[];
};

export type KpiPayload = {
  chiffreAffaires: number;
  chiffreAffairesTrendPct: number;
  chantiersActifs: number;
  chantiersSousTitre: string;
  devisEnAttente: number;
  devisSousTitre: string;
  tauxConversion: number;
  tauxConversionTrendPct: number;
};

export type ChartPoint = { label: string; value: number };

export type DashboardPayload = {
  kpis: KpiPayload;
  revenue: ChartPoint[];
  conversion: ChartPoint[];
};
