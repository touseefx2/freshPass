import React, { useMemo, useState, useEffect } from "react";
import {
  ImageBackground,
  Platform,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useTranslation } from "react-i18next";
import { useAppDispatch, useAppSelector, useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { IMAGES } from "@/src/constant/images";
import { LeafLogo } from "@/assets/icons";
import {
  moderateHeightScale,
  moderateWidthScale,
} from "@/src/theme/dimensions";
import Button from "@/src/components/button";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  ensureStripeReady,
  fetchAiToolsPaymentSheetParams,
} from "@/src/services/stripeService";
import { useStripe } from "@stripe/stripe-react-native";
import {
  purchaseAndVerifyIosIap,
  resolveIosAppleProductId,
} from "@/src/services/iapService";
import NotificationBanner from "@/src/components/notificationBanner";
import { ApiService } from "@/src/services/api";
import { businessEndpoints, userEndpoints } from "@/src/services/endpoints";
import { setUserDetails } from "@/src/state/slices/userSlice";
import { router, useLocalSearchParams } from "expo-router";
import { createStyles } from "./styles";
import {
  setActionLoader,
  setActionLoaderTitle,
  setAiService,
  setTryOnPurchaseSuccessModalVisible,
  setTryOnPurchaseSuccessSource,
  setGuestModeModalVisible,
} from "@/src/state/slices/generalSlice";
import type { AdditionalServiceItem } from "@/src/state/slices/generalSlice";
import Logger from "@/src/services/logger";

