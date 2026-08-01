import { useState } from "react";
import { Alert, Pressable, StyleSheet, Switch, View } from "react-native";
import { router } from "expo-router";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { Screen } from "@/components/Screen";
import { Text } from "@/components/Text";
import { useAppState } from "@/context/AppState";
import { defaultPreferences } from "@/data/sample";
import { palette } from "@/theme/colors";
import { requestNotificationPermission, syncReminders } from "@/services/reminders";
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

export default function OnboardingScreen() {
  const { preferences, updatePreferences } = useAppState();
  const [draft, setDraft] = useState(preferences ?? defaultPreferences);

  async function continueToApp() {
    try {
      let notificationsEnabled = draft.notificationsEnabled;
      if (notificationsEnabled && !(await requestNotificationPermission())) {
        notificationsEnabled = false;
        Alert.alert("Notifications are off", "You can enable reminders later in Settings.");
      }
      const completed = { ...draft, notificationsEnabled, onboardingCompleted: true };
      await updatePreferences(completed);
      await syncReminders(completed);
      router.replace("/(tabs)/home");
    } catch (error) {
      Alert.alert("Could not finish setup", error instanceof Error ? error.message : "Check your reminder times and connection.");
    }
  }

  return (
    <Screen>
      <BrandMark />
      <View style={styles.intro}>
        <Text variant="display">Remember more.{"\n"}Track less.</Text>
        <Text style={styles.lede}>Woven turns a few honest sentences into a picture of your time. Nothing runs in the background.</Text>
      </View>

      <View style={styles.stepHeader}>
        <Text style={styles.stepNumber}>01</Text>
        <View><Text variant="eyebrow">Choose your rhythm</Text><Text variant="heading">Two gentle invitations</Text></View>
      </View>
      <Card variant="tint">
        <View style={styles.timeRow}>
          <View style={styles.timeField}>
            <Text variant="label">Afternoon</Text>
            <Input
              value={draft.afternoonReminderTime}
              onChangeText={(value) => setDraft({ ...draft, afternoonReminderTime: value })}
              accessibilityLabel="Afternoon reminder time"
            />
          </View>
          <View style={styles.timeField}>
            <Text variant="label">Evening</Text>
            <Input
              value={draft.eveningReminderTime}
              onChangeText={(value) => setDraft({ ...draft, eveningReminderTime: value })}
              accessibilityLabel="Evening reminder time"
            />
          </View>
        </View>
        <View style={styles.days}>
          {days.map((day) => {
            const active = draft.reminderDays.includes(day.value);
            return (
              <Pressable
                key={day.value}
                accessibilityRole="button"
                accessibilityLabel={`${day.label} reminder`}
                accessibilityState={{ selected: active }}
                onPress={() =>
                  setDraft({
                    ...draft,
                    reminderDays: active
                      ? draft.reminderDays.filter((value) => value !== day.value)
                      : [...draft.reminderDays, day.value]
                  })
                }
                style={[styles.day, active && styles.dayActive]}
              >
                <Text style={active ? styles.dayActiveText : undefined}>{day.label}</Text>
              </Pressable>
            );
          })}
        </View>
        <Toggle label="Turn on reminders" detail="You can still check in whenever you want." value={draft.notificationsEnabled} onValueChange={(value) => setDraft({ ...draft, notificationsEnabled: value })} />
      </Card>

      <View style={styles.stepHeader}>
        <Text style={styles.stepNumber}>02</Text>
        <View><Text variant="eyebrow">Keep it useful</Text><Text variant="heading">Choose what belongs</Text></View>
      </View>
      <View style={styles.options}>
        <Toggle label="Efficiency" detail="Optional focus percentage for productive work." value={draft.efficiencyEnabled} onValueChange={(value) => setDraft({ ...draft, efficiencyEnabled: value })} />
        <Toggle label="Mood + energy" detail="Optional one-to-five reflections." value={draft.moodEnabled} onValueChange={(value) => setDraft({ ...draft, moodEnabled: value })} />
        <Toggle label="Keep raw audio" detail="Off by default; transcripts can still be retained." value={draft.retainAudio} onValueChange={(value) => setDraft({ ...draft, retainAudio: value })} />
      </View>

      <Card variant="ink" style={styles.privacy}>
        <Ionicons name="finger-print-outline" size={30} color={palette.gold} />
        <Text variant="heading" style={styles.inverse}>Private by posture.</Text>
        <Text style={styles.inverseBody}>No location. No contacts. No passive listening. No messages or calendar. Recording starts only when you ask it to.</Text>
      </Card>
      <Button label="Start weaving my days" icon="arrow-forward" onPress={continueToApp} />
    </Screen>
  );
}

function Toggle({ label, detail, value, onValueChange }: { label: string; detail: string; value: boolean; onValueChange: (value: boolean) => void }) {
  return (
    <View style={styles.toggle}>
      <View style={styles.toggleCopy}><Text variant="label">{label}</Text><Text variant="caption">{detail}</Text></View>
      <Switch accessibilityLabel={label} value={value} onValueChange={onValueChange} trackColor={{ false: palette.line, true: palette.mint }} thumbColor={value ? palette.forest : "#FFFFFF"} />
    </View>
  );
}

const styles = StyleSheet.create({
  intro: { gap: 10, marginVertical: 12 },
  lede: { color: palette.muted, fontSize: 17, lineHeight: 25, maxWidth: 520 },
  stepHeader: { flexDirection: "row", alignItems: "center", gap: 14, marginTop: 10 },
  stepNumber: { color: palette.coral, fontSize: 30, lineHeight: 34, fontWeight: "900" },
  timeRow: { flexDirection: "row", gap: 12 },
  timeField: { flex: 1, gap: 7 },
  days: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  day: { minHeight: 40, borderRadius: 14, paddingHorizontal: 12, alignItems: "center", justifyContent: "center", backgroundColor: "#F6F2E8" },
  dayActive: { backgroundColor: palette.forest, transform: [{ rotate: "-3deg" }] },
  dayActiveText: { color: "#FFFFFF" },
  options: { gap: 2 },
  toggle: { minHeight: 72, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 16, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: palette.line },
  toggleCopy: { flex: 1, gap: 3 },
  privacy: { marginTop: 10 },
  inverse: { color: "#FFFFFF" },
  inverseBody: { color: "#D6E4DE", lineHeight: 23 }
});

