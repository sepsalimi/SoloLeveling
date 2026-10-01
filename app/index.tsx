// Routes signed-in and local-preview users after the auth callback has settled.
import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { router } from "expo-router";
import { Screen } from "@/components/Screen";
import { Text } from "@/components/Text";
import { useAppState } from "@/context/AppState";
import { startupDestination } from "@/lib/authFlow";
import { isSupabaseConfigured } from "@/services/supabase";

export default function Index() {
  const { ready, preferences, user, accountRecovery, storageError } = useAppState();

  useEffect(() => {
    if (!ready) return;
    router.replace(startupDestination({
      configured: isSupabaseConfigured,
      signedIn: Boolean(user),
      onboardingCompleted: Boolean(preferences?.onboardingCompleted),
      accountRecovery,
    }));
  }, [accountRecovery, preferences?.onboardingCompleted, ready, user]);

  return (
    <Screen scroll={false}>
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 16 }}>
        <ActivityIndicator />
        <Text>{storageError || "Preparing your private timeline..."}</Text>
      </View>
    </Screen>
  );
}
