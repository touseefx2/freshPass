import React, { useMemo } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  TouchableOpacity,
} from "react-native";
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
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: moderateWidthScale(24),
    },
    overlayFill: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: theme.black,
      opacity: 0.5,
    },
    modalContainer: {
      backgroundColor: theme.white,
      borderRadius: moderateWidthScale(28),
      width: "100%",
      maxWidth: widthScale(340),
      paddingHorizontal: moderateWidthScale(24),
      paddingTop: moderateHeightScale(28),
      paddingBottom: moderateHeightScale(20),
      alignItems: "center",
      shadowColor: theme.shadow,
      shadowOffset: {
        width: 0,
        height: moderateHeightScale(8),
      },
      shadowOpacity: 0.15,
      shadowRadius: moderateWidthScale(20),
      elevation: 8,
    },
    iconCircle: {
      width: moderateWidthScale(72),
      height: moderateWidthScale(72),
      borderRadius: moderateWidthScale(36),
      backgroundColor: theme.darkGreen,
      justifyContent: "center",
      alignItems: "center",
      marginBottom: moderateHeightScale(20),
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
      marginBottom: moderateHeightScale(24),
      paddingHorizontal: moderateWidthScale(4),
    },
    buttonContainer: {
      width: "100%",
      gap: moderateHeightScale(4),
    },
    primaryButton: {
      borderRadius: moderateWidthScale(28),
      height: moderateHeightScale(52),
    },
    secondaryButton: {
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: moderateHeightScale(14),
      minHeight: moderateHeightScale(44),
    },
    secondaryButtonText: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontMedium,
      color: theme.lightGreen,
      textAlign: "center",
    },
  });

interface EnableOwnerAsStaffModalProps {
  visible: boolean;
  loading?: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

/** Owner taps View Public Profile before they take bookings themselves. */
export default function EnableOwnerAsStaffModal({
  visible,
  loading = false,
  onClose,
  onConfirm,
}: EnableOwnerAsStaffModalProps) {
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
      onRequestClose={loading ? undefined : onClose}
    >
      <View style={styles.modalOverlay}>
        <Pressable
          style={styles.overlayFill}
          onPress={loading ? undefined : onClose}
        />
        <Pressable
          style={styles.modalContainer}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={styles.iconCircle}>
            <Feather name="eye-off" size={iconScale(30)} color={theme.white} />
          </View>

          <Text style={styles.title}>{t("publicProfileNotLiveTitle")}</Text>
          <Text style={styles.message}>{t("publicProfileNotLiveMessage")}</Text>

          <View style={styles.buttonContainer}>
            <Button
              title={t("turnOnAcceptAppointments")}
              onPress={onConfirm}
              loading={loading}
              disabled={loading}
              backgroundColor={theme.darkGreen}
              containerStyle={styles.primaryButton}
            />
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={onClose}
              activeOpacity={0.7}
              disabled={loading}
              accessibilityRole="button"
            >
              <Text style={styles.secondaryButtonText}>{t("notNow")}</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </View>
    </Modal>
  );
}
