import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
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
import { walletEndpoints } from "@/src/services/endpoints";
import { useNotificationContext } from "@/src/contexts/NotificationContext";
import { formatCardLabel } from "@/src/utils/cardLabel";
import Logger from "@/src/services/logger";
import { ensureStripeReady } from "@/src/services/stripeService";

type InUseBy = {
  type: "membership" | "business_plan";
  subscription_id: number;
  name: string;
  business_name?: string;
};

type WalletCard = {
  id: string;
  brand: string;
  last4: string;
  exp_month: number;
  exp_year: number;
  is_default: boolean;
  in_use_by: InUseBy[];
};

type WalletListResponse = {
  success: boolean;
  message?: string;
  data: WalletCard[];
};

type SetupIntentResponse = {
  success: boolean;
  message?: string;
  data?: {
    clientSecret?: string;
    customer?: string;
    customerSessionClientSecret?: string;
  };
};

type SetDefaultResponse = {
  success: boolean;
  message?: string;
  data?: WalletCard;
};

type DeleteResponse = {
  success: boolean;
  message?: string;
  error?: string;
  data?: {
    error_code?: string;
    in_use_by?: InUseBy[];
  } | null;
};

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

const BRAND_GRADIENTS: Record<string, [string, string]> = {
  visa: ["#1A1F71", "#2B3494"],
  mastercard: ["#1A1A2E", "#2D2D44"],
  amex: ["#006FCF", "#1580D4"],
  discover: ["#FF6000", "#E55600"],
  default: ["#283618", "#3A5226"],
};

function getBrandGradient(brand: string): [string, string] {
  const key = (brand ?? "").toLowerCase().replace(/[\s_-]/g, "");
  return BRAND_GRADIENTS[key] ?? BRAND_GRADIENTS.default;
}

const SCREEN_W = Dimensions.get("window").width;
const H_PAD = moderateWidthScale(16);
const CARD_GAP = moderateWidthScale(10);
const CARD_W = Math.floor((SCREEN_W - H_PAD * 2 - CARD_GAP) / 2);
const COMPACT_H = moderateHeightScale(135);

const BRAND_DISPLAY: Record<string, string> = {
  visa: "VISA",
  mastercard: "Mastercard",
  amex: "AMEX",
  discover: "DISCOVER",
  jcb: "JCB",
  unionpay: "UnionPay",
  diners: "Diners",
  dinersclub: "Diners",
};

function getServerBody(err: any): any {
  return err?.response?.data ?? null;
}

function getServerMessage(err: any, fallback: string): string {
  const body = getServerBody(err);
  return body?.message || body?.error || err?.message || fallback;
}

function getBrandDisplay(brand: string): string {
  const key = (brand ?? "").toLowerCase().replace(/[\s_-]/g, "");
  return BRAND_DISPLAY[key] ?? brand ?? "Card";
}

