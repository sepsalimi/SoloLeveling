import { useEffect } from "react";
import { StyleSheet, useColorScheme, View } from "react-native";
import { router, Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { palette } from "@/theme/colors";
import { useAppState } from "@/context/AppState";

export default function TabsLayout() {
  const { authReady, user } = useAppState();
  const dark = useColorScheme() === "dark";

  useEffect(() => {
    if (authReady && !user) router.replace("/auth");
  }, [authReady, user]);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: dark ? palette.mint : palette.forest,
        tabBarInactiveTintColor: dark ? palette.darkMuted : palette.muted,
        tabBarLabelStyle: { fontSize: 11, fontWeight: "800", marginBottom: 8 },
        tabBarStyle: {
          height: 78,
          paddingTop: 10,
          backgroundColor: dark ? palette.surfaceDark : palette.surface,
          borderTopWidth: 0,
          borderTopLeftRadius: 28,
          borderTopRightRadius: 28,
          shadowColor: "#071A18",
          shadowOffset: { width: 0, height: -8 },
          shadowOpacity: 0.1,
          shadowRadius: 20,
          elevation: 12
        }
      }}
    >
      <Tabs.Screen name="home" options={{ title: "Day", tabBarIcon: ({ color }) => <Ionicons name="sunny-outline" size={22} color={color} /> }} />
      <Tabs.Screen name="history" options={{ title: "Journal", tabBarIcon: ({ color }) => <Ionicons name="book-outline" size={22} color={color} /> }} />
      <Tabs.Screen
        name="check-in"
        options={{
          title: "Check-in",
          tabBarAccessibilityLabel: "Record a check-in",
          tabBarLabel: () => null,
          tabBarItemStyle: styles.checkInItem,
          tabBarIcon: () => (
            <View style={styles.checkInButton} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
              <Ionicons name="add" size={32} color="#FFFFFF" />
            </View>
          )
        }}
      />
      <Tabs.Screen name="analytics" options={{ title: "Patterns", tabBarIcon: ({ color }) => <Ionicons name="pulse-outline" size={22} color={color} /> }} />
      <Tabs.Screen name="settings" options={{ title: "You", tabBarIcon: ({ color }) => <Ionicons name="person-circle-outline" size={23} color={color} /> }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  checkInItem: { top: -22 },
  checkInButton: {
    width: 62,
    height: 62,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: palette.coral,
    borderWidth: 5,
    borderColor: palette.paper,
    transform: [{ rotate: "4deg" }],
    shadowColor: palette.coral,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 14,
    elevation: 8
  }
});

