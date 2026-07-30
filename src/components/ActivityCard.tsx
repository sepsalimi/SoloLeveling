import { StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ActivityEntry } from "@/types/activity";
import { Text } from "@/components/Text";
import { Button } from "@/components/Button";
import { minutesToLabel } from "@/lib/dates";
import { categoryColors, palette } from "@/theme/colors";

const categoryIcons: Record<string, keyof typeof Ionicons.glyphMap> = {
  work: "briefcase-outline",
  learning: "book-outline",
  health: "heart-outline",
  exercise: "fitness-outline",
  food: "restaurant-outline",
  chores: "home-outline",
  social: "people-outline",
  entertainment: "play-outline",
  rest: "moon-outline",
  travel: "navigate-outline",
  personal_care: "water-outline",
  other: "ellipse-outline"
};

export function ActivityCard({
  entry,
  onEdit,
  onDelete
}: {
  entry: ActivityEntry;
  onEdit?: (entry: ActivityEntry) => void;
  onDelete?: (id: string) => void;
}) {
  const color = categoryColors[entry.primaryCategory] ?? palette.muted;
  return (
    <View style={styles.container}>
      <View style={[styles.icon, { backgroundColor: `${color}22` }]}>
        <Ionicons name={categoryIcons[entry.primaryCategory] ?? "ellipse-outline"} size={21} color={color} />
      </View>
      <View style={styles.fill}>
        <View style={styles.row}>
          <View style={styles.fill}>
            <Text variant="label" style={styles.title}>{entry.title}</Text>
            <Text variant="caption">
              {entry.primaryCategory.replace("_", " ")} · {entry.socialContext.replaceAll("_", " ")}
            </Text>
          </View>
          <Text style={[styles.duration, { color }]}>{minutesToLabel(entry.durationMinutes)}</Text>
        </View>
        <View style={styles.tags}>
          {entry.needsReview ? <Text style={styles.review}>review</Text> : null}
          {entry.purposeTags.map((tag) => <Text key={tag} style={styles.tag}>{tag}</Text>)}
        </View>
        {(onEdit || onDelete) ? (
          <View style={styles.actions}>
            {onEdit ? <Button label="Edit" icon="create-outline" variant="secondary" compact onPress={() => onEdit(entry)} /> : null}
            {onDelete ? <Button label="Delete" icon="trash-outline" variant="danger" compact onPress={() => onDelete(entry.id)} /> : null}
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    gap: 13,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.line
  },
  row: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  fill: { flex: 1 },
  icon: { width: 44, height: 44, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 17, lineHeight: 22 },
  duration: { fontSize: 16, lineHeight: 22, fontWeight: "900" },
  review: { color: palette.coral, fontWeight: "800", fontSize: 12 },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8 },
  tag: { color: palette.muted, fontSize: 12, fontWeight: "700" },
  actions: { flexDirection: "row", gap: 8, flexWrap: "wrap", marginTop: 10 }
});

