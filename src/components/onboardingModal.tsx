import React, { useMemo } from "react";
import { Modal, StyleSheet, View, Text } from "react-native";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  moderateWidthScale,
  moderateHeightScale,
  widthScale,
} from "@/src/theme/dimensions";
import Button from "@/src/components/button";
import { ApiService } from "@/src/services/api";

interface OnboardingModalProps {
  visible: boolean;
  onContinue: () => void;
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    modalOverlay: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
    },
    modalBackdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: theme.black,
      opacity: 0.5,
    },
    modalContainer: {
      backgroundColor: theme.background,
      borderRadius: moderateWidthScale(16),
      padding: moderateWidthScale(24),
      width: widthScale(320),
      alignItems: "center",
    },
    title: {
      fontSize: fontSize.size20,
      fontFamily: fonts.fontBold,
      color: theme.text,
      textAlign: "center",
      marginBottom: moderateHeightScale(12),
    },
    message: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontRegular,
      color: theme.text,
      textAlign: "center",
      marginBottom: moderateHeightScale(24),
    },
    buttonContainer: {
      width: "100%",
    },
    buttonSpacer: {
      height: moderateHeightScale(12),
    },
  });

export default function OnboardingModal({
  visible,
  onContinue,
}: OnboardingModalProps) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => createStyles(colors as Theme), [colors]);

  const handleLogout = async () => {
    await ApiService.logout();
  };

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      statusBarTranslucent
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalBackdrop} />
        <View style={styles.modalContainer}>
          <Text style={styles.title}>{t("completeYourOnboarding")}</Text>
          <Text style={styles.message}>{t("completeOnboardingMessage")}</Text>
          <View style={styles.buttonContainer}>
            <Button title={t("continue")} onPress={onContinue} />
            <View style={styles.buttonSpacer} />
            <Button
              title={t("logout")}
              onPress={handleLogout}
              backgroundColor={(colors as Theme).lightBeige}
              textColor={(colors as Theme).darkGreen}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}
