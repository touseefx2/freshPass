import React, { useCallback, useMemo, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  moderateHeightScale,
  moderateWidthScale,
  widthScale,
} from "@/src/theme/dimensions";
import AppImage from "@/src/components/AppImage";
import FlowButton from "@/src/components/reelFlow/flowButton";
import { formatShopPrice } from "@/src/constants/demoShopProduct";
import type { MarketCartGroup, MarketCartItem } from "@/src/types/marketplace";
import type { ShopDeliveryOptions, ShopSeller } from "@/src/types/shopProduct";
import CartLineItem from "./CartLineItem";

type Props = {
  group: MarketCartGroup;
  /** Cart line ids with a call running. */
  busyLineIds: ReadonlySet<number>;
  onChangeQuantity: (
    item: MarketCartItem,
    quantity: number,
  ) => Promise<number | null>;
  onRemove: (item: MarketCartItem) => void;
  onCheckout: (group: MarketCartGroup) => void;
  onOpenSeller: (seller: ShopSeller) => void;
  onOpenProduct?: (item: MarketCartItem) => void;
};

const AVATAR = widthScale(42);

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    card: {
      backgroundColor: theme.white,
      borderRadius: moderateWidthScale(20),
      padding: moderateWidthScale(16),
      gap: moderateHeightScale(14),
      shadowColor: theme.darkGreen,
      shadowOffset: { width: 0, height: moderateHeightScale(4) },
      shadowOpacity: 0.08,
      shadowRadius: moderateWidthScale(10),
      elevation: 3,
    },
    sellerRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(12),
      minHeight: AVATAR + moderateHeightScale(4),
    },
    avatar: {
      width: AVATAR,
      height: AVATAR,
      borderRadius: AVATAR / 2,
      backgroundColor: theme.darkGreen,
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
    },
    avatarImage: { width: "100%", height: "100%" },
    avatarInitial: {
      fontSize: fontSize.size18,
      fontFamily: fonts.fontBold,
      color: theme.background,
    },
    sellerText: { flex: 1, minWidth: 0, gap: moderateHeightScale(2) },
    sellerName: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    deliveryLine: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(5),
    },
    deliveryText: {
      flexShrink: 1,
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      fontVariant: ["tabular-nums"],
    },
    divider: {
      height: 1,
      backgroundColor: theme.borderLight,
    },
    summary: {
      gap: moderateHeightScale(8),
      paddingTop: moderateHeightScale(2),
    },
    priceRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      gap: moderateWidthScale(12),
    },
    priceKey: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
    },
    priceValue: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
      fontVariant: ["tabular-nums"],
    },
    totalRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "baseline",
      paddingTop: moderateHeightScale(10),
      marginTop: moderateHeightScale(2),
      borderTopWidth: 1,
      borderTopColor: theme.borderLight,
    },
    totalKey: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    totalValue: {
      fontSize: fontSize.size20,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      fontVariant: ["tabular-nums"],
    },
    note: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(6),
    },
    noteText: {
      flex: 1,
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      lineHeight: fontSize.size16,
    },
    blocked: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: moderateWidthScale(6),
    },
    blockedText: {
      flexShrink: 1,
      fontSize: fontSize.size13,
      fontFamily: fonts.fontMedium,
      color: theme.red,
      textAlign: "center",
    },
  });

function deliveryIcon(delivery: ShopDeliveryOptions): "local-shipping" | "storefront" {
  return delivery.shipping === "none" ? "storefront" : "local-shipping";
}

