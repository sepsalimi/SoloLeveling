import { useEffect, useState } from "react";
import { Alert, Pressable, StyleSheet, Switch, TextInput, View } from "react-native";
import { router } from "expo-router";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { Screen } from "@/components/Screen";
import { Text } from "@/components/Text";
import { useAppState } from "@/context/AppState";
import { palette } from "@/theme/colors";
import { UserPreferences } from "@/types/activity";
import { requestNotificationPermission, syncReminders } from "@/services/reminders";
import { shareCsvExport, shareJsonExport } from "@/services/exportData";

const days = [
  { label: "Mon", value: 1 },
  { label: "Tue", value: 2 },
  { label: "Wed", value: 3 },
  { label: "Thu", value: 4 },
  { label: "Fri", value: 5 },
  { label: "Sat", value: 6 },
  { label: "Sun", value: 0 }
];

export default function SettingsScreen() {
  const { activities, preferences, updatePreferences, exportAllData, logOut, deleteAccount } = useAppState();
  const [draft, setDraft] = useState(preferences);
  const [busy, setBusy] = useState(false);
  useEffect(() => setDraft(preferences), [preferences]);
  if (!preferences) return null;
  if (!draft) return null;

  async function save(next: UserPreferences, reschedule = false) {
    setDraft(next);
    await updatePreferences(next);
    if (reschedule) await syncReminders(next);
  }

  async function setNotifications(enabled: boolean) {
    if (enabled && !(await requestNotificationPermission())) {
      Alert.alert("Notifications disabled", "You can still check in manually.");
      await save({ ...draft, notificationsEnabled: false }, true);
    } else {
      await save({ ...draft, notificationsEnabled: enabled }, true);
    }
  }

  async function exportJson() {
    const data = await exportAllData();
    await shareJsonExport(data);
  }

  function chooseExport() {
    Alert.alert("Export data", "Choose an export format.", [
      { text: "Cancel", style: "cancel" },
      { text: "JSON", onPress: () => void exportJson() },
      { text: "CSV", onPress: () => void shareCsvExport(activities) }
    ]);
  }

  function confirmDeleteAccount() {
    Alert.alert("Delete account permanently?", "This deletes all activities, transcripts, retained audio, and your login. This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete permanently",
        style: "destructive",
        onPress: () => {
          setBusy(true);
          void deleteAccount()
            .then(() => router.replace("/auth"))
            .catch((error) => Alert.alert("Account deletion failed", error instanceof Error ? error.message : "Try again."))
            .finally(() => setBusy(false));
        }
      }
    ]);
  }

  async function handleLogOut() {
    setBusy(true);
    try {
      await logOut();
      router.replace("/auth");
    } catch (error) {
      Alert.alert("Could not log out", error instanceof Error ? error.message : "Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <Text variant="title">Settings</Text>
      <Card>
        <Text variant="heading">Reminders</Text>
        <TextInput
          value={draft.afternoonReminderTime}
          onChangeText={(afternoonReminderTime) => setDraft({ ...draft, afternoonReminderTime })}
          onEndEditing={() => void save(draft, true)}
          style={styles.input}
          accessibilityLabel="Afternoon reminder time"
        />
        <TextInput
          value={draft.eveningReminderTime}
          onChangeText={(eveningReminderTime) => setDraft({ ...draft, eveningReminderTime })}
          onEndEditing={() => void save(draft, true)}
          style={styles.input}
          accessibilityLabel="Evening reminder time"
        />
        <View style={styles.days}>
          {days.map((day) => {
            const active = draft.reminderDays.includes(day.value);
            return (
              <Pressable
                key={day.value}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                onPress={() => {
                  const reminderDays = active
                    ? draft.reminderDays.filter((value) => value !== day.value)
                    : [...draft.reminderDays, day.value];
                  void save({ ...draft, reminderDays }, true);
                }}
                style={[styles.day, active && styles.dayActive]}
              >
                <Text style={active ? styles.dayTextActive : styles.dayText}>{day.label}</Text>
              </Pressable>
            );
          })}
        </View>
        <Toggle label="Notifications" value={draft.notificationsEnabled} onValueChange={(value) => void setNotifications(value)} />
      </Card>
      <Card>
        <Text variant="heading">Tracking options</Text>
        <Toggle label="Efficiency" value={draft.efficiencyEnabled} onValueChange={(value) => void save({ ...draft, efficiencyEnabled: value })} />
        <Toggle label="Mood and energy" value={draft.moodEnabled} onValueChange={(value) => void save({ ...draft, moodEnabled: value })} />
        <Toggle label="Retain raw audio" value={draft.retainAudio} onValueChange={(value) => void save({ ...draft, retainAudio: value })} />
      </Card>
      <Card>
        <Text variant="heading">Privacy</Text>
        <Text>
          OpenAI transcription and extraction happen through Supabase Edge Functions. The mobile app never contains an OpenAI API key and
          does not log transcripts, audio URLs, or personal activity content. Transcripts over 50 KB are processed but not retained.
        </Text>
      </Card>
      <Button label="Export data" icon="download-outline" onPress={chooseExport} disabled={busy} />
      <Button label="Delete account" icon="warning-outline" variant="danger" onPress={confirmDeleteAccount} disabled={busy} />
      <Button label="Log out" icon="log-out-outline" variant="ghost" onPress={handleLogOut} disabled={busy} />
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
  days: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  day: { minHeight: 40, justifyContent: "center", borderRadius: 999, paddingHorizontal: 12, backgroundColor: "#EAF1EF" },
  dayActive: { backgroundColor: palette.teal },
  dayText: { color: palette.teal, fontSize: 13 },
  dayTextActive: { color: "#FFFFFF", fontSize: 13 },
  toggle: { minHeight: 44, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 16 }
});

