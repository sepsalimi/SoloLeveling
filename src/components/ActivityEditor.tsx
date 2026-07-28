// Provides the complete, compact editor used for extracted and historical activities.
import { Pressable, StyleSheet, TextInput, View } from "react-native";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { Text } from "@/components/Text";
import {
  ActivityEntry,
  activityCategories,
  purposeTags,
  socialContexts,
  UserPreferences
} from "@/types/activity";
import { palette } from "@/theme/colors";

type Props = {
  entry: ActivityEntry;
  preferences?: UserPreferences;
  selected?: boolean;
  onChange: (entry: ActivityEntry) => void;
  onDelete?: () => void;
  onToggleSelected?: () => void;
};

export function ActivityEditor({ entry, preferences, selected, onChange, onDelete, onToggleSelected }: Props) {
  const update = (patch: Partial<ActivityEntry>) => onChange({ ...entry, ...patch, needsReview: true });

  return (
    <Card style={selected ? styles.selected : undefined}>
      <View style={styles.header}>
        <Text variant="heading">Activity</Text>
        {onToggleSelected ? (
          <Button
            label={selected ? "Selected" : "Select"}
            icon={selected ? "checkmark-circle" : "ellipse-outline"}
            variant="secondary"
            onPress={onToggleSelected}
          />
        ) : null}
      </View>

      <Field label="Title">
        <TextInput value={entry.title} onChangeText={(title) => update({ title })} style={styles.input} accessibilityLabel="Activity title" />
      </Field>
      <Field label="Description">
        <TextInput value={entry.description ?? ""} onChangeText={(description) => update({ description: description || undefined })} style={styles.input} accessibilityLabel="Activity description" />
      </Field>
      <View style={styles.row}>
        <Field label="Date" style={styles.fill}>
          <TextInput value={entry.activityDate} onChangeText={(activityDate) => update({ activityDate })} style={styles.input} accessibilityLabel="Activity date" />
        </Field>
        <Field label="Minutes" style={styles.small}>
          <TextInput value={String(entry.durationMinutes)} onChangeText={(value) => update({ durationMinutes: Number(value) || 0 })} keyboardType="numeric" style={styles.input} accessibilityLabel="Duration minutes" />
        </Field>
      </View>
      <View style={styles.row}>
        <Field label="Start" style={styles.fill}>
          <TextInput value={entry.startTime ?? ""} onChangeText={(startTime) => update({ startTime: startTime || undefined })} placeholder="09:00" style={styles.input} accessibilityLabel="Start time" />
        </Field>
        <Field label="End" style={styles.fill}>
          <TextInput value={entry.endTime ?? ""} onChangeText={(endTime) => update({ endTime: endTime || undefined })} placeholder="11:00" style={styles.input} accessibilityLabel="End time" />
        </Field>
      </View>

      <ChoiceGroup
        label="Category"
        values={activityCategories}
        selected={[entry.primaryCategory]}
        onPress={(primaryCategory) => update({ primaryCategory })}
      />
      <ChoiceGroup
        label="Social context"
        values={socialContexts}
        selected={[entry.socialContext]}
        onPress={(socialContext) => update({ socialContext })}
      />
      <ChoiceGroup
        label="Purpose"
        values={purposeTags}
        selected={entry.purposeTags}
        onPress={(tag) =>
          update({
            purposeTags: entry.purposeTags.includes(tag)
              ? entry.purposeTags.filter((item) => item !== tag)
              : [...entry.purposeTags, tag]
          })
        }
      />

      {preferences?.efficiencyEnabled ? (
        <Field label="Efficiency percent (optional)">
          <TextInput
            value={entry.efficiencyPercent == null ? "" : String(entry.efficiencyPercent)}
            onChangeText={(value) => update({ efficiencyPercent: value ? Number(value) : undefined })}
            keyboardType="numeric"
            style={styles.input}
            accessibilityLabel="Efficiency percent"
          />
        </Field>
      ) : null}
      {preferences?.moodEnabled ? (
        <View style={styles.row}>
          <Field label="Mood 1–5" style={styles.fill}>
            <TextInput value={entry.mood == null ? "" : String(entry.mood)} onChangeText={(value) => update({ mood: value ? Number(value) : undefined })} keyboardType="numeric" style={styles.input} accessibilityLabel="Mood" />
          </Field>
          <Field label="Energy 1–5" style={styles.fill}>
            <TextInput value={entry.energyLevel == null ? "" : String(entry.energyLevel)} onChangeText={(value) => update({ energyLevel: value ? Number(value) : undefined })} keyboardType="numeric" style={styles.input} accessibilityLabel="Energy" />
          </Field>
        </View>
      ) : null}

      {onDelete ? <Button label="Delete activity" icon="trash-outline" variant="danger" onPress={onDelete} /> : null}
    </Card>
  );
}

function Field({ label, children, style }: { label: string; children: React.ReactNode; style?: object }) {
  return (
    <View style={[styles.field, style]}>
      <Text variant="caption">{label}</Text>
      {children}
    </View>
  );
}

function ChoiceGroup<T extends string>({
  label,
  values,
  selected,
  onPress
}: {
  label: string;
  values: readonly T[];
  selected: readonly T[];
  onPress: (value: T) => void;
}) {
  return (
    <View style={styles.field}>
      <Text variant="caption">{label}</Text>
      <View style={styles.choices}>
        {values.map((value) => {
          const active = selected.includes(value);
          return (
            <Pressable
              key={value}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              onPress={() => onPress(value)}
              style={[styles.choice, active && styles.choiceActive]}
            >
              <Text style={active ? styles.choiceTextActive : styles.choiceText}>{value.replaceAll("_", " ")}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  selected: { borderColor: palette.teal, borderWidth: 2 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  field: { gap: 6 },
  row: { flexDirection: "row", gap: 10 },
  fill: { flex: 1 },
  small: { width: 100 },
  input: {
    minHeight: 46,
    borderWidth: 1,
    borderColor: palette.line,
    borderRadius: 12,
    paddingHorizontal: 12,
    fontSize: 16,
    backgroundColor: palette.surface,
    color: palette.ink
  },
  choices: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  choice: { minHeight: 38, justifyContent: "center", borderRadius: 999, paddingHorizontal: 12, backgroundColor: "#EAF1EF" },
  choiceActive: { backgroundColor: palette.teal },
  choiceText: { color: palette.teal, fontSize: 13 },
  choiceTextActive: { color: "#FFFFFF", fontSize: 13 }
});
