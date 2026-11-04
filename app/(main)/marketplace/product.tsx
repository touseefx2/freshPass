import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { MaterialCommunityIcons, MaterialIcons } from "@expo/vector-icons";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppDispatch, useAppSelector, useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  heightScale,
  moderateHeightScale,
  moderateWidthScale,
  widthScale,
} from "@/src/theme/dimensions";
import CatalogHeader from "@/src/components/marketplace/catalog/CatalogHeader";
import { flowFooterBottomPad } from "@/src/components/reelFlow/flowFooter";
import { FlowCard, InfoNote } from "@/src/components/reelFlow/flowParts";
import ProductPrice from "@/src/components/marketplace/ProductPrice";
import ProductRating from "@/src/components/marketplace/ProductRating";
import MarketplaceEmptyState from "@/src/components/marketplace/MarketplaceEmptyState";
import ProductGallery from "@/src/components/marketplace/detail/ProductGallery";
import VariantChips from "@/src/components/marketplace/detail/VariantChips";
import QuantityStepper from "@/src/components/marketplace/detail/QuantityStepper";
import ReviewSummary from "@/src/components/marketplace/detail/ReviewSummary";
import ReviewCard from "@/src/components/marketplace/detail/ReviewCard";
import { useNotificationContext } from "@/src/contexts/NotificationContext";
import { setGuestModeModalVisible } from "@/src/state/slices/generalSlice";
import { isOwnBusinessInCustomerMode } from "@/src/state/slices/userSlice";
import { setMarketCheckout } from "@/src/state/slices/marketCartSlice";
import { fetchProduct } from "@/src/services/productService";
import { fetchProductReviews } from "@/src/services/marketplaceService";
import { addCartItem, getCartErrorMessage } from "@/src/services/cartService";
import { isRequestCanceled } from "@/src/services/api";
import Logger from "@/src/services/logger";
import { formatShopPrice } from "@/src/constants/demoShopProduct";
import type { ShopProduct, ShopProductVariant } from "@/src/types/shopProduct";
import type { ProductReviewsPage } from "@/src/types/marketplace";
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
import { resetToDashboardHome } from "@/src/utils/navigation";

/** "Only N left" at or below this stock (same as the reel product page). */
const LOW_STOCK = 5;
const REVIEW_PREVIEW = 3;

