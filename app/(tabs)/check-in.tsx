import { InstallApp } from "@/components/InstallApp";
import { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, TextInput, useWindowDimensions, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "@/components/Text";
import { TaskVoice } from "@/components/TaskVoice";
import { MorningPlan } from "@/components/MorningPlan";
import { defaultCues, hearActivities, HeardActivity, makeEveningSession, mentionedCues } from "@/lib/checkIn";
import { isoDate } from "@/lib/dates";
import { useAppState } from "@/context/AppState";
import { activityCategories } from "@/types/activity";

export default function CheckInScreen() {
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const [tab, setTab] = useState(mode === "morning" ? "morning" : "evening");
  const [text, setText] = useState("");
  const [interim, setInterim] = useState("");
  const [voice, setVoice] = useState<"idle" | "recording" | "processing">("idle");
  const [typing, setTyping] = useState(false);
  const [review, setReview] = useState<HeardActivity[] | null>(null);
  const [index, setIndex] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [message, setMessage] = useState("");
  const sessionId = useRef("evening-" + Date.now() + "-" + Math.random().toString(36).slice(2));
  const date = useRef(isoDate());
  const saveLock = useRef(false);
  const { preferences, saveEvening, storageError } = useAppState();
  const cues = preferences?.activityCues ?? defaultCues;
  const heard = useMemo(() => mentionedCues(text + " " + interim, cues), [text, interim, cues]);
  const { height } = useWindowDimensions();
  const small = height < 740;
  const capturing = voice !== "idle";
  const item = review?.[index];
  const showCues = capturing;
  useEffect(() => { if (mode === "morning" || mode === "evening") setTab(mode); }, [mode]);
  function beginReview() {
    const items = hearActivities(text, cues);
    setReview(items.length ? items : [{ key: "manual", title: "", category: "other", minutes: null, source: text }]);
    setIndex(0); setTyping(false); setMessage("");
  }
  function update(values: Partial<HeardActivity>) {
    setReview(items => items!.map((a, i) => i === index ? { ...a, ...values } : a));
  }
  async function save() {
    if (!review || saveLock.current) return;
    saveLock.current = true; setSaving(true); setMessage("");
    try {
      const session = makeEveningSession(sessionId.current, date.current, text, review);
      const result = await saveEvening(session);
      setMessage(result); setSaved(true);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not save. Your draft is still here."); }
    finally { saveLock.current = false; setSaving(false); }
  }
  const action = (label: string, onPress: () => void, disabled = false) => <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress} style={[styles.action, disabled && { opacity: 0.4 }]}><Text style={styles.actionText}>{label}</Text></Pressable>;
  return <SafeAreaView style={styles.page}>
    <View style={[styles.content, small && { paddingVertical: 12, gap: 10 }]}>
      <View style={styles.header}>
        <Text style={styles.brand}>DAILY / CHECK IN</Text>
        <View style={{ flexDirection: "row", alignItems: "center" }}><InstallApp compact /><Pressable accessibilityRole="button" accessibilityLabel={tab === "evening" ? "Show morning plan" : "Show evening check-in"} disabled={capturing || saving} onPress={() => setTab(tab === "evening" ? "morning" : "evening")} style={styles.mode}>
          <Ionicons name={tab === "evening" ? "moon-outline" : "sunny-outline"} color="#C4B5FD" size={18} />
          <Text style={styles.subtle}>{tab === "evening" ? "Evening" : "Morning"}</Text>
        </Pressable></View>
      </View>
      {tab === "morning" ? <View style={{ flex: 1, justifyContent: "center" }}><MorningPlan showDisabled /></View> : saved ? <View style={styles.center}>
        <View style={styles.success}><Ionicons name="checkmark" size={54} color="#102B25" /></View>
        <Text style={styles.title}>Day captured.</Text>
        <Text style={styles.subtitle}>A little reflection. A clearer picture.</Text>
        <Text style={styles.subtle}>{message}</Text>
        {action("See my analytics", () => router.push("/(tabs)/analytics"))}
        <Pressable accessibilityRole="button" onPress={() => { setSaved(false); setReview(null); setText(""); setMessage(""); date.current = isoDate(); sessionId.current = "evening-" + Date.now(); }}><Text style={styles.link}>Record more</Text></Pressable>
      </View> : review && item ? <View style={styles.review}>
        <Text style={styles.eyebrow}>REVIEW · {index + 1} OF {review.length}</Text>
        <Text style={[styles.title, small && { fontSize: 28 }]}>Make it count.</Text>
        <Text style={styles.subtle}>Check each activity, then save your day.</Text>
        <TextInput accessibilityLabel="Activity title" value={item.title} editable={!saving} onChangeText={title => update({ title })} placeholder="Activity name" placeholderTextColor="#9A96AC" style={styles.input} />
        <View style={styles.duration}><TextInput accessibilityLabel={"Minutes for " + item.title} value={item.minutes == null ? "" : String(item.minutes)} editable={!saving} keyboardType="number-pad" onChangeText={value => update({ minutes: value.trim() ? Number(value) : null })} placeholder="30" placeholderTextColor="#77718C" style={styles.minutes} /><Text style={styles.subtle}>minutes</Text></View>
        <View style={styles.categories}>{activityCategories.map(category => <Pressable key={category} accessibilityRole="button" accessibilityState={{ selected: item.category === category }} disabled={saving} onPress={() => update({ category })} style={[styles.category, item.category === category && { backgroundColor: "#C4B5FD" }]}><Text style={{ color: item.category === category ? "#171126" : "#C8C3D7", fontSize: 12 }}>{category.replace("_", " ")}</Text></Pressable>)}</View>
        {!!message && <Text accessibilityRole="alert" style={styles.error}>{message}</Text>}
        <View style={styles.reviewActions}>
          <Pressable accessibilityRole="button" disabled={saving} onPress={() => { if (index > 0) setIndex(index - 1); else setReview(null); }}><Text style={styles.link}>Back</Text></Pressable>
          {index < review.length - 1 ? action("Next activity →", () => setIndex(index + 1), saving || !item.title.trim() || !item.minutes) : action(saving ? "Saving…" : "Save my day", () => void save(), saving)}
        </View>
        <Pressable accessibilityRole="button" disabled={saving} onPress={() => { if (review.length === 1) setReview(null); else { setReview(review.filter((_, i) => i !== index)); setIndex(Math.max(0, index - 1)); } }}><Text style={styles.subtle}>Remove this activity</Text></Pressable>
      </View> : <>
        <View style={styles.intro}>
          <Text style={styles.eyebrow}>{capturing ? "YOUR MOMENT. NO INTERRUPTIONS." : "A MOMENT FOR YOU"}</Text>
          <Text style={[styles.title, small && { fontSize: 30, lineHeight: 36 }]}>{capturing ? "I'm listening." : text ? "That's your day." : "How was your day?"}</Text>
          <Text style={styles.subtitle}>{capturing ? "Watch your day fall into place." : text ? "Tap again to add more, or send to review." : "Tap to talk. Tap again when you're done."}</Text>
        </View>
        <View style={[styles.stage, small && { gap: 8 }]}>
          <View style={[styles.cues, { height: small ? 112 : 136 }]}>{showCues && cues.map(cue => <View key={cue.id} accessibilityLabel={cue.label + (heard.has(cue.id) ? ", covered" : ", not mentioned yet")} style={[styles.cue, { paddingVertical: small ? 6 : 9, backgroundColor: heard.has(cue.id) ? "#34323D" : cue.color, opacity: heard.has(cue.id) ? 0.45 : 1 }]}><Text numberOfLines={1} style={{ color: heard.has(cue.id) ? "#B8B5C0" : "#211B30", fontWeight: "700", fontSize: small ? 12 : 14, lineHeight: small ? 18 : 20 }}>{heard.has(cue.id) ? "✓" : cue.emoji} {cue.label}</Text></View>)}</View>
          <TaskVoice largeMicrophone compact onStateChange={setVoice} onInterim={setInterim} onTranscript={part => setText(current => (current + " " + part).trim())} />
          <Text accessibilityLabel="Live transcript" numberOfLines={small ? 2 : 3} style={[styles.transcript, { minHeight: small ? 44 : 66 }]}>{text} {interim}</Text>
        </View>
        <View style={styles.footer}>
          {typing && !capturing && <TextInput accessibilityLabel="Evening transcript" value={text} onChangeText={setText} editable={!capturing} multiline placeholder="What did you do, and for how long?" placeholderTextColor="#9A96AC" style={[styles.input, { height: small ? 66 : 90 }]} />}
          <View style={{ height: 54, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }}>
          {!!text.trim() && action("Send my check-in  ↗", beginReview, capturing)}
          <Pressable accessibilityRole="button" disabled={capturing} style={{ opacity: capturing ? 0 : 1 }} onPress={() => setTyping(!typing)}><Text style={styles.link}>{typing ? "Close keyboard" : "Prefer to type?"}</Text></Pressable></View>
          <Text style={styles.privacy}>{capturing ? "Tap to finish · silent visual feedback" : "Just your voice. A little space to reflect."}</Text>
          {!!storageError && <Text style={styles.error}>{storageError}</Text>}
        </View>
      </>}
    </View>
  </SafeAreaView>;
}
const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#111019", overflow: "hidden" },
  content: { flex: 1, width: "100%", maxWidth: 640, alignSelf: "center", paddingHorizontal: 24, paddingVertical: 22, gap: 18, minHeight: 0 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  brand: { color: "#9A94AC", fontSize: 10, letterSpacing: 2, fontWeight: "800" },
  mode: { flexDirection: "row", gap: 7, alignItems: "center", padding: 8 },
  subtle: { color: "#ABA5BC", fontSize: 13 },
  intro: { alignItems: "center", gap: 8, paddingTop: 8 },
  eyebrow: { color: "#BFAAFF", letterSpacing: 2, fontSize: 10, lineHeight: 14, fontWeight: "700" },
  title: { color: "#FAF8FF", fontSize: 36, lineHeight: 42, fontWeight: "800", textAlign: "center", letterSpacing: -1.2 },
  subtitle: { color: "#ABA5BC", fontSize: 14, textAlign: "center", lineHeight: 21 },
  stage: { flex: 1, minHeight: 0, alignItems: "center", justifyContent: "center", gap: 18 },
  cues: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 8 },
  cue: { paddingHorizontal: 12, paddingVertical: 9, borderRadius: 14, maxWidth: "48%" },
  transcript: { color: "#E2DAF4", fontSize: 15, lineHeight: 22, textAlign: "center", width: "100%" },
  footer: { gap: 12, alignItems: "center" },
  privacy: { color: "#767082", fontSize: 11, lineHeight: 16, textAlign: "center" },
  link: { color: "#C4B5FD", fontSize: 14, lineHeight: 20, padding: 8 },
  action: { backgroundColor: "#C4B5FD", paddingHorizontal: 24, paddingVertical: 15, borderRadius: 22, alignItems: "center" },
  actionText: { color: "#211831", fontWeight: "800", fontSize: 15 },
  input: { backgroundColor: "#201D2C", color: "#FAF8FF", padding: 14, borderRadius: 16, fontSize: 16, width: "100%" },
  center: { flex: 1, justifyContent: "center", alignItems: "center", gap: 24 },
  success: { width: 110, height: 110, borderRadius: 55, backgroundColor: "#7AE1C7", alignItems: "center", justifyContent: "center" },
  review: { flex: 1, justifyContent: "center", gap: 16, alignItems: "center" },
  duration: { flexDirection: "row", alignItems: "center", gap: 12 },
  minutes: { color: "#FAF8FF", fontSize: 40, fontWeight: "700", width: 110, textAlign: "center", padding: 6, backgroundColor: "#201D2C", borderRadius: 16 },
  categories: { flexDirection: "row", flexWrap: "wrap", gap: 6, justifyContent: "center" },
  category: { paddingHorizontal: 10, paddingVertical: 8, backgroundColor: "#282334", borderRadius: 12 },
  reviewActions: { flexDirection: "row", alignItems: "center", gap: 24 },
  error: { color: "#FFB5C4", fontSize: 12, textAlign: "center" },
});
