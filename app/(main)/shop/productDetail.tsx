import React, { useEffect, useMemo, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useAppDispatch, useAppSelector, useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  heightScale,
  moderateHeightScale,
  moderateWidthScale,
  widthScale,
} from "@/src/theme/dimensions";
import AppImage from "@/src/components/AppImage";
import FlowHeader from "@/src/components/reelFlow/flowHeader";
import FlowFooter from "@/src/components/reelFlow/flowFooter";
import {
  FlowCard,
  InfoNote,
  SectionLabel,
} from "@/src/components/reelFlow/flowParts";
import { formatShopPrice } from "@/src/constants/demoShopProduct";
import {
  setShippingMethod,
  setShopProduct,
  setShopQuantity,
} from "@/src/state/slices/shopCartSlice";
import { fetchProduct } from "@/src/services/productService";
import Logger from "@/src/services/logger";
import { describeDelivery } from "@/src/utils/shopProductHelpers";

const MAX_QTY_PER_ITEM = 10;
/** Show "Only N left" at or below this stock. */
const LOW_STOCK = 5;
const SHOP_STEP_TOTAL = 3;

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    content: {
      flex: 1,
    },
    contentContainer: {
      paddingHorizontal: moderateWidthScale(20),
      paddingTop: moderateHeightScale(8),
      paddingBottom: moderateHeightScale(24),
      gap: moderateHeightScale(16),
    },
    hero: {
      height: heightScale(260),
      borderRadius: moderateWidthScale(22),
      overflow: "hidden",
      backgroundColor: theme.white,
      borderWidth: 1,
      borderColor: theme.borderLight,
      alignItems: "center",
      justifyContent: "center",
    },
    heroImage: {
      width: "100%",
      height: "100%",
    },
    heroEmpty: {
      width: widthScale(96),
      height: widthScale(96),
      borderRadius: widthScale(48),
      backgroundColor: theme.orangeBrown01,
      alignItems: "center",
      justifyContent: "center",
    },
    info: {
      gap: moderateHeightScale(6),
    },
    brand: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontBold,
      color: theme.orangeBrownText,
      letterSpacing: 1,
      textTransform: "uppercase",
    },
    name: {
      fontSize: fontSize.size26,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      lineHeight: fontSize.size32,
    },
    price: {
      fontSize: fontSize.size24,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      fontVariant: ["tabular-nums"],
    },
    description: {
      marginTop: moderateHeightScale(4),
      fontSize: fontSize.size15,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      lineHeight: fontSize.size22,
    },
    deliveryCard: {
      paddingVertical: moderateHeightScale(6),
      paddingHorizontal: moderateWidthScale(16),
    },
    deliveryRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(12),
      minHeight: heightScale(52),
    },
    deliveryDivider: {
      height: 1,
      backgroundColor: theme.borderLight,
      marginLeft: widthScale(40) + moderateWidthScale(12),
    },
    deliveryIcon: {
      width: widthScale(40),
      height: widthScale(40),
      borderRadius: widthScale(20),
      backgroundColor: theme.orangeBrown01,
      alignItems: "center",
      justifyContent: "center",
    },
    deliveryText: {
      flex: 1,
      fontSize: fontSize.size15,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
    },
    qtyCard: {
      padding: moderateWidthScale(16),
      gap: moderateHeightScale(14),
    },
    qtyRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(12),
    },
    qtyLabel: {
      flex: 1,
      fontSize: fontSize.size17,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    stepper: {
      flexDirection: "row",
      alignItems: "center",
      borderRadius: widthScale(26),
      backgroundColor: theme.background,
      borderWidth: 1,
      borderColor: theme.borderNormal,
      padding: moderateWidthScale(4),
    },
    qtyBtn: {
      width: widthScale(44),
      height: widthScale(44),
      borderRadius: widthScale(22),
      backgroundColor: theme.white,
      alignItems: "center",
      justifyContent: "center",
    },
    qtyBtnDisabled: { opacity: 0.35 },
    qtyText: {
      fontSize: fontSize.size18,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      minWidth: widthScale(40),
      textAlign: "center",
      fontVariant: ["tabular-nums"],
    },
    totalRow: {
      flexDirection: "row",
      alignItems: "baseline",
      justifyContent: "space-between",
      paddingTop: moderateHeightScale(12),
      borderTopWidth: 1,
      borderTopColor: theme.borderLight,
    },
    totalLabel: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontMedium,
      color: theme.lightGreen,
    },
    totalValue: {
      fontSize: fontSize.size20,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      fontVariant: ["tabular-nums"],
    },
    empty: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      padding: moderateWidthScale(24),
    },
    emptyText: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      textAlign: "center",
    },
  });

