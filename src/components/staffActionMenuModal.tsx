import React, { useEffect, useMemo } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  TouchableOpacity,
  Image,
  Platform,
} from "react-native";
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
      opacity: 0.45,
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
      borderRadius: moderateWidthScale(28),
      paddingTop: AVATAR_SIZE / 2 + moderateHeightScale(20),
      paddingBottom: moderateHeightScale(22),
      paddingHorizontal: moderateWidthScale(20),
      alignItems: "center",
      borderWidth: 1,
      borderColor: theme.borderLight,
      // Layered depth
      shadowColor: theme.darkGreen,
      shadowOffset: { width: 0, height: moderateHeightScale(18) },
      shadowOpacity: 0.18,
      shadowRadius: moderateWidthScale(28),
      elevation: 16,
    },
    cardHighlight: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      height: moderateHeightScale(72),
      borderTopLeftRadius: moderateWidthScale(28),
      borderTopRightRadius: moderateWidthScale(28),
      backgroundColor: theme.lightGreen05,
    },
    name: {
      fontSize: fontSize.size22,
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
      marginBottom: moderateHeightScale(22),
      paddingHorizontal: moderateWidthScale(8),
    },
    actionsRow: {
      flexDirection: "row",
      width: "100%",
      gap: moderateWidthScale(12),
      marginBottom: moderateHeightScale(8),
    },
    actionTile: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      gap: moderateHeightScale(10),
      paddingVertical: moderateHeightScale(18),
      borderRadius: moderateWidthScale(20),
      borderWidth: 1,
    },
    editTile: {
      backgroundColor: theme.darkGreen,
      borderColor: theme.darkGreen,
      shadowColor: theme.darkGreen,
      shadowOffset: { width: 0, height: moderateHeightScale(8) },
      shadowOpacity: 0.35,
      shadowRadius: moderateWidthScale(12),
      elevation: 8,
    },
    deleteTile: {
      backgroundColor: theme.white,
      borderColor: theme.lightRedBorder,
      shadowColor: theme.red,
      shadowOffset: { width: 0, height: moderateHeightScale(6) },
      shadowOpacity: 0.18,
      shadowRadius: moderateWidthScale(10),
      elevation: 6,
    },
    actionIconBubble: {
      width: moderateWidthScale(44),
      height: moderateWidthScale(44),
      borderRadius: moderateWidthScale(14),
      alignItems: "center",
      justifyContent: "center",
    },
    editIconBubble: {
      backgroundColor: theme.white15,
    },
    deleteIconBubble: {
      backgroundColor: theme.lightRed,
    },
    editLabel: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontBold,
      color: theme.white,
    },
    deleteLabel: {
      fontSize: fontSize.size14,
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
        {Platform.OS === "ios" ? (
          <BlurView intensity={28} tint="dark" style={styles.blurOverlay} />
        ) : (
          <View style={styles.dimOverlay} />
        )}
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

        <Animated.View style={[styles.cardWrap, cardAnimStyle]}>
          <View style={styles.avatarFloat}>
            <View style={styles.avatarRing}>
              {imageUri ? (
                <Image
                  source={{ uri: imageUri }}
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
            <View style={styles.cardHighlight} />

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
                <View style={[styles.actionIconBubble, styles.editIconBubble]}>
                  <Feather
                    name="edit-2"
                    size={iconScale(18)}
                    color={theme.white}
                  />
                </View>
                <Text style={styles.editLabel}>{t("edit")}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.85}
                style={[styles.actionTile, styles.deleteTile]}
                onPress={onDelete}
                accessibilityRole="button"
              >
                <View
                  style={[styles.actionIconBubble, styles.deleteIconBubble]}
                >
                  <MaterialIcons
                    name="delete-outline"
                    size={iconScale(20)}
                    color={theme.red}
                  />
                </View>
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
