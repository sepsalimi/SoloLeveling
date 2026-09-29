import { useEffect } from "react";
import { Platform } from "react-native";
import { router } from "expo-router";
import * as Notifications from "expo-notifications";
export function ReminderNavigation() {
  useEffect(() => {
    if (Platform.OS === "web") return;
    Notifications.setNotificationHandler({ handleNotification: async () => ({ shouldPlaySound: false, shouldSetBadge: false, shouldShowBanner: false, shouldShowList: false }) });
    const handle = (response: Notifications.NotificationResponse) => {
      const data = response.notification.request.content.data;
      if (data?.kind === "daily-check-in") router.push({ pathname: "/(tabs)/check-in", params: { mode: data.mode === "morning" ? "morning" : "evening" } });
    };
    const subscription = Notifications.addNotificationResponseReceivedListener(handle);
    void Notifications.getLastNotificationResponseAsync().then(response => {
      if (response) { handle(response); void Notifications.clearLastNotificationResponseAsync(); }
    });
    return () => subscription.remove();
  }, []);
  return null;
}
