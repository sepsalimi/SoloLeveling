import { useState } from "react";
import { Alert, StyleSheet, TextInput, View } from "react-native";
import {
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState
} from "expo-audio";
import { File } from "expo-file-system";
import { router } from "expo-router";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { Screen } from "@/components/Screen";
import { Text } from "@/components/Text";
import { useAppState } from "@/context/AppState";
import { useCheckInDraft } from "@/context/CheckInDraft";
import { ensureDraft, processTextCheckIn, processVoiceCheckIn } from "@/services/checkInService";
import { palette } from "@/theme/colors";

export default function CheckInScreen() {
  const { user, preferences } = useAppState();
  const { draft, replaceDraft } = useCheckInDraft();
  const [text, setText] = useState("");
  const [processing, setProcessing] = useState(false);
  const [recordingActive, setRecordingActive] = useState(false);
  const [paused, setPaused] = useState(false);
  const recorder = useAudioRecorder({ ...RecordingPresets.HIGH_QUALITY, directory: "document" });
  const recorderState = useAudioRecorderState(recorder, 250);
  const duration = Math.min(Math.floor(recorderState.durationMillis / 1000), 300);

  async function startRecording() {
    if (!user) throw new Error("Sign in before recording.");
    const permission = await AudioModule.requestRecordingPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Microphone permission denied", "You can still use the text check-in field.");
      return;
    }
    const activeDraft = await ensureDraft(user.id, draft);
    await replaceDraft(activeDraft);
    await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true, shouldPlayInBackground: false });
    await recorder.prepareToRecordAsync();
    recorder.record({ forDuration: 300 });
    setPaused(false);
    setRecordingActive(true);
  }

  async function finishRecording() {
    if (!recordingActive || !user) return;
    if (recorderState.isRecording || paused) await recorder.stop();
    const uri = recorder.uri ?? recorderState.url;
    setRecordingActive(false);
    setPaused(false);
    if (!uri) {
      Alert.alert("Recording interrupted", "No audio file was created. Please try again.");
      return;
    }

    const activeDraft = await ensureDraft(user.id, draft);
    const pendingDraft = { ...activeDraft, pendingAudioUri: uri };
    await replaceDraft(pendingDraft);
    await processPendingVoice(pendingDraft);
  }

  async function processPendingVoice(activeDraft = draft) {
    if (!activeDraft?.pendingAudioUri) return;
    setProcessing(true);
    try {
      const result = await processVoiceCheckIn(activeDraft, activeDraft.pendingAudioUri, preferences?.retainAudio ?? false);
      await replaceDraft(result);
      router.push("/review");
    } catch (error) {
      Alert.alert("Voice processing failed", error instanceof Error ? error.message : "The recording is saved locally. Try again.");
    } finally {
      setProcessing(false);
    }
  }

  async function togglePause() {
    if (!recordingActive) return;
    if (paused) {
      recorder.record();
      setPaused(false);
    } else {
      recorder.pause();
      setPaused(true);
    }
  }

  async function cancelRecording() {
    if (recorderState.isRecording || paused) await recorder.stop();
    const uri = recorder.uri ?? recorderState.url;
    if (uri) new File(uri).delete();
    setRecordingActive(false);
    setPaused(false);
  }

  async function processText() {
    if (!text.trim() || !user) return;
    setProcessing(true);
    try {
      const activeDraft = await ensureDraft(user.id, draft);
      const result = await processTextCheckIn(activeDraft, text.trim());
      await replaceDraft(result);
      setText("");
      router.push("/review");
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
          <Button label={recordingActive ? "Finish" : "Record"} icon={recordingActive ? "stop-outline" : "mic-outline"} onPress={recordingActive ? finishRecording : startRecording} disabled={processing} />
          <Button label={paused ? "Resume" : "Pause"} icon={paused ? "play-outline" : "pause-outline"} variant="secondary" onPress={togglePause} disabled={!recordingActive || processing} />
          <Button label="Cancel" icon="close-outline" variant="danger" onPress={cancelRecording} disabled={!recordingActive || processing} />
        </View>
        {draft?.pendingAudioUri ? <Button label="Retry saved recording" icon="refresh-outline" variant="secondary" onPress={() => processPendingVoice()} disabled={processing} /> : null}
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
        <Text variant="caption">{draft?.entries.length ? `${draft.entries.length} activities are currently in this check-in. Follow-up notes update the same review.` : "Follow-up notes update the same review session and duplicate entries are filtered."}</Text>
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

