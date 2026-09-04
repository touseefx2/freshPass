import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  TouchableOpacity,
  Linking,
  Platform,
  Image,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { useTheme, useAppDispatch, useAppSelector } from "@/src/hooks/hooks";
import { useTranslation } from "react-i18next";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  moderateWidthScale,
  moderateHeightScale,
  widthScale,
  heightScale,
  iconScale,
} from "@/src/theme/dimensions";
import { MaterialIcons } from "@expo/vector-icons";
import { fetchUserStatus } from "@/src/state/thunks/businessThunks";
import { checkInternetConnection } from "@/src/services/api";
import { useNotificationContext } from "@/src/contexts/NotificationContext";
import Button from "@/src/components/button";
import { IMAGES } from "@/src/constant/images";

/** Wait for RN Modal dismiss before presenting Stripe's iOS UIKit sheet. */
const IOS_NAVIGATE_AFTER_DISMISS_MS = 650;
const ANDROID_NAVIGATE_AFTER_CLOSE_MS = 100;

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: moderateWidthScale(16),
    },
    modalContainer: {
      backgroundColor: theme.white,
      borderRadius: moderateWidthScale(24),
      width: widthScale(340),
      maxWidth: "100%",
      maxHeight: "90%",
      paddingHorizontal: moderateWidthScale(24),
      paddingTop: moderateHeightScale(16),
      paddingBottom: moderateHeightScale(28),
      shadowColor: theme.shadow,
      shadowOffset: {
        width: 0,
        height: moderateHeightScale(8),
      },
      shadowOpacity: 0.35,
      shadowRadius: moderateWidthScale(16),
      elevation: 12,
    },
    headerRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "flex-end",
      width: "100%",
    },
    closeButton: {
      padding: moderateWidthScale(4),
    },
    scrollContent: {
      alignItems: "center",
      paddingBottom: moderateHeightScale(4),
    },
    walletImage: {
      width: widthScale(120),
      height: heightScale(100),
      marginBottom: moderateHeightScale(16),
    },
    title: {
      fontSize: fontSize.size22,
      fontFamily: fonts.fontBold,
      color: theme.black,
      textAlign: "center",
      marginBottom: moderateHeightScale(10),
      paddingHorizontal: moderateWidthScale(4),
    },
    message: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.text,
      textAlign: "center",
      lineHeight: moderateHeightScale(21),
      marginBottom: moderateHeightScale(22),
      paddingHorizontal: moderateWidthScale(4),
    },
    featuresList: {
      width: "100%",
      alignSelf: "stretch",
      paddingHorizontal: moderateWidthScale(8),
      gap: moderateHeightScale(14),
      marginBottom: moderateHeightScale(28),
    },
    featureRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(12),
    },
    checkCircle: {
      width: moderateWidthScale(24),
      height: moderateWidthScale(24),
      borderRadius: moderateWidthScale(12),
      backgroundColor: theme.buttonBack,
      justifyContent: "center",
      alignItems: "center",
    },
    featureText: {
      flex: 1,
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.text,
      lineHeight: moderateHeightScale(20),
    },
    buttonContainer: {
      width: "100%",
    },
    connectButton: {
      borderRadius: moderateWidthScale(28),
      height: moderateHeightScale(52),
    },
    laterButton: {
      marginTop: moderateHeightScale(14),
      paddingVertical: moderateHeightScale(8),
      alignItems: "center",
    },
    laterText: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
    },
  });

interface StripeConnectModalProps {
  visible: boolean;
  onClose: () => void;
}

const FEATURE_KEYS = [
  "stripeConnectFeatureFast",
  "stripeConnectFeatureControl",
  "stripeConnectFeatureNoStore",
  "stripeConnectFeatureStripe",
] as const;

export default function StripeConnectModal({
  visible,
  onClose,
}: StripeConnectModalProps) {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);
  const { t } = useTranslation();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { showBanner } = useNotificationContext();
  const stripeOnboardingLink = useAppSelector(
    (state) => state.user.businessStatus?.stripe_onboarding_link,
  );
  const [loading, setLoading] = useState(false);
  const pendingNavigateRef = useRef(false);
  const navigateTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (navigateTimeoutRef.current) {
        clearTimeout(navigateTimeoutRef.current);
        navigateTimeoutRef.current = null;
      }
    };
  }, []);

  const navigateToOnboarding = () => {
    if (!pendingNavigateRef.current) return;
    pendingNavigateRef.current = false;
    if (navigateTimeoutRef.current) {
      clearTimeout(navigateTimeoutRef.current);
      navigateTimeoutRef.current = null;
    }
    router.push("/(main)/stripeConnectOnboarding");
  };

  const openFallbackLink = async (link: string) => {
    const canOpen = await Linking.canOpenURL(link);
    if (canOpen) {
      await Linking.openURL(link);
      onClose();
      return;
    }
    showBanner(t("error"), t("cannotOpenLink"), "error", 2500);
  };

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

    if (Platform.OS !== "web") {
      // iOS Release: presenting Stripe's UIKit sheet while this RN Modal is still
      // dismissing silently fails — wait for onDismiss (or timeout fallback).
      pendingNavigateRef.current = true;
      onClose();
      if (navigateTimeoutRef.current) {
        clearTimeout(navigateTimeoutRef.current);
      }
      navigateTimeoutRef.current = setTimeout(
        navigateToOnboarding,
        Platform.OS === "ios"
          ? IOS_NAVIGATE_AFTER_DISMISS_MS
          : ANDROID_NAVIGATE_AFTER_CLOSE_MS,
      );
      return;
    }

    setLoading(true);
    try {
      let link = stripeOnboardingLink;
      if (!link) {
        const businessData = await dispatch(
          fetchUserStatus({ showError: false }),
        ).unwrap();
        link = businessData?.stripe_onboarding_link ?? null;
      }

      if (link) {
        await openFallbackLink(link);
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
      onDismiss={navigateToOnboarding}
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
                size={iconScale(24)}
                color={theme.text}
              />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            bounces={false}
            contentContainerStyle={styles.scrollContent}
          >
            <Image
              source={IMAGES.payoutWallet}
              style={styles.walletImage}
              resizeMode="contain"
            />

            <Text style={styles.title}>{t("stripeConnectModalTitle")}</Text>

            <Text style={styles.message}>{t("stripeConnectModalMessage")}</Text>

            <View style={styles.featuresList}>
              {FEATURE_KEYS.map((key) => (
                <View key={key} style={styles.featureRow}>
                  <View style={styles.checkCircle}>
                    <MaterialIcons
                      name="check"
                      size={iconScale(14)}
                      color={theme.white}
                    />
                  </View>
                  <Text style={styles.featureText}>{t(key)}</Text>
                </View>
              ))}
            </View>

            <View style={styles.buttonContainer}>
              <Button
                title={t("connectPayoutAccount")}
                onPress={handleConnectNow}
                loading={loading}
                disabled={loading}
                containerStyle={styles.connectButton}
              />
              <TouchableOpacity
                style={styles.laterButton}
                onPress={onClose}
                activeOpacity={0.7}
              >
                <Text style={styles.laterText}>
                  {t("stripeConnectDoThisLater")}
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
