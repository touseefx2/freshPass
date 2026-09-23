import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  BackHandler,
  Easing,
  Platform,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { BlurView } from "expo-blur";
import { Image } from "expo-image";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Button from "@/src/components/button";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  heightScale,
  moderateHeightScale,
  moderateWidthScale,
  widthScale,
} from "@/src/theme/dimensions";

type Props = {
  visible: boolean;
  onDismiss: () => void;
  /**
   * Android can't blur live Video with BlurView. Pass the active reel
   * thumbnail so we can show a single-layer blurred backdrop (no double image).
   */
  blurImageUri?: string | null;
};

type DemoPhase = "vertical" | "horizontal";

const SWIPE_CYCLE_MS = 1100;
const PHASE_HOLD_MS = 180;

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    overlay: {
      ...StyleSheet.absoluteFillObject,
      zIndex: 40,
    },
    blur: {
      ...StyleSheet.absoluteFillObject,
    },
    androidBlurImage: {
      ...StyleSheet.absoluteFillObject,
    },
    dim: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: `${theme.black}55`,
    },
    androidDim: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: `${theme.black}38`,
    },
    content: {
      ...StyleSheet.absoluteFillObject,
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: moderateWidthScale(28),
    },
    topCopy: {
      width: "100%",
      alignItems: "center",
      paddingTop: moderateHeightScale(28),
    },
    title: {
      fontSize: fontSize.size24,
      fontFamily: fonts.fontExtraBold,
      color: theme.white,
      textAlign: "center",
      marginBottom: moderateHeightScale(10),
      textShadowColor: `${theme.black}AA`,
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 8,
    },
    subtitle: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontMedium,
      color: theme.white85,
      textAlign: "center",
      paddingHorizontal: moderateWidthScale(16),
      lineHeight: moderateHeightScale(22),
    },
    stage: {
      width: "100%",
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      maxHeight: heightScale(420),
    },
    swipeTrack: {
      width: widthScale(160),
      height: heightScale(280),
      alignItems: "center",
      justifyContent: "center",
    },
    ghostHand: {
      position: "absolute",
      alignItems: "center",
      justifyContent: "center",
    },
    handWrap: {
      position: "absolute",
      alignItems: "center",
      justifyContent: "center",
    },
    tipGlow: {
      position: "absolute",
      width: moderateWidthScale(56),
      height: moderateWidthScale(56),
      borderRadius: moderateWidthScale(28),
      backgroundColor: `${theme.white}28`,
      top: moderateHeightScale(6),
    },
    hintChip: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(8),
      paddingHorizontal: moderateWidthScale(16),
      paddingVertical: moderateHeightScale(10),
      borderRadius: moderateWidthScale(22),
      backgroundColor: `${theme.white}1A`,
      borderWidth: 1,
      borderColor: `${theme.white}30`,
      marginBottom: moderateHeightScale(16),
    },
    hintText: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontBold,
      color: theme.white,
    },
    bottomBlock: {
      width: "100%",
      alignItems: "center",
      paddingBottom: moderateHeightScale(8),
      minHeight: heightScale(120),
      justifyContent: "flex-end",
    },
    gotItWrap: {
      width: "100%",
      maxWidth: widthScale(320),
      minHeight: moderateHeightScale(52),
    },
    gotItBtn: {
      width: "100%",
      borderRadius: moderateWidthScale(14),
      height: moderateHeightScale(52),
    },
    gotItPlaceholder: {
      width: "100%",
      maxWidth: widthScale(320),
      height: moderateHeightScale(52),
    },
  });

