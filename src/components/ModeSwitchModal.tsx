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
} from "@/src/theme/dimensions";
import type { UserMode } from "@/src/state/slices/userSlice";
import type { ModeSwitchAnchor } from "@/src/state/slices/generalSlice";

export type ModeSwitchPhase = "menu" | "switching";

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
}

export default function ModeSwitchModal({
  visible,
  phase,
  fromMode,
  anchor,
  errorMessage,
  onSelect,
  onCancel,
}: ModeSwitchModalProps) {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);
  const { t } = useTranslation();

  const isSwitching = phase === "switching";

  const { width: windowWidth } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const reduceMotionRef = useRef(false);
  const appear = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      reduceMotionRef.current = enabled;
    });
  }, []);

  // Menu drops in on open; on close the Modal's fade takes it out as-is
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

  const handleRequestClose = () => {
    if (isSwitching) return;
    onCancel();
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

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      statusBarTranslucent
      onRequestClose={handleRequestClose}
    >
      {renderMenu()}
    </Modal>
  );
}
