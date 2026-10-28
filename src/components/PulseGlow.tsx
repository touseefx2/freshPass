import React, { useEffect } from "react";
import { Platform, StyleSheet, View, type ViewStyle } from "react-native";
import Animated, {
  Easing,
  cancelAnimation,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

const HONEY = "rgba(221, 161, 94, 1)";
const HONEY_40 = "rgba(221, 161, 94, 0.40)";
const HONEY_0 = "rgba(221, 161, 94, 0)";
const CYCLE_MS = 2200;

type Props = {
  active?: boolean;
  children: React.ReactNode;
  style?: ViewStyle;
  borderRadius?: number;
};

export default function PulseGlow({
  active = true,
  children,
  style,
  borderRadius = 12,
}: Props) {
  const reduceMotion = useReducedMotion();
  const progress = useSharedValue(0);

  useEffect(() => {
    if (!active) {
      cancelAnimation(progress);
      progress.value = 0;
      return;
    }
    if (reduceMotion) {
      progress.value = 1;
      return;
    }
    progress.value = 0;
    progress.value = withRepeat(
      withTiming(1, { duration: CYCLE_MS, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
    return () => cancelAnimation(progress);
  }, [active, reduceMotion, progress]);

  const glowStyle = useAnimatedStyle(() => {
    if (!active) return { borderColor: "transparent", borderWidth: 0 };

    if (reduceMotion) {
      return {
        borderColor: HONEY,
        borderWidth: 2,
        borderRadius,
      };
    }

    const opacity = interpolate(progress.value, [0, 1], [0.35, 1]);

    return {
      borderColor: `rgba(221, 161, 94, ${opacity})`,
      borderWidth: 2,
      borderRadius,
      ...(Platform.OS === "ios"
        ? {
            shadowColor: HONEY,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: interpolate(progress.value, [0, 1], [0.2, 0.7]),
            shadowRadius: interpolate(progress.value, [0, 1], [4, 14]),
          }
        : {
            elevation: interpolate(progress.value, [0, 1], [1, 6]),
          }),
    };
  });

  if (!active) return <>{children}</>;

  return (
    <Animated.View style={[styles.wrapper, style, glowStyle]}>
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    overflow: "visible",
  },
});
