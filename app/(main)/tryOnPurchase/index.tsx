import React, { useCallback, useMemo, useState, useEffect } from "react";
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
import {
  setCustomerAiQuota,
  setUserDetails,
  type UserMode,
} from "@/src/state/slices/userSlice";
import { useStore } from "react-redux";
import type { RootState } from "@/src/state/store";
import { getModeParam } from "@/src/services/userModeService";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
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
import RewardBalanceToggle from "@/src/components/rewards/RewardBalanceToggle";
import {
  pickInviteRewardDetails,
  refreshOwnInviteRewardDetails,
} from "@/src/services/rewardsService";
import {
  dollarsToCents,
  estimateTryOnReward,
  formatRewardMoney,
} from "@/src/utils/rewardMath";

// Android: reward held by the last Try-on sheet closed / failed without
// paying. Module level so it outlives this screen (leave and open it again).
// The store balance leaves it out; the next Pay call gives it back first, and
// the server frees it after 24h.
const HELD_REWARD_TTL_MS = 24 * 60 * 60 * 1000;
let heldReward: { userId: unknown; cents: number; at: number } | null = null;

const readHeldReward = (userId: unknown): number =>
  heldReward &&
  heldReward.userId === userId &&
  Date.now() - heldReward.at < HELD_REWARD_TTL_MS
    ? heldReward.cents
    : 0;

