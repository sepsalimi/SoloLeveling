import { View } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";
import { Text } from "./Text";
import { plannedHours } from "@/lib/tasks";
import { LifeTask, taskCategories } from "@/types/task";
export const categoryColors = ["#2F6F73", "#C98462", "#A178B6", "#E2B44E", "#668B58", "#5A83B0", "#C96D7B", "#807365"];
export function TaskPie({ tasks }: { tasks: LifeTask[] }) {
  const entries = Object.entries(plannedHours(tasks));
  const total = entries.reduce((sum, [, hours]) => sum + hours, 0);
  const missing = tasks.filter(t => t.status !== "Done" && !t.estimatedHours).length;
  let angle = -Math.PI / 2;
  return <>
    <Text variant="heading">Where your time will go</Text>
    <Text variant="caption">Estimated hours for unfinished tasks · {total.toFixed(1)} h planned</Text>
    {total > 0 ? <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 24, alignItems: "center" }}>
      <Svg width={176} height={176} viewBox="0 0 200 200" accessibilityLabel="Planned hours by category. See the legend for values.">
        {entries.map(([category, hours]) => {
          const start = angle; angle += hours / total * Math.PI * 2;
          const d = "M 100 100 L " + (100 + 92 * Math.cos(start)) + " " + (100 + 92 * Math.sin(start)) + " A 92 92 0 " + (hours / total > 0.5 ? 1 : 0) + " 1 " + (100 + 92 * Math.cos(angle)) + " " + (100 + 92 * Math.sin(angle)) + " Z";
          return entries.length === 1 ? <Circle key={category} cx={100} cy={100} r={92} fill={categoryColors[taskCategories.indexOf(category as LifeTask["category"])]} /> : <Path key={category} d={d} fill={categoryColors[taskCategories.indexOf(category as LifeTask["category"])]} stroke="#FFFFFF" strokeWidth={2} />;
        })}
      </Svg>
      <View style={{ gap: 8 }}>{entries.map(([name, hours]) => <View key={name} style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
        <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: categoryColors[taskCategories.indexOf(name as LifeTask["category"])] }} />
        <Text variant="caption">{name} · {hours.toFixed(1)} h · {Math.round(hours / total * 100)}%</Text>
      </View>)}</View>
    </View> : <Text>No estimated hours yet. Add a task and set its hours to build your chart.</Text>}
    {missing > 0 && <Text variant="caption">{missing} task{missing === 1 ? "" : "s"} without estimates excluded from the chart.</Text>}
  </>;
}
