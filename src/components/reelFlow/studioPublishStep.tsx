import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { MaterialIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import {
  KeyboardAwareScrollView,
  KeyboardStickyView,
} from "react-native-keyboard-controller";
import { generateThumbnail } from "expo-media-edit";
import { useAppDispatch, useAppSelector, useTheme } from "@/src/hooks/hooks";
import { useNotificationContext } from "@/src/contexts/NotificationContext";
import { ApiService } from "@/src/services/api";
import { businessEndpoints } from "@/src/services/endpoints";
import Logger from "@/src/services/logger";
import { fetchReelServiceOptions } from "@/src/services/reelServicesOptions";
import { fetchStaffBusinessCategory } from "@/src/services/staffBusinessService";
import { createReel } from "@/src/services/reelsService";
import {
  MAX_VIDEO_UPLOAD_SECONDS,
  uploadVideo,
  waitForMediaReady,
} from "@/src/services/mediaLibraryService";
import { saveLocalVideoToGallery } from "@/src/services/downloadMediaService";
import {
  captionWithMusicCredit,
  musicCreditLine,
  musicCreditReserve,
} from "@/src/services/musicLibraryService";
import { fetchUserStatus } from "@/src/state/thunks/businessThunks";
import ReelVideoShareSheet from "@/src/components/ReelVideoShareSheet";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  heightScale,
  moderateHeightScale,
  moderateWidthScale,
  widthScale,
} from "@/src/theme/dimensions";
import type { MediaUploadSourceType } from "@/src/types/media";
import type { OwnerReel } from "@/src/types/reels";
import { isUploadCancelled } from "@/src/utils/uploadCancel";
import FlowFooter from "./flowFooter";
import FlowButton from "./flowButton";
import { FlowTitle, InfoNote, OptionRow } from "./flowParts";
import {
  ChoiceChips,
  FlowTextField,
  SelectField,
  ToggleRow,
} from "./detailsFields";
import ProductPickerSheet, {
  isLinkedProductError,
  useInventoryProducts,
} from "./productPickerSheet";

/** The finished video the studio hands to its Publish step. */
export type StudioVideo = {
  uri: string;
  fileName: string;
  mimeType: string;
  durationMs: number;
  width: number;
  height: number;
  sourceType: MediaUploadSourceType;
  /** Creative Commons credit for library music — appended to the caption. */
  musicCredit: string | null;
};

type CategoryOption = { id: number; name: string };
type ServiceOption = { id: number; name: string };

type Props = {
  video: StudioVideo;
  /** True while uploading / publishing — the studio blocks leaving. */
  onBusyChange: (busy: boolean) => void;
  /** Lets the studio cancel a running upload when the user really leaves. */
  registerAbort: (abort: (() => void) | null) => void;
  /** Published: back now leaves the flow instead of going to Preview. */
  onPublished: () => void;
  /** Close the whole flow. */
  onFinished: () => void;
};

