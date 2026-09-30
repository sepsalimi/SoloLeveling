// Routes signed-in and local-preview users after tenant-scoped state is ready.
import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { router } from "expo-router";
import { Screen } from "@/components/Screen";
import { Text } from "@/components/Text";
import { useAppState } from "@/context/AppState";
import { isSupabaseConfigured } from "@/services/supabase";

export default function Index() {
  const { ready, preferences, user } = useAppState();

  useEffect(() => {
    if (!ready) return;
    if (isSupabaseConfigured && !user) router.replace("/auth");
    else if (!preferences?.onboardingCompleted) router.replace("/onboarding");
    else router.replace("/(tabs)/home");
  }, [preferences?.onboardingCompleted, ready, user]);

  return (
    <Screen scroll={false}>
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 16 }}>
        <ActivityIndicator />
        <Text>Preparing your private timeline...</Text>
      </View>
    </Screen>
  );
}
