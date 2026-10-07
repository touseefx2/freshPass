import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  useFocusEffect,
  useLocalSearchParams,
  useNavigation,
  useRouter,
} from "expo-router";
import { useTranslation } from "react-i18next";
import { MaterialIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import * as VideoThumbnails from "expo-video-thumbnails";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useNotificationContext } from "@/src/contexts/NotificationContext";
import { useAppDispatch, useAppSelector, useTheme } from "@/src/hooks/hooks";
import { ApiService } from "@/src/services/api";
import { businessEndpoints } from "@/src/services/endpoints";
import Logger from "@/src/services/logger";
import { fetchReelServiceOptions } from "@/src/services/reelServicesOptions";
import { fetchStaffBusinessCategory } from "@/src/services/staffBusinessService";
import {
  getMediaLimits,
  getVideo,
  MAX_AUTO_REEL_SOURCE_SECONDS,
  uploadVideo,
  VideoTooLargeError,
} from "@/src/services/mediaLibraryService";
import {
  formatVideoDuration,
  measureVideoDurationSeconds,
} from "@/src/utils/videoDuration";
import { isUploadCancelled } from "@/src/utils/uploadCancel";
import { extractVideoThumbnail } from "@/src/utils/videoThumbnailCache";
import {
  handleCameraPermission,
  handleMediaLibraryPermission,
} from "@/src/services/mediaPermissionService";
import {
  createAutoReel,
  listAutoReelTemplates,
} from "@/src/services/reelsService";
import {
  formatReelsResetDate,
  monthlyReelsBlockedMessage,
} from "@/src/services/monthlyReelsService";
import { fetchUserStatus } from "@/src/state/thunks/businessThunks";
import {
  createEditRequestId,
  takeEditedVideo,
} from "@/src/components/videoEditor/editorHandoff";
import {
  captionWithMusicCredit,
  musicCreditLine,
  musicCreditReserve,
} from "@/src/services/musicLibraryService";
import FlowHeader from "@/src/components/reelFlow/flowHeader";
import FlowFooter from "@/src/components/reelFlow/flowFooter";
import {
  FlowCard,
  FlowTitle,
  InfoNote,
  SectionLabel,
  SelectedMediaRow,
  SourceCard,
} from "@/src/components/reelFlow/flowParts";
import TemplateDropdown from "@/src/components/reelFlow/templateDropdown";
import RequirementsCard from "@/src/components/reelFlow/requirementsCard";
import QuotaBanner from "@/src/components/reelFlow/quotaBanner";
import ProgressTracker from "@/src/components/reelFlow/progressTracker";
import {
  ChoiceChips,
  FlowTextField,
  SelectField,
} from "@/src/components/reelFlow/detailsFields";
import { Theme } from "@/src/theme/colors";
import {
  moderateHeightScale,
  moderateWidthScale,
  widthScale,
} from "@/src/theme/dimensions";
import { fontSize, fonts } from "@/src/theme/fonts";
import type { MediaUploadSourceType } from "@/src/types/media";
import type { AutoReelTemplate } from "@/src/types/reels";

/**
 * AI auto reel — one task per screen:
 *   1 Choose a style (template dropdown + what it needs)
 *   2 Add your video (up to 3 min)
 *   3–4 Reel Studio: trim + edit (always — any length)
 *   5 Details (category, service, caption) → Make my reel
 * then "Creating your reel" while the video uploads, and the AI Auto Reel
 * screen tracks it (selecting highlights → building) → preview → publish.
 */

const iosCompatiblePickerOptions =
  Platform.OS === "ios"
    ? {
        preferredAssetRepresentationMode:
          ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
      }
    : {};

const CAPTION_MAX = 2200;

/** Share of the single progress bar used by on-phone compression (rest = upload) */
const COMPRESS_SHARE = 0.4;

type WizardStep = "style" | "video" | "details" | "creating";

type CategoryOption = { id: number; name: string };
type ServiceOption = { id: number; name: string };

/** File picked on the phone — uploaded only when "Make my reel" is tapped */
type PickedVideoFile = {
  uri: string;
  mimeType: string;
  fileName: string;
  sourceType: MediaUploadSourceType;
  durationSeconds: number;
  width?: number;
  height?: number;
};

