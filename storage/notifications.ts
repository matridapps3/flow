import * as Notifications from "expo-notifications";

const DAILY_REMINDER_ID = "daily-reminder";

/**
 * Syncs the daily reminder: cancels if disabled, otherwise schedules at the given hour.
 */
export async function syncDailyReminder(enabled: boolean, hour: number): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(DAILY_REMINDER_ID);
  if (!enabled) return;
  await Notifications.scheduleNotificationAsync({
    identifier: DAILY_REMINDER_ID,
    content: {
      title: "Flow",
      body: "Time for a focus session?",
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute: 0,
    },
  });
}
