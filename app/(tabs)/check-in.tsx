// Captures a voice or text check-in and turns it into a reviewable activity thread.
import { useRef, useState } from "react";
import { Alert, Pressable, StyleSheet, View } from "react-native";
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
import { Input } from "@/components/Input";
import { BrandMark } from "@/components/BrandMark";
import { Ionicons } from "@expo/vector-icons";

const prompts = [
  "I spent most of my attention on...",
  "I was with...",
  "I recharged by..."
];

export default function CheckInScreen() {
  const { localMode, user, preferences } = useAppState();
  const { draft, error: draftError, replaceDraft } = useCheckInDraft();
  const draftRef = useRef(draft);
  draftRef.current = draft;
  const [text, setText] = useState("");
  const [processing, setProcessing] = useState(false);
  const [recordingActive, setRecordingActive] = useState(false);
  const [paused, setPaused] = useState(false);
  const recorder = useAudioRecorder({ ...RecordingPresets.HIGH_QUALITY, directory: "document" });
  const recorderState = useAudioRecorderState(recorder, 250);
  const duration = Math.min(Math.floor(recorderState.durationMillis / 1000), 300);

  async function startRecording() {
    if (!user) {
      Alert.alert("Sign in required", "Sign in before recording a check-in.");
      return;
    }
    const permission = await AudioModule.requestRecordingPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Microphone permission denied", "You can still use the text check-in field.");
      return;
    }
    const activeDraft = await ensureDraft(user.id, draftRef.current);
    draftRef.current = activeDraft;
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

    const activeDraft = await ensureDraft(user.id, draftRef.current);
    const pendingDraft = { ...activeDraft, pendingAudioUri: uri };
    draftRef.current = pendingDraft;
    await replaceDraft(pendingDraft);
    await processPendingVoice(pendingDraft);
  }

  async function processPendingVoice(activeDraft = draftRef.current) {
    if (!activeDraft?.pendingAudioUri) return;
    setProcessing(true);
    try {
      const result = await processVoiceCheckIn(activeDraft, activeDraft.pendingAudioUri, preferences?.retainAudio ?? false);
      draftRef.current = result;
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
      const activeDraft = await ensureDraft(user.id, draftRef.current);
      const result = await processTextCheckIn(activeDraft, text.trim());
      draftRef.current = result;
      await replaceDraft(result);
      setText("");
      router.push("/review");
    } catch (error) {
      Alert.alert("Extraction failed", error instanceof Error ? error.message : "Try again.");
    } finally {
      setProcessing(false);
    }
  }

  const emptyStatus = localMode
    ? "In local mode, text stays on this device."
    : "Recording and extraction only happen when you ask.";

  return (
    <Screen>
      <View style={styles.topBar}>
        <BrandMark compact />
        <Text variant="eyebrow">New thread</Text>
      </View>
      <View style={styles.intro}>
        <Text variant="display">What made up{"\n"}your day?</Text>
        <Text style={styles.lede}>Speak naturally. Approximate is useful; perfect is not required.</Text>
      </View>
      {draftError ? <Card><Text>{draftError}</Text></Card> : null}
      {localMode ? (
        <View style={styles.voiceNotice}>
          <View style={styles.voiceIcon}><Ionicons name="mic-off-outline" size={22} color={palette.coral} /></View>
          <View style={styles.noticeCopy}>
            <Text variant="label">Voice is resting for now</Text>
            <Text variant="caption">Text stays on this device. Voice returns when the private backend is connected.</Text>
          </View>
        </View>
      ) : (
        <Card variant="ink" style={styles.voiceCard}>
          <Text variant="eyebrow" style={styles.inverseMuted}>Voice note</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={recordingActive ? "Finish recording" : "Start recording"}
            onPress={() => void (recordingActive ? finishRecording() : startRecording())}
            disabled={processing}
            style={styles.recordCircle}
          >
            <Ionicons name={recordingActive ? "stop" : "mic"} size={32} color="#FFFFFF" />
            <Text variant="metric" style={styles.inverse}>{Math.floor(duration / 60)}:{String(duration % 60).padStart(2, "0")}</Text>
          </Pressable>
          <View style={styles.actions}>
            <Button label={recordingActive ? "Finish" : "Record"} icon={recordingActive ? "stop-outline" : "mic-outline"} onPress={recordingActive ? finishRecording : startRecording} disabled={processing} />
            <Button label={paused ? "Resume" : "Pause"} icon={paused ? "play-outline" : "pause-outline"} variant="secondary" onPress={togglePause} disabled={!recordingActive || processing} />
            <Button label="Cancel" icon="close-outline" variant="danger" onPress={cancelRecording} disabled={!recordingActive || processing} />
          </View>
          {draft?.pendingAudioUri ? <Button label="Retry saved recording" icon="refresh-outline" variant="secondary" onPress={() => processPendingVoice()} disabled={processing} /> : null}
          <Text variant="caption" style={styles.inverseMuted}>Five minutes maximum. Recording only happens while this screen is open.</Text>
        </Card>
      )}

      <View style={styles.composer}>
        <Text variant="eyebrow">Write it out</Text>
        <Input
          value={text}
          onChangeText={setText}
          multiline
          placeholder="I worked on the presentation from nine to eleven, had lunch with Aya, then went to the gym..."
          style={styles.textArea}
          accessibilityLabel="Check-in text"
        />
        <View style={styles.prompts}>
          {prompts.map((prompt) => (
            <Pressable
              key={prompt}
              accessibilityRole="button"
              accessibilityLabel={`Use starter: ${prompt}`}
              onPress={() => setText((current) => current ? `${current}\n${prompt} ` : `${prompt} `)}
              style={styles.prompt}
            >
              <Text style={styles.promptText}>{prompt}</Text>
            </Pressable>
          ))}
        </View>
        <Button label={processing ? "Finding the moments" : "Shape my timeline"} icon="arrow-forward" onPress={processText} disabled={processing || !text.trim()} />
        <View style={styles.draftStatus}>
          <View style={[styles.statusDot, draft?.entries.length ? styles.statusActive : undefined]} />
          <Text variant="caption">
            {draft?.entries.length
              ? `${draft.entries.length} moments already in this thread. Add anything you forgot.`
              : emptyStatus}
          </Text>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  intro: { gap: 10, marginTop: 8 },
  lede: { color: palette.muted, fontSize: 17, lineHeight: 25, maxWidth: 480 },
  voiceNotice: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderRadius: 24,
    padding: 17,
    backgroundColor: "#F5DDD4"
  },
  voiceIcon: { width: 46, height: 46, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: "#FFF4EF" },
  noticeCopy: { flex: 1, gap: 3 },
  voiceCard: { transform: [{ rotate: "0.4deg" }] },
  inverse: { color: "#FFFFFF" },
  inverseMuted: { color: palette.mint },
  recordCircle: {
    width: 164,
    height: 164,
    borderRadius: 58,
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: palette.coral,
    borderWidth: 10,
    borderColor: "#244F48",
    transform: [{ rotate: "-3deg" }]
  },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  composer: { gap: 14, marginTop: 4 },
  textArea: { minHeight: 210, paddingTop: 18, paddingBottom: 18, textAlignVertical: "top", fontSize: 17, lineHeight: 25 },
  prompts: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  prompt: { borderRadius: 18, borderWidth: 1, borderColor: palette.line, paddingVertical: 9, paddingHorizontal: 13 },
  promptText: { color: palette.muted, fontSize: 12, fontWeight: "700" },
  draftStatus: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  statusDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: palette.line },
  statusActive: { backgroundColor: palette.teal }
});
