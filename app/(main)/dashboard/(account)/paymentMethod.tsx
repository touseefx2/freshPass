import React, { useMemo, useRef, useState } from "react";
import { StyleSheet, View, Text, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { CardField, useStripe } from "@stripe/stripe-react-native";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  moderateHeightScale,
  moderateWidthScale,
  iconScale,
} from "@/src/theme/dimensions";
import StackHeader from "@/src/components/StackHeader";
import Button from "@/src/components/button";
import { ApiService } from "@/src/services/api";
import { businessEndpoints } from "@/src/services/endpoints";
import { useNotificationContext } from "@/src/contexts/NotificationContext";
import { formatCardLabel } from "@/src/utils/cardLabel";

type SavedCard = { lastFour: string; brand?: string | null };

/**
 * Stripe's field only takes #RRGGBB on Android (rgba() / 8-digit theme tokens
 * crash Color.parseColor): darkGreen text, muted placeholder, light neutral
 * border like the client sample, red errors.
 */
const CARD_FIELD_STYLE = {
  backgroundColor: "#FFFFFF",
  textColor: "#283618",
  placeholderColor: "#7E8674",
  borderColor: "#D9D7D3",
  borderWidth: 1,
  borderRadius: 10,
  fontSize: 16,
  cursorColor: "#283618",
  textErrorColor: "#BA1A1A",
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background },
    scroll: {
      paddingHorizontal: moderateWidthScale(16),
      paddingTop: moderateHeightScale(16),
      paddingBottom: moderateHeightScale(32),
      gap: moderateHeightScale(20),
    },
    card: {
      backgroundColor: theme.white,
      borderRadius: moderateWidthScale(16),
      padding: moderateWidthScale(20),
      shadowColor: theme.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 8,
      elevation: 2,
    },
    title: {
      fontSize: fontSize.size24,
      fontFamily: fonts.fontExtraBold,
      color: theme.darkGreen,
    },
    subtitle: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontRegular,
      color: theme.textMuted,
      marginTop: moderateHeightScale(6),
      lineHeight: fontSize.size20,
    },
    cardField: {
      width: "100%",
      // Stripe's native field needs a fixed height (number, MM / YY, CVC, ZIP)
      height: Platform.OS === "ios" ? 54 : 58,
      marginTop: moderateHeightScale(20),
    },
    saveButton: { marginTop: moderateHeightScale(20) },
    saveButtonText: { fontSize: fontSize.size17 },
    secureRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: moderateWidthScale(6),
      marginTop: moderateHeightScale(14),
    },
    secureText: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: theme.textMuted,
    },
    successCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(16),
      backgroundColor: theme.successCardBg,
      borderWidth: 1,
      borderColor: theme.successCardBorder,
      borderRadius: moderateWidthScale(16),
      paddingVertical: moderateHeightScale(18),
      paddingHorizontal: moderateWidthScale(18),
    },
    successIcon: {
      width: moderateWidthScale(44),
      height: moderateWidthScale(44),
      borderRadius: moderateWidthScale(22),
      backgroundColor: theme.successCheck,
      alignItems: "center",
      justifyContent: "center",
    },
    successCopy: { flex: 1, gap: moderateHeightScale(4) },
    successTitle: {
      fontSize: fontSize.size18,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    successText: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.textMuted,
      lineHeight: fontSize.size20,
    },
  });

/**
 * Stripe-billed plans only: update the renewal card in-app with Stripe's own
 * card field (card data never touches our code or server).
 * Flow: SetupIntent from server → confirm in Stripe SDK → server makes the
 * new card the default for the subscription.
 *
 * One-line CardField on purpose: Stripe RN 0.76 has no separate-box fields
 * (CardForm is one grouped box + a Country row, and crashes on Android
 * without a MaterialComponents theme), and raw card numbers can't be sent.
 */
