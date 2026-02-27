import React, { useMemo, useState } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  TouchableOpacity,
  Linking,
} from "react-native";
import { useTheme, useAppDispatch } from "@/src/hooks/hooks";
import { useTranslation } from "react-i18next";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  moderateWidthScale,
  moderateHeightScale,
  widthScale,
} from "@/src/theme/dimensions";
import { MaterialIcons, MaterialCommunityIcons } from "@expo/vector-icons";
import { fetchUserStatus } from "@/src/state/thunks/businessThunks";
import { checkInternetConnection } from "@/src/services/api";
import { useNotificationContext } from "@/src/contexts/NotificationContext";
import Button from "@/src/components/button";

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
      borderRadius: moderateWidthScale(20),
      width: widthScale(340),
      maxWidth: "90%",
      paddingHorizontal: moderateWidthScale(24),
      paddingTop: moderateHeightScale(24),
      paddingBottom: moderateHeightScale(28),
      alignItems: "center",
      shadowColor: theme.shadow,
      shadowOffset: {
        width: 0,
        height: moderateHeightScale(8),
      },
      shadowOpacity: 0.4,
      shadowRadius: moderateWidthScale(16),
      elevation: 12,
    },
    headerRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "flex-end",
      width: "100%",
      marginBottom: moderateHeightScale(8),
    },
    closeButton: {
      padding: moderateWidthScale(4),
    },
    iconContainer: {
      width: moderateWidthScale(72),
      height: moderateWidthScale(72),
      borderRadius: moderateWidthScale(36),
      backgroundColor: theme.lightGreen07,
      justifyContent: "center",
      alignItems: "center",
      marginBottom: moderateHeightScale(20),
    },
    title: {
      fontSize: fontSize.size20,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      textAlign: "center",
      marginBottom: moderateHeightScale(12),
      paddingHorizontal: moderateWidthScale(8),
    },
    message: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.text,
      textAlign: "center",
      lineHeight: moderateHeightScale(22),
      marginBottom: moderateHeightScale(24),
      paddingHorizontal: moderateWidthScale(4),
    },
    buttonContainer: {
      width: "100%",
    },
  });

interface StripeConnectModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function StripeConnectModal({
  visible,
  onClose,
}: StripeConnectModalProps) {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const { showBanner } = useNotificationContext();
  const [loading, setLoading] = useState(false);

  const handleConnectNow = async () => {
    const hasInternet = await checkInternetConnection();
    if (!hasInternet) {
      showBanner(
        t("noInternetConnection"),
        t("pleaseCheckInternetConnection"),
        "error",
        2500,
      );
      return;
    }

    setLoading(true);
    try {
      const businessData = await dispatch(
        fetchUserStatus({ showError: false }),
      ).unwrap();

      if (businessData?.stripe_onboarding_link) {
        try {
          const canOpen = await Linking.canOpenURL(
            businessData.stripe_onboarding_link,
          );
          if (canOpen) {
            await Linking.openURL(businessData.stripe_onboarding_link);
            onClose();
          } else {
            showBanner(t("error"), t("cannotOpenLink"), "error", 2500);
          }
        } catch (error: any) {
          showBanner(
            t("error"),
            error.message || t("failedToOpenLink"),
            "error",
            2500,
          );
        }
      } else {
        showBanner(
          t("stripeConnect"),
          t("stripeOnboardingNotAvailable"),
          "error",
          2500,
        );
      }
    } catch (error: any) {
      showBanner(
        t("error"),
        error.message || t("failedToFetchStripeLink"),
        "error",
        2500,
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable
          style={styles.modalContainer}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={styles.headerRow}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={onClose}
              activeOpacity={0.7}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <MaterialIcons
                name="close"
                size={moderateWidthScale(24)}
                color={theme.text}
              />
            </TouchableOpacity>
          </View>

          <View style={styles.iconContainer}>
            <MaterialCommunityIcons
              name="credit-card-check-outline"
              size={moderateWidthScale(36)}
              color={theme.darkGreen}
            />
          </View>

          <Text style={styles.title}>{t("stripeConnectModalTitle")}</Text>

          <Text style={styles.message}>{t("stripeConnectModalMessage")}</Text>

          <View style={styles.buttonContainer}>
            <Button
              title={t("connectNow")}
              onPress={handleConnectNow}
              loading={loading}
              disabled={loading}
            />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
