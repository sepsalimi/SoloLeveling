import { useMemo, useState } from "react";
import { Dimensions, Pressable, ScrollView, StyleSheet, useColorScheme, View } from "react-native";
import { LineChart, StackedBarChart } from "react-native-chart-kit";
import { DonutChart } from "react-native-chart-kit/v2";
import { Card } from "@/components/Card";
import { Screen } from "@/components/Screen";
import { Text } from "@/components/Text";
import { useAppState } from "@/context/AppState";
import {
  filterEntriesForPeriod,
  filterEntriesForPreviousPeriod,
  summarizeActivities,
  trackedSeries
} from "@/lib/analytics";
import { minutesToLabel } from "@/lib/dates";
import { AnalyticsPeriod } from "@/types/activity";
import { palette, surfaces } from "@/theme/colors";
import { BrandMark } from "@/components/BrandMark";
import { EmptyState } from "@/components/EmptyState";
import { router } from "expo-router";

const periods: AnalyticsPeriod[] = ["today", "week", "month", "ytd"];
const chartColors = [palette.teal, palette.clay, palette.gold, palette.rose, palette.mint];

export default function AnalyticsScreen() {
  const dark = useColorScheme() === "dark";
  const theme = surfaces(dark);
  const [period, setPeriod] = useState<AnalyticsPeriod>("week");
  const { activities } = useAppState();
  const entries = useMemo(() => filterEntriesForPeriod(activities, period), [activities, period]);
  const previousEntries = useMemo(() => filterEntriesForPreviousPeriod(activities, period), [activities, period]);
  const summary = summarizeActivities(entries);
  const previousSummary = summarizeActivities(previousEntries);
  const series = trackedSeries(entries, period);
  const width = Math.min(Dimensions.get("window").width - 40, 420);
  const chartWidth = Math.max(width, series.length * 42);
  const pieData = Object.entries(summary.byCategory).map(([label, value], index) => ({
    label: label.replaceAll("_", " "),
    value,
    color: chartColors[index % chartColors.length],
  }));
  const stackedCategories = Object.entries(summary.byCategory)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([category]) => category);
  const stackedData = series.map((point) =>
    stackedCategories.map((category) =>
      entries
        .filter((entry) => (period === "ytd" ? entry.activityDate.startsWith(point.date) : entry.activityDate === point.date))
        .filter((entry) => entry.primaryCategory === category)
        .reduce((sum, entry) => sum + entry.durationMinutes / 60, 0)
    )
  );
  const trackedDelta = summary.totalMinutes - previousSummary.totalMinutes;
  const socialDelta = summary.socialMinutes - previousSummary.socialMinutes;
  const exerciseDays = new Set(entries.filter((entry) => entry.primaryCategory === "exercise").map((entry) => entry.activityDate)).size;
  const topCategory = Object.entries(summary.byCategory).sort((a, b) => b[1] - a[1])[0];
  const hasEntries = entries.length > 0;

  return (
    <Screen>
      <View style={styles.topBar}><BrandMark compact /><Text variant="eyebrow">Patterns</Text></View>
      <View style={styles.intro}>
        <Text variant="display">See the shape{"\n"}of your time.</Text>
        <Text style={styles.lede}>Patterns are observations, never grades.</Text>
      </View>
      <View style={[styles.segment, { backgroundColor: theme.chip }]}>
        {periods.map((item) => (
          <Pressable
            key={item}
            accessibilityRole="button"
            accessibilityState={{ selected: period === item }}
            onPress={() => setPeriod(item)}
            style={[styles.segmentItem, period === item && styles.segmentActive]}
          >
            <Text style={period === item ? styles.segmentTextActive : [styles.segmentText, { color: theme.softText }]}>{item.toUpperCase()}</Text>
          </Pressable>
        ))}
      </View>
      {!hasEntries ? (
        <EmptyState
          title="No pattern yet"
          body="Record a few check-ins and this page will show how your time gathered."
          actionLabel="Add a check-in"
          onAction={() => router.push("/(tabs)/check-in")}
        />
      ) : null}
      {hasEntries ? (
        <>
      <Card variant="tint" style={styles.observation}>
        <Text variant="eyebrow">The clearest thread</Text>
        <Text style={styles.observationText}>
          {topCategory
            ? `${topCategory[0].replaceAll("_", " ")} held the most space: ${minutesToLabel(topCategory[1])}.`
            : "Record a few moments and a pattern will begin to appear."}
        </Text>
      </Card>
      <View style={styles.metrics}>
        <View style={[styles.metric, styles.metricGold]}><Text variant="eyebrow">Recorded</Text><Text variant="metric">{minutesToLabel(summary.totalMinutes)}</Text></View>
        <View style={[styles.metric, styles.metricMint]}><Text variant="eyebrow">Focused</Text><Text variant="metric">{minutesToLabel(summary.effectiveFocusedMinutes)}</Text></View>
      </View>
      <View style={styles.sectionHeader}><Text variant="eyebrow">Composition</Text><Text variant="heading">Where time gathered</Text></View>
      <Card variant="outline">
        {pieData.length ? (
          <DonutChart
            data={pieData}
            valueKey="value"
            labelKey="label"
            colorKey="color"
            width={width}
            height={220}
            innerRadiusRatio={0.58}
            legend
            theme="system"
            accessibilityLabel="Time by category"
          />
        ) : (
          <Text variant="caption">No activities in this period.</Text>
        )}
      </Card>
      <Card variant="ink">
        <Text variant="eyebrow" style={styles.inverseMuted}>Rhythm</Text>
        <Text variant="heading" style={styles.inverse}>Recorded hours over time</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <LineChart
            data={{
              labels: series.map((item) => item.date.slice(5)),
              datasets: [{ data: series.map((item) => Math.round((item.minutes / 60) * 10) / 10) }]
            }}
            width={chartWidth}
            height={210}
            yAxisSuffix="h"
            chartConfig={darkChartConfig}
            bezier
            style={styles.chart}
          />
        </ScrollView>
      </Card>
      <View style={styles.sectionHeader}><Text variant="eyebrow">Texture</Text><Text variant="heading">How days were composed</Text></View>
      <Card>
        {stackedCategories.length ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <StackedBarChart
              data={{
                labels: series.map((item) => item.date.slice(5)),
                legend: stackedCategories.map((item) => item.replaceAll("_", " ")),
                data: stackedData,
                barColors: stackedCategories.map((_, index) => chartColors[index % chartColors.length])
              }}
              width={chartWidth}
              height={240}
              chartConfig={chartConfig}
              hideLegend={false}
              style={styles.chart}
            />
          </ScrollView>
        ) : (
          <Text variant="caption">No activities in this period.</Text>
        )}
      </Card>
      <View style={styles.sectionHeader}><Text variant="eyebrow">Field notes</Text><Text variant="heading">Things worth noticing</Text></View>
      <View style={styles.notes}>
        <Insight number="01" text={`${minutesToLabel(summary.soloMinutes)} solo and ${minutesToLabel(summary.socialMinutes)} with people.`} />
        <Insight number="02" text={`${trackedDelta >= 0 ? `${minutesToLabel(trackedDelta)} more` : `${minutesToLabel(Math.abs(trackedDelta))} less`} recorded than the previous equivalent period.`} />
        <Insight number="03" text={`${socialDelta >= 0 ? `${minutesToLabel(socialDelta)} more` : `${minutesToLabel(Math.abs(socialDelta))} less`} social time than the previous period.`} />
        <Insight number="04" text={`Exercise appeared on ${exerciseDays} ${exerciseDays === 1 ? "day" : "days"} in this period.`} />
        {summary.averageEfficiency != null && previousSummary.averageEfficiency != null ? (
          <Insight number="05" text={`Reported efficiency changed from ${previousSummary.averageEfficiency}% to ${summary.averageEfficiency}%.`} />
        ) : null}
      </View>
        </>
      ) : null}
    </Screen>
  );
}

