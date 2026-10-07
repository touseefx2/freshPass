import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
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
  setEditorSeed,
  takeEditedVideo,
  type EditedVideoResult,
} from "@/src/components/videoEditor/editorHandoff";
import {
  IMAGE_CLIP_DEFAULT_MS,
  MAX_EDITOR_CLIPS,
} from "@/src/components/videoEditor/editorModel";
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
import MediaTileGrid from "@/src/components/reelFlow/mediaTileGrid";
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
 *   2 Add your videos / photos (several at once)
 *   3–4 Reel Studio: trim + edit them into one video (always — any length, up to 3 min)
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

/** Photo / video picked on "Add your video" — the editor combines them all */
type PickedMedia = {
  id: string;
  kind: "video" | "image";
  uri: string;
  mimeType: string;
  fileName: string;
  sourceType: MediaUploadSourceType;
  /** Videos only; null until known */
  durationSeconds: number | null;
  width?: number;
  height?: number;
  thumbnailUri: string | null;
  /** The editor's result (shown as "Your edited video") */
  edited?: boolean;
};

let pickSeq = 0;
const nextPickId = () => `pick-${Date.now()}-${pickSeq++}`;

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

  /** The video "Make my reel" uploads (editor result, or a server-only one). */
  const [sourceVideo, setSourceVideo] = useState<SourceVideo | null>(null);
  /** What the editor opens with on Next (photos + videos, in order). */
  const [picks, setPicks] = useState<PickedMedia[]>([]);
  const picksRef = useRef(picks);
  picksRef.current = picks;
  const [addingMedia, setAddingMedia] = useState(false);
  /** Which source card is adding (its icon shows the spinner). */
  const [pickingFrom, setPickingFrom] = useState<"gallery" | "camera" | null>(
    null,
  );
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

  // Picks sent to the editor; its edited video comes back on focus.
  const editRequestRef = useRef<{
    id: string;
    sourceType: MediaUploadSourceType;
    /** Re-editing the video the editor made last time — keep it when nothing changed */
    fromSelected: boolean;
  } | null>(null);

  /**
   * Open the step-by-step Reel Studio in "save" mode with every pick; it
   * hands back one video, capped at the auto reel source limit.
   */
  const openTrimEditor = useCallback(
    (items: PickedMedia[], fromSelected = false) => {
      if (items.length === 0) return;
      const requestId = createEditRequestId();
      const sourceType = items[0].sourceType;
      editRequestRef.current = { id: requestId, sourceType, fromSelected };
      // Old full-screen editor (kept as it was — one video only; switch back by restoring this):
      // const asset = items[0];
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
      // Route params carry one uri — the studio reads the picks from the seed
      setEditorSeed(
        requestId,
        items.map((item) => ({
          uri: item.uri,
          kind: item.kind,
          fileName: item.fileName,
          mimeType: item.mimeType,
          width: item.width,
          height: item.height,
          sourceType: item.sourceType,
        })),
      );
      router.push({
        pathname: "/(main)/reelStudio" as any,
        params: {
          sourceType,
          maxSeconds: String(MAX_AUTO_REEL_SOURCE_SECONDS),
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

  /** Picker asset → tile. Any length — the editor trims on Next. */
  const toPickedMedia = useCallback(
    (
      asset: ImagePicker.ImagePickerAsset,
      sourceType: MediaUploadSourceType,
    ): PickedMedia | null => {
      if (!asset.uri) return null;
      const isPhoto = asset.type === "image";
      const mime = (asset as { mimeType?: string }).mimeType ?? "";
      return {
        id: nextPickId(),
        kind: isPhoto ? "image" : "video",
        uri: asset.uri,
        mimeType: mime || (isPhoto ? "image/jpeg" : "video/mp4"),
        fileName: asset.fileName || (isPhoto ? "photo.jpg" : "video.mp4"),
        sourceType,
        // expo-image-picker reports video length in milliseconds
        durationSeconds:
          !isPhoto && typeof asset.duration === "number" && asset.duration > 0
            ? Math.max(1, Math.round(asset.duration / 1000))
            : null,
        width: asset.width || undefined,
        height: asset.height || undefined,
        thumbnailUri: isPhoto ? asset.uri : null,
      };
    },
    [],
  );

  /** Video tiles show at once; their frame (and any missing length) fills in after. */
  const fillVideoDetails = useCallback(async (items: PickedMedia[]) => {
    for (const item of items) {
      if (item.kind !== "video") continue;
      let durationSeconds = item.durationSeconds;
      if (durationSeconds == null) {
        // Some Android gallery items report no length — measure it
        const measured = await measureVideoDurationSeconds(item.uri);
        durationSeconds = measured != null ? Math.max(1, Math.round(measured)) : null;
      }
      let thumbnailUri: string | null = null;
      try {
        const thumb = await VideoThumbnails.getThumbnailAsync(item.uri, {
          time: 0,
          quality: 0.6,
        });
        thumbnailUri = thumb.uri;
      } catch {
        // Thumbnail is cosmetic only
      }
      setPicks((prev) =>
        prev.map((p) =>
          p.id === item.id ? { ...p, durationSeconds, thumbnailUri } : p,
        ),
      );
    }
  }, []);

  const addPicks = useCallback(
    (assets: ImagePicker.ImagePickerAsset[], sourceType: MediaUploadSourceType) => {
      const room = MAX_EDITOR_CLIPS - picksRef.current.length;
      const items = assets
        .slice(0, Math.max(0, room))
        .map((asset) => toPickedMedia(asset, sourceType))
        .filter((item): item is PickedMedia => item != null);
      if (items.length === 0) return;
      const next = [...picksRef.current, ...items];
      picksRef.current = next;
      setPicks(next);
      // New picks → Next makes a new video from the whole list (this also
      // replaces an earlier upload — that id is no longer used)
      setSourceVideo(null);
      void fillVideoDetails(items);
    },
    [fillVideoDetails, toPickedMedia],
  );

  const removePick = useCallback((id: string) => {
    const next = picksRef.current.filter((p) => p.id !== id);
    picksRef.current = next;
    setPicks(next);
    setSourceVideo(null);
  }, []);

  /** The editor's video is what gets uploaded — and the only tile now. */
  const applyEditorResult = useCallback(
    async (result: EditedVideoResult, sourceType: MediaUploadSourceType) => {
      const durationSeconds = Math.max(1, Math.round(result.durationMs / 1000));
      let thumbnailUri: string | null = null;
      try {
        const thumb = await VideoThumbnails.getThumbnailAsync(result.uri, {
          time: 0,
          quality: 0.6,
        });
        thumbnailUri = thumb.uri;
      } catch {
        // Thumbnail is cosmetic only
      }
      const mimeType = result.mimeType || "video/mp4";
      const fileName = result.fileName || "video.mp4";
      const width = result.width || undefined;
      const height = result.height || undefined;
      setSourceVideo({
        id: null,
        local: {
          uri: result.uri,
          mimeType,
          fileName,
          sourceType,
          durationSeconds,
          width,
          height,
        },
        name: fileName,
        durationSeconds,
        thumbnailUri,
      });
      const tile: PickedMedia = {
        id: nextPickId(),
        kind: "video",
        uri: result.uri,
        mimeType,
        fileName,
        sourceType,
        durationSeconds,
        width,
        height,
        thumbnailUri,
        edited: result.edited,
      };
      picksRef.current = [tile];
      setPicks([tile]);
    },
    [],
  );

  /** Next on "Add your video": always through the editor (any length, any mix). */
  const handleEditPicks = useCallback(() => {
    const items = picksRef.current;
    if (items.length === 0) return;
    const current = sourceVideo?.local;
    openTrimEditor(
      items,
      items.length === 1 && !!current && current.uri === items[0].uri,
    );
  }, [openTrimEditor, sourceVideo?.local]);

  // Back from the editor: its video is selected → on to the details.
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
      void applyEditorResult(result, request.sourceType).then(() =>
        setStep("details"),
      );
      if (result.savedToGallery) {
        showBanner(t("success"), t("editedVideoSaved"), "success", 3000);
      } else if (result.edited) {
        showBanner(t("autoReelTrimTitle"), t("editedVideoNotSaved"), "warning", 4000);
      }
    }, [applyEditorResult, showBanner, t]),
  );

  /** Gallery: several videos and photos at once, in the order tapped. */
  const handleSelectFromGallery = useCallback(async () => {
    if (picksRef.current.length >= MAX_EDITOR_CLIPS) {
      showBanner(
        t("flowAddVideoTitle"),
        t("clipsLimitReached", { max: MAX_EDITOR_CLIPS }),
        "warning",
        3500,
      );
      return;
    }
    // Spinner on the card from the tap until the picks are in (Android
    // copies the files after the picker closes)
    setAddingMedia(true);
    setPickingFrom("gallery");
    try {
      const hasPermission = await handleMediaLibraryPermission();
      if (!hasPermission) return;
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["videos", "images"],
        allowsMultipleSelection: true,
        orderedSelection: true,
        selectionLimit: Math.max(1, MAX_EDITOR_CLIPS - picksRef.current.length),
        quality: 1,
        allowsEditing: false,
        ...iosCompatiblePickerOptions,
      });
      if (!result.canceled && result.assets?.length) {
        addPicks(result.assets, "device");
      }
    } catch (error) {
      Logger.error("Error selecting auto reel media from gallery:", error);
      showBanner(t("error"), t("failedToSelectMedia"), "error", 3000);
    } finally {
      setAddingMedia(false);
      setPickingFrom(null);
    }
  }, [addPicks, showBanner, t]);

  const handleRecordVideo = useCallback(async () => {
    if (picksRef.current.length >= MAX_EDITOR_CLIPS) {
      showBanner(
        t("flowAddVideoTitle"),
        t("clipsLimitReached", { max: MAX_EDITOR_CLIPS }),
        "warning",
        3500,
      );
      return;
    }
    setAddingMedia(true);
    setPickingFrom("camera");
    try {
      const hasPermission = await handleCameraPermission();
      if (!hasPermission) return;
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ["videos"],
        quality: 1,
        allowsEditing: false,
        ...iosCompatiblePickerOptions,
      });
      if (!result.canceled && result.assets?.[0]) {
        addPicks([result.assets[0]], "camera");
      }
    } catch (error) {
      Logger.error("Error recording auto reel video:", error);
      showBanner(t("error"), t("failedToSelectMedia"), "error", 3000);
    } finally {
      setAddingMedia(false);
      setPickingFrom(null);
    }
  }, [addPicks, showBanner, t]);

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
  const serverOnly = picks.length === 0 && !!sourceVideo && !sourceVideo.local;
  const stepTotal = serverOnly ? 3 : 5;
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

  // Length once combined (photos show for 3 s unless changed in the editor)
  const picksSeconds = picks.reduce(
    (sum, p) =>
      sum +
      (p.kind === "image"
        ? IMAGE_CLIP_DEFAULT_MS / 1000
        : p.durationSeconds ?? 0),
    0,
  );
  const picksTooLong = picksSeconds > MAX_AUTO_REEL_SOURCE_SECONDS;
  const picksLabel =
    picks.length > 1
      ? t("flowSelectedClips", { n: picks.length })
      : picks[0]?.edited
        ? t("flowEditedVideo")
        : picks[0]?.kind === "image"
          ? t("flowSelectedPhoto")
          : t("flowSelectedVideo");

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
          sublabel={t("flowGalleryVideosPhotos")}
          sublabelIcon="perm-media"
          badgeIcon="add"
          onPress={() => void handleSelectFromGallery()}
          disabled={addingMedia}
          loading={addingMedia && pickingFrom === "gallery"}
        />
        <SourceCard
          icon="videocam"
          label={t("flowRecordVideo")}
          badgeIcon="fiber-manual-record"
          onPress={() => void handleRecordVideo()}
          disabled={addingMedia}
          loading={addingMedia && pickingFrom === "camera"}
        />
        {picks.length > 0 ? (
          <>
            <View style={styles.divider} />
            <SectionLabel
              label={picksLabel}
              meta={picksSeconds > 0 ? formatVideoDuration(picksSeconds) : null}
            />
            <MediaTileGrid
              items={picks.map((p) => ({
                id: p.id,
                thumbUri: p.thumbnailUri,
                isPhoto: p.kind === "image",
                badge:
                  p.kind === "image"
                    ? `${Math.round(IMAGE_CLIP_DEFAULT_MS / 1000)}s`
                    : formatVideoDuration(p.durationSeconds),
              }))}
              onRemove={removePick}
              disabled={addingMedia}
            />
            {picksTooLong ? (
              <InfoNote
                tone="warm"
                icon="content-cut"
                text={t(
                  picks.length > 1 ? "flowAutoTooLongMany" : "flowAutoTooLongNote",
                  { max: formatVideoDuration(MAX_AUTO_REEL_SOURCE_SECONDS) },
                )}
              />
            ) : null}
          </>
        ) : sourceVideo ? (
          <>
            <View style={styles.divider} />
            <SectionLabel label={t("flowSelectedVideo")} />
            <SelectedMediaRow
              thumbUri={sourceVideo.thumbnailUri}
              title={sourceVideo.name || t("autoReelVideoAdded")}
              subtitle={[
                formatVideoDuration(sourceVideo.durationSeconds),
                t("flowAlreadyUploaded"),
              ]
                .filter(Boolean)
                .join(" · ")}
              loading={!sourceVideo.thumbnailUri}
              onAction={() => setSourceVideo(null)}
              actionLabel={t("remove")}
            />
          </>
        ) : null}
        <InfoNote icon="auto-awesome" text={t("flowAutoVideoNote")} />
      </ScrollView>
      <FlowFooter
        primary={
          serverOnly
            ? {
                label: t("flowNextAddDetails"),
                onPress: () => setStep("details"),
                disabled: addingMedia,
                trailingIcon: "chevron-right",
              }
            : {
                label: t("flowNextEditVideo"),
                onPress: handleEditPicks,
                disabled: picks.length === 0 || addingMedia,
                trailingIcon: "chevron-right",
              }
        }
        hint={
          picks.length === 0 && !sourceVideo && !addingMedia
            ? t("flowPickClipsHint")
            : null
        }
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
