import { useMemo, useState } from "react";
import { Alert, Pressable, StyleSheet, View } from "react-native";
import { ActivityCard } from "@/components/ActivityCard";
import { ActivityEditor } from "@/components/ActivityEditor";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { EmptyState } from "@/components/EmptyState";
import { Screen } from "@/components/Screen";
import { Text } from "@/components/Text";
import { useAppState } from "@/context/AppState";
import { ActivityEntry, activityCategories, socialContexts, purposeTags } from "@/types/activity";
import { minutesToLabel } from "@/lib/dates";
import { palette } from "@/theme/colors";
import { activityEntrySchema } from "@/lib/validation";
import { Input } from "@/components/Input";

export default function HistoryScreen() {
  const { activities, deleteActivity, preferences, updateActivity } = useAppState();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [social, setSocial] = useState("all");
  const [purpose, setPurpose] = useState("all");
  const [editing, setEditing] = useState<ActivityEntry>();
  const filtered = useMemo(
    () =>
      activities.filter((entry) => {
        const textMatches = `${entry.title} ${entry.description ?? ""}`.toLowerCase().includes(query.toLowerCase());
        return textMatches
          && (category === "all" || entry.primaryCategory === category)
          && (social === "all" || entry.socialContext === social)
          && (purpose === "all" || entry.purposeTags.includes(purpose as ActivityEntry["purposeTags"][number]));
      }),
    [activities, category, purpose, query, social]
  );
  const grouped = filtered.reduce<Record<string, typeof filtered>>((acc, entry) => {
    acc[entry.activityDate] = [...(acc[entry.activityDate] ?? []), entry];
    return acc;
  }, {});

  function confirmDelete(entry: ActivityEntry) {
    Alert.alert("Delete activity?", `“${entry.title}” will be permanently removed.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          void deleteActivity(entry.id).catch((error) =>
            Alert.alert("Could not delete activity", error instanceof Error ? error.message : "Try again.")
          );
        }
      }
    ]);
  }

  async function saveEdit() {
    if (!editing) return;
    if (!activityEntrySchema.safeParse(editing).success) {
      Alert.alert("Check this activity", "Enter a title, valid date, positive duration, and ratings within their displayed ranges.");
      return;
    }
    try {
      await updateActivity({ ...editing, needsReview: false });
      setEditing(undefined);
    } catch (error) {
      Alert.alert("Could not save activity", error instanceof Error ? error.message : "Try again.");
    }
  }

  return (
    <Screen>
      <Text variant="title">History</Text>
      <Input value={query} onChangeText={setQuery} placeholder="Search activities" accessibilityLabel="Search activities" />
      <Filter label="Category" values={activityCategories} selected={category} onChange={setCategory} />
      <Filter label="Social" values={socialContexts} selected={social} onChange={setSocial} />
      <Filter label="Purpose" values={purposeTags} selected={purpose} onChange={setPurpose} />
      {editing ? (
        <>
          <ActivityEditor entry={editing} preferences={preferences} onChange={setEditing} />
          <View style={styles.actions}>
            <Button label="Save changes" icon="save-outline" onPress={() => void saveEdit()} />
            <Button label="Cancel" icon="close-outline" variant="ghost" onPress={() => setEditing(undefined)} />
          </View>
        </>
      ) : null}
      {Object.entries(grouped).length ? (
        Object.entries(grouped).map(([date, entries]) => (
          <View key={date} style={styles.group}>
            <Card>
              <Text variant="heading">{date}</Text>
              <Text variant="caption">{minutesToLabel(entries.reduce((sum, entry) => sum + entry.durationMinutes, 0))} tracked</Text>
            </Card>
            {entries.map((entry) => (
              <ActivityCard key={entry.id} entry={entry} onEdit={setEditing} onDelete={() => confirmDelete(entry)} />
            ))}
          </View>
        ))
      ) : (
        <EmptyState title="No matches" body="Try a different search or filter." />
      )}
    </Screen>
  );
}

function Filter<T extends string>({
  label,
  values,
  selected,
  onChange
}: {
  label: string;
  values: readonly T[];
  selected: string;
  onChange: (value: string) => void;
}) {
  return (
    <View style={styles.filter}>
      <Text variant="caption">{label}</Text>
      <View style={styles.chips}>
        {["all", ...values].map((value) => {
          const active = selected === value;
          return (
            <Pressable key={value} onPress={() => onChange(value)} style={[styles.chip, active && styles.chipActive]} accessibilityRole="button" accessibilityState={{ selected: active }}>
              <Text style={active ? styles.chipTextActive : styles.chipText}>{value.replaceAll("_", " ")}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  group: { gap: 10 },
  filter: { gap: 6 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  chip: { minHeight: 38, justifyContent: "center", borderRadius: 999, paddingHorizontal: 12, backgroundColor: "#EAF1EF" },
  chipActive: { backgroundColor: palette.teal },
  chipText: { color: palette.teal, fontSize: 13 },
  chipTextActive: { color: "#FFFFFF", fontSize: 13 },
  actions: { flexDirection: "row", gap: 8 }
});

