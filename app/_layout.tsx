import { useEffect, useRef } from "react";
import { router, Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as Notifications from "expo-notifications";
import * as Linking from "expo-linking";
import { Alert } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AppStateProvider } from "@/context/AppState";
import { CheckInDraftProvider } from "@/context/CheckInDraft";
import "@/services/reminders";
import { supabase } from "@/services/supabase";

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AppStateProvider>
          <CheckInDraftProvider>
            <NotificationNavigation />
            <AuthLinkHandler />
            <StatusBar style="auto" />
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="index" />
              <Stack.Screen name="auth" />
              <Stack.Screen name="onboarding" />
              <Stack.Screen name="reset-password" />
              <Stack.Screen name="review" />
              <Stack.Screen name="(tabs)" />
            </Stack>
          </CheckInDraftProvider>
        </AppStateProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function AuthLinkHandler() {
  const url = Linking.useURL();
  const handled = useRef<string>();

  useEffect(() => {
    if (!url || !supabase || handled.current === url) return;
    handled.current = url;
    const parsed = new URL(url);
    const hash = new URLSearchParams(parsed.hash.replace(/^#/, ""));
    const code = parsed.searchParams.get("code");
    const accessToken = hash.get("access_token");
    const refreshToken = hash.get("refresh_token");

    if (code) {
      void supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
        if (error) Alert.alert("Could not open account link", error.message);
      });
    } else if (accessToken && refreshToken) {
      void supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken }).then(({ error }) => {
        if (error) Alert.alert("Could not open account link", error.message);
      });
    }
  }, [url]);
  return null;
}

function NotificationNavigation() {
  const response = Notifications.useLastNotificationResponse();
  useEffect(() => {
    if (response?.notification.request.content.data.route === "/(tabs)/check-in") {
      router.push("/(tabs)/check-in");
    }
  }, [response]);
  return null;
}