export default function TryOnPurchase() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const dispatch = useAppDispatch();
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const user = useAppSelector((state) => state.user);
  const store = useStore<RootState>();
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
  const rewardBalanceCents = useAppSelector(
    (state) => state.user.reward_balance_cents,
  );
  // Default ON whenever the reward row is shown
  const [useRewardBalance, setUseRewardBalance] = useState(true);
  // Held reward (see heldReward) is added back so the retry offers (and
  // sends) the same balance again.
  const userId = user.id ?? null;
  const [heldRewardCents, setHeldRewardCents] = useState(() =>
    readHeldReward(userId),
  );
  // newHold: a new sheet took it now (its 24h starts again)
  const saveHeldReward = (cents: number, newHold: boolean) => {
    const at = newHold || !heldReward ? Date.now() : heldReward.at;
    heldReward = cents > 0 ? { userId, cents, at } : null;
    setHeldRewardCents(cents > 0 ? cents : 0);
  };

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

  // Fresh balance each time the screen is shown (decides the reward row)
  useFocusEffect(
    useCallback(() => {
      if (user.isGuest) return;
      setHeldRewardCents(readHeldReward(userId));
      void refreshOwnInviteRewardDetails();
    }, [user.isGuest, userId]),
  );

  // FreshPass API price (never the App Store price), "$9.99" or "9.99"
  const packPrice = useMemo(() => {
    const n = parseFloat(String(service?.price ?? "").replace(/^\$/, ""));
    return Number.isFinite(n) && n > 0 ? n : 0;
  }, [service?.price]);
  const balanceCents = Math.max(0, rewardBalanceCents ?? 0) + heldRewardCents;
  const packPriceCents = dollarsToCents(packPrice);
  const rewardEstimate = useMemo(
    () => estimateTryOnReward(balanceCents, packPrice),
    [balanceCents, packPrice],
  );
  // Android: any balance that can apply (card keeps its $0.50 minimum) ·
  // iPhone: only when it covers the whole pack
  // Customer mode only: the reward balance never pays for business-mode credits
  const rewardRowShown =
    !user.isGuest &&
    user.userRole === "customer" &&
    !!service?.id &&
    packPriceCents > 0 &&
    (isIos ? balanceCents >= packPriceCents : rewardEstimate.reward > 0);
  const applyReward = rewardRowShown && useRewardBalance;
  const rewardEstimateText = !applyReward
    ? null
    : rewardEstimate.coversFull
      ? t("rwTryOnPaidFromBalance")
      : t("rwTryOnSplitEstimate", {
        reward: formatRewardMoney(rewardEstimate.reward),
        card: formatRewardMoney(rewardEstimate.card),
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

  const handleSkip = () => {
    dispatch(setTryOnPurchaseSuccessSource(null));
    router.back();
  };

  const refreshQuotaAndShowSuccess = async (
    quotaFromVerify?: number,
    creditedMode?: UserMode,
  ) => {
    dispatch(setActionLoader(true));
    dispatch(setActionLoaderTitle(t("pleaseWait")));

    try {
      // Read now, not at tap time: the user may have switched mid-purchase
      const activeMode: UserMode =
        store.getState().user.active_mode ?? "business";
      if (typeof quotaFromVerify === "number") {
        void refreshOwnInviteRewardDetails();
        if (!creditedMode || creditedMode === activeMode) {
          dispatch(setUserDetails({ ai_quota: quotaFromVerify }));
        } else if (creditedMode === "customer") {
          dispatch(setCustomerAiQuota(quotaFromVerify));
        }
        // Business balance credited while in customer mode: shown after switching back
      } else {
        const response = await ApiService.get<{
          success: boolean;
          data?: { ai_quota?: number };
        }>(userEndpoints.details);
        if (response.success && response.data) {
          dispatch(
            setUserDetails({
              ...(response.data.ai_quota !== undefined && {
                ai_quota: response.data.ai_quota,
              }),
              // Balance after the purchase (reward part may have been spent)
              ...pickInviteRewardDetails(response.data),
            }),
          );
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

  const handleIapPayment = async (purchaseMode?: UserMode) => {
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
      mode: purchaseMode,
    });

    await refreshQuotaAndShowSuccess(
      verifyResponse.data?.ai_quota,
      verifyResponse.data?.mode,
    );
  };

  /**
   * iPhone only: redeem the whole pack from the reward balance (reward_only).
   * Returns false when the balance no longer covers it (400) so the caller
   * falls back to the normal Apple purchase at full price. Never mixed.
   */
  const handleRewardOnlyPurchase = async (
    serviceIdForPurchase: number,
    purchaseMode?: UserMode,
  ): Promise<boolean> => {
    const showBalanceChanged = () => {
      void refreshOwnInviteRewardDetails();
      setLocalBanner({
        visible: true,
        title: t("rwTryOnBalanceChangedTitle"),
        message: t("rwTryOnBalanceChangedMessage"),
        type: "warning",
      });
    };
    try {
      const { paidWithRewards } = await fetchAiToolsPaymentSheetParams(
        serviceIdForPurchase,
        purchaseMode,
        { rewardOnly: true },
      );
      if (paidWithRewards) {
        await refreshQuotaAndShowSuccess();
        return true;
      }
      showBalanceChanged();
      return false;
    } catch (err: unknown) {
      if ((err as { status?: number })?.status === 400) {
        showBalanceChanged();
        return false;
      }
      throw err;
    }
  };

  const handleStripePayment = async (
    serviceIdForPurchase: number,
    purchaseMode?: UserMode,
    withRewardBalance?: boolean,
  ) => {
    // Retry Stripe key from API if startup fetch failed (e.g. no network)
    await ensureStripeReady();

    const {
      customer,
      paymentIntent,
      customerSessionClientSecret,
      paidWithRewards,
      rewardAmount,
    } = await fetchAiToolsPaymentSheetParams(
      serviceIdForPurchase,
      purchaseMode,
      withRewardBalance ? { useRewardBalance: true } : undefined,
    );

    // Balance covered the full price: credits already added, no sheet
    if (paidWithRewards) {
      saveHeldReward(0, false);
      await refreshQuotaAndShowSuccess();
      return;
    }

    // Not paid. A real sheet sent with the balance keeps its reward held
    // (left out of the fresh balance; it comes back first on the next Pay).
    // Otherwise (no sheet, or sent without the balance) only what left the
    // balance is held, at most what was held / asked for.
    const chargedCents =
      withRewardBalance && typeof rewardAmount === "number" && rewardAmount > 0
        ? dollarsToCents(rewardAmount)
        : 0;
    const balanceBefore = balanceCents;
    const prevHeld = heldRewardCents;
    const keepHeldReward = (sheetCreated: boolean) => {
      if (chargedCents <= 0 && prevHeld <= 0) return;
      void refreshOwnInviteRewardDetails().then((fresh) => {
        if (!fresh) return;
        if (sheetCreated && chargedCents > 0) {
          saveHeldReward(chargedCents, true);
          return;
        }
        const now = Math.max(0, Number(fresh.rewardBalanceCents) || 0);
        saveHeldReward(
          Math.min(
            Math.max(chargedCents, prevHeld),
            Math.max(0, balanceBefore - now),
          ),
          chargedCents > 0,
        );
      });
    };

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
      keepHeldReward(false);
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
      keepHeldReward(true);
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
      // The reward part stays held until the sheet completes (or 24h)
      keepHeldReward(true);
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

    saveHeldReward(0, false);
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

    // Credits go to the mode active right now, even if the user switches later
    const purchaseMode = getModeParam(user);

    try {
      if (isIos) {
        // Row only shows on iPhone when the balance covers the whole pack
        if (applyReward) {
          const paid = await handleRewardOnlyPurchase(service.id, purchaseMode);
          if (paid) return;
          // The loader (a Modal) and Apple's sheet both cover the in-app
          // banner: drop the loader briefly so "balance changed" is read
          // before the full-price Apple sheet opens.
          dispatch(setActionLoader(false));
          await new Promise((resolve) => setTimeout(resolve, 1500));
          dispatch(setActionLoader(true));
        }
        await handleIapPayment(purchaseMode);
        return;
      }

      await handleStripePayment(service.id, purchaseMode, applyReward);
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
            {rewardRowShown ? (
              <View style={styles.rewardBlock}>
                <RewardBalanceToggle
                  variant="onDark"
                  value={useRewardBalance}
                  onValueChange={setUseRewardBalance}
                  balanceCents={balanceCents}
                  appliedAmount={applyReward ? rewardEstimate.reward : null}
                />
                {rewardEstimateText ? (
                  <Text
                    style={styles.rewardEstimateText}
                    accessibilityLiveRegion="polite"
                  >
                    {rewardEstimateText}
                  </Text>
                ) : null}
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
