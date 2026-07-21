import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { palette } from "@/theme/colors";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: palette.teal,
        tabBarStyle: { minHeight: 64, paddingTop: 6 }
      }}
    >
      <Tabs.Screen name="home" options={{ title: "Today", tabBarIcon: ({ color }) => <Ionicons name="today-outline" size={22} color={color} /> }} />
      <Tabs.Screen name="check-in" options={{ title: "Check in", tabBarIcon: ({ color }) => <Ionicons name="mic-outline" size={22} color={color} /> }} />
      <Tabs.Screen name="analytics" options={{ title: "Analytics", tabBarIcon: ({ color }) => <Ionicons name="bar-chart-outline" size={22} color={color} /> }} />
      <Tabs.Screen name="history" options={{ title: "History", tabBarIcon: ({ color }) => <Ionicons name="calendar-outline" size={22} color={color} /> }} />
      <Tabs.Screen name="settings" options={{ title: "Settings", tabBarIcon: ({ color }) => <Ionicons name="settings-outline" size={22} color={color} /> }} />
    </Tabs>
  );
}

