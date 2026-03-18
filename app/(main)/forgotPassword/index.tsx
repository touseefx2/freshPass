import React, { useMemo, useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  Keyboard,
  TouchableWithoutFeedback,
  ScrollView,
  StatusBar,
} from "react-native";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { createStyles } from "./styles";
import RegisterHeader from "@/src/components/registerHeader";
import { router, useLocalSearchParams } from "expo-router";
import { ApiService } from "@/src/services/api";
import { businessEndpoints } from "@/src/services/endpoints";
import FloatingInput from "@/src/components/floatingInput";
import Button from "@/src/components/button";
import { validateEmail } from "@/src/services/validationService";
import { useNotificationContext } from "@/src/contexts/NotificationContext";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ForgotPassword() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const { showBanner } = useNotificationContext();
  const params = useLocalSearchParams<{ email?: string }>();
  const initialEmail = typeof params.email === "string" ? params.email : "";
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);

  const [email, setEmail] = useState(initialEmail);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (email.length > 0) {
      const validation = validateEmail(email);
      setEmailError(validation.error);
    } else {
      setEmailError(null);
    }
  }, [email]);

  const handleEmailClear = useCallback(() => {
    setEmail("");
    setEmailError(null);
  }, []);

  const handleSubmit = useCallback(async () => {
    Keyboard.dismiss();
    const validation = validateEmail(email.trim());
    if (!validation.isValid) {
      setEmailError(validation.error);
      return;
    }
    setIsLoading(true);
    try {
      const response = await ApiService.post(businessEndpoints.forgotPassword, {
        email: email.trim(),
      });
      const message =
        (response as { message?: string }).message ||
        t("forgotPasswordSuccessMessage", {
          defaultValue:
            "If an account exists for that email, a password reset link has been sent.",
        });
      showBanner(t("forgotPassword"), message, "success", 5000);
    } catch (error: any) {
      const message =
        error?.message ||
        t("forgotPasswordError", {
          defaultValue: "Something went wrong. Please try again.",
        });
      showBanner(t("error"), message, "error", 4000);
    } finally {
      setIsLoading(false);
    }
  }, [email, t, showBanner]);

  const isFormValid =
    email.trim().length > 0 && validateEmail(email.trim()).isValid;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar
        animated
        translucent
        backgroundColor={(colors as Theme).background}
        barStyle={"dark-content"}
      />
      <RegisterHeader onBack={() => router.back()} />
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.container}>
          <ScrollView
            style={styles.mainContent}
            contentContainerStyle={{ flexGrow: 1 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.titleSection}>
              <Text style={styles.title}>
                {t("forgotPasswordTitle", {
                  defaultValue: "Reset your password",
                })}
              </Text>
              <Text style={styles.subtitle}>
                {t("forgotPasswordSubtitle", {
                  defaultValue:
                    "Enter your email and we'll send you a link to reset your password.",
                })}
              </Text>
            </View>
            <View style={styles.content}>
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
            </View>
          </ScrollView>
          <View style={styles.bottomSection}>
            <Button
              title={t("forgotPasswordSendLink")}
              onPress={handleSubmit}
              disabled={!isFormValid}
              loading={isLoading}
              containerStyle={styles.buttonWrapper}
            />
          </View>
        </View>
      </TouchableWithoutFeedback>
    </SafeAreaView>
  );
}
