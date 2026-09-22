import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { MaterialIcons } from "@expo/vector-icons";
import { useAppDispatch, useAppSelector, useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  moderateHeightScale,
  moderateWidthScale,
  widthScale,
} from "@/src/theme/dimensions";
import StackHeader from "@/src/components/StackHeader";
import CustomToggle from "@/src/components/customToggle";
import { useNotificationContext } from "@/src/contexts/NotificationContext";
import { ApiService } from "@/src/services/api";
import { businessEndpoints } from "@/src/services/endpoints";
import Logger from "@/src/services/logger";
import {
  createReel,
  getMyReel,
  publishReel,
  unpublishReel,
  updateReel,
} from "@/src/services/reelsService";
import { uploadVideo, waitForMediaReady } from "@/src/services/mediaLibraryService";
import { fetchUserStatus } from "@/src/state/thunks/businessThunks";
import type { MediaUploadSourceType } from "@/src/types/media";
import type { OwnerReel } from "@/src/types/reels";

type CategoryOption = { id: number; name: string };
type ServiceOption = { id: number; name: string; price?: string | number };

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.background,
    },
    flex: { flex: 1 },
    content: {
      paddingHorizontal: moderateWidthScale(20),
      paddingTop: moderateHeightScale(8),
      paddingBottom: moderateHeightScale(20),
    },
    field: {
      marginBottom: moderateHeightScale(18),
    },
    labelRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: moderateHeightScale(8),
    },
    label: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
    },
    required: {
      color: theme.selectCard,
    },
    charCount: {
      fontSize: fontSize.size11,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen5,
    },
    input: {
      borderWidth: 1,
      borderColor: theme.lightGreen015,
      borderRadius: moderateWidthScale(12),
      paddingHorizontal: moderateWidthScale(14),
      paddingVertical: moderateHeightScale(12),
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.darkGreen,
      backgroundColor: theme.white,
    },
    textArea: {
      minHeight: moderateHeightScale(96),
      textAlignVertical: "top",
      lineHeight: fontSize.size20,
    },
    categoryShell: {
      borderRadius: moderateWidthScale(12),
      borderWidth: 1,
      borderColor: theme.lightGreen015,
      backgroundColor: theme.white,
      overflow: "hidden",
    },
    categoryRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: moderateWidthScale(12),
      paddingVertical: moderateHeightScale(12),
      gap: moderateWidthScale(10),
    },
    categoryDot: {
      width: widthScale(10),
      height: widthScale(10),
      borderRadius: widthScale(5),
      backgroundColor: theme.selectCard,
    },
    categoryTextCol: {
      flex: 1,
      gap: moderateHeightScale(1),
    },
    categoryMeta: {
      fontSize: fontSize.size11,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
    },
    categoryValue: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    categoryPickerWrap: {
      borderTopWidth: 1,
      borderTopColor: theme.lightGreen015,
      maxHeight: moderateHeightScale(220),
    },
    categoryLoading: {
      paddingVertical: moderateHeightScale(16),
      alignItems: "center",
    },
    categoryOption: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: moderateWidthScale(14),
      paddingVertical: moderateHeightScale(12),
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.lightGreen015,
    },
    categoryOptionActive: {
      backgroundColor: theme.lightGreen07,
    },
    categoryOptionText: {
      flex: 1,
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.darkGreen,
      paddingRight: moderateWidthScale(8),
    },
    categoryOptionTextActive: {
      fontFamily: fonts.fontBold,
    },
    chipRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: moderateWidthScale(8),
    },
    chip: {
      paddingHorizontal: moderateWidthScale(12),
      paddingVertical: moderateHeightScale(8),
      borderRadius: moderateWidthScale(18),
      backgroundColor: theme.white,
      borderWidth: 1,
      borderColor: theme.lightGreen015,
    },
    chipActive: {
      backgroundColor: theme.darkGreen,
      borderColor: theme.darkGreen,
    },
    chipText: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
    },
    chipTextActive: {
      color: theme.buttonText,
    },
    switchRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: theme.white,
      borderRadius: moderateWidthScale(12),
      borderWidth: 1,
      borderColor: theme.lightGreen015,
      paddingHorizontal: moderateWidthScale(14),
      paddingVertical: moderateHeightScale(12),
      gap: moderateWidthScale(12),
    },
    switchTextCol: {
      flex: 1,
      gap: moderateHeightScale(2),
    },
    switchLabel: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
    },
    switchHint: {
      fontSize: fontSize.size11,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
    },
    footer: {
      paddingHorizontal: moderateWidthScale(16),
      paddingTop: moderateHeightScale(10),
      paddingBottom: moderateHeightScale(14),
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.lightGreen015,
      backgroundColor: theme.background,
      gap: moderateHeightScale(8),
    },
    footerActions: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(10),
    },
    footerSecondary: {
      flex: 1,
      height: moderateHeightScale(44),
      borderRadius: moderateWidthScale(12),
      borderWidth: 1,
      borderColor: theme.darkGreen,
      backgroundColor: theme.white,
      alignItems: "center",
      justifyContent: "center",
    },
    footerSecondaryText: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    footerPrimary: {
      flex: 1.35,
      height: moderateHeightScale(44),
      borderRadius: moderateWidthScale(12),
      backgroundColor: theme.buttonBack,
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "row",
      gap: moderateWidthScale(6),
    },
    footerPrimaryText: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontBold,
      color: theme.buttonText,
    },
    footerDisabled: {
      opacity: 0.45,
    },
    unpublishLink: {
      alignSelf: "center",
      paddingVertical: moderateHeightScale(4),
      paddingHorizontal: moderateWidthScale(12),
    },
    unpublishLinkText: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontMedium,
      color: theme.lightGreen,
      textDecorationLine: "underline",
    },
    progressText: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
      textAlign: "center",
    },
    center: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
    },
  });

