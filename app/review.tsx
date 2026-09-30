// Simple review of extracted activities; advanced merge/split stays behind one control.
import { useState } from "react";
import { Alert, StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { ActivityEditor } from "@/components/ActivityEditor";
import { BrandMark } from "@/components/BrandMark";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { EmptyState } from "@/components/EmptyState";
import { FadeUp } from "@/components/motion";
import { Screen } from "@/components/Screen";
import { Text } from "@/components/Text";
import { useAppState } from "@/context/AppState";
import { useCheckInDraft } from "@/context/CheckInDraft";
import { activityEntrySchema } from "@/lib/validation";
import { isoDate } from "@/lib/dates";
import { ActivityEntry } from "@/types/activity";
import { palette } from "@/theme/colors";

export default function ReviewScreen() {
  const { draft, error, ready } = useCheckInDraft();
  if (!ready) {
    return (
      <Screen>
        <View style={styles.topBar}><BrandMark compact /><Text variant="eyebrow">Review</Text></View>
        <Text>Restoring your check-in...</Text>
      </Screen>
    );
  }
  if (!draft) {
    return (
      <Screen>
        <View style={styles.topBar}><BrandMark compact /><Text variant="eyebrow">Review</Text></View>
        {error ? <Card><Text>{error}</Text></Card> : null}
        <EmptyState title="No check-in to review" body="Record or type a check-in first." />
        <Button label="Start a check-in" icon="mic-outline" onPress={() => router.replace("/(tabs)/check-in")} />
      </Screen>
    );
  }
  return <ReviewContent key={draft.sessionId} />;
}

function ReviewContent() {
  const { draft, replaceDraft, clearDraft } = useCheckInDraft();
  const { preferences, saveCheckIn } = useAppState();
  const [entries, setEntries] = useState(draft?.entries ?? []);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);

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
      title: `${a.title} and ${b.title}`,
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
      { ...selected, id: `${selected.id}-a-${Date.now()}`, title: `${selected.title} (first half)`, durationMinutes: firstDuration, needsReview: true },
      { ...selected, id: `${selected.id}-b-${Date.now()}`, title: `${selected.title} (second half)`, durationMinutes: selected.durationMinutes - firstDuration, needsReview: true }
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
      await saveCheckIn(
        draft.sessionId,
        entries.map((entry) => ({ ...entry, needsReview: false })),
        draft.transcripts
      );
      await clearDraft();
      router.replace("/(tabs)/home");
    } catch (error) {
      Alert.alert("Could not save check-in", error instanceof Error ? error.message : "Try again.");
    } finally {
      setSaving(false);
    }
  }

  if (!draft) return null;

  return (
    <Screen>
      <View style={styles.topBar}><BrandMark compact /><Text variant="eyebrow">Review the thread</Text></View>
      <FadeUp>
        <View style={styles.intro}>
          <Text variant="display">Words became{"\n"}moments.</Text>
          <Text style={styles.lede}>Keep what feels true. Adjust what does not. This should take less than a minute.</Text>
        </View>
      </FadeUp>
      {[...draft.unresolvedIssues, ...draft.transcriptRetentionNotices].map((issue) => (
        <Card key={issue} variant="tint">
          <Text variant="label" style={styles.issue}>A loose end</Text>
          <Text>{issue}</Text>
        </Card>
      ))}
      <View style={styles.actions}>
        <Button label="Keep all" icon="checkmark-done-outline" compact onPress={() => void updateEntries(entries.map((entry) => ({ ...entry, needsReview: false })))} />
        <Button label="Add moment" icon="add-outline" variant="secondary" compact onPress={addManual} />
        <Button
          label={advancedOpen ? "Hide advanced" : "More actions"}
          icon={advancedOpen ? "chevron-up-outline" : "options-outline"}
          variant="ghost"
          compact
          onPress={() => setAdvancedOpen((open) => !open)}
        />
      </View>
      {advancedOpen ? (
        <Card variant="outline">
          <Text variant="caption">Select one activity to split, or two to merge.</Text>
          <View style={styles.actions}>
            <Button label="Merge selected" icon="git-merge-outline" variant="secondary" compact onPress={mergeSelected} disabled={selectedIds.length !== 2} />
            <Button label="Split selected" icon="git-branch-outline" variant="secondary" compact onPress={splitSelected} disabled={selectedIds.length !== 1} />
          </View>
        </Card>
      ) : null}
      {entries.map((entry, index) => (
        <ActivityEditor
          key={entry.id}
          index={index}
          entry={entry}
          preferences={preferences}
          selected={selectedIds.includes(entry.id)}
          onToggleSelected={
            advancedOpen
              ? () =>
                  setSelectedIds((current) =>
                    current.includes(entry.id) ? current.filter((id) => id !== entry.id) : [...current, entry.id].slice(-2)
                  )
              : undefined
          }
          onChange={(next) => void updateEntries(entries.map((item) => (item.id === entry.id ? next : item)))}
          onDelete={() => void updateEntries(entries.filter((item) => item.id !== entry.id))}
        />
      ))}
      <Button label={saving ? "Saving your day" : "Save to my day"} icon="arrow-forward" onPress={save} disabled={!entries.length || saving} />
      <Button label="I forgot something" icon="add-circle-outline" variant="ghost" onPress={() => router.replace("/(tabs)/check-in")} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  intro: { gap: 10, marginVertical: 8 },
  lede: { color: palette.muted, fontSize: 17, lineHeight: 25, maxWidth: 500 },
  issue: { color: palette.coral },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 8 }
});
