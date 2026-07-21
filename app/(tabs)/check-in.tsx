import { useRef, useState } from "react";
import { Alert, StyleSheet, TextInput, View } from "react-native";
import { Audio } from "expo-av";
import { router } from "expo-router";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { Screen } from "@/components/Screen";
import { Text } from "@/components/Text";
import { ActivityEntry } from "@/types/activity";
import { extractActivities } from "@/services/extraction";
import { palette } from "@/theme/colors";

export default function CheckInScreen() {
  const [text, setText] = useState("");
  const [duration, setDuration] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [entries, setEntries] = useState<ActivityEntry[]>([]);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  async function startRecording() {
    const permission = await Audio.requestPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Microphone permission denied", "You can still use the text check-in field.");
      return;
    }
    await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
    const created = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
    setRecording(created.recording);
    setDuration(0);
    timer.current = setInterval(() => setDuration((value) => Math.min(value + 1, 300)), 1000);
  }

  async function stopRecording() {
    if (!recording) return;
    if (timer.current) clearInterval(timer.current);
    await recording.stopAndUnloadAsync();
    setRecording(null);
    Alert.alert("Voice captured", "Production builds upload this note to Supabase Storage and process it with the secure Edge Function. Use text mode in demo.");
  }

  async function processText() {
    if (!text.trim()) return;
    setProcessing(true);
    try {
      const result = await extractActivities(text, entries);
      setEntries(result.activities);
      router.push({ pathname: "/review", params: { payload: JSON.stringify({ transcript: text, entries: result.activities, unresolvedIssues: result.unresolvedIssues }) } });
    } catch (error) {
      Alert.alert("Extraction failed", error instanceof Error ? error.message : "Try again.");
    } finally {
      setProcessing(false);
    }
  }

  return (
    <Screen>
      <Text variant="title">Check in</Text>
      <Card>
        <Text variant="heading">Voice note</Text>
        <View style={styles.recordCircle}>
          <Text variant="metric">{Math.floor(duration / 60)}:{String(duration % 60).padStart(2, "0")}</Text>
        </View>
        <View style={styles.actions}>
          <Button label={recording ? "Finish" : "Record"} icon={recording ? "stop-outline" : "mic-outline"} onPress={recording ? stopRecording : startRecording} />
          <Button label="Pause" icon="pause-outline" variant="secondary" onPress={() => Alert.alert("Paused", "Pause/resume is wired in production recording builds.")} disabled={!recording} />
          <Button label="Cancel" icon="close-outline" variant="danger" onPress={() => setRecording(null)} disabled={!recording} />
        </View>
        <Text variant="caption">Voice notes are limited to five minutes. The app never records in the background.</Text>
      </Card>
      <Card>
        <Text variant="heading">Text alternative</Text>
        <TextInput
          value={text}
          onChangeText={setText}
          multiline
          placeholder="I worked from nine to eleven at around 80 percent efficiency..."
          style={styles.textArea}
          accessibilityLabel="Check-in text"
        />
        <Button label={processing ? "Processing" : "Extract activities"} icon="sparkles-outline" onPress={processText} disabled={processing || !text.trim()} />
        <Text variant="caption">Follow-up notes update the same review session and duplicate entries are filtered.</Text>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  recordCircle: {
    width: 176,
    height: 176,
    borderRadius: 88,
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E7F0EC",
    borderWidth: 8,
    borderColor: palette.mint
  },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  textArea: { minHeight: 144, borderWidth: 1, borderColor: palette.line, borderRadius: 8, padding: 12, fontSize: 16, textAlignVertical: "top" }
});

