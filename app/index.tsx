import { router } from "expo-router";
import { MAIN_ROUTES } from "@/src/constant/routes";
import { useAppSelector, useTheme } from "@/src/hooks/hooks";
import { StatusBar, StyleSheet, View } from "react-native";
import { Theme } from "@/src/theme/colors";
import LottieView from "lottie-react-native";
import { IMAGES } from "@/src/constant/images";
import { moderateWidthScale } from "@/src/theme/dimensions";
import { useMemo } from "react";


export default function Index() {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);
  const user = useAppSelector((state) => state.user);
  const accessToken = user.accessToken;
  const isGuest = user.isGuest;
  console.log("----> accessToken", accessToken);
  console.log("----> isGuest", isGuest);


  const handleNavigation = () => {
    if (accessToken || isGuest) {
      router.replace(`/(main)/${MAIN_ROUTES.DASHBOARD}/(home)` as any);
    } else {
      router.replace(`/(main)/${MAIN_ROUTES.ROLE}` as any);
    }
  };


  return (
    <View
      style={styles.container}
    >
      <StatusBar barStyle="light-content" backgroundColor={theme.darkGreen} translucent />
      <LottieView
        source={IMAGES.welcomeLogo}
        autoPlay
        // loop={true}
        loop={false}
        onAnimationFinish={handleNavigation}
        onAnimationFailure={(error) => {
          console.error("Animation failed:", error);
          handleNavigation();
        }}
        style={styles.logo} />
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
      height: moderateWidthScale(500)
    }

  });