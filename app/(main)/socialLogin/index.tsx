import { useAppSelector, useTheme, useAppDispatch } from "@/src/hooks/hooks";
import React, { useMemo, useCallback, useEffect } from "react";
import { View, Text, StatusBar, Platform, Linking, Alert } from "react-native";
import { GoogleSignin, statusCodes } from "@react-native-google-signin/google-signin";
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
import { ApiService } from "@/src/services/api";
import Logger from "@/src/services/logger";
// import { businessEndpoints } from "@/src/services/endpoints";
// import { setUser, setTokens } from "@/src/state/slices/userSlice";
// import { setRegisterEmail } from "@/src/state/slices/generalSlice";

type SocialProvider = "google" | "apple" | "facebook";

// Links from environment
const TERMS_AND_CONDITIONS_URL = process.env.EXPO_PUBLIC_TERMS_URL || "";
const PRIVACY_POLICY_URL = process.env.EXPO_PUBLIC_PRIVACY_URL || "";

// Get Google Web Client ID from environment
// IMPORTANT: 
// 1. Android Client ID: Google Cloud Console mein Android OAuth client banayein (package name + SHA-1 ke saath) - ye Google Cloud Console mein configure hota hai
// 2. Web Client ID: Google Cloud Console mein Web Application OAuth client banayein - ye code mein use hoga
// Web Client ID code mein chahiye kyunki ID token backend verify karta hai, aur Web Client ID se hi ID token milta hai
const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || "";

export default function SocialLogin() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors as Theme), [colors]);
  const insets = useSafeAreaInsets();
  const isButtonMode = Platform.OS === "android" && insets.bottom > 30;
  const router = useRouter();
  const dispatch = useAppDispatch();
  // Get selected role from Redux (will be null initially, then "business", "client", or "staff")
  const selectedRole = useAppSelector((state) => state.general.role);

  // Initialize Google Sign-In
  useEffect(() => {
    if (Platform.OS !== "web") {
      GoogleSignin.configure({
        webClientId: GOOGLE_WEB_CLIENT_ID, // Web Client ID from Google Cloud Console (required for ID token)
        offlineAccess: true, // For server-side access to Google APIs
        forceCodeForRefreshToken: true, // [Android] Get serverAuthCode for backend
      });
    }
  }, []);

  const handleSignInOrRegister = () => {
    router.push(`/${MAIN_ROUTES.LOGIN}`);
  };

  const handleGoogleLogin = async () => {
    try {

      try {
        await GoogleSignin.signOut();
      } catch (signOutError) {
        Logger.log("Google logout out error (ignored):", signOutError);
      }

      // Logout from app session to clear any existing tokens/user data
      try {
        await ApiService.logout();
      } catch (logoutError) {
        // Ignore logout errors - might not have active session
        Logger.log("App logout error (ignored):", logoutError);
      }

      // Check if Google Play Services are available (Android only)
      if (Platform.OS === "android") {
        await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
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

      // Send token to backend for authentication
      // NOTE: You need to create a backend endpoint at /api/auth/google that accepts the idToken
      // The endpoint should verify the Google ID token and return user data + access token
      // If your endpoint is different, update the URL below
      // try {
      //   const response = await ApiService.post("/api/auth/google", {
      //     idToken: idToken,
      //     role: selectedRole || "customer", // Use selected role or default to customer
      //   });

      //   // Handle successful login similar to regular login
      //   if (response.success && response.data) {
      //     const { user, token, email_verification_required } = response.data;

      //     if (user && token) {
      //       dispatch(setRegisterEmail(user.email || ""));

      //       // Set tokens
      //       dispatch(
      //         setTokens({
      //           accessToken: token,
      //           refreshToken: response.data.refreshToken,
      //         })
      //       );

      //       // Set user data
      //       dispatch(
      //         setUser({
      //           id: user.id,
      //           name: user?.name || "",
      //           email: user.email || "",
      //           description: user?.description || "",
      //           phone: user?.phone || "",
      //           country_code: user?.country_code || "",
      //           profile_image_url: user?.profile_image_url || "",
      //           accessToken: token,
      //           userRole: user?.role?.toLowerCase() || null,
      //         })
      //       );

      //       // Navigate based on role
      //       if (user?.role?.toLowerCase() === "business") {
      //         router.replace(`/(main)/${MAIN_ROUTES.DASHBOARD}/(home)` as any);
      //       } else if (user?.role?.toLowerCase() === "customer") {
      //         if (email_verification_required) {
      //           // Handle email verification if needed
      //           Alert.alert("Verification Required", "Please verify your email");
      //         } else {
      //           router.replace(`/(main)/${MAIN_ROUTES.DASHBOARD}/(home)` as any);
      //         }
      //       } else if (user?.role?.toLowerCase() === "staff") {
      //         if (user?.is_onboarded) {
      //           router.replace(`/(main)/${MAIN_ROUTES.DASHBOARD}/(home)` as any);
      //         } else {
      //           router.replace(
      //             `/(main)/${MAIN_ROUTES.COMPLETE_STAFF_PROFILE}` as any
      //           );
      //         }
      //       }
      //     } else {
      //       Alert.alert("Error", "Invalid response from server");
      //     }
      //   } else {
      //     Alert.alert("Error", response.message || "Login failed");
      //   }
      // } catch (apiError: any) {
      //   Logger.error("API Error:", apiError);
      //   Alert.alert(
      //     "Login Failed",
      //     apiError.message || "Failed to authenticate with server"
      //   );
      // }

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
          "Google Play Services is not available. Please update Google Play Services."
        );
      } else {
        // Some other error happened
        Alert.alert(
          "Google Sign-In Failed",
          error.message || "An error occurred during Google Sign-In"
        );
      }
    }
  }

  const handleSocialLogin = useCallback(
    async (provider: SocialProvider) => {
      if (provider === "google") {
        await handleGoogleLogin();
      } else if (provider === "apple") {
        Alert.alert("Coming Soon", "Apple Sign-In will be available soon");
      } else if (provider === "facebook") {
        Alert.alert("Coming Soon", "Facebook Sign-In will be available soon");
      }
    },
    [handleGoogleLogin]
  );

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
