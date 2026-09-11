import React, { useMemo } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  TouchableOpacity,
  ActivityIndicator,
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
      paddingTop: moderateHeightScale(32),
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
    iconWrap: {
      width: moderateWidthScale(120),
      height: moderateWidthScale(120),
      alignItems: "center",
      justifyContent: "center",
      marginBottom: moderateHeightScale(20),
    },
    iconHalo: {
      position: "absolute",
      width: moderateWidthScale(100),
      height: moderateWidthScale(100),
      borderRadius: moderateWidthScale(50),
      backgroundColor: theme.lightRed,
    },
    iconCircle: {
      width: moderateWidthScale(72),
      height: moderateWidthScale(72),
      borderRadius: moderateWidthScale(36),
      backgroundColor: theme.red,
      justifyContent: "center",
      alignItems: "center",
      zIndex: 1,
    },
    accentDot: {
      position: "absolute",
      borderRadius: moderateWidthScale(50),
    },
    accentBar: {
      position: "absolute",
      borderRadius: moderateWidthScale(2),
    },
    title: {
      fontSize: fontSize.size24,
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
      color: theme.red,
      textAlign: "center",
    },
  });

interface RemoveOwnerAsStaffModalProps {
  visible: boolean;
  loading?: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export default function RemoveOwnerAsStaffModal({
  visible,
  loading = false,
  onClose,
  onConfirm,
}: RemoveOwnerAsStaffModalProps) {
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
          <View style={styles.iconWrap}>
            <View style={styles.iconHalo} />

            <View
              style={[
                styles.accentDot,
                {
                  width: moderateWidthScale(7),
                  height: moderateWidthScale(7),
                  backgroundColor: theme.lightRed30,
                  top: moderateHeightScale(18),
                  left: moderateWidthScale(18),
                },
              ]}
            />
            <View
              style={[
                styles.accentDot,
                {
                  width: moderateWidthScale(5),
                  height: moderateWidthScale(5),
                  backgroundColor: theme.link,
                  top: moderateHeightScale(28),
                  right: moderateWidthScale(22),
                },
              ]}
            />
            <View
              style={[
                styles.accentDot,
                {
                  width: moderateWidthScale(6),
                  height: moderateWidthScale(6),
                  backgroundColor: theme.orangeBrown,
                  bottom: moderateHeightScale(22),
                  left: moderateWidthScale(22),
                },
              ]}
            />
            <View
              style={[
                styles.accentBar,
                {
                  width: moderateWidthScale(8),
                  height: moderateHeightScale(3),
                  backgroundColor: theme.lightRedBorder,
                  top: moderateHeightScale(40),
                  left: moderateWidthScale(10),
                  transform: [{ rotate: "-40deg" }],
                },
              ]}
            />
            <View
              style={[
                styles.accentBar,
                {
                  width: moderateWidthScale(7),
                  height: moderateHeightScale(3),
                  backgroundColor: theme.orangeBrown,
                  bottom: moderateHeightScale(18),
                  right: moderateWidthScale(12),
                  transform: [{ rotate: "50deg" }],
                },
              ]}
            />

            <View style={styles.iconCircle}>
              <Feather
                name="user-minus"
                size={iconScale(30)}
                color={theme.white}
              />
            </View>
          </View>

          <Text style={styles.title}>{t("removeYourself")}</Text>

          <Text style={styles.message}>{t("removeYourselfConfirm")}</Text>

          <View style={styles.buttonContainer}>
            <Button
              title={t("cancel") || "Cancel"}
              onPress={onClose}
              disabled={loading}
              backgroundColor={theme.darkGreen}
              containerStyle={styles.primaryButton}
            />
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={onConfirm}
              activeOpacity={0.7}
              disabled={loading}
              accessibilityRole="button"
            >
              {loading ? (
                <ActivityIndicator size="small" color={theme.red} />
              ) : (
                <Text style={styles.secondaryButtonText}>
                  {t("removeFromStaff")}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </Pressable>
      </View>
    </Modal>
  );
}
