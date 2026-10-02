// Conversational planner with linked projects, dated views, recurrence, and optional task details.
import { useCallback, useMemo, useState } from "react";
import { Pressable, StyleSheet, TextInput, useColorScheme, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { CompletableTaskCard } from "@/components/CompletableTaskCard";
import { LifeCapture } from "@/components/LifeCapture";
import { Screen } from "@/components/Screen";
import { TaskPie } from "@/components/TaskPie";
import { Text } from "@/components/Text";
import { useAppState } from "@/context/AppState";
import { addDays, isoDate } from "@/lib/dates";
import { completeTaskOccurrence, expandOccurrences } from "@/lib/recurrence";
import { planShortcuts, PlanView, tasksForView } from "@/lib/taskViews";
import { loadLifePlan, saveLifePlan, syncLifePlan } from "@/services/taskStore";
import { emptyLifePlan, lifeAreas, LifePlan, LifeTask, Project } from "@/types/life";
import { palette, surfaces } from "@/theme/colors";

export default function TasksScreen() {
  const dark = useColorScheme() === "dark";
  const theme = surfaces(dark);
  const [plan, setPlan] = useState<LifePlan>(emptyLifePlan());
  const [view, setView] = useState<PlanView>("Open");
  const [editing, setEditing] = useState<LifeTask>();
  const [message, setMessage] = useState("");
  const [ready, setReady] = useState(false);
  const { user } = useAppState();
  const today = isoDate();
  const tomorrow = isoDate(addDays(new Date(), 1));
  const weekEnd = isoDate(addDays(new Date(), 7));

  useFocusEffect(useCallback(() => {
    let active = true;
    loadLifePlan()
      .then((saved) => {
        if (active) {
          setPlan(expandOccurrences(saved, today, isoDate(addDays(new Date(), 31))));
          setReady(true);
        }
        if (user) {
          void syncLifePlan()
            .then((synced) => { if (active) setPlan(expandOccurrences(synced, today, isoDate(addDays(new Date(), 31)))); })
            .catch((error) => { if (active) setMessage(error instanceof Error ? error.message : "Plan sync is unavailable."); });
        }
      })
      .catch((error) => { if (active) setMessage(error instanceof Error ? error.message : "Could not load your plan."); });
    return () => { active = false; };
  }, [today, user]));

  async function persist(next: LifePlan) {
    const status = await saveLifePlan(next);
    setPlan(next);
    setMessage(status === "synced" ? "Plan saved and synced." : status === "pending" ? "Plan saved here. Account sync is pending." : "Plan saved on this device.");
  }

  const visible = useMemo(() => tasksForView(plan, view, today, tomorrow, weekEnd), [plan, today, tomorrow, view, weekEnd]);

  async function complete(task: LifeTask) {
    const date = view === "Tomorrow" ? tomorrow : today;
    try {
      await persist(completeTaskOccurrence(plan, task.id, date));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not complete this task.");
    }
  }

  return (
    <Screen>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text variant="eyebrow">Plan</Text>
          <View style={styles.utilityRow}>
            <UtilityLink label="History" icon="time-outline" onPress={() => router.push("/(tabs)/history")} />
            <UtilityLink label="Settings" icon="settings-outline" onPress={() => router.push("/(tabs)/settings")} />
          </View>
        </View>
        <Text variant="display">Make room in your head.</Text>
        <Text style={{ color: theme.softText }}>Speak naturally. Goals, projects, recurring work, and next actions stay connected.</Text>
      </View>

      <LifeCapture plan={plan} onPlan={(next) => { setView("Open"); setPlan(expandOccurrences(next, today, isoDate(addDays(new Date(), 31)))); }} />
      {!!message && <Text accessibilityRole="alert">{message}</Text>}

      <View style={styles.shortcutRow}>
        {planShortcuts.map((item) => <Choice key={item} label={item} active={view === item} onPress={() => setView(item)} />)}
      </View>

      {!!plan.goals.length && (
        <View style={styles.section}>
          <Text variant="eyebrow">Active goals</Text>
          <View style={styles.shortcutRow}>
            {plan.goals.filter((goal) => goal.status === "active").map((goal) => (
              <View key={goal.id} style={[styles.goal, { backgroundColor: theme.chip }]}>
                <Text variant="label">{goal.title}</Text>
                <Text variant="caption">{goal.area}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      <View style={styles.section}>
        <Text variant="eyebrow">Projects</Text>
        <View style={styles.projectGrid}>
          {plan.projects.filter((project) => project.status === "active").map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              tasks={plan.tasks.filter((task) => task.projectId === project.id)}
              today={today}
              active={view === `project:${project.id}`}
              onPress={() => setView(`project:${project.id}`)}
            />
          ))}
          {!plan.projects.length && <Text variant="caption">Projects appear here when your update describes an ongoing effort.</Text>}
        </View>
      </View>

      <Card>
        <TaskPie tasks={plan.tasks} />
        <Text variant="caption">Planned hours only. Recorded actual time appears in Analytics.</Text>
      </Card>

      <View style={styles.section}>
        <Text variant="eyebrow">{view.startsWith("project:") ? "Project tasks" : view}</Text>
        <Text variant="heading">{visible.length} {visible.length === 1 ? "task" : "tasks"}</Text>
      </View>

      {editing && (
        <Card>
          <TaskEditor task={editing} projects={plan.projects} onChange={setEditing} />
          <View style={styles.shortcutRow}>
            <Button
              label="Save details"
              onPress={() => {
                const next = { ...plan, tasks: plan.tasks.map((task) => task.id === editing.id ? editing : task) };
                void persist(expandOccurrences(next, today, isoDate(addDays(new Date(), 31)))).then(() => setEditing(undefined));
              }}
            />
            <Button label="Cancel" variant="ghost" onPress={() => setEditing(undefined)} />
          </View>
        </Card>
      )}

      {!ready && <Text>Loading your plan...</Text>}
      {ready && !visible.length && <Card><Text>{view === "Open" ? "No open tasks yet. Speak or type what needs doing, then organize and save." : "Nothing in this view. Open shows every task that is not done."}</Text></Card>}
      {visible.map((task) => {
        const project = plan.projects.find((item) => item.id === task.projectId);
        const completedOccurrence = plan.occurrences
          .filter((item) => item.taskId === task.id && item.status === "done")
          .sort((a, b) => b.scheduledFor.localeCompare(a.scheduledFor))[0];
        return (
          <CompletableTaskCard
            key={task.id}
            task={task}
            project={project}
            completedOn={view === "Completed" ? completedOccurrence?.scheduledFor : undefined}
            onComplete={view === "Completed" ? undefined : () => complete(task)}
            onEdit={() => setEditing({ ...task })}
          />
        );
      })}
    </Screen>
  );
}

function UtilityLink({ label, icon, onPress }: { label: string; icon: keyof typeof Ionicons.glyphMap; onPress: () => void }) {
  const dark = useColorScheme() === "dark";
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={[styles.utility, { backgroundColor: surfaces(dark).chip }]}>
      <Ionicons name={icon} size={17} color={dark ? palette.mint : palette.teal} />
      <Text variant="caption">{label}</Text>
    </Pressable>
  );
}

function Choice({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ selected: active }} onPress={onPress} style={[styles.choice, active && styles.choiceActive]}>
      <Text style={{ color: active ? "#FFFFFF" : palette.teal, fontWeight: "700" }}>{label}</Text>
    </Pressable>
  );
}

function ProjectCard({ project, tasks, today, active, onPress }: { project: Project; tasks: LifeTask[]; today: string; active: boolean; onPress: () => void }) {
  const done = tasks.filter((task) => task.status === "Done").length;
  const activeCount = tasks.length - done;
  const overdue = tasks.filter((task) => task.status !== "Done" && task.dueDate && task.dueDate < today).length;
  const progress = tasks.length ? `${Math.round(done / tasks.length * 100)}%` : "0%";
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ selected: active }} onPress={onPress} style={[styles.project, { borderColor: active ? project.color : palette.line }]}>
      <View style={[styles.projectMark, { backgroundColor: project.color }]} />
      <Text variant="heading">{project.title}</Text>
      <Text variant="caption">{project.area} · {activeCount} active{overdue ? ` · ${overdue} overdue` : ""}</Text>
      <View style={styles.progress}><View style={[styles.progressFill, { backgroundColor: project.color, width: progress as `${number}%` }]} /></View>
      <Text variant="caption">{progress} complete</Text>
    </Pressable>
  );
}

