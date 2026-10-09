import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  BackHandler,
  Keyboard,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useNavigation, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
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
import FloatingInput from "@/src/components/floatingInput";
import FlowHeader from "@/src/components/reelFlow/flowHeader";
import FlowFooter from "@/src/components/reelFlow/flowFooter";
import {
  FlowCard,
  FlowTitle,
  InfoNote,
  SectionLabel,
} from "@/src/components/reelFlow/flowParts";
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

/** Shop flow: 1 product (productDetail) → 2 delivery → 3 review & pay. */
const SHOP_STEP_TOTAL = 3;
type Step = "delivery" | "review";

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background },
    content: { flex: 1 },
    contentContainer: {
      paddingHorizontal: moderateWidthScale(20),
      paddingTop: moderateHeightScale(8),
      paddingBottom: moderateHeightScale(24),
      gap: moderateHeightScale(14),
    },
    // ── Delivery options
    option: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(14),
      minHeight: heightScale(76),
      paddingHorizontal: moderateWidthScale(16),
      paddingVertical: moderateHeightScale(12),
      borderRadius: moderateWidthScale(18),
      borderWidth: 1.5,
      borderColor: theme.borderNormal,
      backgroundColor: theme.white,
    },
    optionSelected: {
      borderColor: theme.buttonBack,
      backgroundColor: theme.lightGreen05,
    },
    optionIcon: {
      width: widthScale(46),
      height: widthScale(46),
      borderRadius: widthScale(14),
      backgroundColor: theme.orangeBrown01,
      alignItems: "center",
      justifyContent: "center",
    },
    optionIconSelected: {
      backgroundColor: theme.buttonBack,
    },
    optionText: { flex: 1, minWidth: 0, gap: moderateHeightScale(2) },
    optionTitle: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    optionSub: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
    },
    optionPrice: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    radio: {
      width: widthScale(24),
      height: widthScale(24),
      borderRadius: widthScale(12),
      borderWidth: 2,
      borderColor: theme.borderMedium,
      alignItems: "center",
      justifyContent: "center",
    },
    radioSelected: {
      borderColor: theme.buttonBack,
      backgroundColor: theme.buttonBack,
    },
    row2: { flexDirection: "row", gap: moderateWidthScale(10) },
    half: { flex: 1 },
    fields: { gap: moderateHeightScale(12) },
    // ── Review cards
    card: {
      padding: moderateWidthScale(16),
      gap: moderateHeightScale(12),
    },
    cardHead: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    cardTitle: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontBold,
      color: theme.lightGreen,
      letterSpacing: 0.8,
      textTransform: "uppercase",
    },
    editBtn: {
      minHeight: heightScale(36),
      paddingHorizontal: moderateWidthScale(12),
      borderRadius: heightScale(18),
      backgroundColor: theme.lightGreen07,
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(4),
    },
    editText: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    itemRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(14),
    },
    thumb: {
      width: widthScale(64),
      height: widthScale(64),
      borderRadius: moderateWidthScale(14),
      backgroundColor: theme.orangeBrown01,
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
    },
    thumbImage: { width: "100%", height: "100%" },
    itemText: { flex: 1, minWidth: 0, gap: moderateHeightScale(3) },
    itemName: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    itemMeta: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      fontVariant: ["tabular-nums"],
    },
    itemPrice: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      fontVariant: ["tabular-nums"],
    },
    deliveryRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: moderateWidthScale(12),
    },
    deliveryIcon: {
      width: widthScale(40),
      height: widthScale(40),
      borderRadius: widthScale(20),
      backgroundColor: theme.orangeBrown01,
      alignItems: "center",
      justifyContent: "center",
    },
    deliveryMain: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    deliveryAddress: {
      marginTop: moderateHeightScale(2),
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      lineHeight: fontSize.size20,
    },
    priceRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      gap: moderateWidthScale(12),
    },
    priceKey: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
    },
    priceValue: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      fontVariant: ["tabular-nums"],
    },
    totalRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "baseline",
      paddingTop: moderateHeightScale(12),
      borderTopWidth: 1,
      borderTopColor: theme.borderLight,
    },
    totalKey: {
      fontSize: fontSize.size17,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    totalValue: {
      fontSize: fontSize.size22,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      fontVariant: ["tabular-nums"],
    },
    emptyText: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
    },
  });

