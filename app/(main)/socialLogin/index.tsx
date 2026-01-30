import { useAppSelector, useTheme, useAppDispatch } from "@/src/hooks/hooks";
import React, { useMemo, useCallback, useEffect } from "react";
import { View, Text, StatusBar, Platform, Linking, Alert } from "react-native";
import {
  GoogleSignin,
  statusCodes,
} from "@react-native-google-signin/google-signin";
import appleAuth, {
  AppleRequestOperation,
  AppleRequestScope,
  AppleCredentialState,
  AppleError,
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
import { setUser, UserRole } from "@/src/state/slices/userSlice";
import { setFullName } from "@/src/state/slices/completeProfileSlice";
type SocialProvider = "google" | "apple" | "facebook";
const TERMS_AND_CONDITIONS_URL = process.env.EXPO_PUBLIC_TERMS_URL || "";
const PRIVACY_POLICY_URL = process.env.EXPO_PUBLIC_PRIVACY_URL || "";
// Get Google Web Client ID from environment
// IMPORTANT:
// 1. Android Client ID: Google Cloud Console mein Android OAuth client banayein (package name + SHA-1 ke saath) - ye Google Cloud Console mein configure hota hai
// 2. Web Client ID: Google Cloud Console mein Web Application OAuth client banayein - ye code mein use hoga
// Web Client ID code mein chahiye kyunki ID token backend verify karta hai, aur Web Client ID se hi ID token milta hai
const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || "";
const APPLE_IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || "";

export default function SocialLogin() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors as Theme), [colors]);
  const insets = useSafeAreaInsets();
  const isButtonMode = Platform.OS === "android" && insets.bottom > 30;
  const router = useRouter();
  const dispatch = useAppDispatch();
  const selectedRole = useAppSelector((state) => state.general.role);
  console.log("selectedRole", selectedRole);

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
        Alert.alert("Error", "Failed to get user information from Google");
        return;
      }

      // Get the ID token
      const idToken = userInfo.data.idToken;
      if (!idToken) {
        Alert.alert("Error", "Failed to get ID token from Google");
        return;
      }

      Logger.log("userInfo", userInfo);
      Logger.log("idToken", idToken);
      Logger.log("role", selectedRole);

      const response = await ApiService.post<{
        success: boolean;
        message: string;
        data: {
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
          };
          token: string;
          isNewCreated?: boolean;
        };
      }>(businessEndpoints.socialLogin, {
        provider: "google",
        token: idToken,
        role: selectedRole?.toLowerCase() ?? "",
      });

      if (response.success && response.data) {
        const { user, token, isNewCreated } = response.data;
        if (user && token) {
          if (user?.role?.toLowerCase() === "customer") {
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
                userRole: (user.role?.toLowerCase() as UserRole) || null,
              }),
            );

            if (isNewCreated) {
              dispatch(setFullName(user.name || ""));
              router.replace(`/${MAIN_ROUTES.COMPLETE_CUSTOMER_PROFILE}`);
            } else {
              router.replace(`/(main)/${MAIN_ROUTES.DASHBOARD}/(home)` as any);
            }
          }
          // if (user?.role?.toLowerCase() === "business") {
          // }
        }
      } else {
        Alert.alert(
          "Login Failed",
          response.message || "Social login failed. Please try again.",
        );
      }
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
        Alert.alert(
          "Error",
          "Google Play Services is not available. Please update Google Play Services.",
        );
      } else {
        // Some other error happened
        Alert.alert(
          "Google Sign-In Failed",
          error.message || "An error occurred during Google Sign-In",
        );
      }
    }
  };

  const handleAppleLogin = async () => {
    try {
      // Check if Apple Sign-In is available (iOS 13+)
      if (Platform.OS !== "ios") {
        Alert.alert("Error", "Apple Sign-In is only available on iOS devices");
        return;
      }

      if (!appleAuth.isSupported) {
        Alert.alert(
          "Error",
          "Apple Sign-In is not available on this device. iOS 13+ is required.",
        );
        return;
      }

      // Perform Apple Sign-In request
      const appleAuthRequestResponse = await appleAuth.performRequest({
        requestedOperation: AppleRequestOperation.LOGIN,
        requestedScopes: [AppleRequestScope.EMAIL, AppleRequestScope.FULL_NAME],
      });

      // Check if the request was successful
      if (!appleAuthRequestResponse.identityToken) {
        Alert.alert("Error", "Failed to get identity token from Apple");
        return;
      }

      // Get credential state to check if user is authenticated
      const credentialState = await appleAuth.getCredentialStateForUser(
        appleAuthRequestResponse.user,
      );

      if (credentialState === AppleCredentialState.REVOKED) {
        Alert.alert("Error", "Apple Sign-In credentials have been revoked");
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
    } catch (error: any) {
      Logger.error("Apple Sign-In Error:", error);

      if (error.code === AppleError.CANCELED) {
        // User cancelled the login flow
        Logger.log("User cancelled Apple Sign-In");
      } else if (error.code === AppleError.NOT_HANDLED) {
        // Sign-In request was not handled
        Logger.log("Apple Sign-In request was not handled");
      } else if (error.code === AppleError.UNKNOWN) {
        // Unknown error occurred
        Alert.alert(
          "Apple Sign-In Failed",
          error.message || "An unknown error occurred during Apple Sign-In",
        );
      } else {
        // Some other error happened
        Alert.alert(
          "Apple Sign-In Failed",
          error.message || "An error occurred during Apple Sign-In",
        );
      }
    }
  };

  const handleSocialLogin = async (provider: SocialProvider) => {
    if (provider === "google") {
      await handleGoogleLogin();
    } else if (provider === "apple") {
      await handleAppleLogin();
    } else if (provider === "facebook") {
      Alert.alert("Coming Soon", "Facebook Sign-In will be available soon");
    }
  };

  const handleGuestLogin = () => {
    router.push(`/${MAIN_ROUTES.INTRODUCTION_CLIENT}`);
  };

  const handleOpenLink = useCallback(async (url: string, title: string) => {
    if (!url) {
      Alert.alert("Error", `${title} URL is not configured`);
      return;
    }

    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert("Error", `Cannot open ${title}`);
      }
    } catch (error) {
      Logger.error("Error opening link:", error);
      Alert.alert("Error", `Failed to open ${title}`);
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
            <Text style={styles.logoText}>FRESHPASS</Text>
          </View>

          <View style={styles.taglineContainer}>
            <Text style={styles.tagline1}>
              Always Ready <Text style={styles.tagline2}>Always You</Text>
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
        <Button title="Sign in or Register" onPress={handleSignInOrRegister} />

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
          By continuing to use FreshPass, you agree to our{" "}
          <Text style={styles.legalLink} onPress={handleTermsPress}>
            Terms of Services
          </Text>{" "}
          &{" "}
          <Text style={styles.legalLink} onPress={handlePrivacyPress}>
            Privacy Policy
          </Text>
        </Text>
      </View>
    </SafeAreaView>
  );
}
