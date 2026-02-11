import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

const KEY = "@smart_timer/app_state";

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

export interface AppState {
  current_index: number;
  duration: number;
  remaining: number;
  is_running: boolean;
  is_paused: boolean;
  today_sessions: number;
  week_sessions: number;
  focus_score: number;
  show_reflection: boolean;
  streak: number;
  /** Daily reminder (local notification). Native only. */
  reminder_enabled: boolean;
  /** Hour of day 0-23 for daily reminder. */
  reminder_hour: number;
}

const defaults: AppState = {
  current_index: 1,
  duration: 25,
  remaining: 25 * 60,
  is_running: false,
  is_paused: false,
  today_sessions: 0,
  week_sessions: 0,
  focus_score: 0,
  show_reflection: false,
  streak: 0,
  reminder_enabled: false,
  reminder_hour: 18,
};

export async function loadAppState(): Promise<AppState> {
  try {
    const raw = await getItem(KEY);
    if (!raw) return { ...defaults };
    const parsed = JSON.parse(raw) as Partial<AppState>;
    return { ...defaults, ...parsed };
  } catch {
    return { ...defaults };
  }
}

export async function saveAppState(state: Partial<AppState>): Promise<void> {
  const current = await loadAppState();
  const next = { ...current, ...state };
  await setItem(KEY, JSON.stringify(next));
}

/**
 * Resets app state to defaults (all sessions remain; use with clearSessions for full wipe).
 */
export async function resetAppState(): Promise<void> {
  await setItem(KEY, JSON.stringify(defaults));
}
