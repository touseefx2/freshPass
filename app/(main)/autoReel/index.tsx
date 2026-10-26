import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
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
import { useEvent } from "expo";
import { useVideoPlayer, VideoView } from "expo-video";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNotificationContext } from "@/src/contexts/NotificationContext";
import { useAppSelector, useTheme } from "@/src/hooks/hooks";
import Logger from "@/src/services/logger";
import { useDownloadMedia } from "@/src/hooks/useDownloadMedia";
import ReelVideoShareSheet from "@/src/components/ReelVideoShareSheet";
import {
  getAutoReel,
  getReelCredits,
  publishAutoReel,
  regenerateAutoReel,
  retryAutoReel,
  unpublishReel,
} from "@/src/services/reelsService";
import { Theme } from "@/src/theme/colors";
import {
  heightScale,
  moderateHeightScale,
  moderateWidthScale,
  widthScale,
} from "@/src/theme/dimensions";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  AUTO_REEL_MAX_REGENERATIONS,
  AUTO_REEL_RETRYABLE_ERRORS,
  autoReelEditsLeft,
  autoReelMissingStages,
  autoReelRegenerationsLeft,
  canChangeReel,
  isAutoBuiltReel,
  isAutoReelInProgress,
  mediaSlots,
  textSlots,
  type AutoReel,
  type ReelCredits,
  autoReelVideo,
} from "@/src/types/reels";
import FlowHeader from "@/src/components/reelFlow/flowHeader";
import FlowFooter, {
  flowFooterBottomPad,
} from "@/src/components/reelFlow/flowFooter";
import FlowButton from "@/src/components/reelFlow/flowButton";
import { resetToDashboardHome } from "@/src/utils/navigation";
import ProgressTracker, {
  type TrackerStep,
  type TrackerStepState,
} from "@/src/components/reelFlow/progressTracker";
import {
  FlowCard,
  FlowTitle,
  InfoNote,
  OptionRow,
} from "@/src/components/reelFlow/flowParts";
import {
  ChoiceChips,
  FlowTextField,
  SelectField,
} from "@/src/components/reelFlow/detailsFields";
import DesignReview from "@/src/components/autoReel/designReview";
import ModalizeBottomSheet from "@/src/components/modalizeBottomSheet";
import ProductPickerSheet, {
  isLinkedProductError,
  useInventoryProducts,
} from "@/src/components/reelFlow/productPickerSheet";
import { useReelCategoryOptions } from "@/src/hooks/useReelCategoryOptions";

/**
 * AI Auto Reel after it's started (from the AI auto reel steps, a push or
 * AI Requests): "Creating your reel" → "Your reel is ready" (preview) →
 * "Publish your reel" (caption, product, publish, download / share).
 * Video design templates stop at `review` first: polling stops and the
 * review screen (keep / move / own file per slot) builds the reel.
 * Auto-built reels (one video, the server builds it) stop at `review` only
 * when the AI missed a stage; once ready they can be regenerated or edited
 * (1 reel credit each) and get their category on Publish.
 * These continue the flow, so no "Step N of M" here.
 */

const POLL_INTERVAL_MS = 5000;
const ELAPSED_HIDE_AFTER_SECONDS = 60 * 60;
const CAPTION_MAX = 2200;

const RENDER_STATUS_KEYS: Record<string, string> = {
  queued: "autoReelRenderQueued",
  fetching: "autoReelRenderFetching",
  // Shotstack's step between fetching and rendering
  preprocessing: "autoReelRenderRendering",
  rendering: "autoReelRenderRendering",
  saving: "autoReelRenderSaving",
  done: "autoReelRenderDone",
};

/** Errors where a new upload is the right next step */
const NEW_VIDEO_ERRORS = [
  "not_suitable",
  "too_many_moments",
  "source_too_long",
  "source_too_short",
  "source_missing",
];

/** Errors where retry may help even though it is not a server fault */
const RARELY_RETRYABLE_ERRORS = ["not_suitable", "too_many_moments"];

/** Auto build: `design.missing_stages` names the app has labels for */
const STAGE_LABEL_KEYS: Record<string, string> = {
  before: "autoBuildStageBefore",
  progress: "autoBuildStageProgress",
  after: "autoBuildStageAfter",
};

/** Part of an auto-built reel the Edit sheet opens */
type EditSection = "clips" | "text" | "music";

/**
 * "status" is the main view for the reel's status; the others open from it
 * (Publish / Edit from ready, the review step from "AI needs a little help")
 * and back closes them.
 */
type ScreenView = "status" | "publish" | "edit" | "review";

function fieldError(error: any, field: string): string | null {
  const value = error?.data?.errors?.[field];
  if (Array.isArray(value) && typeof value[0] === "string") return value[0];
  return null;
}

/** First message of a 422, whatever the field. */
function firstFieldError(error: any): string | null {
  const errors = error?.data?.errors;
  if (!errors || typeof errors !== "object") return null;
  for (const value of Object.values(errors)) {
    if (Array.isArray(value) && typeof value[0] === "string") return value[0];
    if (typeof value === "string") return value;
  }
  return null;
}

/** "finished_look" → "Finished Look" (a stage the app has no label for) */
function titleCase(value: string): string {
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/(^|\s)\S/g, (c) => c.toUpperCase());
}