const CAPTION_MAX = 2200;
/** Share of the progress bar used by on-phone compression (rest = upload). */
const COMPRESS_SHARE = 0.4;

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    flex: { flex: 1 },
    content: {
      paddingHorizontal: moderateWidthScale(20),
      paddingTop: moderateHeightScale(10),
      paddingBottom: moderateHeightScale(28),
      gap: moderateHeightScale(20),
    },
    reelCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(16),
    },
    reelThumb: {
      width: widthScale(96),
      height: widthScale(120),
      borderRadius: moderateWidthScale(16),
      backgroundColor: theme.darkGreen,
      overflow: "hidden",
      alignItems: "center",
      justifyContent: "center",
    },
    reelThumbImage: { width: "100%", height: "100%" },
    reelText: { flex: 1, minWidth: 0, gap: moderateHeightScale(4) },
    reelTitle: {
      fontSize: fontSize.size20,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    reelSub: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
    },
    creditNote: {
      marginTop: -moderateHeightScale(12),
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      lineHeight: fontSize.size20,
    },
    moreHead: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(10),
      minHeight: heightScale(56),
      paddingHorizontal: moderateWidthScale(16),
      borderRadius: moderateWidthScale(16),
      backgroundColor: theme.lightGreen07,
    },
    moreText: { flex: 1 },
    moreTitle: {
      fontSize: fontSize.size17,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    moreSub: {
      marginTop: moderateHeightScale(2),
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
    },
    moreBody: {
      gap: moderateHeightScale(18),
    },
    successWrap: {
      alignItems: "center",
      gap: moderateHeightScale(14),
      paddingTop: moderateHeightScale(12),
    },
    successBadge: {
      width: widthScale(84),
      height: widthScale(84),
      borderRadius: widthScale(42),
      backgroundColor: theme.darkGreen,
      alignItems: "center",
      justifyContent: "center",
    },
    successTitle: {
      fontSize: fontSize.size26,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      textAlign: "center",
    },
    successSub: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      textAlign: "center",
      lineHeight: fontSize.size22,
    },
    successActions: {
      alignSelf: "stretch",
      flexDirection: "row",
      gap: moderateWidthScale(12),
      marginTop: moderateHeightScale(8),
    },
    successAction: { flex: 1 },
  });

