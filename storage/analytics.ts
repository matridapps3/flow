import type { SessionRecord } from "./sessions";
import { DURATIONS } from "./constants";
import { getBestWeekCount, toWeekKey } from "./streaks";

/** Guard: only use for date/week math when completed_at is valid. */
function isValidCompletedAt(iso: string | undefined): iso is string {
  return !!iso && typeof iso === "string" && Number.isFinite(new Date(iso).getTime());
}

export interface CompletionByDuration {
  total: number;
  completed: number;
  rate: number;
}

export interface CompletionStats {
  total: number;
  completed: number;
  overallRate: number;
  byDuration: Record<number, CompletionByDuration>;
}

/**
 * Returns completion stats (overall and by duration) from session list.
 * Uses only device storage data; no new persistence. Safe when sessions is null/undefined or empty.
 */
export function getCompletionStats(sessions: SessionRecord[]): CompletionStats {
  const list = Array.isArray(sessions) ? sessions : [];
  const completed = list.filter((s) => s.completed !== false);
  const total = list.length;
  const overallRate = total > 0 ? Math.round((completed.length / total) * 100) : 0;

  const byDuration: Record<number, CompletionByDuration> = {};
  for (const d of DURATIONS) {
    const forDur = list.filter((s) => s.duration_minutes === d);
    const completedDur = forDur.filter((s) => s.completed !== false);
    byDuration[d] = {
      total: forDur.length,
      completed: completedDur.length,
      rate: forDur.length > 0 ? Math.round((completedDur.length / forDur.length) * 100) : 0,
    };
  }

  return {
    total,
    completed: completed.length,
    overallRate,
    byDuration,
  };
}

const MIN_SESSIONS_FOR_BEST_PRACTICE = 3;
const TIME_BUCKETS = [
  { name: "morning", start: 6, end: 12 },
  { name: "afternoon", start: 12, end: 18 },
  { name: "evening", start: 18, end: 24 },
] as const;

function getTimeBucket(iso: string): (typeof TIME_BUCKETS)[number]["name"] | null {
  if (!iso || typeof iso !== "string") return null;
  const d = new Date(iso);
  const h = d.getHours();
  if (!Number.isFinite(h)) return null;
  for (const b of TIME_BUCKETS) {
    if (h >= b.start && h < b.end) return b.name;
  }
  return "evening";
}

/**
 * Returns one best-practice sentence from session data, or null if not enough data.
 * Picks the (duration, time bucket) with highest completion rate (min 3 sessions).
 */
export function getBestPracticeSentence(sessions: SessionRecord[]): string | null {
  const completed = sessions.filter(
    (s) => s.completed !== false && isValidCompletedAt(s.completed_at)
  );
  if (completed.length < MIN_SESSIONS_FOR_BEST_PRACTICE) return null;

  const buckets: Array<(typeof TIME_BUCKETS)[number]["name"]> = [
    "morning",
    "afternoon",
    "evening",
  ];
  let best: { rate: number; total: number; duration: number; bucket: string } | null = null;

  for (const dur of DURATIONS) {
    for (const bucket of buckets) {
      const totalForCell = sessions.filter(
        (s) =>
          s.duration_minutes === dur &&
          isValidCompletedAt(s.completed_at) &&
          getTimeBucket(s.completed_at!) === bucket
      ).length;
      if (totalForCell < MIN_SESSIONS_FOR_BEST_PRACTICE) continue;
      const completedInCell = completed.filter(
        (s) =>
          s.duration_minutes === dur && getTimeBucket(s.completed_at!) === bucket
      );
      const rate = Math.round((completedInCell.length / totalForCell) * 100);
      if (!best || rate > best.rate) {
        best = {
          rate,
          total: completedInCell.length,
          duration: dur,
          bucket,
        };
      }
    }
  }

  if (!best) return null;
  const bucketLabel =
    best.bucket.charAt(0).toUpperCase() + best.bucket.slice(1);
  return `Your ${best.duration} min ${bucketLabel} sessions have ${best.rate}% completion.`;
}

