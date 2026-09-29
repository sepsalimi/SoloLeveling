import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, Platform } from "react-native";
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
export function TaskVoice({ onTranscript, onInterim, onStateChange, compact = false, startLabel = "Tell me what’s on your mind", listeningHint = "Say each task, its priority, and the time you expect it to take." }: {
  onTranscript: (text: string) => void;
  onInterim?: (text: string) => void;
  onStateChange?: (state: VoiceState) => void;
  compact?: boolean;
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
  const generation = useRef(0);
  const callback = useRef(onTranscript); callback.current = onTranscript;
  const interimCallback = useRef(onInterim); interimCallback.current = onInterim;
  const statusCallback = useRef(onStateChange); statusCallback.current = onStateChange;
  useEffect(() => { statusCallback.current?.(state); }, [state]);
  const removeAudio = useCallback((uri: string | null) => { if (uri && Platform.OS !== "web") { try { new File(uri).delete(); } catch { /* Temporary cache cleanup can be retried by the OS. */ } } }, []);
  const cancel = useCallback(async () => {
    generation.current++;
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
    if (recognition.current) { recognition.current.stop(); return; }
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
    busy.current = true; setMessage("");
    const token = ++generation.current;
    try {
      if (Platform.OS === "web") {
        const browser = globalThis as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
        const Constructor = browser.SpeechRecognition ?? browser.webkitSpeechRecognition;
        if (!Constructor) throw new Error("Voice dictation is unavailable in this browser. Try Chrome or Edge, or type below.");
        const speech = new Constructor();
        speech.continuous = true; speech.interimResults = true; speech.lang = "en-US";
        speech.onresult = event => {
          if (token !== generation.current) return;
          for (let i = event.resultIndex; i < event.results.length; i++) if (event.results[i].isFinal) callback.current(event.results[i][0].transcript);
          let pending = "";
          for (let i = 0; i < event.results.length; i++) if (!event.results[i].isFinal) pending += event.results[i][0].transcript + " ";
          interimCallback.current?.(pending.trim());
        };
        speech.onerror = event => { if (mounted.current && token === generation.current) setMessage(event.error === "not-allowed" ? "Microphone access was denied. Enable it in your browser or type below." : "Dictation stopped (" + event.error + "). Your captured text is still below."); };
        speech.onend = () => { if (timer.current) clearTimeout(timer.current); recognition.current = null; interimCallback.current?.(""); if (mounted.current && token === generation.current) setState("idle"); };
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
    } catch (error) { await cancel(); if (mounted.current) setMessage(error instanceof Error ? error.message : "Microphone unavailable."); }
    finally { busy.current = false; }
  }
  return <>
    <Button label={state === "recording" ? "Finish dictation" : state === "processing" ? "Transcribing…" : startLabel} icon={state === "recording" ? "stop-outline" : "mic-outline"} onPress={() => void (state === "recording" ? finish() : start())} disabled={state === "processing"} />
    {state === "recording" && <Button label="Cancel recording" variant="ghost" onPress={() => void cancel()} />}
    <Text variant="caption">{compact ? (state === "recording" ? "Listening · no chimes, no interruptions." : "Tap to talk. Your browser or transcription service processes the audio.") : state === "recording" ? "Listening · stops after five minutes. " + listeningHint : "Tap to dictate, or type below. Audio is processed by your browser’s speech service on web, or the connected transcription service on mobile."}</Text>
    {!!message && <Text>{message}</Text>}
  </>;
}