export default function StudioPublishStep({
  video,
  onBusyChange,
  registerAbort,
  onPublished,
  onFinished,
}: Props) {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const { showBanner } = useNotificationContext();

  const businessStatus = useAppSelector((s) => s.user.businessStatus);
  const userRole = useAppSelector((s) => s.user.userRole);
  // Staff have no product inventory yet — hidden until the backend supports it
  const canLinkProduct = userRole !== "staff";
  const userBusinessId = useAppSelector(
    (s) => s.user.business_id ?? s.user.businessStatus?.business_id ?? null,
  );
  const completeProfileCategory = useAppSelector(
    (s) => s.completeProfile.businessCategory,
  );
  const selectBsnsCategory = useAppSelector((s) => s.user.selectBsnsCategory);
  const [staffBusinessCategory, setStaffBusinessCategory] = useState<{
    id: number;
    name: string;
  } | null>(null);

  /** Prefer live status, then onboarding slice, then persisted discovery pick. */
  const resolvedBusinessCategory = useMemo(() => {
    if (businessStatus?.business_category?.id != null) {
      return businessStatus.business_category;
    }
    if (userRole === "staff") return staffBusinessCategory;
    if (completeProfileCategory?.id != null) return completeProfileCategory;
    const fromSelect = selectBsnsCategory?.[0];
    if (fromSelect?.id != null) return fromSelect;
    return null;
  }, [
    businessStatus?.business_category,
    userRole,
    staffBusinessCategory,
    completeProfileCategory,
    selectBsnsCategory,
  ]);

  // Library music (CC BY) must be credited — appended to the caption on create.
  const musicCreditText = useMemo(
    () => musicCreditLine([video.musicCredit]),
    [video.musicCredit],
  );
  const captionMax = CAPTION_MAX - musicCreditReserve(musicCreditText);

  const [caption, setCaption] = useState("");
  const [categoryId, setCategoryId] = useState<number | null>(
    resolvedBusinessCategory?.id ?? null,
  );
  const [categoryName, setCategoryName] = useState(
    resolvedBusinessCategory?.name ?? "",
  );
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const userPickedCategoryRef = useRef(false);
  const [services, setServices] = useState<ServiceOption[]>([]);
  const [serviceId, setServiceId] = useState<number | null>(null);
  const [lookTag, setLookTag] = useState("");
  const [promotionText, setPromotionText] = useState("");
  const [availableNow, setAvailableNow] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const [productTag, setProductTag] = useState("");
  const [productSheetOpen, setProductSheetOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

  const [publishing, setPublishing] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [uploadPercent, setUploadPercent] = useState<number | null>(null);
  // One 0–100 bar: on-phone compression fills 0–40, the upload 40–100
  const [uploadPhase, setUploadPhase] = useState<"preparing" | "uploading">(
    "preparing",
  );
  const [waitingForReady, setWaitingForReady] = useState(false);
  const [mediaAssetId, setMediaAssetId] = useState<number | null>(null);
  const [publishedReel, setPublishedReel] = useState<OwnerReel | null>(null);
  const [thumbUri, setThumbUri] = useState<string | null>(null);
  const [savingToGallery, setSavingToGallery] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  const busy = publishing || savingDraft;
  useEffect(() => {
    onBusyChange(busy);
  }, [busy, onBusyChange]);

  const products = useInventoryProducts(canLinkProduct);
  const selectedProduct =
    selectedProductId == null
      ? null
      : (products.products.find((p) => Number(p.id) === selectedProductId) ??
        null);

  // Cover for the "Your reel" card (first moment of the finished video)
  useEffect(() => {
    let cancelled = false;
    generateThumbnail(video.uri, Math.min(500, Math.max(0, video.durationMs - 1)), {
      width: 360,
      height: 360,
    })
      .then((uri) => {
        if (!cancelled) setThumbUri(uri);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [video.durationMs, video.uri]);

  useEffect(() => {
    if (userRole !== "staff") return;
    fetchStaffBusinessCategory(userBusinessId)
      .then(setStaffBusinessCategory)
      .catch((error) => {
        Logger.error("Failed to load staff business category:", error);
      });
  }, [userRole, userBusinessId]);

  useEffect(() => {
    (async () => {
      try {
        setServices(
          await fetchReelServiceOptions({ userRole, businessId: userBusinessId }),
        );
      } catch (error) {
        Logger.error("Failed to load reel services:", error);
      }
    })();
  }, [userRole, userBusinessId]);

  // Business category comes from status — load it when it isn't known yet.
  useEffect(() => {
    if (resolvedBusinessCategory?.id != null) return;
    void dispatch(fetchUserStatus({ showError: false }));
  }, [dispatch, resolvedBusinessCategory?.id]);

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
    void loadCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Default the category to the business category (until the user picks one).
  useEffect(() => {
    if (userPickedCategoryRef.current) return;
    if (!resolvedBusinessCategory?.id) return;
    const match =
      categories.find((c) => c.id === resolvedBusinessCategory.id) ||
      categories.find(
        (c) =>
          c.name.trim().toLowerCase() ===
          (resolvedBusinessCategory.name || "").trim().toLowerCase(),
      );
    setCategoryId(match?.id ?? resolvedBusinessCategory.id);
    setCategoryName(match?.name ?? resolvedBusinessCategory.name ?? "");
  }, [categories, resolvedBusinessCategory]);

  const selectedCategoryName =
    categories.find((c) => c.id === categoryId)?.name || categoryName || "";

  const toggleCategory = useCallback(async () => {
    if (categoryOpen) {
      setCategoryOpen(false);
      return;
    }
    setCategoryOpen(true);
    const list = await loadCategories();
    if (list.length === 0) setCategoryOpen(false);
  }, [categoryOpen, loadCategories]);

  // Cancels the running upload when the user leaves mid-upload
  const abortRef = useRef<AbortController | null>(null);
  useEffect(() => {
    registerAbort(() => abortRef.current?.abort());
    return () => {
      registerAbort(null);
      abortRef.current?.abort();
    };
  }, [registerAbort]);

  const validate = useCallback(() => {
    if (!caption.trim()) {
      showBanner(t("error"), t("captionRequired"), "error", 2500);
      return false;
    }
    if (!categoryId) {
      setMoreOpen(true);
      showBanner(t("error"), t("categoryRequired"), "error", 2500);
      return false;
    }
    return true;
  }, [caption, categoryId, showBanner, t]);

  /** Upload once; a retry (or draft after a failed publish) reuses the id. */
  const ensureMediaAssetId = useCallback(
    async (signal: AbortSignal): Promise<number> => {
      if (mediaAssetId) return mediaAssetId;
      setUploadPhase("preparing");
      setUploadPercent(0);
      const uploaded = await uploadVideo(
        {
          uri: video.uri,
          mimeType: video.mimeType,
          fileName: video.fileName,
          sourceType: video.sourceType,
          durationSeconds: Math.min(
            MAX_VIDEO_UPLOAD_SECONDS,
            Math.max(1, Math.round(video.durationMs / 1000)),
          ),
          width: video.width || null,
          height: video.height || null,
          signal,
          onCompressProgress: (percent) =>
            setUploadPercent(Math.round(percent * COMPRESS_SHARE)),
        },
        (percent) => {
          setUploadPhase("uploading");
          setUploadPercent(
            Math.round(COMPRESS_SHARE * 100 + percent * (1 - COMPRESS_SHARE)),
          );
        },
      );
      setMediaAssetId(uploaded.id);
      return uploaded.id;
    },
    [mediaAssetId, video],
  );

  const buildPayload = (publish: boolean, mediaId: number) => ({
    media_asset_id: mediaId,
    category_id: categoryId!,
    caption: captionWithMusicCredit(caption, musicCreditText),
    ...(serviceId ? { service_id: serviceId } : {}),
    ...(lookTag.trim() ? { look_tag: lookTag.trim() } : {}),
    ...(promotionText.trim() ? { promotion_text: promotionText.trim() } : {}),
    ...(productTag.trim() ? { product_tag: productTag.trim() } : {}),
    ...(selectedProductId != null ? { product_id: selectedProductId } : {}),
    available_now: availableNow,
    ...(publish ? { publish: true } : {}),
  });

  const errorMessage = (error: any, fallbackKey: string) =>
    (isLinkedProductError(error) ? t("linkedProductUnavailable") : null) ||
    error?.data?.errors?.reel?.[0] ||
    error?.data?.errors?.caption?.[0] ||
    error?.data?.errors?.media_asset_id?.[0] ||
    error?.data?.errors?.category_id?.[0] ||
    error?.response?.data?.errors?.media_asset_id?.[0] ||
    error?.response?.data?.errors?.reel?.[0] ||
    error?.response?.data?.message ||
    error?.message ||
    t(fallbackKey);

  const handlePublish = useCallback(async () => {
    if (!validate() || busy) return;
    const controller = new AbortController();
    abortRef.current = controller;
    setPublishing(true);
    try {
      const mediaId = await ensureMediaAssetId(controller.signal);
      if (controller.signal.aborted) return;
      setUploadPercent(null);
      // Publish needs the media `ready` — poll after upload if needed
      setWaitingForReady(true);
      await waitForMediaReady(mediaId);
      setWaitingForReady(false);
      if (controller.signal.aborted) return;
      const reel = await createReel(buildPayload(true, mediaId));
      setPublishedReel(reel);
      onPublished();
      showBanner(t("success"), t("reelPublished"), "success", 2500);
    } catch (error: any) {
      if (controller.signal.aborted || isUploadCancelled(error)) return;
      Logger.error("Studio publish failed:", error);
      if (isLinkedProductError(error)) {
        setSelectedProductId(null);
        setProductTag("");
      }
      showBanner(t("error"), errorMessage(error, "failedToPublishReel"), "error", 3500);
    } finally {
      setPublishing(false);
      setUploadPercent(null);
      setWaitingForReady(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busy, ensureMediaAssetId, onPublished, showBanner, t, validate]);

  const handleSaveDraft = useCallback(async () => {
    if (!validate() || busy) return;
    const controller = new AbortController();
    abortRef.current = controller;
    setSavingDraft(true);
    try {
      const mediaId = await ensureMediaAssetId(controller.signal);
      if (controller.signal.aborted) return;
      await createReel(buildPayload(false, mediaId));
      showBanner(t("success"), t("reelSavedAsDraft"), "success", 2500);
      onFinished();
    } catch (error: any) {
      if (controller.signal.aborted || isUploadCancelled(error)) return;
      Logger.error("Studio save draft failed:", error);
      if (isLinkedProductError(error)) {
        setSelectedProductId(null);
        setProductTag("");
      }
      showBanner(t("error"), errorMessage(error, "failedToSaveReel"), "error", 3500);
    } finally {
      setSavingDraft(false);
      setUploadPercent(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busy, ensureMediaAssetId, onFinished, showBanner, t, validate]);

  const handleDownload = useCallback(async () => {
    if (savingToGallery) return;
    setSavingToGallery(true);
    const saved = await saveLocalVideoToGallery(video.uri);
    setSavingToGallery(false);
    showBanner(
      saved ? t("success") : t("error"),
      saved ? t("videoSavedToGallery") : t("flowSaveToGalleryFailed"),
      saved ? "success" : "error",
      3000,
    );
  }, [savingToGallery, showBanner, t, video.uri]);

  const durationLabel = t("flowSecondsLong", {
    seconds: Math.max(1, Math.round(video.durationMs / 1000)),
  });

  const reelCard = (
    <View style={styles.reelCard}>
      <View style={styles.reelThumb}>
        {thumbUri ? (
          <Image
            source={{ uri: thumbUri }}
            style={styles.reelThumbImage}
            contentFit="cover"
            transition={150}
          />
        ) : (
          <MaterialIcons
            name="movie"
            size={moderateWidthScale(30)}
            color={theme.white70}
          />
        )}
      </View>
      <View style={styles.reelText}>
        <Text style={styles.reelTitle}>{t("flowYourReel")}</Text>
        <Text style={styles.reelSub}>{durationLabel}</Text>
      </View>
    </View>
  );

  if (publishedReel) {
    const shareUrl = (publishedReel.video as { playback_url?: string } | null)
      ?.playback_url ?? null;
    return (
      <View style={styles.flex}>
        <KeyboardAwareScrollView
          style={styles.flex}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.successWrap} accessibilityLiveRegion="polite">
            <View style={styles.successBadge}>
              <MaterialIcons
                name="check"
                size={moderateWidthScale(44)}
                color={theme.white}
              />
            </View>
            <Text style={styles.successTitle} accessibilityRole="header">
              {t("flowPublishedTitle")}
            </Text>
            <Text style={styles.successSub}>{t("flowPublishedSubtitle")}</Text>
          </View>
          {reelCard}
          <View style={styles.successActions}>
            <FlowButton
              variant="outline"
              icon="file-download"
              label={t("download")}
              onPress={() => void handleDownload()}
              loading={savingToGallery}
              style={styles.successAction}
              compact
            />
            {shareUrl ? (
              <FlowButton
                variant="outline"
                icon="ios-share"
                label={t("flowShareVideo")}
                onPress={() => setShareOpen(true)}
                style={styles.successAction}
                compact
              />
            ) : null}
          </View>
        </KeyboardAwareScrollView>
        <FlowFooter
          primary={{
            label: t("done"),
            onPress: onFinished,
            icon: "check",
          }}
        />
        <ReelVideoShareSheet
          visible={shareOpen}
          onClose={() => setShareOpen(false)}
          videoUrl={shareUrl}
        />
      </View>
    );
  }

  const progress =
    uploadPercent != null
      ? {
          label:
            uploadPhase === "preparing"
              ? t("flowPreparingPercent", { percent: uploadPercent })
              : t("flowUploadingPercent", { percent: uploadPercent }),
          percent: uploadPercent,
        }
      : waitingForReady
        ? { label: t("videoProcessingForPublish"), percent: null }
        : null;

  return (
    <View style={styles.flex}>
      <KeyboardAwareScrollView
        style={styles.flex}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        bottomOffset={moderateHeightScale(140)}
      >
        <FlowTitle
          title={t("flowPublishTitle")}
          subtitle={t("flowPublishSubtitle")}
        />
        {reelCard}

        <FlowTextField
          label={t("caption")}
          required
          value={caption}
          onChangeText={(v) => setCaption(v.slice(0, captionMax))}
          placeholder={t("flowCaptionPlaceholder")}
          multiline
          maxCount={captionMax}
          editable={!busy}
        />
        {musicCreditText ? (
          <Text style={styles.creditNote}>
            {t("musicCreditAutoAdded", { credit: musicCreditText })}
          </Text>
        ) : null}

        {canLinkProduct ? (
          <OptionRow
            icon="sell"
            title={t("flowPromoteProduct")}
            subtitle={
              selectedProduct?.name ||
              productTag ||
              t("flowPromoteProductSub")
            }
            done={selectedProductId != null}
            onPress={() => setProductSheetOpen(true)}
            disabled={busy}
          />
        ) : null}

        <Pressable
          style={styles.moreHead}
          onPress={() => setMoreOpen((v) => !v)}
          accessibilityRole="button"
          accessibilityState={{ expanded: moreOpen }}
        >
          <MaterialIcons
            name="tune"
            size={moderateWidthScale(24)}
            color={theme.darkGreen}
          />
          <View style={styles.moreText}>
            <Text style={styles.moreTitle}>{t("flowMoreDetails")}</Text>
            <Text style={styles.moreSub} numberOfLines={1}>
              {[selectedCategoryName, t("flowMoreDetailsSub")]
                .filter(Boolean)
                .join(" · ")}
            </Text>
          </View>
          <MaterialIcons
            name={moreOpen ? "expand-less" : "expand-more"}
            size={moderateWidthScale(28)}
            color={theme.darkGreen}
          />
        </Pressable>

        {moreOpen ? (
          <View style={styles.moreBody}>
            <SelectField
              label={t("category")}
              required
              value={selectedCategoryName || null}
              placeholder={t("selectCategory")}
              open={categoryOpen}
              loading={loadingCategories}
              options={categories}
              selectedId={categoryId}
              onToggle={() => void toggleCategory()}
              onSelect={(cat) => {
                userPickedCategoryRef.current = true;
                setCategoryId(cat.id);
                setCategoryName(cat.name);
                setCategoryOpen(false);
              }}
            />
            {services.length > 0 ? (
              <ChoiceChips
                label={t("serviceOptional")}
                options={services}
                selectedId={serviceId}
                onSelect={setServiceId}
              />
            ) : null}
            <FlowTextField
              label={t("lookTag")}
              value={lookTag}
              onChangeText={setLookTag}
              placeholder={t("lookTagPlaceholder")}
              maxLength={100}
            />
            <FlowTextField
              label={t("promotionText")}
              value={promotionText}
              onChangeText={setPromotionText}
              placeholder={t("promotionTextPlaceholder")}
              maxLength={255}
            />
            <ToggleRow
              title={t("availableNow")}
              subtitle={t("availableNowSubtitle")}
              value={availableNow}
              onValueChange={setAvailableNow}
            />
          </View>
        ) : null}

        <InfoNote icon="ios-share" text={t("flowShareAfterPublish")} />
      </KeyboardAwareScrollView>

      <KeyboardStickyView offset={{ closed: 0, opened: 0 }}>
        <FlowFooter
          progress={progress}
          primary={{
            label: t("flowPublishCta"),
            onPress: () => void handlePublish(),
            loading: publishing,
            disabled: busy && !publishing,
            icon: "publish",
          }}
          tertiary={{
            label: t("flowSaveAsDraft"),
            onPress: () => void handleSaveDraft(),
            loading: savingDraft,
            disabled: busy && !savingDraft,
          }}
        />
      </KeyboardStickyView>

      {canLinkProduct ? (
        <ProductPickerSheet
          visible={productSheetOpen}
          onClose={() => setProductSheetOpen(false)}
          products={products.products}
          loading={products.loading}
          error={products.error}
          onRetry={products.retry}
          selectedId={selectedProductId}
          isOwner={userRole === "business"}
          onSelect={(product) => {
            setSelectedProductId(product ? Number(product.id) : null);
            setProductTag(product?.name ?? "");
            setProductSheetOpen(false);
          }}
        />
      ) : null}
    </View>
  );
}
