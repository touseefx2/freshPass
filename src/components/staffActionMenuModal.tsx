import React, { useEffect, useMemo } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  TouchableOpacity,
  Platform,
} from "react-native";
import AppImage from "@/src/components/AppImage";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { BlurView } from "expo-blur";
import { Feather, MaterialIcons } from "@expo/vector-icons";
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

const AVATAR_SIZE = widthScale(88);
const CARD_ENTER_OFFSET = moderateHeightScale(28);

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: moderateWidthScale(28),
    },
    blurOverlay: {
      ...StyleSheet.absoluteFillObject,
    },
    dimOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: theme.black,
      opacity: 0.2,
    },
    cardWrap: {
      width: "100%",
      maxWidth: widthScale(320),
      alignItems: "center",
    },
    avatarFloat: {
      zIndex: 2,
      marginBottom: -AVATAR_SIZE / 2,
      shadowColor: theme.darkGreen,
      shadowOffset: { width: 0, height: moderateHeightScale(10) },
      shadowOpacity: 0.22,
      shadowRadius: moderateWidthScale(16),
      elevation: 12,
    },
    avatarRing: {
      width: AVATAR_SIZE,
      height: AVATAR_SIZE,
      borderRadius: AVATAR_SIZE / 2,
      padding: moderateWidthScale(4),
      backgroundColor: theme.white,
      borderWidth: 3,
      borderColor: theme.white,
    },
    avatarImage: {
      width: "100%",
      height: "100%",
      borderRadius: AVATAR_SIZE / 2,
      backgroundColor: theme.emptyProfileImage,
    },
    avatarFallback: {
      width: "100%",
      height: "100%",
      borderRadius: AVATAR_SIZE / 2,
      backgroundColor: theme.lightGreen07,
      alignItems: "center",
      justifyContent: "center",
    },
    statusDot: {
      position: "absolute",
      bottom: moderateHeightScale(4),
      right: moderateWidthScale(4),
      width: moderateWidthScale(18),
      height: moderateWidthScale(18),
      borderRadius: moderateWidthScale(9),
      borderWidth: 3,
      borderColor: theme.white,
      zIndex: 3,
    },
    statusActive: {
      backgroundColor: theme.toggleActive,
    },
    statusInactive: {
      backgroundColor: theme.lightGreen5,
    },
    card: {
      width: "100%",
      backgroundColor: theme.white,
      borderRadius: moderateWidthScale(24),
      paddingTop: AVATAR_SIZE / 2 + moderateHeightScale(14),
      paddingBottom: moderateHeightScale(12),
      paddingHorizontal: moderateWidthScale(20),
      alignItems: "center",
      borderWidth: 1,
      borderColor: theme.borderLight,
      // Layered depth
      shadowColor: theme.darkGreen,
      shadowOffset: { width: 0, height: moderateHeightScale(12) },
      shadowOpacity: 0.14,
      shadowRadius: moderateWidthScale(24),
      elevation: 12,
    },
    name: {
      fontSize: fontSize.size20,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      textAlign: "center",
      textTransform: "capitalize",
      marginBottom: moderateHeightScale(4),
    },
    subtitle: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      textAlign: "center",
      marginBottom: moderateHeightScale(20),
      paddingHorizontal: moderateWidthScale(8),
    },
    actionsRow: {
      width: "100%",
      gap: moderateHeightScale(10),
    },
    actionTile: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: moderateWidthScale(8),
      height: moderateHeightScale(50),
      borderRadius: moderateWidthScale(14),
      borderWidth: 1,
    },
    editTile: {
      backgroundColor: theme.darkGreen,
      borderColor: theme.darkGreen,
    },
    deleteTile: {
      backgroundColor: theme.white,
      borderColor: theme.lightRedBorder,
    },
    editLabel: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontBold,
      color: theme.white,
    },
    deleteLabel: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontBold,
      color: theme.red,
    },
    cancelButton: {
      marginTop: moderateHeightScale(6),
      paddingVertical: moderateHeightScale(12),
      paddingHorizontal: moderateWidthScale(20),
      minHeight: moderateHeightScale(44),
      alignItems: "center",
      justifyContent: "center",
    },
    cancelText: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontMedium,
      color: theme.lightGreen,
    },
  });

interface StaffActionMenuModalProps {
  visible: boolean;
  staffName?: string;
  imageUri?: string;
  isActive?: boolean;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export default function StaffActionMenuModal({
  visible,
  staffName,
  imageUri,
  isActive = false,
  onClose,
  onEdit,
  onDelete,
}: StaffActionMenuModalProps) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);

  const progress = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      progress.value = 0;
      progress.value = withSpring(1, {
        damping: 16,
        stiffness: 180,
        mass: 0.85,
      });
    } else {
      progress.value = withTiming(0, {
        duration: 160,
        easing: Easing.out(Easing.quad),
      });
    }
  }, [visible, progress]);

  const cardAnimStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [
      { scale: 0.86 + progress.value * 0.14 },
      { translateY: (1 - progress.value) * CARD_ENTER_OFFSET },
    ],
  }));

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <BlurView
          intensity={14}
          tint="dark"
          style={styles.blurOverlay}
          experimentalBlurMethod={
            Platform.OS === "android" ? "dimezisBlurView" : "none"
          }
        />
        <View style={styles.dimOverlay} />
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

        <Animated.View style={[styles.cardWrap, cardAnimStyle]}>
          <View style={styles.avatarFloat}>
            <View style={styles.avatarRing}>
              {imageUri ? (
                <AppImage
                  uri={imageUri}
                  style={styles.avatarImage}
                  resizeMode="cover"
                />
              ) : (
                <View style={styles.avatarFallback}>
                  <Feather
                    name="user"
                    size={iconScale(32)}
                    color={theme.darkGreen}
                  />
                </View>
              )}
            </View>
            <View
              style={[
                styles.statusDot,
                isActive ? styles.statusActive : styles.statusInactive,
              ]}
            />
          </View>

          <Pressable
            style={styles.card}
            onPress={(e) => e.stopPropagation()}
          >
                        <Text style={styles.name} numberOfLines={1}>
              {staffName || t("employees")}
            </Text>
            <Text style={styles.subtitle}>
              {t("manageStaffActions") || "Choose an action for this employee"}
            </Text>

            <View style={styles.actionsRow}>
              <TouchableOpacity
                activeOpacity={0.85}
                style={[styles.actionTile, styles.editTile]}
                onPress={onEdit}
                accessibilityRole="button"
              >
                <Feather name="edit-2" size={iconScale(16)} color={theme.white} />
                <Text style={styles.editLabel}>{t("edit")}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.85}
                style={[styles.actionTile, styles.deleteTile]}
                onPress={onDelete}
                accessibilityRole="button"
              >
                <MaterialIcons
                  name="delete-outline"
                  size={iconScale(19)}
                  color={theme.red}
                />
                <Text style={styles.deleteLabel}>{t("delete")}</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              activeOpacity={0.7}
              style={styles.cancelButton}
              onPress={onClose}
              accessibilityRole="button"
            >
              <Text style={styles.cancelText}>{t("cancel")}</Text>
            </TouchableOpacity>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
}
