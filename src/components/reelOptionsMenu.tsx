import React, { useEffect, useMemo, useRef } from "react";
import {
  Animated,
  Modal,
  Platform,
  Pressable,
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
  moderateHeightScale,
  moderateWidthScale,
  widthScale,
} from "@/src/theme/dimensions";

type ReelOptionsMenuProps = {
  visible: boolean;
  onClose: () => void;
  onReport: () => void;
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    root: {
      flex: 1,
    },
    backdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: `${theme.black}33`,
    },
    menuAnchor: {
      position: "absolute",
      right: moderateWidthScale(12),
      alignItems: "flex-end",
      zIndex: 2,
    },
    menu: {
      minWidth: widthScale(172),
      borderRadius: moderateWidthScale(14),
      borderWidth: 1,
      borderColor: theme.white15,
      overflow: "hidden",
      shadowColor: theme.shadow,
      shadowOffset: { width: 0, height: moderateHeightScale(4) },
      shadowOpacity: 0.4,
      shadowRadius: moderateWidthScale(12),
      elevation: 10,
    },
    menuBlur: {
      ...StyleSheet.absoluteFillObject,
    },
    menuTint: {
      ...StyleSheet.absoluteFillObject,
      // Same glass chrome as bottom pills / View profile — not olive CTAs.
      backgroundColor: `${theme.black}D9`,
    },
    optionRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(10),
      paddingVertical: moderateHeightScale(13),
      paddingHorizontal: moderateWidthScale(14),
    },
    optionText: {
      flex: 1,
      fontSize: fontSize.size14,
      fontFamily: fonts.fontMedium,
      color: theme.white,
    },
    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: theme.white15,
      marginHorizontal: moderateWidthScale(12),
    },
    cancelText: {
      color: theme.white70,
    },
  });

export default function ReelOptionsMenu({
  visible,
  onClose,
  onReport,
}: ReelOptionsMenuProps) {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.96)).current;

  useEffect(() => {
    if (visible) {
      opacity.setValue(0);
      scale.setValue(0.96);
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 140,
          useNativeDriver: true,
        }),
        Animated.spring(scale, {
          toValue: 1,
          friction: 8,
          tension: 150,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, opacity, scale]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.root}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <Animated.View
          style={[
            styles.menuAnchor,
            {
              top: insets.top + moderateHeightScale(48),
              opacity,
              transform: [{ scale }],
            },
          ]}
        >
          <View style={styles.menu}>
            {Platform.OS === "ios" ? (
              <BlurView intensity={40} tint="dark" style={styles.menuBlur} />
            ) : null}
            <View style={styles.menuTint} />
            <TouchableOpacity
              style={styles.optionRow}
              onPress={onReport}
              activeOpacity={0.75}
              accessibilityRole="button"
              accessibilityLabel={t("report")}
            >
              <MaterialIcons
                name="outlined-flag"
                size={moderateWidthScale(18)}
                color={theme.white}
              />
              <Text style={styles.optionText}>{t("report")}</Text>
            </TouchableOpacity>
            <View style={styles.divider} />
            <TouchableOpacity
              style={styles.optionRow}
              onPress={onClose}
              activeOpacity={0.75}
              accessibilityRole="button"
              accessibilityLabel={t("cancel")}
            >
              <MaterialIcons
                name="close"
                size={moderateWidthScale(18)}
                color={theme.white70}
              />
              <Text style={[styles.optionText, styles.cancelText]}>
                {t("cancel")}
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}
