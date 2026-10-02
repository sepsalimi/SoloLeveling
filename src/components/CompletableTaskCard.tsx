// Task summary with restrained, silent completion feedback and reduced-motion support.
import { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Animated, StyleSheet, useColorScheme, View } from "react-native";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { Text } from "@/components/Text";
import { shortDate } from "@/lib/dates";
import { taskType } from "@/lib/tasks";
import { LifeTask, Project } from "@/types/life";
import { palette, surfaces } from "@/theme/colors";

type Props = {
  task: LifeTask;
  project?: Project;
  completedOn?: string;
  onComplete?: () => Promise<void>;
  onEdit: () => void;
};

export function CompletableTaskCard({ task, project, completedOn, onComplete, onEdit }: Props) {
  const dark = useColorScheme() === "dark";
  const theme = surfaces(dark);
  const [completing, setCompleting] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const offset = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const subscription = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduceMotion);
    return () => subscription.remove();
  }, []);

  async function complete() {
    if (!onComplete || completing) return;
    setCompleting(true);
    try {
      if (!reduceMotion) {
        await new Promise<void>((resolve) => {
          Animated.parallel([
            Animated.sequence([
              Animated.timing(offset, { toValue: -3, duration: 45, useNativeDriver: true }),
              Animated.timing(offset, { toValue: 3, duration: 55, useNativeDriver: true }),
              Animated.timing(offset, { toValue: -2, duration: 45, useNativeDriver: true }),
              Animated.timing(offset, { toValue: 0, duration: 45, useNativeDriver: true }),
            ]),
            Animated.sequence([
              Animated.timing(scale, { toValue: 0.985, duration: 90, useNativeDriver: true }),
              Animated.timing(scale, { toValue: 1, duration: 100, useNativeDriver: true }),
            ]),
          ]).start(() => resolve());
        });
      }
      await onComplete();
    } finally {
      setCompleting(false);
    }
  }

  return (
    <Animated.View style={{ transform: [{ translateX: offset }, { scale }] }}>
      <Card
        variant="outline"
        style={completing && {
          backgroundColor: theme.accent,
          borderColor: palette.coral,
        }}
      >
        <Text variant="heading">{task.title}</Text>
        <View style={styles.fields}>
          <Field label="Status" value={task.status} tone={task.status === "In Progress" ? "progress" : task.status === "Done" ? "done" : "plain"} />
          <Field label="Due" value={dueLabel(task, completedOn)} />
          <Field label="Priority" value={capitalize(task.priority)} tone={task.priority === "high" ? "high" : task.priority === "medium" ? "medium" : "low"} />
          <Field label="Est. Hrs" value={task.estimatedHours == null ? "—" : String(task.estimatedHours)} />
          <Field label="Task Type" value={taskType(task.priority, task.estimatedHours)} />
          <Field label="Project" value={project?.title ?? "—"} />
        </View>
        <View style={styles.actions}>
          {onComplete && (
            <Button
              label={completing ? "Completed" : "Complete"}
              compact
              variant="secondary"
              disabled={completing}
              onPress={() => void complete()}
            />
          )}
          <Button label="Edit details" compact variant="ghost" onPress={onEdit} disabled={completing} />
        </View>
      </Card>
    </Animated.View>
  );
}

function dueLabel(task: LifeTask, completedOn?: string) {
  const due = task.dueDate ? shortDate(task.dueDate) : "None";
  const repeat = task.recurrence ? ` · ${task.recurrence.frequency}` : "";
  const completed = completedOn ? ` · done ${shortDate(completedOn)}` : "";
  return `${due}${repeat}${completed}`;
}

function capitalize(value: string) {
  return value.slice(0, 1).toUpperCase() + value.slice(1);
}

function Field({ label, value, tone = "plain" }: { label: string; value: string; tone?: "plain" | "progress" | "done" | "high" | "medium" | "low" }) {
  const dark = useColorScheme() === "dark";
  const theme = surfaces(dark);
  const toneStyle = {
    plain: { backgroundColor: theme.chip, color: theme.ink },
    progress: { backgroundColor: "#F3D48A", color: "#3D2C08" },
    done: { backgroundColor: palette.mint, color: "#12302C" },
    high: { backgroundColor: "#F3B4AE", color: "#4A1C16" },
    medium: { backgroundColor: "#E7C0D8", color: "#3D2033" },
    low: { backgroundColor: "#D7E3C8", color: "#243018" },
  }[tone];
  return (
    <View style={styles.field}>
      <Text variant="caption">{label}</Text>
      <Text variant="label" numberOfLines={2} style={[styles.value, { backgroundColor: toneStyle.backgroundColor, color: toneStyle.color }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fields: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  field: { width: "31%", minWidth: 96, gap: 4 },
  value: { alignSelf: "flex-start", overflow: "hidden", borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
});
