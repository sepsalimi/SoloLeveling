import { useMemo, useState } from "react";
import { Alert, StyleSheet, TextInput, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { ActivityCard } from "@/components/ActivityCard";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { Screen } from "@/components/Screen";
import { Text } from "@/components/Text";
import { useAppState } from "@/context/AppState";
import { ActivityEntry } from "@/types/activity";
import { isoDate } from "@/lib/dates";
import { palette } from "@/theme/colors";

type Payload = { transcript: string; entries: ActivityEntry[]; unresolvedIssues: string[] };

export default function ReviewScreen() {
  const params = useLocalSearchParams<{ payload?: string }>();
  const parsed = useMemo<Payload>(() => {
    try {
      return params.payload ? JSON.parse(params.payload) : { transcript: "", entries: [], unresolvedIssues: [] };
    } catch {
      return { transcript: "", entries: [], unresolvedIssues: ["Could not read the extraction payload."] };
    }
  }, [params.payload]);
  const [entries, setEntries] = useState(parsed.entries);
  const { upsertActivities, addSession } = useAppState();

  function updateEntry(id: string, patch: Partial<ActivityEntry>) {
    setEntries((current) => current.map((entry) => (entry.id === id ? { ...entry, ...patch } : entry)));
  }

  function addManual() {
    setEntries((current) => [
      ...current,
      {
        id: `manual-${Date.now()}`,
        title: "New activity",
        activityDate: isoDate(),
        durationMinutes: 30,
        primaryCategory: "other",
        socialContext: "unknown",
        purposeTags: ["necessary"],
        confidence: 1,
        needsReview: true
      }
    ]);
  }

  function mergeFirstTwo() {
    if (entries.length < 2) return;
    const [a, b, ...rest] = entries;
    setEntries([{ ...a, title: `${a.title} + ${b.title}`, durationMinutes: a.durationMinutes + b.durationMinutes, needsReview: true }, ...rest]);
  }

  function splitFirst() {
    const first = entries[0];
    if (!first || first.durationMinutes < 2) return;
    const half = Math.round(first.durationMinutes / 2);
    setEntries([
      { ...first, id: `${first.id}-a`, title: `${first.title} part 1`, durationMinutes: half, needsReview: true },
      { ...first, id: `${first.id}-b`, title: `${first.title} part 2`, durationMinutes: first.durationMinutes - half, needsReview: true },
      ...entries.slice(1)
    ]);
  }

  async function save() {
    await upsertActivities(entries.map((entry) => ({ ...entry, needsReview: false })));
    await addSession({
      id: `session-${Date.now()}`,
      sessionDate: isoDate(),
      sessionType: "manual",
      status: "completed",
      createdAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      transcripts: [parsed.transcript],
      entries,
      unresolvedIssues: parsed.unresolvedIssues
    });
    router.replace("/(tabs)/home");
  }

  return (
    <Screen>
      <Text variant="title">Review</Text>
      {parsed.unresolvedIssues.map((issue) => (
        <Card key={issue}>
          <Text>{issue}</Text>
        </Card>
      ))}
      <View style={styles.actions}>
        <Button label="Approve all" icon="checkmark-done-outline" onPress={() => setEntries(entries.map((entry) => ({ ...entry, needsReview: false })))} />
        <Button label="Add" icon="add-outline" variant="secondary" onPress={addManual} />
        <Button label="Merge" icon="git-merge-outline" variant="secondary" onPress={mergeFirstTwo} disabled={entries.length < 2} />
        <Button label="Split" icon="git-branch-outline" variant="secondary" onPress={splitFirst} disabled={!entries.length} />
      </View>
      {entries.map((entry) => (
        <Card key={entry.id}>
          <TextInput value={entry.title} onChangeText={(value) => updateEntry(entry.id, { title: value })} style={styles.input} accessibilityLabel="Activity title" />
          <TextInput
            value={String(entry.durationMinutes)}
            onChangeText={(value) => updateEntry(entry.id, { durationMinutes: Number(value) || 0, needsReview: true })}
            keyboardType="numeric"
            style={styles.input}
            accessibilityLabel="Duration minutes"
          />
          <ActivityCard entry={entry} onDelete={(id) => setEntries(entries.filter((item) => item.id !== id))} />
        </Card>
      ))}
      <Button label="Save check-in" icon="save-outline" onPress={save} disabled={!entries.length} />
      <Button label="Retry" icon="refresh-outline" variant="ghost" onPress={() => router.back()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  input: { minHeight: 44, borderWidth: 1, borderColor: palette.line, borderRadius: 8, paddingHorizontal: 12, fontSize: 16 }
});

