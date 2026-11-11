import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  Keyboard,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import Animated, {
  FadeInLeft,
  FadeInRight,
  ReduceMotion,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import AppImage from "@/src/components/AppImage";
import ImagePickerModal from "@/src/components/imagePickerModal";
import FlowHeader from "@/src/components/reelFlow/flowHeader";
import FlowFooter from "@/src/components/reelFlow/flowFooter";
import {
  FlowCard,
  FlowTitle,
  InfoNote,
  SectionLabel,
} from "@/src/components/reelFlow/flowParts";
import { ToggleRow } from "@/src/components/reelFlow/detailsFields";
import ProductPrice from "@/src/components/marketplace/ProductPrice";
import TapField from "@/src/components/productEditor/tapField";
import PhotoSlots from "@/src/components/productEditor/photoSlots";
import BenefitsEditor from "@/src/components/productEditor/benefitsEditor";
import VariantCard from "@/src/components/productEditor/variantCard";
import {
  ModerationBanner,
  SwitchCard,
} from "@/src/components/productEditor/marketplaceParts";
import {
  cleanInt,
  cleanMoney,
  EDITOR_TOTAL_STEPS,
  emptyVariantForm,
  formToVariant,
  getCategoryIcon,
  getPhotoLimits,
  mapServerErrorKey,
  MAX_PRODUCT_PHOTOS,
  moneyText,
  STEP_DETAILS,
  STEP_MARKETPLACE,
  STEP_OPTIONS,
  STEP_PHOTOS,
  STEP_PRICE,
  STEP_REVIEW,
  toMoney,
  toMoneyOrNull,
  variantToForm,
  withNewImages,
  withoutImage,
  type EditorStep,
  type PhotoLimits,
  type ProductFieldKey,
  type ProductServerError,
  type VariantErrorKey,
  type VariantErrors,
  type VariantForm,
} from "@/src/components/productEditor/editorUtils";
import type { ProductFormDraft } from "@/src/components/productFormScreen";
import { useAppDispatch, useAppSelector, useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  heightScale,
  moderateHeightScale,
  moderateWidthScale,
  widthScale,
} from "@/src/theme/dimensions";
import { setDeliveryOptions } from "@/src/state/slices/inventorySlice";
import { fetchDeliveryOptions } from "@/src/services/productService";
import { fetchProductCategories } from "@/src/services/marketplaceService";
import { describeDelivery } from "@/src/utils/shopProductHelpers";
import { formatShopPrice } from "@/src/constants/demoShopProduct";
import {
  SHOP_PRODUCT_CATEGORIES,
  type ShopProductModeration,
} from "@/src/types/shopProduct";

/**
 * Add / edit a shop product step by step, in the same look as the reel
 * flows: Photos & name → Category & details → Price & stock → Options →
 * Marketplace → Review. Edit mode opens on Review; "Edit" on a section
 * jumps there and "Done" comes back.
 */

export type { ProductServerError } from "@/src/components/productEditor/editorUtils";

type Props = {
  initial: ProductFormDraft;
  mode: "add" | "edit";
  /** Edit mode: whether the product is currently live. */
  published?: boolean;
  /** Edit mode: FreshPass admin moderation of this product. */
  moderation?: ShopProductModeration | null;
  submitting?: boolean;
  serverError?: ProductServerError | null;
  onSubmit: (draft: ProductFormDraft, publish: boolean) => void;
};

type Errors = Partial<Record<ProductFieldKey, string>>;
type VariantErrorMap = Record<string, VariantErrors>;

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: theme.background },
    flex: { flex: 1 },
    content: {
      paddingHorizontal: moderateWidthScale(20),
      paddingTop: moderateHeightScale(12),
      paddingBottom: moderateHeightScale(28),
      gap: moderateHeightScale(20),
    },
    stepBody: { gap: moderateHeightScale(20) },
    section: { gap: moderateHeightScale(10) },
    hint: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      lineHeight: fontSize.size19,
    },
    // ── Category tiles (2 across)
    categoryGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: moderateWidthScale(10),
    },
    categoryLoading: {
      minHeight: heightScale(140),
      alignItems: "center",
      justifyContent: "center",
    },
    categoryTile: {
      flexGrow: 1,
      flexBasis: "45%",
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(10),
      minHeight: heightScale(56),
      paddingHorizontal: moderateWidthScale(14),
      borderRadius: moderateWidthScale(16),
      borderWidth: 1.5,
      borderColor: theme.borderNormal,
      backgroundColor: theme.white,
    },
    categoryTileActive: {
      borderColor: theme.darkGreen,
      backgroundColor: theme.darkGreen,
    },
    categoryText: {
      flex: 1,
      fontSize: fontSize.size15,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
    },
    categoryTextActive: { color: theme.white, fontFamily: fonts.fontBold },
    row2: { flexDirection: "row", gap: moderateWidthScale(12) },
    half: { flex: 1, minWidth: 0 },
    profit: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(8),
      paddingHorizontal: moderateWidthScale(14),
      paddingVertical: moderateHeightScale(10),
      borderRadius: moderateWidthScale(12),
      backgroundColor: theme.lightGreen07,
    },
    profitText: {
      flex: 1,
      fontSize: fontSize.size15,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
    },
    buyerSees: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(10),
      paddingHorizontal: moderateWidthScale(14),
      paddingVertical: moderateHeightScale(10),
      borderRadius: moderateWidthScale(12),
      backgroundColor: theme.orangeBrown01,
    },
    buyerSeesLabel: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
    },
    // ── Stock stepper
    stepper: {
      flexDirection: "row",
      alignItems: "center",
      minHeight: heightScale(56),
      borderRadius: moderateWidthScale(16),
      borderWidth: 1.5,
      borderColor: theme.borderNormal,
      backgroundColor: theme.white,
      overflow: "hidden",
    },
    stepperError: { borderColor: theme.red },
    stepperBtn: {
      width: widthScale(56),
      alignSelf: "stretch",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.lightGreen07,
    },
    stepperInput: {
      flex: 1,
      textAlign: "center",
      fontSize: fontSize.size20,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      paddingVertical: moderateHeightScale(10),
      fontVariant: ["tabular-nums"],
    },
    fieldError: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontMedium,
      color: theme.red,
    },
    linkBtn: {
      alignSelf: "flex-start",
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(6),
      minHeight: heightScale(44),
      paddingHorizontal: moderateWidthScale(14),
      borderRadius: heightScale(22),
      backgroundColor: theme.lightGreen07,
    },
    linkText: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    // ── Options
    addOption: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: moderateWidthScale(8),
      minHeight: heightScale(56),
      borderRadius: moderateWidthScale(16),
      borderWidth: 1.5,
      borderStyle: "dashed",
      borderColor: theme.buttonBack,
      backgroundColor: theme.lightGreen05,
    },
    addOptionText: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    noOptions: {
      alignItems: "center",
      gap: moderateHeightScale(8),
      paddingVertical: moderateHeightScale(22),
      paddingHorizontal: moderateWidthScale(20),
    },
    noOptionsIcon: {
      width: widthScale(56),
      height: widthScale(56),
      borderRadius: widthScale(28),
      backgroundColor: theme.lightGreen07,
      alignItems: "center",
      justifyContent: "center",
    },
    noOptionsTitle: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      textAlign: "center",
    },
    noOptionsText: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      textAlign: "center",
      lineHeight: fontSize.size19,
    },
    // ── Review
    reviewCard: { overflow: "hidden" },
    reviewHero: {
      flexDirection: "row",
      gap: moderateWidthScale(14),
      padding: moderateWidthScale(14),
      alignItems: "center",
    },
    reviewThumb: {
      width: widthScale(84),
      height: widthScale(84),
      borderRadius: moderateWidthScale(14),
      backgroundColor: theme.lightGreen07,
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
    },
    reviewThumbImage: { ...StyleSheet.absoluteFillObject },
    reviewHeroText: { flex: 1, minWidth: 0, gap: moderateHeightScale(2) },
    reviewName: {
      fontSize: fontSize.size18,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    reviewMeta: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
    },
    reviewPrice: { marginTop: moderateHeightScale(4) },
    strip: {
      flexDirection: "row",
      gap: moderateWidthScale(8),
      paddingHorizontal: moderateWidthScale(14),
      paddingBottom: moderateHeightScale(14),
    },
    stripThumb: {
      width: widthScale(52),
      height: widthScale(52),
      borderRadius: moderateWidthScale(10),
      overflow: "hidden",
      backgroundColor: theme.lightGreen07,
    },
    stripThumbMain: { borderWidth: 2, borderColor: theme.darkGreen },
    reviewRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: moderateWidthScale(12),
      paddingHorizontal: moderateWidthScale(14),
      paddingVertical: moderateHeightScale(14),
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.borderLight,
    },
    reviewRowText: { flex: 1, minWidth: 0, gap: moderateHeightScale(3) },
    reviewLabel: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontMedium,
      color: theme.lightGreen,
      textTransform: "uppercase",
      letterSpacing: 0.6,
    },
    reviewValue: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
      lineHeight: fontSize.size22,
    },
    reviewValueMuted: { color: theme.lightGreen },
    tickRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: moderateWidthScale(8),
    },
    tickIcon: { marginTop: moderateHeightScale(2) },
    statusRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(6),
    },
    reviewEdit: {
      minHeight: heightScale(36),
      minWidth: widthScale(56),
      paddingHorizontal: moderateWidthScale(12),
      borderRadius: heightScale(18),
      backgroundColor: theme.lightGreen07,
      alignItems: "center",
      justifyContent: "center",
    },
    reviewEditText: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    delivery: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(12),
      padding: moderateWidthScale(16),
    },
    deliveryWarn: {
      borderColor: theme.upcomingBorder,
      backgroundColor: theme.upcomingCard,
    },
    deliveryText: { flex: 1, minWidth: 0, gap: moderateHeightScale(2) },
    deliveryLine: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
    },
    deliveryHint: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
    },
  });

