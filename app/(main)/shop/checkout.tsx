import React, { useMemo, useState } from "react";
import {
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
import StackHeader from "@/src/components/StackHeader";
import Button from "@/src/components/button";
import FloatingInput from "@/src/components/floatingInput";
import { formatShopPrice } from "@/src/constants/demoShopProduct";
import {
  clearCart,
  computeOrderTotals,
  resetShopCheckout,
  setLastOrderId,
  setShippingAddress,
  setShippingMethod,
} from "@/src/state/slices/shopCartSlice";
import type { ShopShippingMethod } from "@/src/types/shopProduct";
import { resolveShopProduct } from "@/src/utils/shopProductHelpers";
import { useNotificationContext } from "@/src/contexts/NotificationContext";

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
    stepper: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: moderateHeightScale(8),
    },
    stepItem: { alignItems: "center", flex: 1, gap: moderateHeightScale(6) },
    stepCircle: {
      width: moderateWidthScale(28),
      height: moderateWidthScale(28),
      borderRadius: moderateWidthScale(14),
      backgroundColor: theme.lightGreen2,
      alignItems: "center",
      justifyContent: "center",
    },
    stepCircleActive: { backgroundColor: theme.buttonBack },
    stepCircleDone: { backgroundColor: theme.darkGreen },
    stepNum: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontBold,
      color: theme.white,
    },
    stepLabel: {
      fontSize: fontSize.size11,
      fontFamily: fonts.fontMedium,
      color: theme.lightGreen5,
      textAlign: "center",
    },
    stepLabelActive: { color: theme.darkGreen },
    progressTrack: {
      height: moderateHeightScale(4),
      borderRadius: moderateWidthScale(2),
      backgroundColor: theme.lightGreen2,
      marginBottom: moderateHeightScale(12),
      overflow: "hidden",
    },
    progressFill: {
      height: "100%",
      backgroundColor: theme.selectCard,
      borderRadius: moderateWidthScale(2),
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
    mockNote: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.selectCard,
      lineHeight: fontSize.size17,
      marginBottom: moderateHeightScale(8),
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

  const address = useAppSelector((s) => s.shopCart.address);
  const shippingMethod = useAppSelector((s) => s.shopCart.shippingMethod);
  const items = useAppSelector((s) => s.shopCart.items);
  const inventory = useAppSelector((s) => s.inventory.products);

  const [step, setStep] = useState(1);
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvc, setCvc] = useState("");

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

  const methodOptions: { key: ShopShippingMethod; label: string }[] = [
    { key: "standard", label: t("standardShipping") },
    {
      key: "free_over",
      label: t("freeShippingOption", {
        amount: formatShopPrice(shippingProduct?.freeShippingOver ?? 50),
      }),
    },
    { key: "local_pickup", label: t("localPickup") },
  ];

  const validateShipping = () => {
    if (
      !address.fullName.trim() ||
      !address.street.trim() ||
      !address.city.trim() ||
      !address.state.trim() ||
      !address.zip.trim()
    ) {
      showBanner(t("checkout"), t("fillShippingAddress"), "warning");
      return false;
    }
    if (!shippingMethod) {
      showBanner(t("checkout"), t("selectShippingMethod"), "warning");
      return false;
    }
    return true;
  };

  const placeOrder = () => {
    // BACKEND_SWAP: create order + Stripe PaymentSheet, then clear cart on success
    const orderId = `FP${Date.now().toString().slice(-6)}`;
    dispatch(setLastOrderId(orderId));
    dispatch(clearCart());
    dispatch(resetShopCheckout());
    router.replace({
      pathname: "/(main)/shop/orderConfirmed" as any,
      params: { orderId },
    });
  };

  const primaryLabel =
    step === 1
      ? t("continueToPayment")
      : step === 2
        ? t("continueToReview")
        : t("placeOrder");

  const onPrimary = () => {
    Keyboard.dismiss();
    if (step === 1) {
      if (!validateShipping()) return;
      setStep(2);
      return;
    }
    if (step === 2) {
      setStep(3);
      return;
    }
    placeOrder();
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
        <View style={styles.stepper}>
          {[
            { n: 1, label: t("shipping") },
            { n: 2, label: t("payment") },
            { n: 3, label: t("review") },
          ].map((s) => (
            <View key={s.n} style={styles.stepItem}>
              <View
                style={[
                  styles.stepCircle,
                  step === s.n && styles.stepCircleActive,
                  step > s.n && styles.stepCircleDone,
                ]}
              >
                <Text style={styles.stepNum}>{s.n}</Text>
              </View>
              <Text
                style={[
                  styles.stepLabel,
                  step === s.n && styles.stepLabelActive,
                ]}
              >
                {s.label}
              </Text>
            </View>
          ))}
        </View>
        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              { width: widthScale(320) * (step / 3) },
            ]}
          />
        </View>

        {step === 1 ? (
          <>
            <Text style={styles.sectionTitle}>{t("shippingAddress")}</Text>
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
                  showClearButton
                  onClear={() => dispatch(setShippingAddress({ city: "" }))}
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
                  showClearButton
                  onClear={() => dispatch(setShippingAddress({ state: "" }))}
                />
              </View>
            </View>
            <FloatingInput
              label={t("zipCode")}
              value={address.zip}
              onChangeText={(v) => dispatch(setShippingAddress({ zip: v }))}
              keyboardType="number-pad"
              showClearButton
              onClear={() => dispatch(setShippingAddress({ zip: "" }))}
            />

            <Text
              style={[
                styles.sectionTitle,
                { marginTop: moderateHeightScale(12) },
              ]}
            >
              {t("shippingMethod")}
            </Text>
            {methodOptions.map((opt) => {
              const selected = shippingMethod === opt.key;
              return (
                <Pressable
                  key={opt.key}
                  style={[
                    styles.optionRow,
                    selected && styles.optionRowSelected,
                  ]}
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
                </Pressable>
              );
            })}
          </>
        ) : null}

        {step === 2 ? (
          <>
            <Text style={styles.sectionTitle}>{t("payment")}</Text>
            <Text style={styles.mockNote}>{t("paymentMockNote")}</Text>
            <FloatingInput
              label={t("cardNumber")}
              value={cardNumber}
              onChangeText={setCardNumber}
              placeholder="4242 4242 4242 4242"
              keyboardType="number-pad"
              showClearButton
              onClear={() => setCardNumber("")}
            />
            <View style={styles.row2}>
              <View style={styles.half}>
                <FloatingInput
                  label={t("expiry")}
                  value={expiry}
                  onChangeText={setExpiry}
                  placeholder="MM/YY"
                  showClearButton
                  onClear={() => setExpiry("")}
                />
              </View>
              <View style={styles.half}>
                <FloatingInput
                  label={t("cvc")}
                  value={cvc}
                  onChangeText={setCvc}
                  placeholder="123"
                  keyboardType="number-pad"
                  secureTextEntry
                  showClearButton
                  onClear={() => setCvc("")}
                />
              </View>
            </View>
          </>
        ) : null}

        {step === 3 ? (
          <>
            <Text style={styles.sectionTitle}>{t("review")}</Text>
            <View style={styles.reviewCard}>
              <View style={styles.reviewRow}>
                <Text style={styles.reviewKey}>{t("shippingAddress")}</Text>
                <Text style={styles.reviewValue}>
                  {`${address.fullName}\n${address.street}\n${address.city}, ${address.state} ${address.zip}`}
                </Text>
              </View>
              <View style={styles.reviewRow}>
                <Text style={styles.reviewKey}>{t("shippingMethod")}</Text>
                <Text style={styles.reviewValue}>
                  {methodOptions.find((m) => m.key === shippingMethod)?.label ??
                    "—"}
                </Text>
              </View>
              <View style={styles.reviewRow}>
                <Text style={styles.reviewKey}>{t("subtotal")}</Text>
                <Text style={styles.reviewValue}>
                  {formatShopPrice(totals.subtotal)}
                </Text>
              </View>
              <View style={styles.reviewRow}>
                <Text style={styles.reviewKey}>{t("shipping")}</Text>
                <Text style={styles.reviewValue}>
                  {formatShopPrice(totals.shipping)}
                </Text>
              </View>
              <View style={styles.reviewRow}>
                <Text style={styles.reviewKey}>{t("tax")}</Text>
                <Text style={styles.reviewValue}>
                  {formatShopPrice(totals.tax)}
                </Text>
              </View>
              <View style={styles.reviewRow}>
                <Text style={styles.reviewKey}>{t("total")}</Text>
                <Text style={styles.reviewValue}>
                  {formatShopPrice(totals.total)}
                </Text>
              </View>
            </View>
          </>
        ) : null}

        <View style={styles.actions}>
          <Button title={primaryLabel} onPress={onPrimary} />
        </View>
      </KeyboardAwareScrollView>
    </View>
  );
}
