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
      <Tabs.Screen name="home" options={{ title: "Today", tabBarIcon: ({ color }) => <Ionicons name="today-outline" size={22} color={color} /> }} />
      <Tabs.Screen name="tasks" options={{ title: "Tasks", tabBarIcon: ({ color }) => <Ionicons name="checkbox-outline" size={22} color={color} /> }} />
      <Tabs.Screen name="check-in" options={{ title: "Check in", tabBarStyle: { backgroundColor: "#111019", borderTopColor: "#292432", minHeight: 64, paddingTop: 6 }, tabBarActiveTintColor: "#C4B5FD", tabBarInactiveTintColor: "#8D859E", tabBarIcon: ({ color }) => <Ionicons name="mic-outline" size={22} color={color} /> }} />
      <Tabs.Screen name="analytics" options={{ title: "Analytics", tabBarIcon: ({ color }) => <Ionicons name="bar-chart-outline" size={22} color={color} /> }} />
      <Tabs.Screen name="history" options={{ title: "History", tabBarIcon: ({ color }) => <Ionicons name="calendar-outline" size={22} color={color} /> }} />
      <Tabs.Screen name="settings" options={{ title: "Settings", tabBarIcon: ({ color }) => <Ionicons name="settings-outline" size={22} color={color} /> }} />
    </Tabs>
  );
}
