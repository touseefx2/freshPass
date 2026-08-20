import React, { useMemo } from "react";
import { Modal, View, Text, StyleSheet, Pressable } from "react-native";
import { useTheme } from "@/src/hooks/hooks";
import { useTranslation } from "react-i18next";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  moderateWidthScale,
  moderateHeightScale,
  widthScale,
  iconScale,
} from "@/src/theme/dimensions";
import { Feather } from "@expo/vector-icons";
import Button from "@/src/components/button";

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
      backgroundColor: theme.background,
      borderRadius: moderateWidthScale(16),
      width: "100%",
      maxWidth: widthScale(340),
      paddingHorizontal: moderateWidthScale(24),
      paddingTop: moderateHeightScale(28),
      paddingBottom: moderateHeightScale(24),
      alignItems: "center",
      borderWidth: 1,
      borderColor: theme.borderLight,
      shadowColor: theme.shadow,
      shadowOffset: {
        width: 0,
        height: moderateHeightScale(4),
      },
      shadowOpacity: 0.12,
      shadowRadius: moderateWidthScale(12),
      elevation: 6,
    },
    iconOuter: {
      width: moderateWidthScale(64),
      height: moderateWidthScale(64),
      borderRadius: moderateWidthScale(32),
      backgroundColor: theme.lightGreen05,
      borderWidth: 1,
      borderColor: theme.borderLight,
      justifyContent: "center",
      alignItems: "center",
      marginBottom: moderateHeightScale(20),
    },
    iconInner: {
      width: moderateWidthScale(44),
      height: moderateWidthScale(44),
      borderRadius: moderateWidthScale(22),
      backgroundColor: theme.buttonBack,
      justifyContent: "center",
      alignItems: "center",
    },
    title: {
      fontSize: fontSize.size22,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      textAlign: "center",
      marginBottom: moderateHeightScale(10),
    },
    message: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      textAlign: "center",
      lineHeight: fontSize.size22,
      marginBottom: moderateHeightScale(28),
      paddingHorizontal: moderateWidthScale(4),
    },
    buttonContainer: {
      width: "100%",
      gap: moderateHeightScale(10),
    },
    skipButton: {
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: moderateHeightScale(12),
    },
    skipButtonText: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontMedium,
      color: theme.lightGreen,
    },
  });

interface StripeConnectedCongratsModalProps {
  visible: boolean;
  onSkip: () => void;
  onCreate: () => void;
}

export default function StripeConnectedCongratsModal({
  visible,
  onSkip,
  onCreate,
}: StripeConnectedCongratsModalProps) {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);
  const { t } = useTranslation();

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onSkip}
    >
      <View style={styles.modalOverlay}>
        <Pressable
          style={styles.modalContainer}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={styles.iconOuter}>
            <View style={styles.iconInner}>
              <Feather
                name="check"
                size={iconScale(24)}
                color={theme.white}
              />
            </View>
          </View>

          <Text style={styles.title}>{t("stripeConnectedCongratsTitle")}</Text>

          <Text style={styles.message}>
            {t("stripeConnectedCongratsMessage")}
          </Text>

          <View style={styles.buttonContainer}>
            <Button title={t("create")} onPress={onCreate} />
            <Pressable
              style={styles.skipButton}
              onPress={onSkip}
              accessibilityRole="button"
            >
              <Text style={styles.skipButtonText}>{t("skip")}</Text>
            </Pressable>
          </View>
        </Pressable>
      </View>
    </Modal>
  );
}
