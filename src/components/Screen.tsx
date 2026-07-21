import { PropsWithChildren } from "react";
import { ScrollView, StyleSheet, useColorScheme, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { palette } from "@/theme/colors";

export function Screen({ children, scroll = true }: PropsWithChildren<{ scroll?: boolean }>) {
  const dark = useColorScheme() === "dark";
  const backgroundColor = dark ? palette.darkPaper : palette.paper;
  const content = <View style={styles.content}>{children}</View>;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor }]}>
      {scroll ? (
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {content}
        </ScrollView>
      ) : (
        content
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { flexGrow: 1 },
  content: { flex: 1, padding: 20, gap: 16 }
});