/** Time bucket for a session (used by getSessionTypeLabel). */
export function getTimeBucketForSession(iso: string | undefined): (typeof TIME_BUCKETS)[number]["name"] {
  const b = iso ? getTimeBucket(iso) : null;
  return b ?? "evening";
}

/**
 * Human-readable session type from duration + time of day (e.g. "Short morning", "Long afternoon").
 * No new storage; inferred from completed_at and duration_minutes. Safe when completed_at is missing/invalid.
 */
export function getSessionTypeLabel(session: SessionRecord): string {
  const bucket = getTimeBucketForSession(session?.completed_at);
  const label = bucket.charAt(0).toUpperCase() + bucket.slice(1);
  const duration = typeof session.duration_minutes === "number" ? session.duration_minutes : 25;
  if (duration <= 25) return `Short ${label}`;
  if (duration <= 45) return `Medium ${label}`;
  return `Long ${label}`;
}

/** Momentum: compare this week's completed count vs last week's. */
export type MomentumKind = "up" | "down" | "sustaining";

export function getMomentum(sessions: SessionRecord[]): MomentumKind | null {
  const completed = sessions.filter(
    (s) => s.completed !== false && isValidCompletedAt(s.completed_at)
  );
  if (completed.length === 0) return null;
  const thisWeekKey = toWeekKey(new Date().toISOString());
  const lastWeekKey = (() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return toWeekKey(d.toISOString());
  })();
  const thisWeekCount = completed.filter(
    (s) => isValidCompletedAt(s.completed_at) && toWeekKey(s.completed_at!) === thisWeekKey
  ).length;
  const lastWeekCount = completed.filter(
    (s) => isValidCompletedAt(s.completed_at) && toWeekKey(s.completed_at!) === lastWeekKey
  ).length;
  if (lastWeekCount === 0) return thisWeekCount > 0 ? "up" : null;
  if (thisWeekCount > lastWeekCount) return "up";
  if (thisWeekCount < lastWeekCount) return "down";
  return "sustaining";
}

/**
 * Message like "3 more sessions to match your best week (8)." or null.
 */
export function getMilestoneMessage(sessions: SessionRecord[]): string | null {
  const best = getBestWeekCount(sessions);
  if (best <= 0) return null;
  const thisWeekKey = toWeekKey(new Date().toISOString());
  const completedThisWeek = sessions.filter(
    (s) =>
      s.completed !== false &&
      isValidCompletedAt(s.completed_at) &&
      toWeekKey(s.completed_at!) === thisWeekKey
  ).length;
  const needed = best - completedThisWeek;
  if (needed <= 0) return null;
  return `${needed} more session${needed === 1 ? "" : "s"} to match your best week (${best}).`;
}

/**
 * Completed-session counts for the last N weeks (newest first). Week keys from toWeekKey.
 */
export function getWeeklyCompletionCounts(
  sessions: SessionRecord[],
  lastN: number
): number[] {
  const completed = sessions.filter(
    (s) => s.completed !== false && isValidCompletedAt(s.completed_at)
  );
  if (lastN <= 0) return [];
  const weekKeys: string[] = [];
  const now = new Date();
  for (let i = 0; i < lastN; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - i * 7);
    weekKeys.push(toWeekKey(d.toISOString()));
  }
  return weekKeys.map(
    (wk) =>
      completed.filter((s) => toWeekKey(s.completed_at!) === wk).length
  );
}

export interface ThisWeekVsAverage {
  thisWeek: number;
  fourWeekAvg: number;
  trend: "up" | "down" | "same";
}

export function getThisWeekVsAverage(
  sessions: SessionRecord[]
): ThisWeekVsAverage | null {
  const counts = getWeeklyCompletionCounts(sessions, 4);
  const thisWeek = counts[0] ?? 0;
  const lastThree = counts.slice(1, 4);
  const sum = lastThree.reduce((a, b) => a + b, 0);
  const fourWeekAvg = (thisWeek + sum) / 4;
  const prevWeek = counts[1] ?? 0;
  let trend: "up" | "down" | "same" = "same";
  if (thisWeek > prevWeek) trend = "up";
  else if (thisWeek < prevWeek) trend = "down";
  return {
    thisWeek,
    fourWeekAvg: Math.round(fourWeekAvg * 10) / 10,
    trend,
  };
}