type Block = {
  kind: "own" | "noDelivery" | "paymentsOff" | "outOfStock" | "chooseOption" | "optionOut";
  title: string;
  message: string;
  icon: keyof typeof MaterialIcons.glyphMap;
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    scroll: {
      flex: 1,
    },
    body: {
      paddingHorizontal: moderateWidthScale(20),
      paddingTop: moderateHeightScale(16),
      paddingBottom: moderateHeightScale(28),
      gap: moderateHeightScale(18),
    },
    info: {
      gap: moderateHeightScale(6),
    },
    brand: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontBold,
      color: theme.orangeBrownText,
      letterSpacing: 1,
      textTransform: "uppercase",
    },
    name: {
      fontSize: fontSize.size26,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      lineHeight: fontSize.size26 * 1.2,
    },
    sellerLink: {
      alignSelf: "flex-start",
      flexDirection: "row",
      alignItems: "center",
      minHeight: heightScale(36),
      gap: moderateWidthScale(2),
    },
    sellerText: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
      textDecorationLine: "underline",
    },
    ratingLink: {
      alignSelf: "flex-start",
      minHeight: heightScale(36),
      justifyContent: "center",
    },
    priceRow: {
      marginTop: moderateHeightScale(2),
    },
    sectionTitle: {
      fontSize: fontSize.size18,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    description: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontRegular,
      color: theme.darkGreen,
      lineHeight: fontSize.size15 * 1.5,
    },
    benefits: {
      gap: moderateHeightScale(8),
    },
    benefitRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: moderateWidthScale(10),
    },
    benefitText: {
      flex: 1,
      fontSize: fontSize.size15,
      fontFamily: fonts.fontRegular,
      color: theme.darkGreen,
      lineHeight: fontSize.size15 * 1.4,
    },
    fulfilCard: {
      paddingHorizontal: moderateWidthScale(16),
      paddingVertical: moderateHeightScale(6),
    },
    fulfilRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(12),
      minHeight: heightScale(50),
      paddingVertical: moderateHeightScale(6),
    },
    fulfilDivider: {
      height: 1,
      backgroundColor: theme.borderLight,
      marginLeft: widthScale(36) + moderateWidthScale(12),
    },
    fulfilIcon: {
      width: widthScale(36),
      height: widthScale(36),
      borderRadius: widthScale(18),
      backgroundColor: theme.orangeBrown01,
      alignItems: "center",
      justifyContent: "center",
    },
    fulfilText: {
      flex: 1,
      fontSize: fontSize.size15,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
      lineHeight: fontSize.size15 * 1.35,
    },
    fulfilSmall: {
      flex: 1,
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      lineHeight: fontSize.size13 * 1.5,
    },
    reviewsHead: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    seeAll: {
      minHeight: heightScale(44),
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(2),
    },
    seeAllText: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontBold,
      color: theme.selectCard,
    },
    reviewsCard: {
      paddingHorizontal: moderateWidthScale(16),
      paddingVertical: moderateHeightScale(14),
    },
    reviewDivider: {
      height: 1,
      backgroundColor: theme.borderLight,
    },
    reviewsState: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(10),
      minHeight: heightScale(44),
    },
    reviewsStateText: {
      flex: 1,
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
    },
    retrySmall: {
      minHeight: heightScale(44),
      paddingHorizontal: moderateWidthScale(14),
      justifyContent: "center",
    },
    writeBtn: {
      marginTop: moderateHeightScale(12),
      minHeight: heightScale(48),
      borderRadius: moderateWidthScale(14),
      borderWidth: 1.5,
      borderColor: theme.darkGreen,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: moderateWidthScale(8),
    },
    writeBtnText: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    // ── Bottom bar
    bar: {
      paddingHorizontal: moderateWidthScale(20),
      paddingTop: moderateHeightScale(12),
      gap: moderateHeightScale(10),
      backgroundColor: theme.background,
      borderTopWidth: 1,
      borderTopColor: theme.borderLight,
    },
    barHint: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: moderateWidthScale(6),
    },
    barHintText: {
      flexShrink: 1,
      fontSize: fontSize.size14,
      fontFamily: fonts.fontMedium,
      color: theme.selectCard,
      textAlign: "center",
    },
    barRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(12),
    },
    addBtn: {
      flex: 1,
      height: widthScale(52),
      borderRadius: moderateWidthScale(16),
      backgroundColor: theme.darkGreen,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: moderateWidthScale(8),
    },
    addBtnText: {
      fontSize: fontSize.size17,
      fontFamily: fonts.fontBold,
      color: theme.white,
    },
    buyBtn: {
      height: heightScale(52),
      borderRadius: moderateWidthScale(16),
      borderWidth: 1.5,
      borderColor: theme.orangeBrown,
      backgroundColor: theme.white,
      alignItems: "center",
      justifyContent: "center",
    },
    buyBtnText: {
      fontSize: fontSize.size17,
      fontFamily: fonts.fontBold,
      color: theme.selectCard,
    },
    btnOff: {
      opacity: 0.4,
    },
    // ── Loading skeleton
    skeletonHero: {
      height: widthScale(290),
      backgroundColor: theme.lightGreen07,
      alignItems: "center",
      justifyContent: "center",
    },
    skeletonLine: {
      height: heightScale(18),
      borderRadius: heightScale(9),
      backgroundColor: theme.lightGreen07,
    },
    centered: {
      flex: 1,
      justifyContent: "center",
    },
  });

