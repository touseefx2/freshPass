import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useAppDispatch, useAppSelector, useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  moderateHeightScale,
  moderateWidthScale,
  widthScale,
} from "@/src/theme/dimensions";
import AppImage from "@/src/components/AppImage";
import { MaterialIcons } from "@expo/vector-icons";
import StackHeader from "@/src/components/StackHeader";
import Button from "@/src/components/button";
import FloatingInput from "@/src/components/floatingInput";
import { formatShopPrice } from "@/src/constants/demoShopProduct";
import {
  resetShopCheckout,
  setLastOrderId,
  setShippingAddress,
  setShippingMethod,
} from "@/src/state/slices/shopCartSlice";
import {
  canShip,
  getShippingCost,
  type ShopShippingMethod,
} from "@/src/types/shopProduct";
import { useNotificationContext } from "@/src/contexts/NotificationContext";
import {
  useStripeAccount,
  startProductCheckout,
} from "@/src/services/stripeService";
import { useStripe } from "@stripe/stripe-react-native";

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background },
    content: { flex: 1, paddingHorizontal: moderateWidthScale(20) },
    contentContainer: {
      paddingTop: moderateHeightScale(16),
      gap: moderateHeightScale(12),
    },
    actions: {
      marginTop: moderateHeightScale(12),
      gap: moderateHeightScale(10),
    },
    summaryCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(12),
      padding: moderateWidthScale(12),
      borderRadius: moderateWidthScale(14),
      borderWidth: 1,
      borderColor: theme.lightGreen2,
      backgroundColor: theme.white,
    },
    thumb: {
      width: widthScale(56),
      height: widthScale(56),
      borderRadius: moderateWidthScale(10),
      backgroundColor: theme.lightGreen05,
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
    },
    thumbImage: { width: "100%", height: "100%" },
    summaryName: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    summaryMeta: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen5,
      marginTop: moderateHeightScale(2),
    },
    sectionTitle: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      marginBottom: moderateHeightScale(4),
    },
    row2: { flexDirection: "row", gap: moderateWidthScale(10) },
    half: { flex: 1 },
    optionRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: moderateHeightScale(12),
      paddingHorizontal: moderateWidthScale(14),
      borderRadius: moderateWidthScale(12),
      borderWidth: 1,
      borderColor: theme.lightGreen2,
      backgroundColor: theme.white,
      gap: moderateWidthScale(12),
      marginTop: moderateHeightScale(8),
    },
    optionRowSelected: {
      borderColor: theme.buttonBack,
      backgroundColor: theme.lightGreen05,
    },
    radioOuter: {
      width: moderateWidthScale(20),
      height: moderateWidthScale(20),
      borderRadius: moderateWidthScale(10),
      borderWidth: 1.5,
      borderColor: theme.lightGreen2,
      alignItems: "center",
      justifyContent: "center",
    },
    radioOuterSelected: { borderColor: theme.buttonBack },
    radioInner: {
      width: moderateWidthScale(10),
      height: moderateWidthScale(10),
      borderRadius: moderateWidthScale(5),
      backgroundColor: theme.buttonBack,
    },
    optionTitle: {
      flex: 1,
      fontSize: fontSize.size14,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    optionPrice: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    taxNote: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen5,
    },
    reviewCard: {
      borderRadius: moderateWidthScale(14),
      borderWidth: 1,
      borderColor: theme.lightGreen2,
      backgroundColor: theme.white,
      padding: moderateWidthScale(14),
      gap: moderateHeightScale(8),
    },
    reviewRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      gap: moderateWidthScale(12),
    },
    reviewKey: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen5,
    },
    reviewValue: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      flexShrink: 1,
      textAlign: "right",
    },
  });

