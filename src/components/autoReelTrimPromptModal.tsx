import React, { useMemo } from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import Button from "@/src/components/button";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  moderateHeightScale,
  moderateWidthScale,
  widthScale,
} from "@/src/theme/dimensions";
import { formatVideoDuration } from "@/src/utils/videoDuration";

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: moderateWidthScale(24),
    },
    scrim: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: theme.black,
      opacity: 0.55,
    },
    card: {
      backgroundColor: theme.white,
      borderRadius: moderateWidthScale(28),
      width: "100%",
      maxWidth: widthScale(360),
      paddingHorizontal: moderateWidthScale(22),
      paddingTop: moderateHeightScale(28),
      paddingBottom: moderateHeightScale(14),
      alignItems: "center",
      shadowColor: theme.shadow,
      shadowOffset: { width: 0, height: moderateHeightScale(8) },
      shadowOpacity: 0.15,
      shadowRadius: moderateWidthScale(20),
      elevation: 8,
    },
    closeBtn: {
      position: "absolute",
      top: moderateHeightScale(12),
      right: moderateWidthScale(12),
      width: moderateWidthScale(32),
      height: moderateWidthScale(32),
      borderRadius: moderateWidthScale(16),
      backgroundColor: theme.lightGreen07,
      alignItems: "center",
      justifyContent: "center",
    },
    iconHalo: {
      width: moderateWidthScale(84),
      height: moderateWidthScale(84),
      borderRadius: moderateWidthScale(42),
      backgroundColor: theme.lightGreen07,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: moderateHeightScale(16),
    },
    iconCircle: {
      width: moderateWidthScale(60),
      height: moderateWidthScale(60),
      borderRadius: moderateWidthScale(30),
      backgroundColor: theme.buttonBack,
      alignItems: "center",
      justifyContent: "center",
    },
    title: {
      fontSize: fontSize.size22,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      textAlign: "center",
      marginBottom: moderateHeightScale(6),
    },
    subtitle: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      textAlign: "center",
      lineHeight: fontSize.size20,
      marginBottom: moderateHeightScale(18),
    },
    meter: {
      width: "100%",
      backgroundColor: theme.background,
      borderRadius: moderateWidthScale(16),
      borderWidth: 1,
      borderColor: theme.borderLight,
      paddingHorizontal: moderateWidthScale(14),
      paddingVertical: moderateHeightScale(14),
      marginBottom: moderateHeightScale(14),
    },
    meterRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-end",
      marginBottom: moderateHeightScale(10),
    },
    meterColEnd: {
      alignItems: "flex-end",
    },
    meterLabel: {
      fontSize: fontSize.size11,
      fontFamily: fonts.fontMedium,
      color: theme.lightGreen,
      marginBottom: moderateHeightScale(2),
    },
    meterValue: {
      fontSize: fontSize.size18,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      fontVariant: ["tabular-nums"],
    },
    meterValueOver: {
      color: theme.red,
    },
    track: {
      flexDirection: "row",
      height: moderateHeightScale(8),
      borderRadius: moderateWidthScale(999),
      overflow: "hidden",
      backgroundColor: theme.lightGreen1,
      gap: moderateWidthScale(2),
    },
    trackFit: {
      backgroundColor: theme.buttonBack,
    },
    trackOver: {
      backgroundColor: theme.red,
    },
    overRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(6),
      marginTop: moderateHeightScale(10),
    },
    overText: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontMedium,
      color: theme.red,
      flexShrink: 1,
    },
    noteRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: moderateWidthScale(8),
      width: "100%",
      marginBottom: moderateHeightScale(20),
      paddingHorizontal: moderateWidthScale(2),
    },
    noteText: {
      flex: 1,
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      lineHeight: fontSize.size18,
    },
    primaryBtn: {
      width: "100%",
      borderRadius: moderateWidthScale(28),
      height: moderateHeightScale(52),
    },
    secondaryBtn: {
      width: "100%",
      minHeight: moderateHeightScale(48),
      alignItems: "center",
      justifyContent: "center",
      marginTop: moderateHeightScale(4),
    },
    secondaryText: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      textAlign: "center",
    },
  });

type Props = {
  visible: boolean;
  /** Picked video length (seconds). */
  durationSeconds: number;
  /** Longest source an auto reel accepts (seconds). */
  maxSeconds: number;
  onTrim: () => void;
  onChooseAnother: () => void;
  onClose: () => void;
};

/** Too-long raw video: show how far over the limit it is and offer the trimmer. */
export default function AutoReelTrimPromptModal({
  visible,
  durationSeconds,
  maxSeconds,
  onTrim,
  onChooseAnother,
  onClose,
}: Props) {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();

  const overSeconds = Math.max(0, durationSeconds - maxSeconds);

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable
          style={styles.scrim}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel={t("close")}
        />
        <View style={styles.card} accessibilityViewIsModal>
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={onClose}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={t("close")}
          >
            <MaterialIcons
              name="close"
              size={moderateWidthScale(18)}
              color={theme.darkGreen}
            />
          </TouchableOpacity>

          <View style={styles.iconHalo}>
            <View style={styles.iconCircle}>
              <MaterialIcons
                name="content-cut"
                size={moderateWidthScale(28)}
                color={theme.white}
              />
            </View>
          </View>

          <Text style={styles.title} accessibilityRole="header">
            {t("autoReelTrimTitle")}
          </Text>
          <Text style={styles.subtitle}>{t("autoReelTrimSubtitle")}</Text>

          <View style={styles.meter}>
            <View style={styles.meterRow}>
              <View>
                <Text style={styles.meterLabel}>{t("autoReelTrimYourVideo")}</Text>
                <Text style={[styles.meterValue, styles.meterValueOver]}>
                  {formatVideoDuration(durationSeconds)}
                </Text>
              </View>
              <View style={styles.meterColEnd}>
                <Text style={styles.meterLabel}>{t("autoReelTrimMaxLength")}</Text>
                <Text style={styles.meterValue}>
                  {formatVideoDuration(maxSeconds)}
                </Text>
              </View>
            </View>
            {/* Usable part vs. the part that has to go */}
            <View style={styles.track} importantForAccessibility="no-hide-descendants">
              <View style={[styles.trackFit, { flex: maxSeconds }]} />
              <View style={[styles.trackOver, { flex: overSeconds }]} />
            </View>
            <View style={styles.overRow}>
              <MaterialIcons
                name="error-outline"
                size={moderateWidthScale(14)}
                color={theme.red}
              />
              <Text style={styles.overText}>
                {t("autoReelTrimOver", { length: formatVideoDuration(overSeconds) })}
              </Text>
            </View>
          </View>

          <View style={styles.noteRow}>
            <MaterialIcons
              name="photo-library"
              size={moderateWidthScale(16)}
              color={theme.lightGreen}
            />
            <Text style={styles.noteText}>{t("autoReelTrimGalleryNote")}</Text>
          </View>

          <Button
            title={t("autoReelTrimAction")}
            onPress={onTrim}
            containerStyle={styles.primaryBtn}
            leftIcon={
              <MaterialIcons
                name="content-cut"
                size={moderateWidthScale(18)}
                color={theme.buttonText}
              />
            }
          />
          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={onChooseAnother}
            activeOpacity={0.7}
            accessibilityRole="button"
          >
            <Text style={styles.secondaryText}>{t("autoReelChooseAnother")}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
