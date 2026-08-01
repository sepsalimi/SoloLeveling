import { useState } from "react";
import { Alert, Pressable, StyleSheet, Switch, useColorScheme, View } from "react-native";
import { router } from "expo-router";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { Screen } from "@/components/Screen";
import { Text } from "@/components/Text";
import { useAppState } from "@/context/AppState";
import { palette, surfaces } from "@/theme/colors";
import { UserPreferences } from "@/types/activity";
import { requestNotificationPermission, syncReminders } from "@/services/reminders";
import { shareCsvExport, shareJsonExport } from "@/services/exportData";
import { defaultPreferences } from "@/data/sample";
import { useCheckInDraft } from "@/context/CheckInDraft";
import { Input } from "@/components/Input";
import { BrandMark } from "@/components/BrandMark";
import { Ionicons } from "@expo/vector-icons";

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
  const dark = useColorScheme() === "dark";
  const theme = surfaces(dark);
  const { activities, localMode, preferences, updatePreferences, exportAllData, logOut, deleteAccount } = useAppState();
  const { clearDraft } = useCheckInDraft();
  const [draft, setDraft] = useState<UserPreferences>(preferences ?? defaultPreferences);
  const [busy, setBusy] = useState(false);
  if (!preferences) {
    return (
      <Screen>
        <BrandMark compact />
        <Text variant="heading">Loading your settings…</Text>
        <Text variant="caption">Preferences will appear once your account data is ready.</Text>
      </Screen>
    );
  }

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
      {
        text: "JSON",
        onPress: () => {
          void exportJson().catch((error) =>
            Alert.alert("Export failed", error instanceof Error ? error.message : "Try again.")
          );
        }
      },
      {
        text: "CSV",
        onPress: () => {
          void shareCsvExport(activities).catch((error) =>
            Alert.alert("Export failed", error instanceof Error ? error.message : "Try again.")
          );
        }
      }
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
      <View style={styles.topBar}><BrandMark compact /><Text variant="eyebrow">You</Text></View>
      <View style={styles.intro}>
        <Text variant="display">Make this{"\n"}feel like yours.</Text>
        <Text style={styles.lede}>Adjust the rhythm, detail, and privacy of your journal.</Text>
      </View>

      <View style={styles.sectionTitle}><Ionicons name="notifications-outline" size={22} color={palette.coral} /><Text variant="heading">Your rhythm</Text></View>
      <Card variant="tint">
        <View style={styles.timeRow}>
          <View style={styles.timeField}><Text variant="label">Afternoon</Text><Input
            value={draft.afternoonReminderTime}
            onChangeText={(afternoonReminderTime) => setDraft({ ...draft, afternoonReminderTime })}
            onEndEditing={() => void save(draft, true)}
            accessibilityLabel="Afternoon reminder time"
          /></View>
          <View style={styles.timeField}><Text variant="label">Evening</Text><Input
            value={draft.eveningReminderTime}
            onChangeText={(eveningReminderTime) => setDraft({ ...draft, eveningReminderTime })}
            onEndEditing={() => void save(draft, true)}
            accessibilityLabel="Evening reminder time"
          /></View>
        </View>
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
                style={[styles.day, { backgroundColor: active ? palette.forest : theme.chip }, active && styles.dayActive]}
              >
                <Text style={active ? styles.dayTextActive : [styles.dayText, { color: theme.softText }]}>{day.label}</Text>
              </Pressable>
            );
          })}
        </View>
        <Toggle label="Check-in reminders" value={draft.notificationsEnabled} onValueChange={(value) => void setNotifications(value)} />
      </Card>

      <View style={styles.sectionTitle}><Ionicons name="options-outline" size={22} color={palette.coral} /><Text variant="heading">What you notice</Text></View>
      <View style={styles.toggleList}>
        <Toggle label="Efficiency when productive" value={draft.efficiencyEnabled} onValueChange={(value) => void save({ ...draft, efficiencyEnabled: value })} />
        <Toggle label="Mood and energy" value={draft.moodEnabled} onValueChange={(value) => void save({ ...draft, moodEnabled: value })} />
        <Toggle label="Keep raw voice notes" value={draft.retainAudio} onValueChange={(value) => void save({ ...draft, retainAudio: value })} />
      </View>

      <Card variant="ink" style={styles.privacy}>
        <Ionicons name="lock-closed-outline" size={28} color={palette.gold} />
        <Text variant="heading" style={styles.inverse}>Your privacy posture</Text>
        <Text style={styles.inverseBody}>
          {localMode
            ? "This temporary version keeps your data only in this browser. Text extraction runs locally and no activity content is sent to an AI service."
            : "OpenAI transcription and extraction happen through Supabase Edge Functions. The mobile app never contains an OpenAI API key and does not log transcripts, audio URLs, or personal activity content. Transcripts over 50 KB are processed but not retained."}
        </Text>
      </Card>
      <View style={styles.dataActions}>
        <Text variant="eyebrow">Your data</Text>
        <Button label="Take a copy" icon="download-outline" variant="secondary" onPress={chooseExport} disabled={busy} />
        <Button label={localMode ? "Clear this browser" : "Delete my archive"} icon="warning-outline" variant="danger" onPress={confirmDeleteAccount} disabled={busy} />
        {!localMode ? <Button label="Log out" icon="log-out-outline" variant="ghost" compact onPress={handleLogOut} disabled={busy} /> : null}
      </View>
    </Screen>
  );
}

function Toggle({ label, value, onValueChange }: { label: string; value: boolean; onValueChange: (value: boolean) => void }) {
  return (
    <View style={styles.toggle}>
      <Text variant="label">{label}</Text>
      <Switch
        accessibilityLabel={label}
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: palette.line, true: palette.mint }}
        thumbColor={value ? palette.forest : "#FFFFFF"}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  intro: { gap: 9, marginTop: 8 },
  lede: { color: palette.muted, fontSize: 17, lineHeight: 25 },
  sectionTitle: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 12 },
  timeRow: { flexDirection: "row", gap: 12 },
  timeField: { flex: 1, gap: 7 },
  days: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  day: { minHeight: 40, justifyContent: "center", borderRadius: 14, paddingHorizontal: 12 },
  dayActive: { transform: [{ rotate: "-2deg" }] },
  dayText: { color: palette.muted, fontSize: 12, fontWeight: "700" },
  dayTextActive: { color: "#FFFFFF", fontSize: 13 },
  toggleList: { gap: 0 },
  toggle: { minHeight: 60, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: palette.line },
  privacy: { marginTop: 10 },
  inverse: { color: "#FFFFFF" },
  inverseBody: { color: "#D6E4DE", lineHeight: 23 },
  dataActions: { gap: 10, marginTop: 8 }
});