export default function ShopCheckoutScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { showBanner } = useNotificationContext();
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);
  const insets = useSafeAreaInsets();
  const { initPaymentSheet, presentPaymentSheet } = useStripe();

  const address = useAppSelector((s) => s.shopCart.address);
  const shippingMethod = useAppSelector((s) => s.shopCart.shippingMethod);
  const product = useAppSelector((s) => s.shopCart.product);
  const quantity = useAppSelector((s) => s.shopCart.quantity);

  const [paying, setPaying] = useState(false);

  const delivery = product?.delivery;
  const shippingLabel =
    delivery?.shipping === "free"
      ? t("free")
      : formatShopPrice(delivery?.shippingPrice ?? 0);

  // Only offer what the salon has turned on.
  const methodOptions: {
    key: ShopShippingMethod;
    label: string;
    priceLabel: string;
  }[] = [
    ...(canShip(delivery)
      ? [
          {
            key: "standard" as const,
            label: t("shipToMe"),
            priceLabel: shippingLabel,
          },
        ]
      : []),
    ...(delivery?.pickupAvailable
      ? [
          {
            key: "local_pickup" as const,
            label: t("pickupAtSalon"),
            priceLabel: t("free"),
          },
        ]
      : []),
  ];

  const firstMethod = methodOptions[0]?.key ?? null;
  const methodOffered = methodOptions.some((m) => m.key === shippingMethod);
  useEffect(() => {
    if (!methodOffered && firstMethod) {
      dispatch(setShippingMethod(firstMethod));
    }
  }, [dispatch, firstMethod, methodOffered]);

  if (!product || !delivery?.configured) {
    return (
      <View style={styles.container}>
        <StackHeader title={t("checkout")} />
        <View style={[styles.content, styles.contentContainer]}>
          <Text style={styles.taxNote}>
            {product ? t("salonNotTakingOrders") : t("productNotFound")}
          </Text>
        </View>
      </View>
    );
  }

  const isShipping = shippingMethod === "standard";
  const subtotal = product.sellingPrice * quantity;
  const shipping = getShippingCost(delivery, shippingMethod);
  const totalBeforeTax = Math.round((subtotal + shipping) * 100) / 100;

  const validate = () => {
    if (!shippingMethod) {
      showBanner(t("checkout"), t("selectShippingMethod"), "warning");
      return false;
    }
    if (
      isShipping &&
      (!address.fullName.trim() ||
        !address.street.trim() ||
        !address.city.trim() ||
        !address.state.trim() ||
        !address.zip.trim())
    ) {
      showBanner(t("checkout"), t("fillShippingAddress"), "warning");
      return false;
    }
    return true;
  };

  const placeOrder = async () => {
    Keyboard.dismiss();
    if (paying || !validate()) return;
    setPaying(true);
    try {
      const result = await startProductCheckout({
        items: [{ product_id: Number(product.id), quantity }],
        shipping_method: shippingMethod!,
        ...(isShipping ? { shipping_address: address } : {}),
      });

      await useStripeAccount(result.connectedAccountId);

      const { error: initError } = await initPaymentSheet({
        merchantDisplayName: "FreshPass",
        customerId: result.customerId,
        customerSessionClientSecret: result.customerSessionClientSecret,
        paymentIntentClientSecret: result.paymentIntentClientSecret,
      });

      if (initError) {
        throw new Error(initError.message);
      }

      const { error: presentError } = await presentPaymentSheet();

      await useStripeAccount(null);

      if (presentError) {
        if (presentError.code === "Canceled") {
          return;
        }
        throw new Error(presentError.message);
      }

      const orderId = String(result.orderId);
      dispatch(setLastOrderId(orderId));
      dispatch(resetShopCheckout());
      router.replace({
        pathname: "/(main)/shop/orderConfirmed" as any,
        params: { orderId },
      });
    } catch (err: any) {
      await useStripeAccount(null).catch(() => {});
      const fieldErrors = err?.data?.errors as
        | Record<string, string[]>
        | undefined;
      const first = fieldErrors
        ? Object.values(fieldErrors).flat()[0]
        : undefined;
      showBanner(
        t("checkout"),
        first || err?.message || t("somethingWentWrong"),
        "error",
      );
    } finally {
      setPaying(false);
    }
  };

  return (
    <View style={styles.container}>
      <StackHeader title={t("checkout")} />
      <KeyboardAwareScrollView
        style={styles.content}
        contentContainerStyle={[
          styles.contentContainer,
          { paddingBottom: insets.bottom + moderateHeightScale(32) },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        bottomOffset={moderateHeightScale(32)}
        extraKeyboardSpace={moderateHeightScale(24)}
        onScrollBeginDrag={Keyboard.dismiss}
      >
        <View style={styles.summaryCard}>
          <View style={styles.thumb}>
            {product.imageUri ? (
              <AppImage
                uri={product.imageUri}
                style={styles.thumbImage}
                resizeMode="cover"
              />
            ) : (
              <MaterialIcons
                name="shopping-bag"
                size={moderateWidthScale(24)}
                color={theme.darkGreen}
              />
            )}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.summaryName} numberOfLines={2}>
              {product.name}
            </Text>
            <Text style={styles.summaryMeta}>
              {`${quantity} × ${formatShopPrice(product.sellingPrice)}`}
            </Text>
          </View>
        </View>

        <Text style={[styles.sectionTitle, { marginTop: moderateHeightScale(8) }]}>
          {t("delivery")}
        </Text>
        {methodOptions.map((opt) => {
          const selected = shippingMethod === opt.key;
          return (
            <Pressable
              key={opt.key}
              style={[styles.optionRow, selected && styles.optionRowSelected]}
              onPress={() => dispatch(setShippingMethod(opt.key))}
            >
              <View
                style={[
                  styles.radioOuter,
                  selected && styles.radioOuterSelected,
                ]}
              >
                {selected ? <View style={styles.radioInner} /> : null}
              </View>
              <Text style={styles.optionTitle}>{opt.label}</Text>
              <Text style={styles.optionPrice}>{opt.priceLabel}</Text>
            </Pressable>
          );
        })}

        {isShipping ? (
          <>
            <Text
              style={[styles.sectionTitle, { marginTop: moderateHeightScale(12) }]}
            >
              {t("shippingAddress")}
            </Text>
            <FloatingInput
              label={t("fullName")}
              value={address.fullName}
              onChangeText={(v) => dispatch(setShippingAddress({ fullName: v }))}
              autoCapitalize="words"
              showClearButton
              onClear={() => dispatch(setShippingAddress({ fullName: "" }))}
            />
            <FloatingInput
              label={t("streetAddress")}
              value={address.street}
              onChangeText={(v) => dispatch(setShippingAddress({ street: v }))}
              showClearButton
              onClear={() => dispatch(setShippingAddress({ street: "" }))}
            />
            <View style={styles.row2}>
              <View style={styles.half}>
                <FloatingInput
                  label={t("city")}
                  value={address.city}
                  onChangeText={(v) =>
                    dispatch(setShippingAddress({ city: v }))
                  }
                  autoCapitalize="words"
                />
              </View>
              <View style={styles.half}>
                <FloatingInput
                  label={t("state")}
                  value={address.state}
                  onChangeText={(v) =>
                    dispatch(setShippingAddress({ state: v }))
                  }
                  autoCapitalize="characters"
                />
              </View>
            </View>
            <FloatingInput
              label={t("zipCode")}
              value={address.zip}
              onChangeText={(v) => dispatch(setShippingAddress({ zip: v }))}
              keyboardType="number-pad"
            />
          </>
        ) : null}

        <View style={[styles.reviewCard, { marginTop: moderateHeightScale(12) }]}>
          <View style={styles.reviewRow}>
            <Text style={styles.reviewKey}>{t("subtotal")}</Text>
            <Text style={styles.reviewValue}>{formatShopPrice(subtotal)}</Text>
          </View>
          <View style={styles.reviewRow}>
            <Text style={styles.reviewKey}>{t("shipping")}</Text>
            <Text style={styles.reviewValue}>
              {shipping > 0 ? formatShopPrice(shipping) : t("free")}
            </Text>
          </View>
          <View style={styles.reviewRow}>
            <Text style={styles.reviewKey}>{t("total")}</Text>
            <Text style={styles.reviewValue}>
              {formatShopPrice(totalBeforeTax)}
            </Text>
          </View>
          <Text style={styles.taxNote}>{t("taxAddedAtPayment")}</Text>
        </View>

        <View style={styles.actions}>
          {paying ? (
            <ActivityIndicator size="small" color={theme.darkGreen} />
          ) : (
            <Button title={t("continueToPayment")} onPress={placeOrder} />
          )}
        </View>
      </KeyboardAwareScrollView>
    </View>
  );
}
