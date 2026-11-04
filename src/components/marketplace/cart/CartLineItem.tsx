import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { MaterialCommunityIcons, MaterialIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  heightScale,
  moderateHeightScale,
  moderateWidthScale,
  widthScale,
} from "@/src/theme/dimensions";
import AppImage from "@/src/components/AppImage";
import ProductPrice from "@/src/components/marketplace/ProductPrice";
import { formatShopPrice } from "@/src/constants/demoShopProduct";
import { MAX_PRODUCT_QUANTITY } from "@/src/utils/shopProductHelpers";
import type { MarketCartItem } from "@/src/types/marketplace";
import CartQuantityStepper from "./CartQuantityStepper";

type Props = {
  item: MarketCartItem;
  /** A quantity / remove call for this line is running. */
  busy: boolean;
  /** Saves the quantity; resolves with the server's quantity (null = failed). */
  onChangeQuantity: (
    item: MarketCartItem,
    quantity: number,
  ) => Promise<number | null>;
  onRemove: (item: MarketCartItem) => void;
  /** A quantity edit is waiting to be saved (debounce running). */
  onPendingChange?: (lineId: number, pending: boolean) => void;
  /** Opens the product page (photo / name tap). */
  onOpenProduct?: (item: MarketCartItem) => void;
};

/** Wait for the taps to settle, then send one PATCH. */
const QTY_DEBOUNCE_MS = 450;
const THUMB = widthScale(76);

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    wrap: { gap: moderateHeightScale(10) },
    busy: { opacity: 0.55 },
    row: {
      flexDirection: "row",
      gap: moderateWidthScale(12),
    },
    thumb: {
      width: THUMB,
      height: THUMB,
      borderRadius: moderateWidthScale(14),
      backgroundColor: theme.orangeBrown01,
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
    },
    thumbImage: { width: "100%", height: "100%" },
    info: { flex: 1, minWidth: 0, gap: moderateHeightScale(3) },
    nameRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: moderateWidthScale(4),
    },
    name: {
      flex: 1,
      fontSize: fontSize.size15,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      lineHeight: fontSize.size20,
    },
    variant: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
    },
    removeBtn: {
      width: widthScale(36),
      height: widthScale(36),
      marginTop: -moderateHeightScale(6),
      marginRight: -moderateWidthScale(8),
      alignItems: "center",
      justifyContent: "center",
    },
    bottomRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: moderateWidthScale(10),
      marginTop: moderateHeightScale(4),
    },
    lineTotal: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      fontVariant: ["tabular-nums"],
    },
    // ── Issue row
    issue: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(10),
      paddingLeft: moderateWidthScale(12),
      paddingRight: moderateWidthScale(6),
      paddingVertical: moderateHeightScale(6),
      borderRadius: moderateWidthScale(12),
      borderWidth: 1,
    },
    issueWarn: {
      backgroundColor: theme.orangeBrown01,
      borderColor: theme.orangeBrown30,
    },
    issueError: {
      backgroundColor: theme.lightRed,
      borderColor: theme.lightRed30,
    },
    issueText: {
      flex: 1,
      fontSize: fontSize.size13,
      fontFamily: fonts.fontMedium,
      lineHeight: fontSize.size18,
    },
    issueFix: {
      minHeight: heightScale(36),
      paddingHorizontal: moderateWidthScale(12),
      borderRadius: heightScale(18),
      backgroundColor: theme.white,
      borderWidth: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    issueFixText: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontBold,
      fontVariant: ["tabular-nums"],
    },
  });

