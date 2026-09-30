import { InstallApp } from "@/components/InstallApp";
import { Alert, Share, StyleSheet, Switch, View } from "react-native";
import { DailySettings } from "@/components/DailySettings";
import { router } from "expo-router";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { Screen } from "@/components/Screen";
import { Text } from "@/components/Text";
import { useAppState } from "@/context/AppState";
import { UserPreferences } from "@/types/activity";
import { SteamConnection } from "@/components/SteamConnection";
import { palette } from "@/theme/colors";

export default function SettingsScreen() {
  const { preferences, updatePreferences, exportAllData } = useAppState();
  if (!preferences) return null;

  async function update<K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) {
    if (!preferences) return;
    await updatePreferences({ ...preferences, [key]: value });
  }

  async function shareExport() {
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
      <Text variant="title">Settings</Text>
      <InstallApp />
      <SteamConnection />
      <DailySettings />
      <Card>
        <Text variant="heading">Tracking options</Text>
        <Toggle label="Efficiency" value={preferences.efficiencyEnabled} onValueChange={(value) => update("efficiencyEnabled", value)} />
        <Toggle label="Mood and energy" value={preferences.moodEnabled} onValueChange={(value) => update("moodEnabled", value)} />
        <Toggle label="Retain raw audio" value={preferences.retainAudio} onValueChange={(value) => update("retainAudio", value)} />
      </Card>
      <Card>
        <Text variant="heading">Privacy</Text>
        <Text>
          Activity processing uses DeepSeek through an authenticated Supabase Edge Function. Browser dictation uses your browser speech service. The app never contains a model API key and
          should not log transcripts, audio URLs, or personal activity content.
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
