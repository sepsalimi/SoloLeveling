import { useEffect } from "react";
import { router } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { Screen } from "@/components/Screen";
import { Text } from "@/components/Text";
import { useAppState } from "@/context/AppState";

export default function Index() {
  const { authReady, dataReady, preferences, user } = useAppState();

  useEffect(() => {
    if (!authReady || (user && !dataReady)) return;
    if (!user) router.replace("/auth");
    else if (!preferences?.onboardingCompleted) router.replace("/onboarding");
    else router.replace("/(tabs)/home");
  }, [authReady, dataReady, preferences?.onboardingCompleted, user]);

  return (
    <Screen scroll={false}>
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 16 }}>
        <ActivityIndicator />
        <Text>Preparing your private timeline...</Text>
      </View>
    </Screen>
  );
}
