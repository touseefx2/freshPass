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
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { Feather, FontAwesome5 } from "@expo/vector-icons";
import { useTheme, useAppSelector, useAppDispatch } from "@/src/hooks/hooks";
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
import VerificationCodeModal from "@/src/components/verificationCodeModal";
import {
  validatePassword,
  validatePasswordMatch,
} from "@/src/services/validationService";
import { useTranslation } from "react-i18next";
import { useRouter, useLocalSearchParams } from "expo-router";
import { MAIN_ROUTES } from "@/src/constant/routes";
import {
  setRegisterEmail,
  setSavedPassword,
} from "@/src/state/slices/generalSlice";
import { ApiService } from "@/src/services/api";
import { businessEndpoints } from "@/src/services/endpoints";
import { setUser } from "@/src/state/slices/userSlice";
import { getExpoPushToken } from "@/src/services/notificationPermissionService";
import { resetToRoute } from "@/src/utils/navigation";
import Logger from "@/src/services/logger";
import {
  clearPendingInviteCode,
  captureInviteForBusinessSignup,
  getPendingInviteCode,
} from "@/src/services/pendingInviteCode";

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.background,
    },
    container: {
      flex: 1,
      backgroundColor: theme.background,
      gap: moderateHeightScale(24),
    },
    scroll: {
      flex: 1,
    },
    mainContent: {
      flexGrow: 1,
      paddingHorizontal: moderateWidthScale(24),
      paddingBottom: moderateHeightScale(30),
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
    saveRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(12),
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
      flex: 1,
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.darkGreen,
      lineHeight: fontSize.size18,
    },
    buttonWrapper: {
      marginTop: moderateHeightScale(16),
    },
    errorText: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.link,
      marginTop: moderateHeightScale(-16),
      marginBottom: moderateHeightScale(4),
    },
    agentInput: {
      fontSize: fontSize.size13,
    },
    agentStatusText: {
      fontSize: fontSize.size11,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      lineHeight: fontSize.size16,
      marginTop: moderateHeightScale(-14),
    },
    agentLinkedText: {
      color: theme.darkGreen,
      fontFamily: fonts.fontMedium,
    },
    agentNotFoundText: {
      color: theme.link,
    },
  });

type ReferralCodeStatus = "idle" | "checking" | "valid" | "notFound" | "unknown";

// One referral code for both: 4 digits = sales rep agent code, anything else
// = customer invite code (the server tells them apart)
const REFERRAL_CODE_MAX = 20;
const INVITE_CODE_LENGTH = 8;
const sanitizeReferralCode = (text: string) =>
  text
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, REFERRAL_CODE_MAX);
// Check as soon as it looks complete, so a half-typed invite isn't "not found"
const isCheckableCode = (code: string) =>
  /^\d{4}$/.test(code) || code.length >= INVITE_CODE_LENGTH;

