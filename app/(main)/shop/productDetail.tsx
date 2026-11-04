import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useAppDispatch, useAppSelector, useTheme } from "@/src/hooks/hooks";
import { isOwnBusinessInCustomerMode } from "@/src/state/slices/userSlice";
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
import ProductRating from "@/src/components/marketplace/ProductRating";
import VariantChips from "@/src/components/marketplace/detail/VariantChips";
import { formatShopPrice } from "@/src/constants/demoShopProduct";
import {
  setShippingMethod,
  setShopProduct,
  setShopQuantity,
  setShopVariant,
} from "@/src/state/slices/shopCartSlice";
import { openFullImageModal } from "@/src/state/slices/generalSlice";
import { fetchProduct } from "@/src/services/productService";
import Logger from "@/src/services/logger";
import {
  describeDelivery,
  findProductVariant,
  getMaxQuantity,
  getProductGallery,
  getUnitPrice,
  isProductPurchasable,
  productHasVariants,
} from "@/src/utils/shopProductHelpers";
import { isPaymentsEnabled } from "@/src/utils/paymentsEnabled";

/** Show "Only N left" at or below this stock. */
const LOW_STOCK = 5;
const SHOP_STEP_TOTAL = 3;
/** Product and option galleries hold up to 4 photos. */
const MAX_GALLERY = 4;
const HERO_HEIGHT = heightScale(260);
/** Hero card border (1pt each side) — the photo pages fill the inside. */
const HERO_BORDER = 2;

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
      height: HERO_HEIGHT,
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
    dots: {
      position: "absolute",
      bottom: moderateHeightScale(12),
      alignSelf: "center",
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(6),
      paddingHorizontal: moderateWidthScale(10),
      paddingVertical: moderateHeightScale(6),
      borderRadius: moderateWidthScale(12),
      backgroundColor: "rgba(40, 54, 24, 0.35)",
    },
    dot: {
      width: widthScale(7),
      height: widthScale(7),
      borderRadius: widthScale(4),
      backgroundColor: "rgba(255, 255, 255, 0.55)",
    },
    dotOn: {
      width: widthScale(18),
      backgroundColor: theme.white,
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
    priceRow: {
      flexDirection: "row",
      alignItems: "center",
      flexWrap: "wrap",
      gap: moderateWidthScale(8),
    },
    price: {
      fontSize: fontSize.size24,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      fontVariant: ["tabular-nums"],
    },
    regularPrice: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen5,
      textDecorationLine: "line-through",
      fontVariant: ["tabular-nums"],
    },
    saleBadge: {
      paddingHorizontal: moderateWidthScale(10),
      paddingVertical: moderateHeightScale(3),
      borderRadius: moderateWidthScale(10),
      backgroundColor: theme.selectCard,
    },
    saleBadgeText: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontBold,
      color: theme.white,
      letterSpacing: 0.4,
      textTransform: "uppercase",
    },
    benefitsCard: {
      padding: moderateWidthScale(16),
      gap: moderateHeightScale(10),
    },
    benefitRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: moderateWidthScale(10),
    },
    benefitText: {
      flex: 1,
      fontSize: fontSize.size15,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
      lineHeight: fontSize.size20,
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
  const variantId = useAppSelector((s) => s.shopCart.variantId);
  // Compare as strings: the feed has sent numeric ids before; route params are strings
  const product =
    shopProduct && String(shopProduct.id) === String(productId) ? shopProduct : null;
  /** Deleted or unpublished since the feed loaded (404 on refresh) */
  const [unavailable, setUnavailable] = useState(false);

  // The feed's copy can be stale — refresh price, stock, options and delivery
  // (again when coming back from checkout, e.g. after an option sold out).
  // On other errors keep the feed copy; checkout validates again on the server.
  useFocusEffect(
    useCallback(() => {
      if (!productId) return;
      let cancelled = false;
      fetchProduct(productId)
        .then((fresh) => {
          if (cancelled) return;
          setUnavailable(false);
          dispatch(setShopProduct(fresh));
        })
        .catch((err: any) => {
          if (cancelled) return;
          if (err?.status === 404) setUnavailable(true);
          else Logger.error("Failed to refresh product:", err);
        });
      return () => {
        cancelled = true;
      };
    }, [dispatch, productId]),
  );

  const hasVariants = !!product && productHasVariants(product);
  const variant = product ? findProductVariant(product, variantId) : null;

  // Options are required: keep a valid one picked (first in stock), drop a
  // stale id when the product has none.
  useEffect(() => {
    if (!product) return;
    let next: number | null = null;
    if (hasVariants) {
      next =
        variant && variant.inStock
          ? variant.id
          : (product.variants?.find((v) => v.inStock)?.id ?? null);
    }
    if (next !== variantId) dispatch(setShopVariant(next));
  }, [dispatch, hasVariants, product, variant, variantId]);

  // Stock (of the chosen option) may have dropped below the chosen quantity
  const maxQty = product
    ? hasVariants && !variant
      ? 0
      : getMaxQuantity(product, variant)
    : 0;
  const stockCap = Math.max(1, maxQty);
  useEffect(() => {
    if (quantity > stockCap) dispatch(setShopQuantity(stockCap));
  }, [dispatch, quantity, stockCap]);

  // Gallery: the option's own photos when it has them, else the product's
  const gallery = useMemo(
    () => (product ? getProductGallery(product, variant).slice(0, MAX_GALLERY) : []),
    [product, variant],
  );
  const galleryKey = gallery.map((img) => img.url).join("|");
  const { width: windowWidth } = useWindowDimensions();
  const [heroWidth, setHeroWidth] = useState(
    windowWidth - moderateWidthScale(20) * 2 - HERO_BORDER,
  );
  const [photoIndex, setPhotoIndex] = useState(0);
  const galleryRef = useRef<FlatList<{ id: number; url: string }>>(null);
  useEffect(() => {
    setPhotoIndex(0);
    galleryRef.current?.scrollToOffset({ offset: 0, animated: false });
  }, [galleryKey]);
  const onHeroLayout = useCallback((e: LayoutChangeEvent) => {
    const w = Math.round(e.nativeEvent.layout.width) - HERO_BORDER;
    if (w > 0) setHeroWidth(w);
  }, []);
  const onGalleryScrollEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (heroWidth <= 0) return;
      const next = Math.round(e.nativeEvent.contentOffset.x / heroWidth);
      setPhotoIndex(Math.max(0, Math.min(next, gallery.length - 1)));
    },
    [gallery.length, heroWidth],
  );

  // Customer mode: the server refuses buying from your own business
  const isOwnProduct = useAppSelector((s) =>
    isOwnBusinessInCustomerMode(s.user, product?.business_id),
  );

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

  // With options: out of stock only when every option is (server `inStock`)
  const outOfStock =
    product.inStock === false || (!!variant && !variant.inStock);
  const needsOption = hasVariants && !variant && !outOfStock;
  const takingOrders = !!product.delivery?.configured;
  // No Stripe Connect yet: the salon can't take product payments in the app
  const paymentsOff = !isPaymentsEnabled(product.paymentsEnabled);
  const canBuy =
    takingOrders &&
    !outOfStock &&
    !unavailable &&
    !isOwnProduct &&
    !paymentsOff &&
    isProductPurchasable(product, variant);
  const stock = variant ? variant.inventoryCount : product.inventoryCount;
  const lowStock =
    product.trackInventory &&
    (!hasVariants || !!variant) &&
    stock > 0 &&
    stock <= LOW_STOCK;
  const unit = getUnitPrice(product, variant);
  const showRegular = unit.onSale && unit.regular > unit.price;
  const benefits = product.benefits ?? [];
  const deliveryLines = describeDelivery(product.delivery, t);
  const openPhoto = (index: number) => {
    const urls = gallery.map((img) => img.url);
    if (urls.length > 0) {
      dispatch(openFullImageModal({ images: urls, initialIndex: index }));
    }
  };

  return (
    <View style={styles.container}>
      {header}
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero} onLayout={onHeroLayout}>
          {gallery.length > 0 ? (
            <>
              <FlatList
                ref={galleryRef}
                data={gallery}
                horizontal
                pagingEnabled
                bounces={false}
                showsHorizontalScrollIndicator={false}
                keyExtractor={(img, i) => `${img.id}-${i}`}
                onMomentumScrollEnd={onGalleryScrollEnd}
                getItemLayout={(_, i) => ({
                  length: heroWidth,
                  offset: heroWidth * i,
                  index: i,
                })}
                style={{ width: heroWidth, height: HERO_HEIGHT - HERO_BORDER }}
                renderItem={({ item, index }) => (
                  <TouchableOpacity
                    activeOpacity={0.95}
                    onPress={() => openPhoto(index)}
                    style={{ width: heroWidth, height: HERO_HEIGHT - HERO_BORDER }}
                    accessibilityRole="imagebutton"
                    accessibilityLabel={t("mpReelPhotoA11y", {
                      name: product.name,
                      current: index + 1,
                      total: gallery.length,
                    })}
                  >
                    <AppImage
                      uri={item.url}
                      style={styles.heroImage}
                      resizeMode="cover"
                      recyclingKey={`shop-pd-${item.url}`}
                    />
                  </TouchableOpacity>
                )}
              />
              {gallery.length > 1 ? (
                <View style={styles.dots} pointerEvents="none">
                  {gallery.map((img, i) => (
                    <View
                      key={`${img.id}-${i}`}
                      style={[styles.dot, i === photoIndex && styles.dotOn]}
                    />
                  ))}
                </View>
              ) : null}
            </>
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
          <ProductRating rating={product.rating} />
          <View
            style={styles.priceRow}
            accessible
            accessibilityLabel={
              showRegular
                ? t("mpPriceOnSaleA11y", {
                    price: formatShopPrice(unit.price),
                    regular: formatShopPrice(unit.regular),
                  })
                : formatShopPrice(unit.price)
            }
          >
            <Text style={styles.price}>{formatShopPrice(unit.price)}</Text>
            {showRegular ? (
              <>
                <Text style={styles.regularPrice}>
                  {formatShopPrice(unit.regular)}
                </Text>
                <View style={styles.saleBadge}>
                  <Text style={styles.saleBadgeText}>{t("mpSale")}</Text>
                </View>
              </>
            ) : null}
          </View>
          {!!product.description && (
            <Text style={styles.description}>{product.description}</Text>
          )}
        </View>

        {benefits.length > 0 ? (
          <FlowCard style={styles.benefitsCard}>
            {benefits.map((line, i) => (
              <View key={`${i}-${line}`} style={styles.benefitRow}>
                <MaterialIcons
                  name="check-circle"
                  size={moderateWidthScale(20)}
                  color={theme.successGreen}
                />
                <Text style={styles.benefitText}>{line}</Text>
              </View>
            ))}
          </FlowCard>
        ) : null}

        {hasVariants && !unavailable ? (
          <VariantChips
            variants={product.variants ?? []}
            selectedId={variant?.id ?? null}
            onSelect={(v) => dispatch(setShopVariant(v.id))}
          />
        ) : null}

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
                  {formatShopPrice(unit.price)}
                </Text>
                <View style={styles.stepper}>
                  <TouchableOpacity
                    style={[styles.qtyBtn, quantity <= 1 && styles.qtyBtnDisabled]}
                    activeOpacity={0.7}
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
                    activeOpacity={0.7}
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
                  {formatShopPrice(
                    Math.round(unit.price * quantity * 100) / 100,
                  )}
                </Text>
              </View>
            </FlowCard>
            {paymentsOff ? (
              <InfoNote icon="storefront" text={t("peShopOffNote")} />
            ) : lowStock ? (
              <InfoNote
                tone="warm"
                icon="inventory-2"
                text={t("shopOnlyLeft", { count: stock })}
              />
            ) : null}
            <InfoNote icon="assignment-return" text={t("mpRefundPolicyNote")} />
          </>
        )}
      </ScrollView>

      <FlowFooter
        primary={{
          label: isOwnProduct
            ? t("ownBusinessBlockedTitle")
            : unavailable
              ? t("productUnavailableTitle")
              : paymentsOff
                ? t("peShopOffTitle")
                : outOfStock
                  ? t("outOfStock")
                  : needsOption
                    ? t("mpReelChooseOption")
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
