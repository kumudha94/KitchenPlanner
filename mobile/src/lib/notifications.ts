import * as Notifications from "expo-notifications";

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

// One repeating daily reminder at a fixed time — simple on purpose. Per-meal
// or user-configurable reminder times are a reasonable future addition, not
// built here.
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
