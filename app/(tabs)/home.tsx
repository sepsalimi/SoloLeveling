// Presents the day as a calm editorial timeline rather than a dashboard.
import { router } from "expo-router";
import { StyleSheet, View } from "react-native";
import { ActivityCard } from "@/components/ActivityCard";
import { BrandMark } from "@/components/BrandMark";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { DayRibbon } from "@/components/DayRibbon";
import { EmptyState } from "@/components/EmptyState";
import { Screen } from "@/components/Screen";
import { Text } from "@/components/Text";
import { useAppState } from "@/context/AppState";
import { summarizeActivities } from "@/lib/analytics";
import { isoDate, minutesToLabel } from "@/lib/dates";
import { categoryColors, palette } from "@/theme/colors";

export default function HomeScreen() {
  const today = isoDate();
  const { activities, sessions } = useAppState();
  const todayEntries = activities.filter((entry) => entry.activityDate === today);
  const summary = summarizeActivities(todayEntries);
  const todaySessions = sessions.filter((session) => session.sessionDate === today);
  const date = new Date();
  const topCategories = Object.entries(summary.byCategory).sort((a, b) => b[1] - a[1]).slice(0, 4);

  return (
    <Screen>
      <View style={styles.topBar}>
        <BrandMark />
        <View style={styles.dateStamp}>
          <Text style={styles.dateNumber}>{date.getDate()}</Text>
          <Text variant="eyebrow" style={styles.dateMonth}>
            {date.toLocaleDateString(undefined, { month: "short" })}
          </Text>
        </View>
      </View>

      <View style={styles.intro}>
        <Text variant="eyebrow">Today · {date.toLocaleDateString(undefined, { weekday: "long" })}</Text>
        <Text variant="display">Your day,{"\n"}loosely woven.</Text>
        <Text style={styles.lede}>A useful sketch of your time—not a demand to explain every minute.</Text>
      </View>

      <Card variant="ink" style={styles.hero}>
        <Text variant="eyebrow" style={styles.heroEyebrow}>Recorded so far</Text>
        <Text style={styles.heroMetric}>{minutesToLabel(summary.totalMinutes)}</Text>
        <Text style={styles.heroCopy}>
          {summary.totalMinutes
            ? `${minutesToLabel(summary.untrackedMinutes)} remains unrecorded, and that is completely fine.`
            : "Start with one sentence about what you have been doing."}
        </Text>
        <DayRibbon entries={todayEntries} inverse />
        <Button label="Add to today" icon="add" onPress={() => router.push("/(tabs)/check-in")} />
      </Card>

      <View style={styles.metrics}>
        <View style={[styles.metric, styles.focusMetric]}>
          <Text variant="eyebrow">Focused</Text>
          <Text variant="metric">{minutesToLabel(summary.effectiveFocusedMinutes)}</Text>
        </View>
        <View style={[styles.metric, styles.socialMetric]}>
          <Text variant="eyebrow">With people</Text>
          <Text variant="metric">{minutesToLabel(summary.socialMinutes)}</Text>
        </View>
      </View>

      {topCategories.length ? (
        <View style={styles.legend}>
          {topCategories.map(([category, minutes]) => (
            <View key={category} style={styles.legendItem}>
              <View style={[styles.dot, { backgroundColor: categoryColors[category] ?? palette.muted }]} />
              <Text variant="label">{category.replaceAll("_", " ")}</Text>
              <Text variant="caption">{minutesToLabel(minutes)}</Text>
            </View>
          ))}
        </View>
      ) : null}

      <View style={styles.sectionHeader}>
        <View>
          <Text variant="eyebrow">The thread</Text>
          <Text variant="heading">Today’s moments</Text>
        </View>
        {todaySessions.length ? <Text variant="caption">{todaySessions.length} check-in{todaySessions.length === 1 ? "" : "s"}</Text> : null}
      </View>

      {todayEntries.length ? (
        <View style={styles.timeline}>
          {todayEntries.map((entry) => <ActivityCard key={entry.id} entry={entry} />)}
        </View>
      ) : (
        <EmptyState title="Nothing recorded yet" body="When something feels worth remembering, add it in your own words." />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  topBar: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  dateStamp: {
    width: 54,
    height: 60,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: palette.gold
  },
  dateNumber: { color: palette.forest, fontSize: 24, lineHeight: 25, fontWeight: "900" },
  dateMonth: { color: palette.forest, fontSize: 9 },
  intro: { gap: 9, marginTop: 8 },
  lede: { maxWidth: 480, color: palette.muted, fontSize: 17, lineHeight: 25 },
  hero: { gap: 16, padding: 24, transform: [{ rotate: "-0.5deg" }] },
  heroEyebrow: { color: palette.mint },
  heroMetric: { color: "#FFFFFF", fontSize: 54, lineHeight: 56, fontWeight: "900", letterSpacing: -2 },
  heroCopy: { color: "#DCE9E4", fontSize: 15, lineHeight: 22 },
  metrics: { flexDirection: "row", gap: 12 },
  metric: { flex: 1, minHeight: 118, borderRadius: 24, padding: 18, justifyContent: "space-between" },
  focusMetric: { backgroundColor: "#F4C965" },
  socialMetric: { backgroundColor: "#B9D9CC" },
  legend: { gap: 10, paddingHorizontal: 4 },
  legendItem: { minHeight: 32, flexDirection: "row", alignItems: "center", gap: 9 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  sectionHeader: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", marginTop: 10 },
  timeline: { paddingLeft: 2 }
});
