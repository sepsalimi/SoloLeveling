// Renders the Life Analytics mark without depending on a separate image asset.
import { StyleSheet, useColorScheme, View } from "react-native";
import { Text } from "@/components/Text";
import { palette } from "@/theme/colors";
import { fonts } from "@/theme/typography";

export function BrandMark({ compact = false }: { compact?: boolean }) {
  const dark = useColorScheme() === "dark";
  return (
    <View style={styles.row}>
      <View style={[styles.mark, compact && styles.markCompact]}>
        <View style={[styles.thread, styles.threadOne]} />
        <View style={[styles.thread, styles.threadTwo]} />
        <View style={[styles.thread, styles.threadThree]} />
      </View>
      {!compact ? (
        <View>
          <Text style={[styles.name, dark && styles.nameDark]}>Life Analytics</Text>
          <Text variant="eyebrow" style={styles.tagline}>Time, in your words</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  mark: {
    width: 52,
    height: 52,
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: palette.forest
  },
  markCompact: { width: 40, height: 40, borderRadius: 14 },
  thread: {
    position: "absolute",
    width: 10,
    height: 72,
    borderRadius: 999,
    top: -10,
    transform: [{ rotate: "36deg" }]
  },
  threadOne: { left: 8, backgroundColor: palette.coral },
  threadTwo: { left: 22, backgroundColor: palette.gold },
  threadThree: { left: 36, backgroundColor: palette.mint },
  name: { color: palette.forest, fontFamily: fonts.display, fontSize: 24, lineHeight: 28, fontWeight: "800", letterSpacing: -0.8 },
  nameDark: { color: palette.darkInk },
  tagline: { color: palette.muted, marginTop: 2, fontSize: 9 }
});
