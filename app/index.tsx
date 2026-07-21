import { useEffect } from "react";
import { router } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { Screen } from "@/components/Screen";
import { Text } from "@/components/Text";
import { useAppState } from "@/context/AppState";

export default function Index() {
  const { ready } = useAppState();

  useEffect(() => {
    if (ready) router.replace("/auth");
  }, [ready]);

  return (
    <Screen scroll={false}>
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 16 }}>
        <ActivityIndicator />
        <Text>Preparing your private timeline...</Text>
      </View>
    </Screen>
  );
}
