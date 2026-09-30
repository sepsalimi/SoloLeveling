import { useState } from "react";
import { Pressable, Switch, TextInput, useColorScheme, View } from "react-native";
import { useAppState } from "@/context/AppState";
import { defaultCues, ActivityCue } from "@/lib/checkIn";
import { scheduleDailyReminders } from "@/services/reminders";
import { Card } from "./Card";
import { Button } from "./Button";
import { Text } from "./Text";
import { palette } from "@/theme/colors";
export function DailySettings() {
  const { preferences, updatePreferences, syncCheckIns } = useAppState();
  const [morning, setMorning] = useState(preferences?.morningReminderTime ?? "08:00");
  const [evening, setEvening] = useState(preferences?.eveningReminderTime ?? "20:30");
  const [enabled, setEnabled] = useState(preferences?.morningPlanEnabled ?? false);
  const [notifications, setNotifications] = useState(preferences?.notificationsEnabled ?? false);
  const [days, setDays] = useState(preferences?.reminderDays ?? [0,1,2,3,4,5,6]);
  const [cues, setCues] = useState<ActivityCue[]>(preferences?.activityCues ?? defaultCues);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [editing, setEditing] = useState(false);
  const dark = useColorScheme() === "dark";
  const input = { minHeight: 48, borderWidth: 1, borderColor: palette.line, borderRadius: 10, padding: 12, color: dark ? palette.darkInk : palette.ink };
  async function saveSchedule() {
    if (!preferences) return;
    setBusy(true); setMessage("");
    try {
      if (!days.length && notifications) throw new Error("Choose at least one reminder day.");
      const next = { ...preferences, morningPlanEnabled: enabled, morningReminderTime: morning, eveningReminderTime: evening, notificationsEnabled: notifications, reminderDays: days };
      const result = await scheduleDailyReminders(next);
      await updatePreferences(next); setMessage(result);
    } catch (e) { setMessage(e instanceof Error ? e.message : "Could not save reminders."); }
    finally { setBusy(false); }
  }
  async function saveCues() {
    if (!preferences) return;
    setBusy(true); setMessage("");
    try {
      if (!cues.length || cues.some(c => !c.label.trim() || !c.aliases.some(a => a.trim()))) throw new Error("Give each tile a label and at least one matching phrase.");
      await updatePreferences({ ...preferences, activityCues: cues.map(c => ({ ...c, label: c.label.trim(), aliases: c.aliases.map(a => a.trim()).filter(Boolean) })) });
      setEditing(false); setMessage("Your evening tiles are saved.");
    } catch (e) { setMessage(e instanceof Error ? e.message : "Could not save tiles."); }
    finally { setBusy(false); }
  }
  return <>
    <Card>
      <Text variant="heading">Your daily rhythm ☀️ 🌙</Text>
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}><Text>Morning plan</Text><Switch accessibilityLabel="Morning plan" value={enabled} onValueChange={setEnabled} disabled={busy} /></View>
      <Text variant="caption">Optional: show what to work on from your unfinished tasks.</Text>
      <Text>Morning time</Text><TextInput accessibilityLabel="Morning reminder time" value={morning} onChangeText={setMorning} style={input} editable={!busy} />
      <Text>Evening time</Text><TextInput accessibilityLabel="Evening reminder time" value={evening} onChangeText={setEvening} style={input} editable={!busy} />
      <Text variant="caption">24-hour local time. Evening check-ins ask what you actually did.</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>{["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map((day, index) => <Pressable accessibilityRole="button" accessibilityLabel={day + " reminders"} accessibilityState={{ selected: days.includes(index) }} disabled={busy} key={day} onPress={() => setDays(current => current.includes(index) ? current.filter(d => d !== index) : [...current, index])} style={{ padding: 10, minHeight: 44, borderRadius: 10, backgroundColor: days.includes(index) ? "#7853D4" : "#EDE6FF" }}><Text style={{ color: days.includes(index) ? "#FFFFFF" : "#514570" }}>{day}</Text></Pressable>)}</View>
      <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}><Text style={{ flex: 1 }}>Silent reminder notifications</Text><Switch accessibilityLabel="Silent reminder notifications" value={notifications} onValueChange={setNotifications} disabled={busy} /></View>
      <Button label="Save daily rhythm" disabled={busy} onPress={() => void saveSchedule()} />
      <Text variant="caption">No app chimes or spoken prompts during recording. Background notifications work on mobile; web prompts appear inside Today.</Text>
    </Card>
    <Card>
      <Text variant="heading">Your colourful evening tiles</Text>
      {!editing ? <Button label="Customize evening tiles" variant="secondary" onPress={() => { setCues(preferences?.activityCues ?? defaultCues); setEditing(true); }} /> : <>
        {cues.map((cue, index) => <View key={cue.id} style={{ borderLeftWidth: 6, borderLeftColor: cue.color, paddingLeft: 12, gap: 10, marginBottom: 16 }}>
          <TextInput accessibilityLabel={"Tile name " + index} value={cue.label} onChangeText={label => setCues(items => items.map(c => c.id === cue.id ? { ...c, label } : c))} style={input} editable={!busy} />
          <Text variant="caption">Matching phrases, separated by commas</Text>
          <TextInput accessibilityLabel={"Tile phrases " + index} value={cue.aliases.join(",")} onChangeText={value => setCues(items => items.map(c => c.id === cue.id ? { ...c, aliases: value.split(",") } : c))} style={input} editable={!busy} />
          <Text variant="caption">Analytics category: {cue.category}. You can change it when reviewing your day.</Text>
          <Button label={"Remove tile " + cue.label} variant="ghost" disabled={busy} onPress={() => setCues(items => items.filter(c => c.id !== cue.id))} />
        </View>)}
        <Button label="Add a tile" variant="secondary" disabled={busy || cues.length >= 16} onPress={() => setCues(items => [...items, { id: "cue-" + Date.now(), label: "", aliases: [""], color: defaultCues[items.length % defaultCues.length].color, category: "Life Admin", emoji: "N" }])} />
        <Button label="Save evening tiles" disabled={busy} onPress={() => void saveCues()} />
        <Button label="Cancel tile edits" variant="ghost" disabled={busy} onPress={() => setEditing(false)} />
      </>}
    </Card>
    <Card>
      <Text variant="heading">Check-in database</Text>
      <Text>Actual time is saved on this device. A connected account can also sync check-ins to your private cloud database.</Text>
      <Button label="Retry cloud sync" variant="secondary" disabled={busy} onPress={() => { setBusy(true); setMessage(""); void syncCheckIns().then(() => setMessage("Check-ins synced. Analytics are up to date.")).catch(e => setMessage(e.message)).finally(() => setBusy(false)); }} />
    </Card>
    {!!message && <Text accessibilityRole="alert">{message}</Text>}
  </>;
}