export default function TryOnPurchase() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const dispatch = useAppDispatch();
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const user = useAppSelector((state) => state.user);
  const aiService = useAppSelector((state) => state.general.aiService);
  const purchaseSource = useAppSelector(
    (state) => state.general.tryOnPurchaseSuccessSource,
  );
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    serviceId?: string | string[];
    screen?: string | string[];
  }>();
  const rawServiceId = Array.isArray(params.serviceId)
    ? params.serviceId[0]
    : params.serviceId;
  const rawScreen = Array.isArray(params.screen)
    ? params.screen[0]
    : params.screen;
  const serviceId = rawServiceId ? Number(rawServiceId) : null;
  // Prefer Redux source (set when opening purchase); fall back to route param
  const screen: "explore" | "tools" =
    purchaseSource === "tools" || rawScreen === "tools" ? "tools" : "explore";
  const isIos = Platform.OS === "ios";

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

  const service = useMemo(() => {
    if (!aiService?.length) return null;
    if (serviceId != null) {
      const found = aiService.find((s) => s.id === serviceId);
      if (found) return found;
    }
    return (
      aiService.find((s) => s.name === "AI Hair Try-On") ??
      aiService.find((s) => /hair\s*try/i.test(s.name ?? "")) ??
      aiService.find((s) => s.active) ??
      null
    );
  }, [serviceId, aiService]);

  Logger.log("=====>service", service);

  useEffect(() => {
    let cancelled = false;

    const loadCustomerServices = async () => {
      try {
        const response = await ApiService.get<{
          success: boolean;
          message: string;
          data: AdditionalServiceItem[];
        }>(businessEndpoints.additionalServices("customer"));

        if (cancelled) return;

        if (response.success && response.data) {
          dispatch(setAiService(response.data));
          const hairTryOn =
            (serviceId != null
              ? response.data.find((s) => s.id === serviceId)
              : undefined) ??
            response.data.find((s) => s.name === "AI Hair Try-On") ??
            response.data.find((s) => s.active);
          if (isIos && !hairTryOn?.appleProductId?.trim()) {
            setLocalBanner({
              visible: true,
              title: t("error"),
              message: t("appStoreConfigNotSet"),
              type: "error",
            });
          }
          return;
        }

        if (isIos) {
          setLocalBanner({
            visible: true,
            title: t("error"),
            message: t("appStoreConfigNotSet"),
            type: "error",
          });
        }
      } catch {
        if (cancelled) return;
        if (isIos) {
          setLocalBanner({
            visible: true,
            title: t("error"),
            message: t("appStoreConfigNotSet"),
            type: "error",
          });
        }
      }
    };

    void loadCustomerServices();

    return () => {
      cancelled = true;
    };
  }, [dispatch, isIos, serviceId, t]);

  const pricingText =
    service && service.price && service.ai_requests
      ? t("tryOnModalDynamicPricing", {
        credits: service.ai_requests,
        price: service.price.startsWith("$")
          ? service.price.slice(1)
          : service.price,
      })
      : t("tryOnModalPricing");

  const handleSkip = () => {
    dispatch(setTryOnPurchaseSuccessSource(null));
    router.back();
  };

  const refreshQuotaAndShowSuccess = async (quotaFromVerify?: number) => {
    dispatch(setActionLoader(true));
    dispatch(setActionLoaderTitle(t("pleaseWait")));

    try {
      if (typeof quotaFromVerify === "number") {
        dispatch(setUserDetails({ ai_quota: quotaFromVerify }));
      } else {
        const response = await ApiService.get<{
          success: boolean;
          data?: { ai_quota?: number };
        }>(userEndpoints.details);
        if (response.success && response.data?.ai_quota !== undefined) {
          dispatch(setUserDetails({ ai_quota: response.data.ai_quota }));
        }
      }
    } catch {
      // ignore
    } finally {
      dispatch(setActionLoader(false));
      // Close buy screen first, then show congrats on the underlying screen
      const successSource: "explore" | "tools" =
        purchaseSource === "tools" || screen === "tools" ? "tools" : "explore";
      // Lock source before closing so route unmount can't lose it
      dispatch(setTryOnPurchaseSuccessSource(successSource));
      router.back();
      setTimeout(() => {
        dispatch(
          setTryOnPurchaseSuccessModalVisible({
            visible: true,
            source: successSource,
          }),
        );
      }, 350);
    }
  };

  const handleIapPayment = async () => {
    let appleProductId = service?.appleProductId;
    if (!appleProductId?.trim()) {
      const response = await ApiService.get<{
        success: boolean;
        message: string;
        data: AdditionalServiceItem[];
      }>(businessEndpoints.additionalServices("customer"));
      if (response.success && response.data) {
        dispatch(setAiService(response.data));
        const hairTryOn =
          (serviceId != null
            ? response.data.find((s) => s.id === serviceId)
            : undefined) ??
          response.data.find((s) => s.name === "AI Hair Try-On") ??
          response.data.find((s) => s.active);
        appleProductId = hairTryOn?.appleProductId;
      }
    }

    const productId = resolveIosAppleProductId(appleProductId);

    const verifyResponse = await purchaseAndVerifyIosIap({
      productId,
    });

    await refreshQuotaAndShowSuccess(verifyResponse.data?.ai_quota);
  };

  const handleStripePayment = async (serviceIdForPurchase: number) => {
    // Retry Stripe key from API if startup fetch failed (e.g. no network)
    await ensureStripeReady();

    const { customer, paymentIntent, customerSessionClientSecret } =
      await fetchAiToolsPaymentSheetParams(serviceIdForPurchase);
    dispatch(setActionLoader(false));
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const paymentConfig: Record<string, unknown> = {
      merchantDisplayName: "Fresh Pass",
      customerId: customer,
      allowsDelayedPaymentMethods: true,
      defaultBillingDetails: {
        name: user.name || undefined,
        email: user.email || undefined,
      },
      customFlow: false,
    };

    if (customerSessionClientSecret) {
      paymentConfig.customerSessionClientSecret = customerSessionClientSecret;
    }

    if (!paymentIntent || paymentIntent.trim() === "") {
      setLocalBanner({
        visible: true,
        title: t("error"),
        message: "Failed to start payment.",
        type: "error",
      });
      return;
    }

    paymentConfig.paymentIntentClientSecret = paymentIntent;

    const { error: initError } = await initPaymentSheet(paymentConfig as any);

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

    await refreshQuotaAndShowSuccess();
  };

  const handleUpgradePress = async () => {
    if (user.isGuest) {
      dispatch(setGuestModeModalVisible(true));
      return;
    }

    if (!service?.id) {
      return;
    }

    dispatch(setActionLoader(true));
    dispatch(setActionLoaderTitle(t("paymentprocessing")));

    try {
      if (isIos) {
        await handleIapPayment();
        return;
      }

      await handleStripePayment(service.id);
    } catch (err: unknown) {
      const ax = err as { message?: string; data?: { message?: string } };
      const message =
        ax.data?.message ?? ax.message ?? "Failed to start payment.";
      if (message.toLowerCase().includes("cancel")) {
        return;
      }
      const isConfigError = message.toLowerCase().includes("app store configuration");
      setLocalBanner({
        visible: true,
        title: t("error"),
        message: isConfigError ? t("appStoreConfigNotSet") : message,
        type: "error",
      });
    } finally {
      dispatch(setActionLoader(false));
    }
  };

  return (
    <View style={styles.container}>
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
            onPress={handleSkip}
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
              <Text style={styles.titleHighlight}>{t("tryOnModalTitle2")}</Text>
              {t("tryOnModalTitle3")}
              <Text style={styles.titleHighlight}>{t("tryOnModalTitle4")}</Text>
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
    </View>
  );
}
