// Records one take until the user stops, then transcribes that audio once.
import { browserAudioRecorder } from "@/lib/audioCapture";
import { transcribeRecording } from "@/services/transcription";
import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, Platform, Pressable, View, useWindowDimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AudioModule, RecordingPresets, setAudioModeAsync, useAudioRecorder } from "expo-audio";
import { File } from "expo-file-system";
import { useFocusEffect } from "expo-router";
import { Button } from "./Button";
import { Text } from "./Text";
import { supabase } from "@/services/supabase";

type VoiceState = "idle" | "recording" | "processing";
type WebRecorder = ReturnType<typeof browserAudioRecorder>;

export function TaskVoice({ onTranscript, onInterim, onStateChange, onComplete, largeMicrophone = false, compact = false, startLabel = "Tell me what’s on your mind", listeningHint = "Say each task, its priority, and the time you expect it to take." }: {
  onTranscript: (text: string) => void;
  onComplete?: () => void;
  onInterim?: (text: string) => void;
  onStateChange?: (state: VoiceState) => void;
  compact?: boolean;
  largeMicrophone?: boolean;
  startLabel?: string;
  listeningHint?: string;
}) {
  const [state, setState] = useState<VoiceState>("idle");
  const [message, setMessage] = useState("");
  const webRecorder = useRef<WebRecorder | null>(null);
  const nativeRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const nativeActive = useRef(false);
  const mounted = useRef(true);
  const busy = useRef(false);
  const stopping = useRef(false);
  const { height } = useWindowDimensions();
  const micSize = height < 740 ? 112 : 176;
  const generation = useRef(0);
  const completeCallback = useRef(onComplete);
  const callback = useRef(onTranscript);
  const interimCallback = useRef(onInterim);
  const statusCallback = useRef(onStateChange);
  useEffect(() => {
    completeCallback.current = onComplete;
    callback.current = onTranscript;
    interimCallback.current = onInterim;
    statusCallback.current = onStateChange;
  }, [onComplete, onInterim, onStateChange, onTranscript]);
  useEffect(() => { statusCallback.current?.(state); }, [state]);
  const removeAudio = useCallback((uri: string | null) => {
    if (!uri || Platform.OS === "web") return;
    try { new File(uri).delete(); } catch { /* The OS can reclaim a temp recording that is already gone. */ }
  }, []);
  const cancel = useCallback(async (reason?: string) => {
    stopping.current = false;
    generation.current += 1;
    webRecorder.current?.abort();
    webRecorder.current = null;
    interimCallback.current?.("");
    if (nativeActive.current) {
      nativeActive.current = false;
      await nativeRecorder.stop();
      removeAudio(nativeRecorder.uri);
      await setAudioModeAsync({ allowsRecording: false });
    }
    if (mounted.current) {
      setState("idle");
      if (reason) setMessage(reason);
    }
    statusCallback.current?.("idle");
  }, [nativeRecorder, removeAudio]);
  useEffect(() => {
    mounted.current = true;
    const subscription = AppState.addEventListener("change", (next) => {
      if (next !== "active") void cancel("Recording stopped because the app moved to the background. Tap to start again, or type.");
    });
    return () => { mounted.current = false; subscription.remove(); void cancel(); };
  }, [cancel]);
  useFocusEffect(useCallback(() => () => { void cancel(); }, [cancel]));

  async function finish() {
    if (stopping.current || state !== "recording") return;
    stopping.current = true;
    const token = generation.current;
    setState("processing");
    setMessage("");
    const recorder = webRecorder.current;
    webRecorder.current = null;
    try {
      const transcript = recorder ? await stopWeb(recorder, token) : await stopNative(token);
      if (!transcript || !mounted.current || token !== generation.current) return;
      callback.current(transcript);
      completeCallback.current?.();
    } catch (error) {
      if (mounted.current && token === generation.current) setMessage(error instanceof Error ? error.message : "Recording failed.");
    } finally {
      stopping.current = false;
      if (mounted.current && token === generation.current) setState("idle");
    }
  }

  async function stopWeb(recorder: WebRecorder, token: number) {
    const blob = await recorder.stop();
    if (token !== generation.current) return;
    return transcribeRecording({ blob });
  }

  async function stopNative(token: number) {
    if (!nativeActive.current) throw new Error("Recording has not started.");
    nativeActive.current = false;
    await nativeRecorder.stop();
    await setAudioModeAsync({ allowsRecording: false });
    const uri = nativeRecorder.uri;
    if (!uri) throw new Error("Voice transcription is unavailable. You can type below.");
    try {
      if (token !== generation.current) return;
      return await transcribeRecording({ uri, name: "check-in.m4a", type: "audio/m4a" });
    } finally {
      removeAudio(uri);
    }
  }

  async function start() {
    if (busy.current || state !== "idle") return;
    busy.current = true;
    stopping.current = false;
    setMessage("");
    const token = ++generation.current;
    try {
      if (Platform.OS === "web") {
        if (!supabase) throw new Error("Voice transcription is not connected. Type below.");
        const recorder = browserAudioRecorder();
        webRecorder.current = recorder;
        await recorder.start();
        if (token !== generation.current) {
          recorder.abort();
          webRecorder.current = null;
          return;
        }
      } else {
        if (!supabase) throw new Error("Voice transcription needs a connected backend. You can type below.");
        if (!(await AudioModule.requestRecordingPermissionsAsync()).granted) throw new Error("Microphone access was denied. You can type below.");
        if (token !== generation.current) return;
        await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
        await nativeRecorder.prepareToRecordAsync();
        nativeRecorder.record();
        nativeActive.current = true;
        if (token !== generation.current) {
          nativeActive.current = false;
          await nativeRecorder.stop();
          removeAudio(nativeRecorder.uri);
          await setAudioModeAsync({ allowsRecording: false });
          return;
        }
      }
      if (!mounted.current || token !== generation.current) {
        await cancel();
        return;
      }
      setState("recording");
    } catch (error) {
      webRecorder.current?.abort();
      webRecorder.current = null;
      if (mounted.current) setMessage(microphoneMessage(error));
      if (mounted.current) setState("idle");
    } finally {
      busy.current = false;
    }
  }

  if (largeMicrophone) {
    return <View style={{ alignItems: "center", gap: 8, width: "100%", flexShrink: 0 }}>
      <View style={{ padding: height < 740 ? 8 : 12, borderRadius: 120, backgroundColor: state === "recording" ? "#423159" : "#211B30", borderWidth: 1, borderColor: state === "recording" ? "#BBA1FF" : "#352946" }}>
        <Pressable accessibilityRole="button" accessibilityLabel={state === "processing" ? "Transcribing recording" : state === "recording" ? "Stop recording" : "Start recording"} accessibilityHint="Tap once to start. Tap again to finish." accessibilityState={{ disabled: state === "processing", busy: state === "processing" }} disabled={state === "processing"} onPress={() => void (state === "recording" ? finish() : start())}
          style={{ width: micSize, height: micSize, borderRadius: micSize / 2, alignItems: "center", justifyContent: "center", backgroundColor: state === "recording" ? "#F7AECD" : "#C4B5FD", transform: [{ scale: state === "recording" ? 0.96 : 1 }], ...(Platform.OS === "web" ? { userSelect: "none", touchAction: "none" } as object : {}) }}>
          <Ionicons name={state === "processing" ? "ellipsis-horizontal" : state === "recording" ? "stop" : "mic"} size={height < 740 ? 52 : 68} color="#251936" />
        </Pressable>
      </View>
      <Text style={{ color: "#C4B5FD", fontSize: 11, lineHeight: 18, letterSpacing: 2, fontWeight: "800" }}>{state === "recording" ? "LISTENING · TAP TO FINISH" : state === "processing" ? "TRANSCRIBING" : "TAP TO TALK"}</Text>
      {!!message && <Text accessibilityRole="alert" style={{ color: "#FFB5C4", textAlign: "center", fontSize: 12, lineHeight: 17 }}>{message}</Text>}
    </View>;
  }
  return <>
    <Button label={state === "recording" ? "Finish dictation" : state === "processing" ? "Transcribing…" : startLabel} icon={state === "recording" ? "stop-outline" : "mic-outline"} onPress={() => void (state === "recording" ? finish() : start())} disabled={state === "processing"} />
    {state === "recording" && <Button label="Cancel recording" variant="ghost" onPress={() => void cancel()} />}
    <Text variant="caption">{compact ? (state === "recording" ? "Listening. Tap to finish." : "Tap to talk. The recording is transcribed once when you stop.") : state === "recording" ? "Listening. Tap finish when you are done. " + listeningHint : "Tap to dictate, or type below. Stopping sends one recording to transcription."}</Text>
    {!!message && <Text accessibilityRole="alert">{message}</Text>}
  </>;
}

function microphoneMessage(error: unknown) {
  if (error instanceof Error && (error.name === "NotAllowedError" || error.name === "PermissionDeniedError")) {
    return "Microphone access was denied. Allow the microphone, or type below.";
  }
  return error instanceof Error && error.message ? error.message : "Microphone unavailable.";
}
