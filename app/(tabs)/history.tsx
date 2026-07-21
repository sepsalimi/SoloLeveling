import { useMemo, useState } from "react";
import { StyleSheet, TextInput, View } from "react-native";
import { ActivityCard } from "@/components/ActivityCard";
import { Card } from "@/components/Card";
import { EmptyState } from "@/components/EmptyState";
import { Screen } from "@/components/Screen";
import { Text } from "@/components/Text";
import { useAppState } from "@/context/AppState";
import { activityCategories, socialContexts, purposeTags } from "@/types/activity";
import { minutesToLabel } from "@/lib/dates";
import { palette } from "@/theme/colors";

export default function HistoryScreen() {
  const { activities, deleteActivity } = useAppState();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("");
  const filtered = useMemo(
    () =>
      activities.filter((entry) => {
        const haystack = `${entry.title} ${entry.primaryCategory} ${entry.socialContext} ${entry.purposeTags.join(" ")}`.toLowerCase();
        return haystack.includes(query.toLowerCase()) && (!filter || haystack.includes(filter));
      }),
    [activities, filter, query]
  );
  const grouped = filtered.reduce<Record<string, typeof filtered>>((acc, entry) => {
    acc[entry.activityDate] = [...(acc[entry.activityDate] ?? []), entry];
    return acc;
  }, {});

  return (
    <Screen>
      <Text variant="title">History</Text>
      <TextInput value={query} onChangeText={setQuery} placeholder="Search activities" style={styles.input} accessibilityLabel="Search activities" />
      <TextInput
        value={filter}
        onChangeText={setFilter}
        placeholder="Filter category, social context, or purpose"
        style={styles.input}
        accessibilityLabel="Filter activities"
      />
      <Text variant="caption">
        Filters support: {activityCategories.slice(0, 4).join(", ")}, {socialContexts.slice(0, 3).join(", ")}, {purposeTags.join(", ")}
      </Text>
      {Object.entries(grouped).length ? (
        Object.entries(grouped).map(([date, entries]) => (
          <View key={date} style={styles.group}>
            <Card>
              <Text variant="heading">{date}</Text>
              <Text variant="caption">{minutesToLabel(entries.reduce((sum, entry) => sum + entry.durationMinutes, 0))} tracked</Text>
            </Card>
            {entries.map((entry) => (
              <ActivityCard key={entry.id} entry={entry} onDelete={deleteActivity} />
            ))}
          </View>
        ))
      ) : (
        <EmptyState title="No matches" body="Try a different search or filter." />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  input: { minHeight: 48, borderWidth: 1, borderColor: palette.line, borderRadius: 8, paddingHorizontal: 12, fontSize: 16, backgroundColor: "#FFFFFF" },
  group: { gap: 10 }
});

