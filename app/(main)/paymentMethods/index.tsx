import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Modal,
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
  visa: ["#0a1551", "#1a2980"],
  mastercard: ["#141414", "#252525"],
  amex: ["#006FCF", "#1A8FE3"],
  americanexpress: ["#006FCF", "#1A8FE3"],
  discover: ["#F5F5F0", "#E8E4DA"],
  jcb: ["#F5F5F5", "#E8E8E8"],
  unionpay: ["#1C3A6E", "#0D2240"],
  diners: ["#F0F0F0", "#D8D8D8"],
  dinersclub: ["#F0F0F0", "#D8D8D8"],
  maestro: ["#141414", "#252525"],
  elo: ["#1A1A1A", "#2D2D2D"],
  rupay: ["#0D2C54", "#1A4075"],
  cartebancaire: ["#1A237E", "#283593"],
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
  diners: "Diners Club",
  dinersclub: "Diners Club",
  maestro: "Maestro",
  elo: "Elo",
  rupay: "RuPay",
  cartebancaire: "CB",
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

const LIGHT_BRANDS = new Set(["discover", "jcb", "diners", "dinersclub"]);

function BrandLogo({ brand }: { brand: string }) {
  const key = (brand ?? "").toLowerCase().replace(/[\s_-]/g, "");
  switch (key) {
    case "mastercard":
      return (
        <View style={cardStyles.mcLogo}>
          <View style={cardStyles.mcCircleRed} />
          <View style={cardStyles.mcCircleYellow} />
        </View>
      );
    case "visa":
      return <Text style={cardStyles.visaLogo}>VISA</Text>;
    case "amex":
    case "americanexpress":
      return (
        <View style={cardStyles.amexLogoWrap}>
          <Text style={cardStyles.amexLine1}>AMERICAN</Text>
          <Text style={cardStyles.amexLine2}>EXPRESS</Text>
        </View>
      );
    case "discover":
      return (
        <View style={cardStyles.discoverLogo}>
          <View style={cardStyles.discoverCircle} />
          <Text style={cardStyles.discoverTextDark}>DISCOVER</Text>
        </View>
      );
    case "diners":
    case "dinersclub":
      return (
        <View style={cardStyles.dinersLogoWrap}>
          <View style={cardStyles.dinersLogo}>
            <View style={cardStyles.dinersCircleLeft} />
            <View style={cardStyles.dinersCircleRight} />
          </View>
          <Text style={cardStyles.dinersText}>Diners Club</Text>
        </View>
      );
    case "jcb":
      return (
        <View style={cardStyles.jcbLogo}>
          <View style={[cardStyles.jcbStripe, { backgroundColor: "#0B4EA2" }]} />
          <View style={[cardStyles.jcbStripe, { backgroundColor: "#C62828" }]} />
          <View style={[cardStyles.jcbStripe, { backgroundColor: "#2E7D32" }]} />
          <Text style={cardStyles.jcbText}>JCB</Text>
        </View>
      );
    case "unionpay":
      return (
        <View style={cardStyles.unionpayLogo}>
          <View style={cardStyles.unionpayRed} />
          <View style={cardStyles.unionpayBlue} />
          <Text style={cardStyles.unionpayText}>UP</Text>
        </View>
      );
    case "maestro":
      return (
        <View style={cardStyles.mcLogo}>
          <View style={cardStyles.maestroCircleBlue} />
          <View style={cardStyles.mcCircleRed} />
        </View>
      );
    case "elo":
      return (
        <View style={cardStyles.eloBadge}>
          <View style={cardStyles.eloYellow} />
          <View style={cardStyles.eloRed} />
          <View style={cardStyles.eloBlue} />
        </View>
      );
    default:
      return (
        <Text style={cardStyles.brandText}>{getBrandDisplay(brand)}</Text>
      );
  }
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
  const brandKey = (card.brand ?? "").toLowerCase().replace(/[\s_-]/g, "");
  const isLight = LIGHT_BRANDS.has(brandKey);

  return (
    <View style={cardStyles.wrapper}>
      <LinearGradient
        colors={gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          cardStyles.card,
          card.is_default && cardStyles.cardDefault,
          isLight && cardStyles.cardLight,
        ]}
      >
        <View style={cardStyles.topRow}>
          <View style={cardStyles.chipRow}>
            <View style={cardStyles.chip}>
              <View style={cardStyles.chipLineH} />
              <View style={cardStyles.chipLineV} />
              <View style={cardStyles.chipCornerTL} />
              <View style={cardStyles.chipCornerTR} />
              <View style={cardStyles.chipCornerBL} />
              <View style={cardStyles.chipCornerBR} />
            </View>
            <MaterialCommunityIcons
              name="contactless-payment"
              size={moderateWidthScale(16)}
              color={isLight ? "rgba(0,0,0,0.3)" : "rgba(255,255,255,0.45)"}
            />
          </View>
          <BrandLogo brand={card.brand} />
        </View>

        <View style={cardStyles.numberRow}>
          <Text style={[cardStyles.dots, isLight && cardStyles.dotsLight]}>
            ••••
          </Text>
          <Text style={[cardStyles.last4, isLight && cardStyles.last4Light]}>
            {card.last4}
          </Text>
        </View>

        <View style={cardStyles.bottomRow}>
          <Text style={[cardStyles.expiry, isLight && cardStyles.expiryLight]}>
            {String(card.exp_month).padStart(2, "0")}/
            {String(card.exp_year).slice(-2)}
          </Text>
          {card.is_default && (
            <MaterialCommunityIcons
              name="shield-check"
              size={moderateWidthScale(16)}
              color={isLight ? "#BC6C25" : "rgba(255,215,0,0.85)"}
            />
          )}
        </View>

        <View
          style={[cardStyles.decoCircle, isLight && cardStyles.decoCircleLight]}
        />
        <View
          style={[
            cardStyles.decoCircle2,
            isLight && cardStyles.decoCircleLight,
          ]}
        />
        <View
          style={[cardStyles.decoShine, isLight && cardStyles.decoShineLight]}
        />
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
      {/* Stacked ghost cards for wallet feel */}
      <View style={emptyStyles.cardStack}>
        <LinearGradient
          colors={["#1A1F71", "#2B3494"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={emptyStyles.ghostCardBack2}
        />
        <LinearGradient
          colors={["#1A1A2E", "#2D2D44"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={emptyStyles.ghostCardBack}
        />
        <LinearGradient
          colors={["#283618", "#3A5226"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={emptyStyles.ghostCard}
        >
          <View style={emptyStyles.ghostTopRow}>
            <View style={emptyStyles.ghostChip}>
              <View style={emptyStyles.ghostChipLineH} />
              <View style={emptyStyles.ghostChipLineV} />
            </View>
            <View style={emptyStyles.ghostBrand} />
          </View>
          <View style={emptyStyles.ghostDotsRow}>
            <View style={emptyStyles.ghostDot} />
            <View style={emptyStyles.ghostDot} />
            <View style={emptyStyles.ghostDot} />
            <View style={emptyStyles.ghostDotLast} />
          </View>
          <View style={emptyStyles.ghostBottomRow}>
            <View style={emptyStyles.ghostLine} />
            <View style={emptyStyles.ghostLineShort} />
          </View>
          <View style={emptyStyles.ghostDecoCircle} />
          <View style={emptyStyles.ghostDecoCircle2} />
        </LinearGradient>
      </View>

      {/* Icon badge */}
      <View style={[emptyStyles.iconBadge, { backgroundColor: theme.darkGreen }]}>
        <MaterialCommunityIcons
          name="wallet-outline"
          size={iconScale(22)}
          color="#fff"
        />
      </View>

      <Text style={[emptyStyles.subtitle, { color: theme.textMuted }]}>
        Save your cards for faster{"\n"}and easier checkout
      </Text>

      <TouchableOpacity
        onPress={onAdd}
        activeOpacity={0.7}
        style={[emptyStyles.addBtn, { backgroundColor: theme.darkGreen }]}
      >
        <Feather name="plus" size={iconScale(20)} color="#FFFFFF" />
        <Text style={emptyStyles.addBtnText}>{t("walletAddCard")}</Text>
      </TouchableOpacity>

      <View style={emptyStyles.secureRow}>
        <Feather name="shield" size={iconScale(15)} color={theme.textMuted} />
        <Text style={[emptyStyles.secureText, { color: theme.textMuted }]}>
          {t("securelyProcessedByStripe")}
        </Text>
      </View>
    </View>
  );
}

const GHOST_W = moderateWidthScale(270);
const GHOST_H = moderateHeightScale(165);

const emptyStyles = StyleSheet.create({
  container: {
    alignItems: "center",
    paddingTop: moderateHeightScale(60),
    paddingHorizontal: moderateWidthScale(24),
  },
  cardStack: {
    width: GHOST_W + moderateWidthScale(24),
    height: GHOST_H + moderateHeightScale(24),
    alignItems: "center",
    justifyContent: "flex-end",
  },
  ghostCardBack2: {
    position: "absolute",
    top: 0,
    width: GHOST_W - moderateWidthScale(32),
    height: GHOST_H,
    borderRadius: moderateWidthScale(14),
    opacity: 0.2,
    transform: [{ rotate: "4deg" }],
  },
  ghostCardBack: {
    position: "absolute",
    top: moderateHeightScale(8),
    width: GHOST_W - moderateWidthScale(16),
    height: GHOST_H,
    borderRadius: moderateWidthScale(14),
    opacity: 0.35,
    transform: [{ rotate: "2deg" }],
  },
  ghostCard: {
    width: GHOST_W,
    height: GHOST_H,
    borderRadius: moderateWidthScale(16),
    padding: moderateWidthScale(20),
    justifyContent: "space-between",
    overflow: "hidden",
    opacity: 0.6,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.22,
        shadowRadius: 16,
      },
      android: { elevation: 8, shadowColor: "#000" },
      default: {},
    }),
  },
  ghostTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  ghostChip: {
    width: moderateWidthScale(32),
    height: moderateWidthScale(24),
    borderRadius: moderateWidthScale(5),
    backgroundColor: "rgba(255,215,0,0.35)",
    borderWidth: 0.5,
    borderColor: "rgba(255,215,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  ghostChipLineH: {
    position: "absolute",
    width: "100%",
    height: 0.5,
    backgroundColor: "rgba(255,215,0,0.4)",
  },
  ghostChipLineV: {
    position: "absolute",
    width: 0.5,
    height: "100%",
    backgroundColor: "rgba(255,215,0,0.4)",
  },
  ghostBrand: {
    width: moderateWidthScale(48),
    height: moderateWidthScale(12),
    borderRadius: moderateWidthScale(3),
    backgroundColor: "rgba(255,255,255,0.18)",
  },
  ghostDotsRow: {
    flexDirection: "row",
    gap: moderateWidthScale(10),
    alignItems: "center",
  },
  ghostDot: {
    width: moderateWidthScale(32),
    height: moderateHeightScale(9),
    borderRadius: moderateWidthScale(5),
    backgroundColor: "rgba(255,255,255,0.14)",
  },
  ghostDotLast: {
    width: moderateWidthScale(38),
    height: moderateHeightScale(11),
    borderRadius: moderateWidthScale(6),
    backgroundColor: "rgba(255,255,255,0.22)",
  },
  ghostBottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  ghostLine: {
    width: moderateWidthScale(65),
    height: moderateHeightScale(9),
    borderRadius: moderateWidthScale(5),
    backgroundColor: "rgba(255,255,255,0.14)",
  },
  ghostLineShort: {
    width: moderateWidthScale(40),
    height: moderateHeightScale(9),
    borderRadius: moderateWidthScale(5),
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  ghostDecoCircle: {
    position: "absolute",
    top: -moderateWidthScale(22),
    right: -moderateWidthScale(18),
    width: moderateWidthScale(80),
    height: moderateWidthScale(80),
    borderRadius: moderateWidthScale(40),
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  ghostDecoCircle2: {
    position: "absolute",
    bottom: -moderateWidthScale(30),
    left: -moderateWidthScale(20),
    width: moderateWidthScale(60),
    height: moderateWidthScale(60),
    borderRadius: moderateWidthScale(30),
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  iconBadge: {
    width: moderateWidthScale(48),
    height: moderateWidthScale(48),
    borderRadius: moderateWidthScale(24),
    justifyContent: "center",
    alignItems: "center",
    marginTop: moderateHeightScale(24),
    marginBottom: moderateHeightScale(16),
    ...Platform.select({
      ios: {
        shadowColor: "#283618",
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.25,
        shadowRadius: 6,
      },
      android: { elevation: 4, shadowColor: "#283618" },
      default: {},
    }),
  },
  title: {
    fontSize: fontSize.size22,
    fontFamily: fonts.fontSemiBold,
    marginBottom: moderateHeightScale(8),
  },
  subtitle: {
    fontSize: fontSize.size16,
    fontFamily: fonts.fontRegular,
    textAlign: "center",
    lineHeight: fontSize.size24,
    paddingHorizontal: moderateWidthScale(8),
    marginBottom: moderateHeightScale(28),
  },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: moderateWidthScale(10),
    width: "100%",
    paddingVertical: moderateHeightScale(16),
    borderRadius: moderateWidthScale(14),
    ...Platform.select({
      ios: {
        shadowColor: "#283618",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
      },
      android: { elevation: 5, shadowColor: "#283618" },
      default: {},
    }),
  },
  addBtnText: {
    fontSize: fontSize.size18,
    fontFamily: fonts.fontBold,
    color: "#FFFFFF",
  },
  secureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: moderateWidthScale(6),
    marginTop: moderateHeightScale(16),
  },
  secureText: {
    fontSize: fontSize.size13,
    fontFamily: fonts.fontRegular,
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
  cardLight: {
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.1)",
  },
  dotsLight: { color: "rgba(0,0,0,0.25)" },
  last4Light: { color: "#1A1A1A" },
  expiryLight: { color: "rgba(0,0,0,0.45)" },
  decoCircleLight: { backgroundColor: "rgba(0,0,0,0.03)" },
  decoShineLight: { backgroundColor: "rgba(0,0,0,0.02)" },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  chipRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: moderateWidthScale(6),
  },
  chip: {
    width: moderateWidthScale(30),
    height: moderateWidthScale(22),
    borderRadius: moderateWidthScale(4),
    backgroundColor: "rgba(255,215,0,0.4)",
    borderWidth: 0.5,
    borderColor: "rgba(255,215,0,0.55)",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  chipLineH: {
    position: "absolute",
    width: "100%",
    height: 0.5,
    backgroundColor: "rgba(255,215,0,0.5)",
  },
  chipLineV: {
    position: "absolute",
    width: 0.5,
    height: "100%",
    backgroundColor: "rgba(255,215,0,0.5)",
  },
  chipCornerTL: {
    position: "absolute",
    top: 2,
    left: 2,
    width: moderateWidthScale(8),
    height: moderateWidthScale(6),
    borderRadius: 1,
    borderLeftWidth: 0.5,
    borderTopWidth: 0.5,
    borderColor: "rgba(255,215,0,0.35)",
  },
  chipCornerTR: {
    position: "absolute",
    top: 2,
    right: 2,
    width: moderateWidthScale(8),
    height: moderateWidthScale(6),
    borderRadius: 1,
    borderRightWidth: 0.5,
    borderTopWidth: 0.5,
    borderColor: "rgba(255,215,0,0.35)",
  },
  chipCornerBL: {
    position: "absolute",
    bottom: 2,
    left: 2,
    width: moderateWidthScale(8),
    height: moderateWidthScale(6),
    borderRadius: 1,
    borderLeftWidth: 0.5,
    borderBottomWidth: 0.5,
    borderColor: "rgba(255,215,0,0.35)",
  },
  chipCornerBR: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: moderateWidthScale(8),
    height: moderateWidthScale(6),
    borderRadius: 1,
    borderRightWidth: 0.5,
    borderBottomWidth: 0.5,
    borderColor: "rgba(255,215,0,0.35)",
  },
  brandText: {
    fontSize: fontSize.size13,
    fontFamily: fonts.fontExtraBold,
    color: "rgba(255,255,255,0.75)",
    letterSpacing: 1,
  },
  visaLogo: {
    fontSize: fontSize.size16,
    fontFamily: fonts.fontExtraBold,
    color: "#FFFFFF",
    fontStyle: "italic",
    letterSpacing: 2,
  },
  amexLogoWrap: {
    alignItems: "flex-end",
  },
  amexLine1: {
    fontSize: fontSize.size8,
    fontFamily: fonts.fontExtraBold,
    color: "rgba(255,255,255,0.9)",
    letterSpacing: 2.5,
    lineHeight: fontSize.size10,
  },
  amexLine2: {
    fontSize: fontSize.size10,
    fontFamily: fonts.fontExtraBold,
    color: "rgba(255,255,255,0.9)",
    letterSpacing: 2,
    lineHeight: fontSize.size12,
  },
  discoverLogo: {
    flexDirection: "row",
    alignItems: "center",
    gap: moderateWidthScale(3),
  },
  discoverCircle: {
    width: moderateWidthScale(16),
    height: moderateWidthScale(16),
    borderRadius: moderateWidthScale(8),
    backgroundColor: "#FF6000",
  },
  discoverTextDark: {
    fontSize: fontSize.size9,
    fontFamily: fonts.fontExtraBold,
    color: "#333333",
    letterSpacing: 1,
  },
  dinersLogoWrap: {
    alignItems: "flex-end",
  },
  dinersText: {
    fontSize: fontSize.size7,
    fontFamily: fonts.fontBold,
    color: "#1565C0",
    letterSpacing: 0.5,
    marginTop: moderateHeightScale(2),
  },
  mcLogo: {
    flexDirection: "row",
    alignItems: "center",
    width: moderateWidthScale(32),
    height: moderateWidthScale(20),
  },
  mcCircleRed: {
    width: moderateWidthScale(18),
    height: moderateWidthScale(18),
    borderRadius: moderateWidthScale(9),
    backgroundColor: "#EB001B",
    opacity: 0.9,
  },
  mcCircleYellow: {
    width: moderateWidthScale(18),
    height: moderateWidthScale(18),
    borderRadius: moderateWidthScale(9),
    backgroundColor: "#F79E1B",
    opacity: 0.9,
    marginLeft: -moderateWidthScale(8),
  },
  maestroCircleBlue: {
    width: moderateWidthScale(18),
    height: moderateWidthScale(18),
    borderRadius: moderateWidthScale(9),
    backgroundColor: "#0099DF",
    opacity: 0.9,
  },
  dinersLogo: {
    flexDirection: "row",
    alignItems: "center",
    width: moderateWidthScale(22),
    height: moderateWidthScale(22),
    borderRadius: moderateWidthScale(11),
    borderWidth: 1.5,
    borderColor: "#1565C0",
    justifyContent: "center",
    overflow: "hidden",
  },
  dinersCircleLeft: {
    width: moderateWidthScale(6),
    height: moderateWidthScale(12),
    borderTopLeftRadius: moderateWidthScale(6),
    borderBottomLeftRadius: moderateWidthScale(6),
    backgroundColor: "#1565C0",
  },
  dinersCircleRight: {
    width: moderateWidthScale(6),
    height: moderateWidthScale(12),
    borderTopRightRadius: moderateWidthScale(6),
    borderBottomRightRadius: moderateWidthScale(6),
    backgroundColor: "#1565C0",
    marginLeft: moderateWidthScale(2),
  },
  jcbLogo: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: moderateWidthScale(4),
    overflow: "hidden",
    height: moderateWidthScale(18),
    width: moderateWidthScale(32),
    position: "relative",
  },
  jcbStripe: {
    flex: 1,
    height: "100%",
  },
  jcbText: {
    position: "absolute",
    width: "100%",
    textAlign: "center",
    fontSize: fontSize.size9,
    fontFamily: fonts.fontExtraBold,
    color: "#FFFFFF",
    letterSpacing: 1,
  },
  unionpayLogo: {
    width: moderateWidthScale(32),
    height: moderateWidthScale(20),
    borderRadius: moderateWidthScale(3),
    overflow: "hidden",
    flexDirection: "row",
    position: "relative",
  },
  unionpayRed: {
    flex: 1,
    backgroundColor: "#E21836",
  },
  unionpayBlue: {
    flex: 1,
    backgroundColor: "#00447C",
  },
  unionpayText: {
    position: "absolute",
    width: "100%",
    height: "100%",
    textAlign: "center",
    textAlignVertical: "center",
    fontSize: fontSize.size10,
    fontFamily: fonts.fontExtraBold,
    color: "#FFFFFF",
    letterSpacing: 1,
    lineHeight: moderateWidthScale(20),
  },
  eloBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: moderateWidthScale(2),
  },
  eloYellow: {
    width: moderateWidthScale(8),
    height: moderateWidthScale(8),
    borderRadius: moderateWidthScale(4),
    backgroundColor: "#FFCB05",
  },
  eloRed: {
    width: moderateWidthScale(8),
    height: moderateWidthScale(8),
    borderRadius: moderateWidthScale(4),
    backgroundColor: "#EF4123",
  },
  eloBlue: {
    width: moderateWidthScale(8),
    height: moderateWidthScale(8),
    borderRadius: moderateWidthScale(4),
    backgroundColor: "#00A4E0",
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
  const [deleteTarget, setDeleteTarget] = useState<WalletCard | null>(null);
  const [defaultTarget, setDefaultTarget] = useState<WalletCard | null>(null);
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

  const handleSetDefault = (card: WalletCard) => {
    if (card.is_default || settingDefault) return;
    setDefaultTarget(card);
  };

  const confirmDefaultAndClose = () => {
    if (!defaultTarget) return;
    const card = defaultTarget;
    setDefaultTarget(null);
    void doSetDefault(card);
  };

  const doSetDefault = async (card: WalletCard) => {
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
    setDeleteTarget(card);
  };

  const confirmDeleteAndClose = () => {
    if (!deleteTarget) return;
    const card = deleteTarget;
    setDeleteTarget(null);
    void doDelete(card);
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
              postalCodeEnabled={false}
              placeholders={{
                number: t("cardNumber"),
                expiration: t("expiryPlaceholder"),
                cvc: t("cvc"),
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

      {/* Delete confirmation modal */}
      <Modal
        visible={!!deleteTarget}
        transparent
        animationType="fade"
        onRequestClose={() => setDeleteTarget(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalIconCircle}>
              <Feather name="trash-2" size={iconScale(22)} color="#D44" />
            </View>
            <Text style={styles.modalTitle}>{t("walletDeleteConfirmTitle")}</Text>
            <Text style={styles.modalMessage}>
              {deleteTarget
                ? `${(deleteTarget.brand ?? "Card").charAt(0).toUpperCase()}${(deleteTarget.brand ?? "card").slice(1)} •••• ${deleteTarget.last4} will be permanently removed.`
                : ""}
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setDeleteTarget(null)}
                activeOpacity={0.7}
              >
                <Text style={styles.modalCancelText}>{t("cancel")}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalRemoveBtn}
                onPress={confirmDeleteAndClose}
                activeOpacity={0.7}
              >
                <Feather
                  name="trash-2"
                  size={iconScale(14)}
                  color="#fff"
                  style={{ marginRight: moderateWidthScale(6) }}
                />
                <Text style={styles.modalRemoveText}>Remove Card</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Make default confirmation modal */}
      <Modal
        visible={!!defaultTarget}
        transparent
        animationType="fade"
        onRequestClose={() => setDefaultTarget(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalIconCircleGreen}>
              <MaterialCommunityIcons
                name="star"
                size={iconScale(22)}
                color={theme.darkGreen}
              />
            </View>
            <Text style={styles.modalTitle}>Set as default?</Text>
            <Text style={styles.modalMessage}>
              {defaultTarget
                ? `${(defaultTarget.brand ?? "Card").charAt(0).toUpperCase()}${(defaultTarget.brand ?? "card").slice(1)} •••• ${defaultTarget.last4} will be used for all future payments.`
                : ""}
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setDefaultTarget(null)}
                activeOpacity={0.7}
              >
                <Text style={styles.modalCancelText}>{t("cancel")}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalConfirmBtn}
                onPress={confirmDefaultAndClose}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons
                  name="star"
                  size={iconScale(14)}
                  color="#fff"
                  style={{ marginRight: moderateWidthScale(6) }}
                />
                <Text style={styles.modalRemoveText}>Set Default</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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

    /* Delete modal */
    modalBackdrop: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.55)",
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: moderateWidthScale(28),
    },
    modalCard: {
      width: "100%",
      backgroundColor: theme.white,
      borderRadius: moderateWidthScale(20),
      paddingVertical: moderateHeightScale(28),
      paddingHorizontal: moderateWidthScale(24),
      alignItems: "center",
      ...Platform.select({
        ios: {
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.18,
          shadowRadius: 24,
        },
        android: { elevation: 12 },
        default: {},
      }),
    },
    modalIconCircle: {
      width: moderateWidthScale(52),
      height: moderateWidthScale(52),
      borderRadius: moderateWidthScale(26),
      backgroundColor: "rgba(221,68,68,0.1)",
      justifyContent: "center",
      alignItems: "center",
      marginBottom: moderateHeightScale(14),
    },
    modalTitle: {
      fontSize: fontSize.size18,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      marginBottom: moderateHeightScale(8),
    },
    modalMessage: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.textMuted,
      textAlign: "center",
      lineHeight: fontSize.size20,
      marginBottom: moderateHeightScale(24),
    },
    modalButtons: {
      flexDirection: "row",
      gap: moderateWidthScale(12),
      width: "100%",
    },
    modalCancelBtn: {
      flex: 1,
      paddingVertical: moderateHeightScale(13),
      borderRadius: moderateWidthScale(12),
      borderWidth: 1,
      borderColor: theme.lightGreen1,
      alignItems: "center",
      justifyContent: "center",
    },
    modalCancelText: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontSemiBold,
      color: theme.textMuted,
    },
    modalRemoveBtn: {
      flex: 1,
      flexDirection: "row",
      paddingVertical: moderateHeightScale(13),
      borderRadius: moderateWidthScale(12),
      backgroundColor: "#D44",
      alignItems: "center",
      justifyContent: "center",
    },
    modalConfirmBtn: {
      flex: 1,
      flexDirection: "row",
      paddingVertical: moderateHeightScale(13),
      borderRadius: moderateWidthScale(12),
      backgroundColor: theme.darkGreen,
      alignItems: "center",
      justifyContent: "center",
    },
    modalIconCircleGreen: {
      width: moderateWidthScale(52),
      height: moderateWidthScale(52),
      borderRadius: moderateWidthScale(26),
      backgroundColor: "rgba(40, 54, 24, 0.12)",
      justifyContent: "center",
      alignItems: "center",
      marginBottom: moderateHeightScale(14),
    },
    modalRemoveText: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontSemiBold,
      color: "#fff",
    },
  });
