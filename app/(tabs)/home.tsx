import { router } from "expo-router";
import { StyleSheet, View } from "react-native";
import { ActivityCard } from "@/components/ActivityCard";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { EmptyState } from "@/components/EmptyState";
import { Screen } from "@/components/Screen";
import { Text } from "@/components/Text";
import { useAppState } from "@/context/AppState";
import { summarizeActivities } from "@/lib/analytics";
import { isoDate, minutesToLabel } from "@/lib/dates";

export default function HomeScreen() {
  const today = isoDate();
  const { activities, sessions } = useAppState();
  const todayEntries = activities.filter((entry) => entry.activityDate === today);
  const summary = summarizeActivities(todayEntries);
  const todaySessions = sessions.filter((session) => session.sessionDate === today);

  return (
    <Screen>
      <View style={styles.header}>
        <View>
          <Text variant="title">Today</Text>
          <Text variant="caption">{new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}</Text>
        </View>
        <Button label="Record" icon="mic-outline" onPress={() => router.push("/(tabs)/check-in")} />
      </View>
      <Card>
        <Text variant="caption">Tracked time</Text>
        <Text variant="metric">{minutesToLabel(summary.totalMinutes)}</Text>
        <Text>You have recorded {minutesToLabel(summary.totalMinutes)} today.</Text>
      </Card>
      <View style={styles.metrics}>
        <Card style={styles.metricCard}>
          <Text variant="caption">Untracked</Text>
          <Text variant="heading">{minutesToLabel(summary.untrackedMinutes)}</Text>
        </Card>
        <Card style={styles.metricCard}>
          <Text variant="caption">Focused</Text>
          <Text variant="heading">{minutesToLabel(summary.effectiveFocusedMinutes)}</Text>
        </Card>
      </View>
      <Text variant="heading">Breakdown</Text>
      {Object.entries(summary.byCategory).length ? (
        Object.entries(summary.byCategory).map(([category, minutes]) => (
          <Card key={category}>
            <View style={styles.row}>
              <Text>{category.replace("_", " ")}</Text>
              <Text>{minutesToLabel(minutes)}</Text>
            </View>
          </Card>
        ))
      ) : (
        <EmptyState title="No entries yet" body="Add a check-in when it feels useful. There is no need to account for every hour." />
      )}
      <Text variant="heading">Today’s check-ins</Text>
      {todaySessions.map((session) => (
        <Card key={session.id}>
          <Text>{session.sessionType} check-in</Text>
          <Text variant="caption">{session.entries.length} activities · {session.status}</Text>
        </Card>
      ))}
      <Text variant="heading">Recent activities</Text>
      {todayEntries.map((entry) => (
        <ActivityCard key={entry.id} entry={entry} />
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12 },
  metrics: { flexDirection: "row", gap: 12 },
  metricCard: { flex: 1 },
  row: { flexDirection: "row", justifyContent: "space-between", gap: 16 }
});

