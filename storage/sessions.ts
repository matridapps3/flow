import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

const SESSIONS_KEY = "FOCUS_SESSIONS";

function getItem(key: string): Promise<string | null> {
  if (Platform.OS === "web" && typeof localStorage !== "undefined") {
    return Promise.resolve(localStorage.getItem(key));
  }
  return AsyncStorage.getItem(key);
}

function setItem(key: string, value: string): Promise<void> {
  if (Platform.OS === "web" && typeof localStorage !== "undefined") {
    localStorage.setItem(key, value);
    return Promise.resolve();
  }
  return AsyncStorage.setItem(key, value);
}

function removeItem(key: string): Promise<void> {
  if (Platform.OS === "web" && typeof localStorage !== "undefined") {
    localStorage.removeItem(key);
    return Promise.resolve();
  }
  return AsyncStorage.removeItem(key);
}

export interface SessionRecord {
  duration_minutes: number;
  completed_at: string;
  /** false when user stopped before finishing; omitted or true = completed */
  completed?: boolean;
  /** optional one-line reflection saved from Reflect tab */
  reflection?: string;
}

export async function getSessions(): Promise<SessionRecord[]> {
  const raw = await getItem(SESSIONS_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.warn("Failed to parse stored sessions", e);
    return [];
  }
}

export async function saveSession(session: SessionRecord): Promise<void> {
  const existingSessions = await getSessions();
  const updatedSessions = [session, ...existingSessions];
  await setItem(SESSIONS_KEY, JSON.stringify(updatedSessions));
}

export async function clearSessions(): Promise<void> {
  await removeItem(SESSIONS_KEY);
}

/**
 * Writes the full session list to storage (for internal use, e.g. updating a record).
 */
async function writeSessions(sessions: SessionRecord[]): Promise<void> {
  await setItem(SESSIONS_KEY, JSON.stringify(sessions));
}

/**
 * Attaches a reflection to the most recent completed session (by completed_at).
 * No-op if there is no completed session.
 */
export async function updateLatestCompletedSessionReflection(
  reflection: string
): Promise<void> {
  const sessions = await getSessions();
  const completed = sessions.filter(
    (s) => s.completed !== false && s.completed_at
  );
  if (completed.length === 0) return;
  const latest = completed[0];
  if (!latest.completed_at) return;
  const idx = sessions.findIndex((s) => s.completed_at === latest.completed_at);
  if (idx === -1) return;
  const updated = [...sessions];
  updated[idx] = { ...updated[idx], reflection: reflection.trim() };
  await writeSessions(updated);
}
