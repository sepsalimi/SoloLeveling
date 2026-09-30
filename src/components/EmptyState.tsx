// Calm empty-state copy with an optional next action.
import { StyleSheet, View } from "react-native";
import { Text } from "@/components/Text";
import { Button } from "@/components/Button";
import { palette } from "@/theme/colors";

export function EmptyState({
  title,
  body,
  actionLabel,
  onAction
}: {
  title: string;
  body: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.container}>
      <View style={styles.symbol}><Text style={styles.symbolText}>~</Text></View>
      <View style={styles.copy}>
        <Text variant="heading">{title}</Text>
        <Text variant="caption">{body}</Text>
        {actionLabel && onAction ? <Button label={actionLabel} icon="add" compact onPress={onAction} style={styles.action} /> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: "row", alignItems: "center", gap: 16, paddingVertical: 18 },
  symbol: { width: 54, height: 54, borderRadius: 20, alignItems: "center", justifyContent: "center", backgroundColor: palette.gold },
  symbolText: { color: palette.forest, fontSize: 32, lineHeight: 34, fontWeight: "900" },
  copy: { flex: 1, gap: 8 },
  action: { alignSelf: "flex-start", marginTop: 4 }
});
