import React, { useMemo, useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  StatusBar,
  StyleSheet,
  Pressable,
  Alert,
  Keyboard,
  TouchableWithoutFeedback,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather, FontAwesome5 } from "@expo/vector-icons";
import { useTheme, useAppSelector, useAppDispatch } from "@/src/hooks/hooks";
import { useTranslation } from "react-i18next";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  moderateHeightScale,
  moderateWidthScale,
  widthScale,
} from "@/src/theme/dimensions";
import Button from "@/src/components/button";
import FloatingInput from "@/src/components/floatingInput";
import RegisterHeader from "@/src/components/registerHeader";
import SocialAuthOptions from "@/src/components/socialAuthOptions";
import { useSocialLogin } from "@/src/hooks/useSocialLogin";
import SectionSeparator from "@/src/components/sectionSeparator";
import VerificationCodeModal from "@/src/components/verificationCodeModal";
import { validateEmail } from "@/src/services/validationService";
import Logger from "@/src/services/logger";
import { useRouter } from "expo-router";
import { MAIN_ROUTES } from "@/src/constant/routes";
import { ApiService } from "@/src/services/api";
import { businessEndpoints } from "@/src/services/endpoints";
import { setBusinessStatus, setUser } from "@/src/state/slices/userSlice";
import {
  setRegisterEmail,
  setSavedPassword,
} from "@/src/state/slices/generalSlice";
import {
  setAboutYourself,
  setBusinessName,
  setFullName,
  setSalonBusinessHours,
} from "@/src/state/slices/completeProfileSlice";

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.background,
    },
    container: {
      flex: 1,
      backgroundColor: theme.background,
      gap: moderateHeightScale(20),
    },
    mainContent: {
      flex: 1,
      paddingHorizontal: moderateWidthScale(24),
      paddingBottom: moderateHeightScale(15),
    },
    content: {
      flexGrow: 1,
      gap: moderateHeightScale(20),
    },
    titleSection: {
      gap: moderateHeightScale(8),
    },
    title: {
      fontSize: fontSize.size26,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      lineHeight: fontSize.size32,
    },
    toggleButton: {
      alignItems: "center",
      justifyContent: "center",
    },
    savePasswordRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    savePasswordLeft: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(12),
      flex: 1,
    },
    saveIconWrapper: {
      width: widthScale(46),
      height: widthScale(46),
      borderRadius: moderateWidthScale(46 / 2),
      backgroundColor: theme.lightBeige,
      alignItems: "center",
      justifyContent: "center",
    },
    checkbox: {
      width: moderateWidthScale(24),
      height: moderateWidthScale(24),
      borderRadius: moderateWidthScale(5),
      borderWidth: 1.5,
      borderColor: theme.black,
      alignItems: "center",
      justifyContent: "center",
    },
    saveText: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.darkGreen,
      lineHeight: fontSize.size18,
    },
    forgetPasswordLink: {
      textDecorationLine: "underline",
      textDecorationColor: theme.lightGreen,
      color: theme.lightGreen,
    },
    primaryButtonWrapper: {
      marginTop: moderateHeightScale(4),
    },
    socialList: {},
    footer: {
      marginTop: moderateHeightScale(0),
      alignItems: "center",
    },
    footerText: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: theme.darkGreen,
      textAlign: "center",
    },
    signupLink: {
      fontFamily: fonts.fontMedium,
      color: theme.link,
      textDecorationLine: "underline",
      textDecorationColor: theme.link,
    },
    errorText: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.link,
      marginTop: moderateHeightScale(-16),
      marginBottom: moderateHeightScale(4),
    },
  });

const DEFAULT_EMAIL = "";

