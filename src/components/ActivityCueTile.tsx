import { useEffect, useRef } from "react";
import { Animated, View } from "react-native";
import { ActivityCue } from "@/lib/checkIn";
import { Text } from "./Text";
export function ActivityCueTile({ cue, heard, width }: { cue: ActivityCue; heard: boolean; width: number }) {
  const opacity = useRef(new Animated.Value(heard ? 0.48 : 1)).current;
  useEffect(() => {
    Animated.timing(opacity, { toValue: heard ? 0.48 : 1, duration: 240, useNativeDriver: true }).start();
  }, [heard, opacity]);
  return <Animated.View accessibilityLabel={cue.label + (heard ? ", covered" : ", not mentioned yet")} style={{ width, opacity, minHeight: 126, borderRadius: 22, padding: 17, gap: 10, backgroundColor: heard ? "#DDDEE3" : cue.color }}>
    <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
      <Text style={{ fontSize: 28, lineHeight: 34, color: "#242138" }}>{heard ? "✓" : cue.emoji}</Text>
      <Text style={{ fontSize: 11, color: "#363044", fontWeight: "800" }}>{heard ? "HEARD" : "YOUR DAY"}</Text>
    </View>
    <Text style={{ fontSize: 18, fontWeight: "800", color: heard ? "#514E59" : "#242138" }}>{cue.label}</Text>
    <Text style={{ fontSize: 12, color: "#514E59" }}>{heard ? "You’ve covered this" : "Anything to share?"}</Text>
  </Animated.View>;
}
