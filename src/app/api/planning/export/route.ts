import { NextResponse } from "next/server";
import { format, parseISO } from "date-fns";
import { readDbForUser } from "@/lib/db";
import { getAuthenticatedUserId, unauthorizedJson } from "@/lib/auth";

function esc(s: string) {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

function icsUtc(d: Date) {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

export async function GET() {
  const userId = await getAuthenticatedUserId();
  if (!userId) return unauthorizedJson();
  const db = await readDbForUser(userId);
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//AgentPro//Planning//FR",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:AgentPro Planning",
  ];

  for (const e of db.planningEvents) {
    const start = parseISO(e.debut);
    const end = parseISO(e.fin);
    lines.push(
      "BEGIN:VEVENT",
      `UID:${e.id}@agentpro.local`,
      `DTSTAMP:${icsUtc(new Date())}`,
      e.toutJournee
        ? `DTSTART;VALUE=DATE:${format(start, "yyyyMMdd")}`
        : `DTSTART:${icsUtc(start)}`,
      e.toutJournee
        ? `DTEND;VALUE=DATE:${format(end, "yyyyMMdd")}`
        : `DTEND:${icsUtc(end)}`,
      `SUMMARY:${esc(e.titre)}`,
    );
    if (e.description) lines.push(`DESCRIPTION:${esc(e.description)}`);
    if (e.lieu) lines.push(`LOCATION:${esc(e.lieu)}`);
    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");
  const body = lines.join("\r\n");

  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="agentpro-planning.ics"',
    },
  });
}