/** One cart line: photo, name / option, price, − qty +, line total, issue. */
export default function CartLineItem({
  item,
  busy,
  onChangeQuantity,
  onRemove,
  onPendingChange,
  onOpenProduct,
}: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [qty, setQty] = useState(item.quantity);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingQty = useRef<number | null>(null);
  const itemRef = useRef(item);
  itemRef.current = item;
  const onPendingRef = useRef(onPendingChange);
  onPendingRef.current = onPendingChange;

  // Server value wins unless the customer is still tapping
  useEffect(() => {
    if (!timer.current) setQty(item.quantity);
  }, [item.quantity]);

  const clearPending = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    pendingQty.current = null;
    onPendingRef.current?.(itemRef.current.id, false);
  }, []);

  const maxQty = Math.min(MAX_PRODUCT_QUANTITY, Math.max(0, item.maxQuantity));
  const issue = item.issue;
  const lowStock = issue?.code === "not_enough_stock" && maxQty > 0;
  // Unavailable / out of stock / option gone: only Remove helps
  const stepperLocked = !!issue && !lowStock;

  const save = useCallback(
    async (next: number) => {
      const serverQty = await onChangeQuantity(itemRef.current, next);
      if (!timer.current) setQty(serverQty ?? itemRef.current.quantity);
    },
    [onChangeQuantity],
  );
  const saveRef = useRef(save);
  saveRef.current = save;

  // Leaving mid-debounce: still save what the stepper shows
  useEffect(
    () => () => {
      if (!timer.current) return;
      const next = pendingQty.current;
      clearPending();
      if (next != null && next !== itemRef.current.quantity) {
        void saveRef.current(next);
      }
    },
    [clearPending],
  );

  const handleStep = useCallback(
    (next: number) => {
      const clamped = Math.max(1, Math.min(maxQty || 1, next));
      setQty(clamped);
      if (timer.current) clearTimeout(timer.current);
      pendingQty.current = clamped;
      onPendingRef.current?.(itemRef.current.id, true);
      timer.current = setTimeout(() => {
        // save() marks the line busy before pending clears
        const changed = clamped !== itemRef.current.quantity;
        const run = changed ? save(clamped) : null;
        clearPending();
        void run;
      }, QTY_DEBOUNCE_MS);
    },
    [clearPending, maxQty, save],
  );

  const fixStock = useCallback(() => {
    clearPending();
    setQty(maxQty);
    void save(maxQty);
  }, [clearPending, maxQty, save]);

  // Drop a waiting edit so it is not sent for a removed line
  const handleRemove = useCallback(() => {
    clearPending();
    setQty(itemRef.current.quantity);
    onRemove(itemRef.current);
  }, [clearPending, onRemove]);

  const pending = qty !== item.quantity;
  const lineTotal = pending
    ? Math.round(item.unitPrice * qty * 100) / 100
    : item.lineTotal;
  const issueMessage = issue
    ? issue.message ||
      (lowStock
        ? t("mpCartIssueLowStock", { count: maxQty })
        : t("mpCartIssueUnavailable"))
    : "";
  const issueColor = lowStock ? theme.orangeBrownText : theme.red;

  return (
    <View style={[styles.wrap, busy && !pending && styles.busy]}>
      <View style={styles.row}>
        <TouchableOpacity
          activeOpacity={0.8}
          style={styles.thumb}
          onPress={onOpenProduct ? () => onOpenProduct(item) : undefined}
          disabled={!onOpenProduct}
          accessibilityRole="link"
          accessibilityLabel={item.name}
        >
          {item.imageUrl ? (
            <AppImage
              uri={item.imageUrl}
              style={styles.thumbImage}
              resizeMode="cover"
            />
          ) : (
            <MaterialIcons
              name="shopping-bag"
              size={moderateWidthScale(28)}
              color={theme.selectCard}
            />
          )}
        </TouchableOpacity>
        <View style={styles.info}>
          <View style={styles.nameRow}>
            <Text
              style={styles.name}
              numberOfLines={2}
              onPress={onOpenProduct ? () => onOpenProduct(item) : undefined}
              suppressHighlighting
            >
              {item.name}
            </Text>
            <TouchableOpacity
              activeOpacity={0.6}
              style={styles.removeBtn}
              onPress={handleRemove}
              disabled={busy}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              accessibilityRole="button"
              accessibilityLabel={t("mpCartRemoveA11y", { name: item.name })}
              accessibilityState={{ disabled: busy }}
            >
              <MaterialCommunityIcons
                name="trash-can-outline"
                size={moderateWidthScale(21)}
                color={theme.lightGreen}
              />
            </TouchableOpacity>
          </View>
          {item.variantName ? (
            <Text style={styles.variant} numberOfLines={1}>
              {item.variantName}
            </Text>
          ) : null}
          <ProductPrice
            price={item.unitPrice}
            regular={item.regularUnitPrice}
            onSale={item.onSale}
            size="sm"
          />
        </View>
      </View>

      <View style={styles.bottomRow}>
        <CartQuantityStepper
          value={qty}
          max={maxQty}
          onChange={handleStep}
          disabled={stepperLocked}
          loading={busy}
          name={item.name}
        />
        <Text
          style={styles.lineTotal}
          accessibilityLabel={t("mpCartLineTotalA11y", {
            amount: formatShopPrice(lineTotal),
          })}
        >
          {formatShopPrice(lineTotal)}
        </Text>
      </View>

      {issue ? (
        <View
          style={[styles.issue, lowStock ? styles.issueWarn : styles.issueError]}
          accessibilityRole="alert"
        >
          <MaterialIcons
            name={lowStock ? "inventory" : "error-outline"}
            size={moderateWidthScale(20)}
            color={issueColor}
          />
          <Text style={[styles.issueText, { color: issueColor }]}>
            {issueMessage}
          </Text>
          <TouchableOpacity
            activeOpacity={0.7}
            style={[styles.issueFix, { borderColor: issueColor }]}
            onPress={lowStock ? fixStock : handleRemove}
            disabled={busy}
            hitSlop={{ top: 4, bottom: 4 }}
            accessibilityRole="button"
            accessibilityState={{ disabled: busy }}
            accessibilityLabel={
              lowStock
                ? t("mpCartSetQuantityTo", { count: maxQty })
                : t("mpCartRemoveA11y", { name: item.name })
            }
          >
            <Text style={[styles.issueFixText, { color: issueColor }]}>
              {lowStock
                ? t("mpCartSetQuantityTo", { count: maxQty })
                : t("remove")}
            </Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );
}
