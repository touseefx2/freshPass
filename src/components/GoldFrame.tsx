import React, { useEffect } from "react";
import {
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";

/**
 * Soft glow drawn as stacked honey rings around the button. Same look on iOS
 * and Android (Android elevation can't glow around a rounded outline).
 */
const HALO = [
  { spread: 2, opacity: 0.6 },
  { spread: 4, opacity: 0.36 },
  { spread: 6, opacity: 0.2 },
  { spread: 8, opacity: 0.09 },
];
const RING_WIDTH = 2;
/** One way of the breath; the pulse goes back and forth */
const HALF_CYCLE_MS = 1100;

type Props = {
  /** Gold border: the feature isn't done yet */
  framed: boolean;
  /** The one button that gently pulses right now */
  pulse?: boolean;
  /** Corner radius of the wrapped button */
  radius: number;
  /** Matches (or covers) the wrapped button's own border */
  borderWidth?: number;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
};

/**
 * Gold frame reminder (client 11-03): the wrapped button's own border turns
 * honey until the feature is completed; only one button pulses at a time.
 */
export default function GoldFrame({
  framed,
  pulse = false,
  radius,
  borderWidth = 2,
  style,
  children,
}: Props) {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const reduceMotion = useReducedMotion();
  const glowing = framed && pulse;
  const progress = useSharedValue(0);

  useEffect(() => {
    if (!glowing || reduceMotion) {
      cancelAnimation(progress);
      // Reduced motion keeps a still glow so the hint isn't lost
      progress.value = glowing ? 0.6 : 0;
      return;
    }
    progress.value = 0;
    progress.value = withRepeat(
      withTiming(1, {
        duration: HALF_CYCLE_MS,
        easing: Easing.inOut(Easing.ease),
      }),
      -1,
      true,
    );
    return () => cancelAnimation(progress);
  }, [glowing, reduceMotion, progress]);

  const haloStyle = useAnimatedStyle(() => ({
    opacity: 0.3 + progress.value * 0.7,
  }));

  return (
    <View style={style}>
      {glowing && (
        <Animated.View
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, haloStyle]}
        >
          {HALO.map((ring) => (
            <View
              key={ring.spread}
              style={[
                styles.ring,
                {
                  top: -ring.spread,
                  left: -ring.spread,
                  right: -ring.spread,
                  bottom: -ring.spread,
                  borderRadius: radius + ring.spread,
                  borderColor: theme.orangeBrown,
                  opacity: ring.opacity,
                },
              ]}
            />
          ))}
        </Animated.View>
      )}
      {children}
      {framed && (
        <View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            {
              borderRadius: radius,
              borderWidth,
              borderColor: theme.orangeBrown,
            },
          ]}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  ring: {
    position: "absolute",
    borderWidth: RING_WIDTH,
  },
});
