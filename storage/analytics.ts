import type { SessionRecord } from "./sessions";
import { toWeekKey } from "./streaks";

export type MomentumKind = "up" | "down" | "stable" | null;

export interface CompletionStats {
  total: number;
  completed: number;
  overallRate: number;
  byDuration: Record<number, { total: number; completed: number; rate: number }>;
}

export interface ThisWeekVsAverage {
  thisWeek: number;
  average: number;
  fourWeekAvg: number;
  trend: "up" | "down" | "stable" | "same";
}

export function getSessionTypeLabel(s: SessionRecord): string {
  if (s.completed === false) return "Stopped";
  const mins = s?.duration_minutes;
  if (typeof mins !== "number" || !Number.isFinite(mins)) return "Session";
  return `${mins} min`;
}

export function getMomentum(_sessions: SessionRecord[]): MomentumKind {
  return null;
}

export function getMilestoneMessage(_sessions: SessionRecord[]): string | null {
  return null;
}

export function getRecoveryRecommendation(todayCompleted: number): string {
  if (todayCompleted >= 4) return "15 min";
  if (todayCompleted >= 3) return "10 min";
  return "5 min";
}

export function getWorkloadWarning(_sessions: SessionRecord[]): string | null {
  return null;
}

export function getCompletionStats(sessions: SessionRecord[]): CompletionStats | null {
  const completed = sessions.filter((s) => s.completed !== false);
  const total = sessions.length;
  if (total === 0) return null;
  const byDuration: Record<number, { total: number; completed: number; rate: number }> = {};
  for (const s of sessions) {
    const d = s.duration_minutes;
    if (!byDuration[d]) byDuration[d] = { total: 0, completed: 0, rate: 0 };
    byDuration[d].total++;
    if (s.completed !== false) byDuration[d].completed++;
  }
  for (const d of Object.keys(byDuration)) {
    const n = Number(d);
    const b = byDuration[n];
    b.rate = b.total > 0 ? Math.round((b.completed / b.total) * 100) : 0;
  }
  const overallRate = total > 0 ? Math.round((completed.length / total) * 100) : 0;
  return {
    total,
    completed: completed.length,
    overallRate,
    byDuration,
  };
}

export function getBestPracticeSentence(_sessions: SessionRecord[]): string | null {
  return null;
}

export function getThisWeekVsAverage(sessions: SessionRecord[]): ThisWeekVsAverage | null {
  const completed = sessions.filter((s) => s.completed !== false && s.completed_at);
  const thisWeek = toWeekKey(new Date().toISOString());
  const thisWeekCount = completed.filter((s) => toWeekKey(s.completed_at!) === thisWeek).length;
  const byWeek = new Map<string, number>();
  for (const s of completed) {
    const wk = toWeekKey(s.completed_at!);
    byWeek.set(wk, (byWeek.get(wk) ?? 0) + 1);
  }
  const counts = Array.from(byWeek.values());
  const average = counts.length > 0 ? counts.reduce((a, b) => a + b, 0) / counts.length : 0;
  const fourWeekAvg = counts.length > 0 ? Math.round(average * 10) / 10 : 0;
  const trend: "up" | "down" | "stable" | "same" =
    counts.length === 0 ? "same" : thisWeekCount > average ? "up" : thisWeekCount < average ? "down" : "same";
  return {
    thisWeek: thisWeekCount,
    average: fourWeekAvg,
    fourWeekAvg,
    trend,
  };
}

export function getBestDayOfWeek(_sessions: SessionRecord[]): string | null {
  return null;
}

export function getRegressionMessage(_sessions: SessionRecord[]): string | null {
  return null;
}

const TIME_BUCKETS = [
  { name: "Morning", start: 6, end: 12 },
  { name: "Afternoon", start: 12, end: 17 },
  { name: "Evening", start: 17, end: 21 },
  { name: "Night", start: 21, end: 6 },
];

export function getBestPeakWindow(sessions: SessionRecord[]): { label: string; hours: string } | null {
  if (sessions.length === 0) return null;
  const completed = sessions.filter((s) => s.completed !== false && s.completed_at);
  if (completed.length === 0) return null;
  const bucketCounts = TIME_BUCKETS.map((b) => ({
    ...b,
    count: completed.filter((s) => {
      const h = new Date(s.completed_at!).getHours();
      if (b.start < b.end) return h >= b.start && h < b.end;
      return h >= b.start || h < b.end;
    }).length,
  }));
  const best = bucketCounts.reduce((a, b) => (b.count > a.count ? b : a), bucketCounts[0]);
  return { label: best.name, hours: `${best.start}:00–${best.end === 6 ? 24 : best.end}:00` };
}

export function getReflectionThemes(_sessions: SessionRecord[]): string[] {
  return [];
}

export function getDaysActiveThisWeek(sessions: SessionRecord[]): { active: number; total: number } | null {
  const completed = sessions.filter((s) => s.completed !== false && s.completed_at);
  const thisWeek = toWeekKey(new Date().toISOString());
  const days = new Set(
    completed.filter((s) => toWeekKey(s.completed_at!) === thisWeek).map((s) => new Date(s.completed_at!).toDateString())
  );
  return { active: days.size, total: 7 };
}

export function getAttentionSpanTrend(_sessions: SessionRecord[]): "up" | "down" | "stable" | null {
  return null;
}

export function getBurnoutRisk(_sessions: SessionRecord[]): string | null {
  return null;
}

export function getWeeklyCompletionCounts(sessions: SessionRecord[], weeks: number): number[] {
  const completed = sessions.filter((s) => s.completed !== false && s.completed_at);
  const byWeek = new Map<string, number>();
  for (const s of completed) {
    const wk = toWeekKey(s.completed_at!);
    byWeek.set(wk, (byWeek.get(wk) ?? 0) + 1);
  }
  const keys = Array.from(byWeek.keys()).sort((a, b) => b.localeCompare(a));
  return keys.slice(0, weeks).map((k) => byWeek.get(k) ?? 0);
}

export function getSuccessPatternSentence(
  _sessions: SessionRecord[],
  _bestDay: string | null,
  _peakWindow: { label: string; hours: string } | null
): string | null {
  return null;
}

export function getPersonalBaselineCopy(twa: ThisWeekVsAverage | null): string | null {
  if (!twa) return null;
  return `You completed ${twa.thisWeek} sessions this week.`;
}

export function getCompositeFocusScore(
  _sessions: SessionRecord[],
  dailyStreak: number,
  weeklyStreak: number
): number | null {
  return Math.min(100, (dailyStreak + weeklyStreak) * 10);
}
