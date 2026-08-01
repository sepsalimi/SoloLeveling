// Opens the check-in tab when a local reminder is tapped. Native platforms only.
import { useEffect, useRef } from "react";
import { router } from "expo-router";
import * as Notifications from "expo-notifications";
import "@/services/reminders";

export function NotificationNavigation() {
  const response = Notifications.useLastNotificationResponse();
  const handled = useRef<string | undefined>(undefined);
  useEffect(() => {
    const identifier = response?.notification.request.identifier;
    if (identifier && identifier !== handled.current && response.notification.request.content.data?.route === "/(tabs)/check-in") {
      handled.current = identifier;
      router.push("/(tabs)/check-in");
    }
  }, [response]);
  return null;
}
