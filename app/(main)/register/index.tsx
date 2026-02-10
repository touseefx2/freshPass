import React, { useMemo, useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  StatusBar,
  StyleSheet,
  Pressable,
  Keyboard,
  TouchableWithoutFeedback,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { FontAwesome5 } from "@expo/vector-icons";
import { useTheme, useAppSelector } from "@/src/hooks/hooks";
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
import { validateEmail } from "@/src/services/validationService";
import { useRouter } from "expo-router";
import { MAIN_ROUTES } from "@/src/constant/routes";

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
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      flexGrow: 1,
      paddingBottom: moderateHeightScale(32),
    },
    content: {
      gap: moderateHeightScale(16),
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
    description: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.darkGreen,
      lineHeight: fontSize.size18,
    },
    newsletterRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(12),
    },
    newsletterIconWrapper: {
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
    newsletterText: {
      flex: 1,
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.darkGreen,
      lineHeight: fontSize.size18,
    },
    primaryButtonWrapper: {
      marginTop: moderateHeightScale(4),
    },
    socialList: {},
    footer: {
      alignItems: "center",
      marginTop: moderateHeightScale(16),
      flexShrink: 0,
    },
    footerText: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: theme.darkGreen,
      textAlign: "center",
    },
    loginLink: {
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

export default function Register() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors as Theme), [colors]);
  const router = useRouter();

  // Get saved email from general state (if exists from previous registration)
  const savedEmail = useAppSelector((state) => state.general.registerEmail);

  const userRole = useAppSelector((state) => state.general.role);
  const isCustomer = userRole === "customer";
  const [email, setEmail] = useState(savedEmail || DEFAULT_EMAIL);
  const [isSubscribed, setIsSubscribed] = useState(true);
  const [emailError, setEmailError] = useState<string | null>(null);

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

  const handleClear = useCallback(() => {
    setEmail("");
    setEmailError(null);
  }, []);

  const handleToggleNewsletter = useCallback(() => {
    setIsSubscribed((prev) => !prev);
  }, []);

  const handleContinue = useCallback(() => {
    Keyboard.dismiss();
    router.push({
      pathname: `/${MAIN_ROUTES.REGISTER_PASSWORD}`,
      params: { email: email.trim(), isSubscribed: isSubscribed.toString() },
    });
  }, [email, isSubscribed, router]);

  const handleLogin = useCallback(() => {
    router.back();
  }, [router]);

  const { handleSocialLogin } = useSocialLogin();

  const isFormValid = email.length > 0 && validateEmail(email).isValid;

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
            <ScrollView
              style={styles.scrollView}
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.content}>
                <View style={styles.titleSection}>
                  <Text style={styles.title}>
                    Create your {userRole} profile
                  </Text>
                  <Text style={styles.description}>
                    Upload your photo and enter your details to get started with
                    FreshPass.
                  </Text>
                </View>

                <FloatingInput
                  label="Email"
                  value={email}
                  onChangeText={setEmail}
                  placeholder="Enter your email"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  onClear={handleClear}
                />

                {emailError && (
                  <Text style={styles.errorText}>{emailError}</Text>
                )}

                <Pressable
                  onPress={handleToggleNewsletter}
                  style={styles.newsletterRow}
                  hitSlop={moderateWidthScale(8)}
                >
                  <View style={styles.newsletterIconWrapper}>
                    <View style={styles.checkbox}>
                      {isSubscribed && (
                        <FontAwesome5
                          name="check"
                          size={moderateWidthScale(14)}
                          color={(colors as Theme).orangeBrown}
                        />
                      )}
                    </View>
                  </View>
                  <Text style={styles.newsletterText}>
                    I would like to receive newsletter and promotion on email by
                    FreshPass
                  </Text>
                </Pressable>

                <Button
                  title="Continue"
                  onPress={handleContinue}
                  disabled={!isFormValid}
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
                    Already have an account?{" "}
                    <Text style={styles.loginLink} onPress={handleLogin}>
                      Login
                    </Text>
                  </Text>
                </View>
              </View>
            </ScrollView>
          </View>
        </View>
      </TouchableWithoutFeedback>
    </SafeAreaView>
  );
}
