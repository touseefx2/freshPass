import React, { useEffect, useMemo, useRef } from "react";
import {
  AccessibilityInfo,
  ActivityIndicator,
  Animated,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { Feather, Ionicons } from "@expo/vector-icons";
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
import type { ModeSwitchAnchor } from "@/src/state/slices/generalSlice";

export type ModeSwitchPhase = "menu" | "switching" | "success";

const MODE_ICON: Record<UserMode, keyof typeof Ionicons.glyphMap> = {
  business: "cut",
  customer: "people",
};

const MENU_ORDER: UserMode[] = ["business", "customer"];
const MENU_CARET = 14;
const MENU_GUTTER = 16;
const MENU_MAX_WIDTH = 420;
/** Gap between the logo chevron and the menu card */
const MENU_OFFSET = 12;

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
    message: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      textAlign: "center",
      lineHeight: fontSize.size21,
      marginBottom: moderateHeightScale(20),
      paddingHorizontal: moderateWidthScale(4),
    },
    menuOverlay: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.4)",
    },
    menuCard: {
      position: "absolute",
      backgroundColor: theme.white,
      borderRadius: moderateWidthScale(22),
      padding: moderateWidthScale(8),
      gap: moderateHeightScale(4),
      shadowColor: theme.shadow,
      shadowOffset: { width: 0, height: moderateHeightScale(10) },
      shadowOpacity: 0.18,
      shadowRadius: moderateWidthScale(24),
      elevation: 12,
    },
    menuCaret: {
      position: "absolute",
      top: -MENU_CARET / 2 + 1,
      width: MENU_CARET,
      height: MENU_CARET,
      borderTopLeftRadius: 3,
      backgroundColor: theme.white,
      transform: [{ rotate: "45deg" }],
    },
    menuRow: {
      flexDirection: "row",
      alignItems: "center",
      minHeight: moderateHeightScale(72),
      paddingHorizontal: moderateWidthScale(12),
      paddingVertical: moderateHeightScale(10),
      borderRadius: moderateWidthScale(16),
      gap: moderateWidthScale(14),
    },
    menuRowCurrent: {
      backgroundColor: theme.mintTint,
    },
    menuIconTile: {
      width: moderateWidthScale(48),
      height: moderateWidthScale(48),
      borderRadius: moderateWidthScale(14),
      backgroundColor: theme.menuTileNeutral,
      alignItems: "center",
      justifyContent: "center",
    },
    menuIconTileCurrent: {
      backgroundColor: theme.mintTintStrong,
    },
    menuTextWrap: {
      flex: 1,
      gap: moderateHeightScale(2),
    },
    menuTitle: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    menuSubtitle: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
    },
    menuTrailing: {
      width: moderateWidthScale(24),
      alignItems: "center",
      justifyContent: "center",
    },
    menuDimmed: {
      opacity: 0.5,
    },
    errorText: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontMedium,
      color: theme.red,
      textAlign: "center",
      paddingHorizontal: moderateWidthScale(12),
      paddingTop: moderateHeightScale(4),
      paddingBottom: moderateHeightScale(8),
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
  });

interface ModeSwitchModalProps {
  visible: boolean;
  phase: ModeSwitchPhase;
  /** Mode the account was in when the menu opened */
  fromMode: UserMode;
  /** Window rect of the logo chevron; null → menu sits under the header */
  anchor: ModeSwitchAnchor | null;
  errorMessage: string | null;
  onSelect: (mode: UserMode) => void;
  onCancel: () => void;
  onDone: () => void;
}