/** One seller's lines in the cart: one total, one Checkout, one payment. */
export default function CartSellerGroupCard({
  group,
  busyLineIds,
  onChangeQuantity,
  onRemove,
  onCheckout,
  onOpenSeller,
  onOpenProduct,
}: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [theme]);

  // Lines with a quantity edit still waiting to be sent
  const [pendingLineIds, setPendingLineIds] = useState<ReadonlySet<number>>(
    () => new Set(),
  );
  const setLinePending = useCallback((lineId: number, pending: boolean) => {
    setPendingLineIds((prev) => {
      if (prev.has(lineId) === pending) return prev;
      const next = new Set(prev);
      if (pending) next.add(lineId);
      else next.delete(lineId);
      return next;
    });
  }, []);

  const { seller, delivery } = group;
  const sellerName = seller.name || t("mpCartSellerFallback");
  const initial = sellerName.trim().charAt(0).toUpperCase() || "F";

  const deliverySummary = useMemo(() => {
    if (!delivery.configured) return t("mpCartSellerNotTakingOrders");
    const parts: string[] = [];
    if (delivery.shipping === "paid") {
      parts.push(
        t("mpCartShippingPrice", {
          price: formatShopPrice(delivery.shippingPrice ?? 0),
        }),
      );
    } else if (delivery.shipping === "free") {
      parts.push(t("freeShipping"));
    }
    if (delivery.pickupAvailable) {
      parts.push(
        delivery.shipping === "none"
          ? t("mpCartPickupOnly")
          : t("mpCartPickupAvailable"),
      );
    }
    return parts.join(" · ");
  }, [delivery, t]);

  // Pickup-only sellers estimate 0; free shipping is free
  const shippingValue =
    group.shippingEstimate > 0
      ? formatShopPrice(group.shippingEstimate)
      : delivery.shipping === "free"
        ? t("free")
        : delivery.pickupAvailable
          ? t("pickup")
          : formatShopPrice(0);

  const anyBusy = group.items.some(
    (item) => busyLineIds.has(item.id) || pendingLineIds.has(item.id),
  );
  const checkoutDisabled = !group.canCheckout || !delivery.configured || anyBusy;
  const blockedReason = !delivery.configured
    ? t("mpCartSellerNotTakingOrders")
    : !group.canCheckout
      ? t("mpCartFixItemsToCheckout")
      : null;

  return (
    <View style={styles.card}>
      <TouchableOpacity
        activeOpacity={0.7}
        style={styles.sellerRow}
        onPress={() => onOpenSeller(seller)}
        disabled={!seller.id}
        accessibilityRole="button"
        accessibilityLabel={t("mpCartOpenSellerA11y", { name: sellerName })}
      >
        <View style={styles.avatar}>
          {seller.imageUrl ? (
            <AppImage
              uri={seller.imageUrl}
              style={styles.avatarImage}
              resizeMode="cover"
            />
          ) : (
            <Text style={styles.avatarInitial}>{initial}</Text>
          )}
        </View>
        <View style={styles.sellerText}>
          <Text style={styles.sellerName} numberOfLines={1}>
            {sellerName}
          </Text>
          {deliverySummary ? (
            <View style={styles.deliveryLine}>
              <MaterialIcons
                name={deliveryIcon(delivery)}
                size={moderateWidthScale(15)}
                color={theme.selectCard}
              />
              <Text style={styles.deliveryText} numberOfLines={1}>
                {deliverySummary}
              </Text>
            </View>
          ) : null}
        </View>
        <MaterialIcons
          name="chevron-right"
          size={moderateWidthScale(24)}
          color={theme.lightGreen}
        />
      </TouchableOpacity>

      {group.items.map((item) => (
        <React.Fragment key={item.id}>
          <View style={styles.divider} />
          <CartLineItem
            item={item}
            busy={busyLineIds.has(item.id)}
            onChangeQuantity={onChangeQuantity}
            onRemove={onRemove}
            onPendingChange={setLinePending}
            onOpenProduct={onOpenProduct}
          />
        </React.Fragment>
      ))}

      <View style={styles.divider} />

      <View style={styles.summary}>
        <View style={styles.priceRow}>
          <Text style={styles.priceKey}>{t("orderSubtotal")}</Text>
          <Text style={styles.priceValue}>{formatShopPrice(group.subtotal)}</Text>
        </View>
        <View style={styles.priceRow}>
          <Text style={styles.priceKey}>{t("mpCartShippingEstimate")}</Text>
          <Text style={styles.priceValue}>{shippingValue}</Text>
        </View>
        <View style={styles.priceRow}>
          <Text style={styles.priceKey}>{t("mpCartTaxEstimate")}</Text>
          <Text style={styles.priceValue}>
            {formatShopPrice(group.taxEstimate)}
          </Text>
        </View>
        <View style={styles.totalRow}>
          <Text style={styles.totalKey}>{t("mpCartTotalEstimate")}</Text>
          <Text style={styles.totalValue}>
            {formatShopPrice(group.totalEstimate)}
          </Text>
        </View>
        <View style={styles.note}>
          <MaterialIcons
            name="info-outline"
            size={moderateWidthScale(15)}
            color={theme.lightGreen}
          />
          <Text style={styles.noteText}>{t("mpCartShippingAtCheckout")}</Text>
        </View>
      </View>

      <FlowButton
        compact
        label={t("checkout")}
        icon="lock"
        onPress={() => onCheckout(group)}
        disabled={checkoutDisabled}
        accessibilityHint={t("mpCartCheckoutHint", { name: sellerName })}
      />
      {blockedReason ? (
        <View style={styles.blocked}>
          <MaterialIcons
            name="error-outline"
            size={moderateWidthScale(16)}
            color={theme.red}
          />
          <Text style={styles.blockedText}>{blockedReason}</Text>
        </View>
      ) : null}
    </View>
  );
}
