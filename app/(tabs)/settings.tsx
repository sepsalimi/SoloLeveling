import { useState } from "react";
import { Alert, Pressable, StyleSheet, Switch, View } from "react-native";
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
import { defaultPreferences } from "@/data/sample";
import { useCheckInDraft } from "@/context/CheckInDraft";
import { Input } from "@/components/Input";

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
  const { activities, localMode, preferences, updatePreferences, exportAllData, logOut, deleteAccount } = useAppState();
  const { clearDraft } = useCheckInDraft();
  const [draft, setDraft] = useState<UserPreferences>(preferences ?? defaultPreferences);
  const [busy, setBusy] = useState(false);
  if (!preferences) return null;

  async function save(next: UserPreferences, reschedule = false) {
    setDraft(next);
    try {
      await updatePreferences(next);
      if (reschedule) await syncReminders(next);
    } catch (error) {
      setDraft(preferences ?? defaultPreferences);
      Alert.alert("Could not update settings", error instanceof Error ? error.message : "Try again.");
    }
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
    Alert.alert(localMode ? "Clear all local data?" : "Delete account permanently?", localMode
      ? "This deletes all activities and preferences stored in this browser. This cannot be undone."
      : "This deletes all activities, transcripts, retained audio, and your login. This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: localMode ? "Clear data" : "Delete permanently",
        style: "destructive",
        onPress: () => {
          setBusy(true);
          void deleteAccount()
            .then(async () => {
              await clearDraft();
              router.replace(localMode ? "/onboarding" : "/auth");
            })
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
        <Input
          value={draft.afternoonReminderTime}
          onChangeText={(afternoonReminderTime) => setDraft({ ...draft, afternoonReminderTime })}
          onEndEditing={() => void save(draft, true)}
          accessibilityLabel="Afternoon reminder time"
        />
        <Input
          value={draft.eveningReminderTime}
          onChangeText={(eveningReminderTime) => setDraft({ ...draft, eveningReminderTime })}
          onEndEditing={() => void save(draft, true)}
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
          {localMode
            ? "This temporary version keeps your data only in this browser. Text extraction runs locally and no activity content is sent to an AI service."
            : "OpenAI transcription and extraction happen through Supabase Edge Functions. The mobile app never contains an OpenAI API key and does not log transcripts, audio URLs, or personal activity content. Transcripts over 50 KB are processed but not retained."}
        </Text>
      </Card>
      <Button label="Export data" icon="download-outline" onPress={chooseExport} disabled={busy} />
      <Button label={localMode ? "Clear local data" : "Delete account"} icon="warning-outline" variant="danger" onPress={confirmDeleteAccount} disabled={busy} />
      {!localMode ? <Button label="Log out" icon="log-out-outline" variant="ghost" onPress={handleLogOut} disabled={busy} /> : null}
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
  days: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  day: { minHeight: 40, justifyContent: "center", borderRadius: 999, paddingHorizontal: 12, backgroundColor: "#EAF1EF" },
  dayActive: { backgroundColor: palette.teal },
  dayText: { color: palette.teal, fontSize: 13 },
  dayTextActive: { color: "#FFFFFF", fontSize: 13 },
  toggle: { minHeight: 44, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 16 }
});

