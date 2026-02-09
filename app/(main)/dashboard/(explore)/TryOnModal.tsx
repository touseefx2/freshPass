import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  ImageBackground,
  Modal,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useTranslation } from "react-i18next";
import { useAppDispatch, useAppSelector, useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { IMAGES } from "@/src/constant/images";
import { LeafLogo } from "@/assets/icons";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  moderateHeightScale,
  moderateWidthScale,
  widthScale,
} from "@/src/theme/dimensions";
import Button from "@/src/components/button";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import type { AdditionalServiceItem } from "@/src/state/slices/generalSlice";
import { fetchAiToolsPaymentSheetParams } from "@/src/services/stripeService";
import { StripeProvider, useStripe } from "@stripe/stripe-react-native";
import NotificationBanner from "@/src/components/notificationBanner";
import { ApiService } from "@/src/services/api";
import { userEndpoints } from "@/src/services/endpoints";
import { setUserDetails } from "@/src/state/slices/userSlice";
import { router } from "expo-router";

interface TryOnModalProps {
  visible: boolean;
  onClose: () => void;
  service?: AdditionalServiceItem | null;
  /** Optional screen name (e.g. "explore"). Default empty. */
  screen?: string;
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    backgroundImage: {
      flex: 1,
    },
    overlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: theme.darkGreen,
      opacity: 0.65,
    },
    content: {
      flex: 1,
      paddingHorizontal: moderateWidthScale(20),
      justifyContent: "flex-end",
      gap: moderateHeightScale(40),
    },
    skipButton: {
      position: "absolute",
      top: 0,
      right: moderateWidthScale(20),
      backgroundColor: "rgba(255, 255, 255, 0.15)",
      paddingHorizontal: moderateWidthScale(16),
      paddingVertical: moderateHeightScale(10),
      borderRadius: moderateWidthScale(12),
      zIndex: 1,
    },
    skipButtonText: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontBold,
      color: theme.white,
    },
    topSection: {
      alignItems: "center",
      paddingTop: moderateHeightScale(48),
    },
    logoContainer: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(6),
      marginBottom: moderateHeightScale(5),
    },
    logoText: {
      fontSize: fontSize.size20,
      fontFamily: fonts.fontMedium,
      color: theme.white,
    },
    title: {
      fontSize: fontSize.size32,
      fontFamily: fonts.fontBold,
      color: theme.white,
      textAlign: "center",
      lineHeight: moderateHeightScale(42),
      marginBottom: moderateHeightScale(15),
    },
    titleHighlight: {
      fontFamily: fonts.fontExtraBold,
    },
    description1: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontMedium,
      color: theme.white,
      textAlign: "center",
      lineHeight: moderateHeightScale(24),
      marginBottom: moderateHeightScale(15),
      paddingHorizontal: moderateWidthScale(8),
    },
    description2: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: theme.white85,
      textAlign: "center",
      lineHeight: moderateHeightScale(24),
      paddingHorizontal: moderateWidthScale(8),
    },
    bottomSection: {
      alignItems: "center",
      paddingBottom: moderateHeightScale(32),
    },
    unlockButton: {
      width: "100%",
      maxWidth: widthScale(340),
      marginBottom: moderateHeightScale(16),
    },
    pricingText: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.white70,
      textAlign: "center",
    },
    loaderModalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      justifyContent: "center",
      alignItems: "center",
    },
    loaderContainer: {
      backgroundColor: theme.background,
      borderRadius: moderateWidthScale(12),
      padding: moderateWidthScale(24),
      alignItems: "center",
      justifyContent: "center",
      minWidth: moderateWidthScale(120),
    },
    loaderTitleText: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontMedium,
      color: theme.text,
      marginTop: moderateHeightScale(16),
      textAlign: "center",
    },
  });

