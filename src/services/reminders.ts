// Schedules the two user-selected local check-in reminders without remote push services.
import { Platform } from "react-native";
import { UserPreferences } from "@/types/activity";

function parseTime(value: string) {
  const match = value.match(/^([01]\d|2[0-3]):([0-5]\d)$/);
  if (!match) throw new Error("Reminder times must use 24-hour HH:MM format.");
  return { hour: Number(match[1]), minute: Number(match[2]) };
}

export async function requestNotificationPermission() {
  if (Platform.OS === "web") return false;
  const Notifications = await import("expo-notifications");
  const permission = await Notifications.requestPermissionsAsync();
  return permission.granted;
}

export async function syncReminders(preferences: UserPreferences) {
  if (Platform.OS === "web") return;
  const Notifications = await import("expo-notifications");

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false
    })
  });

  await Notifications.cancelAllScheduledNotificationsAsync();
  if (!preferences.notificationsEnabled) return;

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("check-ins", {
      name: "Check-in reminders",
      importance: Notifications.AndroidImportance.DEFAULT
    });
  }

  const times = [
    { label: "Afternoon check-in", ...parseTime(preferences.afternoonReminderTime) },
    { label: "Evening check-in", ...parseTime(preferences.eveningReminderTime) }
  ];

  for (const day of preferences.reminderDays) {
    for (const time of times) {
      const weekday = day + 1;
      const trigger =
        Platform.OS === "ios"
          ? {
              type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
              dateComponents: { weekday, hour: time.hour, minute: time.minute },
              repeats: true
            }
          : {
              type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
              weekday,
              hour: time.hour,
              minute: time.minute
            };

      await Notifications.scheduleNotificationAsync({
        content: {
          title: time.label,
          body: "Take a moment to record what you have been doing.",
          data: { route: "/(tabs)/check-in" }
        },
        trigger: trigger as never
      });
    }
  }
}
