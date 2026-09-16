import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  moderateHeightScale,
  moderateWidthScale,
} from "@/src/theme/dimensions";
import ModalizeBottomSheet from "@/src/components/modalizeBottomSheet";
import Button from "@/src/components/button";
import { useTranslation } from "react-i18next";

export interface OutcomeConfirmSheetProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  question: string;
  message: string;
  confirmLabel: string;
  confirmDestructive?: boolean;
  showNoSavedCardWarning?: boolean;
  confirming?: boolean;
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    question: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
      lineHeight: fontSize.size22,
      marginBottom: moderateHeightScale(14),
    },
    messageBox: {
      backgroundColor: theme.orangeBrown01,
      borderRadius: moderateWidthScale(10),
      borderWidth: 1,
      borderColor: theme.orangeBrown30,
      paddingHorizontal: moderateWidthScale(14),
      paddingVertical: moderateHeightScale(12),
      marginBottom: moderateHeightScale(12),
    },
    messageText: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
      lineHeight: fontSize.size20,
    },
    warningText: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen5,
      lineHeight: fontSize.size18,
      marginBottom: moderateHeightScale(16),
    },
    cancelLinkWrap: {
      marginTop: moderateHeightScale(8),
    },
  });

export default function OutcomeConfirmSheet({
  visible,
  onClose,
  onConfirm,
  title,
  question,
  message,
  confirmLabel,
  confirmDestructive = false,
  showNoSavedCardWarning = false,
  confirming = false,
}: OutcomeConfirmSheetProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);

  return (
    <ModalizeBottomSheet
      visible={visible}
      onClose={onClose}
      title={title}
      footerButtonTitle={confirmLabel}
      onFooterButtonPress={onConfirm}
      footerButtonDisabled={confirming}
    >
      <Text style={styles.question}>{question}</Text>
      {message ? (
        <View style={styles.messageBox}>
          <Text style={styles.messageText}>{message}</Text>
        </View>
      ) : null}
      {showNoSavedCardWarning ? (
        <Text style={styles.warningText}>{t("noSavedCardWarning")}</Text>
      ) : null}
      <View style={styles.cancelLinkWrap}>
        <Button
          title={t("cancel")}
          onPress={onClose}
          disabled={confirming}
          backgroundColor={theme.white}
          textColor={theme.darkGreen}
          containerStyle={{
            borderWidth: 1,
            borderColor: theme.borderMedium,
          }}
        />
      </View>
    </ModalizeBottomSheet>
  );
}
