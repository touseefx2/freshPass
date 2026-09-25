import React, { useMemo, useState } from "react";
import {
  Keyboard,
  Platform,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import AppImage from "@/src/components/AppImage";
import { MaterialIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { CloseIcon } from "@/assets/icons";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  heightScale,
  moderateHeightScale,
  moderateWidthScale,
  widthScale,
} from "@/src/theme/dimensions";
import StackHeader from "@/src/components/StackHeader";
import Button from "@/src/components/button";
import FloatingInput from "@/src/components/floatingInput";
import ImagePickerModal from "@/src/components/imagePickerModal";
import { formatShopPrice } from "@/src/constants/demoShopProduct";
import {
  SHOP_PRODUCT_CATEGORIES,
  type ShopProduct,
  type ShopProductCategory,
} from "@/src/types/shopProduct";

export type ProductFormDraft = Omit<
  ShopProduct,
  "id" | "createdAt" | "updatedAt" | "published"
>;

type Props = {
  initial: ProductFormDraft;
  mode: "add" | "edit";
  onSubmit: (draft: ProductFormDraft) => void;
};

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
      paddingTop: moderateHeightScale(16),
      gap: moderateHeightScale(14),
    },
    actions: {
      marginTop: moderateHeightScale(8),
      gap: moderateHeightScale(10),
    },
    stepRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(8),
      marginBottom: moderateHeightScale(4),
    },
    stepDot: {
      width: moderateWidthScale(8),
      height: moderateWidthScale(8),
      borderRadius: moderateWidthScale(4),
      backgroundColor: theme.lightGreen2,
    },
    stepDotActive: {
      backgroundColor: theme.buttonBack,
      width: moderateWidthScale(22),
      borderRadius: moderateWidthScale(4),
    },
    stepLabel: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontMedium,
      color: theme.lightGreen5,
    },
    title: {
      fontSize: fontSize.size22,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      marginBottom: moderateHeightScale(4),
    },
    subtitle: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen5,
      marginBottom: moderateHeightScale(4),
      lineHeight: fontSize.size18,
    },
    label: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      marginBottom: moderateHeightScale(6),
    },
    imagePicker: {
      width: "100%",
      height: heightScale(180),
      borderRadius: moderateWidthScale(14),
      borderWidth: 1,
      borderColor: theme.lightGreen2,
      backgroundColor: theme.white,
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
    },
    imagePreview: {
      width: "100%",
      height: "100%",
    },
    imagePlaceholderText: {
      marginTop: moderateHeightScale(8),
      fontSize: fontSize.size13,
      fontFamily: fonts.fontMedium,
      color: theme.lightGreen5,
    },
    categoryRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: moderateWidthScale(8),
    },
    categoryChip: {
      paddingHorizontal: moderateWidthScale(12),
      paddingVertical: moderateHeightScale(8),
      borderRadius: moderateWidthScale(20),
      borderWidth: 1,
      borderColor: theme.lightGreen2,
      backgroundColor: theme.white,
    },
    categoryChipSelected: {
      borderColor: theme.buttonBack,
      backgroundColor: theme.lightGreen05,
    },
    categoryChipText: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
    },
    textAreaWrap: {
      borderWidth: 1,
      borderColor: theme.lightGreen2,
      borderRadius: moderateWidthScale(10),
      backgroundColor: theme.white,
      paddingHorizontal: moderateWidthScale(12),
      paddingTop: moderateHeightScale(10),
      paddingBottom: moderateHeightScale(10),
      minHeight: heightScale(110),
    },
    textAreaRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: moderateWidthScale(8),
    },
    textArea: {
      flex: 1,
      minHeight: heightScale(90),
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.darkGreen,
      textAlignVertical: "top",
      padding: 0,
    },
    clearBtn: {
      paddingTop: moderateHeightScale(2),
      padding: moderateWidthScale(4),
    },
    toggleRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: moderateHeightScale(12),
      paddingHorizontal: moderateWidthScale(14),
      borderRadius: moderateWidthScale(12),
      borderWidth: 1,
      borderColor: theme.lightGreen2,
      backgroundColor: theme.white,
      gap: moderateWidthScale(12),
    },
    toggleTextWrap: {
      flex: 1,
      gap: moderateHeightScale(2),
    },
    toggleTitle: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    toggleHint: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen5,
    },
    // —— Review (professional) ——
    reviewHero: {
      borderRadius: moderateWidthScale(16),
      backgroundColor: theme.white,
      borderWidth: 1,
      borderColor: theme.lightGreen1,
      overflow: "hidden",
      ...Platform.select({
        ios: {
          shadowColor: theme.darkGreen,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.08,
          shadowRadius: 12,
        },
        android: { elevation: 3 },
        default: {},
      }),
    },
    reviewHeroTop: {
      flexDirection: "row",
      gap: moderateWidthScale(14),
      padding: moderateWidthScale(16),
      alignItems: "center",
      backgroundColor: theme.lightGreen05,
      borderBottomWidth: 1,
      borderBottomColor: theme.lightGreen1,
    },
    reviewThumb: {
      width: widthScale(72),
      height: widthScale(72),
      borderRadius: moderateWidthScale(14),
      backgroundColor: theme.white,
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
      borderWidth: 1,
      borderColor: theme.lightGreen2,
    },
    reviewName: {
      fontSize: fontSize.size18,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    reviewBrand: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontMedium,
      color: theme.lightGreen5,
      marginTop: moderateHeightScale(2),
    },
    reviewChipRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: moderateWidthScale(6),
      marginTop: moderateHeightScale(8),
    },
    reviewChip: {
      paddingHorizontal: moderateWidthScale(10),
      paddingVertical: moderateHeightScale(4),
      borderRadius: moderateWidthScale(12),
      backgroundColor: theme.white,
      borderWidth: 1,
      borderColor: theme.lightGreen2,
    },
    reviewChipAccent: {
      backgroundColor: theme.orangeBrown015,
      borderColor: theme.selectCard,
    },
    reviewChipText: {
      fontSize: fontSize.size11,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    reviewChipAccentText: {
      color: theme.selectCard,
    },
    reviewSection: {
      paddingHorizontal: moderateWidthScale(16),
      paddingVertical: moderateHeightScale(14),
      gap: moderateHeightScale(10),
      borderBottomWidth: 1,
      borderBottomColor: theme.lightGreen1,
    },
    reviewSectionLast: {
      borderBottomWidth: 0,
    },
    reviewSectionTitleRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(8),
      marginBottom: moderateHeightScale(2),
    },
    reviewSectionIcon: {
      width: moderateWidthScale(28),
      height: moderateWidthScale(28),
      borderRadius: moderateWidthScale(8),
      backgroundColor: theme.lightGreen05,
      alignItems: "center",
      justifyContent: "center",
    },
    reviewSectionTitle: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      letterSpacing: 0.2,
      textTransform: "uppercase",
    },
    reviewPriceBlock: {
      flexDirection: "row",
      alignItems: "flex-end",
      justifyContent: "space-between",
      gap: moderateWidthScale(12),
      paddingVertical: moderateHeightScale(8),
      paddingHorizontal: moderateWidthScale(12),
      borderRadius: moderateWidthScale(12),
      backgroundColor: theme.lightGreen05,
      borderWidth: 1,
      borderColor: theme.lightGreen1,
    },
    reviewPriceLabel: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontMedium,
      color: theme.lightGreen5,
    },
    reviewPriceValue: {
      fontSize: fontSize.size22,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    reviewMetaRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      gap: moderateWidthScale(12),
    },
    reviewMetaKey: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen5,
      flexShrink: 1,
    },
    reviewMetaValue: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      textAlign: "right",
      maxWidth: "55%",
    },
    reviewStatusRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(10),
      paddingVertical: moderateHeightScale(10),
      paddingHorizontal: moderateWidthScale(12),
      borderRadius: moderateWidthScale(12),
      backgroundColor: theme.white,
      borderWidth: 1,
      borderColor: theme.lightGreen2,
    },
    reviewStatusDot: {
      width: moderateWidthScale(8),
      height: moderateWidthScale(8),
      borderRadius: moderateWidthScale(4),
      backgroundColor: theme.buttonBack,
    },
    reviewStatusDotOff: {
      backgroundColor: theme.lightGreen2,
    },
    reviewStatusText: {
      flex: 1,
      fontSize: fontSize.size13,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
    },
    errorText: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontMedium,
      color: theme.red,
    },
  });

