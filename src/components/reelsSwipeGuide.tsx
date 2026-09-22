import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { BlurView } from "expo-blur";
import { MaterialIcons } from "@expo/vector-icons";
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
    dim: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: `${theme.black}99`,
    },
    content: {
      ...StyleSheet.absoluteFillObject,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: moderateWidthScale(28),
    },
    title: {
      fontSize: fontSize.size22,
      fontFamily: fonts.fontExtraBold,
      color: theme.white,
      textAlign: "center",
      marginBottom: moderateHeightScale(8),
      textShadowColor: `${theme.black}AA`,
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 6,
    },
    subtitle: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontMedium,
      color: theme.white85,
      textAlign: "center",
      marginBottom: moderateHeightScale(28),
      paddingHorizontal: moderateWidthScale(12),
      lineHeight: moderateHeightScale(20),
    },
    stage: {
      width: widthScale(220),
      height: heightScale(220),
      alignItems: "center",
      justifyContent: "center",
      marginBottom: moderateHeightScale(28),
    },
    phoneFrame: {
      width: widthScale(120),
      height: heightScale(200),
      borderRadius: moderateWidthScale(22),
      borderWidth: 2,
      borderColor: `${theme.white}55`,
      backgroundColor: `${theme.white}12`,
      overflow: "hidden",
      alignItems: "center",
      justifyContent: "center",
    },
    phoneScreenLine: {
      position: "absolute",
      left: moderateWidthScale(14),
      right: moderateWidthScale(14),
      height: 1,
      backgroundColor: `${theme.white}22`,
    },
    trail: {
      position: "absolute",
      width: moderateWidthScale(10),
      height: moderateWidthScale(10),
      borderRadius: moderateWidthScale(5),
      backgroundColor: `${theme.white}55`,
    },
    fingerWrap: {
      position: "absolute",
      alignItems: "center",
      justifyContent: "center",
    },
    fingerTip: {
      width: moderateWidthScale(34),
      height: moderateWidthScale(34),
      borderRadius: moderateWidthScale(17),
      backgroundColor: `${theme.white}E6`,
      borderWidth: 2,
      borderColor: theme.white,
      shadowColor: theme.black,
      shadowOpacity: 0.35,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 4 },
      elevation: 6,
    },
    fingerRipple: {
      position: "absolute",
      width: moderateWidthScale(54),
      height: moderateWidthScale(54),
      borderRadius: moderateWidthScale(27),
      borderWidth: 2,
      borderColor: `${theme.white}66`,
    },
    hintChip: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(8),
      paddingHorizontal: moderateWidthScale(14),
      paddingVertical: moderateHeightScale(8),
      borderRadius: moderateWidthScale(20),
      backgroundColor: `${theme.white}18`,
      borderWidth: 1,
      borderColor: `${theme.white}28`,
      marginBottom: moderateHeightScale(28),
    },
    hintText: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontBold,
      color: theme.white,
    },
    gotItBtn: {
      minWidth: widthScale(180),
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: moderateWidthScale(32),
      paddingVertical: moderateHeightScale(14),
      borderRadius: moderateWidthScale(14),
      backgroundColor: theme.buttonBack,
    },
    gotItText: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontBold,
      color: theme.buttonText,
    },
  });

function FingerSwipeDemo({
  phase,
  styles,
}: {
  phase: DemoPhase;
  styles: ReturnType<typeof createStyles>;
}) {
  const progress = useRef(new Animated.Value(0)).current;
  const ripple = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    progress.setValue(0);
    ripple.setValue(0);
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(ripple, {
          toValue: 1,
          duration: 280,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(progress, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(progress, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
        Animated.delay(220),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [phase, progress, ripple]);

  const verticalY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [heightScale(-42), heightScale(42)],
  });
  const horizontalX = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [widthScale(36), widthScale(-36)],
  });
  const trailOpacity = progress.interpolate({
    inputRange: [0, 0.2, 0.8, 1],
    outputRange: [0, 0.55, 0.35, 0],
  });
  const rippleScale = ripple.interpolate({
    inputRange: [0, 1],
    outputRange: [0.6, 1.35],
  });
  const rippleOpacity = ripple.interpolate({
    inputRange: [0, 1],
    outputRange: [0.7, 0],
  });

  return (
    <View style={styles.stage}>
      <View style={styles.phoneFrame}>
        <View style={[styles.phoneScreenLine, { top: "28%" }]} />
        <View style={[styles.phoneScreenLine, { top: "52%" }]} />
        <View style={[styles.phoneScreenLine, { top: "76%" }]} />

        <Animated.View
          style={[
            styles.trail,
            {
              opacity: trailOpacity,
              transform:
                phase === "vertical"
                  ? [{ translateY: verticalY }]
                  : [{ translateX: horizontalX }],
            },
          ]}
        />

        <Animated.View
          style={[
            styles.fingerWrap,
            {
              transform:
                phase === "vertical"
                  ? [{ translateY: verticalY }]
                  : [{ translateX: horizontalX }],
            },
          ]}
        >
          <Animated.View
            style={[
              styles.fingerRipple,
              {
                opacity: rippleOpacity,
                transform: [{ scale: rippleScale }],
              },
            ]}
          />
          <View style={styles.fingerTip} />
        </Animated.View>
      </View>
    </View>
  );
}

export default function ReelsSwipeGuide({ visible, onDismiss }: Props) {
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
    }, 2600);
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
        <BlurView intensity={55} tint="dark" style={styles.blur} />
      ) : (
        <BlurView
          intensity={70}
          tint="dark"
          experimentalBlurMethod="dimezisBlurView"
          style={styles.blur}
        />
      )}
      <View style={styles.dim} />

      <View
        style={[
          styles.content,
          {
            paddingTop: insets.top + moderateHeightScale(24),
            paddingBottom: insets.bottom + moderateHeightScale(24),
          },
        ]}
      >
        <Text style={styles.title}>{t("reelsGuideTitle")}</Text>
        <Text style={styles.subtitle}>{hint}</Text>

        <FingerSwipeDemo phase={phase} styles={styles} />

        <View style={styles.hintChip}>
          <MaterialIcons
            name={
              phase === "vertical" ? "swap-vert" : "swap-horiz"
            }
            size={moderateWidthScale(18)}
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
    </Animated.View>
  );
}
