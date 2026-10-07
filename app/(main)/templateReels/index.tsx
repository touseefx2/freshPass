import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useFocusEffect, useNavigation, useRouter } from "expo-router";
import * as VideoThumbnails from "expo-video-thumbnails";
import { useTranslation } from "react-i18next";
import { MaterialIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import HairPipelineProcessingModal, {
  INITIAL_HAIR_PIPELINE_STATE,
  type HairPipelineModalState,
} from "@/src/components/HairPipelineProcessingModal";
import ImagePickerModal from "@/src/components/imagePickerModal";
import {
  createEditRequestId,
  takeEditedVideo,
} from "@/src/components/videoEditor/editorHandoff";
import {
  captionWithMusicCredit,
  musicCreditLine,
  musicCreditReserve,
} from "@/src/services/musicLibraryService";
import {
  formatVideoDuration,
  measureVideoDurationSeconds,
} from "@/src/utils/videoDuration";
import { isUploadCancelled } from "@/src/utils/uploadCancel";
import { useNotificationContext } from "@/src/contexts/NotificationContext";
import { useAppDispatch, useAppSelector, useTheme } from "@/src/hooks/hooks";
import { ApiService } from "@/src/services/api";
import { businessEndpoints } from "@/src/services/endpoints";
import Logger from "@/src/services/logger";
import {
  getMediaLimits,
  MAX_VIDEO_UPLOAD_SECONDS,
  uploadImage,
  uploadVideo,
  VideoTooLargeError,
  waitForMediaReady,
} from "@/src/services/mediaLibraryService";
import {
  handleCameraPermission,
  handleMediaLibraryPermission,
} from "@/src/services/mediaPermissionService";
import {
  generateReelFromTemplate,
  listReelTemplates,
} from "@/src/services/reelsService";
import { fetchUserStatus } from "@/src/state/thunks/businessThunks";
import { fetchStaffBusinessCategory } from "@/src/services/staffBusinessService";
import {
  formatReelsResetDate,
  monthlyReelsBlockedMessage,
} from "@/src/services/monthlyReelsService";
import FlowHeader from "@/src/components/reelFlow/flowHeader";
import FlowFooter from "@/src/components/reelFlow/flowFooter";
import {
  FlowTitle,
  InfoNote,
  SelectedMediaRow,
} from "@/src/components/reelFlow/flowParts";
import TemplateDropdown from "@/src/components/reelFlow/templateDropdown";
import RequirementsCard, {
  type Requirement,
} from "@/src/components/reelFlow/requirementsCard";
import QuotaBanner from "@/src/components/reelFlow/quotaBanner";
import {
  FlowTextField,
  SelectField,
} from "@/src/components/reelFlow/detailsFields";
import { Theme } from "@/src/theme/colors";
import {
  heightScale,
  moderateHeightScale,
  moderateWidthScale,
  widthScale,
} from "@/src/theme/dimensions";
import { fontSize, fonts } from "@/src/theme/fonts";
import type { MediaUploadSourceType, MediaVideo } from "@/src/types/media";
import type {
  ReelTemplate,
  ReelTemplateMediaField,
} from "@/src/types/reels";
import { normalizeReelTemplateMediaFields } from "@/src/types/reels";
import { isLikelyVideoUri } from "@/src/utils/prepareImageForUpload";

/**
 * Template reel — one task per screen:
 *   1 Choose a template (dropdown + what it needs)
 *   2 Add the photos / videos it asks for — a picked video opens the
 *     step-by-step Reel Studio (trim + edit) before it goes in its slot
 *   3 Details (texts, caption, category) → Generate reel
 */

const iosCompatiblePickerOptions =
  Platform.OS === "ios"
    ? {
        preferredAssetRepresentationMode:
          ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
      }
    : {};

type WizardStep = "template" | "media" | "details";

/** Still images uploaded as media assets — no duration_seconds on POST /api/media. */

function assetIsVideo(asset: ImagePicker.ImagePickerAsset): boolean {
  const mime = (asset as { mimeType?: string }).mimeType ?? "";
  return (
    asset.type === "video" ||
    mime.startsWith("video/") ||
    isLikelyVideoUri(asset.uri)
  );
}

function slotAcceptsImage(field: ReelTemplateMediaField | undefined): boolean {
  return field?.accepted_types?.includes("image") ?? true;
}

function slotAcceptsVideo(field: ReelTemplateMediaField | undefined): boolean {
  return field?.accepted_types?.includes("video") ?? true;
}

function mediaRequirementLabel(
  fields: ReelTemplateMediaField[],
  t: (key: string, options?: Record<string, unknown>) => string,
): string {
  const count = fields.length;
  if (count === 0) return "";
  const hasImage = fields.some((f) => f.accepted_types.includes("image"));
  const hasVideo = fields.some((f) => f.accepted_types.includes("video"));
  if (hasImage && !hasVideo) {
    return count === 1
      ? t("photosNeededImagesOne")
      : t("photosNeededImages", { count });
  }
  if (hasVideo && !hasImage) {
    return count === 1
      ? t("videosNeededOne")
      : t("videosNeeded", { count });
  }
  return count === 1
    ? t("photosNeededOne")
    : t("photosNeeded", { count });
}

function slotTypeHint(
  field: ReelTemplateMediaField,
  t: (key: string) => string,
): string {
  const hasImage = field.accepted_types.includes("image");
  const hasVideo = field.accepted_types.includes("video");
  if (hasImage && !hasVideo) return t("slotAcceptsPhoto");
  if (hasVideo && !hasImage) return t("slotAcceptsVideo");
  return t("slotAcceptsPhotoOrVideo");
}

type CategoryOption = { id: number; name: string };

/** File picked for a slot — uploaded only when "Generate Reel" is tapped */
type SlotFile = {
  uri: string;
  mimeType: string;
  fileName: string;
  sourceType: MediaUploadSourceType;
  isVideo: boolean;
  /** Videos only (≤ 30 s) */
  durationSeconds?: number;
  width?: number;
  height?: number;
};

type SlotItem = {
  local: SlotFile;
  /** Set as soon as this slot's upload succeeds, so a retry skips it */
  mediaId: number | null;
  previewUri: string | null;
  name: string | null;
};

const TEXT_FIELD_LABELS: Record<string, string> = {
  business_name: "businessNameField",
  tagline: "taglineField",
  deal_text: "dealTextField",
  service_name: "serviceNameField",
  product_name: "productNameField",
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.background,
    },
    flex: { flex: 1 },
    content: {
      paddingHorizontal: moderateWidthScale(20),
      paddingTop: moderateHeightScale(10),
      paddingBottom: moderateHeightScale(28),
      gap: moderateHeightScale(18),
    },
    slots: {
      gap: moderateHeightScale(12),
    },
    slotCard: {
      backgroundColor: theme.white,
      borderRadius: moderateWidthScale(18),
      borderWidth: 1,
      borderColor: theme.borderLight,
      paddingHorizontal: moderateWidthScale(12),
      shadowColor: theme.darkGreen,
      shadowOffset: { width: 0, height: moderateHeightScale(3) },
      shadowOpacity: 0.07,
      shadowRadius: moderateWidthScale(8),
      elevation: 2,
    },
    slotEmpty: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(14),
      minHeight: heightScale(96),
      paddingHorizontal: moderateWidthScale(12),
      paddingVertical: moderateHeightScale(10),
      borderRadius: moderateWidthScale(18),
      borderWidth: 1.5,
      borderStyle: "dashed",
      borderColor: theme.borderDark,
      backgroundColor: theme.lightGreen05,
    },
    slotEmptyIcon: {
      width: widthScale(72),
      height: widthScale(72),
      borderRadius: moderateWidthScale(14),
      backgroundColor: theme.white,
      alignItems: "center",
      justifyContent: "center",
    },
    slotText: { flex: 1, minWidth: 0, gap: moderateHeightScale(3) },
    slotTitle: {
      fontSize: fontSize.size17,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    slotSub: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
    },
    slotAdd: {
      width: widthScale(46),
      height: widthScale(46),
      borderRadius: widthScale(23),
      backgroundColor: theme.darkGreen,
      alignItems: "center",
      justifyContent: "center",
    },
    creditNote: {
      marginTop: -moderateHeightScale(10),
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      lineHeight: fontSize.size20,
    },
  });

