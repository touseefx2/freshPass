import { useAppSelector, useTheme, useAppDispatch } from "@/src/hooks/hooks";
import { useTranslation } from "react-i18next";
import React, { useMemo, useCallback, useEffect } from "react";
import { View, Text, StatusBar, Platform, Linking, Alert } from "react-native";
import {
  GoogleSignin,
  statusCodes,
} from "@react-native-google-signin/google-signin";
import {
  appleAuth,
  appleAuthAndroid,
} from "@invertase/react-native-apple-authentication";
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
import Logger from "@/src/services/logger";
import { ApiService } from "@/src/services/api";
import { businessEndpoints } from "@/src/services/endpoints";
import {
  setBusinessStatus,
  setUser,
  UserRole,
} from "@/src/state/slices/userSlice";
import {
  setAboutYourself,
  setBusinessName,
  setFullName,
  setSalonBusinessHours,
} from "@/src/state/slices/completeProfileSlice";
import { LoginManager, AccessToken } from "react-native-fbsdk-next";
type SocialProvider = "google" | "apple" | "facebook";
type SocialLoginApiResponse = {
  success: boolean;
  message: string;
  data?: {
    user: {
      id: number;
      name: string;
      email?: string;
      phone?: string;
      country_code?: string;
      profile_image_url?: string;
      role: string;
      rolesCount?: number;
      createdAt?: string;
      business_hours?: Array<{
        day: string;
        opening_time: string;
        closing_time: string;
        break_hours: Array<{
          start: string;
          end: string;
        }>;
      }>;
      is_onboarded?: boolean;
      business_name?: string;
      description?: string;
    };
    token: string;
    isNewCreated?: boolean;
  };
};
const TERMS_AND_CONDITIONS_URL = process.env.EXPO_PUBLIC_TERMS_URL || "";
const PRIVACY_POLICY_URL = process.env.EXPO_PUBLIC_PRIVACY_URL || "";
// IMPORTANT:
// 1. Android Client ID: Google Cloud Console mein Android OAuth client banayein (package name + SHA-1 ke saath) - ye Google Cloud Console mein configure hota hai
// 2. Web Client ID: Google Cloud Console mein Web Application OAuth client banayein - ye code mein use hoga
// Web Client ID code mein chahiye kyunki ID token backend verify karta hai, aur Web Client ID se hi ID token milta hai
const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || "";
const APPLE_IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || "";
const APPLE_ANDROID_CLIENT_ID =
  process.env.EXPO_PUBLIC_APPLE_ANDROID_CLIENT_ID || "";
const APPLE_ANDROID_REDIRECT_URI =
  process.env.EXPO_PUBLIC_APPLE_ANDROID_REDIRECT_URI || "";

