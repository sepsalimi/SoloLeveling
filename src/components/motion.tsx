// Small reusable entrance motions for presence without visual noise.
import { PropsWithChildren } from "react";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";

export function FadeUp({ children, delay = 0 }: PropsWithChildren<{ delay?: number }>) {
  return (
    <Animated.View entering={FadeInUp.duration(420).delay(delay).springify().damping(18)}>
      {children}
    </Animated.View>
  );
}

export function FadeDown({ children, delay = 0 }: PropsWithChildren<{ delay?: number }>) {
  return (
    <Animated.View entering={FadeInDown.duration(380).delay(delay)}>
      {children}
    </Animated.View>
  );
}
