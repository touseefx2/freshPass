import React, { useEffect, useMemo, useRef } from "react";
import {
  AccessibilityInfo,
  ActivityIndicator,
  Animated,
  I18nManager,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useTranslation } from "react-i18next";
import { Feather } from "@expo/vector-icons";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  iconScale,
  moderateHeightScale,
  moderateWidthScale,
  widthScale,
} from "@/src/theme/dimensions";
import type { UserMode } from "@/src/state/slices/userSlice";

export type ModeSwitchPhase = "confirm" | "switching" | "success";

const MODE_ICON: Record<UserMode, keyof typeof Feather.glyphMap> = {
  business: "briefcase",
  customer: "user",
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: moderateWidthScale(24),
    },
    modalContainer: {
      backgroundColor: theme.white,
      borderRadius: moderateWidthScale(28),
      width: "100%",
      maxWidth: widthScale(340),
      paddingHorizontal: moderateWidthScale(24),
      paddingTop: moderateHeightScale(28),
      paddingBottom: moderateHeightScale(16),
      alignItems: "center",
      shadowColor: theme.shadow,
      shadowOffset: {
        width: 0,
        height: moderateHeightScale(8),
      },
      shadowOpacity: 0.15,
      shadowRadius: moderateWidthScale(20),
      elevation: 8,
    },
    iconWrap: {
      width: moderateWidthScale(112),
      height: moderateWidthScale(112),
      alignItems: "center",
      justifyContent: "center",
      marginBottom: moderateHeightScale(16),
    },
    iconHalo: {
      position: "absolute",
      width: moderateWidthScale(96),
      height: moderateWidthScale(96),
      borderRadius: moderateWidthScale(48),
      backgroundColor: theme.lightGreen05,
    },
    iconCircle: {
      width: moderateWidthScale(68),
      height: moderateWidthScale(68),
      borderRadius: moderateWidthScale(34),
      backgroundColor: theme.buttonBack,
      justifyContent: "center",
      alignItems: "center",
      zIndex: 1,
    },
    swapBadge: {
      position: "absolute",
      right: moderateWidthScale(-4),
      bottom: moderateWidthScale(-4),
      width: moderateWidthScale(28),
      height: moderateWidthScale(28),
      borderRadius: moderateWidthScale(14),
      backgroundColor: theme.orangeBrown,
      borderWidth: 3,
      borderColor: theme.white,
      alignItems: "center",
      justifyContent: "center",
    },
    confettiDot: {
      position: "absolute",
      borderRadius: moderateWidthScale(50),
    },
    confettiTriangle: {
      position: "absolute",
      width: 0,
      height: 0,
      backgroundColor: "transparent",
      borderStyle: "solid",
      borderLeftWidth: moderateWidthScale(5),
      borderRightWidth: moderateWidthScale(5),
      borderBottomWidth: moderateWidthScale(9),
      borderLeftColor: "transparent",
      borderRightColor: "transparent",
    },
    confettiBar: {
      position: "absolute",
      borderRadius: moderateWidthScale(2),
    },
    title: {
      fontSize: fontSize.size22,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      textAlign: "center",
      marginBottom: moderateHeightScale(6),
    },
    subtitle: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontBold,
      color: theme.buttonBack,
      textAlign: "center",
      marginBottom: moderateHeightScale(18),
    },
    modeRow: {
      flexDirection: "row",
      alignItems: "center",
      width: "100%",
      gap: moderateWidthScale(8),
      marginTop: moderateHeightScale(6),
      marginBottom: moderateHeightScale(16),
    },
    modeTile: {
      flex: 1,
      alignItems: "center",
      borderRadius: moderateWidthScale(18),
      borderWidth: 1.5,
      borderColor: theme.borderLight,
      backgroundColor: theme.white,
      paddingTop: moderateHeightScale(18),
      paddingBottom: moderateHeightScale(14),
      paddingHorizontal: moderateWidthScale(6),
    },
    modeTileTarget: {
      borderColor: theme.buttonBack,
      backgroundColor: theme.lightGreen05,
    },
    modeTileIcon: {
      width: moderateWidthScale(40),
      height: moderateWidthScale(40),
      borderRadius: moderateWidthScale(20),
      backgroundColor: theme.lightGreen07,
      alignItems: "center",
      justifyContent: "center",
    },
    modeTileIconTarget: {
      backgroundColor: theme.buttonBack,
    },
    modeTileLabel: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      marginTop: moderateHeightScale(8),
      textAlign: "center",
    },
    currentPill: {
      position: "absolute",
      top: moderateHeightScale(-10),
      alignSelf: "center",
      backgroundColor: theme.darkGreen,
      borderRadius: moderateWidthScale(10),
      paddingHorizontal: moderateWidthScale(8),
      paddingVertical: moderateHeightScale(2),
    },
    currentPillText: {
      fontSize: fontSize.size10,
      fontFamily: fonts.fontBold,
      color: theme.white,
      letterSpacing: 0.3,
    },
    modeArrow: {
      width: moderateWidthScale(28),
      height: moderateWidthScale(28),
      borderRadius: moderateWidthScale(14),
      backgroundColor: theme.lightGreen07,
      alignItems: "center",
      justifyContent: "center",
    },
    message: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      textAlign: "center",
      lineHeight: fontSize.size21,
      marginBottom: moderateHeightScale(20),
      paddingHorizontal: moderateWidthScale(4),
    },
    errorText: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontMedium,
      color: theme.red,
      textAlign: "center",
      marginTop: moderateHeightScale(-8),
      marginBottom: moderateHeightScale(14),
    },
    buttonContainer: {
      width: "100%",
      gap: moderateHeightScale(4),
    },
    primaryButton: {
      backgroundColor: theme.buttonBack,
      borderRadius: moderateWidthScale(28),
      height: moderateHeightScale(52),
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "row",
      gap: moderateWidthScale(8),
      paddingHorizontal: moderateWidthScale(20),
    },
    primaryButtonText: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontBold,
      color: theme.buttonText,
    },
    secondaryButton: {
      height: moderateHeightScale(46),
      alignItems: "center",
      justifyContent: "center",
    },
    secondaryButtonText: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontMedium,
      color: theme.lightGreen,
    },
    disabled: {
      opacity: 0.5,
    },
  });