/** What the editor needs: a picker asset or the selected local file */
type EditorSource = {
  uri: string;
  mimeType?: string | null;
  fileName?: string | null;
  width?: number;
  height?: number;
};

type SourceVideo = {
  /** Server media id (purpose=auto_reel_source) once uploaded, or reused from "Try another template" */
  id: number | null;
  /** Picked file still to upload; null when the video only exists on the server */
  local: PickedVideoFile | null;
  name: string | null;
  durationSeconds: number | null;
  thumbnailUri: string | null;
};

/** First 422 message for a field, e.g. errors.reel[0] */
function fieldError(error: any, field: string): string | null {
  const value = error?.data?.errors?.[field];
  if (Array.isArray(value) && typeof value[0] === "string") return value[0];
  return null;
}

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
    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: theme.borderNormal,
    },
    summary: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(14),
      padding: moderateWidthScale(14),
    },
    summaryThumb: {
      width: widthScale(64),
      height: widthScale(64),
      borderRadius: moderateWidthScale(14),
      backgroundColor: theme.darkGreen,
      overflow: "hidden",
      alignItems: "center",
      justifyContent: "center",
    },
    summaryImage: { width: "100%", height: "100%" },
    summaryText: { flex: 1, minWidth: 0, gap: moderateHeightScale(3) },
    summaryTitle: {
      fontSize: fontSize.size17,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    summarySub: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
    },
    creditNote: {
      marginTop: -moderateHeightScale(10),
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      lineHeight: fontSize.size20,
    },
    loadingRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(10),
      paddingVertical: moderateHeightScale(8),
    },
    loadingText: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
    },
  });

