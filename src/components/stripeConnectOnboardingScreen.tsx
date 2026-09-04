import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  InteractionManager,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import {
  ConnectAccountOnboarding,
  ConnectComponentsProvider,
  loadConnectAndInitialize,
  type StripeConnectInstance,
} from "@stripe/stripe-react-native";
import { MaterialIcons } from "@expo/vector-icons";
import Button from "@/src/components/button";
import { useAppDispatch, useAppSelector, useTheme } from "@/src/hooks/hooks";
import { setBusinessStatus } from "@/src/state/slices/userSlice";
import {
  createAccountSessionClientSecret,
  fetchConnectStatus,
  getLastAccountSessionError,
  isConnectOnboardingCompleted,
  StripeConnectApiError,
} from "@/src/services/stripeConnectService";
import { resolveStripePublishableKey } from "@/src/services/stripeService";
import { checkInternetConnection } from "@/src/services/api";
import { useNotificationContext } from "@/src/contexts/NotificationContext";
import Logger from "@/src/services/logger";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  iconScale,
  heightScale,
  moderateHeightScale,
  moderateWidthScale,
  widthScale,
} from "@/src/theme/dimensions";
import { IMAGES } from "@/src/constant/images";

const STRIPE_LOCALE: Record<string, string> = {
  en: "en-US",
  fr: "fr-FR",
  es: "es-ES",
  de: "de-DE",
  ja: "ja-JP",
};

/** Let any prior RN Modal finish dismissing before Stripe UIKit present(). */
const IOS_PRESENT_DELAY_MS = 450;
/** If Connect sheet never reports load, leave the infinite spinner. */
const CONNECT_LOAD_TIMEOUT_MS = 30000;

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: moderateWidthScale(16),
      paddingVertical: moderateHeightScale(8),
    },
    headerSide: {
      width: moderateWidthScale(40),
      alignItems: "center",
      justifyContent: "center",
    },
    headerCenter: {
      flex: 1,
      alignItems: "center",
    },
    logo: {
      width: widthScale(120),
      height: heightScale(28),
    },
    poweredBy: {
      marginTop: moderateHeightScale(2),
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
    },
    body: {
      flex: 1,
      paddingHorizontal: moderateWidthScale(24),
      justifyContent: "center",
      alignItems: "center",
    },
    iconCircle: {
      width: moderateWidthScale(72),
      height: moderateWidthScale(72),
      borderRadius: moderateWidthScale(36),
      backgroundColor: theme.buttonBack,
      justifyContent: "center",
      alignItems: "center",
      marginBottom: moderateHeightScale(20),
    },
    title: {
      fontSize: fontSize.size22,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      textAlign: "center",
      marginBottom: moderateHeightScale(8),
    },
    message: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.text,
      textAlign: "center",
      lineHeight: moderateHeightScale(22),
      marginBottom: moderateHeightScale(24),
    },
    footer: {
      paddingHorizontal: moderateWidthScale(24),
      paddingBottom: moderateHeightScale(16),
    },
    footerBox: {
      backgroundColor: theme.lightGreen05,
      borderRadius: moderateWidthScale(12),
      paddingHorizontal: moderateWidthScale(14),
      paddingVertical: moderateHeightScale(12),
    },
    footerText: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      textAlign: "center",
      lineHeight: moderateHeightScale(18),
    },
    buttonWrap: {
      width: "100%",
      marginTop: moderateHeightScale(8),
    },
  });

type ScreenPhase = "loading" | "onboarding" | "checking" | "success" | "error";

function waitForUiIdle(delayMs: number): Promise<void> {
  return new Promise((resolve) => {
    InteractionManager.runAfterInteractions(() => {
      if (delayMs <= 0) {
        resolve();
        return;
      }
      setTimeout(resolve, delayMs);
    });
  });
}

