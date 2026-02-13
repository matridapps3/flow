import { loadAppState } from "./app-state";
import type { SessionRecord } from "./sessions";
import { getSessions } from "./sessions";

export async function buildExportJSON(): Promise<string> {
  const [rawSessions, state] = await Promise.all([getSessions(), loadAppState()]);
  const sessions = Array.isArray(rawSessions) ? rawSessions : [];
  const payload = { exported_at: new Date().toISOString(), sessions, app_state: state };
  return JSON.stringify(payload, null, 2);
}

export async function buildExportCSV(): Promise<string> {
  const raw = await getSessions();
  const sessions = Array.isArray(raw) ? raw : [];
  const header = "duration_minutes,completed_at,completed,reflection";
  const rows = sessions.map((s: SessionRecord) => {
    const ref = (s.reflection ?? "").replace(/"/g, '""');
    const completedAt = s.completed_at != null ? String(s.completed_at) : "";
    return `${s.duration_minutes ?? ""},${completedAt},${s.completed !== false},${ref ? `"${ref}"` : ""}`;
  });
  return [header, ...rows].join("\n");
}