const VARIANT_PATCH_ERRORS: Partial<Record<keyof VariantForm, VariantErrorKey[]>> = {
  name: ["name"],
  stockText: ["stock"],
  priceText: ["price", "sale"],
  saleText: ["sale"],
  images: ["photos"],
};

export default function ProductStepFlow({
  initial,
  mode,
  published = false,
  moderation = null,
  submitting = false,
  serverError = null,
  onSubmit,
}: Props) {
  const { t } = useTranslation();
  const router = useRouter();
  const navigation = useNavigation();
  const dispatch = useAppDispatch();
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const delivery = useAppSelector((s) => s.inventory.deliveryOptions);

  const isEdit = mode === "edit";
  const isLive = isEdit && published;
  const featuredBlocked = moderation?.featuredBlocked === true;
  // A product that had options and loses all of them must send remove_variants
  const hadVariants = (initial.variants?.length ?? 0) > 0;

  const [draft, setDraft] = useState<ProductFormDraft>(() => ({
    ...initial,
    images: initial.images ?? [],
    removedImageIds: initial.removedImageIds ?? [],
    benefits: initial.benefits ?? [],
    showInMarketplace: initial.showInMarketplace === true,
    featuredRequested: initial.featuredRequested === true,
  }));
  // Number fields stay as text while typing ("12." must survive).
  const [priceText, setPriceText] = useState(moneyText(initial.sellingPrice));
  const [saleText, setSaleText] = useState(moneyText(initial.salePrice));
  const [costText, setCostText] = useState(moneyText(initial.cost));
  const [stockText, setStockText] = useState(String(initial.inventoryCount));
  const [thresholdText, setThresholdText] = useState(
    String(initial.lowStockThreshold),
  );
  const [variants, setVariants] = useState<VariantForm[]>(() =>
    (initial.variants ?? []).map(variantToForm),
  );
  const [step, setStep] = useState<EditorStep>(isEdit ? STEP_REVIEW : STEP_PHOTOS);
  const [direction, setDirection] = useState<1 | -1>(1);
  // Opened from Review's "Edit": the primary button goes back to Review.
  const [fromReview, setFromReview] = useState(isEdit);
  const [errors, setErrors] = useState<Errors>({});
  const [variantErrors, setVariantErrors] = useState<VariantErrorMap>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  // Which button started the save, so only that one shows the loader.
  const [submitAction, setSubmitAction] = useState<"publish" | "draft">(
    "publish",
  );
  const [pickerOpen, setPickerOpen] = useState(false);
  // Whose photos the picker adds to: the product or an option (its key).
  // A ref: the sheet closes before the photo library returns.
  const pickerTargetRef = useRef<string | null>(null);
  const [categories, setCategories] = useState<string[] | null>(null);

  const brandRef = useRef<TextInput>(null);
  const saleRef = useRef<TextInput>(null);
  const costRef = useRef<TextInput>(null);
  const stockInputRef = useRef<TextInput>(null);

  // Refresh on focus so returning from Delivery options shows the new setting.
  useFocusEffect(
    useCallback(() => {
      fetchDeliveryOptions()
        .then((options) => dispatch(setDeliveryOptions(options)))
        .catch(() => {});
    }, [dispatch]),
  );

  // Admin-managed list; the fixed list is only an offline fallback.
  const loadCategories = useCallback(() => {
    setCategories(null);
    fetchProductCategories()
      .then((list) => {
        const names = list.map((c) => c.name);
        setCategories(names.length ? names : [...SHOP_PRODUCT_CATEGORIES]);
      })
      .catch(() => setCategories([...SHOP_PRODUCT_CATEGORIES]));
  }, []);
  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  // A new product starts on the first category the server offers.
  useEffect(() => {
    if (isEdit || !categories?.length) return;
    setDraft((prev) =>
      categories.includes(prev.category)
        ? prev
        : { ...prev, category: categories[0]! },
    );
  }, [categories, isEdit]);

  // Editing keeps the product's category even if admin turned it off.
  const categoryOptions = useMemo(() => {
    if (!categories) return null;
    const current = draft.category?.trim();
    return current && !categories.includes(current)
      ? [current, ...categories]
      : categories;
  }, [categories, draft.category]);

  const deliveryConfigured = !!delivery?.configured;
  const deliveryLines = describeDelivery(delivery, t);

  const images = useMemo(() => draft.images ?? [], [draft.images]);
  const benefits = useMemo(() => draft.benefits ?? [], [draft.benefits]);
  const price = toMoney(priceText);
  const sale = toMoneyOrNull(saleText);
  const cost = toMoney(costText);
  const stock = parseInt(stockText || "0", 10) || 0;
  const threshold = parseInt(thresholdText || "0", 10) || 0;
  const hasVariants = variants.length > 0;
  const variantDrafts = useMemo(() => variants.map(formToVariant), [variants]);
  const variantStock = variantDrafts.reduce(
    (sum, v) => sum + Math.max(0, v.inventoryCount),
    0,
  );
  const totalStock = hasVariants ? variantStock : stock;
  const saleValid = sale != null && sale < price;
  const buyerPrice = saleValid ? sale! : price;

  const allOptionPhotos = variants.reduce((n, v) => n + v.images.length, 0);
  const photoLimits: PhotoLimits = useMemo(
    () => getPhotoLimits(variants.length, images.length, allOptionPhotos),
    [variants.length, images.length, allOptionPhotos],
  );
  const totalPhotos = images.length + allOptionPhotos;
  const sharedRoom = Math.max(0, MAX_PRODUCT_PHOTOS - totalPhotos);

  const finalDraft = useMemo<ProductFormDraft>(
    () => ({
      ...draft,
      name: draft.name.trim(),
      brand: draft.brand.trim(),
      description: draft.description.trim(),
      imageUri: images[0]?.uri ?? null,
      sellingPrice: price,
      salePrice: sale,
      cost: cost > 0 ? cost : null,
      // With options the server ignores this and totals the options
      inventoryCount: hasVariants ? variantStock : stock,
      lowStockThreshold: threshold,
      benefits: benefits.map((b) => b.trim()).filter(Boolean),
      showInMarketplace: draft.showInMarketplace === true,
      // Blocked by FreshPass: leave it out (sending true is a 422)
      featuredRequested: featuredBlocked
        ? undefined
        : draft.showInMarketplace === true && draft.featuredRequested === true,
      variants: hasVariants ? variantDrafts : hadVariants ? [] : undefined,
    }),
    [
      draft,
      images,
      price,
      sale,
      cost,
      hasVariants,
      variantStock,
      stock,
      threshold,
      benefits,
      featuredBlocked,
      variantDrafts,
      hadVariants,
    ],
  );

  // Snapshot of the untouched draft, for the "discard changes?" check.
  const baselineRef = useRef<string | null>(null);
  if (baselineRef.current === null) {
    baselineRef.current = JSON.stringify(finalDraft);
  }
  const dirty = JSON.stringify(finalDraft) !== baselineRef.current;

  const clearError = (...keys: ProductFieldKey[]) =>
    setErrors((prev) => {
      if (!keys.some((k) => prev[k])) return prev;
      const next = { ...prev };
      keys.forEach((k) => delete next[k]);
      return next;
    });

  const update = <K extends keyof ProductFormDraft>(
    key: K,
    value: ProductFormDraft[K],
  ) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
    setSubmitError(null);
  };

  // ── Validation ──────────────────────────────────────────────────────

  const validateVariants = (): VariantErrorMap => {
    const out: VariantErrorMap = {};
    const seen = new Map<string, number>();
    variants.forEach((v) => {
      const e: VariantErrors = {};
      const name = v.name.trim();
      if (!name) e.name = t("mpPfOptionNameRequired");
      else {
        const lower = name.toLowerCase();
        if (seen.has(lower)) e.name = t("mpPfOptionNameDuplicate");
        seen.set(lower, 1);
      }
      if (!v.stockText.trim()) e.stock = t("mpPfOptionStockRequired");
      const own = toMoneyOrNull(v.priceText);
      const ownSale = toMoneyOrNull(v.saleText);
      if (ownSale != null) {
        if (own == null) e.sale = t("mpPfOptionSaleNeedsPrice");
        else if (ownSale >= own) e.sale = t("mpPfSaleBelowPrice");
      }
      if (variants.length >= 5 && v.images.length > 1) {
        e.photos = t("mpPfOptionOnePhoto");
      }
      if (Object.keys(e).length) out[v.key] = e;
    });
    return out;
  };

  const validateStep = (
    s: EditorStep,
  ): { e: Errors; ve: VariantErrorMap } => {
    const all = s === STEP_REVIEW;
    const e: Errors = {};
    let ve: VariantErrorMap = {};
    if (s === STEP_PHOTOS || all) {
      if (!draft.name.trim()) e.name = t("productNameRequired");
      if (!draft.brand.trim()) e.brand = t("productBrandRequired");
      if (!photoLimits.mainAllowed && images.length > 0) {
        e.photos = t("mpPfMainPhotosBlocked");
      } else if (variants.length <= 4 && totalPhotos > MAX_PRODUCT_PHOTOS) {
        e.photos = t("mpPfPhotosLimit", { count: MAX_PRODUCT_PHOTOS });
      }
    }
    // The API rejects a product without a description.
    if ((s === STEP_DETAILS || all) && !draft.description.trim()) {
      e.description = t("productDescriptionRequired");
    }
    if (s === STEP_PRICE || all) {
      if (!(price > 0)) e.price = t("productPriceRequired");
      else if (sale != null && sale >= price) e.sale = t("mpPfSaleBelowPrice");
      if (!hasVariants && stock < 0) e.inventory = t("productInventoryInvalid");
      // 0 would never warn before the product is sold out
      if (draft.lowStockAlertEnabled && threshold < 1) {
        e.threshold = t("productThresholdMin");
      }
    }
    if (s === STEP_OPTIONS || all) ve = validateVariants();
    return { e, ve };
  };

  const firstStepWithError = (e: Errors, ve: VariantErrorMap): EditorStep => {
    if (e.name || e.brand || e.photos) return STEP_PHOTOS;
    if (e.description || e.category || e.benefits) return STEP_DETAILS;
    if (e.price || e.sale || e.inventory || e.threshold || e.cost) return STEP_PRICE;
    if (Object.keys(ve).length) return STEP_OPTIONS;
    return STEP_MARKETPLACE;
  };

  // ── Navigation ──────────────────────────────────────────────────────

  const goTo = useCallback((next: EditorStep, dir: 1 | -1) => {
    Keyboard.dismiss();
    setDirection(dir);
    setStep(next);
  }, []);

  const goNext = () => {
    const { e, ve } = validateStep(step);
    setErrors(e);
    setVariantErrors(ve);
    if (Object.keys(e).length || Object.keys(ve).length) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }
    if (fromReview) {
      setFromReview(isEdit);
      goTo(STEP_REVIEW, 1);
      return;
    }
    goTo(Math.min(step + 1, STEP_REVIEW) as EditorStep, 1);
  };

  const editSection = (s: EditorStep) => {
    setFromReview(true);
    goTo(s, -1);
  };

  const allowLeaveRef = useRef(false);

  /** One step back; false when there is nothing left to go back to. */
  const stepBack = useCallback((): boolean => {
    if (submitting) return true;
    if (step === STEP_REVIEW) {
      if (isEdit) return false;
      goTo(STEP_MARKETPLACE, -1);
      return true;
    }
    if (fromReview) {
      setFromReview(isEdit);
      goTo(STEP_REVIEW, 1);
      return true;
    }
    if (step === STEP_PHOTOS) return false;
    goTo((step - 1) as EditorStep, -1);
    return true;
  }, [fromReview, goTo, isEdit, step, submitting]);

  const leave = useCallback(() => {
    allowLeaveRef.current = true;
    router.back();
  }, [router]);

  const confirmLeave = useCallback(
    (onLeave: () => void) => {
      if (!dirty) {
        onLeave();
        return;
      }
      Alert.alert(
        isEdit ? t("productDiscardEditsTitle") : t("productDiscardTitle"),
        isEdit ? t("flowDiscardEditsMessage") : t("productDiscardMessage"),
        [
          { text: t("flowKeepEditing"), style: "cancel" },
          { text: t("flowDiscard"), style: "destructive", onPress: onLeave },
        ],
      );
    },
    [dirty, isEdit, t],
  );

  const onHeaderBack = useCallback(() => {
    if (stepBack()) return;
    confirmLeave(leave);
  }, [confirmLeave, leave, stepBack]);

  // Swipe-back / Android back: step back first, then confirm unsaved changes.
  const guardRef = useRef({ stepBack, confirmLeave, submitting });
  guardRef.current = { stepBack, confirmLeave, submitting };
  useEffect(() => {
    const unsubscribe = navigation.addListener("beforeRemove", (event: any) => {
      if (allowLeaveRef.current) return;
      const type = event?.data?.action?.type;
      if (type !== "GO_BACK" && type !== "POP") return;
      event.preventDefault();
      if (guardRef.current.stepBack()) return;
      guardRef.current.confirmLeave(() => {
        allowLeaveRef.current = true;
        navigation.dispatch(event.data.action);
      });
    });
    return unsubscribe;
  }, [navigation]);

  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener("hardwareBackPress", () => {
        onHeaderBack();
        return true;
      });
      return () => sub.remove();
    }, [onHeaderBack]),
  );

  const submit = (publish: boolean) => {
    Keyboard.dismiss();
    if (submitting) return;
    const { e, ve } = validateStep(STEP_REVIEW);
    if (Object.keys(e).length || Object.keys(ve).length) {
      setErrors(e);
      setVariantErrors(ve);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      // Jump to the first step with a problem
      setFromReview(true);
      goTo(firstStepWithError(e, ve), -1);
      return;
    }
    if (publish && !isLive && !deliveryConfigured) {
      setSubmitError(t("setDeliveryBeforePublish"));
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }
    setSubmitError(null);
    allowLeaveRef.current = true;
    setSubmitAction(publish ? "publish" : "draft");
    onSubmit(finalDraft, publish);
  };

  // A failed save keeps the screen; let back guards work again.
  useEffect(() => {
    if (!submitting) allowLeaveRef.current = false;
  }, [submitting]);

  // 422 from the server: show the first message and jump to its step.
  const variantsRef = useRef(variants);
  variantsRef.current = variants;
  useEffect(() => {
    if (!serverError) return;
    const entries = Object.entries(serverError.errors ?? {});
    const messageOf = (v: string[] | string) =>
      Array.isArray(v) ? String(v[0] ?? "") : String(v ?? "");
    const first = entries[0];
    setSubmitError(
      (first ? messageOf(first[1]) : "") ||
        serverError.message ||
        t("somethingWentWrong"),
    );
    if (!first) return;
    const fieldErrors: Errors = {};
    const optionErrors: VariantErrorMap = {};
    entries.forEach(([key, value]) => {
      const message = messageOf(value);
      const target = mapServerErrorKey(key);
      if (target.field && !fieldErrors[target.field]) {
        fieldErrors[target.field] = message;
      }
      if (target.variantIndex != null && target.variantField) {
        const option = variantsRef.current[target.variantIndex];
        if (option && !optionErrors[option.key]?.[target.variantField]) {
          optionErrors[option.key] = {
            ...optionErrors[option.key],
            [target.variantField]: message,
          };
        }
      }
    });
    setErrors(fieldErrors);
    setVariantErrors(optionErrors);
    const target = mapServerErrorKey(first[0]);
    if (target.step !== STEP_REVIEW) {
      setFromReview(true);
      goTo(target.step, -1);
    }
    // Only a new failed save (nonce) re-runs this.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverError?.nonce]);

  const openDelivery = () =>
    router.push(
      "/(main)/dashboard/(account)/(businessProfileSettings)/deliveryOptions" as any,
    );

  // ── Photos ──────────────────────────────────────────────────────────

  const openPicker = (target: string) => {
    Keyboard.dismiss();
    pickerTargetRef.current = target;
    setPickerOpen(true);
  };

  const addPhotos = (uris: string[]) => {
    const target = pickerTargetRef.current;
    pickerTargetRef.current = null;
    setPickerOpen(false);
    if (!target || !uris.length) return;
    if (target === "product") {
      if (!photoLimits.mainAllowed) return;
      const mainRoom = Math.max(0, photoLimits.mainMax - images.length);
      const room = variants.length <= 4
        ? Math.min(mainRoom, sharedRoom)
        : 0;
      setDraft((prev) => ({
        ...prev,
        images: withNewImages(prev.images ?? [], uris, (prev.images ?? []).length + room),
      }));
      setSubmitError(null);
      if (uris.length > room) {
        setErrors((prev) => ({
          ...prev,
          photos: t("mpPfPhotosLimit", { count: MAX_PRODUCT_PHOTOS }),
        }));
      } else {
        clearError("photos");
      }
      return;
    }
    const option = variants.find((v) => v.key === target);
    const maxPerOpt = photoLimits.perOption;
    const optRoom = Math.max(0, maxPerOpt - (option?.images.length ?? 0));
    const room = variants.length <= 4
      ? Math.min(optRoom, sharedRoom)
      : optRoom;
    setVariants((prev) =>
      prev.map((v) =>
        v.key === target
          ? { ...v, images: withNewImages(v.images, uris, v.images.length + room) }
          : v,
      ),
    );
    setVariantErrors((prev) => {
      if (!prev[target]?.photos) return prev;
      const { photos: _p, ...rest } = prev[target]!;
      return { ...prev, [target]: rest };
    });
    setSubmitError(null);
  };

  const removeProductPhoto = (index: number) => {
    const next = withoutImage(images, draft.removedImageIds ?? [], index);
    setDraft((prev) => ({
      ...prev,
      images: next.images,
      removedImageIds: next.removedImageIds,
    }));
    clearError("photos");
    setSubmitError(null);
  };

  // ── Options ─────────────────────────────────────────────────────────

  const updateVariant = (key: string, patch: Partial<VariantForm>) => {
    setVariants((prev) =>
      prev.map((v) => (v.key === key ? { ...v, ...patch } : v)),
    );
    setSubmitError(null);
    const cleared = (Object.keys(patch) as (keyof VariantForm)[]).flatMap(
      (k) => VARIANT_PATCH_ERRORS[k] ?? [],
    );
    if (!cleared.length) return;
    setVariantErrors((prev) => {
      const out: VariantErrorMap = {};
      Object.entries(prev).forEach(([k, v]) => {
        const next = { ...v };
        if (k === key) cleared.forEach((c) => delete next[c]);
        // A renamed option can clear a "duplicate name" error on another one
        else if (patch.name !== undefined) delete next.name;
        if (Object.keys(next).length) out[k] = next;
      });
      return out;
    });
  };

  const removeVariantPhoto = (key: string, index: number) => {
    const option = variants.find((v) => v.key === key);
    if (!option) return;
    updateVariant(key, withoutImage(option.images, option.removedImageIds, index));
  };

  const addVariant = () => {
    const newCount = variants.length + 1;
    if (newCount >= 5 && (images.length > 0 || variants.some((v) => v.images.length > 1))) {
      Alert.alert(
        t("mpPfPhotoLimitChangeTitle"),
        t("mpPfPhotoLimitChangeMessage"),
        [
          { text: t("cancel"), style: "cancel" },
          {
            text: t("mpPfAddOptionAnyway"),
            onPress: () => {
              void Haptics.selectionAsync();
              setVariants((prev) => [...prev, emptyVariantForm()]);
              setSubmitError(null);
            },
          },
        ],
      );
      return;
    }
    void Haptics.selectionAsync();
    setVariants((prev) => [...prev, emptyVariantForm()]);
    setSubmitError(null);
  };

  const removeVariant = (option: VariantForm) => {
    const drop = () => {
      setVariants((prev) => prev.filter((v) => v.key !== option.key));
      setVariantErrors((prev) => {
        if (!prev[option.key]) return prev;
        const next = { ...prev };
        delete next[option.key];
        return next;
      });
      setSubmitError(null);
    };
    // Saved options lose their stock and photos on save — ask first.
    if (option.id == null) {
      drop();
      return;
    }
    Alert.alert(
      t("mpPfRemoveOptionTitle"),
      t("mpPfRemoveOptionMessage", { name: option.name.trim() || "" }),
      [
        { text: t("cancel"), style: "cancel" },
        { text: t("remove"), style: "destructive", onPress: drop },
      ],
    );
  };

  // ── Steps ───────────────────────────────────────────────────────────

  const renderPhotoAndName = () => {
    const mainBlocked = !photoLimits.mainAllowed;
    const mainCap = mainBlocked ? 0 : Math.min(MAX_PRODUCT_PHOTOS, photoLimits.mainMax);
    return (
    <>
      <FlowTitle
        title={t("productFlowNameTitle")}
        subtitle={t("mpPfPhotosSubtitle")}
      />
      <View style={styles.section}>
        {mainBlocked && images.length > 0 ? (
          <>
            <InfoNote
              icon="info"
              tone="warm"
              text={t("mpPfMainPhotosBlocked")}
            />
            <PhotoSlots
              images={images}
              max={images.length}
              onAdd={() => {}}
              onRemove={removeProductPhoto}
              error={errors.photos}
              disabled={submitting}
            />
          </>
        ) : mainBlocked ? (
          <InfoNote
            icon="info"
            tone="warm"
            text={t("mpPfMainPhotosBlocked")}
          />
        ) : (
          <>
            <SectionLabel
              label={t("photos")}
              meta={`${t("optional")} · ${totalPhotos}/${MAX_PRODUCT_PHOTOS}`}
            />
            <PhotoSlots
              images={images}
              max={Math.max(images.length, mainCap)}
              onAdd={() => openPicker("product")}
              onRemove={removeProductPhoto}
              error={errors.photos}
              disabled={submitting || (sharedRoom <= 0 && images.length === 0)}
            />
            {hasVariants && variants.length <= 4 ? (
              <Text style={styles.hint}>
                {t("mpPfPhotosSharedHint", { count: MAX_PRODUCT_PHOTOS })}
              </Text>
            ) : (
              <Text style={styles.hint}>{t("mpPfPhotosHint")}</Text>
            )}
          </>
        )}
      </View>
      <TapField
        label={t("productName")}
        required
        value={draft.name}
        onChangeText={(v) => {
          update("name", v);
          clearError("name");
        }}
        placeholder={t("productNamePlaceholder")}
        autoCapitalize="words"
        returnKeyType="next"
        submitBehavior="submit"
        onSubmitEditing={() => brandRef.current?.focus()}
        maxLength={120}
        error={errors.name}
      />
      <TapField
        ref={brandRef}
        label={t("productBrand")}
        required
        value={draft.brand}
        onChangeText={(v) => {
          update("brand", v);
          clearError("brand");
        }}
        placeholder={t("productBrandPlaceholder")}
        autoCapitalize="words"
        returnKeyType="next"
        onSubmitEditing={goNext}
        maxLength={80}
        error={errors.brand}
      />
    </>
  );
  };

  const renderCategoryAndDetails = () => (
    <>
      <FlowTitle
        title={t("productFlowDetailsTitle")}
        subtitle={t("productFlowDetailsSubtitle")}
      />
      <View style={styles.section}>
        <SectionLabel label={t("productCategory")} required />
        {categoryOptions == null ? (
          <View style={styles.categoryLoading}>
            <ActivityIndicator color={theme.darkGreen} />
          </View>
        ) : (
          <View style={styles.categoryGrid} accessibilityRole="radiogroup">
            {categoryOptions.map((cat) => {
              const active = draft.category === cat;
              return (
                <TouchableOpacity
                  key={cat}
                  activeOpacity={0.8}
                  style={[styles.categoryTile, active && styles.categoryTileActive]}
                  onPress={() => {
                    void Haptics.selectionAsync();
                    update("category", cat);
                    clearError("category");
                  }}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: active }}
                  accessibilityLabel={cat}
                >
                  <MaterialIcons
                    name={getCategoryIcon(cat)}
                    size={moderateWidthScale(22)}
                    color={active ? theme.white : theme.selectCard}
                  />
                  <Text
                    style={[styles.categoryText, active && styles.categoryTextActive]}
                    numberOfLines={2}
                  >
                    {cat}
                  </Text>
                  {active ? (
                    <MaterialIcons
                      name="check-circle"
                      size={moderateWidthScale(18)}
                      color={theme.white}
                    />
                  ) : null}
                </TouchableOpacity>
              );
            })}
          </View>
        )}
        {errors.category ? (
          <Text style={styles.fieldError}>{errors.category}</Text>
        ) : null}
      </View>
      <TapField
        label={t("productDescription")}
        required
        value={draft.description}
        onChangeText={(v) => {
          update("description", v);
          clearError("description");
        }}
        placeholder={t("productDescriptionPlaceholder")}
        multiline
        maxCount={500}
        helper={t("productDescriptionHelper")}
        error={errors.description}
        scrollEnabled={false}
      />
      <BenefitsEditor
        benefits={benefits}
        onChange={(next) => {
          update("benefits", next);
          clearError("benefits");
        }}
        error={errors.benefits}
      />
    </>
  );

  const bumpStock = (delta: number) => {
    void Haptics.selectionAsync();
    setStockText(String(Math.max(0, stock + delta)));
    clearError("inventory", "threshold");
  };

  const renderPriceAndStock = () => {
    const profit = buyerPrice > 0 && cost > 0 ? buyerPrice - cost : null;
    return (
      <>
        <FlowTitle
          title={t("productFlowPriceTitle")}
          subtitle={t("productFlowPriceSubtitle")}
        />
        <View style={styles.row2}>
          <TapField
            containerStyle={styles.half}
            label={t("sellingPrice")}
            required
            prefix="$"
            value={priceText}
            onChangeText={(v) => {
              setPriceText(cleanMoney(v));
              setSubmitError(null);
              clearError("price", "sale");
            }}
            keyboardType="decimal-pad"
            placeholder="20.00"
            returnKeyType="next"
            onSubmitEditing={() => saleRef.current?.focus()}
            error={errors.price}
          />
          <TapField
            ref={saleRef}
            containerStyle={styles.half}
            label={t("mpPfSalePrice")}
            prefix="$"
            value={saleText}
            onChangeText={(v) => {
              setSaleText(cleanMoney(v));
              setSubmitError(null);
              clearError("sale");
            }}
            keyboardType="decimal-pad"
            placeholder={t("optional")}
            returnKeyType="next"
            onSubmitEditing={() => costRef.current?.focus()}
            error={errors.sale}
          />
        </View>
        {saleValid ? (
          <View style={styles.buyerSees}>
            <MaterialIcons
              name="local-offer"
              size={moderateWidthScale(18)}
              color={theme.selectCard}
            />
            <Text style={styles.buyerSeesLabel}>{t("mpPfBuyersSee")}</Text>
            <ProductPrice price={sale!} regular={price} onSale size="sm" />
          </View>
        ) : null}
        <TapField
          ref={costRef}
          label={t("productYourCost")}
          prefix="$"
          value={costText}
          onChangeText={(v) => {
            setCostText(cleanMoney(v));
            setSubmitError(null);
          }}
          keyboardType="decimal-pad"
          placeholder="12.00"
          helper={t("optional")}
          error={errors.cost}
        />
        {profit != null ? (
          <View style={styles.profit}>
            <MaterialIcons
              name={profit >= 0 ? "trending-up" : "trending-down"}
              size={moderateWidthScale(20)}
              color={profit >= 0 ? theme.buttonBack : theme.red}
            />
            <Text style={styles.profitText}>
              {profit >= 0
                ? t("productProfitPerSale", { amount: formatShopPrice(profit) })
                : t("productLossPerSale", {
                    amount: formatShopPrice(Math.abs(profit)),
                  })}
            </Text>
          </View>
        ) : null}

        <View style={styles.section}>
          <SectionLabel label={t("inventoryCount")} required={!hasVariants} />
          {hasVariants ? (
            <>
              <InfoNote
                icon="layers"
                title={t("mpPfStockFromOptions")}
                text={t("mpPfStockFromOptionsBody", {
                  count: variantStock,
                  options: variants.length,
                })}
              />
              <TouchableOpacity
                style={styles.linkBtn}
                activeOpacity={0.8}
                onPress={() => editSection(STEP_OPTIONS)}
                accessibilityRole="button"
              >
                <MaterialIcons
                  name="tune"
                  size={moderateWidthScale(18)}
                  color={theme.darkGreen}
                />
                <Text style={styles.linkText}>{t("mpPfEditOptions")}</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <View
                style={[styles.stepper, !!errors.inventory && styles.stepperError]}
              >
                <TouchableOpacity
                  style={styles.stepperBtn}
                  onPress={() => bumpStock(-1)}
                  disabled={stock <= 0}
                  accessibilityRole="button"
                  accessibilityLabel={t("productStockLess")}
                  accessibilityState={{ disabled: stock <= 0 }}
                >
                  <MaterialIcons
                    name="remove"
                    size={moderateWidthScale(26)}
                    color={stock <= 0 ? theme.lightGreen5 : theme.darkGreen}
                  />
                </TouchableOpacity>
                <TextInput
                  ref={stockInputRef}
                  style={styles.stepperInput}
                  value={stockText}
                  onChangeText={(v) => {
                    setStockText(cleanInt(v));
                    setSubmitError(null);
                    clearError("inventory", "threshold");
                  }}
                  onBlur={() => !stockText && setStockText("0")}
                  keyboardType="number-pad"
                  selectTextOnFocus
                  accessibilityLabel={t("inventoryCount")}
                />
                <TouchableOpacity
                  style={styles.stepperBtn}
                  onPress={() => bumpStock(1)}
                  accessibilityRole="button"
                  accessibilityLabel={t("productStockMore")}
                >
                  <MaterialIcons
                    name="add"
                    size={moderateWidthScale(26)}
                    color={theme.darkGreen}
                  />
                </TouchableOpacity>
              </View>
              {errors.inventory ? (
                <Text style={styles.fieldError}>{errors.inventory}</Text>
              ) : null}
            </>
          )}
        </View>

        <ToggleRow
          title={t("lowStockAlert")}
          subtitle={t("lowStockAlertHint")}
          value={draft.lowStockAlertEnabled}
          onValueChange={(v) => {
            update("lowStockAlertEnabled", v);
            clearError("threshold");
          }}
        />
        {draft.lowStockAlertEnabled ? (
          <TapField
            label={t("lowStockThreshold")}
            value={thresholdText}
            onChangeText={(v) => {
              setThresholdText(cleanInt(v));
              setSubmitError(null);
              clearError("threshold");
            }}
            onBlur={() => !thresholdText && setThresholdText("0")}
            keyboardType="number-pad"
            placeholder="5"
            error={errors.threshold}
            // Allowed, but say so: the product is "Low stock" straight away
            helper={
              threshold >= 1 && totalStock <= threshold
                ? t("productThresholdAlreadyLow", { count: totalStock })
                : null
            }
          />
        ) : null}
      </>
    );
  };

  const renderOptions = () => (
    <>
      <FlowTitle
        title={t("mpPfOptionsTitle")}
        subtitle={t("mpPfOptionsSubtitle")}
      />
      <InfoNote icon="sell" text={t("mpPfOptionsPriceNote")} />
      {variants.length === 0 ? (
        <FlowCard style={styles.noOptions}>
          <View style={styles.noOptionsIcon}>
            <MaterialIcons
              name="palette"
              size={moderateWidthScale(26)}
              color={theme.darkGreen}
            />
          </View>
          <Text style={styles.noOptionsTitle}>{t("mpPfNoOptionsTitle")}</Text>
          <Text style={styles.noOptionsText}>{t("mpPfNoOptionsBody")}</Text>
        </FlowCard>
      ) : (
        variants.map((option, index) => (
          <VariantCard
            key={option.key}
            index={index}
            form={option}
            maxPhotos={Math.max(option.images.length, photoLimits.perOption)}
            errors={variantErrors[option.key]}
            onChange={(patch) => updateVariant(option.key, patch)}
            onRemove={() => removeVariant(option)}
            onAddPhotos={() => openPicker(option.key)}
            onRemovePhoto={(i) => removeVariantPhoto(option.key, i)}
            disabled={submitting}
          />
        ))
      )}
      <TouchableOpacity
        style={styles.addOption}
        activeOpacity={0.8}
        onPress={addVariant}
        disabled={submitting}
        accessibilityRole="button"
      >
        <MaterialIcons
          name="add-circle-outline"
          size={moderateWidthScale(22)}
          color={theme.darkGreen}
        />
        <Text style={styles.addOptionText}>
          {variants.length ? t("mpPfAddAnotherOption") : t("mpPfAddOption")}
        </Text>
      </TouchableOpacity>
    </>
  );

  const renderMarketplace = () => {
    const inMarketplace = draft.showInMarketplace === true;
    const featuredOn =
      inMarketplace && !featuredBlocked && draft.featuredRequested === true;
    return (
      <>
        <FlowTitle
          title={t("mpPfMarketplaceTitle")}
          subtitle={t("mpPfMarketplaceSubtitle")}
        />
        {isEdit ? <ModerationBanner moderation={moderation} /> : null}
        <SwitchCard
          icon="storefront"
          title={t("mpPfShowInMarketplace")}
          subtitle={t("mpPfShowInMarketplaceHint")}
          value={inMarketplace}
          onValueChange={(v) => {
            void Haptics.selectionAsync();
            update("showInMarketplace", v);
            clearError("marketplace", "featured");
          }}
          disabled={submitting}
        />
        <InfoNote icon="spa" tone="warm" text={t("mpCosmetologyNote")} />
        {errors.marketplace ? (
          <Text style={styles.fieldError}>{errors.marketplace}</Text>
        ) : null}
        {inMarketplace ? (
          <InfoNote icon="percent" text={t("mpPfMarketplaceFeeNote")} />
        ) : null}
        {inMarketplace && images.length === 0 ? (
          <InfoNote
            icon="add-a-photo"
            tone="warm"
            text={t("mpPfMarketplaceNoPhoto")}
          />
        ) : null}
        <SwitchCard
          icon="star"
          title={t("mpPfNominateFeatured")}
          subtitle={
            featuredBlocked
              ? t("mpPfFeaturedBlocked")
              : inMarketplace
                ? t("mpPfFeaturedHint")
                : t("mpPfFeaturedNeedsMarketplace")
          }
          value={featuredOn}
          onValueChange={(v) => {
            void Haptics.selectionAsync();
            update("featuredRequested", v);
            clearError("featured");
          }}
          disabled={submitting || featuredBlocked || !inMarketplace}
        />
        {errors.featured ? (
          <Text style={styles.fieldError}>{errors.featured}</Text>
        ) : null}
        <InfoNote icon="movie" text={t("mpPfReelsEitherWay")} />
      </>
    );
  };

  const reviewRow = (
    label: string,
    content: React.ReactNode,
    target: EditorStep,
  ) => (
    <View key={label} style={styles.reviewRow}>
      <View style={styles.reviewRowText}>
        <Text style={styles.reviewLabel}>{label}</Text>
        {typeof content === "string" ? (
          <Text style={styles.reviewValue} numberOfLines={4}>
            {content}
          </Text>
        ) : (
          content
        )}
      </View>
      <TouchableOpacity
        style={styles.reviewEdit}
        onPress={() => editSection(target)}
        hitSlop={6}
        disabled={submitting}
        accessibilityRole="button"
        accessibilityLabel={`${t("edit")} ${label}`}
      >
        <Text style={styles.reviewEditText}>{t("edit")}</Text>
      </TouchableOpacity>
    </View>
  );

  const renderReview = () => {
    const stockLine = hasVariants
      ? t("mpPfStockAcrossOptions", { count: variantStock, options: variants.length })
      : draft.lowStockAlertEnabled
        ? t("productStockWithAlert", { count: stock, threshold })
        : t("productStockCount", { count: stock });
    const priceParts = [formatShopPrice(price)];
    if (saleValid) priceParts.push(t("mpPfOnSaleFor", { amount: formatShopPrice(sale!) }));
    if (cost > 0) {
      priceParts.push(t("productCostLine", { amount: formatShopPrice(cost) }));
    }
    const inMarketplace = draft.showInMarketplace === true;
    const featuredOn =
      inMarketplace && !featuredBlocked && draft.featuredRequested === true;
    const cleanBenefits = benefits.map((b) => b.trim()).filter(Boolean);
    return (
      <>
        <FlowTitle
          title={isEdit ? t("editProduct") : t("productFlowReviewTitle")}
          subtitle={
            isEdit
              ? t("productFlowReviewSubtitleEdit")
              : t("productFlowReviewSubtitle")
          }
        />
        {isEdit ? <ModerationBanner moderation={moderation} /> : null}
        <FlowCard style={styles.reviewCard}>
          <TouchableOpacity
            style={styles.reviewHero}
            activeOpacity={0.85}
            onPress={() => editSection(STEP_PHOTOS)}
            disabled={submitting}
            accessibilityRole="button"
            accessibilityHint={t("edit")}
          >
            <View style={styles.reviewThumb}>
              {images[0] ? (
                <AppImage
                  uri={images[0].uri}
                  style={styles.reviewThumbImage}
                  resizeMode="cover"
                />
              ) : (
                <MaterialIcons
                  name="image"
                  size={moderateWidthScale(30)}
                  color={theme.lightGreen5}
                />
              )}
            </View>
            <View style={styles.reviewHeroText}>
              <Text style={styles.reviewName} numberOfLines={2}>
                {finalDraft.name}
              </Text>
              <Text style={styles.reviewMeta} numberOfLines={1}>
                {finalDraft.brand} · {draft.category}
              </Text>
              <ProductPrice
                price={buyerPrice}
                regular={price}
                onSale={saleValid}
                size="md"
                style={styles.reviewPrice}
              />
            </View>
            <MaterialIcons
              name="edit"
              size={moderateWidthScale(20)}
              color={theme.lightGreen}
            />
          </TouchableOpacity>
          {images.length > 1 ? (
            <View style={styles.strip}>
              {images.map((img, i) => (
                <View
                  key={`${img.id ?? "n"}-${img.uri}`}
                  style={[styles.stripThumb, i === 0 && styles.stripThumbMain]}
                >
                  <AppImage
                    uri={img.uri}
                    style={styles.reviewThumbImage}
                    resizeMode="cover"
                  />
                </View>
              ))}
            </View>
          ) : null}
          {reviewRow(
            t("productDescription"),
            finalDraft.description || t("productNoDescription"),
            STEP_DETAILS,
          )}
          {reviewRow(
            t("mpPfBenefits"),
            cleanBenefits.length ? (
              <View style={{ gap: moderateHeightScale(4) }}>
                {cleanBenefits.map((b, i) => (
                  <View key={`${i}-${b}`} style={styles.tickRow}>
                    <MaterialIcons
                      name="check-circle"
                      size={moderateWidthScale(18)}
                      color={theme.successGreen}
                      style={styles.tickIcon}
                    />
                    <Text style={[styles.reviewValue, styles.half]}>{b}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={[styles.reviewValue, styles.reviewValueMuted]}>
                {t("mpPfNoBenefits")}
              </Text>
            ),
            STEP_DETAILS,
          )}
          {reviewRow(t("sellingPrice"), priceParts.join(" · "), STEP_PRICE)}
          {reviewRow(
            t("inventoryCount"),
            stockLine,
            hasVariants ? STEP_OPTIONS : STEP_PRICE,
          )}
          {reviewRow(
            t("mpPfOptions"),
            hasVariants ? (
              <View style={{ gap: moderateHeightScale(2) }}>
                {variantDrafts.map((v) => {
                  const own = v.sellingPrice;
                  const pricePart =
                    own != null
                      ? v.salePrice != null
                        ? t("mpPfOnSaleFor", { amount: formatShopPrice(v.salePrice) })
                        : formatShopPrice(own)
                      : null;
                  return (
                    <Text key={v.key} style={styles.reviewValue} numberOfLines={2}>
                      {[
                        v.name,
                        t("productStockCount", { count: v.inventoryCount }),
                        pricePart,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </Text>
                  );
                })}
              </View>
            ) : (
              <Text style={[styles.reviewValue, styles.reviewValueMuted]}>
                {t("mpPfNoOptionsShort")}
              </Text>
            ),
            STEP_OPTIONS,
          )}
          {reviewRow(
            t("mpPfMarketplace"),
            <View style={{ gap: moderateHeightScale(2) }}>
              <View style={styles.statusRow}>
                <MaterialIcons
                  name={inMarketplace ? "storefront" : "visibility-off"}
                  size={moderateWidthScale(18)}
                  color={inMarketplace ? theme.successGreen : theme.lightGreen}
                />
                <Text style={[styles.reviewValue, styles.half]}>
                  {inMarketplace ? t("mpPfInMarketplaceOn") : t("mpPfInMarketplaceOff")}
                </Text>
              </View>
              {featuredOn ? (
                <View style={styles.statusRow}>
                  <MaterialIcons
                    name="star"
                    size={moderateWidthScale(18)}
                    color={theme.orangeBrown}
                  />
                  <Text style={[styles.reviewValue, styles.half]}>
                    {t("mpPfFeaturedNominated")}
                  </Text>
                </View>
              ) : null}
            </View>,
            STEP_MARKETPLACE,
          )}
        </FlowCard>

        <View style={styles.section}>
          <SectionLabel label={t("delivery")} />
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={openDelivery}
            disabled={submitting}
            accessibilityRole="button"
          >
            <FlowCard
              style={[styles.delivery, !deliveryConfigured && styles.deliveryWarn]}
            >
              <MaterialIcons
                name={deliveryConfigured ? "local-shipping" : "warning-amber"}
                size={moderateWidthScale(24)}
                color={deliveryConfigured ? theme.darkGreen : theme.selectCard}
              />
              <View style={styles.deliveryText}>
                {deliveryConfigured ? (
                  deliveryLines.map((line) => (
                    <Text key={line.label} style={styles.deliveryLine}>
                      {line.label}
                    </Text>
                  ))
                ) : (
                  <Text style={styles.deliveryLine}>
                    {t("deliveryNotSetHint")}
                  </Text>
                )}
                <Text style={styles.deliveryHint}>
                  {t("deliveryAppliesToAll")}
                </Text>
              </View>
              <Text style={styles.reviewEditText}>
                {deliveryConfigured ? t("edit") : t("setUp")}
              </Text>
            </FlowCard>
          </TouchableOpacity>
        </View>
      </>
    );
  };

  // ── Footer ──────────────────────────────────────────────────────────

  const NEXT_LABELS: Record<number, string> = {
    [STEP_PHOTOS]: t("productFlowNextDetails"),
    [STEP_DETAILS]: t("productFlowNextPrice"),
    [STEP_PRICE]: t("mpPfNextOptions"),
    [STEP_OPTIONS]: t("mpPfNextMarketplace"),
    [STEP_MARKETPLACE]: t("productFlowNextReview"),
  };
  const nextLabel =
    fromReview && step !== STEP_REVIEW
      ? t("productFlowBackToReview")
      : (NEXT_LABELS[step] ?? t("productFlowNextReview"));

  type FooterAction = React.ComponentProps<typeof FlowFooter>["primary"];
  const footerPrimary: FooterAction =
    step === STEP_REVIEW
      ? {
          label: isLive ? t("saveChanges") : t("publishProduct"),
          icon: isLive ? "check" : "storefront",
          onPress: () => submit(true),
          loading: submitting && submitAction === "publish",
          disabled: submitting,
        }
      : {
          label: nextLabel,
          icon: fromReview ? "check" : undefined,
          trailingIcon: fromReview ? undefined : "chevron-right",
          onPress: goNext,
          disabled: submitting,
        };

  // Review (new / draft): "Save as draft" and "Publish" share one row.
  const footerSecondary: FooterAction | null =
    step === STEP_REVIEW && !isLive
      ? {
          label: t("saveAsDraft"),
          onPress: () => submit(false),
          loading: submitting && submitAction === "draft",
          disabled: submitting,
        }
      : null;

  const Entering = direction === 1 ? FadeInRight : FadeInLeft;

  return (
    <View style={styles.root}>
      <FlowHeader
        title={isEdit ? t("editProduct") : t("addProduct")}
        step={{ current: step + 1, total: EDITOR_TOTAL_STEPS }}
        onBack={onHeaderBack}
        backDisabled={submitting}
        backIcon={
          step === STEP_PHOTOS || (isEdit && step === STEP_REVIEW) ? "close" : "back"
        }
      />
      <KeyboardAwareScrollView
        key={step}
        style={styles.flex}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        showsVerticalScrollIndicator={false}
        bottomOffset={moderateHeightScale(32)}
      >
        <Animated.View
          style={styles.stepBody}
          entering={Entering.duration(240).reduceMotion(ReduceMotion.System)}
        >
          {step === STEP_PHOTOS
            ? renderPhotoAndName()
            : step === STEP_DETAILS
              ? renderCategoryAndDetails()
              : step === STEP_PRICE
                ? renderPriceAndStock()
                : step === STEP_OPTIONS
                  ? renderOptions()
                  : step === STEP_MARKETPLACE
                    ? renderMarketplace()
                    : renderReview()}
          {submitError ? (
            <InfoNote tone="error" icon="error-outline" text={submitError} />
          ) : null}
        </Animated.View>
      </KeyboardAwareScrollView>

      <View>
        <FlowFooter
          primary={footerPrimary}
          secondary={footerSecondary}
          row
        />
      </View>

      <ImagePickerModal
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        allowsMultipleSelection
        quality={0.7}
        title={t("mpPfAddPhotos")}
        onImageSelected={(uri) => addPhotos([uri])}
        onImagesSelected={addPhotos}
      />
    </View>
  );
}
