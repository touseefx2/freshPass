import React, { useMemo } from "react";
import {
  Modal,
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Platform,
} from "react-native";
import { BlurView } from "expo-blur";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  moderateHeightScale,
  moderateWidthScale,
  widthScale,
} from "@/src/theme/dimensions";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Button from "@/src/components/button";

interface UnlockAIFeaturesModalProps {
  visible: boolean;
  onUpgradePress: () => void;
  onBack?: () => void;
  errorMessage?: string | null;
  purchaseSuccess?: boolean;
  onUseHaritryon?: () => void;
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: moderateWidthScale(24),
    },
    blurOverlay: {
      ...StyleSheet.absoluteFillObject,
    },
    backButton: {
      position: "absolute",
      left: moderateWidthScale(20),
      zIndex: 10,
      padding: moderateWidthScale(8),
      backgroundColor: theme.white,
      borderRadius: moderateWidthScale(20),
      shadowColor: theme.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 4,
    },
    modalCard: {
      width: "100%",
      maxWidth: widthScale(340),
      backgroundColor: theme.white,
      borderRadius: moderateWidthScale(16),
      paddingHorizontal: moderateWidthScale(24),
      paddingVertical: moderateHeightScale(28),
      alignItems: "center",
      shadowColor: theme.shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 12,
      elevation: 8,
    },
    iconCircle: {
      width: moderateWidthScale(72),
      height: moderateWidthScale(72),
      borderRadius: moderateWidthScale(36),
      backgroundColor: theme.lightGreen1,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: moderateHeightScale(20),
    },
    title: {
      fontSize: fontSize.size22,
      fontFamily: fonts.fontBold,
      color: theme.text,
      textAlign: "center",
      marginBottom: moderateHeightScale(12),
    },
    description: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontRegular,
      color: theme.text,
      textAlign: "center",
      lineHeight: moderateHeightScale(24),
      marginBottom: moderateHeightScale(24),
      paddingHorizontal: moderateWidthScale(8),
    },
    upgradeButton: {
      width: "100%",
      maxWidth: widthScale(280),
    },
    errorText: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.red,
      textAlign: "center",
      marginBottom: moderateHeightScale(16),
      paddingHorizontal: moderateWidthScale(8),
    },
  });

export default function UnlockAIFeaturesModal({
  visible,
  onUpgradePress,
  onBack,
  errorMessage,
  purchaseSuccess,
  onUseHaritryon,
}: UnlockAIFeaturesModalProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const theme = colors as Theme;
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(theme), [colors]);

  const isSuccess = Boolean(purchaseSuccess);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        {Platform.OS === "ios" ? (
          <BlurView intensity={7} tint="light" style={styles.blurOverlay} />
        ) : (
          <View
            style={[
              styles.blurOverlay,
              { backgroundColor: "rgba(0, 0, 0, 0.4)" },
            ]}
          />
        )}
        {onBack ? (
          <TouchableOpacity
            style={[
              styles.backButton,
              { top: insets.top + moderateHeightScale(12) },
            ]}
            onPress={onBack}
            activeOpacity={0.7}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons
              name="close"
              size={moderateWidthScale(24)}
              color={theme.darkGreen}
            />
          </TouchableOpacity>
        ) : null}
        <View style={styles.modalCard}>
          <View style={styles.iconCircle}>
            <Ionicons
              name={isSuccess ? "checkmark-circle" : "lock-closed"}
              size={moderateWidthScale(36)}
              color={theme.darkGreen}
            />
          </View>
          <Text style={styles.title}>
            {isSuccess ? t("aiToolPlanPurchased") : t("unlockAIFeatures")}
          </Text>
          {!isSuccess && (
            <Text style={styles.description}>
              {t("unlockAIFeaturesDescription")}
            </Text>
          )}
          {errorMessage ? (
            <Text style={styles.errorText}>{errorMessage}</Text>
          ) : null}
          <Button
            title={isSuccess ? t("useHaritryon") : t("upgradePlan")}
            onPress={
              isSuccess
                ? onUseHaritryon ?? onBack ?? (() => {})
                : onUpgradePress
            }
            containerStyle={styles.upgradeButton}
          />
        </View>
      </View>
    </Modal>
  );
}
