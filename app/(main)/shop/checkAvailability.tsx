import React, { useMemo, useState } from "react";
import {
  Keyboard,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useAppDispatch, useAppSelector, useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  moderateHeightScale,
  moderateWidthScale,
} from "@/src/theme/dimensions";
import StackHeader from "@/src/components/StackHeader";
import Button from "@/src/components/button";
import FloatingInput from "@/src/components/floatingInput";
import { formatShopPrice } from "@/src/constants/demoShopProduct";
import {
  setCheckedZip,
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
    title: {
      fontSize: fontSize.size22,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    subtitle: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen5,
      lineHeight: fontSize.size18,
    },
    zipBlock: {
      gap: moderateHeightScale(10),
    },
    successBanner: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(8),
      padding: moderateWidthScale(12),
      borderRadius: moderateWidthScale(12),
      backgroundColor: theme.lightGreen05,
      borderWidth: 1,
      borderColor: theme.lightGreen1,
    },
    successText: {
      flex: 1,
      fontSize: fontSize.size13,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
    },
    optionRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: moderateHeightScale(14),
      paddingHorizontal: moderateWidthScale(14),
      borderRadius: moderateWidthScale(12),
      borderWidth: 1,
      borderColor: theme.lightGreen2,
      backgroundColor: theme.white,
      gap: moderateWidthScale(12),
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
    optionTextWrap: { flex: 1, gap: moderateHeightScale(2) },
    optionTitle: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    optionHint: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen5,
    },
    optionPrice: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
  });

export default function CheckAvailabilityScreen() {
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
  const cartMethod = useAppSelector((s) => s.shopCart.shippingMethod);
  const product = resolveShopProduct(productId, inventory);

  const [zip, setZip] = useState("");
  const [checked, setChecked] = useState(false);
  const [method, setMethod] = useState<ShopShippingMethod | null>(
    cartMethod ?? "standard",
  );

  const options: {
    key: ShopShippingMethod;
    title: string;
    hint?: string;
    priceLabel: string;
  }[] = [
    {
      key: "standard",
      title: t("standardShipping"),
      priceLabel: formatShopPrice(product?.shippingPrice ?? 5.99),
    },
    {
      key: "free_over",
      title: t("freeShippingOption", {
        amount: formatShopPrice(product?.freeShippingOver ?? 50),
      }),
      priceLabel: t("freeOver", {
        amount: formatShopPrice(product?.freeShippingOver ?? 50),
      }),
    },
    ...(product?.pickupAvailable !== false
      ? [
          {
            key: "local_pickup" as const,
            title: t("localPickup"),
            hint: t("localPickupAvailable"),
            priceLabel: formatShopPrice(0),
          },
        ]
      : []),
  ];

  const handleCheck = () => {
    Keyboard.dismiss();
    const trimmed = zip.trim();
    if (trimmed.length < 3) {
      showBanner(t("checkAvailability"), t("enterValidZip"), "warning");
      return;
    }
    setChecked(true);
    dispatch(setCheckedZip(trimmed));
  };

  return (
    <View style={styles.container}>
      <StackHeader title={t("checkAvailability")} />
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
        <Text style={styles.title}>{t("checkAvailability")}</Text>
        <Text style={styles.subtitle}>{t("enterZipCode")}</Text>

        <View style={styles.zipBlock}>
          <FloatingInput
            label={t("zipCode")}
            value={zip}
            onChangeText={setZip}
            placeholder={t("zipCode")}
            keyboardType="number-pad"
            maxLength={10}
            showClearButton
            onClear={() => {
              setZip("");
              setChecked(false);
            }}
          />
          <Button title={t("check")} onPress={handleCheck} />
        </View>

        {checked ? (
          <View style={styles.successBanner}>
            <MaterialIcons
              name="check-circle"
              size={moderateWidthScale(20)}
              color={theme.buttonBack}
            />
            <Text style={styles.successText}>{t("productCanShip")}</Text>
          </View>
        ) : null}

        {checked
          ? options.map((opt) => {
              const selected = method === opt.key;
              return (
                <Pressable
                  key={opt.key}
                  style={[
                    styles.optionRow,
                    selected && styles.optionRowSelected,
                  ]}
                  onPress={() => setMethod(opt.key)}
                >
                  <View
                    style={[
                      styles.radioOuter,
                      selected && styles.radioOuterSelected,
                    ]}
                  >
                    {selected ? <View style={styles.radioInner} /> : null}
                  </View>
                  <View style={styles.optionTextWrap}>
                    <Text style={styles.optionTitle}>{opt.title}</Text>
                    {!!opt.hint && (
                      <Text style={styles.optionHint}>{opt.hint}</Text>
                    )}
                  </View>
                  <Text style={styles.optionPrice}>{opt.priceLabel}</Text>
                </Pressable>
              );
            })
          : null}

        <View style={styles.actions}>
          <Button
            title={t("proceedToCheckout")}
            disabled={!checked || !method}
            onPress={() => {
              if (!method) {
                showBanner(
                  t("checkAvailability"),
                  t("selectShippingMethod"),
                  "warning",
                );
                return;
              }
              dispatch(setShippingMethod(method));
              router.push({
                pathname: "/(main)/shop/cart" as any,
                params: productId ? { productId } : undefined,
              });
            }}
          />
        </View>
      </KeyboardAwareScrollView>
    </View>
  );
}
