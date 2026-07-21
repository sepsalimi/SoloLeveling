import { PropsWithChildren } from "react";
import { StyleSheet, View, ViewProps, useColorScheme } from "react-native";
import { palette } from "@/theme/colors";

export function Card({ children, style, ...props }: PropsWithChildren<ViewProps>) {
  const dark = useColorScheme() === "dark";
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: dark ? palette.surfaceDark : palette.surface, borderColor: dark ? palette.darkLine : palette.line },
        style
      ]}
      {...props}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 8,
    borderWidth: 1,
    padding: 16,
    gap: 10
  }
});

