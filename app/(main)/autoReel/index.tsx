import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
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
import { useNotificationContext } from "@/src/contexts/NotificationContext";
import { useAppSelector, useTheme } from "@/src/hooks/hooks";
import Logger from "@/src/services/logger";
import { useDownloadMedia } from "@/src/hooks/useDownloadMedia";
import ReelVideoShareSheet from "@/src/components/ReelVideoShareSheet";
import {
  getAutoReel,
  publishAutoReel,
  retryAutoReel,
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
  AUTO_REEL_RETRYABLE_ERRORS,
  canChangeReel,
  isAutoReelInProgress,
  type AutoReel,
  autoReelVideo,
} from "@/src/types/reels";
import FlowHeader from "@/src/components/reelFlow/flowHeader";
import FlowFooter from "@/src/components/reelFlow/flowFooter";
import FlowButton from "@/src/components/reelFlow/flowButton";
import ProgressTracker, {
  type TrackerStepState,
} from "@/src/components/reelFlow/progressTracker";
import {
  FlowCard,
  FlowTitle,
  InfoNote,
  OptionRow,
} from "@/src/components/reelFlow/flowParts";
import { FlowTextField } from "@/src/components/reelFlow/detailsFields";
import ProductPickerSheet, {
  useInventoryProducts,
} from "@/src/components/reelFlow/productPickerSheet";

/**
 * AI Auto Reel after it's started (from the AI auto reel steps, a push or
 * AI Requests): "Creating your reel" → "Your reel is ready" (preview) →
 * "Publish your reel" (caption, product, publish, download / share).
 * These continue the flow, so no "Step N of M" here.
 */

const POLL_INTERVAL_MS = 5000;
const ELAPSED_HIDE_AFTER_SECONDS = 60 * 60;
const CAPTION_MAX = 2200;

const RENDER_STATUS_KEYS: Record<string, string> = {
  queued: "autoReelRenderQueued",
  fetching: "autoReelRenderFetching",
  rendering: "autoReelRenderRendering",
  saving: "autoReelRenderSaving",
  done: "autoReelRenderDone",
};

/** Errors where a new upload is the right next step */
const NEW_VIDEO_ERRORS = [
  "not_suitable",
  "too_many_moments",
  "source_too_long",
  "source_missing",
];

/** Errors where retry may help even though it is not a server fault */
const RARELY_RETRYABLE_ERRORS = ["not_suitable", "too_many_moments"];

function fieldError(error: any, field: string): string | null {
  const value = error?.data?.errors?.[field];
  if (Array.isArray(value) && typeof value[0] === "string") return value[0];
  return null;
}

function formatClock(seconds: number | null | undefined): string {
  if (seconds == null || !Number.isFinite(seconds)) return "";
  const total = Math.max(0, Math.round(seconds));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
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
    playerBar: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(10),
      paddingHorizontal: moderateWidthScale(14),
      paddingVertical: moderateHeightScale(10),
      backgroundColor: "rgba(0, 0, 0, 0.45)",
    },
    playerTime: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontBold,
      color: theme.white,
      fontVariant: ["tabular-nums"],
    },
    playerTrack: {
      flex: 1,
      height: heightScale(4),
      borderRadius: heightScale(2),
      backgroundColor: theme.white50,
      overflow: "hidden",
    },
    playerFill: {
      height: "100%",
      backgroundColor: theme.white,
    },
    rowButtons: {
      flexDirection: "row",
      gap: moderateWidthScale(12),
    },
    rowButton: { flex: 1 },
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
    sectionDivider: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(10),
    },
    dividerLine: {
      flex: 1,
      height: StyleSheet.hairlineWidth,
      backgroundColor: theme.borderMedium,
    },
    dividerText: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
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

