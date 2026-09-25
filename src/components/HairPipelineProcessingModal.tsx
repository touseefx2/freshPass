import React, { useMemo } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
} from "react-native";
import { useTranslation } from "react-i18next";
import { Feather, Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import {
  moderateWidthScale,
  moderateHeightScale,
  widthScale,
  iconScale,
} from "@/src/theme/dimensions";
import { fontSize, fonts } from "@/src/theme/fonts";
import Button from "@/src/components/button";

export type PipelineJobType =
  | "Hair Tryon"
  | "Generate Post"
  | "Generate Collage"
  | "Generate Reel";

export type HairPipelineModalState = {
  visible: boolean;
  jobId: string | null;
  jobType: PipelineJobType | null;
  estimatedMinutes: number;
  progress: number;
  imageUri: string | null;
  complete: boolean;
};

export const INITIAL_HAIR_PIPELINE_STATE: HairPipelineModalState = {
  visible: false,
  jobId: null,
  jobType: null,
  estimatedMinutes: 5,
  progress: 0,
  imageUri: null,
  complete: false,
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
      borderRadius: moderateWidthScale(24),
      width: "100%",
      maxWidth: widthScale(340),
      paddingHorizontal: moderateWidthScale(24),
      paddingTop: moderateHeightScale(36),
      paddingBottom: moderateHeightScale(24),
      alignItems: "center",
      shadowColor: theme.shadow,
      shadowOffset: {
        width: 0,
        height: moderateHeightScale(8),
      },
      shadowOpacity: 0.12,
      shadowRadius: moderateWidthScale(24),
      elevation: 8,
    },
    iconWrap: {
      width: moderateWidthScale(96),
      height: moderateWidthScale(96),
      alignItems: "center",
      justifyContent: "center",
      marginBottom: moderateHeightScale(24),
    },
    iconHaloOuter: {
      position: "absolute",
      width: moderateWidthScale(96),
      height: moderateWidthScale(96),
      borderRadius: moderateWidthScale(48),
      backgroundColor: theme.lightGreen05,
    },
    iconHaloInner: {
      position: "absolute",
      width: moderateWidthScale(76),
      height: moderateWidthScale(76),
      borderRadius: moderateWidthScale(38),
      backgroundColor: theme.lightGreen1,
    },
    iconCircle: {
      width: moderateWidthScale(56),
      height: moderateWidthScale(56),
      borderRadius: moderateWidthScale(28),
      backgroundColor: theme.buttonBack,
      justifyContent: "center",
      alignItems: "center",
      zIndex: 1,
    },
    title: {
      fontSize: fontSize.size22,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      textAlign: "center",
      marginBottom: moderateHeightScale(10),
      lineHeight: fontSize.size28,
      paddingHorizontal: moderateWidthScale(4),
    },
    message: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      textAlign: "center",
      lineHeight: fontSize.size22,
      marginBottom: moderateHeightScale(20),
      paddingHorizontal: moderateWidthScale(4),
    },
    notifyBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(8),
      backgroundColor: theme.lightGreen05,
      borderRadius: moderateWidthScale(12),
      paddingVertical: moderateHeightScale(12),
      paddingHorizontal: moderateWidthScale(14),
      marginBottom: moderateHeightScale(24),
      width: "100%",
    },
    notifyIconWrap: {
      width: moderateWidthScale(32),
      height: moderateWidthScale(32),
      borderRadius: moderateWidthScale(16),
      backgroundColor: theme.white,
      alignItems: "center",
      justifyContent: "center",
    },
    notifyText: {
      flex: 1,
      fontSize: fontSize.size13,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
      lineHeight: fontSize.size18,
    },
    buttonContainer: {
      width: "100%",
    },
  });

function jobTypeTitleKey(jobType: PipelineJobType | null): string {
  switch (jobType) {
    case "Hair Tryon":
      return "hairTryon";
    case "Generate Post":
      return "generatePost";
    case "Generate Collage":
      return "generateCollage";
    case "Generate Reel":
      return "generateReel";
    default:
      return "aiTools";
  }
}

interface HairPipelineProcessingModalProps {
  state: HairPipelineModalState;
  onClose: () => void;
  /** Kept for call-site compatibility; unused in the simple OK flow. */
  onSeeStatus?: () => void;
}

export default function HairPipelineProcessingModal({
  state,
  onClose,
}: HairPipelineProcessingModalProps) {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();

  const toolName = t(jobTypeTitleKey(state.jobType));

  return (
    <Modal
      transparent
      visible={state.visible}
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <Pressable
          style={styles.modalContainer}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={styles.iconWrap}>
            <View style={styles.iconHaloOuter} />
            <View style={styles.iconHaloInner} />
            <View style={styles.iconCircle}>
              <Feather name="check" size={iconScale(28)} color={theme.white} />
            </View>
          </View>

          <Text style={styles.title}>
            {t("aiRequestSubmittedTitle", { tool: toolName })}
          </Text>

          <Text style={styles.message}>{t("aiRequestSubmittedMessage")}</Text>

          <View style={styles.notifyBadge}>
            <View style={styles.notifyIconWrap}>
              <Ionicons
                name="notifications-outline"
                size={iconScale(16)}
                color={theme.buttonBack}
              />
            </View>
            <Text style={styles.notifyText}>
              {t("aiRequestSubmittedNotifyHint")}
            </Text>
          </View>

          <View style={styles.buttonContainer}>
            <Button title={t("ok")} onPress={onClose} />
          </View>
        </Pressable>
      </View>
    </Modal>
  );
}
