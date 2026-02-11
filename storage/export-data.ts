import { loadAppState } from "@/storage/app-state";
import { getSessions, type SessionRecord } from "@/storage/sessions";

export interface ExportPayload {
  exported_at: string;
  app_state: Awaited<ReturnType<typeof loadAppState>>;
  sessions: SessionRecord[];
}

/**
 * Loads all app data from device storage and returns an object suitable for JSON export.
 */
export async function buildExportPayload(): Promise<ExportPayload> {
  const [app_state, sessions] = await Promise.all([
    loadAppState(),
    getSessions(),
  ]);
  return {
    exported_at: new Date().toISOString(),
    app_state,
    sessions,
  };
}

/**
 * Returns export data as a JSON string (from device storage).
 */
export async function buildExportJSON(): Promise<string> {
  const payload = await buildExportPayload();
  return JSON.stringify(payload, null, 2);
}

const CSV_HEADERS = "duration_minutes,completed_at,completed,reflection";

function escapeCsvCell(value: string | number | boolean | undefined): string {
  if (value === undefined || value === null) return "";
  const s = String(value);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

/**
 * Returns sessions as CSV string (from device storage).
 */
export async function buildExportCSV(): Promise<string> {
  const sessions = await getSessions();
  const rows = sessions.map(
    (s) =>
      [
        s.duration_minutes,
        s.completed_at,
        s.completed === false ? "false" : "true",
        s.reflection ?? "",
      ].map(escapeCsvCell).join(",")
  );
  return [CSV_HEADERS, ...rows].join("\n");
}
