import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import { UserPreferences } from "@/types/activity";
export function parseReminderTime(value: string) {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match || Number(match[1]) > 23 || Number(match[2]) > 59) throw new Error("Use a valid 24-hour time, such as 08:00 or 20:30.");
  return { hour: Number(match[1]), minute: Number(match[2]) };
}
export async function scheduleDailyReminders(preferences: UserPreferences) {
  const morning = parseReminderTime(preferences.morningReminderTime ?? "08:00");
  const evening = parseReminderTime(preferences.eveningReminderTime);
  if (morning.hour * 60 + morning.minute >= evening.hour * 60 + evening.minute) throw new Error("Set the morning time before the evening time.");
  if (Platform.OS === "web") return "Saved. Web check-ins appear in Today while the app is open. Background reminders require the mobile app.";
  const old = (await Notifications.getAllScheduledNotificationsAsync()).filter(n => n.content.data?.kind === "daily-check-in");
  if (!preferences.notificationsEnabled) {
    await Promise.all(old.map(n => Notifications.cancelScheduledNotificationAsync(n.identifier)));
    return "Reminder notifications are off. You can still check in anytime.";
  }
  const permission = await Notifications.requestPermissionsAsync();
  if (!permission.granted) throw new Error("Notification permission was denied. Your previous reminders have not changed.");
  if (Platform.OS === "android") await Notifications.setNotificationChannelAsync("daily-check-ins-silent", { name: "Daily check-ins (silent)", importance: Notifications.AndroidImportance.DEFAULT, sound: null, enableVibrate: false });
  const added: string[] = [];
  try {
    for (const weekday of preferences.reminderDays) {
      const times = [{ mode: "evening", ...evening }, ...(preferences.morningPlanEnabled ? [{ mode: "morning", ...morning }] : [])];
      for (const time of times) added.push(await Notifications.scheduleNotificationAsync({
        content: { title: time.mode === "morning" ? "Your morning plan ☀️" : "How did your day go? 🌙", body: time.mode === "morning" ? "Open your plan and start with what matters." : "Tell your day in your own words.", sound: false, data: { kind: "daily-check-in", mode: time.mode } },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.WEEKLY, weekday: weekday + 1, hour: time.hour, minute: time.minute, channelId: "daily-check-ins-silent" },
      }));
    }
  } catch (error) {
    await Promise.all(added.map(id => Notifications.cancelScheduledNotificationAsync(id)));
    throw error;
  }
  await Promise.all(old.map(n => Notifications.cancelScheduledNotificationAsync(n.identifier)));
  return "Your silent morning and evening reminders are saved.";
}
