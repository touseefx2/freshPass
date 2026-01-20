import React, { useMemo } from "react";
import { Modal, StyleSheet, View, Text } from "react-native";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  moderateWidthScale,
  moderateHeightScale,
  widthScale,
} from "@/src/theme/dimensions";
import Button from "@/src/components/button";

interface OnboardingModalProps {
  visible: boolean;
  onContinue: () => void;
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      justifyContent: "center",
      alignItems: "center",
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
  });

export default function OnboardingModal({
  visible,
  onContinue,
}: OnboardingModalProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors as Theme), [colors]);

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      statusBarTranslucent
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <Text style={styles.title}>Complete Your Onboarding</Text>
          <Text style={styles.message}>
            Please complete your business onboarding to continue using the app.
          </Text>
          <View style={styles.buttonContainer}>
            <Button title="Continue" onPress={onContinue} />
          </View>
        </View>
      </View>
    </Modal>
  );
}