export default function ModeSwitchModal({
  visible,
  phase,
  fromMode,
  anchor,
  errorMessage,
  onSelect,
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

  const { width: windowWidth } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const reduceMotionRef = useRef(false);
  const appear = useRef(new Animated.Value(0)).current;
  const pop = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      reduceMotionRef.current = enabled;
    });
  }, []);

  // Menu drops in on open, success card scales in after the switch; on close
  // the Modal's fade takes it out as-is
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
  }, [visible, isSuccess, appear]);

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

  // Card spans the screen (capped on tablets); caret points at the chevron
  const menuWidth = Math.min(
    windowWidth - moderateWidthScale(MENU_GUTTER) * 2,
    MENU_MAX_WIDTH,
  );
  const anchorCenterX = anchor
    ? anchor.x + anchor.width / 2
    : windowWidth / 2;
  const menuLeft = Math.min(
    Math.max(anchorCenterX - menuWidth / 2, moderateWidthScale(MENU_GUTTER)),
    windowWidth - moderateWidthScale(MENU_GUTTER) - menuWidth,
  );
  const menuTop = anchor
    ? anchor.y + anchor.height + moderateHeightScale(MENU_OFFSET)
    : insets.top + moderateHeightScale(64);
  const caretInset = moderateWidthScale(22);
  const caretLeft = Math.min(
    Math.max(anchorCenterX - menuLeft - MENU_CARET / 2, caretInset),
    menuWidth - caretInset - MENU_CARET,
  );

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

  const renderMenuRow = (mode: UserMode) => {
    const isCurrent = mode === fromMode;
    const isPending = isSwitching && !isCurrent;
    const title =
      mode === "business" ? t("modeMenuBusinessTitle") : t("modeMenuCustomerTitle");
    const subtitle =
      mode === "business"
        ? t("modeMenuBusinessSubtitle")
        : t("modeMenuCustomerSubtitle");
    return (
      <TouchableOpacity
        key={mode}
        style={[
          styles.menuRow,
          isCurrent && styles.menuRowCurrent,
          isSwitching && isCurrent && styles.menuDimmed,
        ]}
        onPress={() => (isCurrent ? onCancel() : onSelect(mode))}
        disabled={isSwitching}
        activeOpacity={0.6}
        accessibilityRole="menuitem"
        accessibilityLabel={`${title}, ${subtitle}`}
        accessibilityState={{
          selected: isCurrent,
          disabled: isSwitching,
          busy: isPending,
        }}
      >
        <View
          style={[styles.menuIconTile, isCurrent && styles.menuIconTileCurrent]}
        >
          <Ionicons
            name={MODE_ICON[mode]}
            size={iconScale(26)}
            color={theme.darkGreen}
            // Ionicons' scissors lie on their side; the design has blades up
            style={mode === "business" && { transform: [{ rotate: "-90deg" }] }}
          />
        </View>
        <View style={styles.menuTextWrap}>
          <Text style={styles.menuTitle} numberOfLines={1}>
            {title}
          </Text>
          <Text style={styles.menuSubtitle} numberOfLines={2}>
            {subtitle}
          </Text>
        </View>
        <View style={styles.menuTrailing}>
          {isPending ? (
            <ActivityIndicator size="small" color={theme.darkGreen} />
          ) : isCurrent ? (
            <Feather name="check" size={iconScale(22)} color={theme.darkGreen} />
          ) : null}
        </View>
      </TouchableOpacity>
    );
  };

  const renderMenu = () => (
    <View style={styles.menuOverlay}>
      <Pressable
        style={StyleSheet.absoluteFill}
        onPress={handleRequestClose}
        accessible={false}
        importantForAccessibility="no"
      />
      <Animated.View
        accessibilityViewIsModal
        accessibilityRole="menu"
        accessibilityLabel={t("modeMenuA11yLabel")}
        style={[
          styles.menuCard,
          {
            top: menuTop,
            left: menuLeft,
            width: menuWidth,
            opacity: appear,
            transform: [
              {
                translateY: appear.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-8, 0],
                }),
              },
              {
                scale: appear.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.97, 1],
                }),
              },
            ],
          },
        ]}
      >
        <View style={[styles.menuCaret, { left: caretLeft }]} />
        {MENU_ORDER.map(renderMenuRow)}
        {!!errorMessage && (
          <Text style={styles.errorText} accessibilityLiveRegion="polite">
            {errorMessage}
          </Text>
        )}
      </Animated.View>
    </View>
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
      {isSuccess ? (
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
            {renderSuccess()}
          </Animated.View>
        </View>
      ) : (
        renderMenu()
      )}
    </Modal>
  );
}
