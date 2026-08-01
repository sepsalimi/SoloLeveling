// Root providers, auth deep links, fonts, and native-only notification navigation.
import { useEffect, useRef } from "react";
import { Alert, Platform } from "react-native";
import { router, Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as Linking from "expo-linking";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useFonts, Fraunces_700Bold, Fraunces_800ExtraBold } from "@expo-google-fonts/fraunces";
import {
  SourceSans3_400Regular,
  SourceSans3_600SemiBold,
  SourceSans3_700Bold
} from "@expo-google-fonts/source-sans-3";
import * as SplashScreen from "expo-splash-screen";
import { AppStateProvider } from "@/context/AppState";
import { CheckInDraftProvider } from "@/context/CheckInDraft";
import { NotificationNavigation } from "@/components/NotificationNavigation";
import { supabase } from "@/services/supabase";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Fraunces_700Bold,
    Fraunces_800ExtraBold,
    SourceSans3_400Regular,
    SourceSans3_600SemiBold,
    SourceSans3_700Bold
  });

  useEffect(() => {
    if (fontsLoaded) void SplashScreen.hideAsync();
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AppStateProvider>
          <CheckInDraftProvider>
            {Platform.OS !== "web" ? <NotificationNavigation /> : null}
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
  const handled = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (!url || !supabase || handled.current === url) return;
    handled.current = url;
    const [baseUrl, fragment = ""] = url.split("#");
    const parsed = Linking.parse(baseUrl);
    const hash = new URLSearchParams(fragment);
    const code = typeof parsed.queryParams?.code === "string" ? parsed.queryParams.code : null;
    const accessToken = hash.get("access_token");
    const refreshToken = hash.get("refresh_token");

    const type = typeof parsed.queryParams?.type === "string"
      ? parsed.queryParams.type
      : hash.get("type");
    const isRecovery = type === "recovery" || parsed.path?.includes("reset-password");

    if (code) {
      void supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
        if (error) {
          Alert.alert("Could not open account link", error.message);
          return;
        }
        if (isRecovery) router.replace("/reset-password");
      });
    } else if (accessToken && refreshToken) {
      void supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken }).then(({ error }) => {
        if (error) {
          Alert.alert("Could not open account link", error.message);
          return;
        }
        if (isRecovery) router.replace("/reset-password");
      });
    } else if (isRecovery) {
      router.replace("/reset-password");
    }
  }, [url]);
  return null;
}