function SwipeHandDemo({
  phase,
  styles,
  theme,
  playToken,
}: {
  phase: DemoPhase;
  styles: ReturnType<typeof createStyles>;
  theme: Theme;
  /** Bumps to restart a single swipe cycle */
  playToken: number;
}) {
  const progress = useRef(new Animated.Value(0)).current;
  const press = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    progress.setValue(0);
    press.setValue(0);

    const anim = Animated.sequence([
      Animated.timing(press, {
        toValue: 1,
        duration: 140,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(progress, {
        toValue: 1,
        duration: 720,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(press, {
        toValue: 0,
        duration: 120,
        useNativeDriver: true,
      }),
    ]);
    anim.start();
    return () => anim.stop();
  }, [phase, playToken, press, progress]);

  const travelY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [heightScale(70), heightScale(-70)],
  });
  const travelX = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [widthScale(48), widthScale(-48)],
  });

  const handScale = press.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0.88],
  });
  const glowOpacity = press.interpolate({
    inputRange: [0, 1],
    outputRange: [0.15, 0.55],
  });
  const glowScale = press.interpolate({
    inputRange: [0, 1],
    outputRange: [0.7, 1.15],
  });

  const ghost1Progress = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0.18, 1.18],
  });
  const ghost2Progress = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0.36, 1.36],
  });
  const ghost1Y = ghost1Progress.interpolate({
    inputRange: [0, 1],
    outputRange: [heightScale(70), heightScale(-70)],
    extrapolate: "clamp",
  });
  const ghost1X = ghost1Progress.interpolate({
    inputRange: [0, 1],
    outputRange: [widthScale(48), widthScale(-48)],
    extrapolate: "clamp",
  });
  const ghost2Y = ghost2Progress.interpolate({
    inputRange: [0, 1],
    outputRange: [heightScale(70), heightScale(-70)],
    extrapolate: "clamp",
  });
  const ghost2X = ghost2Progress.interpolate({
    inputRange: [0, 1],
    outputRange: [widthScale(48), widthScale(-48)],
    extrapolate: "clamp",
  });
  const ghost1Opacity = progress.interpolate({
    inputRange: [0, 0.15, 0.7, 1],
    outputRange: [0, 0.35, 0.2, 0],
  });
  const ghost2Opacity = progress.interpolate({
    inputRange: [0, 0.25, 0.75, 1],
    outputRange: [0, 0.2, 0.12, 0],
  });

  const handSize = moderateWidthScale(92);
  const transform =
    phase === "vertical"
      ? [{ translateY: travelY }, { scale: handScale }]
      : [{ translateX: travelX }, { scale: handScale }];

  return (
    <View style={styles.stage}>
      <View style={styles.swipeTrack}>
        <Animated.View
          pointerEvents="none"
          style={[
            styles.ghostHand,
            {
              opacity: ghost1Opacity,
              transform:
                phase === "vertical"
                  ? [{ translateY: ghost1Y }, { scale: 0.92 }]
                  : [{ translateX: ghost1X }, { scale: 0.92 }],
            },
          ]}
        >
          <MaterialCommunityIcons
            name="hand-pointing-up"
            size={handSize}
            color={`${theme.white}99`}
          />
        </Animated.View>
        <Animated.View
          pointerEvents="none"
          style={[
            styles.ghostHand,
            {
              opacity: ghost2Opacity,
              transform:
                phase === "vertical"
                  ? [{ translateY: ghost2Y }, { scale: 0.86 }]
                  : [{ translateX: ghost2X }, { scale: 0.86 }],
            },
          ]}
        >
          <MaterialCommunityIcons
            name="hand-pointing-up"
            size={handSize}
            color={`${theme.white}66`}
          />
        </Animated.View>

        <Animated.View style={[styles.handWrap, { transform }]}>
          <Animated.View
            style={[
              styles.tipGlow,
              {
                opacity: glowOpacity,
                transform: [{ scale: glowScale }],
              },
            ]}
          />
          <MaterialCommunityIcons
            name="hand-pointing-up"
            size={handSize}
            color={theme.white}
          />
        </Animated.View>
      </View>
    </View>
  );
}

