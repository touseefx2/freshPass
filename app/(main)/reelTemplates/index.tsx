import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
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
  getReelCredits,
  listAutoReelTemplates,
} from "@/src/services/reelsService";
import {
  formatReelsResetDate,
  monthlyReelsBlockedMessage,
} from "@/src/services/monthlyReelsService";
import { fetchUserStatus } from "@/src/state/thunks/businessThunks";
import {
  createEditRequestId,
  setEditorAutoReelOptions,
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
  SourceCardRow,
} from "@/src/components/reelFlow/flowParts";
import MediaTileGrid from "@/src/components/reelFlow/mediaTileGrid";
import TemplateDropdown from "@/src/components/reelFlow/templateDropdown";
import RequirementsCard, {
  type Requirement,
} from "@/src/components/reelFlow/requirementsCard";
import DesignSlotCard from "@/src/components/reelFlow/designSlotCard";
import DesignMusicField from "@/src/components/reelFlow/designMusicField";
import { rememberCreateMusic } from "@/src/utils/autoReelCreateMusic";
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
import {
  isAutoBuildTemplate,
  isDesignTemplate,
  keyedFieldErrors,
  mediaSlots,
  musicFieldError,
  templateSourceMaxMinutes,
  templateSourceMaxSeconds,
  templateSourceMinSeconds,
  textSlots,
  type AutoReelMusic,
  type AutoReelSlot,
  type AutoReelTemplate,
  type ReelCredits,
} from "@/src/types/reels";
import {
  pickSlotFile,
  slotAccepts,
  uploadSlotFile,
  type SlotFile,
} from "@/src/utils/designSlots";
import {
  slotDetail,
  slotIcon,
  slotMeta,
  slotWhat,
} from "@/src/utils/templateGallery";

/**
 * AI auto reel — one task per screen:
 *   1 Choose a style (template dropdown + what it needs)
 *   2 Add your videos / photos (several at once)
 *   3–4 Reel Studio: trim + edit them into one video (always — any length, up to 3 min)
 *   5 Details (category, service, caption) → Make my reel
 * then "Creating your reel" while the video uploads, and the AI Auto Reel
 * screen tracks it (selecting highlights → building) → preview → publish.
 *
 * Design templates (`has_design`) list what they need from their slots:
 *   needs "video"  — one-video auto build: 1 style, 2 one video (up to the
 *                    template's `max_source_seconds`, else 5 min; no editor)
 *                    → "Make my reel" starts it with `auto_build: true`. The
 *                    server picks the moments and builds the reel; category
 *                    and caption are asked when publishing. Costs 1 reel credit.
 *   needs "photos" — 1 style, 2 one photo per slot + texts, 3 details (and
 *                    music when the design is silent). No video, no AI.
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
  /** One-video design: the exact length when known (the limits are checked on it) */
  exactSeconds?: number | null;
  thumbnailUri: string | null;
};

/** First 422 message for a field, e.g. errors.reel[0] */
function fieldError(error: any, field: string): string | null {
  const value = error?.data?.errors?.[field];
  if (Array.isArray(value) && typeof value[0] === "string") return value[0];
  return null;
}

