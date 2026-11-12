import { useAppSelector, useTheme } from "@/src/hooks/hooks";
import { useSocialLogin } from "@/src/hooks/useSocialLogin";
import { useTranslation } from "react-i18next";
import React, { useMemo, useCallback, useState } from "react";
import { View, Text, StatusBar, Platform, Alert } from "react-native";
import { Image } from "expo-image";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { createStyles } from "./styles";
import { Theme } from "@/src/theme/colors";
import { IMAGES } from "@/src/constant/images";
import { LeafLogo } from "@/assets/icons";
import Button from "@/src/components/button";
import {
  moderateHeightScale,
  moderateWidthScale,
} from "@/src/theme/dimensions";
import { useRouter } from "expo-router";
import { MAIN_ROUTES } from "@/src/constant/routes";
import SocialAuthOptions from "@/src/components/socialAuthOptions";
import SectionSeparator from "@/src/components/sectionSeparator";
import WebViewModal from "@/src/components/webViewModal";

const TERMS_AND_CONDITIONS_URL = process.env.EXPO_PUBLIC_TERMS_URL || "";
const PRIVACY_POLICY_URL = process.env.EXPO_PUBLIC_PRIVACY_URL || "";

export default function SocialLogin() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => createStyles(colors as Theme), [colors]);
  const insets = useSafeAreaInsets();
  const isButtonMode = Platform.OS === "android" && insets.bottom > 30;
  const router = useRouter();
  const selectedRole = useAppSelector((state) => state.general.role);
  const { handleSocialLogin } = useSocialLogin();
  const [webViewUrl, setWebViewUrl] = useState("");
  const [webViewTitle, setWebViewTitle] = useState("");
  const [webViewVisible, setWebViewVisible] = useState(false);

  const handleSignInOrRegister = () => {
    router.push(`/${MAIN_ROUTES.LOGIN}`);
  };

  const handleGuestLogin = () => {
    router.push(`/${MAIN_ROUTES.INTRODUCTION_CLIENT}`);
  };

  const handleTermsPress = useCallback(() => {
    if (!TERMS_AND_CONDITIONS_URL) {
      Alert.alert(t("error"), `Terms of Services ${t("urlNotConfigured")}`);
      return;
    }
    setWebViewUrl(TERMS_AND_CONDITIONS_URL);
    setWebViewTitle(t("termsOfService"));
    setWebViewVisible(true);
  }, [t]);

  const handlePrivacyPress = useCallback(() => {
    if (!PRIVACY_POLICY_URL) {
      Alert.alert(t("error"), `Privacy Policy ${t("urlNotConfigured")}`);
      return;
    }
    setWebViewUrl(PRIVACY_POLICY_URL);
    setWebViewTitle(t("privacyPolicy"));
    setWebViewVisible(true);
  }, [t]);

  const isGuest = selectedRole === "customer" ? true : false; // Set to true to show guest login button

  return (
  <>
    <SafeAreaView style={styles.container}>
      <StatusBar
        animated
        translucent
        backgroundColor={"transparent"}
        barStyle={"light-content"}
      />
      <View style={styles.backgroundImageContainer}>
        <Image
          source={IMAGES.socialBackgroud}
          style={[
            styles.backgroundImage,
            {
              bottom: !isButtonMode ? 90 : 70,
            },
          ]}
        />
      </View>

      <View
        style={[
          styles.bottomSection,
          {
            paddingBottom: isButtonMode
              ? insets.bottom + 5
              : moderateHeightScale(24),
          },
          // !isGuest && { gap: moderateHeightScale(18) },
        ]}
      >
        <Button
          title={t("signInOrRegister")}
          onPress={handleSignInOrRegister}
          containerStyle={{ width: "100%" }}
        />

        <SectionSeparator />

        <SocialAuthOptions
          onGoogle={() => handleSocialLogin("google")}
          onApple={() => handleSocialLogin("apple")}
          onFacebook={() => handleSocialLogin("facebook")}
          onGuest={handleGuestLogin}
          isGuest={isGuest}
        />

        <Text style={styles.legalText}>
          {t("byContinuingYouAgree")}{" "}
          <Text style={styles.legalLink} onPress={handleTermsPress}>
            {t("termsOfService")}
          </Text>{" "}
          &{" "}
          <Text style={styles.legalLink} onPress={handlePrivacyPress}>
            {t("privacyPolicy")}
          </Text>
        </Text>
      </View>

      <View style={styles.topSection}>
        <View style={styles.logoContainer}>
          <LeafLogo
            width={moderateWidthScale(25)}
            height={moderateWidthScale(33)}
            color1={(colors as Theme).white}
            color2={(colors as Theme).white}
          />
          <Text style={styles.logoText}>{t("freshPass")}</Text>
        </View>

        <View style={styles.taglineContainer}>
          <Text style={styles.tagline1}>
            {t("alwaysReadyAlwaysYouShort").split(" ").slice(0, 2).join(" ")}{" "}
            <Text style={styles.tagline2}>
              {t("alwaysReadyAlwaysYouShort").split(" ").slice(2).join(" ")}
            </Text>
          </Text>
        </View>
      </View>
    </SafeAreaView>
    <WebViewModal
      visible={webViewVisible}
      url={webViewUrl}
      title={webViewTitle}
      onClose={() => setWebViewVisible(false)}
    />
  </>
  );
}