function TaskEditor({ task, projects, onChange }: { task: LifeTask; projects: Project[]; onChange: (task: LifeTask) => void }) {
  const dark = useColorScheme() === "dark";
  const theme = surfaces(dark);
  const input = [styles.input, { color: theme.ink, borderColor: theme.line, backgroundColor: theme.surface }];
  return (
    <View style={{ gap: 12 }}>
      <Text variant="heading">Task details</Text>
      <TextInput accessibilityLabel="Task title" value={task.title} onChangeText={(title) => onChange({ ...task, title })} style={input} />
      <TextInput
        accessibilityLabel="Estimated hours"
        keyboardType="decimal-pad"
        value={task.estimatedHours?.toString() ?? ""}
        placeholder="Planned hours"
        placeholderTextColor={theme.softText}
        onChangeText={(value) => onChange({ ...task, estimatedHours: value.trim() && Number(value) > 0 ? Number(value) : null, estimateSource: "explicit" })}
        style={input}
      />
      <TextInput
        accessibilityLabel="Due date"
        value={task.dueDate ?? ""}
        placeholder="Due date, YYYY-MM-DD (optional)"
        placeholderTextColor={theme.softText}
        onChangeText={(dueDate) => onChange({ ...task, dueDate: dueDate.trim() || null, dueDateSource: dueDate.trim() ? "explicit" : undefined })}
        style={input}
      />
      <Text variant="caption">Area</Text>
      <View style={styles.shortcutRow}>{lifeAreas.map((area) => <Choice key={area} label={area} active={task.category === area} onPress={() => onChange({ ...task, category: area })} />)}</View>
      <Text variant="caption">Priority</Text>
      <View style={styles.shortcutRow}>{(["low", "medium", "high"] as const).map((priority) => <Choice key={priority} label={priority} active={task.priority === priority} onPress={() => onChange({ ...task, priority, prioritySource: "explicit" })} />)}</View>
      <Text variant="caption">Project</Text>
      <View style={styles.shortcutRow}>
        <Choice label="No project" active={!task.projectId} onPress={() => onChange({ ...task, projectId: undefined })} />
        {projects.map((project) => <Choice key={project.id} label={project.title} active={task.projectId === project.id} onPress={() => onChange({ ...task, projectId: project.id })} />)}
      </View>
      <Text variant="caption">Repeat</Text>
      <View style={styles.shortcutRow}>
        {(["none", "daily", "weekly", "monthly"] as const).map((frequency) => (
          <Choice
            key={frequency}
            label={frequency}
            active={frequency === "none" ? !task.recurrence : task.recurrence?.frequency === frequency}
            onPress={() => onChange({
              ...task,
              recurrence: frequency === "none" ? undefined : {
                frequency,
                interval: 1,
                startsOn: task.dueDate ?? isoDate(),
                ...(frequency === "weekly" ? { weekdays: [new Date(`${task.dueDate ?? isoDate()}T12:00:00`).getDay()] } : {}),
              },
            })}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { gap: 6 },
  headerTop: { minHeight: 36, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  utilityRow: { flexDirection: "row", flexWrap: "wrap", justifyContent: "flex-end", gap: 6 },
  utility: { minHeight: 36, flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 9, borderRadius: 12 },
  section: { gap: 8, marginTop: 8 },
  shortcutRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  choice: { minHeight: 42, justifyContent: "center", paddingHorizontal: 13, borderRadius: 14, backgroundColor: "#DDEBE4" },
  choiceActive: { backgroundColor: palette.forest },
  goal: { borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10, minWidth: 140 },
  projectGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  project: { width: "48%", minWidth: 160, borderWidth: 2, borderRadius: 22, padding: 16, gap: 9 },
  projectMark: { width: 36, height: 8, borderRadius: 4 },
  progress: { height: 6, borderRadius: 3, backgroundColor: "#DDD6C8", overflow: "hidden" },
  progressFill: { height: 6, borderRadius: 3 },
  input: { minHeight: 50, borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, fontSize: 16 },
});
