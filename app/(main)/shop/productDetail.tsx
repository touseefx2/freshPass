import React, { useMemo } from "react";
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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppDispatch, useAppSelector, useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  heightScale,
  moderateHeightScale,
  moderateWidthScale,
} from "@/src/theme/dimensions";
import AppImage from "@/src/components/AppImage";
import StackHeader from "@/src/components/StackHeader";
import Button from "@/src/components/button";
import { formatShopPrice } from "@/src/constants/demoShopProduct";
import {
  setShippingMethod,
  setShopQuantity,
} from "@/src/state/slices/shopCartSlice";
import { describeDelivery } from "@/src/utils/shopProductHelpers";

const MAX_QTY_PER_ITEM = 10;

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
      paddingBottom: moderateHeightScale(24),
    },
    actions: {
      marginTop: moderateHeightScale(20),
      paddingHorizontal: moderateWidthScale(20),
      gap: moderateHeightScale(10),
    },
    hero: {
      width: "100%",
      height: heightScale(280),
      backgroundColor: theme.lightGreen05,
      alignItems: "center",
      justifyContent: "center",
    },
    heroImage: {
      width: "100%",
      height: "100%",
    },
    body: {
      paddingHorizontal: moderateWidthScale(20),
      paddingTop: moderateHeightScale(16),
      gap: moderateHeightScale(8),
    },
    brand: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontMedium,
      color: theme.lightGreen5,
    },
    name: {
      fontSize: fontSize.size24,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    price: {
      fontSize: fontSize.size22,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      marginTop: moderateHeightScale(4),
    },
    description: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen5,
      lineHeight: fontSize.size20,
      marginTop: moderateHeightScale(8),
    },
    bullet: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(8),
      marginTop: moderateHeightScale(6),
    },
    bulletText: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: theme.darkGreen,
      flex: 1,
    },
    qtyRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(12),
      marginTop: moderateHeightScale(16),
    },
    qtyLabel: {
      flex: 1,
      fontSize: fontSize.size14,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    qtyBtn: {
      width: moderateWidthScale(34),
      height: moderateWidthScale(34),
      borderRadius: moderateWidthScale(8),
      backgroundColor: theme.white,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: theme.lightGreen2,
    },
    qtyBtnDisabled: { opacity: 0.4 },
    qtyText: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      minWidth: moderateWidthScale(24),
      textAlign: "center",
    },
    notice: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontMedium,
      color: theme.selectCard,
      textAlign: "center",
    },
    empty: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      padding: moderateWidthScale(24),
    },
    emptyText: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen5,
      textAlign: "center",
    },
  });

export default function ProductDetailScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);
  const insets = useSafeAreaInsets();
  const { productId } = useLocalSearchParams<{ productId?: string }>();
  const shopProduct = useAppSelector((s) => s.shopCart.product);
  const quantity = useAppSelector((s) => s.shopCart.quantity);
  const product = shopProduct && shopProduct.id === productId ? shopProduct : null;

  if (!product) {
    return (
      <View style={styles.container}>
        <StackHeader title={t("shopProductDetails")} />
        <View style={styles.empty}>
          <Text style={styles.emptyText}>{t("productNotFound")}</Text>
        </View>
      </View>
    );
  }

  const outOfStock = product.trackInventory && product.inventoryCount <= 0;
  const takingOrders = !!product.delivery?.configured;
  const maxQty = product.trackInventory
    ? Math.min(product.inventoryCount, MAX_QTY_PER_ITEM)
    : MAX_QTY_PER_ITEM;
  const deliveryLines = describeDelivery(product.delivery, t);

  return (
    <View style={styles.container}>
      <StackHeader title={t("shopProductDetails")} />
      <ScrollView
        style={styles.content}
        contentContainerStyle={[
          styles.contentContainer,
          { paddingBottom: insets.bottom + moderateHeightScale(24) },
        ]}
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
            <MaterialIcons
              name="shopping-bag"
              size={moderateWidthScale(72)}
              color={theme.darkGreen}
            />
          )}
        </View>

        <View style={styles.body}>
          <Text style={styles.brand}>{product.brand}</Text>
          <Text style={styles.name}>{product.name}</Text>
          <Text style={styles.price}>
            {formatShopPrice(product.sellingPrice)}
          </Text>
          {!!product.description && (
            <Text style={styles.description}>{product.description}</Text>
          )}

          {deliveryLines.map((line) => (
            <View key={line.label} style={styles.bullet}>
              <MaterialIcons
                name={line.icon}
                size={moderateWidthScale(18)}
                color={theme.buttonBack}
              />
              <Text style={styles.bulletText}>{line.label}</Text>
            </View>
          ))}

          {takingOrders && !outOfStock ? (
            <View style={styles.qtyRow}>
              <Text style={styles.qtyLabel}>{t("quantity")}</Text>
              <TouchableOpacity
                style={[styles.qtyBtn, quantity <= 1 && styles.qtyBtnDisabled]}
                disabled={quantity <= 1}
                onPress={() => dispatch(setShopQuantity(quantity - 1))}
              >
                <MaterialIcons
                  name="remove"
                  size={moderateWidthScale(18)}
                  color={theme.darkGreen}
                />
              </TouchableOpacity>
              <Text style={styles.qtyText}>{quantity}</Text>
              <TouchableOpacity
                style={[
                  styles.qtyBtn,
                  quantity >= maxQty && styles.qtyBtnDisabled,
                ]}
                disabled={quantity >= maxQty}
                onPress={() => dispatch(setShopQuantity(quantity + 1))}
              >
                <MaterialIcons
                  name="add"
                  size={moderateWidthScale(18)}
                  color={theme.darkGreen}
                />
              </TouchableOpacity>
            </View>
          ) : null}
        </View>

        <View style={styles.actions}>
          {!takingOrders ? (
            <Text style={styles.notice}>{t("salonNotTakingOrders")}</Text>
          ) : null}
          <Button
            title={outOfStock ? t("outOfStock") : t("buyNow")}
            disabled={outOfStock || !takingOrders}
            onPress={() => {
              dispatch(setShippingMethod(null));
              router.push("/(main)/shop/checkout" as any);
            }}
          />
        </View>
      </ScrollView>
    </View>
  );
}
