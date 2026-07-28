import { useState } from "react";
import { Alert, StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { ActivityEditor } from "@/components/ActivityEditor";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { EmptyState } from "@/components/EmptyState";
import { Screen } from "@/components/Screen";
import { Text } from "@/components/Text";
import { useAppState } from "@/context/AppState";
import { useCheckInDraft } from "@/context/CheckInDraft";
import { ActivityEntry } from "@/types/activity";
import { isoDate } from "@/lib/dates";
import { activityEntrySchema } from "@/lib/validation";

export default function ReviewScreen() {
  const { draft, replaceDraft, clearDraft } = useCheckInDraft();
  const { preferences, saveCheckIn } = useAppState();
  const [entries, setEntries] = useState(draft?.entries ?? []);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  async function updateEntries(next: ActivityEntry[]) {
    if (!draft) return;
    setEntries(next);
    await replaceDraft({ ...draft, entries: next });
  }

  function addManual() {
    void updateEntries([
      ...entries,
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

  function mergeSelected() {
    if (selectedIds.length !== 2) return;
    const [a, b] = selectedIds.map((id) => entries.find((entry) => entry.id === id));
    if (!a || !b) return;
    const merged: ActivityEntry = {
      ...a,
      id: `merged-${Date.now()}`,
      title: `${a.title} + ${b.title}`,
      durationMinutes: a.durationMinutes + b.durationMinutes,
      purposeTags: [...new Set([...a.purposeTags, ...b.purposeTags])],
      needsReview: true
    };
    void updateEntries([merged, ...entries.filter((entry) => !selectedIds.includes(entry.id))]);
    setSelectedIds([]);
  }

  function splitSelected() {
    if (selectedIds.length !== 1) return;
    const selected = entries.find((entry) => entry.id === selectedIds[0]);
    if (!selected || selected.durationMinutes < 2) return;
    const firstDuration = Math.floor(selected.durationMinutes / 2);
    const parts: ActivityEntry[] = [
      { ...selected, id: `${selected.id}-a-${Date.now()}`, title: `${selected.title} part 1`, durationMinutes: firstDuration, needsReview: true },
      { ...selected, id: `${selected.id}-b-${Date.now()}`, title: `${selected.title} part 2`, durationMinutes: selected.durationMinutes - firstDuration, needsReview: true }
    ];
    void updateEntries(entries.flatMap((entry) => (entry.id === selected.id ? parts : [entry])));
    setSelectedIds([]);
  }

  async function save() {
    if (!draft) return;
    const invalid = entries.find((entry) => !activityEntrySchema.safeParse(entry).success);
    if (invalid) {
      Alert.alert("Review required", `Check the title, date, duration, and optional ratings for “${invalid.title || "Untitled activity"}”.`);
      return;
    }
    setSaving(true);
    try {
      await saveCheckIn(draft.sessionId, entries.map((entry) => ({ ...entry, needsReview: false })));
      await clearDraft();
      router.replace("/(tabs)/home");
    } catch (error) {
      Alert.alert("Could not save check-in", error instanceof Error ? error.message : "Try again.");
    } finally {
      setSaving(false);
    }
  }

  if (!draft) {
    return (
      <Screen>
        <Text variant="title">Review</Text>
        <EmptyState title="No check-in to review" body="Record or type a check-in first." />
        <Button label="Start a check-in" icon="mic-outline" onPress={() => router.replace("/(tabs)/check-in")} />
      </Screen>
    );
  }

  return (
    <Screen>
      <Text variant="title">Review</Text>
      <Text variant="caption">Make any useful corrections, then save. You do not need to perfect every field.</Text>
      {[...draft.unresolvedIssues, ...draft.transcriptRetentionNotices].map((issue) => (
        <Card key={issue}>
          <Text>{issue}</Text>
        </Card>
      ))}
      <View style={styles.actions}>
        <Button label="Approve all" icon="checkmark-done-outline" onPress={() => void updateEntries(entries.map((entry) => ({ ...entry, needsReview: false })))} />
        <Button label="Add" icon="add-outline" variant="secondary" onPress={addManual} />
        <Button label="Merge selected" icon="git-merge-outline" variant="secondary" onPress={mergeSelected} disabled={selectedIds.length !== 2} />
        <Button label="Split selected" icon="git-branch-outline" variant="secondary" onPress={splitSelected} disabled={selectedIds.length !== 1} />
      </View>
      {entries.map((entry) => (
        <ActivityEditor
          key={entry.id}
          entry={entry}
          preferences={preferences}
          selected={selectedIds.includes(entry.id)}
          onToggleSelected={() =>
            setSelectedIds((current) =>
              current.includes(entry.id) ? current.filter((id) => id !== entry.id) : [...current, entry.id].slice(-2)
            )
          }
          onChange={(next) => void updateEntries(entries.map((item) => (item.id === entry.id ? next : item)))}
          onDelete={() => void updateEntries(entries.filter((item) => item.id !== entry.id))}
        />
      ))}
      <Button label={saving ? "Saving" : "Save check-in"} icon="save-outline" onPress={save} disabled={!entries.length || saving} />
      <Button label="Add follow-up note" icon="add-circle-outline" variant="ghost" onPress={() => router.replace("/(tabs)/check-in")} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 8 }
});

