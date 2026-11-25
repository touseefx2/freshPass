import React, { useMemo } from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Trans, useTranslation } from "react-i18next";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  moderateHeightScale,
  moderateWidthScale,
  widthScale,
} from "@/src/theme/dimensions";

export interface ReviewPromptModalProps {
  visible: boolean;
  onClose: () => void;
  onWriteReview: () => void;
  businessName: string;
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.4)",
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: moderateWidthScale(24),
    },
    modalBox: {
      backgroundColor: theme.white,
      borderRadius: moderateWidthScale(12),
      paddingHorizontal: moderateWidthScale(24),
      paddingTop: moderateHeightScale(24),
      paddingBottom: moderateHeightScale(20),
      width: "100%",
      maxWidth: widthScale(340),
    },
    modalTitle: {
      fontSize: fontSize.size18,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      marginBottom: moderateHeightScale(16),
    },
    modalTitleAccent: {
      fontSize: fontSize.size18,
      fontFamily: fonts.fontBold,
      color: theme.orangeBrown,
    },
    modalBody: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      lineHeight: moderateHeightScale(22),
      marginBottom: moderateHeightScale(24),
    },
    modalButtonsRow: {
      flexDirection: "row",
      justifyContent: "flex-end",
      alignItems: "center",
      gap: moderateWidthScale(24),
    },
    modalButtonLater: {
      paddingVertical: moderateHeightScale(8),
      paddingHorizontal: moderateWidthScale(4),
    },
    modalButtonReview: {
      paddingVertical: moderateHeightScale(8),
      paddingHorizontal: moderateWidthScale(4),
    },
    buttonLaterText: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen4,
    },
    buttonReviewText: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontMedium,
      color: theme.orangeBrown,
    },
  });

export default function ReviewPromptModal({
  visible,
  onClose,
  onWriteReview,
  businessName,
}: ReviewPromptModalProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors as Theme), [colors]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable style={styles.modalBox} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.modalTitle}>
            <Trans
              i18nKey="reviewPromptTitle"
              values={{ name: businessName }}
              components={{ accent: <Text style={styles.modalTitleAccent} /> }}
            />
          </Text>
          <Text style={styles.modalBody}>
            {t("reviewPromptBody")}
          </Text>
          <View style={styles.modalButtonsRow}>
            <TouchableOpacity
              style={styles.modalButtonLater}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <Text style={styles.buttonLaterText}>{t("reviewPromptMaybeLater")}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.modalButtonReview}
              onPress={onWriteReview}
              activeOpacity={0.7}
            >
              <Text style={styles.buttonReviewText}>{t("reviewPromptWriteReview")}</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
