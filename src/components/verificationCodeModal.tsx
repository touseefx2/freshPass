import React, {
  useMemo,
  useState,
  useRef,
  useEffect,
  useCallback,
} from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  TextInput,
  Keyboard,
  ActivityIndicator,
  TouchableOpacity,
  Platform,
} from "react-native";
import SkeletonPlaceholder from "react-native-skeleton-placeholder";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  moderateHeightScale,
  moderateWidthScale,
  widthScale,
  heightScale,
  iconScale,
} from "@/src/theme/dimensions";
import { ApiService } from "@/src/services/api";
import Logger from "@/src/services/logger";
import { emailVerificationEndpoints } from "@/src/services/endpoints";
import { validateEmail } from "@/src/services/validationService";
import RetryButton from "@/src/components/retryButton";
import NotificationBanner from "@/src/components/notificationBanner";

// Seconds before "Didn't get a code?" can send another code
const RESEND_COOLDOWN_SECONDS = 30;

interface VerificationCodeModalProps {
  visible: boolean;
  onClose: () => void;
  email: string;
  onCodeComplete?: () => void;
  /** Called after "Wrong email? Change it" saved a new address. */
  onEmailChanged?: (email: string) => void;
  /** True when the caller just sent a code (signup), so resend waits first. */
  codeJustSent?: boolean;
  accessToken?: string | null;
  screen?: "signup" | "login";
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      justifyContent: "center",
      alignItems: "center",
    },
    container: {
      width: "100%",
      height: "100%",
      backgroundColor: theme.background,
    },
    headerContainer: {
      backgroundColor: theme.background,
      paddingTop: moderateHeightScale(12),
      paddingBottom: moderateHeightScale(1),
    },
    headerRow: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: moderateHeightScale(8),
      paddingHorizontal: moderateWidthScale(20),
    },
    backButton: {
      width: moderateWidthScale(36),
      height: moderateWidthScale(26),
      alignItems: "flex-start",
      justifyContent: "center",
    },
    line: {
      width: "100%",
      height: 1.1,
      backgroundColor: theme.borderLight,
    },
    contentWrapper: {
      flex: 1,
      paddingHorizontal: moderateWidthScale(24),
      paddingTop: moderateHeightScale(15),
      alignItems: "center",
      gap: moderateHeightScale(32),
    },
    title: {
      fontSize: fontSize.size26,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      textAlign: "center",
    },
    instructionText: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      textAlign: "center",
      lineHeight: fontSize.size20,
    },
    emailText: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
      textAlign: "center",
    },
    codeContainer: {
      flexDirection: "row",
      gap: moderateWidthScale(12),
      justifyContent: "center",
      alignItems: "center",
    },
    codeInput: {
      width: widthScale(50),
      height: heightScale(50),
      borderWidth: 1.5,
      borderColor: theme.darkGreen,
      borderRadius: moderateWidthScale(8),
      backgroundColor: theme.white,
      textAlign: "center",
      fontSize: fontSize.size24,
      fontFamily: fonts.fontMedium,
      color: theme.text,
    },
    resendLink: {
      marginTop: moderateHeightScale(8),
    },
    resendText: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      textDecorationLine: "underline",
      textAlign: "center",
      textDecorationColor: theme.darkGreen,
    },
    instructionContainer: {
      gap: moderateHeightScale(4),
    },
    loadingContainer: {
      marginTop: moderateHeightScale(8),
    },
    disabledInput: {
      opacity: 0.5,
    },
    skeletonContainer: {
      width: "100%",
      maxWidth: widthScale(400),
      alignItems: "center",
      gap: moderateHeightScale(32),
    },
    skeletonTitle: {
      height: moderateHeightScale(32),
      width: "60%",
      borderRadius: moderateWidthScale(4),
    },
    skeletonInstruction: {
      height: moderateHeightScale(18),
      width: "80%",
      borderRadius: moderateWidthScale(4),
      marginBottom: moderateHeightScale(4),
    },
    skeletonEmail: {
      height: moderateHeightScale(18),
      width: "50%",
      borderRadius: moderateWidthScale(4),
    },
    skeletonCodeContainer: {
      flexDirection: "row",
      gap: moderateWidthScale(12),
      justifyContent: "center",
      alignItems: "center",
    },
    skeletonCodeInput: {
      width: widthScale(56),
      height: heightScale(56),
      borderRadius: moderateWidthScale(8),
    },
    skeletonResend: {
      height: moderateHeightScale(18),
      width: moderateWidthScale(150),
      borderRadius: moderateWidthScale(4),
      marginTop: moderateHeightScale(8),
    },
    errorContainer: {
      alignItems: "center",
      gap: moderateHeightScale(16),
    },
    errorText: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.text,
      textAlign: "center",
    },
    skeletonWrapper: {
      alignItems: "center",
      gap: moderateHeightScale(32),
    },
    changeEmailLink: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontMedium,
      color: theme.lightGreen,
      textDecorationLine: "underline",
      textAlign: "center",
    },
    changeEmailForm: {
      width: "100%",
      gap: moderateHeightScale(12),
    },
    emailInput: {
      width: "100%",
      height: heightScale(50),
      borderWidth: 1.5,
      borderColor: theme.darkGreen,
      borderRadius: moderateWidthScale(8),
      backgroundColor: theme.white,
      paddingHorizontal: moderateWidthScale(14),
      fontSize: fontSize.size16,
      fontFamily: fonts.fontRegular,
      color: theme.text,
    },
    emailInputError: {
      borderColor: theme.red,
    },
    emailErrorText: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: theme.red,
    },
    changeEmailButtons: {
      flexDirection: "row",
      gap: moderateWidthScale(12),
    },
    changeEmailButton: {
      flex: 1,
      height: heightScale(46),
      borderRadius: moderateWidthScale(8),
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1.5,
      borderColor: theme.darkGreen,
    },
    changeEmailSave: {
      backgroundColor: theme.darkGreen,
    },
    changeEmailCancelText: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
    },
    changeEmailSaveText: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontMedium,
      color: theme.white,
    },
  });

