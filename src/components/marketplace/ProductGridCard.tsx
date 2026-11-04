import React, { memo, useMemo } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import AppImage from "@/src/components/AppImage";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  moderateHeightScale,
  moderateWidthScale,
  widthScale,
} from "@/src/theme/dimensions";
import type { ShopProduct } from "@/src/types/shopProduct";
import { getUnitPrice } from "@/src/utils/shopProductHelpers";
import FavoriteHeartButton from "./FavoriteHeartButton";
import ProductPrice from "./ProductPrice";
import ProductRating from "./ProductRating";

type Props = {
  product: ShopProduct;
  /** Card width (two-column grid: (screen − gutters − gap) / 2). */
  width: number;
  onPress: () => void;
  /** Hidden when not given or when the product is out of stock. */
  onAddToCart?: () => void;
  /** Add-to-cart request running for this card. */
  adding?: boolean;
};

const CART_BUTTON = widthScale(42);
const RATING_ROW = moderateHeightScale(18);

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    card: {
      backgroundColor: theme.white,
      borderRadius: moderateWidthScale(16),
      shadowColor: theme.darkGreen,
      shadowOffset: { width: 0, height: moderateHeightScale(3) },
      shadowOpacity: 0.09,
      shadowRadius: moderateWidthScale(8),
      elevation: 3,
    },
    inner: {
      borderRadius: moderateWidthScale(16),
      overflow: "hidden",
    },
    imageWrap: {
      backgroundColor: theme.surfaceRaised,
    },
    image: {
      width: "100%",
      height: "100%",
    },
    // Sample's bare outline heart, on a soft disc so it shows on dark photos
    heart: {
      position: "absolute",
      top: moderateWidthScale(8),
      right: moderateWidthScale(8),
      backgroundColor: "rgba(255, 255, 255, 0.8)",
      shadowOpacity: 0,
      elevation: 0,
    },
    salePill: {
      position: "absolute",
      top: moderateWidthScale(10),
      left: moderateWidthScale(10),
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(3),
      paddingHorizontal: moderateWidthScale(8),
      paddingVertical: moderateHeightScale(3),
      borderRadius: moderateWidthScale(10),
      backgroundColor: theme.selectCard,
    },
    salePillText: {
      color: theme.white,
      fontSize: fontSize.size12,
      fontFamily: fonts.fontBold,
    },
    outOfStockShade: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: theme.white50,
      alignItems: "center",
      justifyContent: "center",
    },
    outOfStockPill: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(4),
      paddingHorizontal: moderateWidthScale(10),
      paddingVertical: moderateHeightScale(5),
      borderRadius: moderateWidthScale(12),
      backgroundColor: theme.darkGreen,
    },
    outOfStockText: {
      color: theme.white,
      fontSize: fontSize.size12,
      fontFamily: fonts.fontBold,
    },
    body: {
      paddingHorizontal: moderateWidthScale(12),
      paddingTop: moderateHeightScale(10),
      paddingBottom: moderateHeightScale(12),
      gap: moderateHeightScale(2),
    },
    name: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    ratingSlot: {
      minHeight: RATING_ROW,
      justifyContent: "center",
    },
    bottomRow: {
      flexDirection: "row",
      alignItems: "flex-end",
      justifyContent: "space-between",
      gap: moderateWidthScale(6),
    },
    priceCol: {
      flex: 1,
      gap: moderateHeightScale(3),
    },
    cartButton: {
      position: "absolute",
      right: moderateWidthScale(12),
      bottom: moderateHeightScale(12),
      width: CART_BUTTON,
      height: CART_BUTTON,
      borderRadius: CART_BUTTON / 2,
      backgroundColor: theme.marketGreen,
      alignItems: "center",
      justifyContent: "center",
    },
    cartSpacer: {
      width: CART_BUTTON,
      height: CART_BUTTON,
    },
    cartButtonBusy: {
      opacity: 0.6,
    },
  });

/** Two-column Marketplace product card (catalog, saved products). */
function ProductGridCard({ product, width, onPress, onAddToCart, adding }: Props) {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();

  const { price, regular, onSale } = getUnitPrice(product);
  const outOfStock = product.inStock === false;
  const imageUrl = product.images?.[0]?.url ?? product.imageUri;
  const imageHeight = Math.round(width * 0.64);
  const showAdd = !!onAddToCart && !outOfStock;

  return (
    <View style={[styles.card, { width }]}>
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={onPress}
        style={styles.inner}
        accessibilityRole="button"
        accessibilityLabel={product.name}
        accessibilityHint={outOfStock ? t("mpOutOfStock") : undefined}
      >
        <View style={[styles.imageWrap, { height: imageHeight }]}>
          <AppImage
            uri={imageUrl}
            style={styles.image}
            contentFit="cover"
            recyclingKey={`mp-card-${product.id}`}
          />
          {onSale && !outOfStock ? (
            <View style={styles.salePill} pointerEvents="none">
              <MaterialCommunityIcons
                name="tag-outline"
                size={moderateWidthScale(12)}
                color={theme.white}
              />
              <Text style={styles.salePillText}>{t("mpSale")}</Text>
            </View>
          ) : null}
          {outOfStock ? (
            <View style={styles.outOfStockShade} pointerEvents="none">
              <View style={styles.outOfStockPill}>
                <MaterialCommunityIcons
                  name="package-variant-closed-remove"
                  size={moderateWidthScale(14)}
                  color={theme.white}
                />
                <Text style={styles.outOfStockText}>{t("mpOutOfStock")}</Text>
              </View>
            </View>
          ) : null}
        </View>

        <View style={styles.body}>
          <Text style={styles.name} numberOfLines={1}>
            {product.name}
          </Text>
          <View style={styles.bottomRow}>
            <View style={styles.priceCol}>
              <ProductPrice
                price={price}
                regular={regular}
                onSale={onSale}
                size="sm"
              />
              {/* Same card height with or without reviews */}
              <View style={styles.ratingSlot}>
                <ProductRating rating={product.rating} size="sm" />
              </View>
            </View>
            {/* Keeps the row height when the button is hidden */}
            {showAdd ? (
              <View style={styles.cartSpacer} />
            ) : null}
          </View>
        </View>
      </TouchableOpacity>

      <FavoriteHeartButton
        productId={product.id}
        isFavorite={!!product.isFavorite}
        variant="overlay"
        style={styles.heart}
      />

      {showAdd ? (
        <TouchableOpacity
          activeOpacity={0.75}
          onPress={onAddToCart}
          disabled={adding}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          style={[styles.cartButton, adding && styles.cartButtonBusy]}
          accessibilityRole="button"
          accessibilityLabel={t("mpAddToCartA11y", { name: product.name })}
          accessibilityState={{ disabled: !!adding, busy: !!adding }}
        >
          {adding ? (
            <ActivityIndicator size="small" color={theme.white} />
          ) : (
            <MaterialCommunityIcons
              name="cart-plus"
              size={moderateWidthScale(20)}
              color={theme.white}
            />
          )}
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

export default memo(ProductGridCard);