export default function ReelsSwipeGuide({
  visible,
  onDismiss,
  blurImageUri,
}: Props) {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const fade = useRef(new Animated.Value(0)).current;
  const gotItAnim = useRef(new Animated.Value(0)).current;
  const [phase, setPhase] = useState<DemoPhase>("vertical");
  const [playToken, setPlayToken] = useState(0);
  const [showGotIt, setShowGotIt] = useState(false);
  const phaseRef = useRef<DemoPhase>("vertical");
  phaseRef.current = phase;

  const switchPhase = useCallback((next: DemoPhase) => {
    setPhase(next);
    setPlayToken((n) => n + 1);
  }, []);

  const revealGotIt = useCallback(() => {
    setShowGotIt(true);
    gotItAnim.setValue(0);
    Animated.sequence([
      Animated.delay(80),
      Animated.spring(gotItAnim, {
        toValue: 1,
        friction: 8,
        tension: 56,
        useNativeDriver: true,
      }),
    ]).start();
  }, [gotItAnim]);

  const handleGotItPress = useCallback(() => {
    Animated.parallel([
      Animated.timing(fade, {
        toValue: 0,
        duration: 240,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(gotItAnim, {
        toValue: 0,
        duration: 180,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) onDismiss();
    });
  }, [fade, gotItAnim, onDismiss]);

  // Block hardware / gesture back while guide is visible
  useEffect(() => {
    if (!visible) return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => true);
    return () => sub.remove();
  }, [visible]);

  // Intro sequence: vertical once → horizontal once → Got it
  useEffect(() => {
    if (!visible) return;

    fade.setValue(0);
    gotItAnim.setValue(0);
    setPhase("vertical");
    setPlayToken(0);
    setShowGotIt(false);

    Animated.timing(fade, {
      toValue: 1,
      duration: 280,
      useNativeDriver: true,
    }).start();

    const timers: ReturnType<typeof setTimeout>[] = [];

    timers.push(
      setTimeout(() => {
        switchPhase("horizontal");
      }, SWIPE_CYCLE_MS + PHASE_HOLD_MS),
    );

    timers.push(
      setTimeout(
        () => {
          revealGotIt();
        },
        SWIPE_CYCLE_MS + PHASE_HOLD_MS + SWIPE_CYCLE_MS + PHASE_HOLD_MS,
      ),
    );

    return () => {
      timers.forEach(clearTimeout);
    };
  }, [fade, gotItAnim, revealGotIt, switchPhase, visible]);

  // Soft loop gestures after Got it is visible
  useEffect(() => {
    if (!visible || !showGotIt) return;

    const timer = setInterval(() => {
      const next =
        phaseRef.current === "vertical" ? "horizontal" : "vertical";
      switchPhase(next);
    }, SWIPE_CYCLE_MS + 500);

    return () => clearInterval(timer);
  }, [showGotIt, switchPhase, visible]);

  if (!visible) return null;

  const hint =
    phase === "vertical"
      ? t("reelsGuideSwipeVertical")
      : t("reelsGuideSwipeHorizontal");

  const gotItTranslateY = gotItAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [heightScale(36), 0],
  });
  const gotItScale = gotItAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.92, 1],
  });

  return (
    <Animated.View
      style={[styles.overlay, { opacity: fade }]}
      pointerEvents="auto"
    >
      {Platform.OS === "ios" ? (
        <BlurView intensity={40} tint="dark" style={styles.blur} />
      ) : blurImageUri ? (
        // Single layer only — BlurView + thumbnail together looks "double" on Android
        <Image
          source={{ uri: blurImageUri }}
          style={styles.androidBlurImage}
          contentFit="cover"
          blurRadius={10}
          transition={0}
        />
      ) : (
        <View
          style={[styles.blur, { backgroundColor: `${theme.black}B3` }]}
        />
      )}
      <View style={Platform.OS === "android" ? styles.androidDim : styles.dim} />

      <View
        style={[
          styles.content,
          {
            paddingTop: insets.top + moderateHeightScale(12),
            paddingBottom: insets.bottom + moderateHeightScale(16),
          },
        ]}
      >
        <View style={styles.topCopy}>
          <Text style={styles.title}>{t("reelsGuideTitle")}</Text>
          <Text style={styles.subtitle}>{hint}</Text>
        </View>

        <SwipeHandDemo
          phase={phase}
          styles={styles}
          theme={theme}
          playToken={playToken}
        />

        <View style={styles.bottomBlock}>
          <View style={styles.hintChip}>
            <MaterialCommunityIcons
              name={
                phase === "vertical"
                  ? "gesture-swipe-vertical"
                  : "gesture-swipe-horizontal"
              }
              size={moderateWidthScale(20)}
              color={theme.white}
            />
            <Text style={styles.hintText}>
              {phase === "vertical"
                ? t("reelsGuideSwipeVerticalShort")
                : t("reelsGuideSwipeHorizontalShort")}
            </Text>
          </View>

          {showGotIt ? (
            <Animated.View
              style={[
                styles.gotItWrap,
                {
                  opacity: gotItAnim,
                  transform: [
                    { translateY: gotItTranslateY },
                    { scale: gotItScale },
                  ],
                },
              ]}
            >
              <Button
                title={t("reelsGuideGotIt")}
                onPress={handleGotItPress}
                containerStyle={styles.gotItBtn}
              />
            </Animated.View>
          ) : (
            <View style={styles.gotItPlaceholder} />
          )}
        </View>
      </View>
    </Animated.View>
  );
}
