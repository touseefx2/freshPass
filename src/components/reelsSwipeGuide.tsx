import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Image,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { BlurView } from "expo-blur";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
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
  /** Android BlurView can't blur Video — use reel thumbnail instead. */
  blurImageUri?: string | null;
};

type DemoPhase = "vertical" | "horizontal";

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
      width: "100%",
      height: "100%",
    },
    dim: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: `${theme.black}55`,
    },
    androidDim: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: `${theme.black}40`,
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
      marginBottom: moderateHeightScale(20),
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
    },
    gotItBtn: {
      width: "100%",
      maxWidth: widthScale(320),
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: moderateWidthScale(32),
      paddingVertical: moderateHeightScale(15),
      borderRadius: moderateWidthScale(14),
      backgroundColor: theme.buttonBack,
    },
    gotItText: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontBold,
      color: theme.buttonText,
    },
  });

function SwipeHandDemo({
  phase,
  styles,
  theme,
}: {
  phase: DemoPhase;
  styles: ReturnType<typeof createStyles>;
  theme: Theme;
}) {
  const progress = useRef(new Animated.Value(0)).current;
  const press = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    progress.setValue(0);
    press.setValue(0);

    const loop = Animated.loop(
      Animated.sequence([
        // Finger lands / presses
        Animated.timing(press, {
          toValue: 1,
          duration: 220,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        // Swipe across
        Animated.timing(progress, {
          toValue: 1,
          duration: 1050,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true,
        }),
        // Lift off
        Animated.timing(press, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.delay(160),
        // Reset position instantly while lifted
        Animated.timing(progress, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
        Animated.delay(280),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [phase, press, progress]);

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

  // Soft motion ghosts trailing behind the hand
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
        {/* Motion ghosts */}
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

        {/* Main hand */}
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
  const [phase, setPhase] = useState<DemoPhase>("vertical");

  useEffect(() => {
    if (!visible) return;
    fade.setValue(0);
    setPhase("vertical");
    Animated.timing(fade, {
      toValue: 1,
      duration: 280,
      useNativeDriver: true,
    }).start();
  }, [fade, visible]);

  useEffect(() => {
    if (!visible) return;
    const timer = setInterval(() => {
      setPhase((prev) => (prev === "vertical" ? "horizontal" : "vertical"));
    }, 2800);
    return () => clearInterval(timer);
  }, [visible]);

  if (!visible) return null;

  const hint =
    phase === "vertical"
      ? t("reelsGuideSwipeVertical")
      : t("reelsGuideSwipeHorizontal");

  return (
    <Animated.View
      style={[styles.overlay, { opacity: fade }]}
      pointerEvents="auto"
    >
      {Platform.OS === "ios" ? (
        <BlurView intensity={40} tint="dark" style={styles.blur} />
      ) : blurImageUri ? (
        <Image
          source={{ uri: blurImageUri }}
          style={styles.androidBlurImage}
          blurRadius={14}
          resizeMode="cover"
        />
      ) : (
        <BlurView
          intensity={80}
          tint="dark"
          experimentalBlurMethod="dimezisBlurView"
          style={styles.blur}
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

        <SwipeHandDemo phase={phase} styles={styles} theme={theme} />

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

          <TouchableOpacity
            style={styles.gotItBtn}
            onPress={onDismiss}
            activeOpacity={0.85}
          >
            <Text style={styles.gotItText}>{t("reelsGuideGotIt")}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );
}