export default function ShopCheckoutScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { showBanner } = useNotificationContext();
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const navigation = useNavigation();

  const address = useAppSelector((s) => s.shopCart.address);
  const shippingMethod = useAppSelector((s) => s.shopCart.shippingMethod);
  const product = useAppSelector((s) => s.shopCart.product);
  const quantity = useAppSelector((s) => s.shopCart.quantity);

  const [step, setStep] = useState<Step>("delivery");
  const [paying, setPaying] = useState(false);

  const delivery = product?.delivery;
  const shippingLabel =
    delivery?.shipping === "free"
      ? t("free")
      : formatShopPrice(delivery?.shippingPrice ?? 0);

  // Only offer what the salon has turned on.
  const methodOptions: {
    key: ShopShippingMethod;
    icon: "local-shipping" | "storefront";
    label: string;
    sub: string;
    priceLabel: string;
  }[] = [
    ...(canShip(delivery)
      ? [
          {
            key: "standard" as const,
            icon: "local-shipping" as const,
            label: t("shipToMe"),
            sub: t("shopShipSub"),
            priceLabel: shippingLabel,
          },
        ]
      : []),
    ...(delivery?.pickupAvailable
      ? [
          {
            key: "local_pickup" as const,
            icon: "storefront" as const,
            label: t("pickupAtSalon"),
            sub: t("shopPickupSub"),
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

  /** Review → Delivery; Delivery → back to the product. */
  const goBack = useCallback(() => {
    if (paying) return;
    Keyboard.dismiss();
    if (step === "review") setStep("delivery");
    else router.back();
  }, [paying, router, step]);

  // Android back follows the steps too
  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (step === "review" || paying) {
        goBack();
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [goBack, paying, step]);

  const stepNumber = step === "delivery" ? 2 : 3;
  const header = (
    <FlowHeader
      title={t("shopFlowTitle")}
      step={product ? { current: stepNumber, total: SHOP_STEP_TOTAL } : null}
      onBack={goBack}
      backDisabled={paying}
    />
  );

  if (!product || !delivery?.configured) {
    return (
      <View style={styles.container}>
        {header}
        <View style={styles.contentContainer}>
          <InfoNote
            tone="warm"
            icon="storefront"
            text={product ? t("salonNotTakingOrders") : t("productNotFound")}
          />
        </View>
      </View>
    );
  }

  const isShipping = shippingMethod === "standard";
  const subtotal = product.sellingPrice * quantity;
  const shipping = getShippingCost(delivery, shippingMethod);
  const totalBeforeTax = Math.round((subtotal + shipping) * 100) / 100;
  const selectedMethod = methodOptions.find((m) => m.key === shippingMethod);
  const addressText = [
    address.fullName.trim(),
    address.street.trim(),
    [address.city.trim(), address.state.trim(), address.zip.trim()]
      .filter(Boolean)
      .join(", "),
  ]
    .filter(Boolean)
    .join("\n");

  const validateDelivery = () => {
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

  const goToReview = () => {
    Keyboard.dismiss();
    if (validateDelivery()) setStep("review");
  };

  const placeOrder = async () => {
    Keyboard.dismiss();
    if (paying || !validateDelivery()) return;
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
      // 422 on items.N.product_id: the owner deleted or hid the product after the
      // feed loaded. Retrying can't work, so close the whole shop flow.
      if (
        fieldErrors &&
        Object.keys(fieldErrors).some((k) => /^items\.\d+\.product_id$/.test(k))
      ) {
        Alert.alert(t("productUnavailableTitle"), t("productUnavailableMessage"), [
          {
            text: t("ok"),
            onPress: () => {
              const parent = navigation.getParent();
              if (parent?.canGoBack()) parent.goBack();
              else router.back();
              dispatch(resetShopCheckout());
            },
          },
        ]);
        return;
      }
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

  const renderDeliveryStep = () => (
    <>
      <KeyboardAwareScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        bottomOffset={moderateHeightScale(32)}
        extraKeyboardSpace={moderateHeightScale(24)}
        onScrollBeginDrag={Keyboard.dismiss}
      >
        <FlowTitle
          title={t("shopDeliveryTitle")}
          subtitle={t("shopDeliverySubtitle")}
        />

        {methodOptions.map((opt) => {
          const selected = shippingMethod === opt.key;
          return (
            <TouchableOpacity
              key={opt.key}
              activeOpacity={0.85}
              style={[styles.option, selected && styles.optionSelected]}
              onPress={() => dispatch(setShippingMethod(opt.key))}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={`${opt.label}, ${opt.priceLabel}`}
            >
              <View
                style={[styles.optionIcon, selected && styles.optionIconSelected]}
              >
                <MaterialIcons
                  name={opt.icon}
                  size={moderateWidthScale(24)}
                  color={selected ? theme.white : theme.selectCard}
                />
              </View>
              <View style={styles.optionText}>
                <Text style={styles.optionTitle}>{opt.label}</Text>
                <Text style={styles.optionSub} numberOfLines={2}>
                  {opt.sub}
                </Text>
              </View>
              <Text style={styles.optionPrice}>{opt.priceLabel}</Text>
              <View style={[styles.radio, selected && styles.radioSelected]}>
                {selected ? (
                  <MaterialIcons
                    name="check"
                    size={moderateWidthScale(16)}
                    color={theme.white}
                  />
                ) : null}
              </View>
            </TouchableOpacity>
          );
        })}

        {isShipping ? (
          <>
            <SectionLabel
              label={t("shippingAddress")}
              style={{ marginTop: moderateHeightScale(8) }}
            />
            <View style={styles.fields}>
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
                    onChangeText={(v) => dispatch(setShippingAddress({ city: v }))}
                    autoCapitalize="words"
                  />
                </View>
                <View style={styles.half}>
                  <FloatingInput
                    label={t("state")}
                    value={address.state}
                    onChangeText={(v) => dispatch(setShippingAddress({ state: v }))}
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
            </View>
          </>
        ) : null}
      </KeyboardAwareScrollView>
      <FlowFooter
        primary={{
          label: t("shopNextReview"),
          onPress: goToReview,
          trailingIcon: "chevron-right",
        }}
      />
    </>
  );

  const renderReviewStep = () => (
    <>
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <FlowTitle
          title={t("shopReviewTitle")}
          subtitle={t("shopReviewSubtitle")}
        />

        {/* Item */}
        <FlowCard style={styles.card}>
          <View style={styles.cardHead}>
            <Text style={styles.cardTitle}>{t("shopYourItem")}</Text>
            <TouchableOpacity
              style={styles.editBtn}
              onPress={() => router.back()}
              disabled={paying}
              accessibilityRole="button"
              accessibilityLabel={`${t("edit")} ${t("shopYourItem")}`}
            >
              <MaterialIcons
                name="edit"
                size={moderateWidthScale(16)}
                color={theme.darkGreen}
              />
              <Text style={styles.editText}>{t("edit")}</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.itemRow}>
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
                  size={moderateWidthScale(26)}
                  color={theme.selectCard}
                />
              )}
            </View>
            <View style={styles.itemText}>
              <Text style={styles.itemName} numberOfLines={2}>
                {product.name}
              </Text>
              <Text style={styles.itemMeta}>
                {`${quantity} × ${formatShopPrice(product.sellingPrice)}`}
              </Text>
            </View>
            <Text style={styles.itemPrice}>{formatShopPrice(subtotal)}</Text>
          </View>
        </FlowCard>

        {/* Delivery */}
        {selectedMethod ? (
          <FlowCard style={styles.card}>
            <View style={styles.cardHead}>
              <Text style={styles.cardTitle}>{t("delivery")}</Text>
              <TouchableOpacity
                style={styles.editBtn}
                onPress={() => setStep("delivery")}
                disabled={paying}
                accessibilityRole="button"
                accessibilityLabel={`${t("change")} ${t("delivery")}`}
              >
                <MaterialIcons
                  name="edit"
                  size={moderateWidthScale(16)}
                  color={theme.darkGreen}
                />
                <Text style={styles.editText}>{t("change")}</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.deliveryRow}>
              <View style={styles.deliveryIcon}>
                <MaterialIcons
                  name={selectedMethod.icon}
                  size={moderateWidthScale(20)}
                  color={theme.selectCard}
                />
              </View>
              <View style={styles.itemText}>
                <Text style={styles.deliveryMain}>{selectedMethod.label}</Text>
                <Text style={styles.deliveryAddress}>
                  {isShipping ? addressText : selectedMethod.sub}
                </Text>
              </View>
            </View>
          </FlowCard>
        ) : null}

        {/* Price */}
        <FlowCard style={styles.card}>
          <View style={styles.priceRow}>
            <Text style={styles.priceKey}>{t("subtotal")}</Text>
            <Text style={styles.priceValue}>{formatShopPrice(subtotal)}</Text>
          </View>
          <View style={styles.priceRow}>
            <Text style={styles.priceKey}>{t("shipping")}</Text>
            <Text style={styles.priceValue}>
              {shipping > 0 ? formatShopPrice(shipping) : t("free")}
            </Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalKey}>{t("total")}</Text>
            <Text style={styles.totalValue}>{formatShopPrice(totalBeforeTax)}</Text>
          </View>
        </FlowCard>

        <InfoNote icon="lock-outline" text={t("shopSecurePayment")} />
      </ScrollView>
      <FlowFooter
        primary={{
          label: t("continueToPayment"),
          onPress: () => void placeOrder(),
          loading: paying,
          disabled: paying,
          icon: "lock",
        }}
      />
    </>
  );

  return (
    <View style={styles.container}>
      {header}
      {step === "delivery" ? renderDeliveryStep() : renderReviewStep()}
    </View>
  );
}
