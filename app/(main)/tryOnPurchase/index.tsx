import React, { useMemo, useState } from "react";
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
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  moderateHeightScale,
  moderateWidthScale,
} from "@/src/theme/dimensions";
import Button from "@/src/components/button";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { fetchAiToolsPaymentSheetParams } from "@/src/services/stripeService";
import { useStripe } from "@stripe/stripe-react-native";
import {
  purchaseAndVerifyIosIap,
  resolveAiServiceProductId,
} from "@/src/services/iapService";
import NotificationBanner from "@/src/components/notificationBanner";
import { ApiService } from "@/src/services/api";
import { userEndpoints } from "@/src/services/endpoints";
import { setUserDetails } from "@/src/state/slices/userSlice";
import { router, useLocalSearchParams } from "expo-router";
import { createStyles } from "./styles";
import {
  setActionLoader,
  setActionLoaderTitle,
} from "@/src/state/slices/generalSlice";

type PaymentMethod = "iap" | "stripe";

export default function TryOnPurchase() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const dispatch = useAppDispatch();
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const user = useAppSelector((state) => state.user);
  const aiService = useAppSelector((state) => state.general.aiService);
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    serviceId?: string;
    screen?: string;
  }>();
  const serviceId = params.serviceId ? Number(params.serviceId) : null;
  const screen = params.screen ?? "";
  const isIos = Platform.OS === "ios";

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("iap");
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
    if (serviceId == null || !aiService) return null;
    const found = aiService.find((s) => s.id === serviceId);
    return found ?? aiService.find((s) => s.name === "AI Hair Try-On") ?? null;
  }, [serviceId, aiService]);

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
    router.back();
  };

  const refreshQuotaAndNavigate = async (quotaFromVerify?: number) => {
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
      if (screen === "explore") {
        router.replace("/(main)/aiTools/toolList" as any);
      } else {
        router.back();
      }
    }
  };

  const handleIapPayment = async (serviceIdForPurchase: number) => {
    const productId = resolveAiServiceProductId(
      serviceIdForPurchase,
      service?.app_store_product_id,
    );

    const verifyResponse = await purchaseAndVerifyIosIap({
      productId,
      kind: "ai_service",
      referenceId: serviceIdForPurchase,
    });

    setLocalBanner({
      visible: true,
      title: t("success"),
      message: t("paymentSuccessful") ?? "Payment successful!",
      type: "success",
    });

    await refreshQuotaAndNavigate(verifyResponse.data?.ai_quota);
  };

  const handleStripePayment = async (serviceIdForPurchase: number) => {
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

    setLocalBanner({
      visible: true,
      title: t("success"),
      message: t("paymentSuccessful") ?? "Payment successful!",
      type: "success",
    });

    await refreshQuotaAndNavigate();
  };

  const handleUpgradePress = async () => {
    if (!service?.id) {
      return;
    }

    dispatch(setActionLoader(true));
    dispatch(setActionLoaderTitle(t("paymentprocessing")));

    try {
      if (isIos && paymentMethod === "iap") {
        await handleIapPayment(service.id);
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
      setLocalBanner({
        visible: true,
        title: t("error"),
        message,
        type: "error",
      });
    } finally {
      dispatch(setActionLoader(false));
    }
  };

  const renderPaymentMethodOption = (
    method: PaymentMethod,
    label: string,
  ) => {
    const isSelected = paymentMethod === method;

    return (
      <TouchableOpacity
        key={method}
        style={[
          styles.paymentMethodOption,
          isSelected && styles.paymentMethodOptionSelected,
        ]}
        onPress={() => setPaymentMethod(method)}
        activeOpacity={0.7}
      >
        <View
          style={[
            styles.paymentMethodRadio,
            isSelected && styles.paymentMethodRadioSelected,
          ]}
        >
          {isSelected ? <View style={styles.paymentMethodRadioInner} /> : null}
        </View>
        <Text style={styles.paymentMethodLabel}>{label}</Text>
      </TouchableOpacity>
    );
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
            {isIos ? (
              <View style={styles.paymentMethodContainer}>
                {renderPaymentMethodOption(
                  "iap",
                  t("payWithApple") ?? "Pay with Apple",
                )}
                {renderPaymentMethodOption(
                  "stripe",
                  t("payWithCard") ?? "Pay with Card",
                )}
              </View>
            ) : null}

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
