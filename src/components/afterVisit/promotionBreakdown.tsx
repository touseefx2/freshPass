import React, { useMemo } from "react";
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import { moderateHeightScale, moderateWidthScale } from "@/src/theme/dimensions";
import {
  normalizeAppointmentPromotion,
  promotionConflictText,
} from "@/src/services/promotionService";

/**
 * Profile Promotions after booking (guide §4): booking details, View & Pay
 * and the shop's checkout read the server's amounts as they are. The app
 * never works out a discount itself.
 */

export type PromotionServiceLine = {
  id: number;
  name: string;
  /** What is charged */
  price: number;
  originalPrice: number;
  discount: number;
};

export type PromotionAmounts = {
  title: string;
  originalPrice: number;
  discount: number;
  finalPrice: number;
  /** Shop side: raw `promotion.conflict` */
  conflict: unknown;
};

const num = (v: unknown): number | null => {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
};

/** Services the offer discounted (`price`, `originalPrice`, `discount`). */
export function promotionServiceLines(services: unknown): PromotionServiceLine[] {
  if (!Array.isArray(services)) return [];
  return services
    .map((s: any) => {
      const discount = num(s?.discount) ?? 0;
      const price = num(s?.price);
      const original = num(s?.originalPrice);
      if (discount <= 0 || price == null) return null;
      return {
        id: num(s?.id) ?? 0,
        name: typeof s?.name === "string" ? s.name : "",
        price,
        originalPrice: original ?? price + discount,
        discount,
      };
    })
    .filter(Boolean) as PromotionServiceLine[];
}

/**
 * `promotion` (booking details / view-and-pay / outcome preview), or the
 * in-person payment's `originalServiceAmount` / `discountAmount` /
 * `promotionTitle`. Null when there is no offer (normal bookings).
 */
export function promotionAmounts(
  promotion: unknown,
  inPerson?: {
    originalServiceAmount?: unknown;
    discountAmount?: unknown;
    promotionTitle?: unknown;
    serviceAmount?: unknown;
  } | null,
): PromotionAmounts | null {
  const p = normalizeAppointmentPromotion(promotion);
  if (p && p.discount > 0) {
    return {
      title: p.title,
      originalPrice: p.originalPrice,
      discount: p.discount,
      finalPrice: p.finalPrice,
      conflict: p.conflict,
    };
  }
  const discount = num(inPerson?.discountAmount) ?? 0;
  const original = num(inPerson?.originalServiceAmount);
  if (discount > 0 && original != null) {
    return {
      title: typeof inPerson?.promotionTitle === "string" ? inPerson.promotionTitle : "",
      originalPrice: original,
      discount,
      finalPrice: num(inPerson?.serviceAmount) ?? Math.max(0, original - discount),
      conflict: p?.conflict ?? null,
    };
  }
  // An offer that came back without a discount still carries a conflict.
  return p && p.conflict
    ? {
        title: p.title,
        originalPrice: p.originalPrice,
        discount: 0,
        finalPrice: p.finalPrice,
        conflict: p.conflict,
      }
    : null;
}

/** Shop-side warning text for `promotion.conflict` (null = no conflict). */
export function usePromotionConflictText(conflict: unknown): string | null {
  const { t } = useTranslation();
  return promotionConflictText(conflict, t("padConflictFallback"));
}

function useStyles() {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  return { theme, styles };
}

/**
 * "Offer applied" card: discounted services (struck original price), then
 * Original price / offer −discount / Price after offer.
 */
export function PromotionBreakdownCard({
  amounts,
  services = [],
  format,
  showConflict = false,
  style,
}: {
  amounts: PromotionAmounts;
  services?: PromotionServiceLine[];
  format: (n: number) => string;
  /** Shop side only */
  showConflict?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const { t } = useTranslation();
  const { theme, styles } = useStyles();
  const conflictText = usePromotionConflictText(amounts.conflict);
  const offerLabel = amounts.title || t("padOfferDiscount");
  return (
    <View style={[styles.card, style]}>
      <View style={styles.header}>
        <View style={styles.iconWrap}>
          <MaterialIcons
            name="local-offer"
            size={moderateWidthScale(16)}
            color={theme.goldTextDark}
          />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.kicker}>{t("padOfferApplied")}</Text>
          {amounts.title ? (
            <Text style={styles.title} numberOfLines={2}>
              {amounts.title}
            </Text>
          ) : null}
        </View>
      </View>

      {amounts.discount > 0 ? (
        <>
          {services.length > 1
            ? services.map((line) => (
                <View
                  key={`${line.id}-${line.name}`}
                  style={styles.row}
                  accessible
                  accessibilityLabel={t("padServiceLineA11y", {
                    name: line.name,
                    original: format(line.originalPrice),
                    price: format(line.price),
                  })}
                >
                  <Text style={styles.label} numberOfLines={2}>
                    {line.name}
                  </Text>
                  <View style={styles.priceStack}>
                    <Text style={styles.struck}>{format(line.originalPrice)}</Text>
                    <Text style={styles.value}>{format(line.price)}</Text>
                  </View>
                </View>
              ))
            : null}
          {services.length > 1 ? <View style={styles.divider} /> : null}
          <View style={styles.row}>
            <Text style={styles.label}>{t("padOriginalPrice")}</Text>
            <Text style={styles.value}>{format(amounts.originalPrice)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label} numberOfLines={2}>
              {offerLabel}
            </Text>
            <Text style={styles.discount}>{`−${format(amounts.discount)}`}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.row}>
            <Text style={styles.totalLabel}>{t("padPriceAfterOffer")}</Text>
            <Text style={styles.totalValue}>{format(amounts.finalPrice)}</Text>
          </View>
        </>
      ) : null}

      {showConflict && conflictText ? (
        <PromotionConflictNote text={conflictText} style={styles.conflictGap} />
      ) : null}
    </View>
  );
}