export default function VerificationCodeModal({
  visible,
  onClose,
  email,
  onCodeComplete,
  onEmailChanged,
  codeJustSent = false,
  accessToken,
  screen,
}: VerificationCodeModalProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors as Theme), [colors]);
  const theme = colors as Theme;
  const insets = useSafeAreaInsets();

  const [code, setCode] = useState(["", "", "", "", ""]);
  const [isResending, setIsResending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(screen === "login");
  const [initialLoadError, setInitialLoadError] = useState(false);
  const inputRefs = useRef<(TextInput | null)[]>([]);
  // Wait only after a real send: signup's code, or a send from this popup
  const [resendSeconds, setResendSeconds] = useState(
    codeJustSent ? RESEND_COOLDOWN_SECONDS : 0,
  );

  useEffect(() => {
    if (resendSeconds <= 0) return;
    const timer = setTimeout(() => setResendSeconds((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendSeconds]);

  // "Wrong email? Change it" form
  const [currentEmail, setCurrentEmail] = useState(email);
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newEmailError, setNewEmailError] = useState<string | null>(null);
  const [isChangingEmail, setIsChangingEmail] = useState(false);

  // Local notification banner state
  const [localBannerVisible, setLocalBannerVisible] = useState(false);
  const [localBannerTitle, setLocalBannerTitle] = useState("");
  const [localBannerMessage, setLocalBannerMessage] = useState("");
  const [localBannerType, setLocalBannerType] = useState<
    "success" | "error" | "warning" | "info"
  >("info");
  const [localBannerDuration, setLocalBannerDuration] = useState(3000);

  const showLocalBanner = (
    title: string,
    message: string,
    type: "success" | "error" | "warning" | "info",
    duration: number = 3000,
  ) => {
    setLocalBannerTitle(title);
    setLocalBannerMessage(message);
    setLocalBannerType(type);
    setLocalBannerDuration(duration);
    setLocalBannerVisible(true);
  };

  const handleResendCode = async (isInitial = false) => {
    if (isInitial) {
      setIsInitialLoading(true);
      setInitialLoadError(false);
    } else {
      setIsResending(true);
    }

    try {
      const config = accessToken
        ? {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        : undefined;

      const response = await ApiService.post<{
        success: boolean;
        message: string;
      }>(emailVerificationEndpoints.resendNotification, undefined, config);

      if (response.success) {
        setResendSeconds(RESEND_COOLDOWN_SECONDS);
        if (isInitial) {
          setIsInitialLoading(false);
          setInitialLoadError(false);
          // Focus first input after initial load
          setTimeout(() => {
            inputRefs.current[0]?.focus();
          }, 100);
        } else {
          showLocalBanner(
            "Success",
            response.message || "Verification email sent successfully.",
            "success",
            3000,
          );
        }
      } else {
        if (isInitial) {
          setIsInitialLoading(false);
          setInitialLoadError(true);
        } else {
          showLocalBanner(
            "Error",
            response.message || "Failed to send verification email.",
            "error",
            3000,
          );
        }
      }
    } catch (error: any) {
      Logger.error("Failed to resend verification email:", error);
      if (isInitial) {
        setIsInitialLoading(false);
        setInitialLoadError(true);
      } else {
        showLocalBanner(
          "Error",
          error.message ||
            "Failed to send verification email. Please try again.",
          "error",
          3000,
        );
      }
    } finally {
      if (!isInitial) {
        setIsResending(false);
      }
    }
  };

  // Resend verification email when modal opens (first time only)
  useEffect(() => {
    setCode(["", "", "", "", ""]);
    if (screen === "login") {
      handleResendCode(true);
    }
  }, []);

  const handleVerifyCode = async (verificationCode: string) => {
    setIsVerifying(true);
    try {
      // Use accessToken prop if provided, otherwise let interceptor use Redux token
      // The interceptor will automatically add token from Redux if Authorization header is not set
      const config = accessToken
        ? {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        : undefined;

      const response = await ApiService.post<{
        success: boolean;
        message: string;
      }>(
        emailVerificationEndpoints.verify,
        {
          code: verificationCode,
        },
        config,
      );

      if (response.success) {
        showLocalBanner(
          "Success",
          response.message || "Email verified successfully.",
          "success",
          3000,
        );
        // Call onCodeComplete callback on success
        onCodeComplete?.();
      } else {
        showLocalBanner(
          "Error",
          response.message || "Invalid verification code.",
          "error",
          3000,
        );
        // Reset code on error
        setCode(["", "", "", "", ""]);
        setTimeout(() => {
          inputRefs.current[0]?.focus();
        }, 100);
      }
    } catch (error: any) {
      Logger.error("Failed to verify email:", error);
      // Get actual API error message from response data
      const errorMessage =
        error.data?.message ||
        error.response?.data?.message ||
        error.message ||
        "Failed to verify email. Please try again.";

      showLocalBanner("Error", errorMessage, "error", 3000);
      // Reset code on error
      setCode(["", "", "", "", ""]);
      setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 100);
    } finally {
      setIsVerifying(false);
    }

    // onCodeComplete?.();
  };

  const openChangeEmail = () => {
    setNewEmail(currentEmail);
    setNewEmailError(null);
    setIsEditingEmail(true);
  };

  const handleChangeEmail = async () => {
    const trimmed = newEmail.trim();
    const validation = validateEmail(trimmed);
    if (!validation.isValid) {
      setNewEmailError(validation.error);
      return;
    }
    Keyboard.dismiss();
    setIsChangingEmail(true);
    setNewEmailError(null);
    try {
      const config = accessToken
        ? {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        : undefined;

      const response = await ApiService.post<{
        success: boolean;
        message: string;
        data?: { email?: string };
      }>(emailVerificationEndpoints.changeEmail, { email: trimmed }, config);

      if (response.success) {
        const savedEmail = response.data?.email || trimmed.toLowerCase();
        setCurrentEmail(savedEmail);
        setCode(["", "", "", "", ""]);
        setResendSeconds(RESEND_COOLDOWN_SECONDS);
        setIsEditingEmail(false);
        onEmailChanged?.(savedEmail);
        showLocalBanner(
          "Success",
          response.message || `A new code has been sent to ${savedEmail}.`,
          "success",
          3000,
        );
      } else {
        setNewEmailError(response.message || "Failed to change email.");
      }
    } catch (error: any) {
      Logger.error("Failed to change email:", error);
      setNewEmailError(
        error.data?.errors?.email?.[0] ||
          error.data?.message ||
          error.message ||
          "Failed to change email. Please try again.",
      );
    } finally {
      setIsChangingEmail(false);
    }
  };

  const handleCodeChange = useCallback(
    (text: string, index: number) => {
      // Don't allow changes while verifying
      if (isVerifying) {
        return;
      }

      const digits = text.replace(/\D/g, "");

      // Keyboard autofill / paste: spread the code across the boxes
      if (digits.length > 2) {
        const pasted = digits.slice(-5).split("");
        const start = pasted.length === 5 ? 0 : index;
        setCode((prevCode) => {
          const newCode = [...prevCode];
          pasted.forEach((d, i) => {
            if (start + i < 5) newCode[start + i] = d;
          });
          const fullCode = newCode.join("");
          if (fullCode.length === 5) {
            Keyboard.dismiss();
            handleVerifyCode(fullCode);
          } else {
            const next = Math.min(start + pasted.length, 4);
            setTimeout(() => inputRefs.current[next]?.focus(), 0);
          }
          return newCode;
        });
        return;
      }

      // Only allow single digit
      if (text.length > 1) {
        text = text.slice(-1);
      }

      // Only allow numbers
      if (text && !/^\d$/.test(text)) {
        return;
      }

      setCode((prevCode) => {
        const newCode = [...prevCode];
        newCode[index] = text;

        // Auto-focus next input if digit entered
        if (text && index < 4) {
          setTimeout(() => {
            inputRefs.current[index + 1]?.focus();
          }, 0);
        }

        // Check if all fields are filled
        const fullCode = newCode.join("");
        if (fullCode.length === 5) {
          Keyboard.dismiss();
          // Call verify API when all 5 digits are entered
          handleVerifyCode(fullCode);
        }

        return newCode;
      });
    },
    [isVerifying, handleVerifyCode],
  );

  const handleKeyPress = (e: any, index: number) => {
    // Handle backspace to move to previous input
    if (e.nativeEvent.key === "Backspace" && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable
          style={styles.container}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <View
            style={[
              styles.headerContainer,
              { paddingTop: insets.top + moderateHeightScale(12) },
            ]}
          >
            <View style={styles.headerRow}>
              <TouchableOpacity
                onPress={onClose}
                style={styles.backButton}
                hitSlop={10}
              >
                <Feather
                  name="arrow-left"
                  size={iconScale(22)}
                  color={theme.darkGreen}
                />
              </TouchableOpacity>
            </View>
            <View style={styles.line} />
          </View>

          {/* Content */}
          <View style={styles.contentWrapper}>
            <Text style={styles.title}>Verify account</Text>

            <View style={styles.instructionContainer}>
              <Text style={styles.instructionText}>
                Enter a one time code that we sent to
              </Text>
              <Text style={styles.emailText}>{currentEmail}</Text>
            </View>

            {isEditingEmail ? (
              <View style={styles.changeEmailForm}>
                <TextInput
                  style={[
                    styles.emailInput,
                    !!newEmailError && styles.emailInputError,
                  ]}
                  value={newEmail}
                  onChangeText={(text) => {
                    setNewEmail(text);
                    setNewEmailError(null);
                  }}
                  placeholder="Enter your email"
                  placeholderTextColor={theme.lightGreen}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="email"
                  autoFocus
                  editable={!isChangingEmail}
                  returnKeyType="done"
                  onSubmitEditing={handleChangeEmail}
                />
                {!!newEmailError && (
                  <Text style={styles.emailErrorText}>{newEmailError}</Text>
                )}
                <View style={styles.changeEmailButtons}>
                  <TouchableOpacity
                    style={styles.changeEmailButton}
                    onPress={() => setIsEditingEmail(false)}
                    disabled={isChangingEmail}
                  >
                    <Text style={styles.changeEmailCancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.changeEmailButton, styles.changeEmailSave]}
                    onPress={handleChangeEmail}
                    disabled={isChangingEmail}
                  >
                    {isChangingEmail ? (
                      <ActivityIndicator size="small" color={theme.white} />
                    ) : (
                      <Text style={styles.changeEmailSaveText}>
                        Send new code
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            ) : isInitialLoading && !initialLoadError ? (
              <SkeletonPlaceholder
                backgroundColor="#E8DFB8"
                highlightColor="#DCCF9E"
              >
                <View style={styles.skeletonWrapper}>
                  <View style={styles.skeletonCodeContainer}>
                    {[...Array(5)].map((_, index) => (
                      <View key={index} style={styles.skeletonCodeInput} />
                    ))}
                  </View>
                  <View style={styles.skeletonResend} />
                </View>
              </SkeletonPlaceholder>
            ) : initialLoadError ? (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>
                  Failed to send verification email. Please try again.
                </Text>
                <RetryButton
                  onPress={() => handleResendCode(true)}
                  loading={isInitialLoading}
                />
              </View>
            ) : (
              <>
                <View style={styles.codeContainer}>
                  {code.map((digit, index) => (
                    <TextInput
                      key={index}
                      ref={(ref) => {
                        inputRefs.current[index] = ref;
                      }}
                      style={[
                        styles.codeInput,
                        (isVerifying || isResending) && styles.disabledInput,
                      ]}
                      value={digit}
                      onChangeText={(text) => handleCodeChange(text, index)}
                      onKeyPress={(e) => handleKeyPress(e, index)}
                      keyboardType="number-pad"
                      textContentType="oneTimeCode"
                      autoComplete={
                        Platform.OS === "android" ? "sms-otp" : "one-time-code"
                      }
                      importantForAutofill="yes"
                      maxLength={5}
                      selectTextOnFocus
                      editable={!isVerifying && !isResending}
                    />
                  ))}
                </View>

                {(isVerifying || isResending) && (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color={theme.darkGreen} />
                  </View>
                )}

                <Pressable
                  onPress={() => handleResendCode(false)}
                  style={styles.resendLink}
                  disabled={isResending || isVerifying || resendSeconds > 0}
                  // Links sit 32 apart; 12 each way keeps their slops apart
                  hitSlop={{ top: 12, bottom: 12, left: 16, right: 16 }}
                >
                  <Text
                    style={[
                      styles.resendText,
                      (isResending || isVerifying || resendSeconds > 0) &&
                        styles.disabledInput,
                    ]}
                  >
                    {isResending
                      ? "Sending..."
                      : resendSeconds > 0
                        ? `Resend code in 0:${String(resendSeconds).padStart(2, "0")}`
                        : "Didn't get a code?"}
                  </Text>
                </Pressable>

                <Pressable
                  onPress={openChangeEmail}
                  disabled={isResending || isVerifying}
                  hitSlop={{ top: 12, bottom: 12, left: 16, right: 16 }}
                >
                  <Text
                    style={[
                      styles.changeEmailLink,
                      (isResending || isVerifying) && styles.disabledInput,
                    ]}
                  >
                    Wrong email? Change it
                  </Text>
                </Pressable>
              </>
            )}
          </View>
        </Pressable>
      </Pressable>

      {/* Local notification banner rendered above this modal */}
      <NotificationBanner
        visible={localBannerVisible}
        title={localBannerTitle}
        message={localBannerMessage}
        type={localBannerType}
        duration={localBannerDuration}
        onDismiss={() => setLocalBannerVisible(false)}
      />
    </Modal>
  );
}
