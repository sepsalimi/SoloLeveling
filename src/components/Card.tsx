import { PropsWithChildren } from "react";
import { StyleSheet, View, ViewProps, useColorScheme } from "react-native";
import { palette } from "@/theme/colors";

type CardVariant = "paper" | "ink" | "tint" | "outline";

export function Card({
  children,
  style,
  variant = "paper",
  ...props
}: PropsWithChildren<ViewProps & { variant?: CardVariant }>) {
  const dark = useColorScheme() === "dark";
  const variantStyle = {
    paper: { backgroundColor: dark ? palette.surfaceDark : palette.surface, borderColor: "transparent" },
    ink: { backgroundColor: dark ? "#173A35" : palette.forest, borderColor: "transparent" },
    tint: { backgroundColor: dark ? "#17332F" : "#DDEBE4", borderColor: "transparent" },
    outline: { backgroundColor: "transparent", borderColor: dark ? palette.darkLine : palette.line }
  }[variant];
  return (
    <View
      style={[
        styles.card,
        variantStyle,
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
    borderRadius: 26,
    borderWidth: 1,
    padding: 20,
    gap: 12,
    shadowColor: "#0B2420",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.07,
    shadowRadius: 18,
    elevation: 2
  }
});