const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

/**
 * Day of week with most completed sessions (e.g. "Wednesday"). Null if not enough data.
 */
export function getBestDayOfWeek(sessions: SessionRecord[]): string | null {
  const completed = sessions.filter(
    (s) => s.completed !== false && isValidCompletedAt(s.completed_at)
  );
  if (completed.length < 2) return null;
  const byDay = new Map<number, number>();
  for (const s of completed) {
    const day = new Date(s.completed_at!).getDay();
    if (!Number.isFinite(day)) continue;
    byDay.set(day, (byDay.get(day) ?? 0) + 1);
  }
  let bestDay = 0;
  let bestCount = 0;
  for (const [day, count] of byDay) {
    if (count > bestCount) {
      bestCount = count;
      bestDay = day;
    }
  }
  return DAY_NAMES[bestDay] ?? null;
}

/**
 * Regression: "Your completion rate this week (X%) is below last week (Y%)." or null.
 */
export function getRegressionMessage(sessions: SessionRecord[]): string | null {
  const thisWeekKey = toWeekKey(new Date().toISOString());
  const d = new Date();
  d.setDate(d.getDate() - 7);
  const lastWeekKey = toWeekKey(d.toISOString());
  const thisWeekSessions = sessions.filter(
    (s) => isValidCompletedAt(s.completed_at) && toWeekKey(s.completed_at!) === thisWeekKey
  );
  const lastWeekSessions = sessions.filter(
    (s) => isValidCompletedAt(s.completed_at) && toWeekKey(s.completed_at!) === lastWeekKey
  );
  if (thisWeekSessions.length === 0 || lastWeekSessions.length === 0)
    return null;
  const thisRate =
    Math.round(
      (thisWeekSessions.filter((s) => s.completed !== false).length /
        thisWeekSessions.length) *
        100
    );
  const lastRate = Math.round(
    (lastWeekSessions.filter((s) => s.completed !== false).length /
      lastWeekSessions.length) *
      100
  );
  if (thisRate >= lastRate) return null;
  return `Your completion rate this week (${thisRate}%) is below last week (${lastRate}%).`;
}

// ---------- Session intelligence & suggestions (derived, no new storage) ----------

/**
 * Duration with highest completion rate (min 2 sessions). For "Try 45 min" suggestion.
 */
export function getSuggestedDuration(sessions: SessionRecord[]): number | null {
  const stats = getCompletionStats(sessions);
  let bestDur: number | null = null;
  let bestRate = 0;
  for (const d of DURATIONS) {
    const by = stats.byDuration[d];
    if (!by || by.total < 2) continue;
    if (by.rate > bestRate) {
      bestRate = by.rate;
      bestDur = d;
    }
  }
  return bestDur;
}

/**
 * Pre-session completion probability for a given duration (and optional time bucket). Returns 0-100 or null.
 */
export function getCompletionProbability(
  sessions: SessionRecord[],
  durationMinutes: number,
  timeBucket?: (typeof TIME_BUCKETS)[number]["name"]
): number | null {
  let subset = sessions.filter((s) => s.duration_minutes === durationMinutes);
  if (timeBucket) {
    subset = subset.filter(
      (s) => isValidCompletedAt(s.completed_at) && getTimeBucket(s.completed_at!) === timeBucket
    );
  }
  if (subset.length < 1) return null;
  const completed = subset.filter((s) => s.completed !== false).length;
  return Math.round((completed / subset.length) * 100);
}

/**
 * Best focus window label and rough hours (e.g. "Morning", "9am–12pm").
 */
