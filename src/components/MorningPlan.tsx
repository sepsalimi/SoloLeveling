import { useCallback, useState } from "react";
import { useFocusEffect, router } from "expo-router";
import { View } from "react-native";
import { loadTasks } from "@/services/taskStore";
import { morningTasks } from "@/lib/checkIn";
import { LifeTask } from "@/types/task";
import { useAppState } from "@/context/AppState";
import { Card } from "./Card";
import { Text } from "./Text";
import { Button } from "./Button";
export function MorningPlan({ showDisabled = false }: { showDisabled?: boolean }) {
  const { preferences } = useAppState();
  const [tasks, setTasks] = useState<LifeTask[]>([]);
  const [error, setError] = useState("");
  useFocusEffect(useCallback(() => {
    let active = true;
    loadTasks().then(items => { if (active) setTasks(morningTasks(items)); }).catch(() => { if (active) setError("Your task list could not load. Open Tasks to try again."); });
    return () => { active = false; };
  }, []));
  if (!preferences?.morningPlanEnabled) return showDisabled ? <Card>
    <Text variant="heading">A little direction for your morning ☀️</Text>
    <Text>Turn on your morning plan in Settings to see up to three things to focus on, drawn from your unfinished tasks.</Text>
    <Button label="Set up my morning" onPress={() => router.push("/(tabs)/settings")} />
  </Card> : null;
  return <Card style={{ borderColor: "#FFC73D", borderWidth: 2 }}>
    <Text variant="caption">☀️ YOUR MORNING PLAN</Text>
    <Text variant="heading">Start with what matters.</Text>
    <Text>Here’s what to work on next. High priority comes first, then work already in progress.</Text>
    {!!error && <Text>{error}</Text>}
    {tasks.map((task, i) => <View key={task.id} style={{ padding: 14, gap: 5, borderRadius: 14, backgroundColor: ["#FFF1AF", "#E5DCFF", "#C8F8E8"][i] }}>
      <Text style={{ color: "#242138", fontWeight: "800" }}>{i + 1}. {task.title}</Text>
      <Text style={{ color: "#514A62" }}>{task.priority.toUpperCase()} · {task.category} · {task.estimatedHours == null ? "Estimate not set" : task.estimatedHours + " h planned"}</Text>
    </View>)}
    {!tasks.length && !error && <Text>No unfinished tasks yet. Add what’s on your mind and your morning plan will take shape.</Text>}
    <Button label="Open my tasks" variant="secondary" onPress={() => router.push("/(tabs)/tasks")} />
    <Text variant="caption">These are suggestions, not logged time. This evening, tell us what actually happened.</Text>
  </Card>;
}