export default function PublishReelScreen() {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { showBanner } = useNotificationContext();
  const businessStatus = useAppSelector((s) => s.user.businessStatus);
  const completeProfileCategory = useAppSelector(
    (s) => s.completeProfile.businessCategory,
  );
  const selectBsnsCategory = useAppSelector((s) => s.user.selectBsnsCategory);

  /** Prefer live status, then onboarding slice, then persisted discovery pick. */
  const resolvedBusinessCategory = useMemo(() => {
    if (businessStatus?.business_category?.id != null) {
      return businessStatus.business_category;
    }
    if (completeProfileCategory?.id != null) {
      return completeProfileCategory;
    }
    const fromSelect = selectBsnsCategory?.[0];
    if (fromSelect?.id != null) {
      return fromSelect;
    }
    return null;
  }, [
    businessStatus?.business_category,
    completeProfileCategory,
    selectBsnsCategory,
  ]);

  const params = useLocalSearchParams<{
    mediaAssetId?: string;
    reelId?: string;
    videoUri?: string;
    mimeType?: string;
    fileName?: string;
    sourceType?: string;
  }>();
  const mediaAssetIdParam = params.mediaAssetId
    ? Number(params.mediaAssetId)
    : null;
  const localVideoUri = params.videoUri
    ? decodeURIComponent(params.videoUri)
    : "";
  const localMimeType = params.mimeType || "video/mp4";
  const localFileName = params.fileName || "video.mp4";
  const localSourceType: MediaUploadSourceType =
    params.sourceType === "camera" ? "camera" : "device";
  const reelId = params.reelId ? Number(params.reelId) : null;
  const isEdit = !!reelId;
  const fromEditor = !!localVideoUri && !mediaAssetIdParam;

  const [loading, setLoading] = useState(isEdit);
  const [savingDraft, setSavingDraft] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [unpublishing, setUnpublishing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [waitingForReady, setWaitingForReady] = useState(false);
  const isSubmitting = savingDraft || publishing || unpublishing;
  const [resolvedMediaAssetId, setResolvedMediaAssetId] = useState<
    number | null
  >(mediaAssetIdParam);
  const [caption, setCaption] = useState("");
  const [lookTag, setLookTag] = useState("");
  const [promotionText, setPromotionText] = useState("");
  const [productTag, setProductTag] = useState("");
  const [availableNow, setAvailableNow] = useState(false);
  const [categoryId, setCategoryId] = useState<number | null>(
    resolvedBusinessCategory?.id ?? null,
  );
  const [categoryName, setCategoryName] = useState(
    resolvedBusinessCategory?.name ?? "",
  );
  const [serviceId, setServiceId] = useState<number | null>(null);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [services, setServices] = useState<ServiceOption[]>([]);
  const [existing, setExisting] = useState<OwnerReel | null>(null);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const userPickedCategoryRef = useRef(false);

  useEffect(() => {
    (async () => {
      try {
        const svcRes = await ApiService.get<{
          success: boolean;
          data?: ServiceOption[] | { data?: ServiceOption[] };
        }>(businessEndpoints.services);

        const svcData = Array.isArray(svcRes?.data)
          ? svcRes.data
          : Array.isArray((svcRes?.data as any)?.data)
            ? (svcRes.data as any).data
            : [];
        setServices(svcData);
      } catch (error) {
        Logger.error("Failed to load publish reel services:", error);
      }
    })();
  }, []);

  // New reel: ensure business status (and thus category) is available.
  useEffect(() => {
    if (isEdit || resolvedBusinessCategory?.id != null) return;
    void dispatch(fetchUserStatus({ showError: false }));
  }, [dispatch, isEdit, resolvedBusinessCategory?.id]);

  // New reel (AI post-as-reel + upload): default Category to the business category.
  useEffect(() => {
    if (isEdit || userPickedCategoryRef.current) return;
    if (!resolvedBusinessCategory?.id) return;

    if (categories.length > 0) {
      const match =
        categories.find((c) => c.id === resolvedBusinessCategory.id) ||
        categories.find(
          (c) =>
            c.name.trim().toLowerCase() ===
            (resolvedBusinessCategory.name || "").trim().toLowerCase(),
        );
      if (match) {
        setCategoryId(match.id);
        setCategoryName(match.name);
        return;
      }
    }

    setCategoryId(resolvedBusinessCategory.id);
    setCategoryName(resolvedBusinessCategory.name ?? "");
  }, [categories, isEdit, resolvedBusinessCategory]);

  useEffect(() => {
    if (!reelId) return;
    (async () => {
      setLoading(true);
      try {
        const reel = await getMyReel(reelId);
        setExisting(reel);
        setCaption(reel.caption || "");
        setLookTag(reel.look_tag || "");
        setPromotionText(reel.promotion_text || "");
        setProductTag(reel.product_tag || "");
        setAvailableNow(!!reel.available_now);
        userPickedCategoryRef.current = true;
        setCategoryId(reel.category?.id ?? resolvedBusinessCategory?.id ?? null);
        setCategoryName(
          reel.category?.name ?? resolvedBusinessCategory?.name ?? "",
        );
        setServiceId(reel.service?.id ?? null);
      } catch (error: any) {
        showBanner(
          t("error"),
          error?.message || t("failedToLoadReel"),
          "error",
          3000,
        );
        router.back();
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reelId]);

  const loadCategories = useCallback(async () => {
    if (categories.length > 0) return categories;
    setLoadingCategories(true);
    try {
      const catRes = await ApiService.get<{
        success: boolean;
        data?: CategoryOption[] | { data?: CategoryOption[] };
      }>(businessEndpoints.categories);

      const catData = Array.isArray(catRes?.data)
        ? catRes.data
        : Array.isArray((catRes?.data as any)?.data)
          ? (catRes.data as any).data
          : [];
      setCategories(catData);
      return catData;
    } catch (error) {
      Logger.error("Failed to load categories:", error);
      showBanner(t("error"), t("failedToLoadCategories"), "error", 3000);
      return [];
    } finally {
      setLoadingCategories(false);
    }
  }, [categories, showBanner, t]);

  // Prefetch so the default business category label resolves against the list.
  useEffect(() => {
    if (isEdit) return;
    void loadCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEdit]);

  const handleChangeCategory = useCallback(async () => {
    if (showCategoryPicker) {
      setShowCategoryPicker(false);
      return;
    }
    setShowCategoryPicker(true);
    const catData = await loadCategories();
    if (catData.length === 0) {
      setShowCategoryPicker(false);
    }
  }, [loadCategories, showCategoryPicker]);

  const handleSelectCategory = useCallback((cat: CategoryOption) => {
    userPickedCategoryRef.current = true;
    setCategoryId(cat.id);
    setCategoryName(cat.name);
    setShowCategoryPicker(false);
  }, []);

  const validate = useCallback(() => {
    if (!caption.trim()) {
      showBanner(t("error"), t("captionRequired"), "error", 2500);
      return false;
    }
    if (!categoryId) {
      showBanner(t("error"), t("categoryRequired"), "error", 2500);
      return false;
    }
    if (!isEdit && !resolvedMediaAssetId && !localVideoUri) {
      showBanner(t("error"), t("videoRequired"), "error", 2500);
      return false;
    }
    return true;
  }, [
    caption,
    categoryId,
    isEdit,
    localVideoUri,
    resolvedMediaAssetId,
    showBanner,
    t,
  ]);

  const ensureMediaAssetId = useCallback(async (): Promise<number> => {
    if (resolvedMediaAssetId) return resolvedMediaAssetId;
    if (!localVideoUri) {
      throw new Error(t("videoRequired"));
    }
    setUploadProgress(0);
    const uploaded = await uploadVideo(
      {
        uri: localVideoUri,
        mimeType: localMimeType,
        fileName: localFileName,
        sourceType: localSourceType,
      },
      setUploadProgress,
    );
    setResolvedMediaAssetId(uploaded.id);
    return uploaded.id;
  }, [
    localFileName,
    localMimeType,
    localSourceType,
    localVideoUri,
    resolvedMediaAssetId,
    t,
  ]);

  /** Publish requires media `ready` (R-02 / R-03) — poll after upload if needed. */
  const ensureMediaReadyForPublish = useCallback(
    async (mediaId: number): Promise<number> => {
      setWaitingForReady(true);
      try {
        await waitForMediaReady(mediaId);
        return mediaId;
      } finally {
        setWaitingForReady(false);
      }
    },
    [],
  );

  const leaveAfterSuccess = useCallback(() => {
    if (fromEditor) {
      if (typeof router.dismiss === "function") {
        try {
          router.dismiss(2);
          return;
        } catch {}
      }
      router.back();
      setTimeout(() => {
        if (router.canGoBack()) router.back();
      }, 50);
      return;
    }
    router.back();
  }, [fromEditor, router]);

  const buildCreatePayload = (publish: boolean, mediaId: number) => ({
    media_asset_id: mediaId,
    category_id: categoryId!,
    caption: caption.trim(),
    ...(serviceId ? { service_id: serviceId } : {}),
    ...(lookTag.trim() ? { look_tag: lookTag.trim() } : {}),
    ...(promotionText.trim() ? { promotion_text: promotionText.trim() } : {}),
    ...(productTag.trim() ? { product_tag: productTag.trim() } : {}),
    available_now: availableNow,
    ...(publish ? { publish: true } : {}),
  });

  const handleSaveDraft = async () => {
    if (!validate() || isSubmitting) return;
    setSavingDraft(true);
    setUploadProgress(0);
    try {
      if (isEdit && reelId) {
        await updateReel(reelId, {
          caption: caption.trim(),
          category_id: categoryId!,
          service_id: serviceId,
          look_tag: lookTag.trim() || null,
          promotion_text: promotionText.trim() || null,
          product_tag: productTag.trim() || null,
          available_now: availableNow,
        });
        showBanner(t("success"), t("reelSaved"), "success", 2500);
      } else {
        const mediaId = await ensureMediaAssetId();
        await createReel(buildCreatePayload(false, mediaId));
        showBanner(t("success"), t("reelSavedAsDraft"), "success", 2500);
      }
      leaveAfterSuccess();
    } catch (error: any) {
      const msg =
        error?.response?.data?.errors?.caption?.[0] ||
        error?.response?.data?.errors?.media_asset_id?.[0] ||
        error?.response?.data?.errors?.category_id?.[0] ||
        error?.response?.data?.message ||
        error?.message ||
        t("failedToSaveReel");
      showBanner(t("error"), msg, "error", 3500);
    } finally {
      setSavingDraft(false);
      setUploadProgress(0);
    }
  };

  const handlePublish = async () => {
    if (!validate() || isSubmitting) return;
    setPublishing(true);
    setUploadProgress(0);
    setWaitingForReady(false);
    try {
      if (isEdit && reelId) {
        await updateReel(reelId, {
          caption: caption.trim(),
          category_id: categoryId!,
          service_id: serviceId,
          look_tag: lookTag.trim() || null,
          promotion_text: promotionText.trim() || null,
          product_tag: productTag.trim() || null,
          available_now: availableNow,
        });
        if (existing?.status !== "published") {
          await publishReel(reelId);
        }
        showBanner(t("success"), t("reelPublished"), "success", 2500);
      } else {
        const mediaId = await ensureMediaAssetId();
        await ensureMediaReadyForPublish(mediaId);
        await createReel(buildCreatePayload(true, mediaId));
        showBanner(t("success"), t("reelPublished"), "success", 2500);
      }
      leaveAfterSuccess();
    } catch (error: any) {
      const msg =
        error?.response?.data?.errors?.media_asset_id?.[0] ||
        error?.response?.data?.errors?.reel?.[0] ||
        error?.response?.data?.message ||
        error?.message ||
        t("failedToPublishReel");
      showBanner(t("error"), msg, "error", 3500);
    } finally {
      setPublishing(false);
      setUploadProgress(0);
      setWaitingForReady(false);
    }
  };

  const handleUnpublish = async () => {
    if (!reelId || isSubmitting) return;
    setUnpublishing(true);
    try {
      await unpublishReel(reelId);
      showBanner(t("success"), t("reelUnpublished"), "success", 2500);
      router.back();
    } catch (error: any) {
      showBanner(
        t("error"),
        error?.message || t("failedToUpdateReel"),
        "error",
        3000,
      );
    } finally {
      setUnpublishing(false);
    }
  };

  const selectedCategoryName =
    categories.find((c) => c.id === categoryId)?.name ||
    categoryName ||
    businessCategory?.name ||
    "";

  if (loading) {
    return (
      <View style={styles.safeArea}>
        <StackHeader title={isEdit ? t("editReel") : t("publishReel")} />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.darkGreen} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.safeArea}>
      <StackHeader title={isEdit ? t("editReel") : t("publishReel")} />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={moderateHeightScale(8)}
      >
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.field}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>
                {t("caption")} <Text style={styles.required}>*</Text>
              </Text>
              <Text style={styles.charCount}>{caption.length}/2200</Text>
            </View>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={caption}
              onChangeText={setCaption}
              placeholder={t("captionPlaceholder")}
              placeholderTextColor={theme.lightGreen5}
              multiline
              maxLength={2200}
            />
          </View>

          <View style={styles.field}>
            <Text style={[styles.label, { marginBottom: moderateHeightScale(8) }]}>
              {t("category")} <Text style={styles.required}>*</Text>
            </Text>
            <View style={styles.categoryShell}>
              <TouchableOpacity
                activeOpacity={0.75}
                onPress={handleChangeCategory}
                disabled={loadingCategories}
                style={styles.categoryRow}
              >
                <View style={styles.categoryDot} />
                <View style={styles.categoryTextCol}>
                  <Text style={styles.categoryMeta}>
                    {showCategoryPicker ? t("hideCategories") : t("changeCategory")}
                  </Text>
                  <Text style={styles.categoryValue} numberOfLines={1}>
                    {selectedCategoryName || t("none")}
                  </Text>
                </View>
                <MaterialIcons
                  name={showCategoryPicker ? "keyboard-arrow-up" : "keyboard-arrow-down"}
                  size={moderateWidthScale(22)}
                  color={theme.lightGreen}
                />
              </TouchableOpacity>

              {showCategoryPicker && (
                <ScrollView
                  style={styles.categoryPickerWrap}
                  nestedScrollEnabled
                  keyboardShouldPersistTaps="handled"
                >
                  {loadingCategories ? (
                    <View style={styles.categoryLoading}>
                      <ActivityIndicator size="small" color={theme.darkGreen} />
                    </View>
                  ) : (
                    categories.map((cat) => {
                      const active = categoryId === cat.id;
                      return (
                        <TouchableOpacity
                          key={cat.id}
                          style={[
                            styles.categoryOption,
                            active && styles.categoryOptionActive,
                          ]}
                          onPress={() => handleSelectCategory(cat)}
                          activeOpacity={0.7}
                        >
                          <Text
                            style={[
                              styles.categoryOptionText,
                              active && styles.categoryOptionTextActive,
                            ]}
                            numberOfLines={1}
                          >
                            {cat.name}
                          </Text>
                          {active ? (
                            <MaterialIcons
                              name="check"
                              size={moderateWidthScale(18)}
                              color={theme.darkGreen}
                            />
                          ) : null}
                        </TouchableOpacity>
                      );
                    })
                  )}
                </ScrollView>
              )}
            </View>
          </View>

          <View style={styles.field}>
            <Text style={[styles.label, { marginBottom: moderateHeightScale(8) }]}>
              {t("serviceOptional")}
            </Text>
            <View style={styles.chipRow}>
              <TouchableOpacity
                style={[styles.chip, serviceId == null && styles.chipActive]}
                onPress={() => setServiceId(null)}
                activeOpacity={0.75}
              >
                <Text
                  style={[
                    styles.chipText,
                    serviceId == null && styles.chipTextActive,
                  ]}
                >
                  {t("none")}
                </Text>
              </TouchableOpacity>
              {services.map((svc) => (
                <TouchableOpacity
                  key={svc.id}
                  style={[
                    styles.chip,
                    serviceId === svc.id && styles.chipActive,
                  ]}
                  onPress={() => setServiceId(svc.id)}
                  activeOpacity={0.75}
                >
                  <Text
                    style={[
                      styles.chipText,
                      serviceId === svc.id && styles.chipTextActive,
                    ]}
                  >
                    {svc.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.field}>
            <Text style={[styles.label, { marginBottom: moderateHeightScale(8) }]}>
              {t("lookTag")}
            </Text>
            <TextInput
              style={styles.input}
              value={lookTag}
              onChangeText={setLookTag}
              placeholder={t("lookTagPlaceholder")}
              placeholderTextColor={theme.lightGreen5}
              maxLength={100}
            />
          </View>

          <View style={styles.field}>
            <Text style={[styles.label, { marginBottom: moderateHeightScale(8) }]}>
              {t("promotionText")}
            </Text>
            <TextInput
              style={styles.input}
              value={promotionText}
              onChangeText={setPromotionText}
              placeholder={t("promotionTextPlaceholder")}
              placeholderTextColor={theme.lightGreen5}
              maxLength={255}
            />
          </View>

          <View style={styles.field}>
            <Text style={[styles.label, { marginBottom: moderateHeightScale(8) }]}>
              {t("productTag")}
            </Text>
            <TextInput
              style={styles.input}
              value={productTag}
              onChangeText={setProductTag}
              placeholder={t("productTagPlaceholder")}
              placeholderTextColor={theme.lightGreen5}
              maxLength={255}
            />
          </View>

          <View style={styles.field}>
            <View style={styles.switchRow}>
              <View style={styles.switchTextCol}>
                <Text style={styles.switchLabel}>{t("availableNow")}</Text>
                <Text style={styles.switchHint}>{t("availableNowSubtitle")}</Text>
              </View>
              <CustomToggle
                value={availableNow}
                onValueChange={setAvailableNow}
              />
            </View>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          {isSubmitting && fromEditor && uploadProgress > 0 && !waitingForReady ? (
            <Text style={styles.progressText}>
              {`${t("uploadingVideo")} ${uploadProgress}%`}
            </Text>
          ) : null}
          {isSubmitting && waitingForReady ? (
            <Text style={styles.progressText}>
              {t("videoProcessingForPublish")}
            </Text>
          ) : null}

          <View style={styles.footerActions}>
            <TouchableOpacity
              style={[
                styles.footerSecondary,
                isSubmitting && styles.footerDisabled,
              ]}
              onPress={handleSaveDraft}
              disabled={isSubmitting}
              activeOpacity={0.75}
            >
              {savingDraft ? (
                <ActivityIndicator size="small" color={theme.darkGreen} />
              ) : (
                <Text style={styles.footerSecondaryText}>
                  {isEdit ? t("saveChanges") : t("saveDraft")}
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.footerPrimary,
                (isSubmitting || existing?.status === "removed") &&
                  styles.footerDisabled,
              ]}
              onPress={handlePublish}
              disabled={isSubmitting || existing?.status === "removed"}
              activeOpacity={0.75}
            >
              {publishing ? (
                <ActivityIndicator size="small" color={theme.buttonText} />
              ) : (
                <>
                  <MaterialIcons
                    name="publish"
                    size={moderateWidthScale(16)}
                    color={theme.buttonText}
                  />
                  <Text style={styles.footerPrimaryText}>{t("publish")}</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {isEdit && existing?.status === "published" ? (
            <TouchableOpacity
              style={styles.unpublishLink}
              onPress={handleUnpublish}
              disabled={isSubmitting}
              activeOpacity={0.7}
            >
              {unpublishing ? (
                <ActivityIndicator size="small" color={theme.lightGreen} />
              ) : (
                <Text style={styles.unpublishLinkText}>{t("unpublish")}</Text>
              )}
            </TouchableOpacity>
          ) : null}
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
