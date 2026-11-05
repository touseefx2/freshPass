import React, { useMemo, useState } from "react";
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

/** Brand colors flattened to solid hex (darkGreen, lightGreen on white, borderMedium on white, red) */
const CARD_FIELD_STYLE = {
  backgroundColor: "#FFFFFF",
  textColor: "#283618",
  placeholderColor: "#7E8674",
  borderColor: "#B4B9AC",
  borderWidth: 1,
  borderRadius: 12,
  fontSize: 16,
  cursorColor: "#283618",
  textErrorColor: "#BA1A1A",
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background },
    scroll: {
      paddingHorizontal: moderateWidthScale(20),
      paddingTop: moderateHeightScale(20),
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
      fontSize: fontSize.size22,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    subtitle: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      marginTop: moderateHeightScale(4),
      lineHeight: fontSize.size20,
    },
    currentCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(8),
      marginTop: moderateHeightScale(14),
      paddingVertical: moderateHeightScale(10),
      paddingHorizontal: moderateWidthScale(12),
      borderRadius: moderateWidthScale(10),
      backgroundColor: theme.lightGreen05,
    },
    currentCardText: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
    },
    cardForm: {
      width: "100%",
      // Stripe's native field needs a fixed height (number, MM/YY, CVC, ZIP)
      height: Platform.OS === "ios" ? 52 : 56,
      marginTop: moderateHeightScale(18),
    },
    saveButton: { marginTop: moderateHeightScale(20) },
    secureRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: moderateWidthScale(6),
      marginTop: moderateHeightScale(14),
    },
    secureText: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
    },
    successCard: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: moderateWidthScale(14),
      backgroundColor: theme.mintTint,
      borderWidth: 1,
      borderColor: theme.mintTintStrong,
      borderRadius: moderateWidthScale(16),
      padding: moderateWidthScale(18),
    },
    successIcon: {
      width: moderateWidthScale(40),
      height: moderateWidthScale(40),
      borderRadius: moderateWidthScale(20),
      backgroundColor: theme.successGreen,
      alignItems: "center",
      justifyContent: "center",
    },
    successCopy: { flex: 1, gap: moderateHeightScale(4) },
    successTitle: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    successText: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      lineHeight: fontSize.size20,
    },
  });

/**
 * Stripe-billed plans only: update the renewal card in-app with Stripe's own
 * card form (card data never touches our code or server).
 * Flow: SetupIntent from server → confirm in Stripe SDK → server makes the
 * new card the default for the subscription.
 */
export default function PaymentMethodScreen() {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);
  const { t } = useTranslation();
  const router = useRouter();
  const { showBanner } = useNotificationContext();
  const { confirmSetupIntent } = useStripe();
  const params = useLocalSearchParams<{
    subscriptionId?: string;
    cardLastFour?: string;
    cardBrand?: string;
  }>();
  const subscriptionId = Number(params.subscriptionId);

  const [complete, setComplete] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<SavedCard | null>(null);

  const currentCard = params.cardLastFour
    ? formatCardLabel(t, params.cardLastFour, params.cardBrand)
    : null;

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
        brand: result.data.cardBrand,
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
                <Feather name="check" size={iconScale(22)} color={theme.white} />
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
            <Button title={t("done")} onPress={() => router.back()} />
          </>
        ) : (
          <View style={styles.card}>
            <Text style={styles.title}>{t("updateYourCard")}</Text>
            <Text style={styles.subtitle}>{t("updateCardSubtitle")}</Text>
            {currentCard ? (
              <View style={styles.currentCard}>
                <Feather
                  name="credit-card"
                  size={iconScale(16)}
                  color={theme.darkGreenLight}
                />
                <Text style={styles.currentCardText}>
                  {t("currentCardLabel", { card: currentCard })}
                </Text>
              </View>
            ) : null}

            {/* CardField, not CardForm: CardForm crashes on Android without a
                MaterialComponents app theme (InflateException, 11-05) */}
            <CardField
              style={styles.cardForm}
              disabled={saving}
              postalCodeEnabled
              placeholders={{
                number: t("cardNumber"),
                postalCode: t("zipCode"),
              }}
              onCardChange={(details) => setComplete(!!details?.complete)}
              // Android's Color.parseColor only takes #RRGGBB here: rgba() and
              // 8-digit theme tokens crash it ("Unknown color")
              cardStyle={CARD_FIELD_STYLE}
            />

            <Button
              title={t("saveCard")}
              onPress={() => void handleSave()}
              disabled={!complete}
              loading={saving}
              containerStyle={styles.saveButton}
            />
            <View style={styles.secureRow}>
              <Feather name="lock" size={iconScale(13)} color={theme.lightGreen} />
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
