import * as Notifications from "expo-notifications";
import { localPref } from "./authStorage";

// Controls how a notification behaves if it arrives while the app is open.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

const REMINDER_IDENTIFIER = "kitchenplanner-daily-reminder";
const REMINDER_HOUR = 18;
const REMINDER_MINUTE = 0;

// Requests OS notification permission. Returns whether it's actually
// granted afterward (the user may have permanently denied it previously,
// in which case the OS won't even show the prompt again).
export async function requestNotificationPermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const result = await Notifications.requestPermissionsAsync();
  return result.granted;
}

// One repeating daily reminder at a fixed time — the "check today's plan"
// nudge tied to the master Show notifications toggle.
export async function scheduleDailyReminder(): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(REMINDER_IDENTIFIER).catch(() => {});
  await Notifications.scheduleNotificationAsync({
    identifier: REMINDER_IDENTIFIER,
    content: {
      title: "KitchenPlanner",
      body: "Check today's meal plan and get ready to prep for tomorrow 🍽️",
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: REMINDER_HOUR,
      minute: REMINDER_MINUTE,
    },
  });
}

export async function cancelDailyReminder(): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(REMINDER_IDENTIFIER).catch(() => {});
}

// The "Show notifications" toggle used to be a server-side field on Kitchen's own user
// row; now that login is just an identity gate (no local account data), it's a plain
// on-device preference instead — which is arguably more correct anyway, since notification
// scheduling is inherently per-device.
const DAILY_REMINDER_PREF_KEY = "kitchenplanner_daily_reminder_enabled";

export async function isDailyReminderEnabled(): Promise<boolean> {
  return (await localPref.get(DAILY_REMINDER_PREF_KEY)) === "true";
}

export async function setDailyReminderEnabled(enabled: boolean): Promise<void> {
  await localPref.set(DAILY_REMINDER_PREF_KEY, enabled ? "true" : "false");
}

// User-defined reminders (e.g. "6 AM take pill") — each gets its own daily
// repeating notification, independent of the meal-plan reminder above.
function customReminderIdentifier(id: number): string {
  return `kitchenplanner-reminder-${id}`;
}

export async function scheduleCustomReminder(reminder: { id: number; title: string; hour: number; minute: number }): Promise<void> {
  const identifier = customReminderIdentifier(reminder.id);
  await Notifications.cancelScheduledNotificationAsync(identifier).catch(() => {});
  await Notifications.scheduleNotificationAsync({
    identifier,
    content: { title: "KitchenPlanner", body: reminder.title },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: reminder.hour,
      minute: reminder.minute,
    },
  });
}

export async function cancelCustomReminder(id: number): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(customReminderIdentifier(id)).catch(() => {});
}
