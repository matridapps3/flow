/**
 * Shared app constants. Used by Home (duration presets), analytics, and Insights.
 */

/** Duration presets in minutes. Order matches UI selector. */
export const DURATIONS = [15, 25, 45, 60] as const;

export type DurationMinutes = (typeof DURATIONS)[number];