function Insight({ number, text }: { number: string; text: string }) {
  return (
    <View style={styles.note}>
      <Text style={styles.noteNumber}>{number}</Text>
      <Text style={styles.noteText}>{text}</Text>
    </View>
  );
}

const chartConfig = {
  backgroundGradientFrom: palette.surface,
  backgroundGradientTo: palette.surface,
  color: (opacity = 1) => `rgba(31, 95, 87, ${opacity})`,
  labelColor: () => palette.muted,
  decimalPlaces: 1
};

const darkChartConfig = {
  backgroundGradientFrom: palette.forest,
  backgroundGradientTo: palette.forest,
  color: (opacity = 1) => `rgba(232, 185, 79, ${opacity})`,
  labelColor: () => "#B9CCC5",
  decimalPlaces: 1
};

const styles = StyleSheet.create({
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  intro: { gap: 8, marginTop: 8 },
  lede: { color: palette.muted, fontSize: 17, lineHeight: 25 },
  segment: { flexDirection: "row", borderRadius: 18, padding: 5 },
  segmentItem: { flex: 1, minHeight: 42, alignItems: "center", justifyContent: "center", borderRadius: 14 },
  segmentActive: { backgroundColor: palette.forest },
  segmentText: { color: palette.muted, fontSize: 11, fontWeight: "800" },
  segmentTextActive: { color: "#FFFFFF", fontSize: 11, fontWeight: "800" },
  observation: { transform: [{ rotate: "-0.6deg" }] },
  observationText: { color: palette.forest, fontSize: 25, lineHeight: 31, fontWeight: "800", letterSpacing: -0.5 },
  metrics: { flexDirection: "row", gap: 12 },
  metric: { flex: 1, minHeight: 112, borderRadius: 24, padding: 17, justifyContent: "space-between" },
  metricGold: { backgroundColor: palette.gold },
  metricMint: { backgroundColor: palette.mint },
  sectionHeader: { gap: 3, marginTop: 10 },
  inverse: { color: "#FFFFFF" },
  inverseMuted: { color: palette.mint },
  notes: { gap: 0 },
  note: { flexDirection: "row", gap: 16, paddingVertical: 17, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: palette.line },
  noteNumber: { width: 30, color: palette.coral, fontSize: 13, fontWeight: "900" },
  noteText: { flex: 1, fontSize: 17, lineHeight: 24 },
  chart: { borderRadius: 18 }
});

