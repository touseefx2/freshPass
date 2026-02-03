import React, { useMemo } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
} from "react-native";
import { useTranslation } from "react-i18next";
import { MaterialIcons } from "@expo/vector-icons";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import {
  moderateWidthScale,
  moderateHeightScale,
  heightScale,
} from "@/src/theme/dimensions";
import { fontSize, fonts } from "@/src/theme/fonts";

export type HairPipelineModalState = {
  visible: boolean;
  jobId: string | null;
  estimatedMinutes: number;
  progress: number;
  imageUri: string | null;
  complete: boolean;
};

export const INITIAL_HAIR_PIPELINE_STATE: HairPipelineModalState = {
  visible: false,
  jobId: null,
  estimatedMinutes: 5,
  progress: 0,
  imageUri: null,
  complete: false,
};

// export const INITIAL_HAIR_PIPELINE_STATE: HairPipelineModalState = {
//   complete: false,
//   estimatedMinutes: 5,
//   imageUri:
//     "file:///Users/touseef/Library/Developer/CoreSimulator/Devices/A80F36A4-78FF-4772-8FFC-FDAC4131C5F0/data/Containers/Data/Application/97A97AD2-404B-4A4E-8235-7F5FE4ACC27F/Library/Caches/ImagePicker/CC3F2926-B120-4258-9C20-D4E2D5A91FE6.jpg",
//   jobId: "1a7ddec2-9e7",
//   progress: 58.31966666666667,
//   visible: true,
// };

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.6)",
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: moderateWidthScale(24),
    },
    card: {
      width: "100%",
      maxWidth: moderateWidthScale(340),
      backgroundColor: theme.background,
      borderRadius: moderateWidthScale(16),
      paddingVertical: moderateHeightScale(24),
      paddingHorizontal: moderateWidthScale(20),
      alignItems: "center",
    },
    closeBtn: {
      position: "absolute",
      top: moderateHeightScale(12),
      right: moderateWidthScale(12),
      padding: moderateWidthScale(8),
      zIndex: 1,
    },
    iconWrap: {
      width: moderateWidthScale(64),
      height: moderateWidthScale(64),
      borderRadius: moderateWidthScale(32),
      backgroundColor: theme.lightGreen2,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: moderateHeightScale(16),
    },
    title: {
      fontSize: fontSize.size18,
      fontFamily: fonts.fontBold,
      color: theme.text,
      marginBottom: moderateHeightScale(4),
      textAlign: "center",
    },
    estTime: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen4,
      marginBottom: moderateHeightScale(12),
    },
    notifyText: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: theme.text,
      textAlign: "center",
      marginBottom: moderateHeightScale(16),
    },
    imageWrap: {
      width: "100%",
      aspectRatio: 1,
      maxHeight: heightScale(160),
      borderRadius: moderateWidthScale(12),
      overflow: "hidden",
      backgroundColor: theme.grey15,
      marginBottom: moderateHeightScale(12),
    },
    image: {
      width: "100%",
      height: "100%",
    },
    barBg: {
      width: "100%",
      height: moderateHeightScale(8),
      backgroundColor: theme.grey15,
      borderRadius: moderateWidthScale(4),
      overflow: "hidden",
      marginBottom: moderateHeightScale(16),
    },
    barFill: {
      height: "100%",
      borderRadius: moderateWidthScale(4),
      backgroundColor: theme.primary,
    },
    seeResult: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontBold,
      color: theme.primary,
      marginBottom: moderateHeightScale(16),
    },
    bottomRow: {
      flexDirection: "row",
      gap: moderateWidthScale(12),
      width: "100%",
      marginTop: moderateHeightScale(8),
    },
    btnSecondary: {
      flex: 1,
      paddingVertical: moderateHeightScale(12),
      borderRadius: moderateWidthScale(12),
      borderWidth: 1,
      borderColor: theme.borderLine,
      alignItems: "center",
      justifyContent: "center",
    },
    btnPrimary: {
      flex: 1,
      paddingVertical: moderateHeightScale(12),
      borderRadius: moderateWidthScale(12),
      backgroundColor: theme.primary,
      alignItems: "center",
      justifyContent: "center",
    },
    btnTextSecondary: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontMedium,
      color: theme.text,
    },
    btnTextPrimary: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontMedium,
      color: theme.white,
    },
  });

interface HairPipelineProcessingModalProps {
  state: HairPipelineModalState;
  onClose: () => void;
  onSeeStatus: () => void;
}

export default function HairPipelineProcessingModal({
  state,
  onClose,
  onSeeStatus,
}: HairPipelineProcessingModalProps) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <Modal
      visible={state.visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={onClose}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <MaterialIcons
              name="close"
              size={moderateWidthScale(24)}
              color={theme.text}
            />
          </TouchableOpacity>

          <View style={styles.iconWrap}>
            <MaterialIcons
              name="schedule"
              size={moderateWidthScale(36)}
              color={theme.primary}
            />
          </View>
          <Text style={styles.title}>{t("yourApiIsProcessing")}</Text>
          <Text style={styles.estTime}>
            {t("estimatedTimeMinutes", {
              count: state.estimatedMinutes,
            })}
          </Text>
          <Text style={styles.notifyText}>
            {t("whenDoneYouWillGetNotification")}
          </Text>

          {state.imageUri && (
            <View style={styles.imageWrap}>
              <Image source={{ uri: state.imageUri }} style={styles.image} />
            </View>
          )}

          <View style={styles.barBg}>
            <View
              style={[
                styles.barFill,
                {
                  width: `${state.progress}%`,
                },
              ]}
            />
          </View>

          <View style={styles.bottomRow}>
            <TouchableOpacity
              style={styles.btnSecondary}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <Text style={styles.btnTextSecondary}>Another Request</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.btnPrimary}
              onPress={onSeeStatus}
              activeOpacity={0.7}
            >
              <Text style={styles.btnTextPrimary}>Ai Results</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