export default function RegisterPassword() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const styles = useMemo(() => createStyles(colors as Theme), [colors]);
  const router = useRouter();
  const params = useLocalSearchParams();
  const email = (params.email as string) || "";
  const isSubscribed = params.isSubscribed === "true";
  const savedPassword = useAppSelector((state) => state.general.savedPassword);

  const [password, setPassword] = useState(savedPassword || "");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] =
    useState(false);
  const [savePassword, setSavePassword] = useState(!!savedPassword);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordLengthError, setPasswordLengthError] = useState<string | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isVerificationModalVisible, setIsVerificationModalVisible] =
    useState(false);
  // Register just emailed a code; false when the popup is only reopened
  const [codeJustSent, setCodeJustSent] = useState(false);

  const [data, setData] = useState<any>(null);

  const selectedRole = useAppSelector((state) => state.general.role);
  const isBusiness = selectedRole?.toLowerCase() === "business";

  // Referral code (business signup only, optional): sales rep agent code or
  // customer invite code in one field, pre-filled from the held invite link /
  // Play referrer / iPhone clipboard code
  const [referralCode, setReferralCode] = useState("");
  const [referralStatus, setReferralStatus] =
    useState<ReferralCodeStatus>("idle");
  const [referrerName, setReferrerName] = useState("");
  // Server 422 on signup_code (shown under the field until the code changes)
  const [referralFieldError, setReferralFieldError] = useState<string | null>(
    null,
  );

  useEffect(() => {
    if (!isBusiness) return;
    let cancelled = false;
    // iPhone/iPad with no code yet: deferred click / clipboard, then fill
    captureInviteForBusinessSignup()
      .then(() => getPendingInviteCode())
      .then((code) => {
        if (cancelled || !code) return;
        // Never overwrite what the user already typed
        setReferralCode((current) => current || sanitizeReferralCode(code));
      });
    return () => {
      cancelled = true;
    };
  }, [isBusiness]);

  useEffect(() => {
    setReferrerName("");
    if (!isCheckableCode(referralCode)) {
      setReferralStatus("idle");
      return;
    }
    setReferralStatus("checking");
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const response = await ApiService.get<any>(
          businessEndpoints.signupCode(referralCode),
        );
        if (cancelled) return;
        if (response?.success === false) {
          setReferralStatus("notFound");
        } else {
          const payload = response?.data ?? response;
          setReferrerName(payload?.name || "");
          setReferralStatus("valid");
        }
      } catch (error: any) {
        if (cancelled) return;
        // 404 = unknown code; anything else (network, 429) the register call validates.
        setReferralStatus(error?.status === 404 ? "notFound" : "unknown");
      }
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [referralCode]);

  const handleReferralCodeChange = useCallback((text: string) => {
    setReferralCode(sanitizeReferralCode(text));
    setReferralFieldError(null);
  }, []);

  const handleClearReferralCode = useCallback(() => {
    setReferralCode("");
    setReferralFieldError(null);
  }, []);

  useEffect(() => {
    if (password.length > 0) {
      const validation = validatePassword(password);
      setPasswordLengthError(validation.error);
    } else {
      setPasswordLengthError(null);
    }
  }, [password]);

  useEffect(() => {
    if (confirmPassword.length > 0) {
      const validation = validatePasswordMatch(password, confirmPassword);
      setPasswordError(validation.error);
    } else {
      setPasswordError(null);
    }
  }, [password, confirmPassword]);

  const handleBack = useCallback(() => {
    router.back();
  }, [router]);

  const handleToggleVisibility = useCallback(() => {
    setIsPasswordVisible((prev) => !prev);
  }, []);

  const handleToggleConfirmPasswordVisibility = useCallback(() => {
    setIsConfirmPasswordVisible((prev) => !prev);
  }, []);

  const handleToggleSavePassword = useCallback(() => {
    setSavePassword((prev) => !prev);
  }, []);

  const handleClear = useCallback(() => {
    setPassword("");
    setPasswordError(null);
    setPasswordLengthError(null);
  }, []);

  const handleClearConfirmPassword = useCallback(() => {
    setConfirmPassword("");
    setPasswordError(null);
  }, []);

  const finishBusinessSignup = (registerData: any) => {
    const { user, token, refreshToken } = registerData;
    dispatch(
      setUser({
        id: user.id,
        name: user?.name || "",
        email: user.email || email.trim(), // Use email from API response
        accessToken: token,
        refreshToken: refreshToken || null,
        userRole: user?.role?.toLowerCase() || null, // Set userRole from response or use current role
      }),
    );
    // Clear auth stack so swipe-back cannot return to signup screens.
    resetToRoute(`/${MAIN_ROUTES.REGISTER_NEXT_STEPS}`);
  };

  const handleVerificationCodeComplete = () => {
    const { user, token, refreshToken } = data as any;
    if (user?.role?.toLowerCase() === "business") {
      handleCloseVerificationModal();
      finishBusinessSignup(data);
      return;
    }
    dispatch(
      setUser({
        id: user.id,
        name: user?.name || "",
        email: user.email || email.trim(), // Use email from API response
        accessToken: token,
        refreshToken: refreshToken || null,
        userRole: user?.role?.toLowerCase() || null, // Set userRole from response or use current role
      }),
    );
    // Clear role/login/register stack so swipe-back cannot return to signup/OTP.
    resetToRoute(`/${MAIN_ROUTES.COMPLETE_CUSTOMER_PROFILE}`);
    handleCloseVerificationModal();
  };

  const handleCloseVerificationModal = useCallback(() => {
    setIsVerificationModalVisible(false);
  }, []);

  // Code popup "Wrong email? Change it": keep the new address everywhere
  const handleVerificationEmailChanged = useCallback(
    (newEmail: string) => {
      setData((prev: any) =>
        prev?.user ? { ...prev, user: { ...prev.user, email: newEmail } } : prev,
      );
      dispatch(setRegisterEmail(newEmail));
    },
    [dispatch],
  );

  const handleContinue = async () => {
    Keyboard.dismiss();

    // Account already created but not verified yet (popup was closed):
    // reopen the code popup instead of registering a second time.
    if (data?.token) {
      setCodeJustSent(false);
      setIsVerificationModalVisible(true);
      return;
    }

    setIsLoading(true);
    try {
      const expo_push_token = await getExpoPushToken();
      const body = {
        email: email.trim(),
        password: password,
        password_confirmation: confirmPassword,
        role: selectedRole?.toLowerCase() || "",
        isSubscribed: isSubscribed,
        name: "",
        ...(expo_push_token ? { expo_push_token } : {}),
        // Any entered code goes to the server: an unknown one returns a 422 on
        // signup_code (no account made), shown on the field to fix or clear.
        ...(isBusiness && referralCode.length > 0
          ? { signup_code: referralCode }
          : {}),
      };

      Logger.log("---->body", body);

      const response = await ApiService.post(businessEndpoints.register, body);

      // Handle successful registration
      if (response.success && response.data) {
        setData(response.data);
        const { user, token, refreshToken, email_verification_required } =
          response.data;

        // Set user data in Redux (email from API response)
        if (user && token) {
          // The business account exists now (even before email verification),
          // so the invite code has been recorded
          if (isBusiness) void clearPendingInviteCode();
          dispatch(setRegisterEmail(user.email || email.trim()));
          if (savePassword) {
            dispatch(setSavedPassword(password));
          } else {
            // Clear saved password if checkbox is unchecked
            dispatch(setSavedPassword(null));
          }

          if (user?.role?.toLowerCase() == "business") {
            // Owners verify the emailed code first (same popup as customers)
            if (email_verification_required) {
              setCodeJustSent(true);
              setIsVerificationModalVisible(true);
            } else {
              finishBusinessSignup(response.data);
            }
          } else {
            if (email_verification_required) {
              setCodeJustSent(true);
              setIsVerificationModalVisible(true);
            }
          }
        } else {
          Alert.alert(t("error"), t("invalidResponseFromServer"));
        }
      } else {
        Alert.alert(t("error"), response.message || t("registrationFailed"));
      }
    } catch (error: any) {
      // Unknown referral code: no account was made; show it on the field so
      // the user can fix or clear it
      const errors = error?.data?.errors;
      const codeError =
        errors?.signup_code ?? errors?.agent_code ?? errors?.invite_code;
      const codeErrorText = Array.isArray(codeError) ? codeError[0] : codeError;
      if (isBusiness && error?.status === 422 && codeErrorText) {
        setReferralFieldError(String(codeErrorText));
        return;
      }
      // Error message is already formatted by ApiService
      Alert.alert(
        t("registrationFailedTitle"),
        error.message || t("anErrorOccurred"),
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Form is valid only if both password and confirm password are valid
  const passwordValidation = validatePassword(password);
  const matchValidation = validatePasswordMatch(password, confirmPassword);
  const isFormValid =
    password.length > 0 &&
    confirmPassword.length > 0 &&
    passwordValidation.isValid &&
    matchValidation.isValid &&
    referralStatus !== "checking";

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
          <KeyboardAwareScrollView
            style={styles.scroll}
            contentContainerStyle={styles.mainContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            bottomOffset={moderateHeightScale(32)}
          >
            <View style={styles.content}>
              <View style={styles.titleSection}>
                <Text style={styles.title}>{t("regCreateYourPassword")}</Text>
              </View>

              <FloatingInput
                label={t("typePassword")}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!isPasswordVisible}
                placeholder={t("typeYourPassword")}
                autoCapitalize="none"
                onClear={handleClear}
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

              {passwordLengthError && (
                <Text style={styles.errorText}>{passwordLengthError}</Text>
              )}

              <FloatingInput
                label={t("confirmPassword")}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!isConfirmPasswordVisible}
                placeholder={t("confirmYourPassword")}
                autoCapitalize="none"
                onClear={handleClearConfirmPassword}
                renderRightAccessory={() =>
                  confirmPassword.length > 0 ? (
                    <Pressable
                      onPress={handleToggleConfirmPasswordVisibility}
                      style={styles.toggleButton}
                      hitSlop={moderateWidthScale(8)}
                    >
                      <Feather
                        name={isConfirmPasswordVisible ? "eye-off" : "eye"}
                        size={moderateWidthScale(20)}
                        color={(colors as Theme).darkGreen}
                      />
                    </Pressable>
                  ) : null
                }
              />

              {passwordError && (
                <Text style={styles.errorText}>{passwordError}</Text>
              )}

              {isBusiness && (
                <>
                  <FloatingInput
                    label={t("referralCodeLabel")}
                    value={referralCode}
                    onChangeText={handleReferralCodeChange}
                    inputStyle={styles.agentInput}
                    autoCapitalize="characters"
                    autoCorrect={false}
                    maxLength={REFERRAL_CODE_MAX}
                    onClear={handleClearReferralCode}
                  />
                  {referralFieldError ? (
                    <Text
                      style={[styles.agentStatusText, styles.agentNotFoundText]}
                      accessibilityLiveRegion="polite"
                    >
                      ✗ {referralFieldError}
                    </Text>
                  ) : referralStatus === "checking" ? (
                    <Text style={styles.agentStatusText}>
                      {t("referralCodeChecking")}
                    </Text>
                  ) : referralStatus === "valid" ? (
                    <Text
                      style={[styles.agentStatusText, styles.agentLinkedText]}
                    >
                      ✓{" "}
                      {referrerName
                        ? t("referralCodeReferredBy", { name: referrerName })
                        : t("referralCodeValid")}
                    </Text>
                  ) : referralStatus === "notFound" ? (
                    <Text
                      style={[styles.agentStatusText, styles.agentNotFoundText]}
                    >
                      ✗ {t("referralCodeNotFound")}
                    </Text>
                  ) : (
                    <Text style={styles.agentStatusText}>
                      {t("referralCodeHint")}
                    </Text>
                  )}
                </>
              )}

              <Pressable
                onPress={handleToggleSavePassword}
                style={styles.saveRow}
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
            </View>
            <Button
              title={t("continue")}
              onPress={handleContinue}
              disabled={!isFormValid}
              loading={isLoading}
              containerStyle={styles.buttonWrapper}
            />
          </KeyboardAwareScrollView>
        </View>
      </TouchableWithoutFeedback>

      {isVerificationModalVisible && (
        <VerificationCodeModal
          visible={isVerificationModalVisible}
          onClose={handleCloseVerificationModal}
          email={data?.user?.email || email.trim()}
          onCodeComplete={handleVerificationCodeComplete}
          onEmailChanged={handleVerificationEmailChanged}
          codeJustSent={codeJustSent}
          accessToken={data?.token || null}
          screen="signup"
        />
      )}
    </SafeAreaView>
  );
}