/** Shop flow, step 1 of 3: the product and how many. */
export default function ProductDetailScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { productId } = useLocalSearchParams<{ productId?: string }>();
  const shopProduct = useAppSelector((s) => s.shopCart.product);
  const quantity = useAppSelector((s) => s.shopCart.quantity);
  // Compare as strings: the feed has sent numeric ids before; route params are strings
  const product =
    shopProduct && String(shopProduct.id) === String(productId) ? shopProduct : null;
  /** Deleted or unpublished since the feed loaded (404 on refresh) */
  const [unavailable, setUnavailable] = useState(false);

  // The feed's copy can be stale — refresh price, stock and delivery. On other
  // errors keep the feed copy; checkout validates again on the server.
  useEffect(() => {
    if (!productId) return;
    let cancelled = false;
    fetchProduct(productId)
      .then((fresh) => {
        if (!cancelled) dispatch(setShopProduct(fresh));
      })
      .catch((err: any) => {
        if (cancelled) return;
        if (err?.status === 404) setUnavailable(true);
        else Logger.error("Failed to refresh product:", err);
      });
    return () => {
      cancelled = true;
    };
  }, [dispatch, productId]);

  // Stock may have dropped below the chosen quantity
  const stockCap =
    product?.trackInventory && product.inventoryCount > 0
      ? Math.min(product.inventoryCount, MAX_QTY_PER_ITEM)
      : MAX_QTY_PER_ITEM;
  useEffect(() => {
    if (quantity > stockCap) dispatch(setShopQuantity(stockCap));
  }, [dispatch, quantity, stockCap]);

  const header = (
    <FlowHeader
      title={t("shopFlowTitle")}
      step={product ? { current: 1, total: SHOP_STEP_TOTAL } : null}
      onBack={() => router.back()}
      backIcon="close"
    />
  );

  if (!product) {
    return (
      <View style={styles.container}>
        {header}
        <View style={styles.empty}>
          <Text style={styles.emptyText}>{t("productNotFound")}</Text>
        </View>
      </View>
    );
  }

  const outOfStock = product.trackInventory && product.inventoryCount <= 0;
  const takingOrders = !!product.delivery?.configured;
  const canBuy = takingOrders && !outOfStock && !unavailable;
  const lowStock =
    product.trackInventory &&
    product.inventoryCount > 0 &&
    product.inventoryCount <= LOW_STOCK;
  const maxQty = product.trackInventory
    ? Math.min(product.inventoryCount, MAX_QTY_PER_ITEM)
    : MAX_QTY_PER_ITEM;
  const deliveryLines = describeDelivery(product.delivery, t);

  return (
    <View style={styles.container}>
      {header}
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          {product.imageUri ? (
            <AppImage
              uri={product.imageUri}
              style={styles.heroImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.heroEmpty}>
              <MaterialIcons
                name="shopping-bag"
                size={moderateWidthScale(48)}
                color={theme.selectCard}
              />
            </View>
          )}
        </View>

        <View style={styles.info}>
          {!!product.brand && <Text style={styles.brand}>{product.brand}</Text>}
          <Text style={styles.name} accessibilityRole="header">
            {product.name}
          </Text>
          <Text style={styles.price}>{formatShopPrice(product.sellingPrice)}</Text>
          {!!product.description && (
            <Text style={styles.description}>{product.description}</Text>
          )}
        </View>

        {deliveryLines.length > 0 ? (
          <FlowCard style={styles.deliveryCard}>
            {deliveryLines.map((line, i) => (
              <React.Fragment key={line.label}>
                {i > 0 ? <View style={styles.deliveryDivider} /> : null}
                <View style={styles.deliveryRow}>
                  <View style={styles.deliveryIcon}>
                    <MaterialIcons
                      name={line.icon}
                      size={moderateWidthScale(20)}
                      color={theme.selectCard}
                    />
                  </View>
                  <Text style={styles.deliveryText}>{line.label}</Text>
                </View>
              </React.Fragment>
            ))}
          </FlowCard>
        ) : null}

        {unavailable ? (
          <InfoNote
            tone="warm"
            icon="remove-shopping-cart"
            text={t("productNoLongerAvailable")}
          />
        ) : !takingOrders ? (
          <InfoNote tone="warm" icon="storefront" text={t("salonNotTakingOrders")} />
        ) : outOfStock ? (
          <InfoNote tone="warm" icon="remove-shopping-cart" text={t("outOfStock")} />
        ) : (
          <>
            <SectionLabel label={t("quantity")} />
            <FlowCard style={styles.qtyCard}>
              <View style={styles.qtyRow}>
                <Text style={styles.qtyLabel}>
                  {formatShopPrice(product.sellingPrice)}
                </Text>
                <View style={styles.stepper}>
                  <TouchableOpacity
                    style={[styles.qtyBtn, quantity <= 1 && styles.qtyBtnDisabled]}
                    disabled={quantity <= 1}
                    onPress={() => dispatch(setShopQuantity(quantity - 1))}
                    accessibilityRole="button"
                    accessibilityLabel={t("shopQtyLess")}
                  >
                    <MaterialIcons
                      name="remove"
                      size={moderateWidthScale(22)}
                      color={theme.darkGreen}
                    />
                  </TouchableOpacity>
                  <Text style={styles.qtyText} accessibilityLiveRegion="polite">
                    {quantity}
                  </Text>
                  <TouchableOpacity
                    style={[
                      styles.qtyBtn,
                      quantity >= maxQty && styles.qtyBtnDisabled,
                    ]}
                    disabled={quantity >= maxQty}
                    onPress={() => dispatch(setShopQuantity(quantity + 1))}
                    accessibilityRole="button"
                    accessibilityLabel={t("shopQtyMore")}
                  >
                    <MaterialIcons
                      name="add"
                      size={moderateWidthScale(22)}
                      color={theme.darkGreen}
                    />
                  </TouchableOpacity>
                </View>
              </View>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>{t("total")}</Text>
                <Text style={styles.totalValue}>
                  {formatShopPrice(product.sellingPrice * quantity)}
                </Text>
              </View>
            </FlowCard>
            {lowStock ? (
              <InfoNote
                tone="warm"
                icon="inventory-2"
                text={t("shopOnlyLeft", { count: product.inventoryCount })}
              />
            ) : null}
          </>
        )}
      </ScrollView>

      <FlowFooter
        primary={{
          label: unavailable
            ? t("productUnavailableTitle")
            : outOfStock
              ? t("outOfStock")
              : t("shopNextDelivery"),
          disabled: !canBuy,
          trailingIcon: canBuy ? "chevron-right" : undefined,
          onPress: () => {
            dispatch(setShippingMethod(null));
            router.push("/(main)/shop/checkout" as any);
          },
        }}
      />
    </View>
  );
}