export function getBestPeakWindow(sessions: SessionRecord[]): { label: string; hours: string } | null {
  const completed = sessions.filter(
    (s) => s.completed !== false && isValidCompletedAt(s.completed_at)
  );
  if (completed.length < 2) return null;
  const byBucket = new Map<string, number>();
  for (const b of TIME_BUCKETS) {
    byBucket.set(
      b.name,
      completed.filter((s) => getTimeBucket(s.completed_at!) === b.name).length
    );
  }
  let best = TIME_BUCKETS[0].name;
  let bestCount = 0;
  for (const [name, count] of byBucket) {
    if (count > bestCount) {
      bestCount = count;
      best = name;
    }
  }
  const label = best.charAt(0).toUpperCase() + best.slice(1);
  const hours =
    best === "morning"
      ? "6am–12pm"
      : best === "afternoon"
        ? "12pm–6pm"
        : "6pm–12am";
  return { label, hours };
}

const REFLECTION_STOPWORDS = new Set(
  "a an the and or but in on at to for of with by from as is was are were be been being have has had do does did will would could should may might must can i you we they it this that what which who when where how why all each every both few more most other some such no not only own same so than too very just".split(
    " "
  )
);

/**
 * Top words from reflections (distraction/themes). Max 5, min length 3.
 */
export function getReflectionThemes(sessions: SessionRecord[]): string[] {
  const words = new Map<string, number>();
  for (const s of sessions) {
    const text = (s.reflection ?? "").toLowerCase().replace(/[^\w\s]/g, " ");
    for (const w of text.split(/\s+/)) {
      if (w.length < 3 || REFLECTION_STOPWORDS.has(w)) continue;
      words.set(w, (words.get(w) ?? 0) + 1);
    }
  }
  return Array.from(words.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([w]) => w);
}

/**
 * Days with at least one completed session this week (Mon–Sun). For habit formation.
 */
export function getDaysActiveThisWeek(sessions: SessionRecord[]): { active: number; total: number } {
  const thisWeekKey = toWeekKey(new Date().toISOString());
  const completedThisWeek = sessions.filter(
    (s) =>
      s.completed !== false &&
      isValidCompletedAt(s.completed_at) &&
      toWeekKey(s.completed_at!) === thisWeekKey
  );
  const daySet = new Set(
    completedThisWeek
      .map((s) => new Date(s.completed_at!).getDay())
      .filter((d) => Number.isFinite(d))
  );
  return { active: daySet.size, total: 7 };
}

/**
 * Attention span trend: compare avg completed session length last 4 weeks vs previous 4.
 */
export function getAttentionSpanTrend(
  sessions: SessionRecord[]
): "up" | "down" | "stable" | null {
  const completed = sessions.filter(
    (s) => s.completed !== false && isValidCompletedAt(s.completed_at)
  );
  if (completed.length < 4) return null;
  const recentSessions = completed.filter((s) => {
    const wk = toWeekKey(s.completed_at!);
    const now = new Date();
    for (let i = 0; i < 4; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() - i * 7);
      if (toWeekKey(d.toISOString()) === wk) return true;
    }
    return false;
  });
  const olderSessions = completed.filter((s) => {
    const wk = toWeekKey(s.completed_at!);
    const now = new Date();
    for (let i = 4; i < 8; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() - i * 7);
      if (toWeekKey(d.toISOString()) === wk) return true;
    }
    return false;
  });
  const recentAvg =
    recentSessions.length > 0
      ? recentSessions.reduce((a, s) => a + s.duration_minutes, 0) /
        recentSessions.length
      : 0;
  const olderAvg =
    olderSessions.length > 0
      ? olderSessions.reduce((a, s) => a + s.duration_minutes, 0) /
        olderSessions.length
      : 0;
  const diff = recentAvg - olderAvg;
  if (Math.abs(diff) < 2) return "stable";
  return diff > 0 ? "up" : "down";
}

/**
 * Burnout risk: high activity this week + completion rate dropped vs last week.
 */