function TryOnModalContent({
  visible,
  onClose,
  service,
  screen = "",
}: TryOnModalProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const dispatch = useAppDispatch();
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const user = useAppSelector((state) => state.user);
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);
  const insets = useSafeAreaInsets();

  const [localActionLoader, setLocalActionLoader] = useState(false);
  const [localLoaderMessage, setLocalLoaderMessage] = useState("");
  const [localBanner, setLocalBanner] = useState<{
    visible: boolean;
    title: string;
    message: string;
    type: "success" | "error" | "warning" | "info";
  }>({
    visible: false,
    title: "",
    message: "",
    type: "info",
  });

  const pricingText =
    service && service.price && service.ai_requests
      ? t("tryOnModalDynamicPricing", {
          credits: service.ai_requests,
          price: service.price.startsWith("$")
            ? service.price.slice(1)
            : service.price,
        })
      : t("tryOnModalPricing");

  const handleUpgradePress = async () => {
    if (!service?.id) {
      return;
    }
    setLocalActionLoader(true);
    setLocalLoaderMessage(t("paymentprocessing"));
    try {
      const { customer, paymentIntent, customerSessionClientSecret } =
        await fetchAiToolsPaymentSheetParams(service.id);
      setLocalActionLoader(false);
      const paymentConfig: Record<string, unknown> = {
        merchantDisplayName: "Fresh Pass",
        customerId: customer,
        allowsDelayedPaymentMethods: true,
        defaultBillingDetails: {
          name: user?.name ?? undefined,
          email: user?.email ?? undefined,
        },
        customFlow: false,
      };

      if (customerSessionClientSecret) {
        paymentConfig.customerSessionClientSecret = customerSessionClientSecret;
      }
      if (paymentIntent && paymentIntent.trim() !== "") {
        paymentConfig.paymentIntentClientSecret = paymentIntent;
      } else {
        setLocalBanner({
          visible: true,
          title: t("error"),
          message: "Failed to start payment.",
          type: "error",
        });
        return;
      }

      const { error: initError } = await initPaymentSheet(
        paymentConfig as Parameters<typeof initPaymentSheet>[0],
      );

      if (initError) {
        setLocalBanner({
          visible: true,
          title: t("error"),
          message: initError.message ?? "Failed to initialize payment",
          type: "error",
        });
        return;
      }

      const { error: presentError } = await presentPaymentSheet();

      if (presentError) {
        if (!presentError.code?.includes("Canceled")) {
          setLocalBanner({
            visible: true,
            title: t("error"),
            message: presentError.message ?? "Payment could not be completed",
            type: "error",
          });
        }
        return;
      }

      setLocalBanner({
        visible: true,
        title: t("success"),
        message: t("paymentSuccessful") ?? "Payment successful!",
        type: "success",
      });

      setLocalActionLoader(true);
      setLocalLoaderMessage(t("pleaseWait"));
      try {
        const response = await ApiService.get<{
          success: boolean;
          data?: { ai_quota?: number };
        }>(userEndpoints.details);
        if (response.success && response.data?.ai_quota !== undefined) {
          dispatch(setUserDetails({ ai_quota: response.data.ai_quota }));
        }
      } catch {
        // ignore – close modal either way
      } finally {
        setLocalActionLoader(false);
        onClose();
        screen === "explore" && router.push("/(main)/aiTools/toolList" as any);
      }
    } catch (err: unknown) {
      const ax = err as { message?: string; data?: { message?: string } };
      const message =
        ax.data?.message ?? ax.message ?? "Failed to start payment.";
      setLocalBanner({
        visible: true,
        title: t("error"),
        message,
        type: "error",
      });
    } finally {
      setLocalActionLoader(false);
    }
  };

  return (
    <>
      <Modal
        visible={visible}
        animationType="slide"
        transparent={false}
        onRequestClose={onClose}
        statusBarTranslucent
      >
        <SafeAreaView edges={["bottom"]} style={styles.container}>
          <StatusBar barStyle="light-content" translucent />
          <ImageBackground
            source={IMAGES.tryOnBack}
            style={styles.backgroundImage}
            resizeMode="cover"
          >
            <View style={styles.content}>
              <TouchableOpacity
                style={[
                  styles.skipButton,
                  { top: insets.top + moderateHeightScale(12) },
                ]}
                onPress={onClose}
                activeOpacity={0.7}
              >
                <Text style={styles.skipButtonText}>{t("skip")}</Text>
              </TouchableOpacity>

              <View style={styles.topSection}>
                <View style={styles.logoContainer}>
                  <LeafLogo
                    width={moderateWidthScale(25)}
                    height={moderateWidthScale(33)}
                    color1={theme.white}
                    color2={theme.white}
                  />
                  <Text style={styles.logoText}>FRESHPASS</Text>
                </View>

                <Text style={styles.title}>
                  {t("tryOnModalTitle1")}
                  <Text style={styles.titleHighlight}>
                    {t("tryOnModalTitle2")}
                  </Text>
                  {t("tryOnModalTitle3")}
                  <Text style={styles.titleHighlight}>
                    {t("tryOnModalTitle4")}
                  </Text>
                </Text>

                <Text style={styles.description1}>
                  {t("tryOnModalDescription1")}
                </Text>

                <Text style={styles.description2}>
                  {t("tryOnModalDescription2")}
                </Text>
              </View>

              <View style={styles.bottomSection}>
                <Button
                  title={t("unlockAiTryOn")}
                  onPress={handleUpgradePress}
                  backgroundColor={theme.orangeBrown}
                  textColor={theme.darkGreen}
                  containerStyle={styles.unlockButton}
                />
                <Text style={styles.pricingText}>{pricingText}</Text>
              </View>
            </View>
          </ImageBackground>

          <Modal
            transparent
            visible={localActionLoader}
            animationType="fade"
            statusBarTranslucent
          >
            <View style={styles.loaderModalOverlay}>
              <View style={styles.loaderContainer}>
                <ActivityIndicator size="large" color={theme.primary} />
                <Text style={styles.loaderTitleText}>{localLoaderMessage}</Text>
              </View>
            </View>
          </Modal>

          <NotificationBanner
            visible={localBanner.visible}
            title={localBanner.title}
            message={localBanner.message}
            type={localBanner.type}
            duration={3000}
            onDismiss={() =>
              setLocalBanner((prev) => ({ ...prev, visible: false }))
            }
          />
        </SafeAreaView>
      </Modal>
    </>
  );
}

export default function TryOnModal(props: TryOnModalProps) {
  return (
    <StripeProvider
      publishableKey={process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY || ""}
    >
      <TryOnModalContent {...props} />
    </StripeProvider>
  );
}
