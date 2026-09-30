// Root navigation, app state, notification routing, and Supabase authentication links.
import { useEffect, useRef } from "react";
import { Alert } from "react-native";
import { router, Stack } from "expo-router";
import * as Linking from "expo-linking";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AppStateProvider } from "@/context/AppState";
import { ReminderNavigation } from "@/components/ReminderNavigation";
import { supabase } from "@/services/supabase";
import { palette } from "@/theme/colors";

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: palette.paper }}>
      <SafeAreaProvider>
        <AppStateProvider>
          <StatusBar style="auto" />
          <ReminderNavigation />
          <AuthLinkHandler />
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="auth" />
            <Stack.Screen name="reset-password" />
            <Stack.Screen name="onboarding" />
            <Stack.Screen name="review" />
            <Stack.Screen name="(tabs)" />
          </Stack>
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
    const [baseUrl, fragment = ""] = url.split("#");
    const parsed = Linking.parse(baseUrl);
    const hash = new URLSearchParams(fragment);
    const code = typeof parsed.queryParams?.code === "string" ? parsed.queryParams.code : null;
    const accessToken = hash.get("access_token");
    const refreshToken = hash.get("refresh_token");
    const type = typeof parsed.queryParams?.type === "string" ? parsed.queryParams.type : hash.get("type");
    const recovery = type === "recovery" || parsed.path?.includes("reset-password");

    if (code) {
      void supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
        if (error) Alert.alert("Could not open account link", error.message);
        else if (recovery) router.replace("/reset-password");
      });
      return;
    }
    if (accessToken && refreshToken) {
      void supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken }).then(({ error }) => {
        if (error) Alert.alert("Could not open account link", error.message);
        else if (recovery) router.replace("/reset-password");
      });
    } else if (recovery) {
      router.replace("/reset-password");
    }
  }, [url]);

  return null;
}