function formatClock(seconds: number | null | undefined): string {
  if (seconds == null || !Number.isFinite(seconds)) return "";
  const total = Math.max(0, Math.round(seconds));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    readyHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: moderateWidthScale(8),
    },
    readyTitle: {
      flexShrink: 1,
      fontSize: fontSize.size20,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    readyLength: {
      fontFamily: fonts.fontMedium,
      color: theme.lightGreen,
      fontVariant: ["tabular-nums"],
    },
    toolRow: {
      flexDirection: "row",
      justifyContent: "center",
      gap: moderateWidthScale(8),
    },
    tool: {
      flex: 1,
      maxWidth: moderateWidthScale(96),
      alignItems: "center",
      gap: moderateHeightScale(6),
      paddingVertical: moderateHeightScale(4),
    },
    toolDisabled: { opacity: 0.4 },
    toolCircle: {
      width: moderateWidthScale(54),
      height: moderateWidthScale(54),
      borderRadius: moderateWidthScale(27),
      backgroundColor: theme.white,
      borderWidth: 1,
      borderColor: theme.borderLight,
      alignItems: "center",
      justifyContent: "center",
      shadowColor: theme.darkGreen,
      shadowOffset: { width: 0, height: moderateHeightScale(3) },
      shadowOpacity: 0.08,
      shadowRadius: moderateWidthScale(8),
      elevation: 2,
    },
    toolLabel: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
    },
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
    loadingWrap: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    elapsed: {
      marginTop: -moderateHeightScale(8),
      fontSize: fontSize.size15,
      fontFamily: fonts.fontMedium,
      color: theme.lightGreen,
      fontVariant: ["tabular-nums"],
    },
    templateRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(14),
      padding: moderateWidthScale(14),
    },
    templateThumb: {
      width: widthScale(72),
      height: widthScale(72),
      borderRadius: moderateWidthScale(14),
      backgroundColor: theme.darkGreen,
      overflow: "hidden",
      alignItems: "center",
      justifyContent: "center",
    },
    templateImage: { width: "100%", height: "100%" },
    templateText: { flex: 1, minWidth: 0, gap: moderateHeightScale(3) },
    templateName: {
      fontSize: fontSize.size18,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    templateSub: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
    },
    playerArea: {
      alignItems: "center",
    },
    playerCard: {
      borderRadius: moderateWidthScale(24),
      overflow: "hidden",
      backgroundColor: theme.black,
    },
    poster: {
      ...StyleSheet.absoluteFillObject,
    },
    playOverlay: {
      ...StyleSheet.absoluteFillObject,
      alignItems: "center",
      justifyContent: "center",
    },
    playCircle: {
      width: widthScale(78),
      height: widthScale(78),
      borderRadius: widthScale(39),
      backgroundColor: "rgba(0, 0, 0, 0.45)",
      alignItems: "center",
      justifyContent: "center",
    },
    reelCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(14),
      padding: moderateWidthScale(12),
    },
    reelThumb: {
      width: widthScale(72),
      height: widthScale(90),
      borderRadius: moderateWidthScale(12),
      backgroundColor: theme.darkGreen,
      overflow: "hidden",
      alignItems: "center",
      justifyContent: "center",
    },
    // Ready screen footer once published (same padding as FlowFooter)
    publishedFooter: {
      paddingHorizontal: moderateWidthScale(20),
      paddingTop: moderateHeightScale(12),
      backgroundColor: theme.background,
      gap: moderateHeightScale(6),
    },
    publishedPill: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: moderateWidthScale(8),
      minHeight: heightScale(58),
      borderRadius: moderateWidthScale(16),
      backgroundColor: theme.lightGreen07,
      borderWidth: 1.5,
      borderColor: theme.buttonBack,
    },
    publishedText: {
      fontSize: fontSize.size18,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    smallNote: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      textAlign: "center",
      lineHeight: fontSize.size20,
    },
    actions: {
      gap: moderateHeightScale(12),
    },
    countRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "center",
      gap: moderateWidthScale(8),
    },
    countPill: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(6),
      paddingHorizontal: moderateWidthScale(12),
      paddingVertical: moderateHeightScale(6),
      borderRadius: moderateWidthScale(20),
      backgroundColor: theme.orangeBrown01,
    },
    countText: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
    },
    countNum: {
      fontFamily: fonts.fontBold,
      color: theme.orangeBrownText,
    },
    remakeBlock: {
      gap: moderateHeightScale(10),
    },
    sheetContent: {
      gap: moderateHeightScale(12),
    },
  });

type Styles = ReturnType<typeof createStyles>;

/** Plays the finished reel once tapped (poster + play button before that). */
function ReelPlayer({
  uri,
  ratio,
  posterUri,
  styles,
  theme,
}: {
  uri: string;
  ratio: number;
  posterUri: string | null;
  styles: Styles;
  theme: Theme;
}) {
  const { t } = useTranslation();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const [started, setStarted] = useState(false);
  const maxW = windowWidth - moderateWidthScale(40);
  const maxH = windowHeight * 0.5;
  const r = ratio > 0 ? ratio : 9 / 16;
  const height = Math.min(maxH, maxW / r);
  const width = height * r;

  return (
    <View style={styles.playerArea}>
      <View style={[styles.playerCard, { width, height }]}>
        {started ? (
          <StartedPlayer uri={uri} styles={styles} theme={theme} />
        ) : (
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setStarted(true)}
            accessibilityRole="button"
            accessibilityLabel={t("play")}
          >
            {posterUri ? (
              <Image
                source={{ uri: posterUri }}
                style={styles.poster}
                contentFit="cover"
              />
            ) : null}
            <View style={styles.playOverlay}>
              <View style={styles.playCircle}>
                <MaterialIcons
                  name="play-arrow"
                  size={moderateWidthScale(46)}
                  color={theme.white}
                />
              </View>
            </View>
          </Pressable>
        )}
      </View>
    </View>
  );
}

/**
 * Native player controls (same as the AI results "Your Reel" screen):
 * play/pause, seek bar, mute and full screen.
 */
function StartedPlayer({
  uri,
  styles,
  theme,
}: {
  uri: string;
  styles: Styles;
  theme: Theme;
}) {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = true;
    p.play();
  });
  const { status } = useEvent(player, "statusChange", {
    status: player.status,
  });

  return (
    <View style={StyleSheet.absoluteFill}>
      <VideoView
        player={player}
        style={StyleSheet.absoluteFill}
        contentFit="contain"
        nativeControls
      />
      {status === "loading" ? (
        <View style={styles.playOverlay} pointerEvents="none">
          <ActivityIndicator color={theme.white} />
        </View>
      ) : null}
    </View>
  );
}

