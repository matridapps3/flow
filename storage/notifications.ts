import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { loadAppState, saveAppState } from "./app-state";

const DAILY_REMINDER_ID = "flow_daily_reminder";

/**
 * Schedules or cancels the daily focus reminder based on app state.
 * No-op on web. Requires expo-notifications; call only when reminder_enabled or reminder_hour changes.
 */
export async function syncDailyReminder(): Promise<void> {
  if (Platform.OS === "web") return;
  try {
    await Notifications.cancelScheduledNotificationAsync(DAILY_REMINDER_ID);
    const state = await loadAppState();
    if (!state.reminder_enabled) return;

    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== "granted") return;

    const hour = Math.min(23, Math.max(0, state.reminder_hour ?? 18));
    await Notifications.scheduleNotificationAsync({
      identifier: DAILY_REMINDER_ID,
      content: {
        title: "Flow",
        body: "Time for a focus session?",
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute: 0,
      },
    });
  } catch (_) {
    // Permissions, scheduling, or platform unsupported; ignore
  }
}
