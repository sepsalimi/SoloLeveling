// Provides the complete, compact editor used for extracted and historical activities.
import { Pressable, StyleSheet, useColorScheme, View } from "react-native";
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
import { categoryColors, palette, surfaces } from "@/theme/colors";
import { Input } from "@/components/Input";

type Props = {
  entry: ActivityEntry;
  preferences?: UserPreferences;
  selected?: boolean;
  onChange: (entry: ActivityEntry) => void;
  onDelete?: () => void;
  onToggleSelected?: () => void;
  index?: number;
};

export function ActivityEditor({ entry, preferences, selected, onChange, onDelete, onToggleSelected, index = 0 }: Props) {
  const update = (patch: Partial<ActivityEntry>) => onChange({ ...entry, ...patch, needsReview: true });
  const accent = categoryColors[entry.primaryCategory] ?? palette.muted;

  return (
    <Card style={[styles.card, { borderLeftColor: accent }, selected && styles.selected]}>
      <View style={styles.header}>
        <View>
          <Text variant="eyebrow" style={{ color: accent }}>Moment {String(index + 1).padStart(2, "0")}</Text>
          <Text variant="heading">{entry.title || "Untitled moment"}</Text>
        </View>
        {onToggleSelected ? (
          <Button
            label={selected ? "Selected" : "Select"}
            icon={selected ? "checkmark-circle" : "ellipse-outline"}
            variant="secondary"
            compact
            onPress={onToggleSelected}
          />
        ) : null}
      </View>

      <Field label="Title">
        <Input value={entry.title} onChangeText={(title) => update({ title })} accessibilityLabel="Activity title" />
      </Field>
      <Field label="Description">
        <Input value={entry.description ?? ""} onChangeText={(description) => update({ description: description || undefined })} accessibilityLabel="Activity description" />
      </Field>
      <View style={styles.row}>
        <Field label="Date" style={styles.fill}>
          <Input value={entry.activityDate} onChangeText={(activityDate) => update({ activityDate })} accessibilityLabel="Activity date" />
        </Field>
        <Field label="Minutes" style={styles.small}>
          <Input value={String(entry.durationMinutes)} onChangeText={(value) => update({ durationMinutes: Number(value) || 0 })} keyboardType="numeric" accessibilityLabel="Duration minutes" />
        </Field>
      </View>
      <View style={styles.row}>
        <Field label="Start" style={styles.fill}>
          <Input value={entry.startTime ?? ""} onChangeText={(startTime) => update({ startTime: startTime || undefined })} placeholder="09:00" accessibilityLabel="Start time" />
        </Field>
        <Field label="End" style={styles.fill}>
          <Input value={entry.endTime ?? ""} onChangeText={(endTime) => update({ endTime: endTime || undefined })} placeholder="11:00" accessibilityLabel="End time" />
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
          <Input
            value={entry.efficiencyPercent == null ? "" : String(entry.efficiencyPercent)}
            onChangeText={(value) => update({ efficiencyPercent: value ? Number(value) : undefined })}
            keyboardType="numeric"
            accessibilityLabel="Efficiency percent"
          />
        </Field>
      ) : null}
      {preferences?.moodEnabled ? (
        <View style={styles.row}>
          <Field label="Mood 1–5" style={styles.fill}>
            <Input value={entry.mood == null ? "" : String(entry.mood)} onChangeText={(value) => update({ mood: value ? Number(value) : undefined })} keyboardType="numeric" accessibilityLabel="Mood" />
          </Field>
          <Field label="Energy 1–5" style={styles.fill}>
            <Input value={entry.energyLevel == null ? "" : String(entry.energyLevel)} onChangeText={(value) => update({ energyLevel: value ? Number(value) : undefined })} keyboardType="numeric" accessibilityLabel="Energy" />
          </Field>
        </View>
      ) : null}

      {onDelete ? <Button label="Remove moment" icon="trash-outline" variant="danger" compact onPress={onDelete} /> : null}
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
  const dark = useColorScheme() === "dark";
  const theme = surfaces(dark);
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
              style={[styles.choice, { backgroundColor: active ? palette.forest : theme.chip }]}
            >
              <Text style={active ? styles.choiceTextActive : [styles.choiceText, { color: theme.softText }]}>
                {value.replaceAll("_", " ")}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderLeftWidth: 6, paddingLeft: 18 },
  selected: { borderColor: palette.coral, borderWidth: 2, borderLeftWidth: 7 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  field: { gap: 6 },
  row: { flexDirection: "row", gap: 10 },
  fill: { flex: 1 },
  small: { width: 100 },
  choices: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  choice: { minHeight: 38, justifyContent: "center", borderRadius: 14, paddingHorizontal: 12 },
  choiceText: { fontSize: 13 },
  choiceTextActive: { color: "#FFFFFF", fontSize: 13 }
});
