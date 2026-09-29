import { useEffect, useState } from "react";
import { Pressable, StyleSheet, TextInput, useColorScheme, useWindowDimensions, View } from "react-native";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { Screen } from "@/components/Screen";
import { Text } from "@/components/Text";
import { TaskVoice } from "@/components/TaskVoice";
import { TaskPie, categoryColors } from "@/components/TaskPie";
import { draftTasks, taskType } from "@/lib/tasks";
import { loadTasks, saveTasks } from "@/services/taskStore";
import { LifeTask, taskCategories, taskTypes } from "@/types/task";
import { palette } from "@/theme/colors";

export default function TasksScreen() {
  const [tasks, setTasks] = useState<LifeTask[]>([]);
  const [drafts, setDrafts] = useState<LifeTask[]>([]);
  const [transcript, setTranscript] = useState("");
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [filter, setFilter] = useState("All");
  const [view, setView] = useState("Pending");
  const [editing, setEditing] = useState<LifeTask | null>(null);
  const [search, setSearch] = useState("");
  useEffect(() => { loadTasks().then(setTasks).then(() => setReady(true)).catch(e => setMessage(e.message)); }, []);

  async function persist(next: LifeTask[]) {
    setBusy(true); setMessage("");
    try { await saveTasks(next); setTasks(next); return true; }
    catch { setMessage("Could not save your tasks. Please try again; your edits are still here."); return false; }
    finally { setBusy(false); }
  }
  async function saveDrafts() {
    if (drafts.some(t => !t.title.trim())) { setMessage("Give each task a title before saving."); return; }
    if (await persist([...tasks, ...drafts])) { setDrafts([]); setTranscript(""); setMessage("Tasks added to your planner."); }
  }
  const pending = tasks.filter(t => t.status !== "Done");
  const visible = tasks.filter(t => (view === "Completed" ? t.status === "Done" : t.status !== "Done") && (filter === "All" || t.category === filter) && t.title.toLowerCase().includes(search.toLowerCase()));
  const dark = useColorScheme() === "dark";
  const { width } = useWindowDimensions();
  const inputStyle = [styles.input, { color: dark ? palette.darkInk : palette.ink }];
  return <Screen>
    <Text variant="caption">YOUR LIFE, A LITTLE CLEARER</Text>
    <Text variant="title">Everything on your mind.</Text>
    <Text>Say it all. We’ll help sort it into a plan you can actually work through.</Text>
    <Card>
      <Text variant="heading">Make room in your head</Text>
      <TaskVoice onTranscript={text => setTranscript(current => (current + "\n" + text).trim())} />
      <TextInput accessibilityLabel="Tasks to organize" multiline value={transcript} onChangeText={setTranscript} placeholder="Pay the electricity bill, high priority, 15 minutes. Book a dentist appointment, 30 minutes. Play a game, low priority, two hours." placeholderTextColor={palette.muted} style={[inputStyle, { minHeight: 120, textAlignVertical: "top" }]} />
      <Button label="Organize my tasks" icon="sparkles-outline" disabled={!ready || busy || !transcript.trim() || drafts.length > 0} onPress={() => { setDrafts(draftTasks(transcript)); setMessage(""); }} />
      <Text variant="caption">Automatic suggestions use task wording. Unstated priority defaults to medium; missing hours stay blank. Review everything before saving. Tasks stay on this device.</Text>
    </Card>
    {!!message && <Text accessibilityRole="alert">{message}</Text>}
    {!!drafts.length && <Card>
      <Text variant="heading">A first pass, yours to adjust</Text>
      <Text variant="caption">{drafts.length} suggested tasks · edit category, priority, and hours</Text>
      {drafts.map(task => <TaskEditor key={task.id} task={task} onChange={updated => setDrafts(items => items.map(t => t.id === updated.id ? updated : t))} onRemove={() => setDrafts(items => items.filter(t => t.id !== task.id))} />)}
      <Button label={busy ? "Saving…" : "Save tasks"} disabled={busy} onPress={() => void saveDrafts()} />
      <Button label="Discard suggestions" variant="ghost" disabled={busy} onPress={() => setDrafts([])} />
    </Card>}
    <View style={styles.row}>
      {taskCategories.map((category, index) => {
        const all = tasks.filter(t => t.category === category);
        const active = all.filter(t => t.status !== "Done");
        return <Pressable accessibilityRole="button" accessibilityState={{ selected: filter === category }} key={category} onPress={() => setFilter(filter === category ? "All" : category)} style={[styles.category, { width: (width - 40 - (width >= 800 ? 24 : 8)) / (width >= 800 ? 4 : 2), borderColor: filter === category ? categoryColors[index] : palette.line }]}>
          <View style={{ height: 5, borderRadius: 3, backgroundColor: categoryColors[index] }} />
          <Text style={{ fontWeight: "700" }}>{category}</Text>
          <Text variant="caption">{active.length} active · {active.reduce((sum, t) => sum + (t.estimatedHours ?? 0), 0).toFixed(1)} h</Text>
          <View style={{ height: 4, backgroundColor: dark ? palette.darkLine : palette.line, borderRadius: 3 }}>
            <View style={{ height: 4, backgroundColor: categoryColors[index], width: ((all.length ? Math.round((all.length - active.length) / all.length * 100) : 0) + "%") as `${number}%` }} />
          </View>
          <Text variant="caption">{all.length ? Math.round((all.length - active.length) / all.length * 100) : 0}% completed</Text>
        </Pressable>;
      })}
    </View>
    <Card><TaskPie tasks={tasks} /></Card>
    <Text variant="heading">All tasks <Text variant="caption"> · {pending.length} to work on</Text></Text>
    <Choice label="Task view" items={["Pending", "Completed"]} selected={view} onSelect={setView} />
    {filter !== "All" && <Button label={"Clear " + filter + " filter"} variant="ghost" onPress={() => setFilter("All")} />}
    <TextInput accessibilityLabel="Search tasks" value={search} onChangeText={setSearch} placeholder="Find a task…" placeholderTextColor={palette.muted} style={inputStyle} />
    {!ready && !message && <Text>Loading your tasks…</Text>}
    {ready && !visible.length && <Card><Text>{tasks.length ? "No tasks match this view." : "Your next chapter starts here. Dictate or type a few tasks above."}</Text></Card>}
    {editing && <Card>
      <Text variant="heading">Edit task</Text>
      <TaskEditor key={editing.id} task={editing} onChange={setEditing} disabled={busy}
        onRemove={() => void persist(tasks.filter(t => t.id !== editing.id)).then(saved => { if (saved) setEditing(null); })}
        onSave={() => {
          if (!editing.title.trim()) { setMessage("Enter a task title."); return; }
          void persist(tasks.map(t => t.id === editing.id ? editing : t)).then(saved => { if (saved) setEditing(null); });
        }} />
      <Button label="Cancel edits" variant="ghost" disabled={busy} onPress={() => setEditing(null)} />
    </Card>}
    {taskTypes.map(type => {
      const group = visible.filter(t => taskType(t.priority, t.estimatedHours) === type).sort((a, b) => ({high: 0, medium: 1, low: 2}[a.priority] - {high: 0, medium: 1, low: 2}[b.priority]));
      if (!group.length) return null;
      return <Card key={type}>
        <Text variant="heading">{type} · {group.length}</Text>
        {group.map(task => <View key={task.id} style={styles.task}>
          <Text style={{ fontWeight: "700" }}>{task.title}</Text>
          <Text variant="caption">{task.category} · {task.priority.toUpperCase()} · {task.estimatedHours == null ? "No hours set" : task.estimatedHours + " h"} · {task.status}</Text>
          <View style={styles.row}>
            <Button label={task.status === "Done" ? "Reopen" : "Complete"} variant="secondary" disabled={busy || editing !== null} onPress={() => void persist(tasks.map(t => t.id === task.id ? { ...t, status: t.status === "Done" ? "To Do" : "Done" } : t))} />
            <Button label="Edit" variant="ghost" disabled={busy || editing !== null} onPress={() => setEditing({ ...task })} />
          </View>
        </View>)}
      </Card>;
    })}
    <Text variant="caption">Medium / high: ≤ 1 h = Low Hanging, &gt; 1 h = Big Rock. Low: ≤ 1 h = Nice to Do, &gt; 1 h = Time Sink.</Text>
  </Screen>;
}
function Choice({ label, items, selected, onSelect }: { label: string; items: readonly string[]; selected: string; onSelect: (value: string) => void }) {
  return <View style={styles.row}>{items.map(item => <Pressable key={item} accessibilityRole="button" accessibilityLabel={label + ": " + item} accessibilityState={{ selected: selected === item }} onPress={() => onSelect(item)} style={[styles.chip, selected === item && { backgroundColor: palette.teal }]}>
    <Text style={{ fontSize: 13, color: selected === item ? "#FFFFFF" : palette.teal }}>{item}</Text>
  </Pressable>)}</View>;
}
function TaskEditor({ task, onChange, onRemove, onSave, disabled }: { task: LifeTask; onChange: (task: LifeTask) => void; onRemove: () => void; onSave?: () => void; disabled?: boolean }) {
  const dark = useColorScheme() === "dark";

  const inputStyle = [styles.input, { color: dark ? palette.darkInk : palette.ink }];
  const [hours, setHours] = useState(task.estimatedHours?.toString() ?? "");
  const validHours = hours.trim() === "" || (Number.isFinite(Number(hours)) && Number(hours) > 0);
  return <View style={styles.task}>
    <TextInput accessibilityLabel="Task title" value={task.title} onChangeText={title => onChange({ ...task, title })} style={inputStyle} />
    <Text variant="caption">Category</Text>
    <Choice label="Category" items={taskCategories} selected={task.category} onSelect={category => onChange({ ...task, category: category as LifeTask["category"] })} />
    <Text variant="caption">Priority</Text>
    <Choice label="Priority" items={["low", "medium", "high"]} selected={task.priority} onSelect={priority => onChange({ ...task, priority: priority as LifeTask["priority"] })} />
    <Text variant="caption">Estimated hours</Text>
    <TextInput accessibilityLabel="Estimated hours" keyboardType="decimal-pad" value={hours} placeholder="e.g. 0.5" placeholderTextColor={palette.muted} onChangeText={value => { setHours(value); const n = Number(value); onChange({ ...task, estimatedHours: value.trim() && Number.isFinite(n) && n > 0 ? n : null }); }} style={inputStyle} />
    {!validHours && <Text variant="caption">Enter positive hours. Invalid values are treated as no estimate.</Text>}
    <Text>{taskType(task.priority, task.estimatedHours)}</Text>
    {onSave && <Choice label="Status" items={["To Do", "In Progress", "Done"]} selected={task.status} onSelect={status => onChange({ ...task, status: status as LifeTask["status"] })} />}
    <View style={styles.row}>
      {onSave && <Button label="Save changes" disabled={disabled || !validHours} onPress={onSave} />}
      <Button label="Remove task" variant="danger" disabled={disabled} onPress={onRemove} />
    </View>
  </View>;
}
const styles = StyleSheet.create({
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  input: { borderWidth: 1, borderColor: palette.line, borderRadius: 8, padding: 12, minHeight: 48, fontSize: 16 },
  category: { borderWidth: 2, borderRadius: 12, padding: 16, gap: 10 },
  chip: { minHeight: 44, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8, backgroundColor: "#DDEBE6", justifyContent: "center" },
  task: { gap: 10, paddingVertical: 16, borderTopWidth: 1, borderTopColor: palette.line },
});
