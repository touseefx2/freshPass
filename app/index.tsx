import { router } from "expo-router";
import { MAIN_ROUTES } from "@/src/constant/routes";
import { resetToDashboardHome } from "@/src/utils/navigation";
import { useAppSelector, useTheme } from "@/src/hooks/hooks";
import { StatusBar, StyleSheet, View } from "react-native";
import { Theme } from "@/src/theme/colors";
import LottieView from "lottie-react-native";
import { IMAGES } from "@/src/constant/images";
import { moderateWidthScale } from "@/src/theme/dimensions";
import { memo, useCallback, useEffect, useMemo, useRef } from "react";
import Logger from "@/src/services/logger";
import {
  consumePendingNotificationNavigation,
  consumeSignedOutNotificationNavigation,
  queueColdStartNotificationIfNeeded,
} from "@/src/services/pendingNotificationNavigation";
import {
  captureDeferredInviteOnFirstLaunch,
  captureInstallReferrerInviteOnce,
  openPendingInviteNotice,
  preloadPendingInviteCode,
} from "@/src/services/pendingInviteCode";

// Safety net in case the Lottie splash never fires onAnimationFinish /
// onAnimationFailure on some devices (seen intermittently on certain
// Android/iOS builds), which would otherwise leave the user stuck on the
// splash screen forever.
// Animation is ~3.8s and can take ~1s to load on Android, so keep this well above 5s.
const SPLASH_FALLBACK_TIMEOUT_MS = 7000;

// Memoized so splash re-renders (user state updating at startup) never
// re-send the animation JSON to LottieView (that resets it on Android).
const SplashLogo = memo(function SplashLogo({
  style,
  onFinish,
}: {
  style: any;
  onFinish: () => void;
}) {
  return (
    <LottieView
      source={IMAGES.welcomeLogo}
      autoPlay
      loop={false}
      onAnimationFinish={onFinish}
      onAnimationFailure={(error) => {
        Logger.error("Animation failed:", error);
        onFinish();
      }}
      style={style}
    />
  );
});

export default function Index() {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);
  const user = useAppSelector((state) => state.user);
  const accessToken = user.accessToken;
  const userRole = user.userRole;
  const isGuest = user.isGuest;
  const hasNavigatedRef = useRef(false);

  const handleNavigation = async () => {
    if (hasNavigatedRef.current) {
      return;
    }
    hasNavigatedRef.current = true;

    // A logged-in session is only valid if we have BOTH a token and a role.
    // Stale/partially-restored local storage (e.g. Android auto-backup restoring
    // an old accessToken after reinstall, or an interrupted login) can leave
    // accessToken set with userRole still null, which used to send users to the
    // home screen where they'd get stuck on an infinite loader. Guests are fine
    // without a role since they never log in.
    const hasValidSession = (!!accessToken && !!userRole) || isGuest;

    // Queue cold-start notification tap before routing so consume runs after splash.
    if (accessToken) {
      await queueColdStartNotificationIfNeeded();
    }

    if (hasValidSession) {
      resetToDashboardHome();
      consumePendingNotificationNavigation(router);
    } else {
      router.replace(`/(main)/${MAIN_ROUTES.ROLE}` as any);
      // Signed out: an invite link opened at launch stays held, no notice
      openPendingInviteNotice();
      // Drops the queued tap; a removed staff member's tap opens sign-in on top
      void consumeSignedOutNotificationNavigation(router);
    }
  };

  // Always run the latest handleNavigation (fresh user state) from a stable callback
  const handleNavigationRef = useRef(handleNavigation);
  handleNavigationRef.current = handleNavigation;
  const onSplashFinish = useCallback(() => {
    void handleNavigationRef.current();
  }, []);

  useEffect(() => {
    // Invite a Pro code: load the held one; Android reads the Play install
    // referrer once. Fire and forget — never delays the splash.
    preloadPendingInviteCode();
    void captureInstallReferrerInviteOnce();
    // iPhone: invite click saved by the server before the App Store (once)
    void captureDeferredInviteOnFirstLaunch();
    const fallbackTimer = setTimeout(
      onSplashFinish,
      SPLASH_FALLBACK_TIMEOUT_MS,
    );
    return () => clearTimeout(fallbackTimer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="light-content"
        backgroundColor={theme.darkGreen}
        translucent
      />
      <SplashLogo style={styles.logo} onFinish={onSplashFinish} />
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.darkGreen,
      alignItems: "center",
      justifyContent: "center",
    },
    logo: {
      width: moderateWidthScale(500),
      height: moderateWidthScale(500),
    },
  });