function StartedPlayer({
  uri,
  styles,
  theme,
}: {
  uri: string;
  styles: Styles;
  theme: Theme;
}) {
  const { t } = useTranslation();
  const [timeMs, setTimeMs] = useState(0);
  const player = useVideoPlayer(uri, (p) => {
    p.loop = true;
    p.timeUpdateEventInterval = 0.25;
    p.play();
  });
  const { isPlaying } = useEvent(player, "playingChange", {
    isPlaying: player.playing,
  });
  const { status } = useEvent(player, "statusChange", {
    status: player.status,
  });
  useEffect(() => {
    const sub = player.addListener("timeUpdate", ({ currentTime }) => {
      setTimeMs(Math.max(0, currentTime * 1000));
    });
    return () => sub.remove();
  }, [player]);
  const durationMs = Math.max(0, (player.duration || 0) * 1000);
  const progress = durationMs > 0 ? Math.min(1, timeMs / durationMs) : 0;

  return (
    <Pressable
      style={StyleSheet.absoluteFill}
      onPress={() => (isPlaying ? player.pause() : player.play())}
      accessibilityRole="button"
      accessibilityLabel={isPlaying ? t("pause") : t("play")}
    >
      <VideoView
        player={player}
        style={StyleSheet.absoluteFill}
        contentFit="contain"
        nativeControls={false}
      />
      {status === "loading" ? (
        <View style={styles.playOverlay} pointerEvents="none">
          <ActivityIndicator color={theme.white} />
        </View>
      ) : !isPlaying ? (
        <View style={styles.playOverlay} pointerEvents="none">
          <View style={styles.playCircle}>
            <MaterialIcons
              name="play-arrow"
              size={moderateWidthScale(46)}
              color={theme.white}
            />
          </View>
        </View>
      ) : null}
      <View style={styles.playerBar} pointerEvents="none">
        <MaterialIcons
          name={isPlaying ? "pause" : "play-arrow"}
          size={moderateWidthScale(22)}
          color={theme.white}
        />
        <Text style={styles.playerTime}>
          {formatClock(timeMs / 1000)} / {formatClock(durationMs / 1000)}
        </Text>
        <View style={styles.playerTrack}>
          <View style={[styles.playerFill, { width: `${progress * 100}%` }]} />
        </View>
      </View>
    </Pressable>
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

  const params = useLocalSearchParams<{
    autoReelId?: string;
    /** Opened right after "Make my reel" (template image / caption known). */
    fromFlow?: string;
    templateImage?: string;
    caption?: string;
  }>();
  const autoReelId = params.autoReelId ? Number(params.autoReelId) : null;

  const [autoReel, setAutoReel] = useState<AutoReel | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);
  const userRole = useAppSelector((s) => s.user.userRole);
  // Staff have no product inventory yet — hidden until the backend supports it
  const canLinkProduct = userRole !== "staff";
  const [publishing, setPublishing] = useState(false);
  const [shareVisible, setShareVisible] = useState(false);
  /** Ready reel: preview first, then the publish screen. */
  const [view, setView] = useState<"status" | "publish">("status");
  const [caption, setCaption] = useState(params.caption ?? "");
  const captionTouchedRef = useRef(!!params.caption);
  const captionInputRef = useRef<TextInput>(null);
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const [productTag, setProductTag] = useState("");
  const [productSheetOpen, setProductSheetOpen] = useState(false);
  // created_at stays the original time after a retry — time the retry locally
  const [retryStartedAt, setRetryStartedAt] = useState<number | null>(null);
  const inFlightRef = useRef(false);

  const status = autoReel?.status ?? null;
  const inProgress = autoReel == null || isAutoReelInProgress(status);

  // Fill the caption from the reel's draft once (unless typed / handed in)
  const draftCaption = autoReel?.reel?.caption ?? null;
  useEffect(() => {
    if (captionTouchedRef.current || !draftCaption) return;
    captionTouchedRef.current = true;
    setCaption(draftCaption);
  }, [draftCaption]);

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

  const fetchOnce = useCallback(async () => {
    if (!autoReelId || inFlightRef.current) return;
    inFlightRef.current = true;
    try {
      const data = await getAutoReel(autoReelId);
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
      setAutoReel(data);
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
  }, [autoReelId, fetchOnce, retrying, showBanner, t]);

  /** Same uploaded video, another template ("Change style" / "Try another template"). */
  const handleAnotherTemplate = useCallback(() => {
    router.replace({
      pathname: "/(main)/reelTemplates" as any,
      params: autoReel?.source_media_asset_id
        ? { sourceMediaAssetId: String(autoReel.source_media_asset_id) }
        : {},
    });
  }, [autoReel?.source_media_asset_id, router]);

  const handleNewVideo = useCallback(() => {
    router.replace("/(main)/reelTemplates" as any);
  }, [router]);

  // Publishing makes the reel from the AI result. Fields left out keep the
  // values chosen when the auto reel was started.
  const handlePublish = useCallback(async () => {
    if (!autoReelId || publishing) return;
    setPublishing(true);
    try {
      const trimmed = caption.trim();
      const data = await publishAutoReel(autoReelId, {
        ...(trimmed ? { caption: trimmed } : {}),
        ...(selectedProductId != null
          ? { product_id: selectedProductId, product_tag: productTag || null }
          : {}),
      });
      setAutoReel(data);
      showBanner(t("success"), t("reelPublished"), "success", 2500);
    } catch (error: any) {
      Logger.error("Failed to publish auto reel:", error);
      const message =
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
  }, [autoReelId, caption, productTag, publishing, selectedProductId, showBanner, t]);

  // Staff may only retry / publish / edit / delete what they started (403 otherwise)
  const canChange = canChangeReel(autoReel, userRole);
  const reelStatus = autoReel?.reel?.status ?? null;
  const isPublished = reelStatus === "published";
  const isRemoved = reelStatus === "removed";

  const products = useInventoryProducts(canLinkProduct && view === "publish");
  const selectedProduct =
    selectedProductId == null
      ? null
      : (products.products.find((p) => Number(p.id) === selectedProductId) ??
        null);

  const templateName = autoReel
    ? autoReel.template?.name || t("autoReelTemplateRemoved")
    : null;
  const video = autoReelVideo(autoReel);
  const videoUrl = video?.playback_url ?? null;
  const posterUri = video?.thumbnail_url ?? params.templateImage ?? null;
  const durationSeconds = autoReel?.total_seconds ?? video?.duration_seconds ?? null;
  const ratio =
    video?.width && video?.height ? video.width / video.height : 9 / 16;
  const downloading = !!videoUrl && downloadingUrl === videoUrl;
  const canPublish = canChange && !isPublished && !isRemoved && !!videoUrl;

  // Header back: Publish → preview, otherwise leave.
  const onHeaderBack = useCallback(() => {
    if (view === "publish") {
      setView("status");
      return;
    }
    if (router.canGoBack()) router.back();
    else router.replace({ pathname: "/(main)/aiTools/toolList" as any, params: { mode: "aiTools" } });
  }, [router, view]);

  // Hardware back on the Publish screen → back to the preview
  const viewRef = useRef(view);
  viewRef.current = view;
  useEffect(() => {
    const unsubscribe = navigation.addListener("beforeRemove", (event: any) => {
      if (viewRef.current !== "publish") return;
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
    const highlights: TrackerStepState = rendering ? "done" : "active";
    const building: TrackerStepState = rendering ? "active" : "pending";
    const renderKey = autoReel.render_status
      ? RENDER_STATUS_KEYS[autoReel.render_status]
      : null;
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
          {elapsedLabel ? (
            <Text style={styles.elapsed}>
              {t("autoReelElapsed", { time: elapsedLabel })}
            </Text>
          ) : null}
          <ProgressTracker
            steps={[
              {
                key: "upload",
                title: t("flowUploadComplete"),
                subtitle: t("flowUploadCompleteSub"),
                state: "done",
              },
              {
                key: "highlights",
                title: t("flowSelectingHighlights"),
                subtitle:
                  status === "pending"
                    ? t("autoReelStatusPending")
                    : t("flowSelectingHighlightsSub"),
                state: highlights,
              },
              {
                key: "build",
                title: t("flowBuildingReel"),
                subtitle:
                  rendering && renderKey ? t(renderKey) : t("flowBuildingReelSub"),
                state: building,
              },
            ]}
          />
          {renderTemplateCard(t("autoReelReqLength"))}
          <InfoNote
            tone="warm"
            icon="notifications-none"
            title={t("flowVideoUploadedTitle")}
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
          <FlowTitle
            title={t("flowReadyTitle")}
            subtitle={t("flowReadySubtitle")}
          />
          {videoUrl ? (
            <ReelPlayer
              uri={videoUrl}
              ratio={ratio}
              posterUri={posterUri}
              styles={styles}
              theme={theme}
            />
          ) : null}
          {canPublish ? (
            <View style={styles.rowButtons}>
              <FlowButton
                variant="outline"
                compact
                icon="edit"
                label={t("flowEditCaption")}
                onPress={() => {
                  setView("publish");
                  setTimeout(() => captionInputRef.current?.focus(), 350);
                }}
                style={styles.rowButton}
              />
              {/* "Change style" hidden for now — not needed yet.
              {changeStyleAvailable ? (
                <FlowButton
                  variant="outline"
                  compact
                  icon="auto-awesome"
                  label={t("flowChangeStyle")}
                  onPress={handleAnotherTemplate}
                  style={styles.rowButton}
                />
              ) : null} */}
            </View>
          ) : null}
          {isPublished ? (
            <InfoNote icon="public" text={t("flowAlreadyPublished")} />
          ) : isRemoved ? (
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
        <FlowFooter
          primary={{
            label: canPublish ? t("flowNextPublish") : t("flowSaveOrShare"),
            onPress: () => setView("publish"),
            disabled: !videoUrl,
            trailingIcon: "chevron-right",
          }}
        />
      </>
    );
  };

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
          subtitle={t("flowPublishReelSubtitle")}
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
              helper={caption.trim() ? null : t("flowCaptionKeepHint")}
              editable={!publishing}
            />
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
              label={t("flowPublishCta")}
              icon="publish"
              onPress={() => void handlePublish()}
              loading={publishing}
            />
          </>
        ) : isPublished ? (
          <View style={styles.publishedPill} accessibilityRole="text">
            <MaterialIcons
              name="check-circle"
              size={moderateWidthScale(24)}
              color={theme.buttonBack}
            />
            <Text style={styles.publishedText}>{t("published")}</Text>
          </View>
        ) : null}

        {videoUrl ? (
          <>
            <View style={styles.sectionDivider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>{t("flowSaveOrShareVideo")}</Text>
              <View style={styles.dividerLine} />
            </View>
            <View style={styles.rowButtons}>
              <FlowButton
                variant="outline"
                compact
                icon="file-download"
                label={t("download")}
                onPress={() => downloadMedia(videoUrl, { isVideo: true })}
                loading={downloading}
                style={styles.rowButton}
              />
              <FlowButton
                variant="outline"
                compact
                icon="ios-share"
                label={t("flowShareVideo")}
                onPress={() => setShareVisible(true)}
                style={styles.rowButton}
              />
            </View>
            {!isPublished ? (
              <Text style={styles.smallNote}>{t("flowDownloadNotPublish")}</Text>
            ) : null}
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
    if (status === "ready") {
      return view === "publish" ? renderPublish() : renderReady();
    }
    if (status === "failed") return renderFailed();
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
    </View>
  );
}