export default function AutoReelScreen() {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { downloadMedia, downloadingUrl } = useDownloadMedia();
  const { t } = useTranslation();
  const router = useRouter();
  const navigation = useNavigation();
  const { showBanner } = useNotificationContext();
  const insets = useSafeAreaInsets();

  const params = useLocalSearchParams<{
    autoReelId?: string;
    /** Opened right after "Make my reel" (template image / caption known). */
    fromFlow?: string;
    templateImage?: string;
    caption?: string;
    /** "1": started with auto build — known before the reel's design loads */
    autoBuild?: string;
    /** The design's reel length, shown before the reel's design loads */
    reelSeconds?: string;
  }>();
  const autoReelId = params.autoReelId ? Number(params.autoReelId) : null;

  const [autoReel, setAutoReel] = useState<AutoReel | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  // Set once the user regenerates / edits here: the wait is a remake
  const [remaking, setRemaking] = useState(false);
  const userRole = useAppSelector((s) => s.user.userRole);
  // Staff have no product inventory yet — hidden until the backend supports it
  const canLinkProduct = userRole !== "staff";
  const [publishing, setPublishing] = useState(false);
  const [shareVisible, setShareVisible] = useState(false);
  /** Ready reel: preview first, then the publish (or edit) screen. */
  const [view, setView] = useState<ScreenView>("status");
  const [editSection, setEditSection] = useState<EditSection>("clips");
  const [editSheetOpen, setEditSheetOpen] = useState(false);
  const [credits, setCredits] = useState<ReelCredits | null>(null);
  const [caption, setCaption] = useState(params.caption ?? "");
  const captionTouchedRef = useRef(!!params.caption);
  const captionInputRef = useRef<TextInput>(null);
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const [productTag, setProductTag] = useState("");
  const [productSheetOpen, setProductSheetOpen] = useState(false);
  // created_at stays the original time after a retry — time the retry locally
  const [retryStartedAt, setRetryStartedAt] = useState<number | null>(null);
  const inFlightRef = useRef(false);
  // Bumped when an action returns the reel — a poll sent before it is stale
  const reelVersionRef = useRef(0);

  const status = autoReel?.status ?? null;
  const inProgress = autoReel == null || isAutoReelInProgress(status);
  const autoBuilt = isAutoBuiltReel(autoReel) || params.autoBuild === "1";

  // Staff may only retry / publish / edit / delete what they started (403 otherwise)
  const canChange = canChangeReel(autoReel, userRole);
  const reelStatus = autoReel?.reel?.status ?? null;
  const isPublished = reelStatus === "published";
  const isRemoved = reelStatus === "removed";

  // Unknown (null) never blocks — the server's 422 is the final word
  const creditsLeft = credits?.remaining ?? autoReel?.credits_remaining ?? null;
  const outOfCredits = creditsLeft != null && creditsLeft <= 0;

  // Auto-built reels pick their category on Publish (none was asked before)
  const {
    categoryId,
    categoryName,
    categories,
    loadingCategories,
    pickerOpen: categoryPickerOpen,
    togglePicker: toggleCategoryPicker,
    selectCategory,
    services,
    serviceId,
    setServiceId,
  } = useReelCategoryOptions(autoBuilt && view === "publish");

  // Fill the caption once (unless typed / handed in): the reel's draft, else
  // the AI's suggestion on auto-built reels
  const draftCaption = autoReel?.reel?.caption || null;
  const aiCaption = autoReel?.design?.suggestions?.caption?.trim() || null;
  useEffect(() => {
    if (captionTouchedRef.current) return;
    const prefill = draftCaption || aiCaption;
    if (!prefill) return;
    captionTouchedRef.current = true;
    setCaption(prefill.slice(0, CAPTION_MAX));
  }, [aiCaption, draftCaption]);

  // Elapsed time since the request — makes the 1–4 minute wait feel accounted for
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!inProgress) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [inProgress]);
  const elapsedLabel = useMemo(() => {
    const started =
      retryStartedAt ??
      (autoReel?.created_at ? Date.parse(autoReel.created_at) : NaN);
    if (!Number.isFinite(started)) return null;
    const total = Math.max(0, Math.floor((now - started) / 1000));
    // A job takes minutes; an hour+ means it was retried elsewhere — don't mislead
    if (total > ELAPSED_HIDE_AFTER_SECONDS) return null;
    const m = Math.floor(total / 60);
    const sec = total % 60;
    return `${m}:${String(sec).padStart(2, "0")}`;
  }, [autoReel?.created_at, now, retryStartedAt]);

  /** The reel as returned by an action (retry, build, regenerate, publish). */
  const applyReel = useCallback((data: AutoReel) => {
    reelVersionRef.current += 1;
    setAutoReel(data);
  }, []);

  const fetchOnce = useCallback(async () => {
    if (!autoReelId || inFlightRef.current) return;
    inFlightRef.current = true;
    const version = reelVersionRef.current;
    try {
      const data = await getAutoReel(autoReelId);
      // An action answered meanwhile — this may still be the old status
      if (version !== reelVersionRef.current) return;
      setAutoReel(data);
      setLoadError(null);
    } catch (error: any) {
      Logger.error("Auto reel poll failed:", error);
      if (error?.status === 404) {
        setLoadError(t("autoReelNotFound"));
      }
      // Other errors: keep polling — state lives on the server
    } finally {
      inFlightRef.current = false;
    }
  }, [autoReelId, t]);

  useEffect(() => {
    if (autoReelId) return;
    showBanner(t("error"), t("autoReelNotFound"), "error", 2500);
    router.back();
  }, [autoReelId, router, showBanner, t]);

  // Poll every 5 s while in progress; stop when the screen is left (push covers the rest)
  useFocusEffect(
    useCallback(() => {
      if (!autoReelId || loadError) return;
      void fetchOnce();
      if (!inProgress) return;
      const id = setInterval(() => {
        void fetchOnce();
      }, POLL_INTERVAL_MS);
      return () => clearInterval(id);
    }, [autoReelId, fetchOnce, inProgress, loadError]),
  );

  // null when they can't be loaded — counts are hidden and nothing is blocked
  const refreshCredits = useCallback(async () => {
    setCredits(await getReelCredits());
  }, []);

  // Regenerate / Edit cost a credit — show what's left (fresh on every visit)
  useFocusEffect(
    useCallback(() => {
      if (!autoBuilt || !canChange) return;
      void refreshCredits();
    }, [autoBuilt, canChange, refreshCredits]),
  );

  // Publish / Edit / review belong to the status they were opened from: when
  // a remake comes back ready, show the new reel, not the old sub-view
  const lastStatusRef = useRef(status);
  useEffect(() => {
    if (lastStatusRef.current === status) return;
    lastStatusRef.current = status;
    setView("status");
    setEditSheetOpen(false);
  }, [status]);

  /** Pop back to a screen already in the stack, or open it in place of this one. */
  const goToRoute = useCallback(
    (namePrefix: string, pathname: string, routeParams: Record<string, string>) => {
      const { routes, index } = navigation.getState() ?? { routes: [], index: 0 };
      const found = routes.findLastIndex((r) => r.name.startsWith(namePrefix));
      if (found !== -1 && found < index) {
        router.dismiss(index - found);
        return;
      }
      router.replace({ pathname: pathname as any, params: routeParams });
    },
    [navigation, router],
  );

  // Robot icon: back to the AI Tools screen
  const handleRobotPress = useCallback(() => {
    goToRoute("aiTools/toolList", "/(main)/aiTools/toolList", { mode: "aiTools" });
  }, [goToRoute]);

  /** "Go to My Reels": the AI Requests → Reels list with this one highlighted. */
  const handleGoToMyReels = useCallback(() => {
    goToRoute("aiRequests", "/(main)/aiRequests", {
      tab: "reels",
      ...(autoReelId ? { highlightAutoReelId: String(autoReelId) } : {}),
    });
  }, [autoReelId, goToRoute]);

  const handleRetry = useCallback(async () => {
    if (!autoReelId || retrying) return;
    setRetrying(true);
    try {
      const data = await retryAutoReel(autoReelId);
      setRetryStartedAt(Date.now());
      applyReel(data);
    } catch (error: any) {
      Logger.error("Failed to retry auto reel:", error);
      const message =
        fieldError(error, "reel") ||
        fieldError(error, "auto_reel") ||
        error?.message ||
        t("failedToStartGeneration");
      showBanner(t("error"), message, "error", 4000);
      void fetchOnce();
    } finally {
      setRetrying(false);
    }
  }, [applyReel, autoReelId, fetchOnce, retrying, showBanner, t]);

  /** Auto build: the template gallery — it reuses the uploaded video. */
  const handleGalleryWithVideo = useCallback(() => {
    const sourceId = autoReel?.source_media_asset_id;
    router.replace({
      pathname: "/(main)/templateGallery" as any,
      params: sourceId
        ? { kind: "video", sourceMediaAssetId: String(sourceId) }
        : { kind: "video" },
    });
  }, [autoReel?.source_media_asset_id, router]);

  /** Same uploaded video, another template ("Change style" / "Try another template"). */
  const handleAnotherTemplate = useCallback(() => {
    if (autoBuilt) {
      handleGalleryWithVideo();
      return;
    }
    router.replace({
      pathname: "/(main)/reelTemplates" as any,
      params: autoReel?.source_media_asset_id
        ? { sourceMediaAssetId: String(autoReel.source_media_asset_id) }
        : {},
    });
  }, [autoBuilt, autoReel?.source_media_asset_id, handleGalleryWithVideo, router]);

  /** Upload another video — same template (e.g. after source_too_short) */
  const handleNewVideo = useCallback(() => {
    const templateId = autoReel?.template?.id;
    router.replace({
      pathname: "/(main)/reelTemplates" as any,
      params: templateId ? { templateId: String(templateId) } : {},
    });
  }, [autoReel?.template?.id, router]);

  /** Auto-built reel: other moments from the same analysis (1 credit, max 5). */
  const handleRegenerate = useCallback(async () => {
    if (!autoReelId || regenerating) return;
    setRegenerating(true);
    try {
      const data = await regenerateAutoReel(autoReelId);
      setRetryStartedAt(Date.now());
      setRemaking(true);
      setView("status");
      applyReel(data);
    } catch (error: any) {
      Logger.error("Failed to regenerate auto reel:", error);
      const message =
        fieldError(error, "auto_reel") ||
        firstFieldError(error) ||
        error?.message ||
        t("failedToStartGeneration");
      showBanner(t("error"), message, "error", 4000);
      void fetchOnce();
    } finally {
      setRegenerating(false);
      void refreshCredits();
    }
  }, [
    applyReel,
    autoReelId,
    fetchOnce,
    refreshCredits,
    regenerating,
    showBanner,
    t,
  ]);

  // It costs a credit — confirm first, with what's left when known
  const confirmRegenerate = useCallback(() => {
    if (regenerating) return;
    Alert.alert(
      t("autoBuildRegenerateTitle"),
      creditsLeft != null
        ? t("autoBuildRegenerateBodyCount", { count: creditsLeft })
        : t("autoBuildRegenerateBody"),
      [
        { text: t("cancel"), style: "cancel" },
        {
          text: t("autoBuildRegenerate"),
          onPress: () => void handleRegenerate(),
        },
      ],
    );
  }, [creditsLeft, handleRegenerate, regenerating, t]);

  // Published: take the reel off FreshPass (same call as the media library)
  const [unpublishing, setUnpublishing] = useState(false);
  const handleUnpublish = useCallback(async () => {
    const reelId = autoReel?.reel_id ?? autoReel?.reel?.id;
    if (!reelId || unpublishing) return;
    setUnpublishing(true);
    try {
      await unpublishReel(reelId);
      showBanner(t("success"), t("reelUnpublished"), "success", 2500);
      await fetchOnce();
    } catch (error: any) {
      Logger.error("Failed to unpublish auto reel:", error);
      showBanner(
        t("error"),
        error?.message || t("failedToUpdateReel"),
        "error",
        3000,
      );
    } finally {
      setUnpublishing(false);
    }
  }, [
    autoReel?.reel?.id,
    autoReel?.reel_id,
    fetchOnce,
    showBanner,
    t,
    unpublishing,
  ]);

  const confirmUnpublish = useCallback(() => {
    if (unpublishing) return;
    Alert.alert(t("autoReelUnpublishTitle"), t("autoReelUnpublishBody"), [
      { text: t("cancel"), style: "cancel" },
      {
        text: t("unpublish"),
        style: "destructive",
        onPress: () => void handleUnpublish(),
      },
    ]);
  }, [handleUnpublish, t, unpublishing]);

  /** Edit sheet → the chosen part of the reel (DesignReview in edit mode). */
  const openEditSection = useCallback((section: EditSection) => {
    setEditSheetOpen(false);
    setEditSection(section);
    setView("edit");
  }, []);

  // Edit accepted (202): back to the progress view while it's remade
  const handleEditBuilt = useCallback(
    (data: AutoReel) => {
      setView("status");
      setRetryStartedAt(Date.now());
      setRemaking(true);
      applyReel(data);
      void refreshCredits();
    },
    [applyReel, refreshCredits],
  );

  // Left without saving (maybe after a credit / limit error)
  const handleEditCancel = useCallback(() => {
    setView("status");
    void refreshCredits();
  }, [refreshCredits]);

  // Publishing makes the reel from the AI result. Fields left out keep the
  // values chosen when the auto reel was started (auto-built reels had none,
  // so their category / service are sent here).
  const handlePublish = useCallback(async () => {
    if (!autoReelId || publishing) return;
    if (autoBuilt && categoryId == null) return;
    setPublishing(true);
    try {
      const trimmed = caption.trim();
      const data = await publishAutoReel(autoReelId, {
        ...(trimmed ? { caption: trimmed } : {}),
        ...(autoBuilt && categoryId != null
          ? {
              category_id: categoryId,
              ...(serviceId != null ? { service_id: serviceId } : {}),
            }
          : {}),
        ...(selectedProductId != null
          ? { product_id: selectedProductId, product_tag: productTag || null }
          : {}),
      });
      applyReel(data);
      showBanner(t("success"), t("reelPublished"), "success", 2500);
    } catch (error: any) {
      Logger.error("Failed to publish auto reel:", error);
      if (isLinkedProductError(error)) {
        setSelectedProductId(null);
        setProductTag("");
      }
      const message =
        (isLinkedProductError(error) ? t("linkedProductUnavailable") : null) ||
        fieldError(error, "auto_reel") ||
        fieldError(error, "caption") ||
        fieldError(error, "category_id") ||
        fieldError(error, "service_id") ||
        fieldError(error, "product_id") ||
        error?.message ||
        t("failedToPublishReel");
      showBanner(t("error"), message, "error", 4000);
    } finally {
      setPublishing(false);
    }
  }, [
    applyReel,
    autoBuilt,
    autoReelId,
    caption,
    categoryId,
    productTag,
    publishing,
    selectedProductId,
    serviceId,
    showBanner,
    t,
  ]);

  const products = useInventoryProducts(canLinkProduct && view === "publish");
  const selectedProduct =
    selectedProductId == null
      ? null
      : (products.products.find((p) => Number(p.id) === selectedProductId) ??
        null);

  const templateName = autoReel
    ? autoReel.template?.name || t("autoReelTemplateRemoved")
    : null;
  const paramSeconds = Number(params.reelSeconds);
  const designLength =
    autoReel?.design?.length_seconds ??
    (Number.isFinite(paramSeconds) && paramSeconds > 0 ? paramSeconds : null);
  const reelLengthLabel = designLength
    ? t("designReelSeconds", { seconds: Math.round(designLength) })
    : t("autoReelReqLength");
  const video = autoReelVideo(autoReel);
  const videoUrl = video?.playback_url ?? null;
  const posterUri = video?.thumbnail_url ?? params.templateImage ?? null;
  const durationSeconds = autoReel?.total_seconds ?? video?.duration_seconds ?? null;
  const ratio =
    video?.width && video?.height ? video.width / video.height : 9 / 16;
  const downloading = !!videoUrl && downloadingUrl === videoUrl;
  const canPublish = canChange && !isPublished && !isRemoved && !!videoUrl;

  // ── Ready screen: success header + one row of labelled tools ──
  const readyLength =
    durationSeconds && durationSeconds > 0
      ? `${Math.floor(durationSeconds / 60)}:${String(
          Math.round(durationSeconds % 60),
        ).padStart(2, "0")}`
      : null;

  // One line: ✓ Your reel is ready · 0:30
  const renderReadyHeader = () => (
    <View style={styles.readyHeader}>
      <MaterialIcons
        name="check-circle"
        size={moderateWidthScale(22)}
        color={theme.buttonBack}
      />
      <Text style={styles.readyTitle} accessibilityRole="header" numberOfLines={1}>
        {t("flowReadyTitle")}
        {readyLength ? (
          <Text style={styles.readyLength}>{` · ${readyLength}`}</Text>
        ) : null}
      </Text>
    </View>
  );

  type ReadyTool = {
    key: string;
    icon: React.ComponentProps<typeof MaterialIcons>["name"];
    label: string;
    onPress: () => void;
    disabled?: boolean;
    loading?: boolean;
  };

  // Save + Share sit with the other tools so every action has a label
  const mediaTools: ReadyTool[] = videoUrl
    ? [
        {
          key: "save",
          icon: "file-download",
          label: t("save"),
          onPress: () => downloadMedia(videoUrl, { isVideo: true }),
          loading: downloading,
        },
        {
          key: "share",
          icon: "ios-share",
          label: t("share"),
          onPress: () => setShareVisible(true),
        },
      ]
    : [];

  const renderTools = (tools: ReadyTool[]) =>
    tools.length ? (
      <View style={styles.toolRow}>
        {tools.map((tool) => {
          const inactive = tool.disabled || tool.loading;
          return (
            <TouchableOpacity
              key={tool.key}
              activeOpacity={0.7}
              onPress={tool.onPress}
              disabled={inactive}
              style={[styles.tool, tool.disabled && styles.toolDisabled]}
              accessibilityRole="button"
              accessibilityLabel={tool.label}
              accessibilityState={{ disabled: !!inactive, busy: !!tool.loading }}
            >
              <View style={styles.toolCircle}>
                {tool.loading ? (
                  <ActivityIndicator size="small" color={theme.darkGreen} />
                ) : (
                  <MaterialIcons
                    name={tool.icon}
                    size={moderateWidthScale(24)}
                    color={theme.darkGreen}
                  />
                )}
              </View>
              <Text style={styles.toolLabel} numberOfLines={1}>
                {tool.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    ) : null;
  // Auto-built: the category is required on Publish; the caption hint stays
  // while it is still the AI's suggestion
  const needsCategory = autoBuilt && categoryId == null;
  const captionIsAi = aiCaption != null && caption.trim() === aiCaption;

  // Regenerate / Edit (auto-built reels, until published)
  const design = autoReel?.design ?? null;
  const hasDesignSlots = (design?.slots?.length ?? 0) > 0;
  const editClips = mediaSlots(design?.slots).length > 0;
  const editTexts = textSlots(design?.slots).length > 0;
  const editMusic = design != null && design.has_sound !== true;
  const hasEditable = editClips || editTexts || editMusic;
  const regenerationsLeft = autoReelRegenerationsLeft(autoReel);
  const editsLeft = autoReelEditsLeft(autoReel);
  const remakeOpen = autoBuilt && canChange && !isPublished && !isRemoved;
  const canRegenerate = remakeOpen && regenerationsLeft > 0 && !outOfCredits;
  const canEdit = remakeOpen && hasEditable && editsLeft > 0 && !outOfCredits;

  // Auto build stopped at `review`: the AI missed a stage (Before / After …)
  const missingStages = autoReelMissingStages(autoReel);
  const missingMessage = design?.missing_stages_message?.trim() || null;
  const missingViewActive =
    status === "review" &&
    hasDesignSlots &&
    (missingStages.length > 0 || (autoBuilt && !!missingMessage));

  // The sub-view actually on screen (one left from another status is ignored)
  const subView: Exclude<ScreenView, "status"> | null =
    view === "publish" && status === "ready"
      ? "publish"
      : view === "edit" &&
          design != null &&
          (status === "ready" || status === "failed")
        ? "edit"
        : view === "review" && missingViewActive
          ? "review"
          : null;

  // Header back: Publish / Edit → preview, review step → "AI needs a little
  // help", otherwise leave.
  const onHeaderBack = useCallback(() => {
    if (subView) {
      setView("status");
      return;
    }
    if (router.canGoBack()) router.back();
    else router.replace({ pathname: "/(main)/aiTools/toolList" as any, params: { mode: "aiTools" } });
  }, [router, subView]);

  // Hardware back on a sub-view → back to its main view
  const subViewRef = useRef(subView);
  subViewRef.current = subView;
  useEffect(() => {
    const unsubscribe = navigation.addListener("beforeRemove", (event: any) => {
      if (!subViewRef.current) return;
      // Only back presses — "Go to My Reels" / robot icon (POP / REPLACE) leave
      if (event?.data?.action?.type !== "GO_BACK") return;
      event.preventDefault();
      setView("status");
    });
    return unsubscribe;
  }, [navigation]);

  const renderTemplateCard = (subtitle?: string | null) =>
    templateName ? (
      <FlowCard>
        <View style={styles.templateRow}>
          <View style={styles.templateThumb}>
            {params.templateImage ? (
              <Image
                source={{ uri: params.templateImage }}
                style={styles.templateImage}
                contentFit="cover"
              />
            ) : (
              <MaterialIcons
                name={
                  autoReel?.template?.kind === "haircut"
                    ? "content-cut"
                    : "movie-filter"
                }
                size={moderateWidthScale(28)}
                color={theme.white70}
              />
            )}
          </View>
          <View style={styles.templateText}>
            <Text style={styles.templateName} numberOfLines={1}>
              {templateName}
            </Text>
            {subtitle ? (
              <Text style={styles.templateSub} numberOfLines={2}>
                {subtitle}
              </Text>
            ) : null}
          </View>
        </View>
      </FlowCard>
    ) : null;

  const renderViewOnlyNote = () => (
    <InfoNote icon="lock-outline" text={t("autoReelViewOnlyHint")} />
  );

  const renderProgress = () => {
    if (!autoReel) {
      return (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={theme.buttonBack} />
        </View>
      );
    }
    const rendering = status === "rendering";
    // Built after review: the highlights are already chosen
    const reviewed = Object.keys(autoReel.design?.picks ?? {}).length > 0;
    // Photo designs start without a video (every other kind has one) — no AI step
    const photoDesign = !autoBuilt && autoReel.source_media_asset_id == null;
    const highlights: TrackerStepState =
      rendering || reviewed ? "done" : "active";
    const building: TrackerStepState =
      rendering || reviewed || photoDesign ? "active" : "pending";
    const renderKey = autoReel.render_status
      ? RENDER_STATUS_KEYS[autoReel.render_status]
      : null;
    // Auto build: a new version of a reel made before (Regenerate / Edit,
    // here or on another device)
    const isRemake =
      autoBuilt &&
      (remaking ||
        (rendering &&
          ((autoReel.regenerations_used ?? 0) > 0 ||
            (autoReel.edit_renders ?? 0) > 0)));
    // Remakes and builds after review reuse moments the AI already found
    const momentsFound =
      rendering || (status === "pending" && (reviewed || isRemake));
    const steps: TrackerStep[] = autoBuilt
      ? [
          {
            key: "upload",
            title: t("flowUploadComplete"),
            subtitle: t("flowUploadCompleteSub"),
            state: "done",
          },
          {
            key: "moments",
            title: momentsFound
              ? t("autoBuildStepMomentsDone")
              : t("autoBuildStepMoments"),
            subtitle: momentsFound ? null : t("autoBuildStepMomentsSub"),
            state: momentsFound ? "done" : "active",
          },
          {
            key: "build",
            title: t("autoBuildStepBuild"),
            subtitle:
              rendering && renderKey
                ? t(renderKey)
                : momentsFound && status === "pending"
                  ? t("autoReelStatusPending")
                  : t("autoBuildStepBuildSub"),
            state: momentsFound ? "active" : "pending",
          },
        ]
      : [
          {
            key: "upload",
            title: t("flowUploadComplete"),
            subtitle: photoDesign
              ? t("designPhotosUploaded")
              : t("flowUploadCompleteSub"),
            state: "done",
          },
          ...(photoDesign
            ? []
            : [
                {
                  key: "highlights",
                  title: reviewed
                    ? t("designHighlightsChosen")
                    : t("flowSelectingHighlights"),
                  subtitle: reviewed
                    ? t("designHighlightsChosenSub")
                    : status === "pending"
                      ? t("autoReelStatusPending")
                      : t("flowSelectingHighlightsSub"),
                  state: highlights,
                },
              ]),
          {
            key: "build",
            title: t("flowBuildingReel"),
            subtitle:
              rendering && renderKey
                ? t(renderKey)
                : (reviewed || photoDesign) && status === "pending"
                  ? t("autoReelStatusPending")
                  : t("flowBuildingReelSub"),
            state: building,
          },
        ];
    return (
      <>
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <FlowTitle
            title={
              isRemake
                ? t("autoBuildRemakingTitle")
                : autoBuilt
                  ? t("autoBuildMakingTitle")
                  : t("flowCreatingTitle")
            }
            subtitle={
              isRemake
                ? t("autoBuildRemakingSubtitle")
                : autoBuilt
                  ? t("autoBuildMakingSubtitle")
                  : photoDesign
                    ? t("designCreatingPhotosSubtitle")
                    : t("flowCreatingSubtitle")
            }
          />
          {elapsedLabel ? (
            <Text style={styles.elapsed}>
              {t("autoReelElapsed", { time: elapsedLabel })}
            </Text>
          ) : null}
          <ProgressTracker steps={steps} />
          {renderTemplateCard(reelLengthLabel)}
          <InfoNote
            tone="warm"
            icon="notifications-none"
            title={
              isRemake
                ? null
                : photoDesign
                  ? t("designPhotosUploaded")
                  : t("flowVideoUploadedTitle")
            }
            text={t("autoReelInProgressHint")}
          />
        </ScrollView>
        <FlowFooter
          primary={{
            label: t("flowGoToMyReels"),
            onPress: handleGoToMyReels,
            trailingIcon: "arrow-forward",
          }}
        />
      </>
    );
  };

  const renderFailed = () => {
    const code = autoReel?.error_code ?? "";
    const isServerFault =
      canChange &&
      (AUTO_REEL_RETRYABLE_ERRORS.includes(code) ||
        (!NEW_VIDEO_ERRORS.includes(code) && code !== "not_found"));
    const offerSecondaryRetry =
      canChange && RARELY_RETRYABLE_ERRORS.includes(code);
    const offerAnotherTemplate =
      code === "not_found" && !!autoReel?.source_media_asset_id;
    // Needs the AI's stage map (design.suggestions) — none if analysis failed
    const offerRegenerate = canRegenerate && isAutoBuiltReel(autoReel);
    // A failed remake can be fixed by changing the part that broke it
    const offerEdit = canEdit && isAutoBuiltReel(autoReel);

    return (
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <FlowTitle title={t("autoReelFailedTitle")} />
        {renderTemplateCard()}
        <InfoNote
          tone="error"
          icon="error-outline"
          text={autoReel?.error_message || t("generationFailedHint")}
        />
        {!canChange ? renderViewOnlyNote() : null}
        <View style={styles.actions}>
          {isServerFault ? (
            <FlowButton
              label={t("tryAgain")}
              icon="refresh"
              onPress={() => void handleRetry()}
              loading={retrying}
              disabled={regenerating}
            />
          ) : offerAnotherTemplate ? (
            <FlowButton
              label={t("autoReelTryAnotherTemplate")}
              icon="auto-awesome"
              onPress={handleAnotherTemplate}
            />
          ) : (
            <FlowButton
              label={t("autoReelUploadAnotherVideo")}
              icon="video-call"
              onPress={handleNewVideo}
            />
          )}
          {offerRegenerate ? (
            <FlowButton
              variant="outline"
              label={t("autoBuildRegenerate")}
              icon="autorenew"
              onPress={confirmRegenerate}
              loading={regenerating}
              disabled={retrying}
            />
          ) : null}
          {offerEdit ? (
            <FlowButton
              variant="outline"
              label={t("autoBuildEdit")}
              icon="edit"
              onPress={() => setEditSheetOpen(true)}
              disabled={retrying || regenerating}
            />
          ) : null}
          {offerAnotherTemplate ? (
            <FlowButton
              variant="outline"
              label={t("autoReelUploadAnotherVideo")}
              icon="video-call"
              onPress={handleNewVideo}
            />
          ) : null}
          {offerSecondaryRetry ? (
            <FlowButton
              variant="outline"
              label={t("tryAgain")}
              icon="refresh"
              onPress={() => void handleRetry()}
              loading={retrying}
              disabled={regenerating}
            />
          ) : null}
        </View>
      </ScrollView>
    );
  };

  const renderReady = () => {
    const isHaircut = autoReel?.template?.kind === "haircut";
    // "Change style" hidden for now — not needed yet.
    // const changeStyleAvailable =
    //   canChange && !!autoReel?.source_media_asset_id && !isPublished;
    return (
      <>
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {renderReadyHeader()}
          {videoUrl ? (
            <ReelPlayer
              uri={videoUrl}
              ratio={ratio}
              posterUri={posterUri}
              styles={styles}
              theme={theme}
            />
          ) : null}
          {renderTools([
            ...(canPublish
              ? [
                  {
                    key: "caption",
                    icon: "edit" as const,
                    label: t("flowEditCaption"),
                    onPress: () => {
                      setView("publish");
                      setTimeout(() => captionInputRef.current?.focus(), 350);
                    },
                  },
                ]
              : []),
            ...mediaTools,
          ])}
          {/* "Change style" hidden for now — not needed yet (was a row button
              calling handleAnotherTemplate when changeStyleAvailable). */}
          {isRemoved ? (
            <InfoNote icon="block" text={t("autoReelRemovedHint")} />
          ) : null}
          {isHaircut && autoReel?.has_before === false ? (
            <InfoNote text={t("autoReelMissingBefore")} />
          ) : null}
          {isHaircut && autoReel?.has_reveal === false ? (
            <InfoNote text={t("autoReelMissingReveal")} />
          ) : null}
          {!canChange ? renderViewOnlyNote() : null}
        </ScrollView>
        {/* Published: its status (+ Unpublish). Nothing to publish: no
            footer — Save / Share are on this screen */}
        {isPublished ? (
          renderPublishedFooter()
        ) : canPublish ? (
          <FlowFooter
            primary={{
              label: t("flowNextPublish"),
              onPress: () => setView("publish"),
              disabled: !videoUrl,
              trailingIcon: "chevron-right",
            }}
          />
        ) : null}
      </>
    );
  };

  /**
   * Ready screen footer once the reel is live (nothing left to do on the
   * publish step): Unpublish for whoever may change it, else a "Published"
   * status.
   */
  const renderPublishedFooter = () => {
    const canUnpublish =
      canChange && !!(autoReel?.reel_id ?? autoReel?.reel?.id);
    return (
      <View
        style={[
          styles.publishedFooter,
          { paddingBottom: flowFooterBottomPad(insets.bottom) },
        ]}
      >
        {canUnpublish ? (
          <TouchableOpacity
            style={styles.publishedPill}
            onPress={confirmUnpublish}
            disabled={unpublishing}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={`${t("published")}. ${t("unpublish")}`}
            accessibilityState={{ busy: unpublishing }}
          >
            {unpublishing ? (
              <ActivityIndicator color={theme.buttonBack} />
            ) : (
              <>
                <MaterialIcons
                  name="unpublished"
                  size={moderateWidthScale(24)}
                  color={theme.buttonBack}
                />
                <Text style={styles.publishedText}>{t("unpublish")}</Text>
              </>
            )}
          </TouchableOpacity>
        ) : (
          <View style={styles.publishedPill} accessibilityRole="text">
            <MaterialIcons
              name="check-circle"
              size={moderateWidthScale(24)}
              color={theme.buttonBack}
            />
            <Text style={styles.publishedText}>{t("published")}</Text>
          </View>
        )}
        <FlowButton
          variant="light"
          icon="home"
          label={t("goToHome")}
          onPress={resetToDashboardHome}
        />
      </View>
    );
  };

  /** Auto-built reel: publish it, make a new version (Regenerate) or Edit it. */
  const renderAutoBuiltReady = () => {
    // One note for why Regenerate / Edit are off (no credits blocks both)
    const remakeLimitNote = outOfCredits
      ? t("autoBuildNoCreditsAction")
      : hasEditable && editsLeft <= 0
        ? t("autoBuildEditLimit")
        : regenerationsLeft <= 0
          ? t("autoBuildRegenerateLimit", { max: AUTO_REEL_MAX_REGENERATIONS })
          : null;
    // What's left, as two small pills with the number in bold
    const remakeCounts = [
      {
        key: "regen",
        icon: "refresh" as const,
        count: regenerationsLeft,
        word: t("autoBuildRegensLeftWord"),
      },
      ...(creditsLeft != null
        ? [
            {
              key: "credits",
              icon: "toll" as const,
              count: Math.max(0, creditsLeft),
              word: t("autoBuildCreditsMonthWord"),
            },
          ]
        : []),
    ];
    return (
      <>
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {renderReadyHeader()}
          {videoUrl ? (
            <ReelPlayer
              uri={videoUrl}
              ratio={ratio}
              posterUri={posterUri}
              styles={styles}
              theme={theme}
            />
          ) : null}
          <View style={styles.remakeBlock}>
            {renderTools([
              ...(remakeOpen
                ? [
                    {
                      key: "regenerate",
                      icon: "refresh" as const,
                      label: t("autoBuildRegenerate"),
                      onPress: confirmRegenerate,
                      disabled: !canRegenerate,
                      loading: regenerating,
                    },
                    ...(hasEditable
                      ? [
                          {
                            key: "edit",
                            icon: "edit" as const,
                            label: t("autoBuildEdit"),
                            onPress: () => setEditSheetOpen(true),
                            disabled: !canEdit || regenerating,
                          },
                        ]
                      : []),
                  ]
                : []),
              ...mediaTools,
            ])}
            {remakeOpen ? (
              <View style={styles.countRow}>
                {remakeCounts.map((item) => (
                  <View
                    key={item.key}
                    style={styles.countPill}
                    accessible
                    accessibilityLabel={`${item.count} ${item.word}`}
                  >
                    <MaterialIcons
                      name={item.icon}
                      size={moderateWidthScale(15)}
                      color={theme.selectCard}
                    />
                    <Text style={styles.countText}>
                      <Text style={styles.countNum}>{item.count}</Text>
                      {` ${item.word}`}
                    </Text>
                  </View>
                ))}
              </View>
            ) : null}
          </View>
          {remakeOpen && remakeLimitNote ? (
            <InfoNote
              tone="warm"
              icon={outOfCredits ? "toll" : "info-outline"}
              text={remakeLimitNote}
            />
          ) : null}
          {isRemoved ? (
            <InfoNote icon="block" text={t("autoReelRemovedHint")} />
          ) : null}
          {!canChange ? renderViewOnlyNote() : null}
        </ScrollView>
        {isPublished ? (
          renderPublishedFooter()
        ) : canPublish ? (
          <FlowFooter
            primary={{
              label: t("autoBuildPublish"),
              onPress: () => setView("publish"),
              disabled: !videoUrl || regenerating,
              icon: "publish",
            }}
          />
        ) : null}
      </>
    );
  };

  /** Auto build stopped at `review`: which moment the AI couldn't find. */
  const renderMissing = () => {
    const stages = missingStages.map((s) => s.trim()).filter(Boolean);
    const known = stages.some((s) => STAGE_LABEL_KEYS[s.toLowerCase()] != null);
    const stageNames = stages.map((s) => {
      const key = STAGE_LABEL_KEYS[s.toLowerCase()];
      return key ? t(key) : titleCase(s);
    });
    // The server's own wording only when it named no stage
    const body = known
      ? t("autoBuildMissingBody", {
          stages: stageNames.join(t("autoBuildStageJoin")),
        })
      : stages.length === 0 && missingMessage
        ? missingMessage
        : t("autoBuildMissingBodyGeneric");
    return (
      <>
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <FlowTitle title={t("autoBuildMissingTitle")} />
          <InfoNote tone="warm" icon="search-off" text={body} />
          {renderTemplateCard(reelLengthLabel)}
          {!canChange ? renderViewOnlyNote() : null}
        </ScrollView>
        {canChange ? (
          <FlowFooter
            secondary={{
              label: t("autoBuildPickAnotherTemplate"),
              onPress: handleGalleryWithVideo,
              icon: "auto-awesome",
              // A new reel costs a credit; choosing the moments here is free
              disabled: outOfCredits,
            }}
            primary={{
              label: t("autoBuildChooseMoments"),
              onPress: () => setView("review"),
              trailingIcon: "chevron-right",
            }}
            hint={
              outOfCredits
                ? t("autoBuildNoCredits")
                : t("autoBuildAnotherTemplateNote")
            }
          />
        ) : null}
      </>
    );
  };

  /** Edit (from the Edit sheet): one part of the reel, remade for 1 credit. */
  const renderEdit = () =>
    autoReel ? (
      <DesignReview
        key={`edit-${autoReel.id}-${editSection}`}
        autoReel={autoReel}
        canChange={canChange}
        mode="edit"
        section={editSection}
        onCancel={handleEditCancel}
        creditsRemaining={creditsLeft}
        onBuilt={handleEditBuilt}
      />
    ) : null;

  const renderPublish = () => (
    <>
      <KeyboardAwareScrollView
        style={styles.flex}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        bottomOffset={moderateHeightScale(40)}
      >
        <FlowTitle
          title={t("flowPublishReelTitle")}
          subtitle={
            autoBuilt && canPublish
              ? t("autoBuildPublishSubtitle")
              : t("flowPublishReelSubtitle")
          }
        />
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => setView("status")}
          accessibilityRole="button"
          accessibilityLabel={t("flowWatchAgain")}
        >
          <FlowCard>
            <View style={styles.reelCard}>
              <View style={styles.reelThumb}>
                {posterUri ? (
                  <Image
                    source={{ uri: posterUri }}
                    style={styles.templateImage}
                    contentFit="cover"
                  />
                ) : (
                  <MaterialIcons
                    name="movie"
                    size={moderateWidthScale(28)}
                    color={theme.white70}
                  />
                )}
              </View>
              <View style={styles.templateText}>
                <Text style={styles.templateName} numberOfLines={1}>
                  {[templateName, formatClock(durationSeconds)]
                    .filter(Boolean)
                    .join(" · ")}
                </Text>
                <Text style={styles.templateSub}>{t("flowWatchAgain")}</Text>
              </View>
              <MaterialIcons
                name="chevron-right"
                size={moderateWidthScale(28)}
                color={theme.darkGreen}
              />
            </View>
          </FlowCard>
        </TouchableOpacity>

        {canPublish ? (
          <>
            <FlowTextField
              ref={captionInputRef}
              label={t("caption")}
              value={caption}
              onChangeText={(v) => {
                captionTouchedRef.current = true;
                setCaption(v.slice(0, CAPTION_MAX));
              }}
              placeholder={t("flowCaptionPlaceholder")}
              multiline
              maxCount={CAPTION_MAX}
              helper={
                autoBuilt
                  ? captionIsAi
                    ? t("autoBuildCaptionAiHint")
                    : null
                  : caption.trim()
                    ? null
                    : t("flowCaptionKeepHint")
              }
              editable={!publishing}
            />
            {autoBuilt ? (
              <>
                {/* Reels always use the business's category; the picker is only a fallback when it can't be resolved */}
                {categoryId == null ? (
                  <SelectField
                    label={t("category")}
                    required
                    value={categoryName || null}
                    placeholder={t("selectCategory")}
                    open={categoryPickerOpen}
                    loading={loadingCategories}
                    options={categories}
                    selectedId={categoryId}
                    onToggle={() => void toggleCategoryPicker()}
                    onSelect={selectCategory}
                    helper={needsCategory ? t("autoReelNeedCategory") : null}
                  />
                ) : null}
                {services.length > 0 ? (
                  <ChoiceChips
                    label={t("serviceOptional")}
                    options={services}
                    selectedId={serviceId}
                    onSelect={setServiceId}
                  />
                ) : null}
              </>
            ) : null}
            {canLinkProduct ? (
              <OptionRow
                icon="sell"
                title={t("flowPromoteProductOptional")}
                subtitle={
                  selectedProduct?.name || productTag || t("flowPromoteProductSub")
                }
                done={selectedProductId != null}
                onPress={() => setProductSheetOpen(true)}
                disabled={publishing}
              />
            ) : null}
            <FlowButton
              label={autoBuilt ? t("autoBuildPublishNow") : t("flowPublishCta")}
              icon="publish"
              onPress={() => void handlePublish()}
              loading={publishing}
              disabled={needsCategory}
            />
          </>
        ) : isPublished ? (
          <>
            <View style={styles.publishedPill} accessibilityRole="text">
              <MaterialIcons
                name="check-circle"
                size={moderateWidthScale(24)}
                color={theme.buttonBack}
              />
              <Text style={styles.publishedText}>{t("published")}</Text>
            </View>
            <FlowButton
              variant="light"
              icon="home"
              label={t("goToHome")}
              onPress={resetToDashboardHome}
            />
          </>
        ) : null}

      </KeyboardAwareScrollView>

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
    </>
  );

  const renderBody = () => {
    if (loadError) {
      return (
        <ScrollView contentContainerStyle={styles.content}>
          <InfoNote tone="error" icon="error-outline" text={loadError} />
        </ScrollView>
      );
    }
    if (subView === "edit") return renderEdit();
    if (status === "ready") {
      if (subView === "publish") return renderPublish();
      return autoBuilt ? renderAutoBuiltReady() : renderReady();
    }
    if (status === "failed") return renderFailed();
    if (status === "review" && autoReel) {
      if (!autoReel.design?.slots?.length) {
        return (
          <ScrollView contentContainerStyle={styles.content}>
            <InfoNote
              tone="error"
              icon="error-outline"
              text={t("designReviewMissing")}
            />
          </ScrollView>
        );
      }
      // Auto build: explain the missing moment first; the review step is opt-in
      if (missingViewActive && subView !== "review") return renderMissing();
      return (
        <DesignReview
          key={autoReel.id}
          autoReel={autoReel}
          canChange={canChange}
          onBuilt={(data) => {
            setRetryStartedAt(Date.now());
            applyReel(data);
          }}
        />
      );
    }
    return renderProgress();
  };

  return (
    <View style={styles.safeArea}>
      <FlowHeader
        title={t("autoReelIntroTitle")}
        onBack={onHeaderBack}
        right={
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleRobotPress}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={t("aiTools")}
          >
            <MaterialIcons
              name="smart-toy"
              size={moderateWidthScale(26)}
              color={theme.darkGreen}
            />
          </TouchableOpacity>
        }
      />
      {renderBody()}
      <ReelVideoShareSheet
        visible={shareVisible}
        onClose={() => setShareVisible(false)}
        videoUrl={videoUrl}
      />
      {autoBuilt ? (
        <ModalizeBottomSheet
          visible={editSheetOpen}
          onClose={() => setEditSheetOpen(false)}
          title={t("autoBuildEditSheetTitle")}
        >
          <View style={styles.sheetContent}>
            {editClips ? (
              <OptionRow
                icon="video-library"
                title={t("autoBuildEditClips")}
                subtitle={t("autoBuildEditClipsSub")}
                onPress={() => openEditSection("clips")}
              />
            ) : null}
            {editMusic ? (
              <OptionRow
                icon="library-music"
                title={t("autoBuildEditMusic")}
                subtitle={t("autoBuildEditMusicSub")}
                onPress={() => openEditSection("music")}
              />
            ) : null}
            {editTexts ? (
              <OptionRow
                icon="text-fields"
                title={t("autoBuildEditText")}
                subtitle={t("autoBuildEditTextSub")}
                onPress={() => openEditSection("text")}
              />
            ) : null}
            <Text style={styles.smallNote}>
              {[
                t("autoBuildEditCreditNote"),
                creditsLeft != null
                  ? t("autoBuildCreditsLeft", { count: Math.max(0, creditsLeft) })
                  : null,
              ]
                .filter(Boolean)
                .join(" ")}
            </Text>
          </View>
        </ModalizeBottomSheet>
      ) : null}
    </View>
  );
}
