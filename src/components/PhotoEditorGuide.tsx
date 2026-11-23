import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons, MaterialIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AppImage from "@/src/components/AppImage";
import Button from "@/src/components/button";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  moderateHeightScale,
  moderateWidthScale,
  widthScale,
} from "@/src/theme/dimensions";

/**
 * First-time guide shown over the Edit Photo (crop) screen.
 * Plays: zoom in (spread) → zoom out (pinch) → drag, using the user's own
 * photo in a mini crop circle, then reveals "Got it". Loops softly after.
 */

type Step = "zoomIn" | "zoomOut" | "drag";
const STEPS: Step[] = ["zoomIn", "zoomOut", "drag"];

const STAGE = widthScale(210);
const FINGER = moderateWidthScale(34);
const NEAR = widthScale(18);
const FAR = widthScale(62);
const DRAG = widthScale(34);
const ZOOMED = 1.6;

type Props = {
  visible: boolean;
  imageUri?: string;
  onDismiss: () => void;
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    overlay: {
      ...StyleSheet.absoluteFillObject,
      zIndex: 50,
      backgroundColor: "rgba(0,0,0,0.86)",
    },
    content: {
      flex: 1,
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: moderateWidthScale(28),
    },
    topCopy: {
      width: "100%",
      alignItems: "center",
      paddingTop: moderateHeightScale(24),
    },
    title: {
      fontSize: fontSize.size24,
      fontFamily: fonts.fontExtraBold,
      color: theme.white,
      textAlign: "center",
      marginBottom: moderateHeightScale(10),
    },
    subtitle: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontMedium,
      color: theme.white85,
      textAlign: "center",
      lineHeight: moderateHeightScale(22),
      minHeight: moderateHeightScale(44),
      paddingHorizontal: moderateWidthScale(8),
    },
    stageWrap: {
      width: STAGE + FAR * 2,
      height: STAGE + FAR * 2,
      alignItems: "center",
      justifyContent: "center",
    },
    stage: {
      width: STAGE,
      height: STAGE,
      borderRadius: STAGE / 2,
      overflow: "hidden",
      borderWidth: 2,
      borderColor: "rgba(255,255,255,0.85)",
      backgroundColor: "#1a1a1a",
    },
    stageImage: {
      width: "100%",
      height: "100%",
    },
    finger: {
      position: "absolute",
      width: FINGER,
      height: FINGER,
      borderRadius: FINGER / 2,
      backgroundColor: "rgba(255,255,255,0.95)",
      borderWidth: 3,
      borderColor: theme.goldGlowRim,
    },
    fingerGlow: {
      position: "absolute",
      width: FINGER * 1.9,
      height: FINGER * 1.9,
      borderRadius: FINGER,
      backgroundColor: "rgba(245,195,92,0.28)",
    },
    dots: {
      flexDirection: "row",
      gap: moderateWidthScale(8),
      marginBottom: moderateHeightScale(14),
    },
    dot: {
      height: moderateWidthScale(8),
      borderRadius: moderateWidthScale(4),
    },
    chip: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(8),
      paddingHorizontal: moderateWidthScale(16),
      paddingVertical: moderateHeightScale(10),
      borderRadius: moderateWidthScale(22),
      backgroundColor: "rgba(255,255,255,0.1)",
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.2)",
      marginBottom: moderateHeightScale(12),
    },
    chipText: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontBold,
      color: theme.white,
    },
    resetRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(6),
      marginBottom: moderateHeightScale(16),
    },
    resetText: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: "rgba(255,255,255,0.7)",
    },
    bottomBlock: {
      width: "100%",
      alignItems: "center",
      paddingBottom: moderateHeightScale(8),
    },
    gotItWrap: {
      width: "100%",
      maxWidth: widthScale(320),
      height: moderateHeightScale(52),
    },
    gotItBtn: {
      width: "100%",
      borderRadius: moderateWidthScale(9999),
      height: moderateHeightScale(52),
    },
  });

