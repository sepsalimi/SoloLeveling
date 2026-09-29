import { useEffect, useMemo, useRef, useState } from "react";
import { Platform, Pressable, StyleSheet, TextInput, useColorScheme, useWindowDimensions, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { Screen } from "@/components/Screen";
import { Text } from "@/components/Text";
import { TaskVoice } from "@/components/TaskVoice";
import { ActivityCueTile } from "@/components/ActivityCueTile";
import { MorningPlan } from "@/components/MorningPlan";
import { defaultCues, hearActivities, HeardActivity, makeEveningSession, mentionedCues } from "@/lib/checkIn";
import { isoDate } from "@/lib/dates";
import { useAppState } from "@/context/AppState";
import { activityCategories } from "@/types/activity";
import { palette } from "@/theme/colors";

export default function CheckInScreen() {
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const [tab, setTab] = useState(mode === "morning" ? "morning" : "evening");
  const [text, setText] = useState("");
  const [interim, setInterim] = useState("");
  const [voice, setVoice] = useState<"idle" | "recording" | "processing">("idle");
  const [date, setDate] = useState(isoDate());
  const [review, setReview] = useState<HeardActivity[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [message, setMessage] = useState("");
  const sessionId = useRef("evening-" + Date.now() + "-" + Math.random().toString(36).slice(2));
  const saveLock = useRef(false);
  const { preferences, saveEvening, storageError } = useAppState();
  const cues = preferences?.activityCues ?? defaultCues;
  const heard = useMemo(() => mentionedCues(text + " " + interim, cues), [text, interim, cues]);
  const { width } = useWindowDimensions();
  const columns = width >= 1000 ? 4 : width >= 650 ? 3 : 2;
  const tileWidth = (width - 40 - (columns - 1) * 12) / columns;
  const dark = useColorScheme() === "dark";
  const ink = dark ? palette.darkInk : palette.ink;
  const capturing = voice !== "idle";
  useEffect(() => { if (mode === "morning" || mode === "evening") setTab(mode); }, [mode]);
  async function save() {
    if (!review || saveLock.current) return;
    saveLock.current = true; setSaving(true); setMessage("");
    try {
      const session = makeEveningSession(sessionId.current, date, text, review);
      const result = await saveEvening(session);
      setMessage(result); setSaved(true);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not save. Your draft is still here."); }
    finally { saveLock.current = false; setSaving(false); }
  }
  return <Screen>
    <View style={styles.tabs}>
      {(["morning", "evening"] as const).map(value => <Pressable key={value} accessibilityRole="button" accessibilityState={{ selected: tab === value }} disabled={capturing || saving} onPress={() => setTab(value)} style={[styles.tab, tab === value && styles.selected]}>
        <Text style={{ color: tab === value ? "#FFFFFF" : "#514570", fontWeight: "800" }}>{value === "morning" ? "☀️ Morning" : "🌙 Evening"}</Text>
      </Pressable>)}
    </View>
    {tab === "morning" ? <MorningPlan showDisabled /> : <>
      <Text variant="caption">A LITTLE REFLECTION. A CLEARER PICTURE.</Text>
      <Text variant="title">How did your day go?</Text>
      <Text>Just talk. The colours will fade as you cover each part of your day, leaving the rest in focus.</Text>
      <View style={styles.dateRow}><Text variant="caption">Recording for</Text><TextInput value={date} editable={!capturing && !saving && !saved} onChangeText={setDate} accessibilityLabel="Check-in date" placeholder="YYYY-MM-DD" style={[styles.date, { color: ink }]} /></View>
      {!review && !saved && <View style={{ gap: 8 }}>
        <TaskVoice compact
          startLabel="Tell me about today"
          listeningHint="Take your time. Nothing will chime or speak over you."
          onStateChange={setVoice}
          onInterim={setInterim}
          onTranscript={part => setText(current => (current + " " + part).trim())}
        />
      </View>}
      <View style={styles.tiles}>{cues.map(cue => <ActivityCueTile key={cue.id} cue={cue} heard={heard.has(cue.id)} width={tileWidth} />)}</View>
      <Text variant="caption">{heard.size} of {cues.length} topics covered · It’s fine to leave some bright. You don’t need to do everything.</Text>
      {Platform.OS !== "web" && <Text variant="caption">On mobile builds, tiles update when transcription finishes. For live cues while speaking, use the web app in a browser with dictation support.</Text>}
      {!review && !saved && <Card style={{ borderRadius: 24, borderColor: "#A998FF", borderWidth: 2 }}>
        <View style={styles.voiceHeader}><Text variant="heading">{voice === "recording" ? "● Listening to your day" : voice === "processing" ? "Putting it into words…" : "Your day, in your words"}</Text></View>
        <TextInput accessibilityLabel="Evening transcript" value={text} onChangeText={setText} editable={!capturing} multiline placeholder="I went to work today and after I worked out for 30 min. I studied for my P.Eng exam for an hour…" placeholderTextColor={palette.muted} style={[styles.transcript, { color: ink }]} />
        {!!interim && <Text style={{ color: dark ? "#C8BCFF" : "#6F50BE" }}>{interim}</Text>}
        <Text variant="caption">Silent visual feedback only. A faded tile means mentioned, not completed or saved. You can correct the text before reviewing.</Text>
        <Button label="Review my day" icon="checkmark-outline" disabled={capturing || !text.trim()} onPress={() => { setReview(hearActivities(text, cues)); setMessage(""); }} />
      </Card>}
      {review && !saved && <Card style={{ borderRadius: 24 }}>
        <Text variant="heading">Here’s what we heard ✨</Text>
        <Text>Check the activities and fill in any missing minutes. These are actual durations, separate from your task estimates.</Text>
        {review.map(item => <View key={item.key} style={styles.reviewRow}>
          <TextInput accessibilityLabel={"Activity title " + item.key} value={item.title} editable={!saving} onChangeText={title => setReview(items => items!.map(a => a.key === item.key ? { ...a, title } : a))} style={[styles.input, { color: ink }]} />
          <Text variant="caption">Minutes spent · {item.minutes == null ? "please fill this in" : item.minutes + " min"}</Text>
          <TextInput accessibilityLabel={"Minutes for " + item.title} value={item.minutes == null ? "" : String(item.minutes)} editable={!saving} keyboardType="number-pad" placeholder="How many minutes?" placeholderTextColor={palette.muted} onChangeText={value => setReview(items => items!.map(a => a.key === item.key ? { ...a, minutes: value.trim() ? Number(value) : null } : a))} style={[styles.input, { color: ink }]} />
          <View style={styles.categories}>{activityCategories.map(category => <Pressable key={category} disabled={saving} accessibilityRole="button" accessibilityLabel={item.title + " category " + category} accessibilityState={{ selected: item.category === category }} onPress={() => setReview(items => items!.map(a => a.key === item.key ? { ...a, category } : a))} style={[styles.category, item.category === category && styles.selected]}><Text style={{ fontSize: 12, color: item.category === category ? "#FFFFFF" : "#514570" }}>{category.replace("_"," ")}</Text></Pressable>)}</View>
          <Button label={"Remove " + item.title} variant="ghost" disabled={saving} onPress={() => setReview(items => items!.filter(a => a.key !== item.key))} />
        </View>)}
        <Button label="Add an activity" variant="secondary" disabled={saving} onPress={() => setReview(items => [...items!, { key: "manual-" + Date.now(), title: "", category: "other", minutes: null, source: "" }])} />
        <Button label={saving ? "Saving your day…" : "Save my day"} icon="save-outline" disabled={saving || !review.length} onPress={() => void save()} />
        <Button label="Back to my recording" variant="ghost" disabled={saving} onPress={() => { setReview(null); setMessage(""); }} />
      </Card>}
      {!!message && <Card><Text accessibilityRole="alert">{message}</Text></Card>}
      {!!storageError && <Text>{storageError}</Text>}
      {saved && <Card style={{ borderRadius: 24, backgroundColor: "#D6FAEA" }}>
        <Text style={{ color: "#203E33", fontSize: 24, fontWeight: "800" }}>Your day is in the picture. ✓</Text>
        <Text style={{ color: "#203E33" }}>Your activities are saved with their date, category, and time spent.</Text>
        <Button label="See my analytics" onPress={() => router.push("/(tabs)/analytics")} />
        <Button label="Start another check-in" variant="secondary" onPress={() => { setSaved(false); setReview(null); setText(""); setInterim(""); setDate(isoDate()); setMessage(""); sessionId.current = "evening-" + Date.now() + "-" + Math.random().toString(36).slice(2); }} />
        <Button label="Back to Today" variant="secondary" onPress={() => router.push("/(tabs)/home")} />
      </Card>}
    </>}
  </Screen>;
}
const styles = StyleSheet.create({
  tabs: { flexDirection: "row", gap: 8, padding: 5, borderRadius: 18, backgroundColor: "#EDE6FF" },
  tab: { flex: 1, alignItems: "center", padding: 14, borderRadius: 14 },
  selected: { backgroundColor: "#7853D4" },
  tiles: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  dateRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  date: { padding: 10, borderWidth: 1, borderColor: palette.line, borderRadius: 10, width: 160, minHeight: 44 },
  voiceHeader: { paddingBottom: 8 },
  transcript: { minHeight: 120, padding: 12, borderWidth: 1, borderColor: palette.line, borderRadius: 14, fontSize: 16, textAlignVertical: "top" },
  input: { minHeight: 48, padding: 12, borderWidth: 1, borderColor: palette.line, borderRadius: 12, fontSize: 16 },
  reviewRow: { gap: 10, borderBottomWidth: 1, borderBottomColor: palette.line, paddingVertical: 16 },
  categories: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  category: { minHeight: 40, justifyContent: "center", backgroundColor: "#EDE6FF", paddingHorizontal: 10, borderRadius: 10 },
});
