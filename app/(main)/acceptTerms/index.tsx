import React, { useMemo, useCallback } from "react";
import {
  StyleSheet,
  Text,
  View,
  ImageBackground,
  TouchableOpacity,
  BackHandler,
  StatusBar,
  Platform,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { useAppSelector, useTheme } from "@/src/hooks/hooks";
import { useTranslation } from "react-i18next";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  moderateHeightScale,
  moderateWidthScale,
} from "@/src/theme/dimensions";
import { IMAGES } from "@/src/constant/images";
import { MAIN_ROUTES } from "@/src/constant/routes";
import { LeafLogo } from "@/assets/icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.darkGreen,
    },
    backgroundImage: {
      flex: 1,
      width: "100%",
      height: "100%",
    },
    content: {
      flex: 1,
      paddingHorizontal: moderateWidthScale(15),
      paddingTop: moderateHeightScale(45),
    },
    logoContainer: {
      marginBottom: moderateHeightScale(70),
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    logoText: {
      fontSize: fontSize.size22,
      fontFamily: fonts.fontBold,
      color: theme.white,
    },
    headline: {
      fontSize: fontSize.size32,
      fontFamily: fonts.fontBold,
      color: theme.white,
      lineHeight: moderateHeightScale(40),
    },
    bodyText: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.white,
      lineHeight: moderateHeightScale(22),
    },
    boldText: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontBold,
      color: theme.white,
      lineHeight: moderateHeightScale(22),
    },
    buttonContainer: {
      marginTop: "auto",
      paddingTop: moderateHeightScale(20),
    },
    button: {
      backgroundColor: theme.orangeBrown,
      borderRadius: moderateWidthScale(12),
      paddingVertical: moderateHeightScale(14),
      alignItems: "center",
      justifyContent: "center",
    },
    buttonText: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
  });

export default function AcceptTerms() {
  const router = useRouter();
  const { colors } = useTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => createStyles(colors as Theme), [colors]);
  const insets = useSafeAreaInsets();
  const userRole = useAppSelector((state) => state.user.userRole);
  const isButtonMode = Platform.OS === "android" && insets.bottom > 30;

  // Disable back button
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        // Prevent going back
        return true;
      };

      const subscription = BackHandler.addEventListener(
        "hardwareBackPress",
        onBackPress,
      );

      return () => subscription.remove();
    }, []),
  );

  const handleGetStarted = useCallback(() => {
    userRole === "staff"
      ? router.replace(`/(main)/${MAIN_ROUTES.DASHBOARD}/${MAIN_ROUTES.HOME}`)
      : router.replace(`/(main)/${MAIN_ROUTES.INTRODUCTION}`);
  }, [router]);

  return (
    <View style={styles.container}>
      <StatusBar
        backgroundColor={"transparent"}
        barStyle={"light-content"}
        translucent={true}
      />
      <ImageBackground
        source={
          userRole === "staff" ? IMAGES.acceptTermBackS : IMAGES.acceptTermBackB
        }
        style={styles.backgroundImage}
        resizeMode="cover"
      >
        <View
          style={[
            styles.content,
            {
              paddingBottom: isButtonMode
                ? moderateHeightScale(30) + insets.bottom
                : moderateHeightScale(30),
            },
          ]}
        >
          <View style={styles.logoContainer}>
            <LeafLogo
              width={moderateWidthScale(25)}
              height={moderateWidthScale(33)}
              color1={(colors as Theme).white}
              color2={(colors as Theme).white}
            />
            <Text style={styles.logoText}>{t("freshPass")}</Text>
          </View>

          <View style={{ gap: moderateHeightScale(12) }}>
            {userRole === "business" ? (
              <>
                <Text style={styles.headline}>
                  Welcome to your new business command center
                </Text>

                <Text style={styles.boldText}>
                  FreshPass is designed to simplify your operations and grow
                  your revenue.
                </Text>

                <Text style={styles.bodyText}>
                  Easily manage team schedules, process payments, track
                  subscriptions, and monitor staff performance—all from one
                  powerful dashboard.
                </Text>

                <Text style={styles.bodyText}>
                  Stay connected on the go. Use the FreshPass mobile app to
                  manage bookings, send reminders, and view real-time business
                  insights from anywhere.
                </Text>
              </>
            ) : (
              <>
                <Text style={styles.headline}>
                  Welcome to the FreshPass service staff side
                </Text>

                <Text style={styles.bodyText}>
                  You’ve successfully created your profile on FreshPass
                  platform.
                </Text>
              </>
            )}
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.button}
              onPress={handleGetStarted}
              activeOpacity={0.7}
            >
              <Text style={styles.buttonText}>
                {userRole === "staff" ? "Go to dashboard" : "Get started"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ImageBackground>
    </View>
  );
}