interface ModeSwitchModalProps {
  visible: boolean;
  phase: ModeSwitchPhase;
  /** Mode the account was in when the modal opened */
  fromMode: UserMode;
  errorMessage: string | null;
  onConfirm: () => void;
  onCancel: () => void;
  onDone: () => void;
}

export default function ModeSwitchModal({
  visible,
  phase,
  fromMode,
  errorMessage,
  onConfirm,
  onCancel,
  onDone,
}: ModeSwitchModalProps) {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);
  const { t } = useTranslation();

  const toMode: UserMode = fromMode === "business" ? "customer" : "business";
  const toCustomer = toMode === "customer";
  const isSwitching = phase === "switching";
  const isSuccess = phase === "success";

  const reduceMotionRef = useRef(false);
  const appear = useRef(new Animated.Value(0)).current;
  const pop = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      reduceMotionRef.current = enabled;
    });
  }, []);

  // Card scales in on open; on close the Modal's fade takes it out as-is
  useEffect(() => {
    if (!visible) return;
    if (reduceMotionRef.current) {
      appear.setValue(1);
      return;
    }
    appear.setValue(0);
    Animated.spring(appear, {
      toValue: 1,
      friction: 8,
      tension: 90,
      useNativeDriver: true,
    }).start();
  }, [visible, appear]);

  // Success icon pops in once the switch lands
  useEffect(() => {
    if (!isSuccess || reduceMotionRef.current) {
      pop.setValue(1);
      return;
    }
    pop.setValue(0.6);
    Animated.spring(pop, {
      toValue: 1,
      friction: 5,
      tension: 120,
      useNativeDriver: true,
    }).start();
  }, [isSuccess, pop]);

  const handleRequestClose = () => {
    if (isSwitching) return;
    if (isSuccess) onDone();
    else onCancel();
  };

  const modeLabel = (mode: UserMode) =>
    mode === "business" ? t("modeBusiness") : t("modeCustomer");

  const renderConfetti = (full: boolean) => (
    <>
      <View
        style={[
          styles.confettiDot,
          {
            width: moderateWidthScale(7),
            height: moderateWidthScale(7),
            backgroundColor: theme.orangeBrown,
            top: moderateHeightScale(16),
            left: moderateWidthScale(16),
          },
        ]}
      />
      <View
        style={[
          styles.confettiDot,
          {
            width: moderateWidthScale(5),
            height: moderateWidthScale(5),
            backgroundColor: theme.link,
            top: moderateHeightScale(24),
            right: moderateWidthScale(18),
          },
        ]}
      />
      <View
        style={[
          styles.confettiBar,
          {
            width: moderateWidthScale(8),
            height: moderateHeightScale(3),
            backgroundColor: theme.green,
            bottom: moderateHeightScale(20),
            left: moderateWidthScale(12),
            transform: [{ rotate: "-40deg" }],
          },
        ]}
      />
      {full && (
        <>
          <View
            style={[
              styles.confettiDot,
              {
                width: moderateWidthScale(6),
                height: moderateWidthScale(6),
                backgroundColor: theme.green,
                bottom: moderateHeightScale(18),
                left: moderateWidthScale(26),
              },
            ]}
          />
          <View
            style={[
              styles.confettiTriangle,
              {
                borderBottomColor: theme.primary,
                top: moderateHeightScale(20),
                right: moderateWidthScale(10),
                transform: [{ rotate: "25deg" }],
              },
            ]}
          />
          <View
            style={[
              styles.confettiTriangle,
              {
                borderBottomColor: theme.link,
                bottom: moderateHeightScale(24),
                right: moderateWidthScale(16),
                transform: [{ rotate: "-30deg" }],
              },
            ]}
          />
          <View
            style={[
              styles.confettiBar,
              {
                width: moderateWidthScale(7),
                height: moderateHeightScale(3),
                backgroundColor: theme.orangeBrown,
                top: moderateHeightScale(40),
                left: moderateWidthScale(6),
                transform: [{ rotate: "50deg" }],
              },
            ]}
          />
        </>
      )}
    </>
  );

  const renderModeTile = (mode: UserMode) => {
    const isTarget = mode === toMode;
    return (
      <View
        style={[styles.modeTile, isTarget && styles.modeTileTarget]}
        accessible
        accessibilityLabel={`${modeLabel(mode)}, ${
          isTarget ? t("modeSwitchTarget") : t("current")
        }`}
      >
        {!isTarget && (
          <View style={styles.currentPill}>
            <Text style={styles.currentPillText}>{t("current")}</Text>
          </View>
        )}
        <View
          style={[styles.modeTileIcon, isTarget && styles.modeTileIconTarget]}
        >
          <Feather
            name={MODE_ICON[mode]}
            size={iconScale(18)}
            color={isTarget ? theme.white : theme.darkGreen}
          />
        </View>
        <Text style={styles.modeTileLabel} numberOfLines={1}>
          {modeLabel(mode)}
        </Text>
      </View>
    );
  };

  const renderConfirm = () => (
    <>
      <View style={styles.iconWrap}>
        <View style={styles.iconHalo} />
        {renderConfetti(false)}
        <View style={styles.iconCircle}>
          <Feather
            name={MODE_ICON[toMode]}
            size={iconScale(28)}
            color={theme.white}
          />
          <View style={styles.swapBadge}>
            <Feather
              name="repeat"
              size={iconScale(12)}
              color={theme.white}
            />
          </View>
        </View>
      </View>

      <Text style={styles.title} accessibilityRole="header">
        {toCustomer ? t("switchToCustomerTitle") : t("switchToBusinessTitle")}
      </Text>
      <Text style={styles.subtitle}>
        {toCustomer
          ? t("switchToCustomerSubtitle")
          : t("switchToBusinessSubtitle")}
      </Text>

      <View style={styles.modeRow}>
        {renderModeTile(fromMode)}
        <View
          style={styles.modeArrow}
          importantForAccessibility="no-hide-descendants"
          accessibilityElementsHidden
        >
          <Feather
            name={I18nManager.isRTL ? "arrow-left" : "arrow-right"}
            size={iconScale(16)}
            color={theme.buttonBack}
          />
        </View>
        {renderModeTile(toMode)}
      </View>

      <Text style={styles.message}>
        {toCustomer
          ? t("switchToCustomerMessage")
          : t("switchToBusinessMessage")}
      </Text>

      {!!errorMessage && (
        <Text style={styles.errorText} accessibilityLiveRegion="polite">
          {errorMessage}
        </Text>
      )}

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.primaryButton, isSwitching && styles.disabled]}
          onPress={onConfirm}
          disabled={isSwitching}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityState={{ disabled: isSwitching, busy: isSwitching }}
        >
          {isSwitching ? (
            <ActivityIndicator size="small" color={theme.buttonText} />
          ) : (
            <Feather
              name="repeat"
              size={iconScale(17)}
              color={theme.buttonText}
            />
          )}
          <Text style={styles.primaryButtonText}>
            {isSwitching
              ? t("switchingMode")
              : toCustomer
                ? t("switchToCustomerCta")
                : t("switchToBusinessCta")}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.secondaryButton, isSwitching && styles.disabled]}
          onPress={onCancel}
          disabled={isSwitching}
          activeOpacity={0.6}
          accessibilityRole="button"
          accessibilityState={{ disabled: isSwitching }}
        >
          <Text style={styles.secondaryButtonText}>{t("notNow")}</Text>
        </TouchableOpacity>
      </View>
    </>
  );

  const renderSuccess = () => (
    <>
      <Animated.View style={[styles.iconWrap, { transform: [{ scale: pop }] }]}>
        <View style={styles.iconHalo} />
        {renderConfetti(true)}
        <View style={styles.iconCircle}>
          <Feather name="check" size={iconScale(32)} color={theme.white} />
        </View>
      </Animated.View>

      <Text style={styles.title} accessibilityRole="header">
        {toCustomer
          ? t("modeSwitchedCustomerTitle")
          : t("modeSwitchedBusinessTitle")}
      </Text>
      <Text style={styles.message}>
        {toCustomer
          ? t("modeSwitchedCustomerMessage")
          : t("modeSwitchedBusinessMessage")}
      </Text>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={onDone}
          activeOpacity={0.7}
          accessibilityRole="button"
        >
          <Feather
            name={toCustomer ? "compass" : "grid"}
            size={iconScale(17)}
            color={theme.buttonText}
          />
          <Text style={styles.primaryButtonText}>
            {toCustomer
              ? t("modeSwitchedCustomerCta")
              : t("modeSwitchedBusinessCta")}
          </Text>
        </TouchableOpacity>
      </View>
    </>
  );

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      statusBarTranslucent
      onRequestClose={handleRequestClose}
    >
      <View style={styles.modalOverlay}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={handleRequestClose}
          accessible={false}
          importantForAccessibility="no"
        />
        <Animated.View
          accessibilityViewIsModal
          style={[
            styles.modalContainer,
            {
              opacity: appear,
              transform: [
                {
                  scale: appear.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.94, 1],
                  }),
                },
              ],
            },
          ]}
        >
          {isSuccess ? renderSuccess() : renderConfirm()}
        </Animated.View>
      </View>
    </Modal>
  );
}
