import { router } from "expo-router";
import { MAIN_ROUTES } from "@/src/constant/routes";
import { resetToDashboardHome } from "@/src/utils/navigation";
import { useAppSelector, useTheme } from "@/src/hooks/hooks";
import { StatusBar, StyleSheet, View } from "react-native";
import { Theme } from "@/src/theme/colors";
import LottieView from "lottie-react-native";
import { IMAGES } from "@/src/constant/images";
import { moderateWidthScale } from "@/src/theme/dimensions";
import { useEffect, useMemo, useRef } from "react";

// Safety net in case the Lottie splash never fires onAnimationFinish /
// onAnimationFailure on some devices (seen intermittently on certain
// Android/iOS builds), which would otherwise leave the user stuck on the
// splash screen forever.
const SPLASH_FALLBACK_TIMEOUT_MS = 4000;

export default function Index() {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);
  const user = useAppSelector((state) => state.user);
  const accessToken = user.accessToken;
  const userRole = user.userRole;
  const isGuest = user.isGuest;
  const hasNavigatedRef = useRef(false);

  const handleNavigation = () => {
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

    if (hasValidSession) {
      resetToDashboardHome();
    } else {
      router.replace(`/(main)/${MAIN_ROUTES.ROLE}` as any);
    }
  };

  useEffect(() => {
    const fallbackTimer = setTimeout(
      handleNavigation,
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
      <LottieView
        source={IMAGES.welcomeLogo}
        autoPlay
        loop={false}
        onAnimationFinish={handleNavigation}
        onAnimationFailure={(error) => {
          console.error("Animation failed:", error);
          handleNavigation();
        }}
        style={styles.logo}
      />
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