export default function MarketplaceProductScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const insets = useSafeAreaInsets();
  const { showBanner } = useNotificationContext();
  const { productId } = useLocalSearchParams<{ productId?: string }>();
  const isGuest = useAppSelector((s) => s.user.isGuest);

  const [product, setProduct] = useState<ShopProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [variantId, setVariantId] = useState<number | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [adding, setAdding] = useState(false);

  const [reviews, setReviews] = useState<ProductReviewsPage | null>(null);
  const [reviewsError, setReviewsError] = useState(false);

  const isOwnProduct = useAppSelector((s) =>
    isOwnBusinessInCustomerMode(s.user, product?.business_id ?? product?.seller?.id),
  );

  // ── Loading ─────────────────────────────────────────────────────

  const loadProduct = useCallback(async () => {
    if (!productId) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    try {
      const fresh = await fetchProduct(productId);
      setProduct(fresh);
      setNotFound(false);
      setLoadError(false);
      // Keep the chosen option if it's still buyable, else the first in-stock one
      setVariantId((current) => {
        const kept = findProductVariant(fresh, current);
        if (kept?.inStock) return kept.id;
        return fresh.variants?.find((v) => v.inStock)?.id ?? null;
      });
    } catch (err: any) {
      if (isRequestCanceled(err)) return;
      if (err?.status === 404) setNotFound(true);
      else {
        Logger.error("Marketplace product load failed:", err);
        setLoadError(true);
      }
    } finally {
      setLoading(false);
    }
  }, [productId]);

  const loadReviews = useCallback(async () => {
    if (!productId) return;
    try {
      const page = await fetchProductReviews(productId, {
        perPage: REVIEW_PREVIEW,
      });
      setReviews(page);
      setReviewsError(false);
    } catch (err) {
      if (isRequestCanceled(err)) return;
      Logger.error("Marketplace reviews load failed:", err);
      setReviewsError(true);
    }
  }, [productId]);

  useEffect(() => {
    setLoading(true);
    void loadProduct();
  }, [loadProduct]);

  // Reviews come back fresh after writing / editing one
  useFocusEffect(
    useCallback(() => {
      void loadReviews();
    }, [loadReviews]),
  );

  // Back from checkout / cart: stock and options may have changed
  const firstFocus = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (firstFocus.current) {
        firstFocus.current = false;
        return;
      }
      void loadProduct();
    }, [loadProduct]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([loadProduct(), loadReviews()]);
    setRefreshing(false);
  }, [loadProduct, loadReviews]);

  const goBack = useCallback(() => {
    if (router.canGoBack()) router.back();
    else resetToDashboardHome();
  }, [router]);

  // ── Derived ─────────────────────────────────────────────────────

  const variant: ShopProductVariant | null = product
    ? findProductVariant(product, variantId)
    : null;
  const hasVariants = product ? productHasVariants(product) : false;
  const gallery = useMemo(
    () => (product ? getProductGallery(product, variant).slice(0, 4) : []),
    [product, variant],
  );
  const maxQty = product ? getMaxQuantity(product, variant) : 0;

  useEffect(() => {
    setQuantity((q) => Math.max(1, Math.min(q, Math.max(1, maxQty))));
  }, [maxQty]);

  const block: Block | null = useMemo(() => {
    if (!product) return null;
    if (isOwnProduct) {
      return {
        kind: "own",
        title: t("ownBusinessBlockedTitle"),
        message: t("ownBusinessBlockedMessage"),
        icon: "storefront",
      };
    }
    if (!product.delivery?.configured) {
      return {
        kind: "noDelivery",
        title: t("peShopOffTitle"),
        message: t("salonNotTakingOrders"),
        icon: "storefront",
      };
    }
    if (!isPaymentsEnabled(product.paymentsEnabled)) {
      return {
        kind: "paymentsOff",
        title: t("peShopOffTitle"),
        message: t("peShopOffNote"),
        icon: "credit-card-off",
      };
    }
    if (product.inStock === false) {
      return {
        kind: "outOfStock",
        title: t("mpOutOfStock"),
        message: t("mpPdOutOfStockNote"),
        icon: "remove-shopping-cart",
      };
    }
    if (hasVariants && !variant) {
      return {
        kind: "chooseOption",
        title: t("mpPdChooseOption"),
        message: t("mpPdChooseOptionHint"),
        icon: "touch-app",
      };
    }
    if (!isProductPurchasable(product, variant)) {
      return {
        kind: "optionOut",
        title: t("mpOutOfStock"),
        message: t("mpPdOptionOutOfStockNote"),
        icon: "remove-shopping-cart",
      };
    }
    return null;
  }, [hasVariants, isOwnProduct, product, t, variant]);

  // ── Actions ─────────────────────────────────────────────────────

  const onShare = useCallback(async () => {
    if (!product) return;
    const { price } = getUnitPrice(product, variant);
    const sellerName = product.seller?.name;
    try {
      await Share.share({
        message: sellerName
          ? t("mpPdShareMessage", {
              name: product.name,
              price: formatShopPrice(price),
              seller: sellerName,
            })
          : t("mpPdShareMessageNoSeller", {
              name: product.name,
              price: formatShopPrice(price),
            }),
      });
    } catch {
      // Share sheet closed or unavailable
    }
  }, [product, t, variant]);

  const openSeller = useCallback(() => {
    const id = product?.seller?.id ?? product?.business_id;
    if (!id) return;
    router.push({
      pathname: "/(main)/businessDetail",
      params: { business_id: String(id) },
    } as any);
  }, [product, router]);

  const openReviews = useCallback(() => {
    if (!product) return;
    router.push({
      pathname: "/(main)/marketplace/reviews",
      params: { productId: product.id, productName: product.name },
    } as any);
  }, [product, router]);

  const openWriteReview = useCallback(() => {
    if (!product) return;
    router.push({
      pathname: "/(main)/marketplace/writeReview",
      params: {
        productId: product.id,
        productName: product.name,
        imageUrl: gallery[0]?.url ?? product.imageUri ?? "",
      },
    } as any);
  }, [gallery, product, router]);

  const onAddToCart = useCallback(async () => {
    if (!product || adding) return;
    if (isGuest) {
      dispatch(setGuestModeModalVisible(true));
      return;
    }
    if (block) return;
    setAdding(true);
    try {
      await addCartItem({
        productId: product.id,
        variantId: variant?.id ?? null,
        quantity,
      });
      showBanner(
        t("addedToCart"),
        variant ? `${product.name} · ${variant.name}` : product.name,
        "success",
      );
    } catch (err) {
      if (isRequestCanceled(err)) return;
      showBanner(
        t("mpPdAddFailed"),
        getCartErrorMessage(err) ??
          (err as any)?.data?.message ??
          t("somethingWentWrong"),
        "error",
      );
    } finally {
      setAdding(false);
    }
  }, [adding, block, dispatch, isGuest, product, quantity, showBanner, t, variant]);

  const onBuyNow = useCallback(() => {
    if (!product) return;
    if (isGuest) {
      dispatch(setGuestModeModalVisible(true));
      return;
    }
    if (block || !product.delivery) return;
    const { price, regular } = getUnitPrice(product, variant);
    dispatch(
      setMarketCheckout({
        mode: "buyNow",
        seller: product.seller ?? {
          id: Number(product.business_id ?? 0),
          name: "",
          imageUrl: null,
        },
        delivery: product.delivery,
        lines: [
          {
            productId: Number(product.id),
            variantId: variant?.id ?? null,
            quantity,
            name: product.name,
            variantName: variant?.name ?? null,
            imageUrl: gallery[0]?.url ?? product.imageUri ?? null,
            unitPrice: price,
            regularUnitPrice: regular,
          },
        ],
      }),
    );
    router.push("/(main)/marketplace/checkout" as any);
  }, [block, dispatch, gallery, isGuest, product, quantity, router, variant]);

  // ── Render ──────────────────────────────────────────────────────

  // Same header as the catalog (Reference C): brand bar + "‹ Product Details 🛒"
  const header = <CatalogHeader title={t("mpPdTitle")} onBack={goBack} />;

  if (loading && !product) {
    return (
      <View style={styles.container}>
        {header}
        <View
          accessibilityLabel={t("loading")}
          accessibilityState={{ busy: true }}
        >
          <View style={styles.skeletonHero}>
            <ActivityIndicator color={theme.darkGreen} />
          </View>
          <View style={styles.body}>
            <View style={[styles.skeletonLine, { width: "70%", height: heightScale(26) }]} />
            <View style={[styles.skeletonLine, { width: "40%" }]} />
            <View style={[styles.skeletonLine, { width: "30%", height: heightScale(28) }]} />
            <View style={[styles.skeletonLine, { width: "90%" }]} />
            <View style={[styles.skeletonLine, { width: "80%" }]} />
          </View>
        </View>
      </View>
    );
  }

  if (!product) {
    return (
      <View style={styles.container}>
        {header}
        <View style={styles.centered}>
          {notFound ? (
            <MarketplaceEmptyState
              icon="package-variant-closed-remove"
              title={t("productUnavailableTitle")}
              message={t("productNoLongerAvailable")}
              actionLabel={t("back")}
              onAction={goBack}
            />
          ) : (
            <MarketplaceEmptyState
              icon="wifi-off"
              title={t("mpPdLoadError")}
              message={loadError ? t("mpPdLoadErrorMessage") : undefined}
              actionLabel={t("retry")}
              onAction={() => {
                setLoading(true);
                void loadProduct();
              }}
            />
          )}
        </View>
      </View>
    );
  }

  const { price, regular, onSale } = getUnitPrice(product, variant);
  const deliveryLines = describeDelivery(product.delivery, t);
  const benefits = product.benefits ?? [];
  const stock = variant ? variant.inventoryCount : product.inventoryCount;
  const stockOut = variant ? !variant.inStock : product.inStock === false;
  const lowStock =
    !stockOut && product.trackInventory && stock > 0 && stock <= LOW_STOCK;
  const sellerName = product.seller?.name;
  const summary = reviews?.summary;
  const preview = (reviews?.reviews ?? []).slice(0, REVIEW_PREVIEW);
  const canWrite = !!reviews && (reviews.canReview || !!reviews.myReview);
  const actionsOff = !!block;

  return (
    <View style={styles.container}>
      {header}
      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.darkGreen}
            colors={[theme.darkGreen]}
          />
        }
      >
        <ProductGallery
          images={gallery}
          productId={product.id}
          productName={product.name}
          isFavorite={!!product.isFavorite}
          onShare={onShare}
        />

        <View style={styles.body}>
          <View style={styles.info}>
            {product.brand && product.brand !== product.name ? (
              <Text style={styles.brand}>{product.brand}</Text>
            ) : null}
            <Text style={styles.name} accessibilityRole="header">
              {product.name}
            </Text>
            {sellerName ? (
              <TouchableOpacity
                activeOpacity={0.6}
                onPress={openSeller}
                style={styles.sellerLink}
                hitSlop={{ top: 4, bottom: 4 }}
                accessibilityRole="link"
                accessibilityLabel={t("mpPdBySeller", { name: sellerName })}
                accessibilityHint={t("mpPdOpenSellerHint")}
              >
                <Text style={styles.sellerText} numberOfLines={1}>
                  {t("mpPdBySeller", { name: sellerName })}
                </Text>
                <MaterialIcons
                  name="chevron-right"
                  size={moderateWidthScale(20)}
                  color={theme.darkGreen}
                />
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity
              activeOpacity={0.6}
              onPress={openReviews}
              style={styles.ratingLink}
              hitSlop={{ top: 4, bottom: 4 }}
              accessibilityRole="button"
              accessibilityHint={t("mpPdOpenReviewsHint")}
            >
              <ProductRating rating={product.rating} size="md" showNoReviews />
            </TouchableOpacity>
            <ProductPrice
              price={price}
              regular={regular}
              onSale={onSale}
              size="lg"
              style={styles.priceRow}
            />
          </View>

          {hasVariants ? (
            <VariantChips
              variants={product.variants ?? []}
              selectedId={variantId}
              onSelect={(v) => setVariantId(v.id)}
            />
          ) : null}

          {product.description ? (
            <Text style={styles.description}>{product.description}</Text>
          ) : null}

          {benefits.length > 0 ? (
            <View style={styles.benefits}>
              {benefits.map((benefit, i) => (
                <View key={`${i}-${benefit}`} style={styles.benefitRow}>
                  <MaterialIcons
                    name="check-circle"
                    size={moderateWidthScale(22)}
                    color={theme.successGreen}
                  />
                  <Text style={styles.benefitText}>{benefit}</Text>
                </View>
              ))}
            </View>
          ) : null}

          {/* Delivery, stock and the refund rule — all before paying */}
          <FlowCard style={styles.fulfilCard}>
            {deliveryLines.length > 0 ? (
              deliveryLines.map((line, i) => (
                <React.Fragment key={line.label}>
                  {i > 0 ? <View style={styles.fulfilDivider} /> : null}
                  <View style={styles.fulfilRow}>
                    <View style={styles.fulfilIcon}>
                      <MaterialIcons
                        name={line.icon}
                        size={moderateWidthScale(19)}
                        color={theme.selectCard}
                      />
                    </View>
                    <Text style={styles.fulfilText}>{line.label}</Text>
                  </View>
                </React.Fragment>
              ))
            ) : (
              <View style={styles.fulfilRow}>
                <View style={styles.fulfilIcon}>
                  <MaterialIcons
                    name="local-shipping"
                    size={moderateWidthScale(19)}
                    color={theme.selectCard}
                  />
                </View>
                <Text style={styles.fulfilText}>{t("salonNotTakingOrders")}</Text>
              </View>
            )}
            <View style={styles.fulfilDivider} />
            <View
              style={styles.fulfilRow}
              accessible
              accessibilityLiveRegion="polite"
            >
              <View style={styles.fulfilIcon}>
                <MaterialIcons
                  name={
                    stockOut
                      ? "remove-shopping-cart"
                      : lowStock
                        ? "inventory-2"
                        : "check-circle-outline"
                  }
                  size={moderateWidthScale(19)}
                  color={
                    stockOut
                      ? theme.red
                      : lowStock
                        ? theme.selectCard
                        : theme.successGreen
                  }
                />
              </View>
              <Text
                style={[
                  styles.fulfilText,
                  stockOut && { color: theme.red },
                ]}
              >
                {stockOut
                  ? t("mpOutOfStock")
                  : lowStock
                    ? t("shopOnlyLeft", { count: stock })
                    : t("mpPdInStock")}
              </Text>
            </View>
            <View style={styles.fulfilDivider} />
            <View style={styles.fulfilRow}>
              <View style={styles.fulfilIcon}>
                <MaterialCommunityIcons
                  name="cash-refund"
                  size={moderateWidthScale(19)}
                  color={theme.selectCard}
                />
              </View>
              <Text style={styles.fulfilSmall}>{t("mpRefundPolicyNote")}</Text>
            </View>
          </FlowCard>

          {/* Stock and delivery problems already show in the card above */}
          {block && (block.kind === "own" || block.kind === "paymentsOff" || block.kind === "chooseOption") ? (
            <InfoNote tone="warm" icon={block.icon} title={block.title} text={block.message} />
          ) : null}

          {/* Reviews preview */}
          <View>
            <View style={styles.reviewsHead}>
              <Text style={styles.sectionTitle} accessibilityRole="header">
                {t("reviews")}
              </Text>
              {summary && summary.count > 0 ? (
                <TouchableOpacity
                  activeOpacity={0.6}
                  onPress={openReviews}
                  style={styles.seeAll}
                  accessibilityRole="button"
                  accessibilityLabel={t("mpPdSeeAllReviews")}
                >
                  <Text style={styles.seeAllText}>{t("seeAll")}</Text>
                  <MaterialIcons
                    name="chevron-right"
                    size={moderateWidthScale(20)}
                    color={theme.selectCard}
                  />
                </TouchableOpacity>
              ) : null}
            </View>

            <FlowCard style={styles.reviewsCard}>
              {reviews && summary ? (
                <>
                  <ReviewSummary summary={summary} />
                  {preview.map((review) => (
                    <React.Fragment key={review.id}>
                      <View style={[styles.reviewDivider, { marginTop: moderateHeightScale(14) }]} />
                      <ReviewCard review={review} flat />
                    </React.Fragment>
                  ))}
                  {summary.count > preview.length && preview.length > 0 ? (
                    <TouchableOpacity
                      activeOpacity={0.6}
                      onPress={openReviews}
                      style={[styles.seeAll, { justifyContent: "center" }]}
                      accessibilityRole="button"
                    >
                      <Text style={styles.seeAllText}>
                        {t("mpPdSeeAllReviews")}
                      </Text>
                      <MaterialIcons
                        name="chevron-right"
                        size={moderateWidthScale(20)}
                        color={theme.selectCard}
                      />
                    </TouchableOpacity>
                  ) : null}
                </>
              ) : reviewsError ? (
                <View style={styles.reviewsState}>
                  <MaterialIcons
                    name="error-outline"
                    size={moderateWidthScale(20)}
                    color={theme.lightGreen}
                  />
                  <Text style={styles.reviewsStateText}>{t("mpRevLoadError")}</Text>
                  <TouchableOpacity
                    activeOpacity={0.6}
                    onPress={() => void loadReviews()}
                    style={styles.retrySmall}
                    accessibilityRole="button"
                  >
                    <Text style={styles.seeAllText}>{t("retry")}</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.reviewsState}>
                  <ActivityIndicator color={theme.darkGreen} />
                </View>
              )}

              {canWrite ? (
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={openWriteReview}
                  style={styles.writeBtn}
                  accessibilityRole="button"
                >
                  <MaterialIcons
                    name={reviews?.myReview ? "edit" : "rate-review"}
                    size={moderateWidthScale(20)}
                    color={theme.darkGreen}
                  />
                  <Text style={styles.writeBtnText}>
                    {reviews?.myReview ? t("mpRevEditTitle") : t("writeAReview")}
                  </Text>
                </TouchableOpacity>
              ) : null}
            </FlowCard>
          </View>
        </View>
      </ScrollView>

      {/* Bottom bar (Reference C): quantity + Add to Cart, then Buy Now */}
      <View style={[styles.bar, { paddingBottom: flowFooterBottomPad(insets.bottom) }]}>
        {block ? (
          <View style={styles.barHint} accessibilityLiveRegion="polite">
            <MaterialIcons
              name={block.icon}
              size={moderateWidthScale(18)}
              color={theme.selectCard}
            />
            <Text style={styles.barHintText} numberOfLines={2}>
              {block.title}
            </Text>
          </View>
        ) : null}
        <View style={styles.barRow}>
          <QuantityStepper
            value={quantity}
            max={maxQty}
            onChange={setQuantity}
            disabled={actionsOff}
          />
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={onAddToCart}
            disabled={actionsOff || adding}
            style={[styles.addBtn, actionsOff && styles.btnOff]}
            accessibilityRole="button"
            accessibilityLabel={t("addToCart")}
            accessibilityHint={block?.message}
            accessibilityState={{ disabled: actionsOff || adding, busy: adding }}
          >
            {adding ? (
              <ActivityIndicator color={theme.white} />
            ) : (
              <>
                <MaterialCommunityIcons
                  name="cart-plus"
                  size={moderateWidthScale(22)}
                  color={theme.white}
                />
                <Text style={styles.addBtnText} numberOfLines={1}>
                  {t("addToCart")}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          activeOpacity={0.75}
          onPress={onBuyNow}
          disabled={actionsOff || adding}
          style={[styles.buyBtn, actionsOff && styles.btnOff]}
          accessibilityRole="button"
          accessibilityLabel={t("buyNow")}
          accessibilityHint={block?.message}
          accessibilityState={{ disabled: actionsOff || adding }}
        >
          <Text style={styles.buyBtnText}>{t("buyNow")}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
