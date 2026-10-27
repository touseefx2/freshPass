import React, { useMemo } from "react";
import {
  ActivityIndicator,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  moderateHeightScale,
  moderateWidthScale,
} from "@/src/theme/dimensions";
import type { ShareFilesProgress } from "@/src/services/shareMediaFilesService";

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.45)",
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: moderateWidthScale(40),
    },
    card: {
      width: "100%",
      maxWidth: moderateWidthScale(300),
      borderRadius: moderateWidthScale(18),
      backgroundColor: theme.white,
      paddingTop: moderateHeightScale(24),
      paddingHorizontal: moderateWidthScale(24),
      paddingBottom: moderateHeightScale(8),
      alignItems: "center",
    },
    title: {
      marginTop: moderateHeightScale(14),
      fontSize: fontSize.size16,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      textAlign: "center",
    },
    subtitle: {
      marginTop: moderateHeightScale(4),
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      textAlign: "center",
    },
    track: {
      alignSelf: "stretch",
      height: moderateHeightScale(6),
      marginTop: moderateHeightScale(14),
      borderRadius: moderateHeightScale(3),
      backgroundColor: theme.lightGreen1,
      overflow: "hidden",
    },
    fill: {
      height: "100%",
      borderRadius: moderateHeightScale(3),
      backgroundColor: theme.darkGreen,
    },
    cancel: {
      marginTop: moderateHeightScale(8),
      minHeight: moderateHeightScale(44),
      paddingHorizontal: moderateWidthScale(16),
      justifyContent: "center",
    },
    cancelText: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontMedium,
      color: theme.lightGreen,
    },
  });

type Props = {
  visible: boolean;
  /** Any video in the batch → "Preparing video…" with a percentage */
  hasVideo: boolean;
  progress: ShareFilesProgress;
  onCancel: () => void;
};

export default function SharePreparingModal({
  visible,
  hasVideo,
  progress,
  onCancel,
}: Props) {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();

  const percent = Math.round(progress.fraction * 100);
  const title = hasVideo
    ? t("sharePreparingVideo")
    : progress.total > 1
      ? t("sharePreparingPhotos")
      : t("sharePreparingPhoto");
  const subtitle =
    hasVideo || progress.total <= 1
      ? `${percent}%`
      : t("sharePreparingCount", {
          done: progress.done,
          total: progress.total,
        });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onCancel}
    >
      <View style={styles.backdrop}>
        <View
          style={styles.card}
          accessibilityLiveRegion="polite"
          accessibilityLabel={`${title} ${subtitle}`}
        >
          <ActivityIndicator size="large" color={theme.darkGreen} />
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
          <View style={styles.track}>
            <View
              style={[styles.fill, { width: `${Math.max(4, percent)}%` }]}
            />
          </View>
          <TouchableOpacity
            style={styles.cancel}
            onPress={onCancel}
            activeOpacity={0.7}
            accessibilityRole="button"
          >
            <Text style={styles.cancelText}>{t("cancel")}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
