import { useState } from "react";
import { Pressable, StyleSheet, Switch, TextInput, View } from "react-native";
import { router } from "expo-router";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { Screen } from "@/components/Screen";
import { Text } from "@/components/Text";
import { useAppState } from "@/context/AppState";
import { defaultPreferences } from "@/data/sample";
import { palette } from "@/theme/colors";

const days = ["M", "T", "W", "T", "F", "S", "S"];
const dayValues = [1, 2, 3, 4, 5, 6, 0];

export default function OnboardingScreen() {
  const { preferences, updatePreferences } = useAppState();
  const [draft, setDraft] = useState(preferences ?? defaultPreferences);

  async function continueToApp() {
    await updatePreferences(draft);
    router.replace("/(tabs)/home");
  }

  return (
    <Screen>
      <Text variant="title">A lighter way to remember your day</Text>
      <Card>
        <Text variant="heading">Reminders</Text>
        <TextInput
          value={draft.afternoonReminderTime}
          onChangeText={(value) => setDraft({ ...draft, afternoonReminderTime: value })}
          style={styles.input}
          accessibilityLabel="Afternoon reminder time"
        />
        <TextInput
          value={draft.eveningReminderTime}
          onChangeText={(value) => setDraft({ ...draft, eveningReminderTime: value })}
          style={styles.input}
          accessibilityLabel="Evening reminder time"
        />
        <View style={styles.days}>
          {days.map((label, index) => {
            const value = dayValues[index];
            const active = draft.reminderDays.includes(value);
            return (
              <Pressable
                key={`${label}-${index}`}
                accessibilityRole="button"
                accessibilityLabel={`${label} reminder`}
                onPress={() =>
                  setDraft({
                    ...draft,
                    reminderDays: active ? draft.reminderDays.filter((day) => day !== value) : [...draft.reminderDays, value]
                  })
                }
                style={[styles.day, active && styles.dayActive]}
              >
                <Text style={active ? styles.dayActiveText : undefined}>{label}</Text>
              </Pressable>
            );
          })}
        </View>
      </Card>
      <Card>
        <Toggle label="Efficiency tracking" value={draft.efficiencyEnabled} onValueChange={(value) => setDraft({ ...draft, efficiencyEnabled: value })} />
        <Toggle label="Mood and energy" value={draft.moodEnabled} onValueChange={(value) => setDraft({ ...draft, moodEnabled: value })} />
        <Toggle label="Retain raw audio" value={draft.retainAudio} onValueChange={(value) => setDraft({ ...draft, retainAudio: value })} />
      </Card>
      <Card>
        <Text variant="heading">Privacy</Text>
        <Text>
          The app records only after you press record. It does not continuously listen, track location, read messages, access contacts,
          inspect photos, or monitor your calendar. Audio is deleted after transcription by default.
        </Text>
      </Card>
      <Button label="Continue" icon="arrow-forward-outline" onPress={continueToApp} />
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
  days: { flexDirection: "row", gap: 8 },
  day: { width: 38, height: 38, borderRadius: 8, alignItems: "center", justifyContent: "center", backgroundColor: "#EEF4F1" },
  dayActive: { backgroundColor: palette.teal },
  dayActiveText: { color: "#FFFFFF" },
  toggle: { minHeight: 44, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 16 }
});