function CreditCard({
  card,
  onMakeDefault,
  onDelete,
  isSettingDefault,
  isDeleting,
  theme,
}: {
  card: WalletCard;
  onMakeDefault: () => void;
  onDelete: () => void;
  isSettingDefault: boolean;
  isDeleting: boolean;
  theme: Theme;
}) {
  const { t } = useTranslation();
  const gradient = getBrandGradient(card.brand);
  const busy = isSettingDefault || isDeleting;

  return (
    <View style={cardStyles.wrapper}>
      <LinearGradient
        colors={gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[cardStyles.card, card.is_default && cardStyles.cardDefault]}
      >
        <View style={cardStyles.topRow}>
          <View style={cardStyles.chip}>
            <View style={cardStyles.chipLineH} />
            <View style={cardStyles.chipLineV} />
          </View>
          <Text style={cardStyles.brandText}>
            {getBrandDisplay(card.brand)}
          </Text>
        </View>

        <View style={cardStyles.numberRow}>
          <Text style={cardStyles.dots}>••••</Text>
          <Text style={cardStyles.last4}>{card.last4}</Text>
        </View>

        <View style={cardStyles.bottomRow}>
          <Text style={cardStyles.expiry}>
            {String(card.exp_month).padStart(2, "0")}/
            {String(card.exp_year).slice(-2)}
          </Text>
          {card.is_default && (
            <MaterialCommunityIcons
              name="shield-check"
              size={moderateWidthScale(16)}
              color="rgba(255,215,0,0.85)"
            />
          )}
        </View>

        <View style={cardStyles.decoCircle} />
        <View style={cardStyles.decoCircle2} />
        <View style={cardStyles.decoShine} />
      </LinearGradient>

      <View style={cardStyles.actions}>
        {!card.is_default ? (
          <TouchableOpacity
            onPress={onMakeDefault}
            disabled={busy}
            activeOpacity={0.7}
            style={[cardStyles.actionBtn, cardStyles.actionBtnGreen]}
          >
            {isSettingDefault ? (
              <ActivityIndicator size="small" color={theme.darkGreen} />
            ) : (
              <>
                <MaterialCommunityIcons
                  name="star-outline"
                  size={moderateWidthScale(14)}
                  color={theme.darkGreen}
                />
                <Text
                  style={[cardStyles.actionText, { color: theme.darkGreen }]}
                >
                  {t("walletMakeDefault")}
                </Text>
              </>
            )}
          </TouchableOpacity>
        ) : (
          <View style={[cardStyles.actionBtn, cardStyles.actionBtnDefaultPill]}>
            <MaterialCommunityIcons
              name="star"
              size={moderateWidthScale(14)}
              color="#BC6C25"
            />
            <Text style={[cardStyles.actionText, { color: "#BC6C25" }]}>
              {t("walletDefault")}
            </Text>
          </View>
        )}
        <TouchableOpacity
          onPress={onDelete}
          disabled={busy}
          activeOpacity={0.7}
          style={[cardStyles.actionBtn, cardStyles.actionBtnRed]}
        >
          {isDeleting ? (
            <ActivityIndicator size="small" color="#BA1A1A" />
          ) : (
            <Feather
              name="trash-2"
              size={moderateWidthScale(14)}
              color="#BA1A1A"
            />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

function AddCardButton({
  onPress,
  theme,
}: {
  onPress: () => void;
  theme: Theme;
}) {
  const { t } = useTranslation();
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={cardStyles.wrapper}
    >
      <View
        style={[
          cardStyles.addCard,
          {
            borderColor: theme.darkGreen15,
            backgroundColor: theme.orangeBrown015,
          },
        ]}
      >
        <View
          style={[
            cardStyles.addCircle,
            { backgroundColor: theme.darkGreen },
          ]}
        >
          <Feather name="plus" size={iconScale(20)} color="#FFFFFF" />
        </View>
        <Text style={[cardStyles.addLabel, { color: theme.darkGreen }]}>
          {t("walletAddCard")}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

function EmptyState({ onAdd, theme }: { onAdd: () => void; theme: Theme }) {
  const { t } = useTranslation();
  return (
    <View style={emptyStyles.container}>
      {/* Ghost card */}
      <View style={[emptyStyles.ghostCard, { backgroundColor: theme.orangeBrown015 }]}>
        <View style={emptyStyles.ghostTopRow}>
          <View style={[emptyStyles.ghostChip, { backgroundColor: theme.darkGreen15 }]} />
          <View style={[emptyStyles.ghostBrand, { backgroundColor: theme.darkGreen15 }]} />
        </View>
        <View style={emptyStyles.ghostDotsRow}>
          <View style={[emptyStyles.ghostDot, { backgroundColor: theme.darkGreen15 }]} />
          <View style={[emptyStyles.ghostDot, { backgroundColor: theme.darkGreen15 }]} />
          <View style={[emptyStyles.ghostDot, { backgroundColor: theme.darkGreen15 }]} />
          <View style={[emptyStyles.ghostDotLast, { backgroundColor: theme.darkGreen15 }]} />
        </View>
        <View style={emptyStyles.ghostBottomRow}>
          <View style={[emptyStyles.ghostLine, { backgroundColor: theme.darkGreen15 }]} />
          <View style={[emptyStyles.ghostLineShort, { backgroundColor: theme.darkGreen15 }]} />
        </View>
        <View
          style={[
            emptyStyles.ghostPlusCircle,
            { backgroundColor: theme.darkGreen, borderColor: theme.background },
          ]}
        >
          <Feather name="plus" size={iconScale(20)} color="#FFFFFF" />
        </View>
      </View>
      <Text style={[emptyStyles.title, { color: theme.darkGreen }]}>
        {t("walletEmpty")}
      </Text>
      <Text style={[emptyStyles.subtitle, { color: theme.textMuted }]}>
        {t("walletEmptySubtitle")}
      </Text>
      <Button
        title={t("walletAddCard")}
        onPress={onAdd}
        leftIcon={<Feather name="plus" size={iconScale(18)} color="#FFFFFF" />}
        backgroundColor={theme.darkGreen}
        containerStyle={emptyStyles.button}
      />
    </View>
  );
}

const emptyStyles = StyleSheet.create({
  container: {
    alignItems: "center",
    paddingTop: moderateHeightScale(40),
    paddingHorizontal: moderateWidthScale(24),
    gap: moderateHeightScale(10),
  },
  ghostCard: {
    width: moderateWidthScale(260),
    height: moderateHeightScale(160),
    borderRadius: moderateWidthScale(16),
    padding: moderateWidthScale(20),
    justifyContent: "space-between",
    marginBottom: moderateHeightScale(12),
    opacity: 0.7,
  },
  ghostTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  ghostChip: {
    width: moderateWidthScale(34),
    height: moderateWidthScale(26),
    borderRadius: moderateWidthScale(5),
  },
  ghostBrand: {
    width: moderateWidthScale(50),
    height: moderateWidthScale(20),
    borderRadius: moderateWidthScale(4),
  },
  ghostDotsRow: {
    flexDirection: "row",
    gap: moderateWidthScale(10),
    alignItems: "center",
  },
  ghostDot: {
    width: moderateWidthScale(36),
    height: moderateHeightScale(10),
    borderRadius: moderateWidthScale(5),
  },
  ghostDotLast: {
    width: moderateWidthScale(42),
    height: moderateHeightScale(12),
    borderRadius: moderateWidthScale(6),
  },
  ghostBottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  ghostLine: {
    width: moderateWidthScale(80),
    height: moderateHeightScale(10),
    borderRadius: moderateWidthScale(5),
  },
  ghostLineShort: {
    width: moderateWidthScale(44),
    height: moderateHeightScale(10),
    borderRadius: moderateWidthScale(5),
  },
  ghostPlusCircle: {
    position: "absolute",
    alignSelf: "center",
    top: "50%",
    marginTop: -moderateWidthScale(22),
    width: moderateWidthScale(44),
    height: moderateWidthScale(44),
    borderRadius: moderateWidthScale(22),
    borderWidth: 3,
    alignItems: "center",
    justifyContent: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 6,
      },
      android: { elevation: 4, shadowColor: "#000" },
      default: {},
    }),
  },
  title: {
    fontSize: fontSize.size20,
    fontFamily: fonts.fontBold,
  },
  subtitle: {
    fontSize: fontSize.size14,
    fontFamily: fonts.fontRegular,
    textAlign: "center",
    lineHeight: fontSize.size20,
  },
  button: {
    width: "100%",
    marginTop: moderateHeightScale(8),
  },
});

const cardStyles = StyleSheet.create({
  wrapper: {
    width: CARD_W,
    marginBottom: moderateHeightScale(14),
  },
  card: {
    width: "100%",
    height: COMPACT_H,
    borderRadius: moderateWidthScale(14),
    padding: moderateWidthScale(14),
    justifyContent: "space-between",
    overflow: "hidden",
    borderWidth: 0.5,
    borderColor: "rgba(255,255,255,0.15)",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.35,
        shadowRadius: 16,
      },
      android: { elevation: 12, shadowColor: "#000" },
      default: {},
    }),
  },
  cardDefault: {
    borderWidth: 1.5,
    borderColor: "rgba(221,161,94,0.6)",
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  chip: {
    width: moderateWidthScale(28),
    height: moderateWidthScale(20),
    borderRadius: moderateWidthScale(4),
    backgroundColor: "rgba(255,215,0,0.35)",
    borderWidth: 0.5,
    borderColor: "rgba(255,215,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  chipLineH: {
    position: "absolute",
    width: "100%",
    height: 0.5,
    backgroundColor: "rgba(255,215,0,0.45)",
  },
  chipLineV: {
    position: "absolute",
    width: 0.5,
    height: "100%",
    backgroundColor: "rgba(255,215,0,0.45)",
  },
  brandText: {
    fontSize: fontSize.size13,
    fontFamily: fonts.fontExtraBold,
    color: "rgba(255,255,255,0.7)",
    letterSpacing: 1,
  },
  numberRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: moderateWidthScale(5),
  },
  dots: {
    fontSize: fontSize.size14,
    fontFamily: fonts.fontBold,
    color: "rgba(255,255,255,0.35)",
    letterSpacing: 2,
  },
  last4: {
    fontSize: fontSize.size18,
    fontFamily: fonts.fontBold,
    color: "#FFFFFF",
    letterSpacing: 3,
  },
  bottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  expiry: {
    fontSize: fontSize.size12,
    fontFamily: fonts.fontMedium,
    color: "rgba(255,255,255,0.6)",
    letterSpacing: 1,
  },
  decoCircle: {
    position: "absolute",
    top: -moderateWidthScale(20),
    right: -moderateWidthScale(15),
    width: moderateWidthScale(70),
    height: moderateWidthScale(70),
    borderRadius: moderateWidthScale(35),
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  decoCircle2: {
    position: "absolute",
    bottom: -moderateWidthScale(30),
    left: -moderateWidthScale(15),
    width: moderateWidthScale(60),
    height: moderateWidthScale(60),
    borderRadius: moderateWidthScale(30),
    backgroundColor: "rgba(255,255,255,0.035)",
  },
  decoShine: {
    position: "absolute",
    top: 1,
    left: moderateWidthScale(12),
    right: moderateWidthScale(12),
    height: 1,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 1,
  },
  actions: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: moderateHeightScale(7),
    paddingHorizontal: moderateWidthScale(1),
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: moderateWidthScale(4),
    paddingVertical: moderateHeightScale(5),
    paddingHorizontal: moderateWidthScale(8),
    borderRadius: moderateWidthScale(8),
  },
  actionBtnGreen: {
    backgroundColor: "rgba(40, 54, 24, 0.1)",
  },
  actionBtnDefaultPill: {
    backgroundColor: "rgba(221, 161, 94, 0.2)",
    borderWidth: 1,
    borderColor: "rgba(188, 108, 37, 0.3)",
  },
  actionBtnRed: {
    backgroundColor: "rgba(186, 26, 26, 0.1)",
  },
  actionText: {
    fontSize: fontSize.size11,
    fontFamily: fonts.fontBold,
  },
  addCard: {
    width: "100%",
    height: COMPACT_H,
    borderRadius: moderateWidthScale(14),
    borderWidth: 1.5,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    gap: moderateHeightScale(8),
  },
  addCircle: {
    width: moderateWidthScale(36),
    height: moderateWidthScale(36),
    borderRadius: moderateWidthScale(18),
    alignItems: "center",
    justifyContent: "center",
  },
  addLabel: {
    fontSize: fontSize.size13,
    fontFamily: fonts.fontBold,
  },
});

