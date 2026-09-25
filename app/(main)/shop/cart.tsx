import React, { useMemo } from "react";
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppDispatch, useAppSelector, useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  moderateHeightScale,
  moderateWidthScale,
  widthScale,
} from "@/src/theme/dimensions";
import StackHeader from "@/src/components/StackHeader";
import Button from "@/src/components/button";
import { formatShopPrice } from "@/src/constants/demoShopProduct";
import {
  computeOrderTotals,
  setCartItemQuantity,
} from "@/src/state/slices/shopCartSlice";
import { resolveShopProduct } from "@/src/utils/shopProductHelpers";

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background },
    content: { flex: 1, paddingHorizontal: moderateWidthScale(20) },
    contentContainer: {
      paddingVertical: moderateHeightScale(16),
      gap: moderateHeightScale(14),
    },
    actions: {
      marginTop: moderateHeightScale(4),
      gap: moderateHeightScale(10),
    },
    empty: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      gap: moderateHeightScale(8),
      padding: moderateWidthScale(24),
    },
    emptyText: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontMedium,
      color: theme.lightGreen5,
      textAlign: "center",
    },
    card: {
      flexDirection: "row",
      gap: moderateWidthScale(12),
      padding: moderateWidthScale(12),
      borderRadius: moderateWidthScale(14),
      borderWidth: 1,
      borderColor: theme.lightGreen2,
      backgroundColor: theme.white,
    },
    thumb: {
      width: widthScale(72),
      height: widthScale(72),
      borderRadius: moderateWidthScale(10),
      backgroundColor: theme.lightGreen05,
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
    },
    thumbImage: { width: "100%", height: "100%" },
    body: { flex: 1, gap: moderateHeightScale(4), minWidth: 0 },
    name: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    brand: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen5,
    },
    price: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    qtyRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(10),
      marginTop: moderateHeightScale(4),
    },
    qtyBtn: {
      width: moderateWidthScale(32),
      height: moderateWidthScale(32),
      borderRadius: moderateWidthScale(8),
      backgroundColor: theme.lightGreen05,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: theme.lightGreen2,
    },
    qtyText: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      minWidth: moderateWidthScale(20),
      textAlign: "center",
    },
    totalsCard: {
      borderRadius: moderateWidthScale(14),
      borderWidth: 1,
      borderColor: theme.lightGreen2,
      backgroundColor: theme.white,
      padding: moderateWidthScale(14),
      gap: moderateHeightScale(8),
    },
    totalRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    totalLabel: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen5,
    },
    totalValue: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    grandLabel: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    grandValue: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
  });

export default function ShopCartScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);
  const insets = useSafeAreaInsets();

  const items = useAppSelector((s) => s.shopCart.items);
  const shippingMethod = useAppSelector((s) => s.shopCart.shippingMethod);
  const inventory = useAppSelector((s) => s.inventory.products);

  const lines = useMemo(() => {
    return items
      .map((item) => {
        const product = resolveShopProduct(item.productId, inventory);
        if (!product) return null;
        return { item, product };
      })
      .filter(Boolean) as {
      item: (typeof items)[0];
      product: NonNullable<ReturnType<typeof resolveShopProduct>>;
    }[];
  }, [items, inventory]);

  const subtotal = lines.reduce(
    (sum, l) => sum + l.product.sellingPrice * l.item.quantity,
    0,
  );
  const shippingProduct = lines[0]?.product;
  const totals = computeOrderTotals(
    subtotal,
    shippingMethod,
    shippingProduct?.shippingPrice,
    shippingProduct?.freeShippingOver,
  );

  return (
    <View style={styles.container}>
      <StackHeader title={t("yourCart")} />
      {lines.length === 0 ? (
        <View style={styles.empty}>
          <MaterialIcons
            name="shopping-cart"
            size={moderateWidthScale(40)}
            color={theme.lightGreen5}
          />
          <Text style={styles.emptyText}>{t("cartEmpty")}</Text>
        </View>
      ) : (
        <>
          <ScrollView
            style={styles.content}
            contentContainerStyle={[
              styles.contentContainer,
              { paddingBottom: insets.bottom + moderateHeightScale(24) },
            ]}
            showsVerticalScrollIndicator={false}
          >
            {lines.map(({ item, product }) => (
              <View key={product.id} style={styles.card}>
                <View style={styles.thumb}>
                  {product.imageUri ? (
                    <Image
                      source={{ uri: product.imageUri }}
                      style={styles.thumbImage}
                      resizeMode="cover"
                    />
                  ) : (
                    <MaterialIcons
                      name="shopping-bag"
                      size={moderateWidthScale(28)}
                      color={theme.darkGreen}
                    />
                  )}
                </View>
                <View style={styles.body}>
                  <Text style={styles.name} numberOfLines={2}>
                    {product.name}
                  </Text>
                  <Text style={styles.brand}>{product.brand}</Text>
                  <Text style={styles.price}>
                    {formatShopPrice(product.sellingPrice)}
                  </Text>
                  <View style={styles.qtyRow}>
                    <Text style={styles.brand}>{t("quantity")}</Text>
                    <TouchableOpacity
                      style={styles.qtyBtn}
                      onPress={() =>
                        dispatch(
                          setCartItemQuantity({
                            productId: product.id,
                            quantity: item.quantity - 1,
                          }),
                        )
                      }
                    >
                      <MaterialIcons
                        name="remove"
                        size={moderateWidthScale(16)}
                        color={theme.darkGreen}
                      />
                    </TouchableOpacity>
                    <Text style={styles.qtyText}>{item.quantity}</Text>
                    <TouchableOpacity
                      style={styles.qtyBtn}
                      onPress={() =>
                        dispatch(
                          setCartItemQuantity({
                            productId: product.id,
                            quantity: item.quantity + 1,
                          }),
                        )
                      }
                    >
                      <MaterialIcons
                        name="add"
                        size={moderateWidthScale(16)}
                        color={theme.darkGreen}
                      />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))}

            <View style={styles.totalsCard}>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>{t("subtotal")}</Text>
                <Text style={styles.totalValue}>
                  {formatShopPrice(totals.subtotal)}
                </Text>
              </View>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>{t("shipping")}</Text>
                <Text style={styles.totalValue}>
                  {formatShopPrice(totals.shipping)}
                </Text>
              </View>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>{t("tax")}</Text>
                <Text style={styles.totalValue}>
                  {formatShopPrice(totals.tax)}
                </Text>
              </View>
              <View style={styles.totalRow}>
                <Text style={styles.grandLabel}>{t("total")}</Text>
                <Text style={styles.grandValue}>
                  {formatShopPrice(totals.total)}
                </Text>
              </View>
            </View>

            <View style={styles.actions}>
              <Button
                title={t("proceedToCheckout")}
                onPress={() =>
                  router.push("/(main)/shop/checkout" as any)
                }
              />
            </View>
          </ScrollView>
        </>
      )}
    </View>
  );
}