export default function ProductFormScreen({ initial, mode, onSubmit }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);
  const insets = useSafeAreaInsets();

  const [step, setStep] = useState(1);
  const [draft, setDraft] = useState<ProductFormDraft>(initial);
  const [error, setError] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  const sellingPriceText =
    draft.sellingPrice > 0 ? String(draft.sellingPrice) : "";
  const costText =
    draft.cost != null && draft.cost > 0 ? String(draft.cost) : "";
  const inventoryText =
    draft.inventoryCount > 0 || draft.inventoryCount === 0
      ? String(draft.inventoryCount)
      : "";
  const thresholdText = String(draft.lowStockThreshold);

  const update = <K extends keyof ProductFormDraft>(
    key: K,
    value: ProductFormDraft[K],
  ) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
    setError(null);
  };

  const validateStep1 = () => {
    if (!draft.name.trim()) {
      setError(t("productNameRequired"));
      return false;
    }
    if (!draft.brand.trim()) {
      setError(t("productBrandRequired"));
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    if (!Number.isFinite(draft.sellingPrice) || draft.sellingPrice <= 0) {
      setError(t("productPriceRequired"));
      return false;
    }
    if (draft.trackInventory && draft.inventoryCount < 0) {
      setError(t("productInventoryInvalid"));
      return false;
    }
    return true;
  };

  const handleNext = () => {
    Keyboard.dismiss();
    if (step === 1) {
      if (!validateStep1()) return;
      setStep(2);
      return;
    }
    if (step === 2) {
      if (!validateStep2()) return;
      setStep(3);
      return;
    }
    onSubmit(draft);
  };

  const handleBack = () => {
    Keyboard.dismiss();
    if (step > 1) {
      setStep((s) => s - 1);
      setError(null);
    }
  };

  const stepTitle =
    step === 1
      ? t("productDetailsTitle")
      : step === 2
        ? t("productPricingTitle")
        : t("productReviewTitle");

  const primaryLabel =
    step === 3
      ? mode === "edit"
        ? t("saveProduct")
        : t("publishProduct")
      : t("next");

  return (
    <View style={styles.container}>
      <StackHeader title={mode === "edit" ? t("editProduct") : t("addProduct")} />
      <KeyboardAwareScrollView
        style={styles.content}
        contentContainerStyle={[
          styles.contentContainer,
          { paddingBottom: insets.bottom + moderateHeightScale(24) },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        bottomOffset={moderateHeightScale(24)}
        extraKeyboardSpace={moderateHeightScale(16)}
        onScrollBeginDrag={Keyboard.dismiss}
      >
          <View style={styles.stepRow}>
            {[1, 2, 3].map((n) => (
              <View
                key={n}
                style={[styles.stepDot, step === n && styles.stepDotActive]}
              />
            ))}
            <Text style={styles.stepLabel}>
              {t("productStepOf", { current: step, total: 3 })}
            </Text>
          </View>

          <Text style={styles.title}>{stepTitle}</Text>
          <Text style={styles.subtitle}>
            {step === 1
              ? t("productDetailsSubtitle")
              : step === 2
                ? t("productPricingSubtitle")
                : t("productReviewSubtitle")}
          </Text>

          {step === 1 ? (
            <>
              <Text style={styles.label}>{t("productPhoto")}</Text>
              <TouchableOpacity
                style={styles.imagePicker}
                activeOpacity={0.85}
                onPress={() => setPickerOpen(true)}
              >
                {draft.imageUri ? (
                  <AppImage
                    uri={draft.imageUri}
                    style={styles.imagePreview}
                    resizeMode="cover"
                  />
                ) : (
                  <>
                    <MaterialIcons
                      name="photo-camera"
                      size={moderateWidthScale(32)}
                      color={theme.lightGreen5}
                    />
                    <Text style={styles.imagePlaceholderText}>
                      {t("addProductPhoto")}
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              <FloatingInput
                label={t("productName")}
                value={draft.name}
                onChangeText={(v) => update("name", v)}
                placeholder={t("productNamePlaceholder")}
                autoCapitalize="words"
                showClearButton
                onClear={() => update("name", "")}
              />

              <FloatingInput
                label={t("productBrand")}
                value={draft.brand}
                onChangeText={(v) => update("brand", v)}
                placeholder={t("productBrandPlaceholder")}
                autoCapitalize="words"
                showClearButton
                onClear={() => update("brand", "")}
              />

              <Text style={styles.label}>{t("productCategory")}</Text>
              <View style={styles.categoryRow}>
                {SHOP_PRODUCT_CATEGORIES.map((cat) => {
                  const selected = draft.category === cat;
                  return (
                    <Pressable
                      key={cat}
                      style={[
                        styles.categoryChip,
                        selected && styles.categoryChipSelected,
                      ]}
                      onPress={() =>
                        update("category", cat as ShopProductCategory)
                      }
                    >
                      <Text style={styles.categoryChipText}>{cat}</Text>
                    </Pressable>
                  );
                })}
              </View>

              <Text style={styles.label}>{t("productDescription")}</Text>
              <View style={styles.textAreaWrap}>
                <View style={styles.textAreaRow}>
                  <TextInput
                    style={styles.textArea}
                    value={draft.description}
                    onChangeText={(v) => update("description", v)}
                    placeholder={t("productDescriptionPlaceholder")}
                    placeholderTextColor={theme.lightGreen5}
                    multiline
                  />
                  {!!draft.description ? (
                    <TouchableOpacity
                      style={styles.clearBtn}
                      onPress={() => update("description", "")}
                      hitSlop={8}
                    >
                      <CloseIcon color={theme.darkGreen} />
                    </TouchableOpacity>
                  ) : null}
                </View>
              </View>
            </>
          ) : null}

          {step === 2 ? (
            <>
              <FloatingInput
                label={t("sellingPrice")}
                value={sellingPriceText}
                onChangeText={(v) =>
                  update(
                    "sellingPrice",
                    parseFloat(v.replace(/[^0-9.]/g, "")) || 0,
                  )
                }
                keyboardType="decimal-pad"
                placeholder="20.00"
                showClearButton
                onClear={() => update("sellingPrice", 0)}
              />

              <FloatingInput
                label={t("yourCostOptional")}
                value={costText}
                onChangeText={(v) => {
                  const n = parseFloat(v.replace(/[^0-9.]/g, ""));
                  update("cost", Number.isFinite(n) && n > 0 ? n : null);
                }}
                keyboardType="decimal-pad"
                placeholder="12.00"
                showClearButton
                onClear={() => update("cost", null)}
              />

              <FloatingInput
                label={t("inventoryCount")}
                value={inventoryText}
                onChangeText={(v) =>
                  update(
                    "inventoryCount",
                    parseInt(v.replace(/\D/g, ""), 10) || 0,
                  )
                }
                keyboardType="number-pad"
                placeholder="25"
                showClearButton
                onClear={() => update("inventoryCount", 0)}
              />

              <View style={styles.toggleRow}>
                <View style={styles.toggleTextWrap}>
                  <Text style={styles.toggleTitle}>{t("trackInventory")}</Text>
                  <Text style={styles.toggleHint}>
                    {t("trackInventoryHint")}
                  </Text>
                </View>
                <Switch
                  value={draft.trackInventory}
                  onValueChange={(v) => update("trackInventory", v)}
                  trackColor={{
                    false: theme.lightGreen2,
                    true: theme.buttonBack,
                  }}
                  thumbColor={theme.white}
                />
              </View>

              <View style={styles.toggleRow}>
                <View style={styles.toggleTextWrap}>
                  <Text style={styles.toggleTitle}>{t("lowStockAlert")}</Text>
                  <Text style={styles.toggleHint}>
                    {t("lowStockAlertHint")}
                  </Text>
                </View>
                <Switch
                  value={draft.lowStockAlertEnabled}
                  onValueChange={(v) => update("lowStockAlertEnabled", v)}
                  trackColor={{
                    false: theme.lightGreen2,
                    true: theme.buttonBack,
                  }}
                  thumbColor={theme.white}
                />
              </View>

              {draft.lowStockAlertEnabled ? (
                <FloatingInput
                  label={t("lowStockThreshold")}
                  value={thresholdText}
                  onChangeText={(v) =>
                    update(
                      "lowStockThreshold",
                      parseInt(v.replace(/\D/g, ""), 10) || 0,
                    )
                  }
                  keyboardType="number-pad"
                  placeholder="5"
                  showClearButton
                  onClear={() => update("lowStockThreshold", 0)}
                />
              ) : null}

              <View style={styles.toggleRow}>
                <View style={styles.toggleTextWrap}>
                  <Text style={styles.toggleTitle}>{t("pickupAvailable")}</Text>
                  <Text style={styles.toggleHint}>
                    {t("pickupAvailableHint")}
                  </Text>
                </View>
                <Switch
                  value={draft.pickupAvailable}
                  onValueChange={(v) => update("pickupAvailable", v)}
                  trackColor={{
                    false: theme.lightGreen2,
                    true: theme.buttonBack,
                  }}
                  thumbColor={theme.white}
                />
              </View>
            </>
          ) : null}

          {step === 3 ? (
            <View style={styles.reviewHero}>
              <View style={styles.reviewHeroTop}>
                <View style={styles.reviewThumb}>
                  {draft.imageUri ? (
                    <AppImage
                      uri={draft.imageUri}
                      style={styles.imagePreview}
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
                <View style={{ flex: 1 }}>
                  <Text style={styles.reviewName} numberOfLines={2}>
                    {draft.name}
                  </Text>
                  <Text style={styles.reviewBrand}>{draft.brand}</Text>
                  <View style={styles.reviewChipRow}>
                    <View style={styles.reviewChip}>
                      <Text style={styles.reviewChipText}>{draft.category}</Text>
                    </View>
                    {draft.trackInventory ? (
                      <View style={[styles.reviewChip, styles.reviewChipAccent]}>
                        <Text
                          style={[
                            styles.reviewChipText,
                            styles.reviewChipAccentText,
                          ]}
                        >
                          {t("qtyInStock", { count: draft.inventoryCount })}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                </View>
              </View>

              <View style={styles.reviewSection}>
                <View style={styles.reviewSectionTitleRow}>
                  <View style={styles.reviewSectionIcon}>
                    <MaterialIcons
                      name="attach-money"
                      size={moderateWidthScale(16)}
                      color={theme.darkGreen}
                    />
                  </View>
                  <Text style={styles.reviewSectionTitle}>
                    {t("productPricingTitle")}
                  </Text>
                </View>
                <View style={styles.reviewPriceBlock}>
                  <View>
                    <Text style={styles.reviewPriceLabel}>
                      {t("sellingPrice")}
                    </Text>
                    <Text style={styles.reviewPriceValue}>
                      {formatShopPrice(draft.sellingPrice)}
                    </Text>
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={styles.reviewPriceLabel}>
                      {t("yourCostOptional")}
                    </Text>
                    <Text style={styles.reviewMetaValue}>
                      {draft.cost != null
                        ? formatShopPrice(draft.cost)
                        : t("notSet")}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.reviewSection}>
                <View style={styles.reviewSectionTitleRow}>
                  <View style={styles.reviewSectionIcon}>
                    <MaterialIcons
                      name="local-shipping"
                      size={moderateWidthScale(16)}
                      color={theme.darkGreen}
                    />
                  </View>
                  <Text style={styles.reviewSectionTitle}>{t("shipping")}</Text>
                </View>
                <View style={styles.reviewMetaRow}>
                  <Text style={styles.reviewMetaKey}>{t("standardShipping")}</Text>
                  <Text style={styles.reviewMetaValue}>
                    {formatShopPrice(draft.shippingPrice)}
                  </Text>
                </View>
                <View style={styles.reviewMetaRow}>
                  <Text style={styles.reviewMetaKey}>
                    {t("freeShippingOver", {
                      amount: formatShopPrice(draft.freeShippingOver),
                    })}
                  </Text>
                  <Text style={styles.reviewMetaValue}>{t("yes")}</Text>
                </View>
                <View style={styles.reviewStatusRow}>
                  <View
                    style={[
                      styles.reviewStatusDot,
                      !draft.pickupAvailable && styles.reviewStatusDotOff,
                    ]}
                  />
                  <Text style={styles.reviewStatusText}>
                    {t("pickupAvailable")}
                  </Text>
                  <Text style={styles.reviewMetaValue}>
                    {draft.pickupAvailable ? t("yes") : t("no")}
                  </Text>
                </View>
              </View>

              <View style={[styles.reviewSection, styles.reviewSectionLast]}>
                <View style={styles.reviewSectionTitleRow}>
                  <View style={styles.reviewSectionIcon}>
                    <MaterialIcons
                      name="inventory-2"
                      size={moderateWidthScale(16)}
                      color={theme.darkGreen}
                    />
                  </View>
                  <Text style={styles.reviewSectionTitle}>
                    {t("inventoryCount")}
                  </Text>
                </View>
                <View style={styles.reviewStatusRow}>
                  <View
                    style={[
                      styles.reviewStatusDot,
                      !draft.trackInventory && styles.reviewStatusDotOff,
                    ]}
                  />
                  <Text style={styles.reviewStatusText}>
                    {t("trackInventory")}
                  </Text>
                  <Text style={styles.reviewMetaValue}>
                    {draft.trackInventory ? t("on") : t("off")}
                  </Text>
                </View>
                <View style={styles.reviewStatusRow}>
                  <View
                    style={[
                      styles.reviewStatusDot,
                      !draft.lowStockAlertEnabled && styles.reviewStatusDotOff,
                    ]}
                  />
                  <Text style={styles.reviewStatusText}>
                    {t("lowStockAlert")}
                  </Text>
                  <Text style={styles.reviewMetaValue}>
                    {draft.lowStockAlertEnabled
                      ? t("whenQtyReaches", { qty: draft.lowStockThreshold })
                      : t("off")}
                  </Text>
                </View>
              </View>
            </View>
          ) : null}

          {!!error && <Text style={styles.errorText}>{error}</Text>}

          <View style={styles.actions}>
            {step > 1 ? (
              <Button
                title={t("back")}
                onPress={handleBack}
                backgroundColor={theme.white}
                textColor={theme.darkGreen}
                containerStyle={{
                  borderWidth: 1,
                  borderColor: theme.buttonBack,
                }}
              />
            ) : null}
            <Button title={primaryLabel} onPress={handleNext} />
          </View>
      </KeyboardAwareScrollView>

      <ImagePickerModal
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onImageSelected={(uri) => {
          update("imageUri", uri);
          setPickerOpen(false);
        }}
      />
    </View>
  );
}