export default function StripeConnectOnboardingScreen() {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { showBanner } = useNotificationContext();
  const businessStatus = useAppSelector((state) => state.user.businessStatus);
  const businessStatusRef = useRef(businessStatus);
  businessStatusRef.current = businessStatus;

  const connectInstanceRef = useRef<StripeConnectInstance | null>(null);
  const exitingRef = useRef(false);
  const [phase, setPhase] = useState<ScreenPhase>("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [retryToken, setRetryToken] = useState(0);
  const [showStripeModal, setShowStripeModal] = useState(false);
  const [connectUiReady, setConnectUiReady] = useState(false);
  const [connectInstance, setConnectInstance] =
    useState<StripeConnectInstance | null>(null);

  const mapSessionError = useCallback(
    (error: unknown) => {
      const status = (error as StripeConnectApiError)?.status;
      if (status === 409) return t("stripeConnectModeMismatch");
      if (status === 404) return t("stripeConnectBusinessNotFound");
      if (status === 403) return t("stripeConnectNotAllowed");
      return (
        (error as Error)?.message || t("stripeConnectLoadError")
      );
    },
    [t],
  );

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      setPhase("loading");
      setErrorMessage("");
      setShowStripeModal(false);
      setConnectUiReady(false);
      setConnectInstance(null);
      connectInstanceRef.current = null;
      exitingRef.current = false;

      const hasInternet = await checkInternetConnection();
      if (!hasInternet) {
        if (!cancelled) {
          setErrorMessage(t("pleaseCheckInternetConnection"));
          setPhase("error");
        }
        return;
      }

      if (Platform.OS === "web") {
        if (!cancelled) {
          setErrorMessage(t("stripeConnectWebFallback"));
          setPhase("error");
        }
        return;
      }

      try {
        const publishableKey = await resolveStripePublishableKey();
        if (!publishableKey) {
          throw new Error(t("stripeConnectLoadError"));
        }

        const locale = STRIPE_LOCALE[i18n.language] ?? "en-US";
        const instance = loadConnectAndInitialize({
          publishableKey,
          fetchClientSecret: createAccountSessionClientSecret,
          locale,
          appearance: {
            variables: {
              colorPrimary: theme.buttonBack,
              colorBackground: theme.background,
              colorText: theme.text,
              buttonPrimaryColorBackground: theme.buttonBack,
              buttonPrimaryColorText: theme.buttonText,
            },
          },
        });

        connectInstanceRef.current = instance;

        // iOS Release: UIKit present() fails if another modal dismiss is in flight.
        await waitForUiIdle(
          Platform.OS === "ios" ? IOS_PRESENT_DELAY_MS : 0,
        );

        if (!cancelled) {
          setConnectInstance(instance);
          setShowStripeModal(true);
          setPhase("onboarding");
        }
      } catch (error) {
        Logger.warn("[StripeConnect] Failed to initialize", error);
        if (!cancelled) {
          setErrorMessage(mapSessionError(error));
          setPhase("error");
        }
      }
    };

    void init();
    return () => {
      cancelled = true;
    };
    // Recreate the Connect instance only on explicit retry — rebuilding it
    // restarts onboarding.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [retryToken]);

  useEffect(() => {
    if (phase !== "onboarding" || !showStripeModal || connectUiReady) {
      return;
    }

    const timer = setTimeout(() => {
      Logger.warn("[StripeConnect] Connect UI load timed out");
      setShowStripeModal(false);
      setErrorMessage(t("stripeConnectLoadError"));
      setPhase("error");
    }, CONNECT_LOAD_TIMEOUT_MS);

    return () => clearTimeout(timer);
  }, [phase, showStripeModal, connectUiReady, t]);

  const applyConnectStatus = useCallback(
    (stripeOnboardingStatus: string) => {
      const current = businessStatusRef.current;
      if (!current) return;
      dispatch(
        setBusinessStatus({
          ...current,
          stripe_onboarding_status: stripeOnboardingStatus,
        }),
      );
    },
    [dispatch],
  );

  const handleExit = useCallback(async () => {
    if (exitingRef.current) return;
    exitingRef.current = true;
    setShowStripeModal(false);
    setPhase("checking");

    try {
      const status = await fetchConnectStatus();
      applyConnectStatus(status.stripe_onboarding_status);

      if (isConnectOnboardingCompleted(status)) {
        setPhase("success");
        return;
      }
      if (router.canGoBack()) {
        router.back();
      }
    } catch (error) {
      Logger.warn("[StripeConnect] Status check failed", error);
      showBanner(
        t("stripeConnect"),
        mapSessionError(error),
        "error",
        2500,
      );
      if (router.canGoBack()) {
        router.back();
      }
    }
  }, [applyConnectStatus, mapSessionError, router, showBanner, t]);

  const handleLoadError = useCallback(
    ({ error }: { error?: { type?: string; message?: string } }) => {
      const sessionError = getLastAccountSessionError();
      const message = sessionError
        ? mapSessionError(sessionError)
        : error?.message || t("stripeConnectLoadError");
      setShowStripeModal(false);
      setConnectUiReady(false);
      setErrorMessage(message);
      setPhase("error");
    },
    [mapSessionError, t],
  );

  const markConnectUiReady = useCallback(() => {
    setConnectUiReady(true);
  }, []);

  const handleRetry = () => {
    connectInstanceRef.current = null;
    setConnectInstance(null);
    setShowStripeModal(false);
    setConnectUiReady(false);
    setRetryToken((value) => value + 1);
  };

  const handleClose = () => {
    if (phase === "checking") return;
    if (phase === "onboarding") {
      setShowStripeModal(false);
    }
    if (router.canGoBack()) {
      router.back();
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <View style={styles.headerSide}>
          {phase !== "checking" ? (
            <TouchableOpacity
              onPress={handleClose}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              accessibilityRole="button"
            >
              <MaterialIcons
                name="close"
                size={iconScale(24)}
                color={theme.text}
              />
            </TouchableOpacity>
          ) : null}
        </View>
        <View style={styles.headerCenter}>
          <Image
            source={IMAGES.logo3d}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.poweredBy}>{t("stripeConnectPoweredBy")}</Text>
        </View>
        <View style={styles.headerSide} />
      </View>

      <View style={styles.body}>
        {phase === "success" ? (
          <>
            <View style={styles.iconCircle}>
              <MaterialIcons
                name="check"
                size={iconScale(32)}
                color={theme.buttonText}
              />
            </View>
            <Text style={styles.title}>{t("stripeConnectSuccessTitle")}</Text>
            <Text style={styles.message}>
              {t("stripeConnectSuccessMessage")}
            </Text>
            <View style={styles.buttonWrap}>
              <Button
                title={t("stripeConnectContinue")}
                onPress={() => {
                  if (router.canGoBack()) router.back();
                }}
              />
            </View>
          </>
        ) : phase === "error" ? (
          <>
            <Text style={styles.title}>{t("stripeConnectOnboardingTitle")}</Text>
            <Text style={styles.message}>{errorMessage}</Text>
            <View style={styles.buttonWrap}>
              <Button title={t("stripeConnectRetry")} onPress={handleRetry} />
            </View>
          </>
        ) : (
          <>
            <ActivityIndicator size="large" color={theme.buttonBack} />
            <Text style={[styles.message, { marginTop: moderateHeightScale(16) }]}>
              {phase === "checking"
                ? t("processingText")
                : t("stripeConnectOnboardingTitle")}
            </Text>
          </>
        )}
      </View>

      <View style={styles.footer}>
        <View style={styles.footerBox}>
          <Text style={styles.footerText}>{t("stripeConnectSecureFooter")}</Text>
        </View>
      </View>

      {connectInstance && showStripeModal ? (
        <ConnectComponentsProvider connectInstance={connectInstance}>
          <ConnectAccountOnboarding
            title={t("stripeConnectOnboardingTitle")}
            onExit={() => {
              void handleExit();
            }}
            onLoaderStart={markConnectUiReady}
            onPageDidLoad={markConnectUiReady}
            onLoadError={handleLoadError}
          />
        </ConnectComponentsProvider>
      ) : null}
    </SafeAreaView>
  );
}
