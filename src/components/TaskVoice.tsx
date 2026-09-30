// User-controlled web and native dictation that never submits until the user explicitly stops.
import { continuousSpeech, Recognition } from "@/lib/continuousSpeech";
import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, Platform, Pressable, View, useWindowDimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Audio } from "expo-av";
import { File } from "expo-file-system";
import { useFocusEffect } from "expo-router";
import { Button } from "./Button";
import { Text } from "./Text";
import { supabase } from "@/services/supabase";

type VoiceState = "idle" | "recording" | "processing";
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
  const recognition = useRef<ReturnType<typeof continuousSpeech> | null>(null);
  const recording = useRef<Audio.Recording | null>(null);
  const mounted = useRef(true);
  const busy = useRef(false);
  const stopping = useRef(false);
  const { height } = useWindowDimensions();
  const micSize = height < 740 ? 112 : 176;
  const generation = useRef(0);
  const completeCallback = useRef(onComplete); completeCallback.current = onComplete;
  const callback = useRef(onTranscript); callback.current = onTranscript;
  const interimCallback = useRef(onInterim); interimCallback.current = onInterim;
  const statusCallback = useRef(onStateChange); statusCallback.current = onStateChange;
  useEffect(() => { statusCallback.current?.(state); }, [state]);
  const removeAudio = useCallback((uri: string | null) => { if (uri && Platform.OS !== "web") { try { new File(uri).delete(); } catch { /* Temporary cache cleanup can be retried by the OS. */ } } }, []);
  const cancel = useCallback(async (reason?: string) => {
    stopping.current = false;
    const speech = recognition.current; recognition.current = null;
    speech?.abort(); generation.current++;
    interimCallback.current?.("");
    const current = recording.current; recording.current = null;
    if (current) { await current.stopAndUnloadAsync().catch(() => {}); removeAudio(current.getURI()); await Audio.setAudioModeAsync({ allowsRecordingIOS: false }).catch(() => {}); }
    if (mounted.current) {
      setState("idle");
      if (reason) setMessage(reason);
    }
    statusCallback.current?.("idle");
  }, [removeAudio]);
  useEffect(() => {
    mounted.current = true;
    const subscription = AppState.addEventListener("change", next => {
      if (next !== "active") void cancel("Recording stopped because the app moved to the background. Captured words are kept; tap to continue.");
    });
    return () => { mounted.current = false; subscription.remove(); void cancel(); };
  }, [cancel]);
  useFocusEffect(useCallback(() => () => { void cancel(); }, [cancel]));
  async function finish() {
    if (stopping.current) return;
    stopping.current = true;
    if (recognition.current) { setState("processing"); recognition.current.stop(); return; }
    const current = recording.current; recording.current = null;
    if (!current) return;
    const token = generation.current;
    setState("processing");
    try {
      await current.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
      const uri = current.getURI();
      if (!uri || !supabase) throw new Error("Voice transcription is unavailable. You can type below.");
      const form = new FormData();
      form.append("file", { uri, name: "check-in.m4a", type: "audio/m4a" } as unknown as Blob);
      const { data, error } = await supabase.functions.invoke("transcribe-note", { body: form });
      if (error || !data?.transcript) throw new Error("Could not transcribe this recording. Please try again or type below.");
      if (mounted.current && token === generation.current) { callback.current(data.transcript); completeCallback.current?.(); }
    } catch (error) { if (mounted.current && token === generation.current) setMessage(error instanceof Error ? error.message : "Recording failed."); }
    finally { removeAudio(current.getURI()); if (mounted.current && token === generation.current) setState("idle"); }
  }
  async function start() {
    if (busy.current || state !== "idle") return;
    busy.current = true; stopping.current = false; setMessage("");
    const token = ++generation.current;
    try {
      if (Platform.OS === "web") {
        const browser = globalThis as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
        const Constructor = browser.SpeechRecognition ?? browser.webkitSpeechRecognition;
        if (!Constructor) throw new Error("Voice dictation is unavailable in this browser. Try Chrome or Edge, or type below.");
        const speech = continuousSpeech(Constructor, {
          onFinal: value => { if (token === generation.current) callback.current(value); },
          onInterim: value => { if (token === generation.current) interimCallback.current?.(value); },
          onStopped: () => {
            if (!mounted.current || token !== generation.current) return;
            recognition.current = null; stopping.current = false; setState("idle"); completeCallback.current?.();
          },
          onError: value => {
            if (!mounted.current || token !== generation.current) return;
            recognition.current = null; stopping.current = false; setState("idle"); setMessage(value);
          },
        });
        recognition.current = speech;
        setState("recording"); speech.start();
        return;
      } else {
        if (!supabase) throw new Error("Native voice transcription needs a connected backend. You can also use your keyboard’s dictation or type below.");
        if (!(await Audio.requestPermissionsAsync()).granted) throw new Error("Microphone access was denied. You can type below.");
        if (token !== generation.current) return;
        await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
        const result = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
        if (token !== generation.current) { await result.recording.stopAndUnloadAsync(); removeAudio(result.recording.getURI()); await Audio.setAudioModeAsync({ allowsRecordingIOS: false }); return; }
        recording.current = result.recording;
      }
      if (!mounted.current || token !== generation.current) { await cancel(); return; }
      setState("recording");
    } catch (error) { await cancel(); if (mounted.current) setMessage(error instanceof Error ? error.message : "Microphone unavailable."); }
    finally { busy.current = false; }
  }
  if (largeMicrophone) {
    return <View style={{ alignItems: "center", gap: 8, width: "100%", flexShrink: 0 }}>
      <View style={{ padding: height < 740 ? 8 : 12, borderRadius: 120, backgroundColor: state === "recording" ? "#423159" : "#211B30", borderWidth: 1, borderColor: state === "recording" ? "#BBA1FF" : "#352946" }}>
        <Pressable accessibilityRole="button" accessibilityLabel={state === "processing" ? "Finishing recording" : state === "recording" ? "Stop recording" : "Start recording"} accessibilityHint="Tap once to start. Tap again to finish." accessibilityState={{ disabled: state === "processing", busy: state === "processing" }} disabled={state === "processing"} onPress={() => void (state === "recording" ? finish() : start())}
          style={{ width: micSize, height: micSize, borderRadius: micSize / 2, alignItems: "center", justifyContent: "center", backgroundColor: state === "recording" ? "#F7AECD" : "#C4B5FD", transform: [{ scale: state === "recording" ? 0.96 : 1 }], ...(Platform.OS === "web" ? { userSelect: "none", touchAction: "none" } as object : {}) }}>
          <Ionicons name={state === "processing" ? "ellipsis-horizontal" : state === "recording" ? "stop" : "mic"} size={height < 740 ? 52 : 68} color="#251936" />
        </Pressable>
      </View>
      <Text style={{ color: "#C4B5FD", fontSize: 11, lineHeight: 18, letterSpacing: 2, fontWeight: "800" }}>{state === "recording" ? "LISTENING · TAP TO FINISH" : state === "processing" ? "FINISHING…" : "TAP TO TALK"}</Text>
      {!!message && <Text accessibilityRole="alert" style={{ color: "#FFB5C4", textAlign: "center", fontSize: 12, lineHeight: 17 }}>{message}</Text>}
    </View>;
  }
  return <>
    <Button label={state === "recording" ? "Finish dictation" : state === "processing" ? "Transcribing…" : startLabel} icon={state === "recording" ? "stop-outline" : "mic-outline"} onPress={() => void (state === "recording" ? finish() : start())} disabled={state === "processing"} />
    {state === "recording" && <Button label="Cancel recording" variant="ghost" onPress={() => void cancel()} />}
    <Text variant="caption">{compact ? (state === "recording" ? "Listening · no chimes, no interruptions." : "Tap to talk. Your browser or transcription service processes the audio.") : state === "recording" ? "Listening · tap to finish. " + listeningHint : "Tap to dictate, or type below. Audio is processed by your browser’s speech service on web, or the connected transcription service on mobile."}</Text>
    {!!message && <Text>{message}</Text>}
  </>;
}
