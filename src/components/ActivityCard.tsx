import { StyleSheet, View } from "react-native";
import { ActivityEntry } from "@/types/activity";
import { Card } from "@/components/Card";
import { Text } from "@/components/Text";
import { Button } from "@/components/Button";
import { minutesToLabel } from "@/lib/dates";
import { palette } from "@/theme/colors";

export function ActivityCard({
  entry,
  onEdit,
  onDelete
}: {
  entry: ActivityEntry;
  onEdit?: (entry: ActivityEntry) => void;
  onDelete?: (id: string) => void;
}) {
  return (
    <Card>
      <View style={styles.row}>
        <View style={styles.fill}>
          <Text variant="heading" style={styles.title}>
            {entry.title}
          </Text>
          <Text variant="caption">
            {minutesToLabel(entry.durationMinutes)} · {entry.primaryCategory.replace("_", " ")} · {entry.socialContext.replace("_", " ")}
          </Text>
        </View>
        {entry.needsReview ? <Text style={styles.review}>Review</Text> : null}
      </View>
      {entry.sourceTranscriptSegment ? <Text variant="caption">{entry.sourceTranscriptSegment}</Text> : null}
      <View style={styles.tags}>
        {entry.purposeTags.map((tag) => (
          <Text key={tag} style={styles.tag}>
            {tag}
          </Text>
        ))}
      </View>
      {(onEdit || onDelete) && (
        <View style={styles.actions}>
          {onEdit ? <Button label="Edit" icon="create-outline" variant="secondary" onPress={() => onEdit(entry)} /> : null}
          {onDelete ? <Button label="Delete" icon="trash-outline" variant="danger" onPress={() => onDelete(entry.id)} /> : null}
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  fill: { flex: 1 },
  title: { fontSize: 18, lineHeight: 24 },
  review: { color: palette.clay, fontWeight: "800" },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  tag: { backgroundColor: "#EEF4F1", color: palette.teal, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, fontSize: 13 },
  actions: { flexDirection: "row", gap: 8, flexWrap: "wrap" }
});