function formatMusicName(name: string | null): string {
  if (!name?.trim()) return "";
  return name.replace(/\.(mp3|wav|m4a|aac)$/i, "").replace(/-/g, " ");
}

export default function ReelTemplatesScreen() {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();
  const router = useRouter();
  const { showBanner } = useNotificationContext();
  const dispatch = useAppDispatch();

  const businessName = useAppSelector(
    (s) => s.user.business_name || s.user.businessStatus?.business_name || "",
  );
  const businessStatus = useAppSelector((s) => s.user.businessStatus);
  const userRole = useAppSelector((s) => s.user.userRole);
  const userBusinessId = useAppSelector(
    (s) => s.user.business_id ?? s.user.businessStatus?.business_id ?? null,
  );
  const completeProfileCategory = useAppSelector(
    (s) => s.completeProfile.businessCategory,
  );
  const selectBsnsCategory = useAppSelector((s) => s.user.selectBsnsCategory);
  // Staff: their owner's business category (they have no business status of their own)
  const [staffBusinessCategory, setStaffBusinessCategory] = useState<{
    id: number;
    name: string;
  } | null>(null);

  const resolvedBusinessCategory = useMemo(() => {
    if (businessStatus?.business_category?.id != null) {
      return businessStatus.business_category;
    }
    if (userRole === "staff") return staffBusinessCategory;
    if (completeProfileCategory?.id != null) {
      return completeProfileCategory;
    }
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

  const [step, setStep] = useState<WizardStep>("template");
  const [templates, setTemplates] = useState<ReelTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [templatesError, setTemplatesError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const [texts, setTexts] = useState<Record<string, string>>({});
  const [selectedMedia, setSelectedMedia] = useState<(SlotItem | null)[]>([]);
  const [caption, setCaption] = useState("");
  /** Library-music credits from the editor, keyed by the exported file uri. */
  const [editorMusicCredits, setEditorMusicCredits] = useState<
    Record<string, string>
  >({});
  const [categoryId, setCategoryId] = useState<number | null>(
    resolvedBusinessCategory?.id ?? null,
  );
  const [categoryName, setCategoryName] = useState(
    resolvedBusinessCategory?.name ?? "",
  );
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const userPickedCategoryRef = useRef(false);
  const [submitting, setSubmitting] = useState(false);
  // Monthly reels (12 per business, shared with staff) — template reels count too
  const [reelsRemaining, setReelsRemaining] = useState<number | null>(null);
  const [quotaBlockedMessage, setQuotaBlockedMessage] = useState<string | null>(
    null,
  );
  const [quotaResetLabel, setQuotaResetLabel] = useState<string | null>(null);

  const [mediaPickerSlot, setMediaPickerSlot] = useState<number | null>(null);
  const [sourcePickerVisible, setSourcePickerVisible] = useState(false);
  // Upload progress while "Generate Reel" sends the slot files (one at a time)
  const [uploadProgress, setUploadProgress] = useState<{
    current: number;
    total: number;
    percent: number;
    phase: "compressing" | "uploading";
  } | null>(null);
  // Video sent to the editor for a slot; its edited copy comes back on focus
  const editRequestRef = useRef<{
    id: string;
    sourceType: MediaUploadSourceType;
    slotIndex: number;
  } | null>(null);
  const [pipelineModal, setPipelineModal] = useState<HairPipelineModalState>(
    INITIAL_HAIR_PIPELINE_STATE,
  );

  const selected = useMemo(
    () => templates.find((item) => item.id === selectedId) ?? null,
    [selectedId, templates],
  );

  const mediaFields = useMemo(
    () => normalizeReelTemplateMediaFields(selected?.media_fields),
    [selected?.media_fields],
  );

  const activeSlotField = useMemo(
    () =>
      mediaPickerSlot != null ? mediaFields[mediaPickerSlot] : undefined,
    [mediaFields, mediaPickerSlot],
  );

  const applyTemplate = useCallback(
    (template: ReelTemplate) => {
      setSelectedId(template.id);
      const fields = normalizeReelTemplateMediaFields(template.media_fields);
      const count =
        template.media_count || fields.length || 0;
      setSelectedMedia(Array.from({ length: count }, () => null));
      const initialTexts: Record<string, string> = {};
      for (const field of template.text_fields || []) {
        initialTexts[field] = field === "business_name" ? businessName : "";
      }
      setTexts(initialTexts);
    },
    [businessName],
  );

  const loadTemplates = useCallback(async () => {
    setLoadingTemplates(true);
    setTemplatesError(null);
    try {
      const data = await listReelTemplates();
      const active = data.filter((item) => item.is_active !== false);
      setTemplates(active);
      if (active.length === 1) {
        applyTemplate(active[0]);
      }
    } catch (error: any) {
      Logger.error("Failed to load reel templates:", error);
      setTemplates([]);
      setTemplatesError(
        error?.message || t("failedToLoadTemplates"),
      );
    } finally {
      setLoadingTemplates(false);
    }
  }, [applyTemplate, t]);

  /** Returns the blocked message, "" when the user can post, null if it couldn't load. */
  const loadReelLimits = useCallback(async (): Promise<string | null> => {
    try {
      const limits = await getMediaLimits({ force: true });
      const blocked = monthlyReelsBlockedMessage(limits, t);
      if (typeof limits.reels_remaining_this_month === "number") {
        setReelsRemaining(limits.reels_remaining_this_month);
      }
      setQuotaBlockedMessage(blocked);
      setQuotaResetLabel(formatReelsResetDate(limits.monthly_reels_reset_on));
      return blocked ?? "";
    } catch (error) {
      Logger.error("Failed to load media limits for template reel:", error);
      return null;
    }
  }, [t]);

  useEffect(() => {
    void loadReelLimits();
  }, [loadReelLimits]);

  useEffect(() => {
    if (userRole !== "staff") return;
    fetchStaffBusinessCategory(userBusinessId)
      .then(setStaffBusinessCategory)
      .catch((error) => {
        Logger.error("Failed to load staff business category:", error);
      });
  }, [userRole, userBusinessId]);

  useEffect(() => {
    void loadTemplates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (resolvedBusinessCategory?.id != null) return;
    void dispatch(fetchUserStatus({ showError: false }));
  }, [dispatch, resolvedBusinessCategory?.id]);

  useEffect(() => {
    if (userPickedCategoryRef.current) return;
    if (!resolvedBusinessCategory?.id) return;
    setCategoryId(resolvedBusinessCategory.id);
    setCategoryName(resolvedBusinessCategory.name ?? "");
  }, [resolvedBusinessCategory]);

  const fieldLabel = useCallback(
    (field: string) => {
      const key = TEXT_FIELD_LABELS[field];
      return key ? t(key) : field.replace(/_/g, " ");
    },
    [t],
  );

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
      return [];
    } finally {
      setLoadingCategories(false);
    }
  }, [categories]);

  const openCategoryPicker = useCallback(async () => {
    setShowCategoryPicker((prev) => !prev);
    if (!showCategoryPicker) await loadCategories();
  }, [loadCategories, showCategoryPicker]);

  const openSourcePicker = useCallback((slotIndex: number) => {
    setMediaPickerSlot(slotIndex);
    setSourcePickerVisible(true);
  }, []);

  const dismissSourcePicker = useCallback(() => {
    setSourcePickerVisible(false);
    setMediaPickerSlot(null);
  }, []);

  /** Slot video → step-by-step Reel Studio (trim + edit), capped at reel length. */
  const openTrimEditor = useCallback(
    (
      asset: ImagePicker.ImagePickerAsset,
      sourceType: MediaUploadSourceType,
      slotIndex: number,
    ) => {
      const requestId = createEditRequestId();
      editRequestRef.current = { id: requestId, sourceType, slotIndex };
      // Old full-screen editor (kept as it was — switch back by restoring this):
      // router.push({
      //   pathname: "/(main)/editVideo" as any,
      //   params: {
      //     uri: encodeURIComponent(asset.uri),
      //     mimeType: (asset as { mimeType?: string }).mimeType || "video/mp4",
      //     fileName: asset.fileName || "video.mp4",
      //     sourceType,
      //     maxSeconds: String(MAX_VIDEO_UPLOAD_SECONDS),
      //     ...(asset.width ? { width: String(asset.width) } : {}),
      //     ...(asset.height ? { height: String(asset.height) } : {}),
      //     mode: "save",
      //     requestId,
      //     limitContext: "reel",
      //   },
      // });
      router.push({
        pathname: "/(main)/reelStudio" as any,
        params: {
          uri: encodeURIComponent(asset.uri),
          mimeType: (asset as { mimeType?: string }).mimeType || "video/mp4",
          fileName: asset.fileName || "video.mp4",
          sourceType,
          maxSeconds: String(MAX_VIDEO_UPLOAD_SECONDS),
          ...(asset.width ? { width: String(asset.width) } : {}),
          ...(asset.height ? { height: String(asset.height) } : {}),
          mode: "save",
          requestId,
          limitContext: "reel",
          flowTitle: t("reelTypeTemplateTitle"),
          // Editing is part of step 2 (Add photos & videos)
          stepStart: "2",
          stepTotal: "3",
          stepFixed: "1",
        },
      });
    },
    [router, t],
  );

  /** Pick = select only (local preview). Uploads happen on "Generate Reel". */
  const selectPickedAsset = useCallback(
    async (
      asset: ImagePicker.ImagePickerAsset,
      sourceType: MediaUploadSourceType,
      slotIndex: number,
      slotField: ReelTemplateMediaField | undefined,
      /**
       * A picked video goes through the editor first (any length). Batch
       * picks: only the first video does; the editor's own result is placed.
       */
      allowTrim = true,
    ): Promise<"selected" | "trim" | "tooLong" | "skipped"> => {
      if (!asset.uri) return "skipped";

      const mime = (asset as { mimeType?: string }).mimeType ?? "";
      const isVideo = assetIsVideo(asset);

      if (isVideo && !slotAcceptsVideo(slotField)) {
        showBanner(t("error"), t("slotRequiresPhoto"), "error", 3500);
        return "skipped";
      }
      if (!isVideo && !slotAcceptsImage(slotField)) {
        showBanner(t("error"), t("slotRequiresVideo"), "error", 3500);
        return "skipped";
      }

      // One file can't fill two slots (server counts duplicate ids once)
      const alreadyUsed = selectedMedia.some(
        (m, idx) => idx !== slotIndex && m?.local.uri === asset.uri,
      );
      if (alreadyUsed) {
        showBanner(t("error"), t("mediaAlreadySelected"), "error", 2500);
        return "skipped";
      }

      let durationSeconds: number | undefined;
      let previewUri: string | null = isVideo ? null : asset.uri;
      if (isVideo) {
        if (allowTrim) {
          // Straight to the step editor: trim + edit, then it lands in the
          // slot (iOS: let the picker finish closing first)
          setTimeout(
            () => openTrimEditor(asset, sourceType, slotIndex),
            Platform.OS === "ios" ? 350 : 0,
          );
          return "trim";
        }
        // expo-image-picker reports milliseconds; measure when it's missing
        const lengthSeconds =
          typeof asset.duration === "number" && asset.duration > 0
            ? asset.duration / 1000
            : await measureVideoDurationSeconds(asset.uri);
        durationSeconds = Math.max(1, Math.round(lengthSeconds ?? 0));
        if (durationSeconds > MAX_VIDEO_UPLOAD_SECONDS) return "tooLong";
        try {
          const thumb = await VideoThumbnails.getThumbnailAsync(asset.uri, {
            time: 0,
            quality: 0.6,
          });
          previewUri = thumb.uri;
        } catch {
          // Thumbnail is cosmetic only
        }
      }

      // A new pick replaces this slot's file and any earlier upload id
      setSelectedMedia((prev) => {
        const next = [...prev];
        next[slotIndex] = {
          local: {
            uri: asset.uri,
            mimeType: mime || (isVideo ? "video/mp4" : "image/jpeg"),
            fileName: asset.fileName || (isVideo ? "video.mp4" : "photo.jpg"),
            sourceType,
            isVideo,
            durationSeconds,
            width: asset.width || undefined,
            height: asset.height || undefined,
          },
          mediaId: null,
          previewUri,
          name: asset.fileName || null,
        };
        return next;
      });
      return "selected";
    },
    [openTrimEditor, selectedMedia, showBanner, t],
  );

  // Back from the editor: put the edited copy in the slot like a fresh pick
  useFocusEffect(
    useCallback(() => {
      const request = editRequestRef.current;
      const result = takeEditedVideo(request?.id ?? null);
      if (!request || !result) return;
      editRequestRef.current = null;
      const credit = result.musicCredit;
      if (credit) {
        setEditorMusicCredits((prev) => ({ ...prev, [result.uri]: credit }));
      }
      void selectPickedAsset(
        {
          uri: result.uri,
          duration: result.durationMs,
          fileName: result.fileName,
          mimeType: result.mimeType,
          width: result.width,
          height: result.height,
          type: "video",
        } as ImagePicker.ImagePickerAsset,
        request.sourceType,
        request.slotIndex,
        mediaFields[request.slotIndex],
        false,
      );
      if (result.savedToGallery) {
        showBanner(t("success"), t("editedVideoSaved"), "success", 3000);
      } else if (result.edited) {
        showBanner(t("autoReelTrimTitle"), t("editedVideoNotSaved"), "warning", 4000);
      }
    }, [mediaFields, selectPickedAsset, showBanner, t]),
  );

  /** "Edit" on a filled video slot → the step editor again. */
  const editSlotVideo = useCallback(
    (slotIndex: number) => {
      const item = selectedMedia[slotIndex];
      if (!item?.local.isVideo) return;
      openTrimEditor(
        {
          uri: item.local.uri,
          fileName: item.local.fileName,
          mimeType: item.local.mimeType,
          width: item.local.width,
          height: item.local.height,
          type: "video",
        } as ImagePicker.ImagePickerAsset,
        item.local.sourceType,
        slotIndex,
      );
    },
    [openTrimEditor, selectedMedia],
  );

  /**
   * Gallery multi-select: picks fill `targetSlots` in order, each going to the
   * first remaining slot that accepts its type (photo / video).
   */
  const pickFromGalleryInto = useCallback(
    async (targetSlots: number[]) => {
      if (targetSlots.length === 0) return;
      const hasPermission = await handleMediaLibraryPermission();
      if (!hasPermission) return;

      const acceptsImage = targetSlots.some((i) =>
        slotAcceptsImage(mediaFields[i]),
      );
      const acceptsVideo = targetSlots.some((i) =>
        slotAcceptsVideo(mediaFields[i]),
      );
      const mediaTypes: ("images" | "videos")[] =
        acceptsImage && acceptsVideo
          ? ["images", "videos"]
          : acceptsImage
            ? ["images"]
            : ["videos"];

      try {
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes,
          allowsMultipleSelection: targetSlots.length > 1,
          selectionLimit: targetSlots.length,
          orderedSelection: true,
          quality: 0.8,
          allowsEditing: false,
          ...iosCompatiblePickerOptions,
        });
        if (result.canceled || !result.assets?.length) return;

        // Older Android pickers ignore selectionLimit — keep only what fits
        const assets = result.assets.slice(0, targetSlots.length);
        if (result.assets.length > targetSlots.length) {
          showBanner(
            t("error"),
            t("tooManyMediaSelected", { count: targetSlots.length }),
            "warning",
            3000,
          );
        }

        const freeSlots = [...targetSlots];
        let trimUsed = false;
        let tooLong = 0;
        for (const asset of assets) {
          const isVideo = assetIsVideo(asset);
          const pos = freeSlots.findIndex((i) =>
            isVideo
              ? slotAcceptsVideo(mediaFields[i])
              : slotAcceptsImage(mediaFields[i]),
          );
          if (pos === -1) continue;
          const slotIndex = freeSlots[pos];
          const outcome = await selectPickedAsset(
            asset,
            "device",
            slotIndex,
            mediaFields[slotIndex],
            !trimUsed,
          );
          if (outcome === "trim") trimUsed = true;
          if (outcome === "tooLong") tooLong += 1;
          // Trim keeps the slot reserved — the edited copy comes back into it
          if (outcome === "selected" || outcome === "trim") {
            freeSlots.splice(pos, 1);
          }
        }
        if (tooLong > 0) {
          showBanner(
            t("error"),
            t("videoTooLong", { max_seconds: MAX_VIDEO_UPLOAD_SECONDS }),
            "error",
            3500,
          );
        }
      } catch (error) {
        Logger.error("Error selecting media from gallery:", error);
        showBanner(t("error"), t("failedToSelectMedia"), "error", 3000);
      }
    },
    [mediaFields, selectPickedAsset, showBanner, t],
  );

  /** Tapped slot first, then every other empty slot — fill them in one go */
  const handleSelectFromGallery = useCallback(async () => {
    const slotIndex = mediaPickerSlot;
    setSourcePickerVisible(false);
    setMediaPickerSlot(null);
    if (slotIndex == null) return;
    const emptySlots = selectedMedia
      .map((m, i) => (m || i === slotIndex ? -1 : i))
      .filter((i) => i >= 0);
    await pickFromGalleryInto([slotIndex, ...emptySlots]);
  }, [mediaPickerSlot, pickFromGalleryInto, selectedMedia]);

  const removeSlotMedia = useCallback((slotIndex: number) => {
    setSelectedMedia((prev) => {
      const next = [...prev];
      next[slotIndex] = null;
      return next;
    });
  }, []);

  const handleSelectFromCamera = useCallback(async () => {
    const slotField = activeSlotField;
    const slotIndex = mediaPickerSlot;
    setSourcePickerVisible(false);
    setMediaPickerSlot(null);
    if (slotIndex == null) return;
    const hasPermission = await handleCameraPermission();
    if (!hasPermission) {
      setMediaPickerSlot(null);
      return;
    }

    const acceptsImage = slotAcceptsImage(slotField);
    // Prefer photo when slot allows images; otherwise record video (no length cap)
    const mediaTypes =
      acceptsImage
        ? ImagePicker.MediaTypeOptions.Images
        : ImagePicker.MediaTypeOptions.Videos;

    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes,
        quality: 0.8,
        allowsEditing: false,
        ...iosCompatiblePickerOptions,
      });
      if (!result.canceled && result.assets?.[0]) {
        await selectPickedAsset(result.assets[0], "camera", slotIndex, slotField);
      } else {
        setMediaPickerSlot(null);
      }
    } catch (error) {
      Logger.error("Error taking photo for template slot:", error);
      showBanner(t("error"), t("failedToTakePhoto"), "error", 3000);
      setMediaPickerSlot(null);
    }
  }, [activeSlotField, mediaPickerSlot, selectPickedAsset, showBanner, t]);

  const noReelsLeft = reelsRemaining != null && reelsRemaining <= 0;

  // Credits for edited clips that are still in a slot.
  const musicCreditText = useMemo(
    () =>
      musicCreditLine(
        selectedMedia.map((m) => (m ? editorMusicCredits[m.local.uri] : null)),
      ),
    [editorMusicCredits, selectedMedia],
  );
  const captionMax = 2200 - musicCreditReserve(musicCreditText);

  const allSlotsFilled =
    selectedMedia.length > 0 && selectedMedia.every((m) => !!m);
  const filledCount = selectedMedia.filter((m) => !!m).length;

  const canGenerate = useMemo(() => {
    if (!selected) return false;
    if (noReelsLeft) return false;
    if (!caption.trim()) return false;
    if (!categoryId) return false;
    if (selectedMedia.length === 0 || selectedMedia.some((m) => !m)) {
      return false;
    }
    return true;
  }, [caption, categoryId, noReelsLeft, selected, selectedMedia]);

  // Cancels the running uploads when the user leaves mid-upload
  const uploadAbortRef = useRef<AbortController | null>(null);
  // Screen gone (any way) → stop uploads that are still running
  useEffect(() => () => uploadAbortRef.current?.abort(), []);

  const handleGenerate = useCallback(async () => {
    if (!selected || !canGenerate || submitting || !categoryId) return;

    const slots = selectedMedia;
    if (slots.length !== mediaFields.length || slots.some((m) => !m)) {
      showBanner(t("error"), t("selectAllMediaSlots"), "error", 2500);
      return;
    }

    setSubmitting(true);
    // Cancelled when the user leaves mid-upload ("Leave" / screen closed)
    const controller = new AbortController();
    uploadAbortRef.current = controller;
    try {
      // Fresh monthly limit check before anything is uploaded
      const blocked = await loadReelLimits();
      if (blocked) {
        showBanner(t("monthlyReelsLimitTitle"), blocked, "error", 5000);
        return;
      }

      // 1. Upload each slot that has no media id yet, in order
      const mediaIds: number[] = [];
      const pending = slots.filter((m) => m && m.mediaId == null).length;
      let done = 0;
      for (let index = 0; index < slots.length; index++) {
        const slot = slots[index]!;
        if (slot.mediaId != null) {
          mediaIds.push(slot.mediaId);
          continue;
        }
        done += 1;
        const current = done;
        const file = slot.local;
        setUploadProgress({
          current,
          total: pending,
          percent: 0,
          phase: file.isVideo ? "compressing" : "uploading",
        });
        let uploaded: MediaVideo;
        try {
          uploaded = file.isVideo
            ? await uploadVideo(
                {
                  uri: file.uri,
                  mimeType: file.mimeType,
                  fileName: file.fileName,
                  sourceType: file.sourceType,
                  durationSeconds: Math.min(
                    MAX_VIDEO_UPLOAD_SECONDS,
                    file.durationSeconds ?? MAX_VIDEO_UPLOAD_SECONDS,
                  ),
                  width: file.width,
                  height: file.height,
                  signal: controller.signal,
                  // One bar per file: compressing 0–40, uploading 40–100
                  onCompressProgress: (percent) =>
                    setUploadProgress({
                      current,
                      total: pending,
                      percent: Math.round(percent * 0.4),
                      phase: "compressing",
                    }),
                },
                (percent) =>
                  setUploadProgress({
                    current,
                    total: pending,
                    percent: Math.round(40 + percent * 0.6),
                    phase: "uploading",
                  }),
              )
            : await uploadImage(
                {
                  uri: file.uri,
                  mimeType: file.mimeType,
                  fileName: file.fileName,
                  sourceType: file.sourceType,
                  width: file.width,
                  height: file.height,
                  signal: controller.signal,
                },
                (percent) =>
                  setUploadProgress({
                    current,
                    total: pending,
                    percent,
                    phase: "uploading",
                  }),
              );
          // Uploads come back ready; keep the fallback for anything still processing
          if (uploaded.status !== "ready") {
            uploaded = await waitForMediaReady(uploaded.id);
          }
        } catch (error: any) {
          // Left the screen mid-upload — cancelled on purpose, nothing to report
          if (isUploadCancelled(error) || controller.signal.aborted) return;
          Logger.error("Failed to upload template slot file:", error);
          showBanner(
            t("error"),
            error instanceof VideoTooLargeError
              ? t("autoReelVideoTooLarge")
              : error?.message || t("failedToUploadVideo"),
            "error",
            4000,
          );
          return;
        }
        // Save the id at once — a retry only uploads the slots still missing one
        const uploadedId = uploaded.id;
        setSelectedMedia((prev) => {
          const next = [...prev];
          if (next[index]?.local === file) {
            next[index] = { ...next[index]!, mediaId: uploadedId };
          }
          return next;
        });
        mediaIds.push(uploadedId);
      }
      setUploadProgress(null);
      // Left before generate → don't start the reel (nothing is counted)
      if (controller.signal.aborted) return;

      const textsPayload: Record<string, string> = {};
      for (const field of selected.text_fields || []) {
        const value = (texts[field] || "").trim();
        if (value) textsPayload[field] = value;
      }

      const result = await generateReelFromTemplate({
        template_id: selected.id,
        media_asset_ids: mediaIds,
        texts: textsPayload,
        category_id: categoryId,
        caption: captionWithMusicCredit(caption, musicCreditText),
        music_asset_id: null,
      });

      // Same success popup as Generate Post / Collage — notify when ready.
      setPipelineModal({
        visible: true,
        jobId: String(result.reel_id),
        jobType: "Generate Reel",
        estimatedMinutes: 2,
        progress: 0,
        imageUri: null,
        complete: false,
      });
    } catch (error: any) {
      if (controller.signal.aborted || isUploadCancelled(error)) return;
      Logger.error("Failed to start reel generation:", error);
      const fieldError = (field: string): string | null => {
        const value = error?.data?.errors?.[field];
        return Array.isArray(value) && typeof value[0] === "string"
          ? value[0]
          : null;
      };
      const reelLimitError = fieldError("reel");
      if (reelLimitError) void loadReelLimits();
      // Server refused the files — next tap uploads every slot again
      if (fieldError("media_asset_ids")) {
        setSelectedMedia((prev) =>
          prev.map((m) => (m ? { ...m, mediaId: null } : m)),
        );
      }
      const message =
        reelLimitError ||
        fieldError("template_id") ||
        fieldError("media_asset_ids") ||
        fieldError("category_id") ||
        fieldError("caption") ||
        error?.message ||
        t("failedToStartGeneration");
      showBanner(t("error"), message, "error", 4000);
    } finally {
      setUploadProgress(null);
      setSubmitting(false);
    }
  }, [
    canGenerate,
    caption,
    categoryId,
    musicCreditText,
    loadReelLimits,
    mediaFields.length,
    selected,
    selectedMedia,
    showBanner,
    submitting,
    t,
    texts,
  ]);

  /** One step back; false on the first step (the caller leaves). */
  const stepBack = useCallback((): boolean => {
    if (submitting) return true;
    if (step === "details") {
      setStep("media");
      return true;
    }
    if (step === "media") {
      setStep("template");
      return true;
    }
    return false;
  }, [step, submitting]);

  // The screen must stay open until the uploads finish; otherwise hardware
  // back goes one step back.
  const navigation = useNavigation();
  const allowLeaveRef = useRef(false);
  const guardRef = useRef({ uploading: false, stepBack });
  guardRef.current = { uploading: uploadProgress != null, stepBack };
  useEffect(() => {
    const unsubscribe = navigation.addListener("beforeRemove", (event: any) => {
      if (allowLeaveRef.current) return;
      if (guardRef.current.uploading) {
        event.preventDefault();
        Alert.alert(t("autoReelLeaveUploadTitle"), t("autoReelLeaveUploadMessage"), [
          { text: t("autoReelKeepUploading"), style: "cancel" },
          {
            text: t("autoReelLeave"),
            style: "destructive",
            // Really cancel: stop compression / uploads, no reel is generated
            onPress: () => {
              uploadAbortRef.current?.abort();
              allowLeaveRef.current = true;
              navigation.dispatch(event.data.action);
            },
          },
        ]);
        return;
      }
      // Only back presses step back — resets (e.g. sign-out) go through
      const type = event?.data?.action?.type;
      if ((type === "GO_BACK" || type === "POP") && guardRef.current.stepBack()) {
        event.preventDefault();
      }
    });
    return unsubscribe;
  }, [navigation, t]);

  const onHeaderBack = useCallback(() => {
    if (stepBack()) return;
    if (router.canGoBack()) router.back();
    else router.replace("/(main)/aiTools/toolList" as any);
  }, [router, stepBack]);

  const closePipelineModal = useCallback(() => {
    setPipelineModal(INITIAL_HAIR_PIPELINE_STATE);
    allowLeaveRef.current = true;
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(main)/aiTools/toolList" as any);
    }
  }, [router]);

  const mediaLabel =
    selected == null ? "" : mediaRequirementLabel(mediaFields, t);

  const musicLabel = selected
    ? formatMusicName(selected.music_name) || t("includesMusic")
    : "";

  const templateOptions = useMemo(
    () =>
      templates.map((tpl) => {
        const fields = normalizeReelTemplateMediaFields(tpl.media_fields);
        return {
          id: tpl.id,
          name: tpl.name,
          description: mediaRequirementLabel(fields, t) || null,
          imageUrl: tpl.thumbnail_url,
          icon: "dashboard-customize" as const,
        };
      }),
    [t, templates],
  );

  const requirements: Requirement[] = selected
    ? [
        { icon: "photo-library", text: mediaLabel },
        ...((selected.text_fields?.length ?? 0) > 0
          ? [
              {
                icon: "text-fields" as const,
                text: selected.text_fields.map(fieldLabel).join(" · "),
              },
            ]
          : []),
        ...(selected.has_music
          ? [{ icon: "music-note" as const, text: musicLabel }]
          : []),
      ]
    : [];

  // ── Steps ─────────────────────────────────────────────────────────

  const renderTemplateStep = () => (
    <>
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <FlowTitle
          title={t("flowChooseTemplateTitle")}
          subtitle={t("flowChooseTemplateSubtitle")}
        />
        {reelsRemaining != null ? (
          <QuotaBanner
            remaining={reelsRemaining}
            blockedMessage={quotaBlockedMessage}
            resetLabel={quotaResetLabel}
          />
        ) : null}
        <TemplateDropdown
          options={templateOptions}
          selectedId={selectedId}
          onSelect={(id) => {
            const tpl = templates.find((item) => item.id === id);
            if (tpl && tpl.id !== selectedId) applyTemplate(tpl);
          }}
          loading={loadingTemplates}
          error={templatesError}
          onRetry={() => void loadTemplates()}
          placeholder={t("selectTemplatePlaceholder")}
        />
        {selected ? (
          <RequirementsCard
            imageUrl={selected.thumbnail_url}
            requirements={requirements}
          />
        ) : null}
      </ScrollView>
      <FlowFooter
        primary={{
          label: t("flowNextAddMedia"),
          onPress: () => setStep("media"),
          disabled: !selected,
          trailingIcon: "chevron-right",
        }}
        hint={!selected ? t("flowPickTemplateHint") : null}
      />
    </>
  );

  const renderMediaStep = () => (
    <>
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <FlowTitle
          title={t("flowAddMediaTitle")}
          subtitle={[mediaLabel, t("flowAddMediaSubtitle")]
            .filter(Boolean)
            .join(" · ")}
        />
        <View style={styles.slots}>
          {selectedMedia.map((media, index) => {
            const field = mediaFields[index];
            const label = field?.label || t("mediaSlot", { number: index + 1 });
            if (!media) {
              const photoOnly =
                slotAcceptsImage(field) && !slotAcceptsVideo(field);
              const videoOnly =
                !slotAcceptsImage(field) && slotAcceptsVideo(field);
              return (
                <TouchableOpacity
                  activeOpacity={0.8}
                  key={field?.key ?? `slot-${index}`}
                  style={[
                    styles.slotEmpty,
                  ]}
                  onPress={() => openSourcePicker(index)}
                  disabled={submitting}
                  accessibilityRole="button"
                  accessibilityLabel={`${label}. ${field ? slotTypeHint(field, t) : t("tapToSelectMedia")}`}
                >
                  <View style={styles.slotEmptyIcon}>
                    <MaterialIcons
                      name={
                        videoOnly
                          ? "videocam"
                          : photoOnly
                            ? "add-photo-alternate"
                            : "perm-media"
                      }
                      size={moderateWidthScale(30)}
                      color={theme.buttonBack}
                    />
                  </View>
                  <View style={styles.slotText}>
                    <Text style={styles.slotTitle} numberOfLines={1}>
                      {label}
                    </Text>
                    <Text style={styles.slotSub} numberOfLines={2}>
                      {field ? slotTypeHint(field, t) : t("tapToSelectMedia")}
                    </Text>
                  </View>
                  <View style={styles.slotAdd}>
                    <MaterialIcons
                      name="add"
                      size={moderateWidthScale(26)}
                      color={theme.white}
                    />
                  </View>
                </TouchableOpacity>
              );
            }
            return (
              <View key={field?.key ?? `slot-${index}`} style={styles.slotCard}>
                <SelectedMediaRow
                  thumbUri={media.previewUri}
                  isPhoto={!media.local.isVideo}
                  title={label}
                  subtitle={[
                    media.name || t("mediaSelected"),
                    media.local.isVideo && media.local.durationSeconds
                      ? formatVideoDuration(media.local.durationSeconds)
                      : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                  secondaryAction={
                    media.local.isVideo && !submitting
                      ? {
                          icon: "content-cut",
                          label: t("autoReelEditVideo"),
                          onPress: () => editSlotVideo(index),
                        }
                      : null
                  }
                  onAction={submitting ? null : () => removeSlotMedia(index)}
                  actionLabel={t("remove")}
                />
              </View>
            );
          })}
        </View>
        {mediaFields.some((f) => slotAcceptsVideo(f)) ? (
          <InfoNote icon="content-cut" text={t("flowTemplateVideoNote")} />
        ) : null}
      </ScrollView>
      <FlowFooter
        primary={{
          label: t("flowNextAddDetails"),
          onPress: () => setStep("details"),
          disabled: !allSlotsFilled,
          trailingIcon: "chevron-right",
        }}
        hint={
          allSlotsFilled
            ? null
            : t("flowSlotsFilled", {
                filled: filledCount,
                total: selectedMedia.length,
              })
        }
      />
    </>
  );

  const renderDetailsStep = () => {
    const progress = uploadProgress
      ? {
          label: t(
            uploadProgress.phase === "compressing"
              ? "templateCompressingProgress"
              : "templateUploadingProgress",
            {
              current: uploadProgress.current,
              total: uploadProgress.total,
              percent: uploadProgress.percent,
            },
          ),
          percent: uploadProgress.percent,
        }
      : null;
    return (
      <>
        <KeyboardAwareScrollView
          style={styles.flex}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bottomOffset={moderateHeightScale(140)}
        >
          <FlowTitle
            title={t("flowDetailsTitle")}
            subtitle={t("flowTemplateDetailsSubtitle")}
          />
          {selected?.text_fields?.map((field) => (
            <FlowTextField
              key={field}
              label={fieldLabel(field)}
              value={texts[field] || ""}
              onChangeText={(value) =>
                setTexts((prev) => ({ ...prev, [field]: value }))
              }
              placeholder={fieldLabel(field)}
              editable={!submitting}
            />
          ))}
          <FlowTextField
            label={t("caption")}
            required
            value={caption}
            onChangeText={(v) => setCaption(v.slice(0, captionMax))}
            placeholder={t("flowCaptionPlaceholder")}
            multiline
            maxCount={captionMax}
            editable={!submitting}
          />
          {musicCreditText ? (
            <Text style={styles.creditNote}>
              {t("musicCreditAutoAdded", { credit: musicCreditText })}
            </Text>
          ) : null}
          <SelectField
            label={t("category")}
            required
            value={categoryName || null}
            placeholder={t("selectCategory")}
            open={showCategoryPicker}
            loading={loadingCategories}
            options={categories}
            selectedId={categoryId}
            onToggle={() => void openCategoryPicker()}
            onSelect={(cat) => {
              userPickedCategoryRef.current = true;
              setCategoryId(cat.id);
              setCategoryName(cat.name);
              setShowCategoryPicker(false);
            }}
          />
          {uploadProgress ? (
            <InfoNote
              tone="warm"
              icon="upload"
              text={t("autoReelKeepOpenWhileUploading")}
            />
          ) : null}
        </KeyboardAwareScrollView>
        <FlowFooter
          progress={progress}
          primary={{
            label: t("generateReel"),
            onPress: () => void handleGenerate(),
            disabled: !canGenerate || submitting,
            loading: submitting,
            icon: "auto-awesome",
          }}
          hint={
            submitting
              ? null
              : noReelsLeft
                ? quotaBlockedMessage || t("autoReelNoReelsLeft")
                : !caption.trim()
                  ? t("flowCaptionNeeded")
                  : !categoryId
                    ? t("autoReelNeedCategory")
                    : null
          }
        />
      </>
    );
  };

  const stepNumber = step === "template" ? 1 : step === "media" ? 2 : 3;

  return (
    <View style={styles.safeArea}>
      <FlowHeader
        title={t("reelTypeTemplateTitle")}
        step={{ current: stepNumber, total: 3 }}
        onBack={onHeaderBack}
        backDisabled={submitting}
        backIcon={step === "template" ? "close" : "back"}
      />
      {step === "template" ? renderTemplateStep() : null}
      {step === "media" ? renderMediaStep() : null}
      {step === "details" ? renderDetailsStep() : null}

      <ImagePickerModal
        visible={sourcePickerVisible}
        onClose={dismissSourcePicker}
        onImageSelected={() => {}}
        title={activeSlotField?.label || t("selectMedia")}
        onGalleryPress={handleSelectFromGallery}
        onCameraPress={handleSelectFromCamera}
        cameraLabel={
          slotAcceptsImage(activeSlotField) ? t("fromCamera") : t("recordVideo")
        }
        cameraIcon={slotAcceptsImage(activeSlotField) ? "camera-alt" : "videocam"}
      />

      <HairPipelineProcessingModal
        state={pipelineModal}
        onClose={closePipelineModal}
      />
    </View>
  );
}
