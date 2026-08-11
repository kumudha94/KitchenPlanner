import * as Notifications from "expo-notifications";

// Requests OS notification permission. Returns whether it's actually
// granted afterward (the user may have permanently denied it previously,
// in which case the OS won't even show the prompt again).
export async function requestNotificationPermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const result = await Notifications.requestPermissionsAsync();
  return result.granted;
}
