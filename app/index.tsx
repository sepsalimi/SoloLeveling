// Routes signed-in and local-preview users after tenant-scoped state is ready.
import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { router } from "expo-router";
import { Screen } from "@/components/Screen";
import { Text } from "@/components/Text";
import { useAppState } from "@/context/AppState";
import { isSupabaseConfigured } from "@/services/supabase";
import { agentDebug } from "@/lib/agentDebug";

export default function Index() {
  const { ready, preferences, user } = useAppState();

  useEffect(() => {
    if (!ready) return;
    const destination = isSupabaseConfigured && !user ? "/auth" : !preferences?.onboardingCompleted ? "/onboarding" : "/(tabs)/tasks";
    // #region agent log
    agentDebug({ hypothesisId: "C", location: "index.tsx:redirect", message: "Root route selected authentication destination", data: { configured: isSupabaseConfigured, ready, hasUser: Boolean(user), onboardingCompleted: Boolean(preferences?.onboardingCompleted), destination } });
    // #endregion
    router.replace(destination);
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
