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
type Recognition = {
  continuous: boolean; interimResults: boolean; lang: string;
  onresult: ((event: { resultIndex: number; results: { length: number; [i: number]: { isFinal: boolean; [i: number]: { transcript: string } } } }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void; stop(): void; abort(): void;
};
export function TaskVoice({ onTranscript, onInterim, onStateChange, holdToTalk = false, compact = false, startLabel = "Tell me what’s on your mind", listeningHint = "Say each task, its priority, and the time you expect it to take." }: {
  onTranscript: (text: string) => void;
  onInterim?: (text: string) => void;
  onStateChange?: (state: VoiceState) => void;
  compact?: boolean;
  holdToTalk?: boolean;
  startLabel?: string;
  listeningHint?: string;
}) {
  const [state, setState] = useState<VoiceState>("idle");
  const [message, setMessage] = useState("");
  const recognition = useRef<Recognition | null>(null);
  const recording = useRef<Audio.Recording | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mounted = useRef(true);
  const busy = useRef(false);
  const held = useRef(false);
  const pending = useRef("");
  const received = useRef(false);
  const { height } = useWindowDimensions();
  const micSize = height < 740 ? 112 : 176;
  const generation = useRef(0);
  const callback = useRef(onTranscript); callback.current = onTranscript;
  const interimCallback = useRef(onInterim); interimCallback.current = onInterim;
  const statusCallback = useRef(onStateChange); statusCallback.current = onStateChange;
  useEffect(() => { statusCallback.current?.(state); }, [state]);
  const removeAudio = useCallback((uri: string | null) => { if (uri && Platform.OS !== "web") { try { new File(uri).delete(); } catch { /* Temporary cache cleanup can be retried by the OS. */ } } }, []);
  const cancel = useCallback(async () => {
    generation.current++; held.current = false; pending.current = "";
    if (timer.current) clearTimeout(timer.current);
    const speech = recognition.current; recognition.current = null;
    if (speech) { speech.onresult = null; speech.onend = null; speech.onerror = null; speech.abort(); }
    interimCallback.current?.("");
    const current = recording.current; recording.current = null;
    if (current) { await current.stopAndUnloadAsync().catch(() => {}); removeAudio(current.getURI()); await Audio.setAudioModeAsync({ allowsRecordingIOS: false }).catch(() => {}); }
    if (mounted.current) setState("idle");
    statusCallback.current?.("idle");
  }, [removeAudio]);
  useEffect(() => {
    mounted.current = true;
    const subscription = AppState.addEventListener("change", next => { if (next !== "active") void cancel(); });
    return () => { mounted.current = false; subscription.remove(); void cancel(); };
  }, [cancel]);
  useFocusEffect(useCallback(() => () => { void cancel(); }, [cancel]));
  async function finish() {
    if (timer.current) clearTimeout(timer.current);
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
      if (mounted.current && token === generation.current) callback.current(data.transcript);
    } catch (error) { if (mounted.current && token === generation.current) setMessage(error instanceof Error ? error.message : "Recording failed."); }
    finally { removeAudio(current.getURI()); if (mounted.current && token === generation.current) setState("idle"); }
  }
  async function start() {
    if (busy.current || state !== "idle") return;
    busy.current = true; pending.current = ""; received.current = false; setMessage("");
    const token = ++generation.current;
    function pendingRef(value: string) { pending.current = value; interimCallback.current?.(value); }
    try {
      if (Platform.OS === "web") {
        const browser = globalThis as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
        const Constructor = browser.SpeechRecognition ?? browser.webkitSpeechRecognition;
        if (!Constructor) throw new Error("Voice dictation is unavailable in this browser. Try Chrome or Edge, or type below.");
        const speech = new Constructor();
        speech.continuous = true; speech.interimResults = true; speech.lang = "en-US";
        speech.onresult = event => {
          if (token !== generation.current) return;
          for (let i = event.resultIndex; i < event.results.length; i++) if (event.results[i].isFinal) { callback.current(event.results[i][0].transcript); received.current = true; }
          let pending = "";
          for (let i = 0; i < event.results.length; i++) if (!event.results[i].isFinal) pending += event.results[i][0].transcript + " ";
          pendingRef(pending.trim());
        };
        speech.onerror = event => { if (mounted.current && token === generation.current) setMessage(event.error === "not-allowed" ? "Microphone access was denied. Enable it in your browser or type below." : "Dictation stopped (" + event.error + "). Your captured text is still below."); };
        speech.onend = () => {
          if (token !== generation.current) return;
          if (timer.current) clearTimeout(timer.current);
          recognition.current = null;
          // Mobile engines can end with only an interim result. Preserve it for review.
          if (pending.current) { callback.current(pending.current); received.current = true; }
          pending.current = ""; interimCallback.current?.("");
          if (mounted.current) {
            setState("idle");
            if (!received.current) setMessage(current => current || "No words captured. Hold until you finish speaking, or use your keyboard microphone under Prefer to type.");
          }
        };
        recognition.current = speech; speech.start();
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
      timer.current = setTimeout(() => void finish(), 300000);
      if (holdToTalk && !held.current) void finish();
    } catch (error) { await cancel(); if (mounted.current) setMessage(error instanceof Error ? error.message : "Microphone unavailable."); }
    finally { busy.current = false; }
  }
  if (holdToTalk) {
    const startHold = () => { held.current = true; void start(); };
    const endHold = () => { held.current = false; if (!busy.current) void finish(); };
    const webProps = Platform.OS === "web" ? {
      onContextMenu: (event: { preventDefault(): void }) => event.preventDefault(),
      onKeyDown: (event: { key: string; repeat: boolean; preventDefault(): void }) => { if (event.key === " " || event.key === "Enter") { event.preventDefault(); if (!event.repeat) startHold(); } },
      onKeyUp: (event: { key: string; preventDefault(): void }) => { if (event.key === " " || event.key === "Enter") { event.preventDefault(); endHold(); } },
    } : {};
    return <View style={{ alignItems: "center", gap: 8, width: "100%", flexShrink: 0 }}>
      <View style={{ padding: height < 740 ? 8 : 12, borderRadius: 120, backgroundColor: state === "recording" ? "#423159" : "#211B30", borderWidth: 1, borderColor: state === "recording" ? "#BBA1FF" : "#352946" }}>
        <Pressable {...webProps} accessibilityRole="button" accessibilityLabel={state === "processing" ? "Finishing recording" : "Hold to talk"} accessibilityHint="Hold while speaking. Release to finish. Keyboard users can hold Space or Enter." disabled={state === "processing"} onPressIn={startHold} onPressOut={endHold}
          style={{ width: micSize, height: micSize, borderRadius: micSize / 2, alignItems: "center", justifyContent: "center", backgroundColor: state === "recording" ? "#F7AECD" : "#C4B5FD", transform: [{ scale: state === "recording" ? 0.96 : 1 }], ...(Platform.OS === "web" ? { userSelect: "none", touchAction: "none" } as object : {}) }}>
          <Ionicons name={state === "processing" ? "ellipsis-horizontal" : "mic"} size={height < 740 ? 52 : 68} color="#251936" />
        </Pressable>
      </View>
      <Text style={{ color: "#C4B5FD", fontSize: 11, lineHeight: 18, letterSpacing: 2, fontWeight: "800" }}>{state === "recording" ? "LISTENING · RELEASE TO FINISH" : state === "processing" ? "FINISHING…" : "HOLD TO TALK"}</Text>
      {!!message && <Text accessibilityRole="alert" style={{ color: "#FFB5C4", textAlign: "center", fontSize: 12, lineHeight: 17 }}>{message}</Text>}
    </View>;
  }
  return <>
    <Button label={state === "recording" ? "Finish dictation" : state === "processing" ? "Transcribing…" : startLabel} icon={state === "recording" ? "stop-outline" : "mic-outline"} onPress={() => void (state === "recording" ? finish() : start())} disabled={state === "processing"} />
    {state === "recording" && <Button label="Cancel recording" variant="ghost" onPress={() => void cancel()} />}
    <Text variant="caption">{compact ? (state === "recording" ? "Listening · no chimes, no interruptions." : "Tap to talk. Your browser or transcription service processes the audio.") : state === "recording" ? "Listening · stops after five minutes. " + listeningHint : "Tap to dictate, or type below. Audio is processed by your browser’s speech service on web, or the connected transcription service on mobile."}</Text>
    {!!message && <Text>{message}</Text>}
  </>;
}
