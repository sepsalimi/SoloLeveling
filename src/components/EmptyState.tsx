import { StyleSheet, View } from "react-native";
import { Text } from "@/components/Text";
import { palette } from "@/theme/colors";

export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <View style={styles.container}>
      <View style={styles.symbol}><Text style={styles.symbolText}>~</Text></View>
      <View style={styles.copy}>
        <Text variant="heading">{title}</Text>
        <Text variant="caption">{body}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: "row", alignItems: "center", gap: 16, paddingVertical: 18 },
  symbol: { width: 54, height: 54, borderRadius: 20, alignItems: "center", justifyContent: "center", backgroundColor: palette.gold },
  symbolText: { color: palette.forest, fontSize: 32, lineHeight: 34, fontWeight: "900" },
  copy: { flex: 1, gap: 4 }
});