/** A money row for a discounted service: name · struck original · price. */
export function PromotionServiceRow({
  name,
  price,
  originalPrice,
}: {
  name: string;
  price: string;
  originalPrice: string;
}) {
  const { t } = useTranslation();
  const { styles } = useStyles();
  return (
    <View
      style={styles.moneyRow}
      accessible
      accessibilityLabel={t("padServiceLineA11y", {
        name,
        original: originalPrice,
        price,
      })}
    >
      <Text style={styles.moneyLabel}>{name}</Text>
      <View style={styles.moneyValueWrap}>
        <Text style={styles.moneyStruck}>{originalPrice}</Text>
        <Text style={styles.moneyValue}>{price}</Text>
      </View>
    </View>
  );
}

/** "Holiday Welcome Offer · You saved $9.00" line under the services. */
export function PromotionSavedLine({
  title,
  saved,
  style,
}: {
  title: string;
  saved: string;
  style?: StyleProp<ViewStyle>;
}) {
  const { t } = useTranslation();
  const { theme, styles } = useStyles();
  return (
    <View style={[styles.savedLine, style]}>
      <MaterialIcons
        name="local-offer"
        size={moderateWidthScale(16)}
        color={theme.goldTextDark}
      />
      <Text style={styles.savedText}>
        {title
          ? t("padSavedWithOffer", { title, amount: saved })
          : t("padSaved", { amount: saved })}
      </Text>
    </View>
  );
}

/** Amber box for `promotion.conflict` (shop side). */
export function PromotionConflictNote({
  text,
  style,
}: {
  text: string;
  style?: StyleProp<ViewStyle>;
}) {
  const { theme, styles } = useStyles();
  return (
    <View style={[styles.conflict, style]} accessibilityRole="alert">
      <MaterialIcons
        name="warning-amber"
        size={moderateWidthScale(18)}
        color={theme.orangeBrownText}
      />
      <Text style={styles.conflictText}>{text}</Text>
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    card: {
      backgroundColor: theme.white,
      borderRadius: moderateWidthScale(16),
      borderWidth: 1,
      borderColor: theme.goldBorder,
      padding: moderateWidthScale(16),
      gap: moderateHeightScale(10),
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(10),
    },
    iconWrap: {
      width: moderateWidthScale(32),
      height: moderateWidthScale(32),
      borderRadius: moderateWidthScale(16),
      backgroundColor: theme.tileGoldCream,
      alignItems: "center",
      justifyContent: "center",
    },
    headerText: { flex: 1, minWidth: 0 },
    kicker: {
      fontFamily: fonts.fontMedium,
      fontSize: fontSize.size12,
      color: theme.goldTextDark,
    },
    title: {
      fontFamily: fonts.fontBold,
      fontSize: fontSize.size15,
      color: theme.darkGreen,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: moderateWidthScale(12),
    },
    label: {
      flex: 1,
      fontFamily: fonts.fontRegular,
      fontSize: fontSize.size14,
      color: theme.textMuted,
    },
    value: {
      fontFamily: fonts.fontMedium,
      fontSize: fontSize.size14,
      color: theme.darkGreen,
    },
    priceStack: { alignItems: "flex-end" },
    struck: {
      fontFamily: fonts.fontRegular,
      fontSize: fontSize.size12,
      color: theme.lightGreen5,
      textDecorationLine: "line-through",
    },
    discount: {
      fontFamily: fonts.fontBold,
      fontSize: fontSize.size14,
      color: theme.successGreen,
    },
    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: theme.borderNormal,
    },
    totalLabel: {
      flex: 1,
      fontFamily: fonts.fontBold,
      fontSize: fontSize.size15,
      color: theme.darkGreen,
    },
    totalValue: {
      fontFamily: fonts.fontBold,
      fontSize: fontSize.size16,
      color: theme.darkGreen,
    },
    conflictGap: { marginTop: moderateHeightScale(2) },
    // Same look as afterVisitParts MoneyRow
    moneyRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: moderateWidthScale(12),
      minHeight: moderateHeightScale(30),
    },
    moneyLabel: {
      flex: 1,
      fontSize: fontSize.size16,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
    },
    moneyValueWrap: {
      flexDirection: "row",
      alignItems: "baseline",
      gap: moderateWidthScale(6),
    },
    moneyStruck: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen5,
      textDecorationLine: "line-through",
      fontVariant: ["tabular-nums"],
    },
    moneyValue: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
      fontVariant: ["tabular-nums"],
    },
    savedLine: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(8),
      backgroundColor: theme.tileGoldCream,
      borderRadius: moderateWidthScale(10),
      paddingHorizontal: moderateWidthScale(10),
      paddingVertical: moderateHeightScale(8),
    },
    savedText: {
      flex: 1,
      fontSize: fontSize.size13,
      fontFamily: fonts.fontMedium,
      color: theme.goldTextDark,
    },
    conflict: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: moderateWidthScale(8),
      backgroundColor: theme.noticeCream,
      borderWidth: 1,
      borderColor: theme.goldBorder,
      borderRadius: moderateWidthScale(12),
      padding: moderateWidthScale(12),
    },
    conflictText: {
      flex: 1,
      fontFamily: fonts.fontRegular,
      fontSize: fontSize.size13,
      lineHeight: moderateHeightScale(19),
      color: theme.darkGreen,
    },
  });
