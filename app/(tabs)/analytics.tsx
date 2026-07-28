import { useMemo, useState } from "react";
import { Dimensions, Pressable, ScrollView, StyleSheet, View } from "react-native";
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
import { palette } from "@/theme/colors";

const periods: AnalyticsPeriod[] = ["today", "week", "month", "ytd"];
const chartColors = [palette.teal, palette.clay, palette.gold, palette.rose, palette.mint];

export default function AnalyticsScreen() {
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
    label: label.replace("_", " "),
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

  return (
    <Screen>
      <Text variant="title">Analytics</Text>
      <View style={styles.segment}>
        {periods.map((item) => (
          <Pressable key={item} onPress={() => setPeriod(item)} style={[styles.segmentItem, period === item && styles.segmentActive]}>
            <Text style={period === item ? styles.segmentTextActive : styles.segmentText}>{item.toUpperCase()}</Text>
          </Pressable>
        ))}
      </View>
      <View style={styles.metrics}>
        <Card style={styles.metric}>
          <Text variant="caption">Tracked</Text>
          <Text variant="heading">{minutesToLabel(summary.totalMinutes)}</Text>
        </Card>
        <Card style={styles.metric}>
          <Text variant="caption">Focused</Text>
          <Text variant="heading">{minutesToLabel(summary.effectiveFocusedMinutes)}</Text>
        </Card>
      </View>
      <Card>
        <Text variant="heading">Category distribution</Text>
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
      <Card>
        <Text variant="heading">Daily tracked hours</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <LineChart
            data={{
              labels: series.map((item) => item.date.slice(5)),
              datasets: [{ data: series.map((item) => Math.round((item.minutes / 60) * 10) / 10) }]
            }}
            width={chartWidth}
            height={210}
            yAxisSuffix="h"
            chartConfig={chartConfig}
            bezier
            style={styles.chart}
          />
        </ScrollView>
      </Card>
      <Card>
        <Text variant="heading">Daily category mix</Text>
        {stackedCategories.length ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <StackedBarChart
              data={{
                labels: series.map((item) => item.date.slice(5)),
                legend: stackedCategories.map((item) => item.replace("_", " ")),
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
      <Card>
        <Text variant="heading">Insights</Text>
        <Text>Solo time: {minutesToLabel(summary.soloMinutes)}. Social time: {minutesToLabel(summary.socialMinutes)}.</Text>
        <Text>Average reported efficiency: {summary.averageEfficiency ? `${summary.averageEfficiency}%` : "not enough reports yet"}.</Text>
        <Text>{trackedDelta >= 0 ? `${minutesToLabel(trackedDelta)} more` : `${minutesToLabel(Math.abs(trackedDelta))} less`} tracked than the previous equivalent period.</Text>
        <Text>{socialDelta >= 0 ? `${minutesToLabel(socialDelta)} more` : `${minutesToLabel(Math.abs(socialDelta))} less`} social time than the previous period.</Text>
        <Text>Exercise was recorded on {exerciseDays} {exerciseDays === 1 ? "day" : "days"} in this period.</Text>
        {summary.averageEfficiency != null && previousSummary.averageEfficiency != null ? (
          <Text>Average reported efficiency changed from {previousSummary.averageEfficiency}% to {summary.averageEfficiency}%.</Text>
        ) : null}
      </Card>
    </Screen>
  );
}

const chartConfig = {
  backgroundGradientFrom: "#FFFFFF",
  backgroundGradientTo: "#FFFFFF",
  color: (opacity = 1) => `rgba(47, 111, 115, ${opacity})`,
  labelColor: () => palette.muted,
  decimalPlaces: 1
};

const styles = StyleSheet.create({
  segment: { flexDirection: "row", backgroundColor: "#E7F0EC", borderRadius: 8, padding: 4 },
  segmentItem: { flex: 1, minHeight: 40, alignItems: "center", justifyContent: "center", borderRadius: 8 },
  segmentActive: { backgroundColor: palette.teal },
  segmentText: { color: palette.teal, fontSize: 13 },
  segmentTextActive: { color: "#FFFFFF", fontSize: 13 },
  metrics: { flexDirection: "row", gap: 12 },
  metric: { flex: 1 },
  chart: { borderRadius: 8 }
});