export default function Login() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => createStyles(colors as Theme), [colors]);
  const router = useRouter();
  const dispatch = useAppDispatch();
  // Get selected role from Redux (will be null initially, then "business", "client", or "staff")
  const selectedRole = useAppSelector((state) => state.general.role);
  const currentBusinessStatus = useAppSelector(
    (state) => state.user.businessStatus,
  );
  const [data, setData] = useState<any>(null);

  // Get saved email from general state (if exists)
  const savedEmail = useAppSelector((state) => state.general.registerEmail);
  const savedPassword = useAppSelector((state) => state.general.savedPassword);

  const [email, setEmail] = useState(savedEmail || DEFAULT_EMAIL);
  const [password, setPassword] = useState(savedPassword || "");
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [savePassword, setSavePassword] = useState(!!savedPassword);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isVerificationModalVisible, setIsVerificationModalVisible] =
    useState(false);

  // Validate email when it changes
  useEffect(() => {
    if (email.length > 0) {
      const validation = validateEmail(email);
      setEmailError(validation.error);
    } else {
      setEmailError(null);
    }
  }, [email]);

  const handleBack = useCallback(() => {
    router.back();
  }, [router]);

  const handleEmailClear = useCallback(() => {
    setEmail("");
    setEmailError(null);
  }, []);

  const handlePasswordClear = useCallback(() => {
    setPassword("");
  }, []);

  const handleToggleVisibility = useCallback(() => {
    setIsPasswordVisible((prev) => !prev);
  }, []);

  const handleToggleSavePassword = useCallback(() => {
    setSavePassword((prev) => !prev);
  }, []);

  const setUserData = (response: any) => {
    const { user, token } = response;
    dispatch(
      setUser({
        id: user.id,
        name: user?.name || "",
        email: user.email || email.trim(),
        description: user?.description || "",
        phone: user?.phone || "",
        country_code: user?.country_code || "",
        profile_image_url: user?.profile_image_url || "",
        accessToken: token,
        userRole: user?.role?.toLowerCase() || null,
      }),
    );
  };

  const handleLogin = useCallback(async () => {
    Keyboard.dismiss();
    setIsLoading(true);
    try {
      const response = await ApiService.post(businessEndpoints.login, {
        email: email.trim(),
        password: password,
      });

      // Handle successful login
      if (response.success && response.data) {
        const { user, token, email_verification_required } = response.data;

        // Set user data in Redux
        if (user && token) {
          dispatch(setRegisterEmail(user.email || email.trim()));
          if (savePassword) {
            dispatch(setSavedPassword(password));
          } else {
            // Clear saved password if checkbox is unchecked
            dispatch(setSavedPassword(null));
          }

          if (user?.role?.toLowerCase() === "business") {
            setUserData(response.data);
            router.replace(`/(main)/${MAIN_ROUTES.DASHBOARD}/(home)` as any);
          } else if (user?.role?.toLowerCase() === "customer") {
            if (email_verification_required) {
              setData(response.data);
              setIsVerificationModalVisible(true);
            } else {
              setUserData(response.data);
              router.replace(`/(main)/${MAIN_ROUTES.DASHBOARD}/(home)` as any);
            }
          } else if (user?.role?.toLowerCase() === "staff") {
            setUserData(response.data);
            // Save salon business hours from login response if available
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
                  bh.day.charAt(0).toUpperCase() +
                  bh.day.slice(1).toLowerCase();

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
        } else {
          Alert.alert(t("error"), t("invalidResponseFromServer"));
        }
      } else {
        Alert.alert(t("error"), response.message || t("loginFailedMessage"));
      }
    } catch (error: any) {
      // Error message is already formatted by ApiService
      Alert.alert(t("loginFailed"), error.message || t("anErrorOccurred"));
    } finally {
      setIsLoading(false);
    }
  }, [email, password, savePassword, dispatch, router]);

  const { handleSocialLogin } = useSocialLogin();

  const handleForgetPassword = useCallback(() => {
    // TODO: Navigate to forget password screen
    Logger.log("Forget password");
  }, []);

  const handleSignup = useCallback(() => {
    router.push(`/${MAIN_ROUTES.REGISTER}`);
  }, [router]);

  const handleCloseVerificationModal = useCallback(() => {
    setIsVerificationModalVisible(false);
  }, []);

  const handleVerificationCodeComplete = useCallback(() => {
    if (data) {
      setUserData(data);
      router.replace(`/(main)/${MAIN_ROUTES.DASHBOARD}/(home)` as any);
    }
    handleCloseVerificationModal();
  }, [data, router, handleCloseVerificationModal]);

  const isFormValid =
    email.length > 0 && password.length > 0 && validateEmail(email).isValid;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar
        animated
        translucent
        backgroundColor={(colors as Theme).background}
        barStyle={"dark-content"}
      />

      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.container}>
          <RegisterHeader onBack={handleBack} />

          <View style={styles.mainContent}>
            <View style={styles.content}>
              <View style={styles.titleSection}>
                <Text style={styles.title}>
                  {t("loginToYourAccount", { role: selectedRole })}
                </Text>
              </View>

              <FloatingInput
                label={t("email")}
                value={email}
                onChangeText={setEmail}
                placeholder={t("enterYourEmail")}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                onClear={handleEmailClear}
              />

              {emailError && <Text style={styles.errorText}>{emailError}</Text>}

              <FloatingInput
                label={t("password")}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!isPasswordVisible}
                placeholder={t("enterYourPassword")}
                autoCapitalize="none"
                onClear={handlePasswordClear}
                renderRightAccessory={() =>
                  password.length > 0 ? (
                    <Pressable
                      onPress={handleToggleVisibility}
                      style={styles.toggleButton}
                      hitSlop={moderateWidthScale(8)}
                    >
                      <Feather
                        name={isPasswordVisible ? "eye-off" : "eye"}
                        size={moderateWidthScale(20)}
                        color={(colors as Theme).darkGreen}
                      />
                    </Pressable>
                  ) : null
                }
              />

              <View style={styles.savePasswordRow}>
                <Pressable
                  onPress={handleToggleSavePassword}
                  style={styles.savePasswordLeft}
                  hitSlop={moderateWidthScale(8)}
                >
                  <View style={styles.saveIconWrapper}>
                    <View style={styles.checkbox}>
                      {savePassword && (
                        <FontAwesome5
                          name="check"
                          size={moderateWidthScale(14)}
                          color={(colors as Theme).orangeBrown}
                        />
                      )}
                    </View>
                  </View>
                  <Text style={styles.saveText}>{t("savePassword")}</Text>
                </Pressable>
                <Pressable
                  onPress={handleForgetPassword}
                  hitSlop={moderateWidthScale(8)}
                >
                  <Text style={[styles.saveText, styles.forgetPasswordLink]}>
                    {t("forgetPassword")}
                  </Text>
                </Pressable>
              </View>

              <Button
                title={t("continue")}
                onPress={handleLogin}
                disabled={!isFormValid}
                loading={isLoading}
                containerStyle={styles.primaryButtonWrapper}
              />

              <SectionSeparator />

              <SocialAuthOptions
                onGoogle={() => handleSocialLogin("google")}
                onApple={() => handleSocialLogin("apple")}
                onFacebook={() => handleSocialLogin("facebook")}
                containerStyle={styles.socialList}
              />

              <View style={styles.footer}>
                <Text style={styles.footerText}>
                  {t("doesntHaveAccount")}{" "}
                  <Text style={styles.signupLink} onPress={handleSignup}>
                    {t("signup")}
                  </Text>
                </Text>
              </View>
            </View>
          </View>
        </View>
      </TouchableWithoutFeedback>

      {isVerificationModalVisible && (
        <VerificationCodeModal
          visible={isVerificationModalVisible}
          onClose={handleCloseVerificationModal}
          email={email}
          onCodeComplete={handleVerificationCodeComplete}
          accessToken={data?.token || null}
          screen="login"
        />
      )}
    </SafeAreaView>
  );
}
