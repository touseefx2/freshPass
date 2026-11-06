import React, { useEffect } from "react";
import {
  Platform,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import Animated, {
  Easing,
  cancelAnimation,
  makeMutable,
  useAnimatedStyle,
  useReducedMotion,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";

/**
 * Glow layers (client sample 11-06): a tight warm shine hugging the ring and
 * a golden bloom that sits a little lower, like light falling down.
 * md around buttons, sm where the parent leaves little room.
 */
const GLOW = {
  md: { shine: "0 0 2px 3px", bloom: "0 3px 16px 4px" },
  sm: { shine: "0 0 2px 2.5px", bloom: "0 2px 9px 2px" },
} as const;
/** Gold rim drawn just outside the amber core */
const RIM = 1;

/** boxShadow needs Android 9+; older phones get stacked rings instead */
const HAS_BOX_SHADOW =
  Platform.OS !== "android" || (Platform.Version as number) >= 28;
const RINGS = [
  { spread: 2, opacity: 0.6 },
  { spread: 4, opacity: 0.36 },
  { spread: 6, opacity: 0.2 },
  { spread: 8, opacity: 0.09 },
];

/** One way of the breath; the glow goes back and forth */
const HALF_CYCLE_MS = 1100;
/** Dimmest point of the breath: the next step breathes deepest */
const BREATH_MIN = { next: 0.12, other: 0.35 };

/**
 * One clock for every frame on screen, so all glows breathe together and
 * read as one shine instead of blinking at random. Runs only while some
 * frame is breathing.
 */
const breath = makeMutable(1);
let breathingFrames = 0;
const startBreath = () => {
  breathingFrames += 1;
  if (breathingFrames > 1) return;
  breath.value = withRepeat(
    withTiming(0, {
      duration: HALF_CYCLE_MS,
      easing: Easing.inOut(Easing.ease),
    }),
    -1,
    true,
  );
};
const stopBreath = () => {
  breathingFrames -= 1;
  if (breathingFrames > 0) return;
  cancelAnimation(breath);
  breath.value = 1;
};

type Props = {
  /** Glowing frame: the feature isn't done yet */
  framed: boolean;
  /** The next step: breathes deeper than the other frames */
  pulse?: boolean;
  /** Corner radius of the wrapped button */
  radius: number;
  /** Matches (or covers) the wrapped button's own border */
  borderWidth?: number;
  /** Bloom size */
  glow?: keyof typeof GLOW;
  /**
   * amber: white buttons get the full neon ring (gold rim, amber core,
   * peach inner line). gold: a solid gold ring, for the green + button.
   */
  tone?: "amber" | "gold";
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
};

/**
 * Gold frame reminder (client 11-03, look per client sample 11-06): every
 * unfinished feature's button glows until the feature is done.
 */
export default function GoldFrame({
  framed,
  pulse = false,
  radius,
  borderWidth = 2,
  glow = "md",
  tone = "amber",
  style,
  children,
}: Props) {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const reduceMotion = useReducedMotion();
  const breathing = framed && !reduceMotion;
  const breathMin = pulse ? BREATH_MIN.next : BREATH_MIN.other;

  useEffect(() => {
    if (!breathing) return;
    startBreath();
    return stopBreath;
  }, [breathing]);

  const glowStyle = useAnimatedStyle(
    () => ({
      opacity: breathing ? breathMin + breath.value * (1 - breathMin) : 1,
    }),
    [breathing, breathMin],
  );

  const amber = tone === "amber";

  return (
    <View style={style}>
      {framed && (
        // Drawn outside the button's box only, so it never tints the button
        <Animated.View
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, glowStyle]}
        >
          {HAS_BOX_SHADOW ? (
            <View
              style={[
                StyleSheet.absoluteFill,
                {
                  borderRadius: radius,
                  boxShadow: `${GLOW[glow].shine} ${theme.goldGlowShine}, ${GLOW[glow].bloom} ${theme.goldGlow}`,
                },
              ]}
            />
          ) : (
            RINGS.map((ring) => (
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
                    borderColor: theme.goldGlowRim,
                    opacity: ring.opacity,
                  },
                ]}
              />
            ))
          )}
        </Animated.View>
      )}
      {children}
      {framed && (
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          {amber && (
            <View
              style={[
                styles.rim,
                {
                  borderRadius: radius + RIM,
                  borderColor: theme.goldGlowRim,
                },
              ]}
            />
          )}
          <View
            style={[
              StyleSheet.absoluteFill,
              {
                borderRadius: radius,
                borderWidth,
                borderColor: amber ? theme.goldGlowBorder : theme.goldGlowRim,
              },
            ]}
          />
          {amber && (
            <View
              style={[
                styles.inner,
                {
                  top: borderWidth,
                  left: borderWidth,
                  right: borderWidth,
                  bottom: borderWidth,
                  borderRadius: Math.max(0, radius - borderWidth),
                  borderColor: theme.goldGlowInner,
                },
              ]}
            />
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  ring: {
    position: "absolute",
    borderWidth: 2,
  },
  rim: {
    position: "absolute",
    top: -RIM,
    left: -RIM,
    right: -RIM,
    bottom: -RIM,
    borderWidth: RIM,
  },
  inner: {
    position: "absolute",
    borderWidth: 1,
  },
});
