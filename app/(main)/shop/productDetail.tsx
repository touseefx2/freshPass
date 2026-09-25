import React, { useMemo, useState } from "react";
import {
  Image,
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
import StackHeader from "@/src/components/StackHeader";
import Button from "@/src/components/button";
import { formatShopPrice } from "@/src/constants/demoShopProduct";
import { addToCart, seedBuyNow } from "@/src/state/slices/shopCartSlice";
import { resolveShopProduct } from "@/src/utils/shopProductHelpers";
import { useNotificationContext } from "@/src/contexts/NotificationContext";

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
    wishBtn: {
      position: "absolute",
      top: moderateHeightScale(12),
      right: moderateWidthScale(16),
      width: moderateWidthScale(40),
      height: moderateWidthScale(40),
      borderRadius: moderateWidthScale(20),
      backgroundColor: theme.white,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: theme.lightGreen2,
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
    ratingRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(4),
      marginTop: moderateHeightScale(4),
    },
    ratingText: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontMedium,
      color: theme.selectCard,
      marginLeft: moderateWidthScale(4),
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
  const { showBanner } = useNotificationContext();
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);
  const insets = useSafeAreaInsets();
  const { productId } = useLocalSearchParams<{ productId?: string }>();
  const inventory = useAppSelector((s) => s.inventory.products);
  const product = resolveShopProduct(productId, inventory);
  const [liked, setLiked] = useState(false);

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

  const goAvailability = () => {
    router.push({
      pathname: "/(main)/shop/checkAvailability" as any,
      params: { productId: product.id },
    });
  };

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
            <Image
              source={{ uri: product.imageUri }}
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
          <TouchableOpacity
            style={styles.wishBtn}
            onPress={() => setLiked((v) => !v)}
            activeOpacity={0.85}
          >
            <MaterialIcons
              name={liked ? "favorite" : "favorite-border"}
              size={moderateWidthScale(22)}
              color={liked ? theme.red : theme.darkGreen}
            />
          </TouchableOpacity>
        </View>

        <View style={styles.body}>
          <Text style={styles.brand}>{product.brand}</Text>
          <Text style={styles.name}>{product.name}</Text>
          <Text style={styles.price}>
            {formatShopPrice(product.sellingPrice)}
          </Text>
          <View style={styles.ratingRow}>
            {[1, 2, 3, 4, 5].map((i) => (
              <MaterialIcons
                key={i}
                name={i <= 4 ? "star" : "star-half"}
                size={moderateWidthScale(16)}
                color={theme.selectCard}
              />
            ))}
            <Text style={styles.ratingText}>
              {t("reviewsCount", { rating: "4.8", count: 124 })}
            </Text>
          </View>
          {!!product.description && (
            <Text style={styles.description}>{product.description}</Text>
          )}

          <View style={styles.bullet}>
            <MaterialIcons
              name="local-shipping"
              size={moderateWidthScale(18)}
              color={theme.buttonBack}
            />
            <Text style={styles.bulletText}>{t("shipsToYourLocation")}</Text>
          </View>
          <View style={styles.bullet}>
            <MaterialIcons
              name="card-giftcard"
              size={moderateWidthScale(18)}
              color={theme.buttonBack}
            />
            <Text style={styles.bulletText}>
              {t("freeShippingOver", {
                amount: formatShopPrice(product.freeShippingOver),
              })}
            </Text>
          </View>
          {product.pickupAvailable ? (
            <View style={styles.bullet}>
              <MaterialIcons
                name="storefront"
                size={moderateWidthScale(18)}
                color={theme.buttonBack}
              />
              <Text style={styles.bulletText}>{t("localPickupAvailable")}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.actions}>
          <Button
            title={t("addToCart")}
            onPress={() => {
              dispatch(addToCart({ productId: product.id, quantity: 1 }));
              showBanner(t("addToCart"), t("addedToCart"), "success");
              goAvailability();
            }}
            backgroundColor={theme.white}
            textColor={theme.darkGreen}
            containerStyle={{
              borderWidth: 1,
              borderColor: theme.buttonBack,
            }}
          />
          <Button
            title={t("buyNow")}
            onPress={() => {
              dispatch(seedBuyNow({ productId: product.id, quantity: 1 }));
              goAvailability();
            }}
          />
        </View>
      </ScrollView>
    </View>
  );
}