export function getBurnoutRisk(sessions: SessionRecord[]): string | null {
  const thisWeekKey = toWeekKey(new Date().toISOString());
  const d = new Date();
  d.setDate(d.getDate() - 7);
  const lastWeekKey = toWeekKey(d.toISOString());
  const thisWeekSessions = sessions.filter(
    (s) => isValidCompletedAt(s.completed_at) && toWeekKey(s.completed_at!) === thisWeekKey
  );
  const lastWeekSessions = sessions.filter(
    (s) => isValidCompletedAt(s.completed_at) && toWeekKey(s.completed_at!) === lastWeekKey
  );
  if (thisWeekSessions.length < 5) return null;
  const thisCompleted = thisWeekSessions.filter((s) => s.completed !== false).length;
  const lastCompleted = lastWeekSessions.filter((s) => s.completed !== false).length;
  const thisRate = thisWeekSessions.length
    ? (thisCompleted / thisWeekSessions.length) * 100
    : 0;
  const lastRate = lastWeekSessions.length
    ? (lastCompleted / lastWeekSessions.length) * 100
    : 0;
  if (thisRate >= lastRate - 10) return null;
  return "High activity this week with lower completion. Consider more rest.";
}

/**
 * Recovery recommendation by number of completed sessions today.
 */
export function getRecoveryRecommendation(todayCompletedCount: number): string | null {
  if (todayCompletedCount >= 6) return "30 min";
  if (todayCompletedCount >= 4) return "15 min";
  if (todayCompletedCount >= 3) return "5 min";
  return null;
}

/**
 * Workload warning when overcommitment (many sessions today or this week).
 */
export function getWorkloadWarning(sessions: SessionRecord[]): string | null {
  const today = new Date().toDateString();
  const thisWeekKey = toWeekKey(new Date().toISOString());
  const todayCount = sessions.filter(
    (s) =>
      s.completed !== false &&
      isValidCompletedAt(s.completed_at) &&
      new Date(s.completed_at!).toDateString() === today
  ).length;
  const weekCount = sessions.filter(
    (s) =>
      s.completed !== false &&
      isValidCompletedAt(s.completed_at) &&
      toWeekKey(s.completed_at!) === thisWeekKey
  ).length;
  if (todayCount >= 6) return "You've done a lot today. Consider resting.";
  if (weekCount >= 20) return "High volume this week. Balance with rest.";
  return null;
}

/**
 * Composite focus score 0–100 from completion rate, streak, and recent trend. For display; stored focus_score remains simple.
 */
export function getCompositeFocusScore(
  sessions: SessionRecord[],
  dailyStreak: number,
  weeklyStreak: number
): number {
  const stats = getCompletionStats(sessions);
  const completionComponent = Number.isFinite(stats.overallRate) ? stats.overallRate : 0;
  const momentum = getMomentum(sessions);
  const trendComponent =
    momentum === "up" ? 20 : momentum === "down" ? 0 : 10;
  const streakComponent = Math.min(30, Math.max(0, (dailyStreak ?? 0) * 5 + (weeklyStreak ?? 0) * 2));
  const score = completionComponent * 0.5 + trendComponent + streakComponent;
  return Math.min(100, Math.max(0, Math.round(Number.isFinite(score) ? score : 0)));
}

/**
 * Success pattern: best day + peak window for "Schedule focus on Wednesdays in the morning."
 */
export function getSuccessPatternSentence(
  sessions: SessionRecord[],
  bestDay: string | null,
  peakWindow: { label: string; hours: string } | null
): string | null {
  if (!bestDay && !peakWindow) return null;
  if (bestDay && peakWindow) {
    return `Schedule focus on ${bestDay}s in the ${peakWindow.label.toLowerCase()} (${peakWindow.hours}) for best results.`;
  }
  if (bestDay) return `Your best day is ${bestDay}. Try scheduling focus then.`;
  if (peakWindow) return `Your peak focus window is ${peakWindow.label} (${peakWindow.hours}).`;
  return null;
}

/**
 * Personal baseline copy: above / at / below 4-week average.
 */
export function getPersonalBaselineCopy(thisWeekVsAvg: ThisWeekVsAverage | null): string | null {
  if (!thisWeekVsAvg) return null;
  const { thisWeek, fourWeekAvg, trend } = thisWeekVsAvg;
  if (thisWeek > fourWeekAvg) return "You're above your 4-week average.";
  if (thisWeek < fourWeekAvg) return "You're below your 4-week average.";
  return "You're at your 4-week average.";
}