export default function PhotoEditorGuide({ visible, imageUri, onDismiss }: Props) {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  const fade = useRef(new Animated.Value(0)).current;
  const gotItAnim = useRef(new Animated.Value(0)).current;
  const progress = useRef(new Animated.Value(0)).current;
  const press = useRef(new Animated.Value(0)).current;

  const [stepIndex, setStepIndex] = useState(0);
  const [showGotIt, setShowGotIt] = useState(false);
  const step = STEPS[stepIndex];

  // Fade in + reset whenever the guide opens
  useEffect(() => {
    if (!visible) return;
    fade.setValue(0);
    gotItAnim.setValue(0);
    setStepIndex(0);
    setShowGotIt(false);
    Animated.timing(fade, {
      toValue: 1,
      duration: 280,
      useNativeDriver: true,
    }).start();
  }, [visible, fade, gotItAnim]);

  // One gesture cycle per step, then move to the next step
  useEffect(() => {
    if (!visible) return;
    progress.setValue(0);
    press.setValue(0);
    const anim = Animated.sequence([
      Animated.delay(250),
      Animated.timing(press, {
        toValue: 1,
        duration: 160,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(progress, {
        toValue: 1,
        duration: 1000,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(press, {
        toValue: 0,
        duration: 160,
        useNativeDriver: true,
      }),
      Animated.delay(450),
    ]);
    anim.start(({ finished }) => {
      if (!finished) return;
      if (stepIndex === STEPS.length - 1 && !showGotIt) {
        setShowGotIt(true);
        Animated.spring(gotItAnim, {
          toValue: 1,
          friction: 8,
          tension: 56,
          useNativeDriver: true,
        }).start();
      }
      setStepIndex((i) => (i + 1) % STEPS.length);
    });
    return () => anim.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, stepIndex]);

  const handleGotIt = useCallback(() => {
    Animated.timing(fade, {
      toValue: 0,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(() => onDismiss());
  }, [fade, onDismiss]);

  if (!visible) return null;

  // ---- Demo transforms per step ----
  const imageScale =
    step === "zoomIn"
      ? progress.interpolate({ inputRange: [0, 1], outputRange: [1, ZOOMED] })
      : step === "zoomOut"
        ? progress.interpolate({ inputRange: [0, 1], outputRange: [ZOOMED, 1] })
        : 1.4;
  const imageX =
    step === "drag"
      ? progress.interpolate({ inputRange: [0, 1], outputRange: [-DRAG, DRAG] })
      : 0;

  // Finger offset from centre along the diagonal
  const spread =
    step === "zoomIn"
      ? progress.interpolate({ inputRange: [0, 1], outputRange: [NEAR, FAR] })
      : progress.interpolate({ inputRange: [0, 1], outputRange: [FAR, NEAR] });
  const negSpread = Animated.multiply(spread, -1);

  const fingerScale = press.interpolate({
    inputRange: [0, 1],
    outputRange: [1.15, 0.9],
  });
  const fingerOpacity = press.interpolate({
    inputRange: [0, 1],
    outputRange: [0.35, 1],
  });

  const renderFinger = (
    tx: Animated.AnimatedInterpolation<number> | Animated.AnimatedMultiplication<number> | number,
    ty: Animated.AnimatedInterpolation<number> | Animated.AnimatedMultiplication<number> | number,
    key: string,
  ) => (
    <Animated.View
      key={key}
      pointerEvents="none"
      style={{
        position: "absolute",
        alignItems: "center",
        justifyContent: "center",
        opacity: fingerOpacity,
        transform: [
          { translateX: tx as any },
          { translateY: ty as any },
          { scale: fingerScale },
        ],
      }}
    >
      <View style={styles.fingerGlow} />
      <View style={[styles.finger, { position: "relative" }]} />
    </Animated.View>
  );

  const copy: Record<Step, { text: string; short: string; icon: any }> = {
    zoomIn: {
      text: t("photoGuideZoomIn"),
      short: t("photoGuideZoomInShort"),
      icon: "gesture-spread",
    },
    zoomOut: {
      text: t("photoGuideZoomOut"),
      short: t("photoGuideZoomOutShort"),
      icon: "gesture-pinch",
    },
    drag: {
      text: t("photoGuideDrag"),
      short: t("photoGuideDragShort"),
      icon: "gesture-swipe",
    },
  };

  const gotItY = gotItAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [moderateHeightScale(30), 0],
  });

  return (
    <Animated.View style={[styles.overlay, { opacity: fade }]} pointerEvents="auto">
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
          <Text style={styles.title}>{t("photoGuideTitle")}</Text>
          <Text style={styles.subtitle}>{copy[step].text}</Text>
        </View>

        <View style={styles.stageWrap}>
          <View style={styles.stage}>
            {imageUri ? (
              <Animated.View
                style={[
                  styles.stageImage,
                  {
                    transform: [
                      { translateX: imageX as any },
                      { scale: imageScale as any },
                    ],
                  },
                ]}
              >
                <AppImage uri={imageUri} style={styles.stageImage} resizeMode="cover" />
              </Animated.View>
            ) : null}
          </View>

          {step === "drag"
            ? renderFinger(imageX, widthScale(30), "one")
            : [
                renderFinger(negSpread, negSpread, "a"),
                renderFinger(spread, spread, "b"),
              ]}
        </View>

        <View style={styles.bottomBlock}>
          <View style={styles.dots}>
            {STEPS.map((s, i) => (
              <View
                key={s}
                style={[
                  styles.dot,
                  {
                    width: i === stepIndex ? moderateWidthScale(22) : moderateWidthScale(8),
                    backgroundColor:
                      i === stepIndex ? theme.goldGlowRim : "rgba(255,255,255,0.35)",
                  },
                ]}
              />
            ))}
          </View>

          <View style={styles.chip}>
            <MaterialCommunityIcons
              name={copy[step].icon}
              size={moderateWidthScale(20)}
              color={theme.white}
            />
            <Text style={styles.chipText}>{copy[step].short}</Text>
          </View>

          <View style={styles.resetRow}>
            <MaterialIcons
              name="refresh"
              size={moderateWidthScale(16)}
              color="rgba(255,255,255,0.7)"
            />
            <Text style={styles.resetText}>{t("photoGuideReset")}</Text>
          </View>

          <View style={styles.gotItWrap}>
            {showGotIt ? (
              <Animated.View
                style={{ opacity: gotItAnim, transform: [{ translateY: gotItY }] }}
              >
                <Button
                  title={t("reelsGuideGotIt")}
                  onPress={handleGotIt}
                  containerStyle={styles.gotItBtn}
                />
              </Animated.View>
            ) : null}
          </View>
        </View>
      </View>
    </Animated.View>
  );
}
