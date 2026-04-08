import { NextResponse } from "next/server";
import { readWorkspaceDb } from "@/lib/db";
import { withAuthz } from "@/lib/authz/withAuthz";

function escapeCsv(s: string) {
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export async function GET() {
  return withAuthz("export:download", {
    audit: { action: "export", entity: "export" },
    handler: async () => {
      const db = await readWorkspaceDb();
      const lines: string[] = [];
      lines.push("type,id,champs");
      for (const c of db?.chantiers ?? []) {
    lines.push(
      [
        "chantier",
        escapeCsv(c.id),
        escapeCsv(
          `${c.nom}|${c.client}|${c.statut}|${c.updatedAt}`,
        ),
      ].join(","),
    );
  }
  for (const d of db?.devis ?? []) {
    lines.push(
      [
        "devis",
        escapeCsv(d.id),
        escapeCsv(
          `${d.reference}|${d.client}|${d.montantTtc}|${d.statut}|${d.createdAt}`,
        ),
      ].join(","),
    );
  }
  for (const e of db?.planningEvents ?? []) {
    lines.push(
      [
        "planning",
        escapeCsv(e.id),
        escapeCsv(`${e.titre}|${e.debut}|${e.fin}|${e.type}|${e.chantierId ?? ""}|${e.lieu ?? ""}`),
      ].join(","),
    );
  }
  for (const t of db?.tasks ?? []) {
    lines.push(
      [
        "tache",
        escapeCsv(t.id),
        escapeCsv(
          `${t.titre}|${t.fait}|${t.priorite}|${t.echeance ?? ""}|${t.chantierId ?? ""}`,
        ),
      ].join(","),
    );
  }
  for (const c of db?.contacts ?? []) {
    lines.push(
      [
        "contact",
        escapeCsv(c.id),
        escapeCsv(`${c.nom}|${c.societe ?? ""}|${c.email ?? ""}|${c.telephone ?? ""}|${c.role}`),
      ].join(","),
    );
  }
  for (const j of db?.terrainJobs ?? []) {
    lines.push(
      [
        "vision_ia",
        escapeCsv(j.id),
        escapeCsv(`${j.status}|${j.briefEntreprise.slice(0, 80)}|${j.createdAt}`),
      ].join(","),
    );
  }
      const csv = lines.join("\n");
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="agentpro-export-${new Date().toISOString().slice(0, 10)}.csv"`,
        },
      });
    },
  });
}
