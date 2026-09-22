import React, { useMemo } from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  heightScale,
  moderateHeightScale,
  moderateWidthScale,
  widthScale,
} from "@/src/theme/dimensions";

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    root: {
      ...StyleSheet.absoluteFillObject,
      zIndex: 45,
      justifyContent: "flex-end",
      alignItems: "center",
    },
    backdrop: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      backgroundColor: theme.lightGreen4,
    },
    /** Floating card sits above the center X — not a full-bleed bottom sheet. */
    sheet: {
      width: widthScale(340),
      maxWidth: "92%",
      backgroundColor: theme.white,
      borderRadius: moderateWidthScale(24),
      paddingHorizontal: moderateWidthScale(18),
      paddingTop: moderateHeightScale(12),
      paddingBottom: moderateHeightScale(16),
      shadowColor: theme.shadow,
      shadowOffset: { width: 0, height: moderateHeightScale(8) },
      shadowOpacity: 0.22,
      shadowRadius: moderateWidthScale(16),
      elevation: 14,
    },
    handle: {
      alignSelf: "center",
      width: widthScale(36),
      height: heightScale(4),
      borderRadius: moderateWidthScale(2),
      backgroundColor: theme.borderNormal,
      marginBottom: moderateHeightScale(14),
    },
    title: {
      fontSize: fontSize.size20,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      textAlign: "center",
      marginBottom: moderateHeightScale(4),
    },
    subtitle: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      textAlign: "center",
      marginBottom: moderateHeightScale(16),
    },
    optionsRow: {
      flexDirection: "row",
      gap: moderateWidthScale(10),
      marginBottom: moderateHeightScale(14),
    },
    optionCard: {
      flex: 1,
      backgroundColor: theme.lightGreen07,
      borderRadius: moderateWidthScale(16),
      paddingHorizontal: moderateWidthScale(10),
      paddingVertical: moderateHeightScale(16),
      alignItems: "center",
      minHeight: heightScale(140),
    },
    optionIconCircle: {
      width: widthScale(44),
      height: widthScale(44),
      borderRadius: moderateWidthScale(22),
      backgroundColor: theme.buttonBack,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: moderateHeightScale(10),
    },
    optionTitle: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      textAlign: "center",
      marginBottom: moderateHeightScale(4),
    },
    optionDesc: {
      fontSize: fontSize.size10,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      textAlign: "center",
      lineHeight: fontSize.size14,
    },
    cancelButton: {
      backgroundColor: theme.lightGreen2,
      borderRadius: moderateWidthScale(999),
      paddingVertical: moderateHeightScale(13),
      alignItems: "center",
      justifyContent: "center",
    },
    cancelText: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
  });

export type CreateReelPickerSheetProps = {
  visible: boolean;
  onClose: () => void;
  onRecordPress: () => void;
  onUploadPress: () => void;
  /** Distance from screen bottom so the card sits above the center X. */
  bottomOffset: number;
  /** Keep tab bar (and X) clear of the dimmed backdrop. */
  tabBarClearance: number;
};

/**
 * Reusable Create Reel source picker (Record / Upload).
 * Floating card above the center tab FAB — tab bar / X stay visible.
 */
export default function CreateReelPickerSheet({
  visible,
  onClose,
  onRecordPress,
  onUploadPress,
  bottomOffset,
  tabBarClearance,
}: CreateReelPickerSheetProps) {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();

  if (!visible) return null;

  return (
    <View style={styles.root} pointerEvents="box-none">
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={[styles.backdrop, { bottom: tabBarClearance }]} />
      </TouchableWithoutFeedback>
      <View style={[styles.sheet, { marginBottom: bottomOffset }]}>
        <View style={styles.handle} />
        <Text style={styles.title}>{t("createReel")}</Text>
        <Text style={styles.subtitle}>{t("chooseHowToAddVideo")}</Text>

        <View style={styles.optionsRow}>
          <TouchableOpacity
            style={styles.optionCard}
            onPress={onRecordPress}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel={t("recordVideoOption")}
          >
            <View style={styles.optionIconCircle}>
              <MaterialIcons
                name="videocam"
                size={moderateWidthScale(24)}
                color={theme.white}
              />
            </View>
            <Text style={styles.optionTitle}>{t("recordVideoOption")}</Text>
            <Text style={styles.optionDesc}>{t("recordVideoDescription")}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.optionCard}
            onPress={onUploadPress}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel={t("uploadVideoOption")}
          >
            <View style={styles.optionIconCircle}>
              <MaterialIcons
                name="file-upload"
                size={moderateWidthScale(24)}
                color={theme.white}
              />
            </View>
            <Text style={styles.optionTitle}>{t("uploadVideoOption")}</Text>
            <Text style={styles.optionDesc}>{t("uploadVideoDescription")}</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.cancelButton}
          onPress={onClose}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel={t("cancel")}
        >
          <Text style={styles.cancelText}>{t("cancel")}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
