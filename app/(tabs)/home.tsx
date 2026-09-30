import { DailyRhythm } from "@/components/DailyRhythm";
import { router } from "expo-router";
import { StyleSheet, View } from "react-native";
import { ActivityCard } from "@/components/ActivityCard";
import { BrandMark } from "@/components/BrandMark";
import { Button } from "@/components/Button";
import { DayRibbon } from "@/components/DayRibbon";
import { EmptyState } from "@/components/EmptyState";
import { FadeUp } from "@/components/motion";
import { Screen } from "@/components/Screen";
import { Text } from "@/components/Text";
import { useAppState } from "@/context/AppState";
import { summarizeActivities } from "@/lib/analytics";
import { isoDate, minutesToLabel } from "@/lib/dates";
import { palette } from "@/theme/colors";

export default function HomeScreen() {
  const today = isoDate();
  const { activities, sessions } = useAppState();
  const todayEntries = activities.filter((entry) => entry.activityDate === today);
  const summary = summarizeActivities(todayEntries);
  const todaySessions = sessions.filter((session) => session.sessionDate === today);
  const date = new Date();

  return (
    <Screen>
      <View style={styles.atmosphere} />
      <FadeUp>
        <View style={styles.topBar}>
          <BrandMark />
          <View style={styles.dateStamp}>
            <Text style={styles.dateNumber}>{date.getDate()}</Text>
            <Text variant="eyebrow" style={styles.dateMonth}>
              {date.toLocaleDateString(undefined, { month: "short" })}
            </Text>
          </View>
        </View>
      </FadeUp>

      <FadeUp delay={60}>
        <View style={styles.intro}>
          <Text variant="eyebrow">Today · {date.toLocaleDateString(undefined, { weekday: "long" })}</Text>
          <Text variant="display">Your day,{"\n"}in your words.</Text>
          <Text style={styles.lede}>A useful sketch of your time—not a demand to explain every minute.</Text>
        </View>
      </FadeUp>

      <FadeUp delay={120}>
        <View style={styles.hero}>
          <Text variant="eyebrow" style={styles.heroEyebrow}>
            {summary.totalMinutes ? "Recorded so far" : "Ready when you are"}
          </Text>
          <Text style={styles.heroMetric}>
            {summary.totalMinutes ? minutesToLabel(summary.totalMinutes) : "Begin"}
          </Text>
          <Text style={styles.heroCopy}>
            {summary.totalMinutes
              ? "Only the parts you chose to remember."
              : "Start with one sentence about what you have been doing."}
          </Text>
          <DayRibbon entries={todayEntries} inverse />
          <Button label="Add to today" icon="add" onPress={() => router.push("/(tabs)/check-in")} />
        </View>
      </FadeUp>

      <View style={styles.sectionHeader}>
        <View>
          <Text variant="eyebrow">The thread</Text>
          <Text variant="heading">Today’s moments</Text>
        </View>
        {todaySessions.length ? <Text variant="caption">{todaySessions.length} check-in{todaySessions.length === 1 ? "" : "s"}</Text> : null}
      </View>
      <DailyRhythm />
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
        <EmptyState
          title="Nothing recorded yet"
          body="When something feels worth remembering, add it in your own words."
          actionLabel="Record a check-in"
          onAction={() => router.push("/(tabs)/check-in")}
        />
      )}
      <Text variant="heading">Today’s check-ins</Text>
      {todaySessions.map((session) => (
        <Card key={session.id}>
          <Text>{session.sessionType} check-in</Text>
          <Text variant="caption">{session.entries.length + (session.untimedActivities?.length ?? 0)} activities · {session.status}</Text>
          {session.untimedActivities?.map((activity, index) => <Text key={index} variant="caption">{activity.title} · time not stated</Text>)}
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
  atmosphere: {
    position: "absolute",
    top: -40,
    right: -80,
    width: 220,
    height: 220,
    borderRadius: 999,
    backgroundColor: "#E7D7A8",
    opacity: 0.35
  },
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
  dateMonth: { color: palette.forest, fontSize: 11 },
  intro: { gap: 9, marginTop: 8 },
  lede: { maxWidth: 480, color: palette.muted, fontSize: 17, lineHeight: 25 },
  hero: {
    gap: 16,
    padding: 24,
    borderRadius: 28,
    backgroundColor: palette.forest
  },
  heroEyebrow: { color: palette.mint },
  heroMetric: { color: "#FFFFFF", fontSize: 54, lineHeight: 56, fontWeight: "900", letterSpacing: -2 },
  heroCopy: { color: "#DCE9E4", fontSize: 15, lineHeight: 22 },
  sectionHeader: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", marginTop: 10 },
  timeline: { paddingLeft: 2 }
});
