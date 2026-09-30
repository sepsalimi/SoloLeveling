// Preferences, sync controls, private export, and authenticated account actions.
import { useState } from "react";
import { Alert, Share, StyleSheet, Switch, View } from "react-native";
import { router } from "expo-router";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { DailySettings } from "@/components/DailySettings";
import { InstallApp } from "@/components/InstallApp";
import { Screen } from "@/components/Screen";
import { SteamConnection } from "@/components/SteamConnection";
import { Text } from "@/components/Text";
import { useAppState } from "@/context/AppState";
import { UserPreferences } from "@/types/activity";
import { palette } from "@/theme/colors";

export default function SettingsScreen() {
  const { preferences, updatePreferences, exportAllData, user, logOut, deleteAccount } = useAppState();
  const [busy, setBusy] = useState(false);
  if (!preferences) return null;

  async function update<K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) {
    if (!preferences) return;
    await updatePreferences({ ...preferences, [key]: value });
  }

  async function shareExport() {
    const data = await exportAllData();
    await Share.share({ message: JSON.stringify(data, null, 2) });
  }

  function confirmDeleteAccount() {
    Alert.alert("Delete account permanently?", "This deletes synced activities, plans, preferences, and your login. This cannot be undone.", [
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
        },
      },
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
      <DailySettings />
      <Card>
        <Text variant="heading">Tracking options</Text>
        <Toggle label="Efficiency" value={preferences.efficiencyEnabled} onValueChange={(value) => void update("efficiencyEnabled", value)} />
        <Toggle label="Mood and energy" value={preferences.moodEnabled} onValueChange={(value) => void update("moodEnabled", value)} />
        <Toggle label="Retain raw audio" value={preferences.retainAudio} onValueChange={(value) => void update("retainAudio", value)} />
      </Card>
      <SteamConnection />
      <Card variant="ink">
        <Text variant="heading" style={styles.inverse}>Privacy</Text>
        <Text style={styles.inverseBody}>
          Reasoning runs through authenticated Supabase functions. Browser dictation uses the browser speech service. Model keys never enter the app, and anonymous device records are not attached to a later account.
        </Text>
      </Card>
      <View style={styles.dataActions}>
        <Text variant="eyebrow">Your data</Text>
        <Button label="Export a private copy" icon="download-outline" variant="secondary" onPress={() => void shareExport()} disabled={busy} />
        {user && <Button label="Delete my account" icon="warning-outline" variant="danger" onPress={confirmDeleteAccount} disabled={busy} />}
        {user && <Button label="Log out" icon="log-out-outline" variant="ghost" compact onPress={() => void handleLogOut()} disabled={busy} />}
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
  toggle: { minHeight: 60, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: palette.line },
  inverse: { color: "#FFFFFF" },
  inverseBody: { color: "#D6E4DE", lineHeight: 23 },
  dataActions: { gap: 10, marginTop: 8 },
});
