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
}

export async function getSessions(): Promise<SessionRecord[]> {
  const raw = await getItem(SESSIONS_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
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
