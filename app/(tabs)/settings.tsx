import { Alert, Share, StyleSheet, Switch, TextInput, View } from "react-native";
import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { Screen } from "@/components/Screen";
import { Text } from "@/components/Text";
import { useAppState } from "@/context/AppState";
import { palette } from "@/theme/colors";

export default function SettingsScreen() {
  const { preferences, updatePreferences, exportAllData } = useAppState();
  if (!preferences) return null;

  async function update<K extends keyof typeof preferences>(key: K, value: (typeof preferences)[K]) {
    await updatePreferences({ ...preferences, [key]: value });
  }

  async function requestNotifications() {
    const permission = await Notifications.requestPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Notifications disabled", "You can still check in manually.");
      await update("notificationsEnabled", false);
      return;
    }
    await update("notificationsEnabled", true);
    Alert.alert("Reminders enabled", "Local reminder scheduling is ready for the selected days and times.");
  }

  async function shareExport() {
    const data = await exportAllData();
    await Share.share({ message: JSON.stringify(data, null, 2) });
  }

  return (
    <Screen>
      <Text variant="title">Settings</Text>
      <Card>
        <Text variant="heading">Reminders</Text>
        <TextInput
          value={preferences.afternoonReminderTime}
          onChangeText={(value) => update("afternoonReminderTime", value)}
          style={styles.input}
          accessibilityLabel="Afternoon reminder time"
        />
        <TextInput
          value={preferences.eveningReminderTime}
          onChangeText={(value) => update("eveningReminderTime", value)}
          style={styles.input}
          accessibilityLabel="Evening reminder time"
        />
        <Toggle label="Notifications" value={preferences.notificationsEnabled} onValueChange={requestNotifications} />
      </Card>
      <Card>
        <Text variant="heading">Tracking options</Text>
        <Toggle label="Efficiency" value={preferences.efficiencyEnabled} onValueChange={(value) => update("efficiencyEnabled", value)} />
        <Toggle label="Mood and energy" value={preferences.moodEnabled} onValueChange={(value) => update("moodEnabled", value)} />
        <Toggle label="Retain raw audio" value={preferences.retainAudio} onValueChange={(value) => update("retainAudio", value)} />
      </Card>
      <Card>
        <Text variant="heading">Privacy</Text>
        <Text>
          OpenAI transcription and extraction happen through Supabase Edge Functions. The mobile app never contains an OpenAI API key and
          should not log transcripts, audio URLs, or personal activity content.
        </Text>
      </Card>
      <Button label="Export data" icon="download-outline" onPress={shareExport} />
      <Button label="Delete account" icon="warning-outline" variant="danger" onPress={() => Alert.alert("Delete account", "Use the Supabase RPC delete_user_data, then remove the auth user from an admin endpoint.")} />
      <Button label="Log out" icon="log-out-outline" variant="ghost" onPress={() => router.replace("/auth")} />
    </Screen>
  );
}

function Toggle({ label, value, onValueChange }: { label: string; value: boolean; onValueChange: (value: boolean) => void }) {
  return (
    <View style={styles.toggle}>
      <Text>{label}</Text>
      <Switch value={value} onValueChange={onValueChange} />
    </View>
  );
}

const styles = StyleSheet.create({
  input: { minHeight: 48, borderWidth: 1, borderColor: palette.line, borderRadius: 8, paddingHorizontal: 12, fontSize: 16 },
  toggle: { minHeight: 44, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 16 }
});

