import React, { useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  moderateHeightScale,
  moderateWidthScale,
} from "@/src/theme/dimensions";
import ModalizeBottomSheet from "@/src/components/modalizeBottomSheet";

interface RestoreVisitSheetProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (reason: string) => void;
  submitting?: boolean;
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    helpText: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen5,
      lineHeight: fontSize.size20,
      marginBottom: moderateHeightScale(16),
    },
    label: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      marginBottom: moderateHeightScale(8),
    },
    input: {
      minHeight: moderateHeightScale(100),
      borderWidth: 1,
      borderColor: theme.lightGreen2,
      borderRadius: moderateWidthScale(12),
      paddingHorizontal: moderateWidthScale(14),
      paddingVertical: moderateHeightScale(12),
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.darkGreen,
      textAlignVertical: "top",
      backgroundColor: theme.white,
    },
    inputError: {
      borderColor: theme.red,
    },
    errorText: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.red,
      marginTop: moderateHeightScale(6),
    },
  });

export default function RestoreVisitSheet({
  visible,
  onClose,
  onSubmit,
  submitting = false,
}: RestoreVisitSheetProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);
  const [reason, setReason] = useState("");
  const [showError, setShowError] = useState(false);
  const prevVisibleRef = useRef(false);

  useEffect(() => {
    if (visible && !prevVisibleRef.current) {
      setReason("");
      setShowError(false);
    }
    prevVisibleRef.current = visible;
  }, [visible]);

  const trimmed = reason.trim();
  const isValid = trimmed.length >= 3 && trimmed.length <= 500;

  const handleSubmit = () => {
    if (!isValid) {
      setShowError(true);
      return;
    }
    onSubmit(trimmed);
  };

  return (
    <ModalizeBottomSheet
      visible={visible}
      onClose={onClose}
      title={t("restoreVisitTitle")}
      footerButtonTitle={t("restoreVisit")}
      onFooterButtonPress={handleSubmit}
      footerButtonDisabled={submitting}
    >
      <Text style={styles.helpText}>{t("restoreVisitHelp")}</Text>
      <Text style={styles.label}>{t("restoreVisitReasonLabel")}</Text>
      <TextInput
        style={[styles.input, showError && !isValid && styles.inputError]}
        value={reason}
        onChangeText={(value) => {
          setReason(value);
          if (showError) setShowError(false);
        }}
        placeholder={t("restoreVisitReasonPlaceholder")}
        placeholderTextColor={theme.lightGreen2}
        multiline
        maxLength={500}
        editable={!submitting}
      />
      {showError && !isValid ? (
        <Text style={styles.errorText}>{t("restoreVisitReasonRequired")}</Text>
      ) : null}
    </ModalizeBottomSheet>
  );
}
