import { useCallback, useEffect } from "react";
import { Platform, Alert } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import {
  GoogleSignin,
  statusCodes,
} from "@react-native-google-signin/google-signin";
import {
  appleAuth,
  appleAuthAndroid,
} from "@invertase/react-native-apple-authentication";
import { LoginManager, AccessToken } from "react-native-fbsdk-next";
import { useAppSelector, useAppDispatch } from "@/src/hooks/hooks";
import Logger from "@/src/services/logger";
import { ApiService } from "@/src/services/api";
import { businessEndpoints } from "@/src/services/endpoints";
import { MAIN_ROUTES } from "@/src/constant/routes";
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
import type {
  SocialProvider,
  SocialLoginApiResponse,
} from "@/src/types/socialLogin";

const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || "";
const GOOGLE_IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || "";
const APPLE_ANDROID_CLIENT_ID =
  process.env.EXPO_PUBLIC_APPLE_ANDROID_CLIENT_ID || "";
const APPLE_ANDROID_REDIRECT_URI =
  process.env.EXPO_PUBLIC_APPLE_ANDROID_REDIRECT_URI || "";

function generateRandomString() {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

export function useSocialLogin() {
  const { t } = useTranslation();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const selectedRole = useAppSelector((state) => state.general.role);
  const currentBusinessStatus = useAppSelector(
    (state) => state.user.businessStatus,
  );

  useEffect(() => {
    if (Platform.OS !== "web") {
      try {
        GoogleSignin.configure({
          iosClientId: GOOGLE_IOS_CLIENT_ID,
          webClientId: GOOGLE_WEB_CLIENT_ID,
          offlineAccess: true,
          forceCodeForRefreshToken: true,
        });
      } catch (error) {
        Logger.error("Google Sign-In configuration error:", error);
      }
    }
  }, []);

  const handleSocialLoginResponse = useCallback(
    (response: SocialLoginApiResponse) => {
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
              }),
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
              }),
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
              }),
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
                const dayName =
                  bh.day.charAt(0).toUpperCase() +
                  bh.day.slice(1).toLowerCase();

                const [openingHours, openingMinutes] = bh.opening_time
                  ? bh.opening_time.split(":").map(Number)
                  : [0, 0];

                const [closingHours, closingMinutes] = bh.closing_time
                  ? bh.closing_time.split(":").map(Number)
                  : [0, 0];

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
                `/(main)/${MAIN_ROUTES.COMPLETE_STAFF_PROFILE}` as any,
              );
            }
            if (currentBusinessStatus) {
              dispatch(
                setBusinessStatus({
                  ...currentBusinessStatus,
                  onboarding_completed: user?.is_onboarded || false,
                }),
              );
            }
          }
        }
      } else {
        Alert.alert(
          t("loginFailed"),
          response.message || t("socialLoginFailedTryAgain"),
        );
      }
    },
    [dispatch, router, t, currentBusinessStatus],
  );

  const handleGoogleLogin = useCallback(async () => {
    try {
      if (Platform.OS === "android") {
        await GoogleSignin.hasPlayServices({
          showPlayServicesUpdateDialog: true,
        });
      }

      const userInfo = await GoogleSignin.signIn();

      if (!userInfo.data) {
        Alert.alert(t("error"), t("failedToGetUserFromGoogle"));
        return;
      }

      const idToken = userInfo.data.idToken;
      if (!idToken) {
        Alert.alert(t("error"), t("failedToGetIdTokenFromGoogle"));
        return;
      }

      const response = await ApiService.post<SocialLoginApiResponse>(
        businessEndpoints.socialLogin,
        {
          provider: "google",
          token: idToken,
          role: selectedRole?.toLowerCase() ?? "",
        },
      );

      handleSocialLoginResponse(response);
    } catch (error: any) {
      Logger.error("Google Sign-In Error:", error);

      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        Logger.log("User cancelled Google Sign-In");
      } else if (error.code === statusCodes.IN_PROGRESS) {
        Logger.log("Google Sign-In already in progress");
      } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        Alert.alert(t("error"), t("googlePlayServicesNotAvailable"));
      } else {
        Alert.alert(
          t("googleSignInFailed"),
          error.message || t("errorDuringGoogleSignIn"),
        );
      }
    }
  }, [t, selectedRole, handleSocialLoginResponse]);

  const handleAppleLogin = useCallback(async () => {
    try {
      if (Platform.OS !== "ios") {
        Alert.alert(t("error"), t("appleSignInOnlyOnIos"));
        return;
      }

      if (!appleAuth.isSupported) {
        Alert.alert(t("error"), t("appleSignInNotAvailable"));
        return;
      }

      const appleAuthRequestResponse = await appleAuth.performRequest({
        requestedOperation: appleAuth.Operation.LOGIN,
        requestedScopes: [appleAuth.Scope.EMAIL, appleAuth.Scope.FULL_NAME],
      });

      if (!appleAuthRequestResponse.identityToken) {
        Alert.alert(t("error"), t("failedToGetIdentityTokenFromApple"));
        return;
      }

      const credentialState = await appleAuth.getCredentialStateForUser(
        appleAuthRequestResponse.user,
      );

      if (credentialState === appleAuth.State.REVOKED) {
        Alert.alert(t("error"), t("appleCredentialsRevoked"));
        return;
      }

      const { identityToken } = appleAuthRequestResponse;

      if (identityToken) {
        const response = await ApiService.post<SocialLoginApiResponse>(
          businessEndpoints.socialLogin,
          {
            provider: "apple",
            token: identityToken,
            role: selectedRole?.toLowerCase() ?? "",
          },
        );

        handleSocialLoginResponse(response);
      }
    } catch (error: any) {
      Logger.error("Apple Sign-In Error:", error);

      if (error.code === appleAuth.Error.CANCELED) {
        Logger.log("User cancelled Apple Sign-In");
      } else if (error.code === appleAuth.Error.NOT_HANDLED) {
        Logger.log("Apple Sign-In request was not handled");
      } else if (error.code === appleAuth.Error.UNKNOWN) {
        Alert.alert(
          t("appleSignInFailed"),
          error.message || t("unknownErrorDuringAppleSignIn"),
        );
      } else {
        Alert.alert(
          t("appleSignInFailed"),
          error.message || t("errorDuringAppleSignIn"),
        );
      }
    }
  }, [t, selectedRole, handleSocialLoginResponse]);

  const handleAppleLoginAndroid = useCallback(async () => {
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
        },
      );

      handleSocialLoginResponse(apiResponse);
    } catch (error: any) {
      Logger.error("Apple Android Sign-In Error:", error);
      Alert.alert(
        t("appleSignInFailed"),
        error.message || t("errorDuringAppleSignIn"),
      );
    }
  }, [t, selectedRole, handleSocialLoginResponse]);

  const handleFacebookLogin = useCallback(async () => {
    try {
      const result = await LoginManager.logInWithPermissions([
        "public_profile",
        "email",
      ]);

      if (result.isCancelled) {
        Logger.log("User cancelled Facebook login");
        return;
      }

      const data = await AccessToken.getCurrentAccessToken();

      if (!data || !data.accessToken) {
        Alert.alert(t("error"), t("failedToGetUserFromFacebook"));
        return;
      }

      const fbAccessToken = data.accessToken.toString();

      const response = await ApiService.post<SocialLoginApiResponse>(
        businessEndpoints.socialLogin,
        {
          provider: "facebook",
          token: fbAccessToken,
          role: selectedRole?.toLowerCase() ?? "",
        },
      );

      handleSocialLoginResponse(response);
    } catch (error: any) {
      Logger.error("Facebook Login Error:", error);
      Alert.alert(
        t("facebookSignInFailed"),
        error.message || t("errorDuringFacebookSignIn"),
      );
    }
  }, [t, selectedRole, handleSocialLoginResponse]);

  const handleSocialLogin = useCallback(
    async (provider: SocialProvider) => {
      if (provider === "google") {
        await handleGoogleLogin();
      } else if (provider === "apple") {
        if (Platform.OS === "ios") {
          await handleAppleLogin();
        } else if (Platform.OS === "android") {
          await handleAppleLoginAndroid();
        }
      } else if (provider === "facebook") {
        Alert.alert(t("error"), "coming soon");
        // await handleFacebookLogin();
      }
    },
    [
      handleGoogleLogin,
      handleAppleLogin,
      handleAppleLoginAndroid,
      handleFacebookLogin,
    ],
  );

  return { handleSocialLogin };
}