export default function SocialLogin() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => createStyles(colors as Theme), [colors]);
  const insets = useSafeAreaInsets();
  const isButtonMode = Platform.OS === "android" && insets.bottom > 30;
  const router = useRouter();
  const dispatch = useAppDispatch();
  const selectedRole = useAppSelector((state) => state.general.role);
  const currentBusinessStatus = useAppSelector(
    (state) => state.user.businessStatus
  );
  console.log("selectedRole", selectedRole);

  const handleSocialLoginResponse = (response: SocialLoginApiResponse) => {
    if (response.success && response.data) {
      const { user, token, isNewCreated } = response.data;

      if (user && token) {
        const userRoleLower = user.role?.toLowerCase();

        if (userRoleLower === "customer") {
          dispatch(
            setUser({
              id: user.id,
              name: user.name || "",
              email: user.email || "",
              description: "",
              phone: user.phone || "",
              country_code: user.country_code || "",
              profile_image_url: user.profile_image_url || "",
              accessToken: token,
              userRole: (userRoleLower as UserRole) || null,
            })
          );

          if (isNewCreated) {
            dispatch(setFullName(user.name || ""));
            router.replace(`/${MAIN_ROUTES.COMPLETE_CUSTOMER_PROFILE}`);
          } else {
            router.replace(`/(main)/${MAIN_ROUTES.DASHBOARD}/(home)` as any);
          }
        }

        if (userRoleLower === "business") {
          dispatch(
            setUser({
              id: user.id,
              name: user.name || "",
              email: user.email || "",
              description: "",
              phone: user.phone || "",
              country_code: user.country_code || "",
              profile_image_url: user.profile_image_url || "",
              accessToken: token,
              userRole: (userRoleLower as UserRole) || null,
            })
          );

          if (isNewCreated) {
            dispatch(setFullName(user.name || ""));
            router.replace(`/${MAIN_ROUTES.REGISTER_NEXT_STEPS}`);
          } else {
            router.replace(`/(main)/${MAIN_ROUTES.DASHBOARD}/(home)` as any);
          }
        }

        if (userRoleLower === "staff") {
          dispatch(
            setUser({
              id: user.id,
              name: user.name || "",
              email: user.email || "",
              description: "",
              phone: user.phone || "",
              country_code: user.country_code || "",
              profile_image_url: user.profile_image_url || "",
              accessToken: token,
              userRole: (userRoleLower as UserRole) || null,
            })
          );

          if (user?.business_hours && Array.isArray(user.business_hours)) {
            const parsedBusinessHours: {
              [key: string]: {
                isOpen: boolean;
                fromHours: number;
                fromMinutes: number;
                tillHours: number;
                tillMinutes: number;
                breaks: Array<{
                  fromHours: number;
                  fromMinutes: number;
                  tillHours: number;
                  tillMinutes: number;
                }>;
              };
            } = {};
            user.business_hours.forEach((bh: any) => {
              // Convert day name to capitalized format (e.g., "monday" -> "Monday")
              const dayName =
                bh.day.charAt(0).toUpperCase() + bh.day.slice(1).toLowerCase();

              // Parse opening_time (HH:MM format) - handle null values
              const [openingHours, openingMinutes] = bh.opening_time
                ? bh.opening_time.split(":").map(Number)
                : [0, 0];

              // Parse closing_time (HH:MM format) - handle null values
              const [closingHours, closingMinutes] = bh.closing_time
                ? bh.closing_time.split(":").map(Number)
                : [0, 0];

              // Parse break_hours
              const breaks = (bh.break_hours || []).map((breakTime: any) => {
                const [breakStartHours, breakStartMinutes] = breakTime.start
                  ? breakTime.start.split(":").map(Number)
                  : [0, 0];
                const [breakEndHours, breakEndMinutes] = breakTime.end
                  ? breakTime.end.split(":").map(Number)
                  : [0, 0];

                return {
                  fromHours: breakStartHours,
                  fromMinutes: breakStartMinutes,
                  tillHours: breakEndHours,
                  tillMinutes: breakEndMinutes,
                };
              });

              parsedBusinessHours[dayName] = {
                isOpen: !bh.closed,
                fromHours: openingHours,
                fromMinutes: openingMinutes,
                tillHours: closingHours,
                tillMinutes: closingMinutes,
                breaks,
              };
            });

            dispatch(setSalonBusinessHours(parsedBusinessHours));
          }
          dispatch(setFullName(user?.name || ""));
          dispatch(setAboutYourself(user?.description || ""));
          dispatch(setBusinessName(user?.business_name || ""));

          if (user?.is_onboarded) {
            router.replace(`/(main)/${MAIN_ROUTES.DASHBOARD}/(home)` as any);
          } else {
            router.replace(
              `/(main)/${MAIN_ROUTES.COMPLETE_STAFF_PROFILE}` as any
            );
          }
          if (currentBusinessStatus) {
            dispatch(
              setBusinessStatus({
                ...currentBusinessStatus,
                onboarding_completed: user?.is_onboarded || false,
              })
            );
          }
        }
      }
    } else {
      Alert.alert(
        t("loginFailed"),
        response.message || t("socialLoginFailedTryAgain")
      );
    }
  };

  const generateRandomString = () =>
    Math.random().toString(36).substring(2) + Date.now().toString(36);

  useEffect(() => {
    if (Platform.OS !== "web") {
      try {
        GoogleSignin.configure({
          iosClientId: APPLE_IOS_CLIENT_ID, // iOS Client ID from Google Cloud Console (required for iOS)
          webClientId: GOOGLE_WEB_CLIENT_ID, // Web Client ID from Google Cloud Console (required for ID token)
          offlineAccess: true, // For server-side access to Google APIs
          forceCodeForRefreshToken: true, // [Android] Get serverAuthCode for backend
        });
      } catch (error) {
        Logger.error("Google Sign-In configuration error:", error);
      }
    }
  }, []);

  const handleSignInOrRegister = () => {
    router.push(`/${MAIN_ROUTES.LOGIN}`);
  };

  const handleGoogleLogin = async () => {
    try {
      // try {
      //   await GoogleSignin.signOut();
      // } catch (signOutError) {
      //   Logger.log("Google logout out error (ignored):", signOutError);
      // }

      // Check if Google Play Services are available (Android only)
      if (Platform.OS === "android") {
        await GoogleSignin.hasPlayServices({
          showPlayServicesUpdateDialog: true,
        });
      }

      // Sign in with Google - this will show account picker
      const userInfo = await GoogleSignin.signIn();

      if (!userInfo.data) {
        Alert.alert(t("error"), t("failedToGetUserFromGoogle"));
        return;
      }

      // Get the ID token
      const idToken = userInfo.data.idToken;
      if (!idToken) {
        Alert.alert(t("error"), t("failedToGetIdTokenFromGoogle"));
        return;
      }

      Logger.log("userInfo", userInfo);
      Logger.log("idToken", idToken);
      Logger.log("role", selectedRole);

      const response = await ApiService.post<SocialLoginApiResponse>(
        businessEndpoints.socialLogin,
        {
          provider: "google",
          token: idToken,
          role: selectedRole?.toLowerCase() ?? "",
        }
      );

      handleSocialLoginResponse(response);
    } catch (error: any) {
      Logger.error("Google Sign-In Error:", error);

      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        // User cancelled the login flow
        Logger.log("User cancelled Google Sign-In");
      } else if (error.code === statusCodes.IN_PROGRESS) {
        // Operation (e.g. sign in) is in progress already
        Logger.log("Google Sign-In already in progress");
      } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        // Play services not available or outdated
        Alert.alert(t("error"), t("googlePlayServicesNotAvailable"));
      } else {
        // Some other error happened
        Alert.alert(
          t("googleSignInFailed"),
          error.message || t("errorDuringGoogleSignIn")
        );
      }
    }
  };

  const handleAppleLogin = async () => {
    try {
      // Check if Apple Sign-In is available (iOS 13+)
      if (Platform.OS !== "ios") {
        Alert.alert(t("error"), t("appleSignInOnlyOnIos"));
        return;
      }

      if (!appleAuth.isSupported) {
        Alert.alert(t("error"), t("appleSignInNotAvailable"));
        return;
      }

      // Perform Apple Sign-In request
      const appleAuthRequestResponse = await appleAuth.performRequest({
        requestedOperation: appleAuth.Operation.LOGIN,
        requestedScopes: [appleAuth.Scope.EMAIL, appleAuth.Scope.FULL_NAME],
      });

      // Check if the request was successful
      if (!appleAuthRequestResponse.identityToken) {
        Alert.alert(t("error"), t("failedToGetIdentityTokenFromApple"));
        return;
      }

      // Get credential state to check if user is authenticated
      const credentialState = await appleAuth.getCredentialStateForUser(
        appleAuthRequestResponse.user
      );

      if (credentialState === appleAuth.State.REVOKED) {
        Alert.alert(t("error"), t("appleCredentialsRevoked"));
        return;
      }

      // Extract user information
      const { identityToken, authorizationCode, user, email, fullName } =
        appleAuthRequestResponse;

      Logger.log("Apple Sign-In Success:", {
        user,
        email,
        fullName,
        hasIdentityToken: !!identityToken,
        hasAuthorizationCode: !!authorizationCode,
      });

      // You can now send identityToken and authorizationCode to your backend
      // Backend will verify the token with Apple's servers
      if (identityToken) {
        Logger.log("Apple Identity Token:", identityToken);
      }
      if (authorizationCode) {
        Logger.log("Apple Authorization Code:", authorizationCode);
      }

      if (identityToken) {
        const response = await ApiService.post<SocialLoginApiResponse>(
          businessEndpoints.socialLogin,
          {
            provider: "apple",
            token: identityToken,
            role: selectedRole?.toLowerCase() ?? "",
          }
        );

        handleSocialLoginResponse(response);
      }
    } catch (error: any) {
      Logger.error("Apple Sign-In Error:", error);

      if (error.code === appleAuth.Error.CANCELED) {
        // User cancelled the login flow
        Logger.log("User cancelled Apple Sign-In");
      } else if (error.code === appleAuth.Error.NOT_HANDLED) {
        // Sign-In request was not handled
        Logger.log("Apple Sign-In request was not handled");
      } else if (error.code === appleAuth.Error.UNKNOWN) {
        // Unknown error occurred
        Alert.alert(
          t("appleSignInFailed"),
          error.message || t("unknownErrorDuringAppleSignIn")
        );
      } else {
        // Some other error happened
        Alert.alert(
          t("appleSignInFailed"),
          error.message || t("errorDuringAppleSignIn")
        );
      }
    }
  };

  const handleAppleLoginAndroid = async () => {
    try {
      if (!appleAuthAndroid.isSupported) {
        Alert.alert(t("error"), t("appleSignInNotAvailable"));
        return;
      }

      const rawNonce = generateRandomString();
      const state = generateRandomString();

      if (!APPLE_ANDROID_CLIENT_ID || !APPLE_ANDROID_REDIRECT_URI) {
        Logger.error("Apple Android config missing", {
          APPLE_ANDROID_CLIENT_ID_SET: !!APPLE_ANDROID_CLIENT_ID,
          APPLE_ANDROID_REDIRECT_URI_SET: !!APPLE_ANDROID_REDIRECT_URI,
        });
        Alert.alert(t("error"), t("appleSignInNotAvailable"));
        return;
      }

      appleAuthAndroid.configure({
        clientId: APPLE_ANDROID_CLIENT_ID,
        redirectUri: APPLE_ANDROID_REDIRECT_URI,
        responseType: appleAuthAndroid.ResponseType.ALL,
        scope: appleAuthAndroid.Scope.ALL,
        nonce: rawNonce,
        state,
      });

      const response = await appleAuthAndroid.signIn();

      Logger.log("Apple Android Sign-In response:", response);

      const idToken = response.id_token;

      if (!idToken) {
        Alert.alert(t("error"), t("failedToGetIdentityTokenFromApple"));
        return;
      }

      const apiResponse = await ApiService.post<SocialLoginApiResponse>(
        businessEndpoints.socialLogin,
        {
          provider: "apple",
          token: idToken,
          role: selectedRole?.toLowerCase() ?? "",
        }
      );

      handleSocialLoginResponse(apiResponse);
    } catch (error: any) {
      Logger.error("Apple Android Sign-In Error:", error);
      Alert.alert(
        t("appleSignInFailed"),
        error.message || t("errorDuringAppleSignIn")
      );
    }
  };

  const handleFacebookLogin = async () => {
    try {
      // Login dialog open karo
      const result = await LoginManager.logInWithPermissions([
        "public_profile",
        "email",
      ]);

      if (result.isCancelled) {
        Logger.log("User cancelled Facebook login");
        return;
      }

      // Access token lo
      const data = await AccessToken.getCurrentAccessToken();

      if (!data || !data.accessToken) {
        Alert.alert(t("error"), t("failedToGetUserFromFacebook"));
        return;
      }

      const fbAccessToken = data.accessToken.toString();

      Logger.log("Facebook Access Token:", fbAccessToken);
      Logger.log("role", selectedRole);

      const response = await ApiService.post<SocialLoginApiResponse>(
        businessEndpoints.socialLogin,
        {
          provider: "facebook",
          token: fbAccessToken,
          role: selectedRole?.toLowerCase() ?? "",
        }
      );

      handleSocialLoginResponse(response);
    } catch (error: any) {
      Logger.error("Facebook Login Error:", error);
      Alert.alert(
        t("facebookSignInFailed"),
        error.message || t("errorDuringFacebookSignIn")
      );
    }
  };

  const handleSocialLogin = async (provider: SocialProvider) => {
    if (provider === "google") {
      await handleGoogleLogin();
    } else if (provider === "apple") {
      if (Platform.OS === "ios") {
        await handleAppleLogin();
      } else if (Platform.OS === "android") {
        await handleAppleLoginAndroid();
      }
    } else if (provider === "facebook") {
      await handleFacebookLogin();
    }
  };

  const handleGuestLogin = () => {
    router.push(`/${MAIN_ROUTES.INTRODUCTION_CLIENT}`);
  };

  const handleOpenLink = useCallback(async (url: string, title: string) => {
    if (!url) {
      Alert.alert(t("error"), `${title} ${t("urlNotConfigured")}`);
      return;
    }

    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert(t("error"), `${t("cannotOpen")} ${title}`);
      }
    } catch (error) {
      Logger.error("Error opening link:", error);
      Alert.alert(t("error"), `${t("failedToOpenLink")} ${title}`);
    }
  }, []);

  const handleTermsPress = useCallback(() => {
    handleOpenLink(TERMS_AND_CONDITIONS_URL, "Terms of Services");
  }, [handleOpenLink]);

  const handlePrivacyPress = useCallback(() => {
    handleOpenLink(PRIVACY_POLICY_URL, "Privacy Policy");
  }, [handleOpenLink]);

  const isGuest = selectedRole === "customer" ? true : false; // Set to true to show guest login button

  return (
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

          {/* <View style={styles.paginationDots}>
            <View style={styles.dotOuter} />
            <View style={styles.dotActive} />
            <View style={styles.dotOuter} />
            <View style={styles.dotOuter} />
          </View> */}
        </View>
      </View>

      <View
        style={[
          styles.bottomSection,
          {
            paddingBottom: isButtonMode
              ? insets.bottom + 12
              : moderateHeightScale(25),
          },
          !isGuest && { gap: moderateHeightScale(18) },
        ]}
      >
        <Button
          title={t("signInOrRegister")}
          onPress={handleSignInOrRegister}
        />

        <SectionSeparator />

        <SocialAuthOptions
          onGoogle={() => handleSocialLogin("google")}
          onApple={() => handleSocialLogin("apple")}
          onFacebook={() => handleSocialLogin("facebook")}
          onGuest={handleGuestLogin}
          isGuest={isGuest}
          containerStyle={
            // !isGuest
            //   ? {
            //       gap: moderateHeightScale(18),
            //     }
            //   :
            {}
          }
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
    </SafeAreaView>
  );
}
