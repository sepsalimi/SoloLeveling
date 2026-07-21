import { useMemo, useState } from "react";
import { Dimensions, Pressable, StyleSheet, View } from "react-native";
import { BarChart, LineChart, PieChart } from "react-native-chart-kit";
import { Card } from "@/components/Card";
import { Screen } from "@/components/Screen";
import { Text } from "@/components/Text";
import { useAppState } from "@/context/AppState";
import { filterEntriesForPeriod, summarizeActivities } from "@/lib/analytics";
import { minutesToLabel } from "@/lib/dates";
import { AnalyticsPeriod } from "@/types/activity";
import { palette } from "@/theme/colors";

const periods: AnalyticsPeriod[] = ["today", "week", "month", "ytd"];
const chartColors = [palette.teal, palette.clay, palette.gold, palette.rose, palette.mint];

export default function AnalyticsScreen() {
  const [period, setPeriod] = useState<AnalyticsPeriod>("week");
  const { activities } = useAppState();
  const entries = useMemo(() => filterEntriesForPeriod(activities, period), [activities, period]);
  const summary = summarizeActivities(entries);
  const width = Math.min(Dimensions.get("window").width - 40, 420);
  const pieData = Object.entries(summary.byCategory).map(([name, minutes], index) => ({
    name: name.replace("_", " "),
    population: minutes,
    color: chartColors[index % chartColors.length],
    legendFontColor: palette.muted,
    legendFontSize: 12
  }));

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
          <PieChart data={pieData} width={width} height={190} accessor="population" backgroundColor="transparent" paddingLeft="0" chartConfig={chartConfig} />
        ) : (
          <Text variant="caption">No activities in this period.</Text>
        )}
      </Card>
      <Card>
        <Text variant="heading">Daily tracked hours</Text>
        <LineChart
          data={{
            labels: summary.dailyTracked.map((item) => item.date.slice(5)),
            datasets: [{ data: summary.dailyTracked.map((item) => Math.round((item.minutes / 60) * 10) / 10) }]
          }}
          width={width}
          height={210}
          yAxisSuffix="h"
          chartConfig={chartConfig}
          bezier
          style={styles.chart}
        />
      </Card>
      <Card>
        <Text variant="heading">Purpose mix</Text>
        <BarChart
          data={{
            labels: ["Prod", "Fun", "Rec", "Grow", "Need"],
            datasets: [
              {
                data: [
                  summary.byPurpose.productive / 60,
                  summary.byPurpose.fun / 60,
                  summary.byPurpose.recovery / 60,
                  summary.byPurpose.growth / 60,
                  summary.byPurpose.necessary / 60
                ]
              }
            ]
          }}
          width={width}
          height={220}
          yAxisLabel=""
          yAxisSuffix="h"
          chartConfig={chartConfig}
          style={styles.chart}
        />
      </Card>
      <Card>
        <Text variant="heading">Insights</Text>
        <Text>Solo time: {minutesToLabel(summary.soloMinutes)}. Social time: {minutesToLabel(summary.socialMinutes)}.</Text>
        <Text>Average reported efficiency: {summary.averageEfficiency ? `${summary.averageEfficiency}%` : "not enough reports yet"}.</Text>
        <Text variant="caption">Previous-period comparisons are computed in production once more historical data exists.</Text>
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

