// Turns a day into one continuous color ribbon instead of a conventional chart.
import { StyleSheet, View } from "react-native";
import { ActivityEntry } from "@/types/activity";
import { categoryColors, palette } from "@/theme/colors";
import { Text } from "@/components/Text";
import { minutesToLabel } from "@/lib/dates";

export function DayRibbon({ entries, inverse = false }: { entries: ActivityEntry[]; inverse?: boolean }) {
  const grouped = entries.reduce<Record<string, number>>((result, entry) => {
    result[entry.primaryCategory] = (result[entry.primaryCategory] ?? 0) + entry.durationMinutes;
    return result;
  }, {});
  const tracked = Object.values(grouped).reduce((sum, minutes) => sum + minutes, 0);
  const untracked = Math.max(0, 1440 - tracked);

  return (
    <View style={styles.container}>
      <View style={styles.ribbon} accessibilityLabel={`${minutesToLabel(tracked)} recorded today`}>
        {Object.entries(grouped).map(([category, minutes]) => (
          <View
            key={category}
            style={{
              flex: Math.max(minutes, 12),
              backgroundColor: categoryColors[category] ?? palette.muted
            }}
          />
        ))}
        <View style={[styles.untracked, { flex: Math.max(untracked, 30) }]} />
      </View>
      <View style={styles.scale}>
        <Text variant="eyebrow" style={inverse ? styles.inverse : undefined}>00</Text>
        <Text variant="eyebrow" style={inverse ? styles.inverse : undefined}>Your day</Text>
        <Text variant="eyebrow" style={inverse ? styles.inverse : undefined}>24</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 8 },
  ribbon: {
    height: 20,
    borderRadius: 999,
    overflow: "hidden",
    flexDirection: "row",
    backgroundColor: palette.line
  },
  untracked: {
    backgroundColor: "#D8D3C8",
    borderLeftWidth: 2,
    borderLeftColor: palette.surface
  },
  scale: { flexDirection: "row", justifyContent: "space-between", opacity: 0.68 },
  inverse: { color: "#FFFFFF" }
});