export default function PaymentMethodScreen() {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);
  const { t } = useTranslation();
  const router = useRouter();
  const { showBanner } = useNotificationContext();
  const { confirmSetupIntent } = useStripe();
  const params = useLocalSearchParams<{ subscriptionId?: string }>();
  const subscriptionId = Number(params.subscriptionId);

  const [complete, setComplete] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<SavedCard | null>(null);
  /** Brand Stripe detected while typing ("Visa"), used if the server sends none */
  const typedBrandRef = useRef<string | null>(null);

  const handleSave = async () => {
    if (!complete || saving || !Number.isFinite(subscriptionId)) return;
    setSaving(true);
    try {
      const intent = await ApiService.post<{
        success: boolean;
        message?: string;
        data?: { clientSecret?: string };
      }>(businessEndpoints.subscriptionSetupIntent(subscriptionId), {});
      const clientSecret = intent.data?.clientSecret;
      if (!intent.success || !clientSecret) {
        throw new Error(intent.message || t("failedToUpdateCard"));
      }

      const { setupIntent, error } = await confirmSetupIntent(clientSecret, {
        paymentMethodType: "Card",
      });
      if (error) throw new Error(error.message || t("failedToUpdateCard"));
      const paymentMethodId = setupIntent?.paymentMethodId;
      if (!paymentMethodId) throw new Error(t("failedToUpdateCard"));

      const result = await ApiService.post<{
        success: boolean;
        message?: string;
        data?: { cardLastFour?: string | null; cardBrand?: string | null };
      }>(businessEndpoints.subscriptionPaymentMethod(subscriptionId), {
        payment_method_id: paymentMethodId,
      });
      if (!result.success || !result.data?.cardLastFour) {
        throw new Error(result.message || t("failedToUpdateCard"));
      }
      setSaved({
        lastFour: result.data.cardLastFour,
        brand: result.data.cardBrand ?? typedBrandRef.current,
      });
    } catch (err: any) {
      showBanner(
        t("error"),
        err?.message || t("failedToUpdateCard"),
        "error",
        3500,
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView edges={["bottom"]} style={styles.container}>
      <StackHeader title={t("paymentMethodTitle")} />
      <KeyboardAwareScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {saved ? (
          <>
            <View style={styles.successCard} accessibilityRole="summary">
              <View style={styles.successIcon}>
                <Feather name="check" size={iconScale(24)} color={theme.white} />
              </View>
              <View style={styles.successCopy}>
                <Text style={styles.successTitle}>{t("cardUpdatedTitle")}</Text>
                <Text style={styles.successText}>
                  {t("cardUpdatedMessage", {
                    card: formatCardLabel(t, saved.lastFour, saved.brand),
                  })}
                </Text>
              </View>
            </View>
            <Button
              title={t("done")}
              onPress={() => router.back()}
              backgroundColor={theme.darkGreen}
              textStyle={styles.saveButtonText}
            />
          </>
        ) : (
          <View style={styles.card}>
            <Text style={styles.title}>{t("updateYourCard")}</Text>
            <Text style={styles.subtitle}>{t("updateCardSubtitle")}</Text>

            <CardField
              style={styles.cardField}
              disabled={saving}
              postalCodeEnabled
              placeholders={{
                number: t("cardNumber"),
                expiration: t("expiryPlaceholder"),
                cvc: t("cvc"),
                postalCode: t("zipCode"),
              }}
              onCardChange={(details) => {
                setComplete(!!details?.complete);
                const brand = details?.brand;
                typedBrandRef.current =
                  brand && brand !== "Unknown" ? brand : null;
              }}
              cardStyle={CARD_FIELD_STYLE}
            />

            <Button
              title={t("saveCard")}
              onPress={() => void handleSave()}
              disabled={!complete}
              loading={saving}
              backgroundColor={theme.darkGreen}
              containerStyle={styles.saveButton}
              textStyle={styles.saveButtonText}
            />
            <View style={styles.secureRow}>
              <Feather name="lock" size={iconScale(15)} color={theme.textMuted} />
              <Text style={styles.secureText}>
                {t("securelyProcessedByStripe")}
              </Text>
            </View>
          </View>
        )}
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}
