import type { SessionRecord } from "./sessions";

/**
 * Returns a YYYY-MM-DD date key in local time for the given ISO timestamp.
 */
function toLocalDateKey(iso: string): string {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Returns an ISO week key (e.g. "2025-W05") for the given ISO timestamp.
 * Week starts on Monday. Returns "invalid" if iso is missing or not a valid date.
 */
export function toWeekKey(iso: string): string {
  if (!iso || typeof iso !== "string") return "invalid";
  const d = new Date(iso);
  const t = d.getTime();
  if (!Number.isFinite(t)) return "invalid";
  const startOfYear = new Date(d.getFullYear(), 0, 1);
  const days = Math.floor(
    (t - startOfYear.getTime()) / (24 * 60 * 60 * 1000)
  );
  const janDay = startOfYear.getDay();
  const weekStartOffset = janDay === 0 ? 6 : janDay - 1;
  const weekNum = Math.floor((days + weekStartOffset) / 7) + 1;
  const year = d.getFullYear();
  if (!Number.isFinite(year) || !Number.isFinite(weekNum)) return "invalid";
  return `${year}-W${String(weekNum).padStart(2, "0")}`;
}

function isValidDate(iso: string): boolean {
  const t = new Date(iso).getTime();
  return Number.isFinite(t);
}

export function getDailyStreak(sessions: SessionRecord[]): number {
  if (!Array.isArray(sessions)) return 0;
  const completed = sessions.filter(
    (s) => s.completed !== false && s.completed_at && isValidDate(s.completed_at)
  );
  if (completed.length === 0) return 0;

  const dateKeys = Array.from(
    new Set(completed.map((s) => toLocalDateKey(s.completed_at)))
  ).sort((a, b) => b.localeCompare(a));

  const today = toLocalDateKey(new Date().toISOString());
  const yesterday = toLocalDateKey(
    new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  );

  if (dateKeys[0] !== today && dateKeys[0] !== yesterday) return 0;

  const previousDayKey = (key: string): string => {
    const [y, m, d] = key.split("-").map(Number);
    const prev = new Date(y, m - 1, d - 1);
    const py = prev.getFullYear();
    const pm = String(prev.getMonth() + 1).padStart(2, "0");
    const pd = String(prev.getDate()).padStart(2, "0");
    return `${py}-${pm}-${pd}`;
  };

  let count = 0;
  let expected = dateKeys[0];
  for (const key of dateKeys) {
    if (key !== expected) break;
    count++;
    expected = previousDayKey(expected);
  }
  return count;
}

function previousWeekKey(weekKey: string): string {
  const [y, w] = weekKey.split("-W").map(Number);
  if (w > 1) return `${y}-W${String(w - 1).padStart(2, "0")}`;
  return `${y - 1}-W52`;
}

/**
 * Consecutive weeks (Mon–Sun) with at least one completed session, ending at current week.
 * Only completed sessions with valid completed_at are counted.
 */
export function getWeeklyStreak(sessions: SessionRecord[]): number {
  if (!Array.isArray(sessions)) return 0;
  const completed = sessions.filter(
    (s) => s.completed !== false && s.completed_at && isValidDate(s.completed_at)
  );
  if (completed.length === 0) return 0;

  const weekKeys = Array.from(
    new Set(completed.map((s) => toWeekKey(s.completed_at)))
  ).sort((a, b) => b.localeCompare(a));

  const thisWeek = toWeekKey(new Date().toISOString());
  if (weekKeys[0] !== thisWeek) return 0;

  let count = 0;
  let expected: string = weekKeys[0];
  for (const key of weekKeys) {
    if (key !== expected) break;
    count++;
    expected = previousWeekKey(expected);
  }
  return count;
}

/**
 * Returns the highest number of completed sessions in any single week (Mon–Sun).
 * Used for milestone messages like "3 more to match your best week (8)".
 */
export function getBestWeekCount(sessions: SessionRecord[]): number {
  if (!Array.isArray(sessions)) return 0;
  const completed = sessions.filter(
    (s) => s.completed !== false && s.completed_at && isValidDate(s.completed_at)
  );
  if (completed.length === 0) return 0;
  const byWeek = new Map<string, number>();
  for (const s of completed) {
    const wk = toWeekKey(s.completed_at);
    byWeek.set(wk, (byWeek.get(wk) ?? 0) + 1);
  }
  return Math.max(0, ...byWeek.values());
}