/** First 422 message of any field (e.g. a credits error under an unknown key) */
function firstFieldError(error: any): string | null {
  const errors = error?.data?.errors;
  if (!errors || typeof errors !== "object") return null;
  for (const value of Object.values(errors)) {
    if (Array.isArray(value) && typeof value[0] === "string") return value[0];
    if (typeof value === "string" && value) return value;
  }
  return null;
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.background,
    },
    flex: { flex: 1 },
    loading: { flex: 1, alignItems: "center", justifyContent: "center" },
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

  // sourceMediaAssetId: back from a failed auto reel ("Try another template")
  // templateId: picked on the template gallery
  const params = useLocalSearchParams<{
    sourceMediaAssetId?: string;
    templateId?: string;
  }>();

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

  // Picked on the template gallery → that was the choice; start at the video
  const fromGallery = !!params.templateId;
  const [step, setStep] = useState<WizardStep>(fromGallery ? "video" : "style");
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
  /** One-video designs: reel credits this month (null = unknown → the server decides) */
  const [credits, setCredits] = useState<ReelCredits | null>(null);
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

  // ── Design templates ──────────────────────────────────────────────
  const isDesign = isDesignTemplate(selected);
  const needsPhotos = isDesign && selected?.needs === "photos";
  /** One-video design: upload one video, the server builds the reel (no editor, no details) */
  const isAutoBuild = isAutoBuildTemplate(selected);
  /** Longest video the one-video design takes (its own max, else 5 min) */
  const sourceMaxSeconds = templateSourceMaxSeconds(selected);
  /**
   * Video designs: shorter videos are refused before upload. One-video
   * designs need at least the reel's length (every part a new moment).
   */
  const minVideoSeconds = isAutoBuild
    ? templateSourceMinSeconds(selected)
    : isDesign && selected?.needs === "video"
      ? (selected?.min_video_seconds ?? null)
      : null;
  const designMediaSlots = useMemo(
    () => (needsPhotos ? mediaSlots(selected?.slots) : []),
    [needsPhotos, selected?.slots],
  );
  const designTextSlots = useMemo(
    () => (needsPhotos ? textSlots(selected?.slots) : []),
    [needsPhotos, selected?.slots],
  );
  /** Silent photo design: music (or "No music") is sent with the start */
  const needsMusicChoice = needsPhotos && selected?.has_sound === false;
  /**
   * Silent one-video design: its own song (`template.music`) is used unless
   * the user changes it; without one they pick a track or "No music".
   */
  const autoBuildSilent = isAutoBuild && selected?.has_sound === false;
  const autoBuildDefaultMusic = autoBuildSilent
    ? (selected?.music ?? null)
    : null;
  const businessName = useAppSelector(
    (s) => s.user.businessStatus?.business_name ?? s.user.business_name ?? "",
  );
  const [slotFiles, setSlotFiles] = useState<Record<string, SlotFile>>({});
  const slotFilesRef = useRef(slotFiles);
  slotFilesRef.current = slotFiles;
  const [slotTexts, setSlotTexts] = useState<Record<string, string>>({});
  const [slotErrors, setSlotErrors] = useState<Record<string, string>>({});
  const [textErrors, setTextErrors] = useState<Record<string, string>>({});
  const [pickingSlot, setPickingSlot] = useState<string | null>(null);
  /** undefined = not chosen yet, null = "No music" */
  const [music, setMusic] = useState<AutoReelMusic | null | undefined>(
    undefined,
  );
  /** One-video design: set when the editor hands the video back — starts the reel */
  const [autoStartAt, setAutoStartAt] = useState(0);
  const [musicError, setMusicError] = useState<string | null>(null);

  // Another template → its own slots; texts start from `prefill`
  const selectedTemplateId = selected?.id ?? null;
  useEffect(() => {
    setSlotFiles({});
    setSlotErrors({});
    setTextErrors({});
    // A silent one-video design starts at its own song, if it has one
    setMusic(
      isAutoBuildTemplate(selected) &&
        selected?.has_sound === false &&
        selected?.music
        ? selected.music
        : undefined,
    );
    setMusicError(null);
    const prefilled: Record<string, string> = {};
    for (const slot of textSlots(selected?.slots)) {
      if (slot.prefill === "business_name" && businessName) {
        prefilled[slot.key] = slot.max_length
          ? businessName.slice(0, slot.max_length)
          : businessName;
      }
    }
    setSlotTexts(prefilled);
    // Only when the template changes — not on every business name refresh
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTemplateId]);

  const photosComplete =
    designMediaSlots.every((slot) => !!slotFiles[slot.key]) &&
    designTextSlots.every((slot) => !!slotTexts[slot.key]?.trim());

  const pickForSlot = useCallback(
    async (slot: AutoReelSlot) => {
      if (pickingSlot) return;
      setPickingSlot(slot.key);
      try {
        const picked = await pickSlotFile(slot, t);
        if (!picked) return;
        if ("error" in picked) {
          setSlotErrors((prev) => ({ ...prev, [slot.key]: picked.error }));
          return;
        }
        setSlotFiles((prev) => ({ ...prev, [slot.key]: picked.file }));
        setSlotErrors((prev) => {
          const next = { ...prev };
          delete next[slot.key];
          return next;
        });
      } catch (error) {
        Logger.error("Error selecting design slot media:", error);
        showBanner(t("error"), t("failedToSelectMedia"), "error", 3000);
      } finally {
        setPickingSlot(null);
      }
    },
    [pickingSlot, showBanner, t],
  );

  const removeSlotFile = useCallback((key: string) => {
    setSlotFiles((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  const loadTemplates = useCallback(async () => {
    setLoadingTemplates(true);
    setTemplatesError(null);
    try {
      const data = await listAutoReelTemplates();
      setTemplates(data);
      // User always picks the template themselves, even when there's only
      // one — on the template gallery (step 1 opens with it) or here
      const galleryId = params.templateId ? Number(params.templateId) : null;
      // Gallery's template is gone → let them choose here
      if (galleryId != null && !data.some((item) => item.id === galleryId)) {
        setStep("style");
      }
      setSelectedId((prev) => {
        const id = prev ?? galleryId;
        return id != null && data.some((item) => item.id === id) ? id : null;
      });
    } catch (error: any) {
      if (params.templateId) setStep("style");
      Logger.error("Failed to load auto reel templates:", error);
      setTemplates([]);
      setTemplatesError(error?.message || t("failedToLoadTemplates"));
    } finally {
      setLoadingTemplates(false);
    }
  }, [params.templateId, t]);

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

  // Reel credits (one-video designs). Never throws; null hides the counts and
  // the server's 422 is the final word. Fresh on every focus (and on open).
  const creditsRequestRef = useRef(0);
  const refreshCredits = useCallback(async () => {
    const request = ++creditsRequestRef.current;
    const data = await getReelCredits();
    // A newer refresh started meanwhile — it has the latest count
    if (request === creditsRequestRef.current) setCredits(data);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refreshCredits();
    }, [refreshCredits]),
  );

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
          await fetchReelServiceOptions({
            userRole,
            businessId: userBusinessId,
          }),
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
      // One-video design: Trim is the last step — music there, then "Make my reel"
      setEditorAutoReelOptions(
        requestId,
        isAutoBuild
          ? {
              doneLabel: t("autoReelMakeReel"),
              doneHint: credits
                ? t("autoBuildCreditCost", { count: credits.remaining })
                : t("autoBuildCreditCostUnknown"),
              music: autoBuildSilent
                ? {
                    defaultMusic: autoBuildDefaultMusic,
                    value: music,
                    lengthSeconds: selected?.length_seconds ?? null,
                  }
                : null,
            }
          : null,
      );
      router.push({
        pathname: "/(main)/reelStudio" as any,
        params: {
          sourceType,
          maxSeconds: String(
            isAutoBuild ? sourceMaxSeconds : MAX_AUTO_REEL_SOURCE_SECONDS,
          ),
          // Video design: the trim step won't let it go below this
          ...(minVideoSeconds != null
            ? { minSeconds: String(minVideoSeconds) }
            : {}),
          mode: "save",
          requestId,
          flowTitle: t("autoReelIntroTitle"),
          // One-video design: only cut / join, then back to "Upload your video"
          ...(isAutoBuild
            ? { trimOnly: "1", stepStart: "2", stepTotal: "2", stepFixed: "1" }
            : { stepStart: "3", stepTotal: "5" }),
        },
      });
    },
    [
      autoBuildDefaultMusic,
      autoBuildSilent,
      credits,
      isAutoBuild,
      minVideoSeconds,
      music,
      router,
      selected?.length_seconds,
      sourceMaxSeconds,
      t,
    ],
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
        durationSeconds =
          measured != null ? Math.max(1, Math.round(measured)) : null;
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
    (
      assets: ImagePicker.ImagePickerAsset[],
      sourceType: MediaUploadSourceType,
    ) => {
      const room = MAX_EDITOR_CLIPS - picksRef.current.length;
      const items = assets
        .slice(0, Math.max(0, room))
        .map((asset) => toPickedMedia(asset, sourceType))
        .filter((item): item is PickedMedia => item != null);
      if (items.length === 0) return null;
      const next = [...picksRef.current, ...items];
      picksRef.current = next;
      setPicks(next);
      // New picks → Next makes a new video from the whole list (this also
      // replaces an earlier upload — that id is no longer used)
      setSourceVideo(null);
      void fillVideoDetails(items);
      return next;
    },
    [fillVideoDetails, toPickedMedia],
  );

  /**
   * One-video design: straight on to "Cut & music" with any length — clips
   * are added / cut there to fit the reel's length and the 5:00 limit.
   */
  const openAutoBuildEditor = useCallback(
    (items: PickedMedia[] | null) => {
      if (!isAutoBuild || !items?.length) return;
      openTrimEditor(items);
    },
    [isAutoBuild, openTrimEditor],
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
        exactSeconds: result.durationMs / 1000,
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
      // Video design: the server fails short videos (source_too_short) —
      // say so now and stay here instead of uploading it
      const tooShort =
        minVideoSeconds != null && result.durationMs / 1000 < minVideoSeconds;
      if (tooShort) {
        showBanner(
          t("flowAddVideoTitle"),
          t("designVideoTooShort", { seconds: Math.ceil(minVideoSeconds) }),
          "warning",
          5000,
        );
      }
      // One-video design: the music chosen under Trim, then the reel starts
      if (isAutoBuild) {
        if (result.reelMusic !== undefined) setMusic(result.reelMusic);
        const start = () => {
          setStep("video");
          if (!tooShort) setAutoStartAt(Date.now());
        };
        if (request.fromSelected && !result.edited) start();
        else void applyEditorResult(result, request.sourceType).then(start);
        return;
      }
      const nextStep: WizardStep = tooShort ? "video" : "details";
      // Nothing changed — keep the current selection (and any upload id)
      if (request.fromSelected && !result.edited) {
        setStep(nextStep);
        return;
      }
      setEditorMusicCredit(
        result.musicCredit
          ? { uri: result.uri, credit: result.musicCredit }
          : null,
      );
      void applyEditorResult(result, request.sourceType).then(() =>
        setStep(nextStep),
      );
      if (result.savedToGallery) {
        showBanner(t("success"), t("editedVideoSaved"), "success", 3000);
      } else if (result.edited) {
        showBanner(
          t("autoReelTrimTitle"),
          t("editedVideoNotSaved"),
          "warning",
          4000,
        );
      }
    }, [applyEditorResult, isAutoBuild, minVideoSeconds, showBanner, t]),
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
        // One-video design: clips of the haircut only (no photos)
        mediaTypes: isAutoBuild ? ["videos"] : ["videos", "images"],
        allowsMultipleSelection: true,
        orderedSelection: true,
        selectionLimit: Math.max(1, MAX_EDITOR_CLIPS - picksRef.current.length),
        quality: 1,
        allowsEditing: false,
        ...iosCompatiblePickerOptions,
      });
      if (!result.canceled && result.assets?.length) {
        openAutoBuildEditor(addPicks(result.assets, "device"));
      }
    } catch (error) {
      Logger.error("Error selecting auto reel media from gallery:", error);
      showBanner(t("error"), t("failedToSelectMedia"), "error", 3000);
    } finally {
      setAddingMedia(false);
      setPickingFrom(null);
    }
  }, [addPicks, isAutoBuild, openAutoBuildEditor, showBanner, t]);

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
        openAutoBuildEditor(addPicks([result.assets[0]], "camera"));
      }
    } catch (error) {
      Logger.error("Error recording auto reel video:", error);
      showBanner(t("error"), t("failedToSelectMedia"), "error", 3000);
    } finally {
      setAddingMedia(false);
      setPickingFrom(null);
    }
  }, [addPicks, openAutoBuildEditor, showBanner, t]);

  /** One-video design: drop the video (an uploaded one too) to pick another. */
  const clearAutoBuildVideo = useCallback(() => {
    picksRef.current = [];
    setPicks([]);
    setSourceVideo(null);
  }, []);

  const noReelsLeft = reelsRemaining != null && reelsRemaining <= 0;

  const canGenerate = needsPhotos
    ? !!selected &&
      photosComplete &&
      (!needsMusicChoice || music !== undefined) &&
      !!categoryId &&
      !noReelsLeft
    : !!selected &&
      !!sourceVideo &&
      (sourceVideo.id != null || sourceVideo.local != null) &&
      !!categoryId &&
      !noReelsLeft;

  // One-video design: the length is checked before uploading (unknown → the
  // server checks it). Credits replace the monthly AI-reel limit here.
  const sourceSeconds = sourceVideo?.durationSeconds ?? null;
  // Exact length: a 9.6 s clip must not pass a 10 s minimum by rounding up
  const sourceExactSeconds = sourceVideo?.exactSeconds ?? sourceSeconds;
  const sourceTooLong =
    isAutoBuild &&
    sourceExactSeconds != null &&
    sourceExactSeconds > sourceMaxSeconds;
  const sourceTooShort =
    isAutoBuild &&
    minVideoSeconds != null &&
    sourceExactSeconds != null &&
    sourceExactSeconds < minVideoSeconds;
  const noCreditsLeft = credits != null && credits.remaining <= 0;
  const canAutoBuild =
    !!selected &&
    !!sourceVideo &&
    (sourceVideo.id != null || sourceVideo.local != null) &&
    !sourceTooLong &&
    !sourceTooShort &&
    !noCreditsLeft &&
    (!autoBuildSilent || music !== undefined);

  /** Upload the picked file (compress → POST /api/media) and keep its id. */
  const uploadSelectedVideo = useCallback(
    async (
      video: SourceVideo,
      signal?: AbortSignal,
      /** One-video design: keep the picked length — the upload caps `duration_seconds` at 3 min */
      keepLength = false,
    ): Promise<number | null> => {
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
                durationSeconds: keepLength
                  ? prev.durationSeconds
                  : (uploaded.duration_seconds ?? prev.durationSeconds),
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

  /** Monthly limit check before anything is uploaded; false = blocked (banner shown). */
  const passQuota = useCallback(async (): Promise<boolean> => {
    // Limit not known yet (still loading / failed on open) → load it before going on
    let blocked: string | null = noReelsLeft
      ? quotaBlockedMessage || t("autoReelNoReelsLeft")
      : "";
    if (!limitsLoadedRef.current) {
      blocked = await loadReelLimits();
      if (blocked == null) {
        showBanner(t("error"), t("monthlyReelsLoadFailed"), "error", 4000);
        return false;
      }
    }
    // No reels left → say so before uploading anything
    if (blocked) {
      showBanner(t("monthlyReelsLimitTitle"), blocked, "error", 5000);
      return false;
    }
    return true;
  }, [loadReelLimits, noReelsLeft, quotaBlockedMessage, showBanner, t]);

  /**
   * Photo design: upload a photo per slot (no `purpose`), then start with
   * `slot_media` + `texts` (+ `music` when silent). No review — it goes
   * straight to pending → rendering → ready.
   */
  const handleGeneratePhotos = useCallback(async () => {
    if (!selected || !categoryId || submitting) return;
    if (!photosComplete) {
      setStep("video");
      return;
    }
    if (needsMusicChoice && music === undefined) {
      setMusicError(t("designMusicRequired"));
      return;
    }
    setSubmitting(true);
    if (!(await passQuota())) {
      setSubmitting(false);
      return;
    }

    setStep("creating");
    const controller = new AbortController();
    uploadAbortRef.current = controller;
    try {
      const slotMedia: Record<string, number> = {};
      const toUpload = designMediaSlots.filter(
        (slot) => slotFilesRef.current[slot.key]?.mediaId == null,
      ).length;
      let uploaded = 0;
      if (toUpload > 0) {
        setUploadPhase("uploading");
        setUploadPercent(0);
      }
      for (const slot of designMediaSlots) {
        const file = slotFilesRef.current[slot.key];
        if (!file) throw new Error(t("designPhotosHint"));
        if (file.mediaId != null) {
          slotMedia[slot.key] = file.mediaId;
          continue;
        }
        const id = await uploadSlotFile(file, {
          signal: controller.signal,
          onProgress: (percent) =>
            setUploadPercent(
              Math.round((uploaded * 100 + percent) / Math.max(1, toUpload)),
            ),
        });
        if (controller.signal.aborted) return;
        uploaded += 1;
        slotMedia[slot.key] = id;
        // Keep the id: a failed start doesn't upload this one again
        setSlotFiles((prev) =>
          prev[slot.key]?.uri === file.uri
            ? { ...prev, [slot.key]: { ...prev[slot.key], mediaId: id } }
            : prev,
        );
      }
      if (controller.signal.aborted) return;
      setUploadPercent(null);

      const texts: Record<string, string> = {};
      for (const slot of designTextSlots) {
        texts[slot.key] = (slotTexts[slot.key] ?? "").trim();
      }
      // The server adds the music credit — the caption goes as typed
      const trimmedCaption = caption.trim();
      const autoReel = await createAutoReel({
        template_id: selected.id,
        slot_media: slotMedia,
        texts,
        category_id: categoryId,
        ...(serviceId ? { service_id: serviceId } : {}),
        ...(trimmedCaption ? { caption: trimmedCaption } : {}),
        ...(needsMusicChoice ? { music: music ?? null } : {}),
      });
      // Left while it was starting — don't pull them back
      if (controller.signal.aborted) return;
      allowLeaveRef.current = true;
      router.replace({
        pathname: "/(main)/autoReel" as any,
        params: {
          autoReelId: String(autoReel.id),
          fromFlow: "1",
          ...(selected.preview_image_url
            ? { templateImage: selected.preview_image_url }
            : {}),
          ...(selected.length_seconds
            ? { reelSeconds: String(selected.length_seconds) }
            : {}),
          ...(trimmedCaption ? { caption: trimmedCaption } : {}),
        },
      });
    } catch (error: any) {
      if (controller.signal.aborted || isUploadCancelled(error)) return;
      Logger.error("Failed to start photo design auto reel:", error);
      const slotErrs = keyedFieldErrors(error, "slot_media");
      const textErrs = keyedFieldErrors(error, "texts");
      const musicErr = musicFieldError(error);
      if (Object.keys(slotErrs).length) {
        // Refused uploads go up again next time
        setSlotFiles((prev) => {
          const next = { ...prev };
          for (const key of Object.keys(slotErrs)) {
            if (next[key]) next[key] = { ...next[key], mediaId: null };
          }
          return next;
        });
      }
      setSlotErrors(slotErrs);
      setTextErrors(textErrs);
      setMusicError(musicErr);
      const templateError = fieldError(error, "template_id");
      if (templateError) void loadTemplates();
      // Show the step the problem is on
      setStep(
        Object.keys(slotErrs).length || Object.keys(textErrs).length
          ? "video"
          : "details",
      );
      const message =
        fieldError(error, "reel") ||
        fieldError(error, "auto_reel") ||
        Object.values(slotErrs)[0] ||
        Object.values(textErrs)[0] ||
        musicErr ||
        templateError ||
        fieldError(error, "slot_media") ||
        fieldError(error, "category_id") ||
        fieldError(error, "service_id") ||
        fieldError(error, "caption") ||
        (error instanceof VideoTooLargeError
          ? t("autoReelVideoTooLarge")
          : null) ||
        error?.message ||
        t("failedToStartGeneration");
      showBanner(t("error"), message, "error", 4000);
    } finally {
      setUploadPercent(null);
      setSubmitting(false);
    }
  }, [
    caption,
    categoryId,
    designMediaSlots,
    designTextSlots,
    loadTemplates,
    music,
    needsMusicChoice,
    passQuota,
    photosComplete,
    router,
    selected,
    serviceId,
    showBanner,
    slotTexts,
    submitting,
    t,
  ]);

  const handleGenerate = useCallback(async () => {
    if (!selected || !sourceVideo || !categoryId || submitting) return;

    // Video design: refuse a too-short video before uploading it
    if (
      minVideoSeconds != null &&
      sourceVideo.durationSeconds != null &&
      sourceVideo.durationSeconds < minVideoSeconds
    ) {
      showBanner(
        t("flowAddVideoTitle"),
        t("designVideoTooShort", { seconds: Math.ceil(minVideoSeconds) }),
        "warning",
        5000,
      );
      setStep("video");
      return;
    }

    setSubmitting(true);
    if (!(await passQuota())) {
      setSubmitting(false);
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
      // Left while it was starting — don't pull them back
      if (controller.signal.aborted) return;
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
          ...(selected.length_seconds
            ? { reelSeconds: String(selected.length_seconds) }
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
        setSourceVideo((prev) => (prev?.local ? { ...prev, id: null } : null));
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
    loadTemplates,
    minVideoSeconds,
    musicCreditText,
    passQuota,
    router,
    selected,
    serviceId,
    showBanner,
    sourceVideo,
    submitting,
    t,
    uploadSelectedVideo,
  ]);

  /**
   * One-video design: upload the video (unless it's already on the server)
   * and start with `auto_build: true` — no category or caption yet, they're
   * asked when publishing. Costs 1 reel credit instead of the monthly AI-reel
   * limit; the server's 422 is the final check.
   */
  const handleAutoBuild = useCallback(async () => {
    if (!selected || !sourceVideo || submitting) return;
    if (sourceTooLong || sourceTooShort) return;
    if (autoBuildSilent && music === undefined) {
      setMusicError(t("designMusicRequired"));
      return;
    }
    if (noCreditsLeft) {
      showBanner(t("credits"), t("autoBuildNoCredits"), "error", 5000);
      return;
    }

    setSubmitting(true);
    // "Creating your reel" — upload progress first, then the AI steps
    setStep("creating");
    // Cancelled when the user leaves mid-upload ("Leave" / screen closed)
    const controller = new AbortController();
    uploadAbortRef.current = controller;
    try {
      const mediaId =
        sourceVideo.id ??
        (await uploadSelectedVideo(sourceVideo, controller.signal, true));
      // Left before it finished → don't start the reel (no credit is used)
      if (controller.signal.aborted) return;
      if (mediaId == null) {
        setStep("video");
        return;
      }

      // Silent design: the template's own song goes unsaid (the server uses
      // it); another track or "No music" is sent
      const keepsDefaultMusic =
        autoBuildDefaultMusic != null &&
        music != null &&
        music.url === autoBuildDefaultMusic.url;
      const autoReel = await createAutoReel({
        media_asset_id: mediaId,
        template_id: selected.id,
        auto_build: true,
        ...(autoBuildSilent && !keepsDefaultMusic
          ? { music: music ?? null }
          : {}),
      });
      // Review can't tell "kept the template's song" from "No music" — remember it
      if (autoBuildSilent && music !== undefined) {
        rememberCreateMusic(autoReel.id, music);
      }
      // Left while it was starting — it's in AI Requests; don't pull them back
      if (controller.signal.aborted) return;
      // Server picks the moments and builds it — follow it on the AI Auto Reel
      // screen (preview → publish / regenerate / edit)
      allowLeaveRef.current = true;
      router.replace({
        pathname: "/(main)/autoReel" as any,
        params: {
          autoReelId: String(autoReel.id),
          fromFlow: "1",
          autoBuild: "1",
          ...(selected.preview_image_url
            ? { templateImage: selected.preview_image_url }
            : {}),
          ...(selected.length_seconds
            ? { reelSeconds: String(selected.length_seconds) }
            : {}),
        },
      });
    } catch (error: any) {
      if (controller.signal.aborted || isUploadCancelled(error)) return;
      Logger.error("Failed to start auto build reel:", error);
      const mediaError = fieldError(error, "media_asset_id");
      const templateError = fieldError(error, "template_id");
      if (mediaError) {
        // Server can't use that upload — drop the id so the next tap uploads
        // the picked file again (or asks for a video if there's no local file)
        setSourceVideo((prev) => (prev?.local ? { ...prev, id: null } : null));
      }
      if (templateError) {
        // Admin may have turned it off — refresh the list and let them choose
        void loadTemplates();
      }
      setStep(templateError ? "style" : "video");
      const musicErr = musicFieldError(error);
      setMusicError(musicErr);
      // Any other 422 (e.g. no credits left) keeps the uploaded id
      const message =
        fieldError(error, "reel") ||
        fieldError(error, "auto_reel") ||
        mediaError ||
        templateError ||
        musicErr ||
        firstFieldError(error) ||
        error?.message ||
        t("failedToStartGeneration");
      showBanner(t("error"), message, "error", 5000);
      // Credits may have run out meanwhile
      void refreshCredits();
    } finally {
      setSubmitting(false);
    }
  }, [
    autoBuildDefaultMusic,
    autoBuildSilent,
    loadTemplates,
    music,
    noCreditsLeft,
    refreshCredits,
    router,
    selected,
    showBanner,
    sourceTooLong,
    sourceTooShort,
    sourceVideo,
    submitting,
    t,
    uploadSelectedVideo,
  ]);

  // Back from the studio with the cut video (and music): make the reel
  useEffect(() => {
    if (!autoStartAt) return;
    setAutoStartAt(0);
    void handleAutoBuild();
    // Only when the studio hands a video back — handleAutoBuild reads this render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStartAt]);

  const isHaircut = selected?.kind === "haircut";
  // Server-only video (from "Try another template") can't be edited here
  const serverOnly =
    !needsPhotos && picks.length === 0 && !!sourceVideo && !sourceVideo.local;
  // Photo design: style → photos + texts → details; one-video design: style → video
  const stepTotal = isAutoBuild ? 2 : serverOnly || needsPhotos ? 3 : 5;
  const stepNumber = step === "style" ? 1 : step === "video" ? 2 : stepTotal;

  /** One step back; false on the first step (the caller leaves). */
  const stepBack = useCallback((): boolean => {
    if (step === "creating") return true;
    if (step === "details") {
      setStep("video");
      return true;
    }
    if (step === "video") {
      // From the gallery, back goes to the gallery
      if (fromGallery) return false;
      setStep("style");
      return true;
    }
    return false;
  }, [fromGallery, step]);

  // Compress + upload of a 3-minute video (5 for one-video designs) can take
  // minutes — the screen must stay open until it finishes, so confirm before
  // leaving mid-upload.
  // Hardware back otherwise goes one step back.
  const navigation = useNavigation();
  const guardRef = useRef({ uploading: false, starting: false, stepBack });
  guardRef.current = {
    uploading: uploadPercent != null,
    // Upload done, the reel is being started: leaving can't stop it any more
    // (the alert would wrongly say no reel is made) — a short wait, so stay
    starting: step === "creating" && uploadPercent == null,
    stepBack,
  };
  useEffect(() => {
    const unsubscribe = navigation.addListener("beforeRemove", (event: any) => {
      if (allowLeaveRef.current) return;
      if (guardRef.current.starting) {
        // Back presses wait for the start; resets (e.g. sign-out) go through
        const type = event?.data?.action?.type;
        if (type === "GO_BACK" || type === "POP") {
          event.preventDefault();
          return;
        }
        uploadAbortRef.current?.abort();
        return;
      }
      if (guardRef.current.uploading) {
        event.preventDefault();
        Alert.alert(
          t("autoReelLeaveUploadTitle"),
          t("autoReelLeaveUploadMessage"),
          [
            { text: t("autoReelKeepUploading"), style: "cancel" },
            {
              text: t("autoReelLeave"),
              style: "destructive",
              // Really cancel: stop compression / upload, no reel is started
              onPress: () => {
                // Upload finished meanwhile: the reel is starting — stay
                if (!guardRef.current.uploading) return;
                uploadAbortRef.current?.abort();
                allowLeaveRef.current = true;
                navigation.dispatch(event.data.action);
              },
            },
          ],
        );
        return;
      }
      // Only back presses step back — resets (e.g. sign-out) go through
      const type = event?.data?.action?.type;
      if (
        (type === "GO_BACK" || type === "POP") &&
        guardRef.current.stepBack()
      ) {
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
          "content-cut" | "auto-awesome",
      })),
    [templates],
  );

  // Length once combined (photos show for 3 s unless changed in the editor)
  const picksSeconds = picks.reduce(
    (sum, p) =>
      sum +
      (p.kind === "image"
        ? IMAGE_CLIP_DEFAULT_MS / 1000
        : (p.durationSeconds ?? 0)),
    0,
  );
  const picksMaxSeconds = isAutoBuild
    ? sourceMaxSeconds
    : MAX_AUTO_REEL_SOURCE_SECONDS;
  const picksTooLong = picksSeconds > picksMaxSeconds;
  // Video design: clips shorter than the template needs (photos/clips can still be added)
  const picksTooShort =
    minVideoSeconds != null &&
    picks.length > 0 &&
    picks.every((p) => p.kind === "image" || p.durationSeconds != null) &&
    picksSeconds < minVideoSeconds;
  const picksLabel =
    picks.length > 1
      ? t("flowSelectedClips", { n: picks.length })
      : picks[0]?.edited
        ? t("flowEditedVideo")
        : picks[0]?.kind === "image"
          ? t("flowSelectedPhoto")
          : t("flowSelectedVideo");

  /** Reel length: from the design when it has one, else the AI decides */
  const reelLengthLabel = selected?.length_seconds
    ? t("designReelSeconds", { seconds: Math.round(selected.length_seconds) })
    : t("autoReelReqLength");

  /** "What it needs" — from the template's slots for designs, fixed otherwise */
  const requirements = useMemo((): Requirement[] => {
    if (!selected) return [];
    if (!isDesign) {
      return [
        { icon: "videocam", text: t("autoReelReqVideo") },
        { icon: "timer", text: t("autoReelReqLength") },
        { icon: "graphic-eq", text: t("autoReelReqAudio") },
      ];
    }
    if (isAutoBuild) {
      const musicTitle = selected.music?.title?.trim();
      return [
        {
          icon: "video-library",
          text:
            minVideoSeconds != null
              ? t("autoBuildFeatureVideoRange", {
                  min: formatVideoDuration(minVideoSeconds),
                  max: formatVideoDuration(sourceMaxSeconds),
                })
              : t("autoBuildFeatureVideo", {
                  minutes: templateSourceMaxMinutes(selected),
                }),
        },
        { icon: "auto-awesome", text: t("autoBuildFeatureAi") },
        { icon: "timer", text: reelLengthLabel },
        musicTitle
          ? {
              icon: "music-note",
              text: t("includesMusicNamed", { name: musicTitle }),
            }
          : selected.has_sound === false
            ? // Silent design without its own song: picked with the video
              { icon: "library-music", text: t("designReqMusic") }
            : { icon: "music-note", text: t("includesMusic") },
      ];
    }
    const list: Requirement[] = [];
    if (selected.needs === "video") {
      list.push({
        icon: "video-library",
        text: minVideoSeconds
          ? t("designReqVideoMin", { seconds: Math.ceil(minVideoSeconds) })
          : t("designReqOneVideo"),
      });
    }
    for (const slot of selected.slots ?? []) {
      const detail = slotDetail(slot, t);
      list.push({
        icon: slotIcon(slot) as Requirement["icon"],
        text: detail ? `${slot.label} — ${detail}` : slot.label,
      });
    }
    list.push({ icon: "timer", text: reelLengthLabel });
    if (selected.has_sound === false) {
      list.push({ icon: "library-music", text: t("designReqMusic") });
    }
    return list;
  }, [
    isAutoBuild,
    isDesign,
    minVideoSeconds,
    reelLengthLabel,
    selected,
    sourceMaxSeconds,
    t,
  ]);

  const summaryThumbUri = needsPhotos
    ? (designMediaSlots
        .map((slot) => slotFiles[slot.key]?.thumbnailUri)
        .find(Boolean) ?? null)
    : (sourceVideo?.thumbnailUri ?? null);

  /** Names of the photo / video slots, in reel order ("Before, Process, After") */
  const slotNames = mediaSlots(selected?.slots)
    .map((slot) => slot.label)
    .join(", ");

  // ── Steps ─────────────────────────────────────────────────────────

  /** One-video designs: reel credits left this month (nothing while unknown) */
  const renderCreditsNote = () =>
    credits ? (
      <InfoNote
        icon={noCreditsLeft ? "block" : "toll"}
        tone={
          noCreditsLeft ? "error" : credits.remaining <= 2 ? "warm" : "info"
        }
        text={
          noCreditsLeft
            ? t("autoBuildNoCredits")
            : t("autoBuildCreditsLeft", { count: credits.remaining })
        }
      />
    ) : null;

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
        {isAutoBuild ? (
          // One-video designs use reel credits, not the monthly AI-reel limit
          renderCreditsNote()
        ) : reelsRemaining != null ? (
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
            requirements={requirements}
            tip={isHaircut && !isDesign ? t("autoReelHaircutHint") : null}
          />
        ) : null}
      </ScrollView>
      <FlowFooter
        primary={{
          label: needsPhotos ? t("designNextAddPhotos") : t("flowNextAddVideo"),
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
        <SourceCardRow>
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
            tone="warm"
            badgeIcon="fiber-manual-record"
            onPress={() => void handleRecordVideo()}
            disabled={addingMedia}
            loading={addingMedia && pickingFrom === "camera"}
          />
        </SourceCardRow>
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
            {picksTooShort ? (
              <InfoNote
                tone="warm"
                icon="timer"
                text={t("designPicksTooShort", {
                  length: formatVideoDuration(picksSeconds),
                  min: formatVideoDuration(minVideoSeconds),
                })}
              />
            ) : null}
            {picksTooLong ? (
              <InfoNote
                tone="warm"
                icon="content-cut"
                text={t(
                  picks.length > 1
                    ? "flowAutoTooLongMany"
                    : "flowAutoTooLongNote",
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
        {minVideoSeconds != null || (isDesign && slotNames) ? (
          <InfoNote
            icon="auto-awesome"
            text={[
              minVideoSeconds != null
                ? t("designVideoMinNote", {
                    seconds: Math.ceil(minVideoSeconds),
                  })
                : null,
              slotNames
                ? t("designVideoPartsNote", { parts: slotNames })
                : null,
            ]
              .filter(Boolean)
              .join(" ")}
          />
        ) : (
          <InfoNote icon="auto-awesome" text={t("flowAutoVideoNote")} />
        )}
      </ScrollView>
      <FlowFooter
        primary={
          serverOnly
            ? {
                label: t("flowNextAddDetails"),
                onPress: () => {
                  const seconds = sourceVideo?.durationSeconds;
                  if (
                    minVideoSeconds != null &&
                    seconds != null &&
                    seconds < minVideoSeconds
                  ) {
                    showBanner(
                      t("flowAddVideoTitle"),
                      t("designVideoTooShort", {
                        seconds: Math.ceil(minVideoSeconds),
                      }),
                      "warning",
                      5000,
                    );
                    return;
                  }
                  setStep("details");
                },
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

  /**
   * One-video design: add the haircut video (or several clips) → Next opens
   * the trim-only studio (cut / split + music) → its "Make my reel" starts
   * the reel. A video uploaded earlier ("Try a different template") can't be
   * edited — it goes straight to "Make my reel" from here.
   */
  const renderAutoBuildVideoStep = () => {
    const maxLabel = formatVideoDuration(sourceMaxSeconds);
    const minLabel =
      minVideoSeconds != null ? formatVideoDuration(minVideoSeconds) : null;
    const serverVideo =
      !!sourceVideo && !sourceVideo.local && picks.length === 0;
    // Same rounding as the warnings ("0:25 … at least 0:30")
    const serverLength = formatVideoDuration(
      sourceExactSeconds == null
        ? null
        : sourceTooLong
          ? Math.ceil(sourceExactSeconds)
          : sourceTooShort
            ? Math.floor(sourceExactSeconds)
            : sourceSeconds,
    );
    return (
      <>
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <FlowTitle
            title={t("autoBuildAddTitle")}
            subtitle={t("autoBuildAddSubtitle")}
          />
          {/* The gallery no longer shows the count; it shows here instead */}
          {renderCreditsNote()}
          <SourceCardRow>
            <SourceCard
              icon="video-library"
              label={t("flowChooseFromGallery")}
              sublabel={t("autoBuildGallerySub")}
              sublabelIcon="movie"
              badgeIcon="add"
              onPress={() => void handleSelectFromGallery()}
              disabled={addingMedia || submitting}
              loading={addingMedia && pickingFrom === "gallery"}
            />
            <SourceCard
              icon="videocam"
              label={t("flowRecordVideo")}
              tone="warm"
              sublabel={t("autoBuildRecordSub")}
              sublabelIcon="add"
              badgeIcon="fiber-manual-record"
              onPress={() => void handleRecordVideo()}
              disabled={addingMedia || submitting}
              loading={addingMedia && pickingFrom === "camera"}
            />
          </SourceCardRow>
          {picks.length > 0 ? (
            <>
              <View style={styles.divider} />
              <SectionLabel
                label={picksLabel}
                meta={
                  picksSeconds > 0
                    ? t("autoBuildTotalLength", {
                        length: formatVideoDuration(picksSeconds),
                      })
                    : null
                }
              />
              <MediaTileGrid
                items={picks.map((p) => ({
                  id: p.id,
                  thumbUri: p.thumbnailUri,
                  isPhoto: p.kind === "image",
                  badge: formatVideoDuration(p.durationSeconds),
                }))}
                onRemove={removePick}
                disabled={addingMedia}
              />
              {picksTooShort ? (
                <InfoNote
                  tone="warm"
                  icon="timer"
                  text={t("designPicksTooShort", {
                    length: formatVideoDuration(picksSeconds),
                    min: minLabel ?? "",
                  })}
                />
              ) : picksTooLong ? (
                <InfoNote
                  icon="content-cut"
                  text={t(
                    picks.length > 1
                      ? "flowAutoTooLongMany"
                      : "flowAutoTooLongNote",
                    { max: maxLabel },
                  )}
                />
              ) : null}
            </>
          ) : serverVideo && sourceVideo ? (
            <>
              <View style={styles.divider} />
              <SectionLabel label={t("flowSelectedVideo")} />
              <SelectedMediaRow
                thumbUri={sourceVideo.thumbnailUri}
                title={sourceVideo.name || t("autoReelVideoAdded")}
                subtitle={[serverLength, t("flowAlreadyUploaded")]
                  .filter(Boolean)
                  .join(" · ")}
                // The uploaded video's details load after the screen opens
                loading={!sourceVideo.thumbnailUri}
                onAction={clearAutoBuildVideo}
                actionIcon="close"
                actionLabel={t("remove")}
              />
              {sourceTooLong ? (
                <InfoNote
                  tone="error"
                  icon="timer"
                  text={t("autoBuildVideoTooLong", {
                    length: serverLength,
                    max: maxLabel,
                  })}
                />
              ) : sourceTooShort ? (
                <InfoNote
                  tone="warm"
                  icon="timer"
                  text={t("autoBuildVideoTooShort", {
                    length: serverLength,
                    min: minLabel ?? "",
                  })}
                />
              ) : null}
              {/* No studio for it — the music is chosen here */}
              {autoBuildSilent ? (
                <>
                  <View style={styles.divider} />
                  <DesignMusicField
                    value={music}
                    onChange={(next) => {
                      setMusic(next);
                      setMusicError(null);
                    }}
                    lengthSeconds={selected?.length_seconds}
                    error={musicError}
                    disabled={submitting}
                    defaultMusic={autoBuildDefaultMusic}
                  />
                </>
              ) : null}
            </>
          ) : null}
          <InfoNote
            icon="auto-awesome"
            text={`${t("autoBuildAddNote")} ${
              minLabel
                ? t("autoBuildLengthNote", { min: minLabel, max: maxLabel })
                : t("autoBuildLengthNoteMax", { max: maxLabel })
            }`}
          />
        </ScrollView>
        <FlowFooter
          primary={
            serverVideo
              ? {
                  label: t("autoReelMakeReel"),
                  onPress: () => void handleAutoBuild(),
                  disabled: !canAutoBuild || submitting || addingMedia,
                  icon: "auto-awesome",
                }
              : {
                  label: t("autoBuildNextCut"),
                  onPress: handleEditPicks,
                  // Too short is fine — clips are added in the studio
                  disabled:
                    picks.length === 0 ||
                    addingMedia ||
                    submitting ||
                    noCreditsLeft,
                  trailingIcon: "chevron-right",
                }
          }
          hint={
            noCreditsLeft
              ? t("autoBuildNoCredits")
              : serverVideo
                ? autoBuildSilent && music === undefined
                  ? t("designMusicRequired")
                  : credits
                    ? t("autoBuildCreditCost", { count: credits.remaining })
                    : t("autoBuildCreditCostUnknown")
                : picks.length === 0
                  ? addingMedia
                    ? null
                    : t("autoBuildPickHint")
                  : picksTooShort
                    ? t("autoBuildAddMoreHint", { min: minLabel ?? "" })
                    : t("autoBuildNextCutHint")
          }
        />
      </>
    );
  };

  /** Photo design: one photo per slot + the texts */
  const renderPhotosStep = () => (
    <>
      <KeyboardAwareScrollView
        style={styles.flex}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        bottomOffset={moderateHeightScale(120)}
      >
        <FlowTitle
          title={t("designPhotosTitle")}
          subtitle={t("designPhotosSubtitle")}
        />
        {designMediaSlots.map((slot) => {
          const file = slotFiles[slot.key];
          const onlyVideo =
            slotAccepts(slot).length === 1 && slotAccepts(slot)[0] === "video";
          return (
            <DesignSlotCard
              key={slot.key}
              icon={slotIcon(slot) as "photo-camera"}
              label={slot.label}
              detail={slotWhat(slot)}
              meta={slotMeta(slot, t)}
              thumbUri={file?.thumbnailUri}
              thumbLoading={pickingSlot === slot.key}
              isVideo={file?.kind === "video"}
              badge={
                file
                  ? {
                      label:
                        file.kind === "video"
                          ? t("designYourVideo")
                          : t("designYourPhoto"),
                      tone: "own",
                    }
                  : null
              }
              error={slotErrors[slot.key]}
              onThumbPress={() => void pickForSlot(slot)}
              actions={
                file
                  ? [
                      {
                        icon: "swap-horiz",
                        label: t("designReplace"),
                        onPress: () => void pickForSlot(slot),
                        disabled: !!pickingSlot,
                      },
                      {
                        icon: "delete-outline",
                        label: t("remove"),
                        onPress: () => removeSlotFile(slot.key),
                        disabled: !!pickingSlot,
                      },
                    ]
                  : [
                      {
                        icon: onlyVideo ? "video-call" : "add-photo-alternate",
                        label: onlyVideo
                          ? t("designAddVideo")
                          : t("designAddPhoto"),
                        onPress: () => void pickForSlot(slot),
                        disabled: !!pickingSlot,
                      },
                    ]
              }
            />
          );
        })}
        {designTextSlots.length ? (
          <>
            <View style={styles.divider} />
            <SectionLabel label={t("designTextsTitle")} />
            {designTextSlots.map((slot) => (
              <FlowTextField
                key={slot.key}
                label={slot.label}
                required
                value={slotTexts[slot.key] ?? ""}
                onChangeText={(v) => {
                  setSlotTexts((prev) => ({
                    ...prev,
                    [slot.key]: slot.max_length
                      ? v.slice(0, slot.max_length)
                      : v,
                  }));
                  if (textErrors[slot.key]) {
                    setTextErrors((prev) => {
                      const next = { ...prev };
                      delete next[slot.key];
                      return next;
                    });
                  }
                }}
                placeholder={slot.hint || slot.label}
                maxCount={slot.max_length ?? undefined}
                helper={slot.hint && slotTexts[slot.key] ? slot.hint : null}
                error={textErrors[slot.key]}
              />
            ))}
          </>
        ) : null}
      </KeyboardAwareScrollView>
      <FlowFooter
        primary={{
          label: t("flowNextAddDetails"),
          onPress: () => setStep("details"),
          disabled: !photosComplete || !!pickingSlot,
          trailingIcon: "chevron-right",
        }}
        hint={!photosComplete ? t("designPhotosHint") : null}
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
        {selected && (sourceVideo || needsPhotos) ? (
          <FlowCard>
            <View style={styles.summary}>
              <View style={styles.summaryThumb}>
                {summaryThumbUri ? (
                  <Image
                    source={{ uri: summaryThumbUri }}
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
                    needsPhotos
                      ? t("designPhotosAdded", {
                          count: designMediaSlots.length,
                        })
                      : formatVideoDuration(
                          sourceVideo?.durationSeconds ?? null,
                        ),
                    reelLengthLabel,
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
        {needsMusicChoice ? (
          <DesignMusicField
            value={music}
            onChange={(next) => {
              setMusic(next);
              setMusicError(null);
            }}
            lengthSeconds={selected?.length_seconds}
            error={musicError}
            disabled={submitting}
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
        {needsPhotos ? null : (
          <InfoNote icon="schedule" text={t("autoReelTimeHint")} />
        )}
      </KeyboardAwareScrollView>
      <FlowFooter
        primary={{
          label: t("autoReelMakeReel"),
          onPress: () =>
            void (needsPhotos ? handleGeneratePhotos() : handleGenerate()),
          disabled: !canGenerate || submitting,
          loading: submitting && step === "details",
          icon: "auto-awesome",
        }}
        hint={
          noReelsLeft
            ? quotaBlockedMessage || t("autoReelNoReelsLeft")
            : !categoryId
              ? t("autoReelNeedCategory")
              : needsMusicChoice && music === undefined
                ? t("designMusicRequired")
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
        : needsPhotos
          ? t("designUploadingPhotosPercent", { percent: uploadPercent })
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
            subtitle={
              needsPhotos
                ? t("designCreatingPhotosSubtitle")
                : isAutoBuild
                  ? t("autoBuildMakingSubtitle")
                  : t("flowCreatingSubtitle")
            }
          />
          <ProgressTracker
            steps={[
              {
                key: "upload",
                title: uploading
                  ? needsPhotos
                    ? t("designUploadingPhotos")
                    : t("flowUploadingVideo")
                  : t("flowUploadComplete"),
                subtitle: uploading
                  ? uploadLabel
                  : needsPhotos
                    ? t("designPhotosUploaded")
                    : t("flowUploadCompleteSub"),
                state: uploading ? "active" : "done",
              },
              // Photo designs use no AI — nothing to select
              ...(needsPhotos
                ? []
                : [
                    {
                      key: "highlights",
                      // One-video design: same words as the AI Auto Reel screen
                      title: isAutoBuild
                        ? t("autoBuildStepMoments")
                        : t("flowSelectingHighlights"),
                      subtitle: uploading
                        ? isAutoBuild
                          ? t("autoBuildStepMomentsSub")
                          : t("flowSelectingHighlightsSub")
                        : t("flowStartingReel"),
                      state: (uploading ? "pending" : "active") as
                        "pending" | "active",
                    },
                  ]),
              {
                key: "build",
                title: isAutoBuild
                  ? t("autoBuildStepBuild")
                  : t("flowBuildingReel"),
                subtitle:
                  needsPhotos && !uploading
                    ? t("flowStartingReel")
                    : isAutoBuild
                      ? t("autoBuildStepBuildSub")
                      : t("flowBuildingReelSub"),
                state: needsPhotos && !uploading ? "active" : "pending",
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
      {step === "video" ? (
        !selected && loadingTemplates ? (
          <View style={styles.loading}>
            <ActivityIndicator size="large" color={theme.buttonBack} />
          </View>
        ) : needsPhotos ? (
          renderPhotosStep()
        ) : isAutoBuild ? (
          renderAutoBuildVideoStep()
        ) : (
          renderVideoStep()
        )
      ) : null}
      {step === "details" ? renderDetailsStep() : null}
      {step === "creating" ? renderCreatingStep() : null}
    </View>
  );
}