export default function ReelTemplatesScreen() {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();
  const router = useRouter();
  const { showBanner } = useNotificationContext();
  const dispatch = useAppDispatch();

  // Set when coming back from a failed auto reel ("Try another template")
  const params = useLocalSearchParams<{ sourceMediaAssetId?: string }>();

  const businessStatus = useAppSelector((s) => s.user.businessStatus);
  const userRole = useAppSelector((s) => s.user.userRole);
  // Staff: their owner's business (services list is read per business)
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

  const [step, setStep] = useState<WizardStep>("style");
  const [templates, setTemplates] = useState<AutoReelTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [templatesError, setTemplatesError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const [sourceVideo, setSourceVideo] = useState<SourceVideo | null>(null);
  const [pickingVideo, setPickingVideo] = useState(false);
  const [caption, setCaption] = useState("");
  /** Library-music credit from the editor, tied to the exported file it belongs to. */
  const [editorMusicCredit, setEditorMusicCredit] = useState<{
    uri: string;
    credit: string;
  } | null>(null);
  // Only while that edited file is still the selected video.
  const musicCreditText =
    editorMusicCredit && sourceVideo?.local?.uri === editorMusicCredit.uri
      ? musicCreditLine([editorMusicCredit.credit])
      : "";
  const captionMax = CAPTION_MAX - musicCreditReserve(musicCreditText);
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
  const [services, setServices] = useState<ServiceOption[]>([]);
  const [serviceId, setServiceId] = useState<number | null>(null);
  const [reelsRemaining, setReelsRemaining] = useState<number | null>(null);
  const [quotaBlockedMessage, setQuotaBlockedMessage] = useState<string | null>(
    null,
  );
  const [quotaResetLabel, setQuotaResetLabel] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [uploadPercent, setUploadPercent] = useState<number | null>(null);
  // One 0–100 bar: compressing fills 0–40, uploading 40–100
  const [uploadPhase, setUploadPhase] = useState<"preparing" | "uploading">(
    "uploading",
  );

  const selected = useMemo(
    () => templates.find((item) => item.id === selectedId) ?? null,
    [selectedId, templates],
  );

  const loadTemplates = useCallback(async () => {
    setLoadingTemplates(true);
    setTemplatesError(null);
    try {
      const data = await listAutoReelTemplates();
      setTemplates(data);
      // User always picks the template themselves, even when there's only one
      setSelectedId((prev) =>
        prev != null && data.some((item) => item.id === prev) ? prev : null,
      );
    } catch (error: any) {
      Logger.error("Failed to load auto reel templates:", error);
      setTemplates([]);
      setTemplatesError(error?.message || t("failedToLoadTemplates"));
    } finally {
      setLoadingTemplates(false);
    }
  }, [t]);

  useEffect(() => {
    void loadTemplates();
  }, [loadTemplates]);

  // Monthly limit (owner + staff). Loaded on open; "Make my reel" loads it
  // first if it isn't known yet. Returns the blocked message, "" when the user
  // can post, or null when the limit couldn't be loaded.
  const limitsLoadedRef = useRef(false);
  const loadReelLimits = useCallback(async (): Promise<string | null> => {
    try {
      const limits = await getMediaLimits({ force: true });
      const blocked = monthlyReelsBlockedMessage(limits, t);
      if (typeof limits.reels_remaining_this_month === "number") {
        setReelsRemaining(limits.reels_remaining_this_month);
      }
      setQuotaBlockedMessage(blocked);
      setQuotaResetLabel(formatReelsResetDate(limits.monthly_reels_reset_on));
      limitsLoadedRef.current = true;
      return blocked ?? "";
    } catch (error) {
      Logger.error("Failed to load media limits for auto reel:", error);
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
    (async () => {
      try {
        setServices(
          await fetchReelServiceOptions({ userRole, businessId: userBusinessId }),
        );
      } catch (error) {
        Logger.error("Failed to load auto reel services:", error);
      }
    })();
  }, [userRole, userBusinessId]);

  // Reuse the already-uploaded raw video when retrying with another template
  useEffect(() => {
    const id = params.sourceMediaAssetId
      ? Number(params.sourceMediaAssetId)
      : null;
    if (!id) return;
    setSourceVideo({
      id,
      local: null,
      name: null,
      durationSeconds: null,
      thumbnailUri: null,
    });
    getVideo(id)
      .then(async (video) => {
        // Raw auto reel sources get no server poster — grab the first frame
        const thumbnailUri =
          video.thumbnail_url ||
          (video.playback_url
            ? await extractVideoThumbnail(video.id, video.playback_url)
            : null);
        setSourceVideo((prev) =>
          prev?.id === id
            ? {
                id,
                local: null,
                name: video.original_name,
                durationSeconds: video.duration_seconds,
                thumbnailUri,
              }
            : prev,
        );
      })
      .catch(() => {});
  }, [params.sourceMediaAssetId]);

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

  // Video sent to the editor; its edited copy comes back on focus.
  const editRequestRef = useRef<{
    id: string;
    sourceType: MediaUploadSourceType;
    /** Editing the already-selected video — keep it as is when nothing changed */
    fromSelected: boolean;
  } | null>(null);

  /** Open the step-by-step Reel Studio in "save" mode, capped at the auto reel source limit. */
  const openTrimEditor = useCallback(
    (
      asset: EditorSource,
      sourceType: MediaUploadSourceType,
      fromSelected = false,
    ) => {
      const requestId = createEditRequestId();
      editRequestRef.current = { id: requestId, sourceType, fromSelected };
      // Old full-screen editor (kept as it was — switch back by restoring this):
      // router.push({
      //   pathname: "/(main)/editVideo" as any,
      //   params: {
      //     uri: encodeURIComponent(asset.uri),
      //     mimeType: asset.mimeType || "video/mp4",
      //     fileName: asset.fileName || "video.mp4",
      //     sourceType,
      //     maxSeconds: String(MAX_AUTO_REEL_SOURCE_SECONDS),
      //     ...(asset.width ? { width: String(asset.width) } : {}),
      //     ...(asset.height ? { height: String(asset.height) } : {}),
      //     mode: "save",
      //     requestId,
      //   },
      // });
      router.push({
        pathname: "/(main)/reelStudio" as any,
        params: {
          uri: encodeURIComponent(asset.uri),
          mimeType: asset.mimeType || "video/mp4",
          fileName: asset.fileName || "video.mp4",
          sourceType,
          maxSeconds: String(MAX_AUTO_REEL_SOURCE_SECONDS),
          ...(asset.width ? { width: String(asset.width) } : {}),
          ...(asset.height ? { height: String(asset.height) } : {}),
          mode: "save",
          requestId,
          flowTitle: t("autoReelIntroTitle"),
          stepStart: "3",
          stepTotal: "5",
        },
      });
    },
    [router, t],
  );

  /**
   * Pick = select only (any length — the editor trims it on Next).
   * Upload happens on "Make my reel" (no wasted uploads).
   */
  const selectPickedVideo = useCallback(
    async (asset: ImagePicker.ImagePickerAsset, sourceType: MediaUploadSourceType) => {
      if (!asset.uri) return;

      // expo-image-picker reports video duration in milliseconds; some Android
      // gallery items report none — measure it instead of guessing
      let lengthSeconds =
        typeof asset.duration === "number" && asset.duration > 0
          ? asset.duration / 1000
          : null;
      if (lengthSeconds == null) {
        lengthSeconds = await measureVideoDurationSeconds(asset.uri);
      }
      // Round (not ceil): a camera clip capped at 180 s often reports 180.03 s
      const durationSeconds =
        lengthSeconds != null
          ? Math.max(1, Math.round(lengthSeconds))
          : // Still unknown: the server reads the real length after start and
            // fails with source_too_long if it's over 3 minutes
            MAX_AUTO_REEL_SOURCE_SECONDS;

      let localThumb: string | null = null;
      try {
        const thumb = await VideoThumbnails.getThumbnailAsync(asset.uri, {
          time: 0,
          quality: 0.6,
        });
        localThumb = thumb.uri;
      } catch {
        // Thumbnail is cosmetic only
      }

      const mime = (asset as { mimeType?: string }).mimeType ?? "";
      // A new pick replaces any earlier upload — that id is no longer used
      setSourceVideo({
        id: null,
        local: {
          uri: asset.uri,
          mimeType: mime || "video/mp4",
          fileName: asset.fileName || "video.mp4",
          sourceType,
          durationSeconds,
          width: asset.width || undefined,
          height: asset.height || undefined,
        },
        name: asset.fileName || null,
        durationSeconds: lengthSeconds != null ? durationSeconds : null,
        thumbnailUri: localThumb,
      });
    },
    [],
  );

  /** Next on "Add your video": always through the editor (any length). */
  const handleEditSelectedVideo = useCallback(() => {
    const local = sourceVideo?.local;
    if (!local) return;
    openTrimEditor(local, local.sourceType, true);
  }, [openTrimEditor, sourceVideo?.local]);

  // Back from the editor: select its edited copy and go on to the details.
  useFocusEffect(
    useCallback(() => {
      const request = editRequestRef.current;
      const result = takeEditedVideo(request?.id ?? null);
      if (!request || !result) return;
      editRequestRef.current = null;
      // Nothing changed — keep the current selection (and any upload id)
      if (request.fromSelected && !result.edited) {
        setStep("details");
        return;
      }
      setEditorMusicCredit(
        result.musicCredit ? { uri: result.uri, credit: result.musicCredit } : null,
      );
      void selectPickedVideo(
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
      ).then(() => setStep("details"));
      if (result.savedToGallery) {
        showBanner(t("success"), t("editedVideoSaved"), "success", 3000);
      } else if (result.edited) {
        showBanner(t("autoReelTrimTitle"), t("editedVideoNotSaved"), "warning", 4000);
      }
    }, [selectPickedVideo, showBanner, t]),
  );

  const handleSelectFromGallery = useCallback(async () => {
    const hasPermission = await handleMediaLibraryPermission();
    if (!hasPermission) return;
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["videos"],
        allowsMultipleSelection: false,
        quality: 1,
        allowsEditing: false,
        ...iosCompatiblePickerOptions,
      });
      if (!result.canceled && result.assets?.[0]) {
        setPickingVideo(true);
        await selectPickedVideo(result.assets[0], "device");
      }
    } catch (error) {
      Logger.error("Error selecting auto reel video from gallery:", error);
      showBanner(t("error"), t("failedToSelectMedia"), "error", 3000);
    } finally {
      setPickingVideo(false);
    }
  }, [showBanner, t, selectPickedVideo]);

  const handleRecordVideo = useCallback(async () => {
    const hasPermission = await handleCameraPermission();
    if (!hasPermission) return;
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ["videos"],
        quality: 1,
        allowsEditing: false,
        ...iosCompatiblePickerOptions,
      });
      if (!result.canceled && result.assets?.[0]) {
        setPickingVideo(true);
        await selectPickedVideo(result.assets[0], "camera");
      }
    } catch (error) {
      Logger.error("Error recording auto reel video:", error);
      showBanner(t("error"), t("failedToSelectMedia"), "error", 3000);
    } finally {
      setPickingVideo(false);
    }
  }, [showBanner, t, selectPickedVideo]);

  const noReelsLeft = reelsRemaining != null && reelsRemaining <= 0;

  const canGenerate =
    !!selected &&
    !!sourceVideo &&
    (sourceVideo.id != null || sourceVideo.local != null) &&
    !!categoryId &&
    !noReelsLeft;

  /** Upload the picked file (compress → POST /api/media) and keep its id. */
  const uploadSelectedVideo = useCallback(
    async (video: SourceVideo, signal?: AbortSignal): Promise<number | null> => {
      const local = video.local;
      if (!local) return null;
      setUploadPhase("preparing");
      setUploadPercent(0);
      try {
        const uploaded = await uploadVideo(
          {
            uri: local.uri,
            mimeType: local.mimeType,
            fileName: local.fileName,
            sourceType: local.sourceType,
            durationSeconds: local.durationSeconds,
            width: local.width,
            height: local.height,
            purpose: "auto_reel_source",
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
        // Save the id at once: if the start fails, the next tap won't upload again
        setSourceVideo((prev) =>
          prev?.local === local
            ? {
                ...prev,
                id: uploaded.id,
                durationSeconds:
                  uploaded.duration_seconds ?? prev.durationSeconds,
              }
            : prev,
        );
        return uploaded.id;
      } catch (error: any) {
        // Left the screen mid-upload — cancelled on purpose, nothing to report
        if (isUploadCancelled(error)) return null;
        Logger.error("Failed to upload auto reel source video:", error);
        showBanner(
          t("error"),
          error instanceof VideoTooLargeError
            ? t("autoReelVideoTooLarge")
            : error?.message || t("failedToUploadVideo"),
          "error",
          4000,
        );
        return null;
      } finally {
        setUploadPercent(null);
        setUploadPhase("uploading");
      }
    },
    [showBanner, t],
  );

  // Cancels the running upload when the user leaves mid-upload
  const uploadAbortRef = useRef<AbortController | null>(null);
  // Screen gone (any way) → stop an upload that's still running
  useEffect(() => () => uploadAbortRef.current?.abort(), []);

  /** Leaving on purpose (reel started) — skip the leave guard. */
  const allowLeaveRef = useRef(false);

  const handleGenerate = useCallback(async () => {
    if (!selected || !sourceVideo || !categoryId || submitting) return;

    setSubmitting(true);
    // Limit not known yet (still loading / failed on open) → load it before going on
    let blocked: string | null = noReelsLeft
      ? quotaBlockedMessage || t("autoReelNoReelsLeft")
      : "";
    if (!limitsLoadedRef.current) {
      blocked = await loadReelLimits();
      if (blocked == null) {
        setSubmitting(false);
        showBanner(t("error"), t("monthlyReelsLoadFailed"), "error", 4000);
        return;
      }
    }
    // No reels left → say so before uploading anything
    if (blocked) {
      setSubmitting(false);
      showBanner(t("monthlyReelsLimitTitle"), blocked, "error", 5000);
      return;
    }

    // "Creating your reel" — upload progress first, then the AI steps
    setStep("creating");
    // Cancelled when the user leaves mid-upload ("Leave" / screen closed)
    const controller = new AbortController();
    uploadAbortRef.current = controller;
    try {
      // 1. Upload only if this video isn't on the server yet
      const mediaId =
        sourceVideo.id ??
        (await uploadSelectedVideo(sourceVideo, controller.signal));
      // Left before it finished → don't start the reel (nothing is counted)
      if (controller.signal.aborted) return;
      if (mediaId == null) {
        setStep("details");
        return;
      }

      // 2. Start the auto reel
      const trimmedCaption = captionWithMusicCredit(caption, musicCreditText);
      const autoReel = await createAutoReel({
        media_asset_id: mediaId,
        template_id: selected.id,
        category_id: categoryId,
        ...(serviceId ? { service_id: serviceId } : {}),
        ...(trimmedCaption ? { caption: trimmedCaption } : {}),
      });
      // 3. Server does the rest — follow it on the AI Auto Reel screen
      // (selecting highlights → building → preview → publish). The
      // auto_reel push and AI Requests → Reels still show it too.
      allowLeaveRef.current = true;
      router.replace({
        pathname: "/(main)/autoReel" as any,
        params: {
          autoReelId: String(autoReel.id),
          fromFlow: "1",
          ...(selected.preview_image_url
            ? { templateImage: selected.preview_image_url }
            : {}),
          ...(trimmedCaption ? { caption: trimmedCaption } : {}),
        },
      });
    } catch (error: any) {
      if (controller.signal.aborted || isUploadCancelled(error)) return;
      Logger.error("Failed to start auto reel:", error);
      setStep("details");
      const mediaError = fieldError(error, "media_asset_id");
      const templateError = fieldError(error, "template_id");
      if (mediaError) {
        // Server can't use that upload — drop the id so the next tap uploads
        // the picked file again (or asks for a video if there's no local file)
        setSourceVideo((prev) =>
          prev?.local ? { ...prev, id: null } : null,
        );
      }
      if (templateError) {
        // Admin may have turned it off — refresh the list
        void loadTemplates();
      }
      // Any other 422 (e.g. `reel` monthly limit) keeps the uploaded id
      const message =
        fieldError(error, "reel") ||
        fieldError(error, "auto_reel") ||
        mediaError ||
        templateError ||
        fieldError(error, "category_id") ||
        fieldError(error, "service_id") ||
        fieldError(error, "caption") ||
        error?.message ||
        t("failedToStartGeneration");
      showBanner(t("error"), message, "error", 4000);
    } finally {
      setSubmitting(false);
    }
  }, [
    caption,
    categoryId,
    loadReelLimits,
    loadTemplates,
    musicCreditText,
    noReelsLeft,
    quotaBlockedMessage,
    router,
    selected,
    serviceId,
    showBanner,
    sourceVideo,
    submitting,
    t,
    uploadSelectedVideo,
  ]);

  const isHaircut = selected?.kind === "haircut";
  // Server-only video (from "Try another template") can't be edited here
  const editable = !!sourceVideo?.local;
  const stepTotal = editable || !sourceVideo ? 5 : 3;
  const stepNumber =
    step === "style" ? 1 : step === "video" ? 2 : stepTotal;

  /** One step back; false on the first step (the caller leaves). */
  const stepBack = useCallback((): boolean => {
    if (step === "creating") return true;
    if (step === "details") {
      setStep("video");
      return true;
    }
    if (step === "video") {
      setStep("style");
      return true;
    }
    return false;
  }, [step]);

  // Compress + upload of a 3-minute video can take a minute — the screen must
  // stay open until it finishes, so confirm before leaving mid-upload.
  // Hardware back otherwise goes one step back.
  const navigation = useNavigation();
  const guardRef = useRef({ uploading: false, stepBack });
  guardRef.current = { uploading: uploadPercent != null || step === "creating", stepBack };
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
            // Really cancel: stop compression / upload, no reel is started
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
    if (step !== "creating" && stepBack()) return;
    if (router.canGoBack()) router.back();
    else router.replace("/(main)/aiTools/toolList" as any);
  }, [router, step, stepBack]);

  const templateOptions = useMemo(
    () =>
      templates.map((tpl) => ({
        id: tpl.id,
        name: tpl.name,
        description: tpl.description,
        imageUrl: tpl.preview_image_url,
        icon: (tpl.kind === "haircut" ? "content-cut" : "auto-awesome") as
          | "content-cut"
          | "auto-awesome",
      })),
    [templates],
  );

  const videoTooLong =
    !!sourceVideo?.durationSeconds &&
    sourceVideo.durationSeconds > MAX_AUTO_REEL_SOURCE_SECONDS;

  // ── Steps ─────────────────────────────────────────────────────────

  const renderStyleStep = () => (
    <>
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <FlowTitle
          title={t("flowChooseStyleTitle")}
          subtitle={t("flowChooseStyleSubtitle")}
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
          onSelect={setSelectedId}
          loading={loadingTemplates}
          error={templatesError}
          onRetry={() => void loadTemplates()}
          placeholder={t("selectTemplatePlaceholder")}
        />
        {selected ? (
          <RequirementsCard
            imageUrl={selected.preview_image_url}
            description={selected.description}
            requirements={[
              { icon: "videocam", text: t("autoReelReqVideo") },
              { icon: "timer", text: t("autoReelReqLength") },
              { icon: "graphic-eq", text: t("autoReelReqAudio") },
              { icon: "toll", text: t("autoReelReqNoCredits") },
            ]}
            tip={isHaircut ? t("autoReelHaircutHint") : null}
          />
        ) : null}
      </ScrollView>
      <FlowFooter
        primary={{
          label: t("flowNextAddVideo"),
          onPress: () => setStep("video"),
          disabled: !selected,
          trailingIcon: "chevron-right",
        }}
        hint={!selected ? t("flowPickTemplateHint") : null}
      />
    </>
  );

  const renderVideoStep = () => (
    <>
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <FlowTitle
          title={t("flowAddVideoTitle")}
          subtitle={t("flowAutoVideoSubtitle")}
        />
        <SourceCard
          icon="video-library"
          label={t("flowChooseFromGallery")}
          sublabel={t("autoReelPickVideoHint")}
          sublabelIcon="timer"
          badgeIcon="add"
          onPress={() => void handleSelectFromGallery()}
          disabled={pickingVideo}
        />
        <SourceCard
          icon="videocam"
          label={t("flowRecordVideo")}
          badgeIcon="fiber-manual-record"
          onPress={() => void handleRecordVideo()}
          disabled={pickingVideo}
        />
        {sourceVideo || pickingVideo ? (
          <>
            <View style={styles.divider} />
            <SectionLabel label={t("flowSelectedVideo")} />
            {pickingVideo ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator color={theme.buttonBack} />
                <Text style={styles.loadingText}>{t("flowAddingVideo")}</Text>
              </View>
            ) : sourceVideo ? (
              <SelectedMediaRow
                thumbUri={sourceVideo.thumbnailUri}
                title={sourceVideo.name || t("autoReelVideoAdded")}
                subtitle={[
                  formatVideoDuration(sourceVideo.durationSeconds),
                  sourceVideo.local ? null : t("flowAlreadyUploaded"),
                ]
                  .filter(Boolean)
                  .join(" · ")}
                loading={!sourceVideo.thumbnailUri}
                onAction={() => setSourceVideo(null)}
                actionLabel={t("remove")}
              />
            ) : null}
            {videoTooLong ? (
              <InfoNote
                tone="warm"
                icon="content-cut"
                text={t("flowAutoTooLongNote", {
                  max: formatVideoDuration(MAX_AUTO_REEL_SOURCE_SECONDS),
                })}
              />
            ) : null}
          </>
        ) : null}
        <InfoNote icon="auto-awesome" text={t("flowAutoVideoNote")} />
      </ScrollView>
      <FlowFooter
        primary={
          editable
            ? {
                label: t("flowNextEditVideo"),
                onPress: handleEditSelectedVideo,
                disabled: pickingVideo,
                trailingIcon: "chevron-right",
              }
            : {
                label: t("flowNextAddDetails"),
                onPress: () => setStep("details"),
                disabled: !sourceVideo || pickingVideo,
                trailingIcon: "chevron-right",
              }
        }
        hint={!sourceVideo && !pickingVideo ? t("autoReelNeedVideo") : null}
      />
    </>
  );

  const renderDetailsStep = () => (
    <>
      <KeyboardAwareScrollView
        style={styles.flex}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        bottomOffset={moderateHeightScale(120)}
      >
        <FlowTitle
          title={t("flowDetailsTitle")}
          subtitle={t("flowDetailsSubtitle")}
        />
        {selected && sourceVideo ? (
          <FlowCard>
            <View style={styles.summary}>
              <View style={styles.summaryThumb}>
                {sourceVideo.thumbnailUri ? (
                  <Image
                    source={{ uri: sourceVideo.thumbnailUri }}
                    style={styles.summaryImage}
                    contentFit="cover"
                  />
                ) : (
                  <MaterialIcons
                    name="movie"
                    size={moderateWidthScale(26)}
                    color={theme.white70}
                  />
                )}
              </View>
              <View style={styles.summaryText}>
                <Text style={styles.summaryTitle} numberOfLines={1}>
                  {selected.name}
                </Text>
                <Text style={styles.summarySub} numberOfLines={1}>
                  {[
                    formatVideoDuration(sourceVideo.durationSeconds),
                    t("autoReelReqLength"),
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </Text>
              </View>
            </View>
          </FlowCard>
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
        {services.length > 0 ? (
          <ChoiceChips
            label={t("serviceOptional")}
            options={services}
            selectedId={serviceId}
            onSelect={setServiceId}
          />
        ) : null}
        <FlowTextField
          label={t("autoReelCaptionOptional")}
          value={caption}
          onChangeText={(v) => setCaption(v.slice(0, captionMax))}
          placeholder={t("flowCaptionPlaceholder")}
          multiline
          maxCount={captionMax}
        />
        {musicCreditText ? (
          <Text style={styles.creditNote}>
            {t("musicCreditAutoAdded", { credit: musicCreditText })}
          </Text>
        ) : null}
        <InfoNote icon="schedule" text={t("autoReelTimeHint")} />
      </KeyboardAwareScrollView>
      <FlowFooter
        primary={{
          label: t("autoReelMakeReel"),
          onPress: () => void handleGenerate(),
          disabled: !canGenerate || submitting,
          loading: submitting && step === "details",
          icon: "auto-awesome",
        }}
        hint={
          noReelsLeft
            ? quotaBlockedMessage || t("autoReelNoReelsLeft")
            : !categoryId
              ? t("autoReelNeedCategory")
              : null
        }
      />
    </>
  );

  const renderCreatingStep = () => {
    // No progress → nothing (left) to upload: the reel is being started
    const uploading = uploadPercent != null;
    const uploadLabel = !uploading
      ? t("flowStartingReel")
      : uploadPhase === "preparing"
        ? t("autoReelCompressing", { percent: uploadPercent })
        : t("autoReelUploading", { percent: uploadPercent });
    return (
      <>
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <FlowTitle
            title={t("flowCreatingTitle")}
            subtitle={t("flowCreatingSubtitle")}
          />
          <ProgressTracker
            steps={[
              {
                key: "upload",
                title: uploading
                  ? t("flowUploadingVideo")
                  : t("flowUploadComplete"),
                subtitle: uploading ? uploadLabel : t("flowUploadCompleteSub"),
                state: uploading ? "active" : "done",
              },
              {
                key: "highlights",
                title: t("flowSelectingHighlights"),
                subtitle: uploading
                  ? t("flowSelectingHighlightsSub")
                  : t("flowStartingReel"),
                state: uploading ? "pending" : "active",
              },
              {
                key: "build",
                title: t("flowBuildingReel"),
                subtitle: t("flowBuildingReelSub"),
                state: "pending",
              },
            ]}
          />
          {selected ? (
            <FlowCard>
              <View style={styles.summary}>
                <View style={styles.summaryThumb}>
                  {selected.preview_image_url ? (
                    <Image
                      source={{ uri: selected.preview_image_url }}
                      style={styles.summaryImage}
                      contentFit="cover"
                    />
                  ) : (
                    <MaterialIcons
                      name="movie-filter"
                      size={moderateWidthScale(26)}
                      color={theme.white70}
                    />
                  )}
                </View>
                <View style={styles.summaryText}>
                  <Text style={styles.summaryTitle} numberOfLines={1}>
                    {selected.name}
                  </Text>
                  {selected.description ? (
                    <Text style={styles.summarySub} numberOfLines={2}>
                      {selected.description}
                    </Text>
                  ) : null}
                </View>
              </View>
            </FlowCard>
          ) : null}
          <InfoNote
            tone="warm"
            icon="upload"
            title={t("flowKeepOpenTitle")}
            text={t("autoReelKeepOpenWhileUploading")}
          />
        </ScrollView>
        <FlowFooter
          progress={{
            label: uploadLabel,
            percent: uploadPercent,
          }}
          primary={{
            label: uploadLabel,
            onPress: () => {},
            loading: true,
          }}
        />
      </>
    );
  };

  return (
    <View style={styles.safeArea}>
      <FlowHeader
        title={t("autoReelIntroTitle")}
        step={
          step === "creating" ? null : { current: stepNumber, total: stepTotal }
        }
        onBack={onHeaderBack}
        backIcon={step === "style" ? "close" : "back"}
      />
      {step === "style" ? renderStyleStep() : null}
      {step === "video" ? renderVideoStep() : null}
      {step === "details" ? renderDetailsStep() : null}
      {step === "creating" ? renderCreatingStep() : null}
    </View>
  );
}
