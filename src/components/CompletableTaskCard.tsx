// Task summary with restrained, silent completion feedback and reduced-motion support.
import { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Animated, StyleSheet, useColorScheme, View } from "react-native";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { Text } from "@/components/Text";
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
        <View style={styles.title}>
          <View style={styles.grow}>
            <Text variant="heading">{task.title}</Text>
            <Text variant="caption">
              {task.category} · {task.priority} · {task.estimatedHours == null ? "estimate pending" : `${task.estimatedHours} h planned`}
            </Text>
          </View>
          <Text variant="caption">{taskType(task.priority, task.estimatedHours)}</Text>
        </View>
        <Text variant="caption">
          {project ? `${project.title} · ` : ""}
          {task.dueDate ? `Due ${task.dueDate}` : "No hard deadline"}
          {task.recurrence ? ` · ${task.recurrence.frequency}` : ""}
          {completedOn ? ` · completed ${completedOn}` : ""}
        </Text>
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

const styles = StyleSheet.create({
  title: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  grow: { flex: 1, gap: 5 },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
});