export default function PaymentMethodsScreen() {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);
  const { t } = useTranslation();
  const { showBanner } = useNotificationContext();
  const { confirmSetupIntent } = useStripe();

  const [cards, setCards] = useState<WalletCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddCard, setShowAddCard] = useState(false);
  const [cardComplete, setCardComplete] = useState(false);
  const [saving, setSaving] = useState(false);
  const [settingDefault, setSettingDefault] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const typedBrandRef = useRef<string | null>(null);

  const fetchCards = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      try {
        const res = await ApiService.get<WalletListResponse>(
          walletEndpoints.list,
        );
        if (res.success) {
          setCards(res.data ?? []);
        } else if (!silent) {
          showBanner(t("error"), res.message || t("walletFailedToLoad"), "error", 3000);
        }
      } catch (err: any) {
        if (!silent) {
          showBanner(t("error"), t("walletFailedToLoad"), "error", 3000);
        }
        Logger.error("Wallet list error:", err);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [showBanner, t],
  );

  useEffect(() => {
    void fetchCards();
  }, [fetchCards]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void fetchCards(true);
  }, [fetchCards]);

  const handleAddCard = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await ensureStripeReady();
      const res = await ApiService.post<SetupIntentResponse>(
        walletEndpoints.setupIntent,
        {},
      );
      const clientSecret = res.data?.clientSecret;
      if (!res.success || !clientSecret) {
        throw new Error(res.message || t("walletFailedToAdd"));
      }

      const { error } = await confirmSetupIntent(clientSecret, {
        paymentMethodType: "Card",
      });
      if (error) throw new Error(error.message || t("walletFailedToAdd"));

      showBanner(t("success"), t("walletAddSuccess"), "success", 2500);
      setShowAddCard(false);
      setCardComplete(false);
      void fetchCards(true);
    } catch (err: any) {
      const msg = getServerMessage(err, t("walletFailedToAdd"));
      const isRateLimit = msg.includes("429") || msg.includes("Too many");
      showBanner(
        t("error"),
        isRateLimit ? t("walletRateLimited") : msg,
        "error",
        3500,
      );
    } finally {
      setSaving(false);
    }
  };

  const handleSetDefault = async (card: WalletCard) => {
    if (card.is_default || settingDefault) return;
    setSettingDefault(card.id);
    try {
      const res = await ApiService.put<SetDefaultResponse>(
        walletEndpoints.setDefault,
        { payment_method_id: card.id },
      );
      if (!res.success) {
        throw new Error(res.message || t("walletFailedToSetDefault"));
      }
      showBanner(t("success"), t("walletDefaultSuccess"), "success", 2500);
      void fetchCards(true);
    } catch (err: any) {
      showBanner(
        t("error"),
        getServerMessage(err, t("walletFailedToSetDefault")),
        "error",
        3500,
      );
    } finally {
      setSettingDefault(null);
    }
  };

  const handleDelete = (card: WalletCard) => {
    const label = formatCardLabel(t, card.last4, card.brand);
    Alert.alert(
      t("walletDeleteConfirmTitle"),
      t("walletDeleteConfirmMessage", { card: label }),
      [
        { text: t("cancel"), style: "cancel" },
        {
          text: t("walletDeleteCard"),
          style: "destructive",
          onPress: () => void doDelete(card),
        },
      ],
    );
  };

  const doDelete = async (card: WalletCard) => {
    setDeleting(card.id);
    try {
      const res = await ApiService.delete<DeleteResponse>(
        walletEndpoints.delete(card.id),
      );
      if (!res.success) {
        const code = (res as any).data?.error_code;
        if (code === "card_in_use") {
          const inUse = (res as any).data?.in_use_by as InUseBy[] | undefined;
          const names = inUse
            ?.map((u: InUseBy) =>
              u.business_name ? `${u.name} at ${u.business_name}` : u.name,
            )
            .join(", ");
          showBanner(
            t("walletCardInUse"),
            res.message || (res as any).error || names || t("walletFailedToDelete"),
            "error",
            5000,
          );
          return;
        }
        throw new Error(res.message || (res as any).error || t("walletFailedToDelete"));
      }
      showBanner(t("success"), t("walletDeleteSuccess"), "success", 2500);
      void fetchCards(true);
    } catch (err: any) {
      const body = getServerBody(err);
      if (body?.data?.error_code === "card_in_use") {
        const inUse = body.data.in_use_by as InUseBy[] | undefined;
        const names = inUse
          ?.map((u: InUseBy) =>
            u.business_name ? `${u.name} at ${u.business_name}` : u.name,
          )
          .join(", ");
        showBanner(
          t("walletCardInUse"),
          body.message || body.error || names || t("walletFailedToDelete"),
          "error",
          5000,
        );
        return;
      }
      showBanner(
        t("error"),
        getServerMessage(err, t("walletFailedToDelete")),
        "error",
        3500,
      );
    } finally {
      setDeleting(null);
    }
  };

  const sortedCards = useMemo(
    () =>
      [...cards].sort(
        (a, b) => (b.is_default ? 1 : 0) - (a.is_default ? 1 : 0),
      ),
    [cards],
  );

  return (
    <SafeAreaView edges={["bottom"]} style={styles.container}>
      <StackHeader title={t("walletTitle")} />
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.darkGreen}
            colors={[theme.darkGreen]}
          />
        }
      >
        {/* Loading */}
        {loading && cards.length === 0 && (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={theme.darkGreen} />
          </View>
        )}

        {/* Empty state */}
        {!loading && cards.length === 0 && !showAddCard && (
          <EmptyState onAdd={() => setShowAddCard(true)} theme={theme} />
        )}

        {/* Card grid */}
        {sortedCards.length > 0 && (
          <View style={styles.cardGrid}>
            {sortedCards.map((card) => (
              <CreditCard
                key={card.id}
                card={card}
                onMakeDefault={() => handleSetDefault(card)}
                onDelete={() => handleDelete(card)}
                isSettingDefault={settingDefault === card.id}
                isDeleting={deleting === card.id}
                theme={theme}
              />
            ))}
            {!showAddCard && (
              <AddCardButton
                onPress={() => setShowAddCard(true)}
                theme={theme}
              />
            )}
          </View>
        )}

        {/* Add card form */}
        {showAddCard && (
          <View style={styles.addCardSection}>
            <Text style={styles.addCardTitle}>{t("walletAddCardTitle")}</Text>
            <Text style={styles.addCardSubtitle}>
              {t("walletAddCardSubtitle")}
            </Text>

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
                setCardComplete(!!details?.complete);
                const brand = details?.brand;
                typedBrandRef.current =
                  brand && brand !== "Unknown" ? brand : null;
              }}
              cardStyle={CARD_FIELD_STYLE}
            />

            <View style={styles.addCardButtons}>
              <Button
                title={t("saveCard")}
                onPress={() => void handleAddCard()}
                disabled={!cardComplete}
                loading={saving}
                backgroundColor={theme.darkGreen}
                containerStyle={styles.addCardButton}
              />
              <TouchableOpacity
                onPress={() => {
                  setShowAddCard(false);
                  setCardComplete(false);
                }}
                disabled={saving}
                activeOpacity={0.7}
                style={styles.cancelLink}
              >
                <Text style={styles.cancelText}>{t("cancel")}</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.secureRow}>
              <Feather
                name="lock"
                size={iconScale(15)}
                color={theme.textMuted}
              />
              <Text style={styles.secureText}>
                {t("securelyProcessedByStripe")}
              </Text>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background },
    scroll: {
      paddingHorizontal: moderateWidthScale(16),
      paddingTop: moderateHeightScale(8),
      paddingBottom: moderateHeightScale(40),
    },
    centered: {
      paddingVertical: moderateHeightScale(60),
      alignItems: "center",
    },
    cardGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      columnGap: CARD_GAP,
      rowGap: moderateHeightScale(4),
    },

    /* Add card */
    addCardSection: {
      backgroundColor: theme.white,
      borderRadius: moderateWidthScale(16),
      padding: moderateWidthScale(20),
      marginTop: moderateHeightScale(8),
      borderWidth: 1,
      borderColor: theme.lightGreen1,
      ...Platform.select({
        ios: {
          shadowColor: theme.shadow,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.06,
          shadowRadius: 8,
        },
        android: { elevation: 2, shadowColor: theme.shadow },
        default: {},
      }),
    },
    addCardTitle: {
      fontSize: fontSize.size20,
      fontFamily: fonts.fontExtraBold,
      color: theme.darkGreen,
    },
    addCardSubtitle: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: theme.textMuted,
      marginTop: moderateHeightScale(6),
      lineHeight: fontSize.size18,
    },
    cardField: {
      width: "100%",
      height: Platform.OS === "ios" ? 54 : 58,
      marginTop: moderateHeightScale(20),
    },
    addCardButtons: {
      marginTop: moderateHeightScale(16),
      gap: moderateHeightScale(12),
    },
    addCardButton: {},
    cancelLink: {
      alignSelf: "center",
      paddingVertical: moderateHeightScale(6),
    },
    cancelText: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontMedium,
      color: theme.textMuted,
    },
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
  });
