// Small morning plan drawn from current deadlines, priorities, progress, and linked goals.
import { useCallback, useState } from "react";
import { useFocusEffect, router } from "expo-router";
import { View } from "react-native";
import { loadLifePlan } from "@/services/taskStore";
import { morningTasks } from "@/lib/checkIn";
import { LifePlan, emptyLifePlan } from "@/types/life";
import { useAppState } from "@/context/AppState";
import { Card } from "./Card";
import { Text } from "./Text";
import { Button } from "./Button";
export function MorningPlan({ showDisabled = false }: { showDisabled?: boolean }) {
  const { preferences } = useAppState();
  const [plan, setPlan] = useState<LifePlan>(emptyLifePlan());
  const [error, setError] = useState("");
  useFocusEffect(useCallback(() => {
    let active = true;
    loadLifePlan().then(items => { if (active) setPlan(items); }).catch(() => { if (active) setError("Your task list could not load. Open Tasks to try again."); });
    return () => { active = false; };
  }, []));
  if (!preferences?.morningPlanEnabled) return showDisabled ? <Card>
    <Text variant="heading">A little direction for your morning</Text>
    <Text>Turn on your morning plan in Settings to see up to three things to focus on, drawn from your unfinished tasks.</Text>
    <Button label="Set up my morning" onPress={() => router.push("/(tabs)/settings")} />
  </Card> : null;
  return <Card style={{ borderColor: "#FFC73D", borderWidth: 2 }}>
    <Text variant="caption">YOUR MORNING PLAN</Text>
    <Text variant="heading">Today, keep it feasible.</Text>
    <Text>Deadlines and recurring commitments come first, then high-priority work already in motion.</Text>
    {!!error && <Text>{error}</Text>}
    {morningTasks(plan.tasks).map((task, i) => <View key={task.id} style={{ padding: 14, gap: 5, borderRadius: 14, backgroundColor: ["#FFF1AF", "#E5DCFF", "#C8F8E8"][i] }}>
      <Text style={{ color: "#242138", fontWeight: "800" }}>{i + 1}. {task.title}</Text>
      <Text style={{ color: "#514A62" }}>{task.priority.toUpperCase()} · {task.category} · {task.estimatedHours == null ? "Estimate not set" : task.estimatedHours + " h planned"}{task.dueDate ? ` · due ${task.dueDate}` : ""}</Text>
    </View>)}
    {!plan.tasks.some((task) => task.status !== "Done") && !error && <Text>No unfinished tasks yet. Add what is on your mind and your morning plan will take shape.</Text>}
    {!!plan.goals.find((goal) => goal.status === "active") && <Text variant="caption">Goal check: one useful step toward {plan.goals.find((goal) => goal.status === "active")?.title}. Suggestions stay optional.</Text>}
    <Button label="Open my tasks" variant="secondary" onPress={() => router.push("/(tabs)/tasks")} />
    <Text variant="caption">These are suggestions, not logged time. This evening, tell us what actually happened.</Text>
  </Card>;
}
