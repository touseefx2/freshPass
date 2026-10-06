import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { MaterialIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useVideoPlayer, VideoView } from "expo-video";
import Button from "@/src/components/button";
import StackHeader from "@/src/components/StackHeader";
import { useNotificationContext } from "@/src/contexts/NotificationContext";
import { useAppSelector, useTheme } from "@/src/hooks/hooks";
import Logger from "@/src/services/logger";
import {
  deleteReel,
  getAutoReel,
  publishReel,
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
  type AutoReelStatus,
} from "@/src/types/reels";

const POLL_INTERVAL_MS = 5000;
const ELAPSED_HIDE_AFTER_SECONDS = 60 * 60;

const STEPS: { status: AutoReelStatus; labelKey: string }[] = [
  { status: "pending", labelKey: "autoReelStepQueued" },
  { status: "analyzing", labelKey: "autoReelStepAnalyzing" },
  { status: "rendering", labelKey: "autoReelStepRendering" },
  { status: "ready", labelKey: "autoReelStepReady" },
];

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

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.background,
    },
    body: {
      flexGrow: 1,
      paddingHorizontal: moderateWidthScale(20),
      paddingTop: moderateHeightScale(18),
      paddingBottom: moderateHeightScale(24),
    },
    loadingWrap: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    cardShadow: {
      borderRadius: moderateWidthScale(18),
      backgroundColor: theme.background,
      shadowColor: theme.darkGreen,
      shadowOffset: { width: 0, height: moderateHeightScale(3) },
      shadowOpacity: 0.1,
      shadowRadius: moderateWidthScale(8),
      elevation: 3,
      marginBottom: moderateHeightScale(14),
    },
    card: {
      borderRadius: moderateWidthScale(18),
      borderWidth: 1,
      borderColor: theme.borderLight,
      backgroundColor: theme.white,
      paddingHorizontal: moderateWidthScale(16),
      paddingVertical: moderateHeightScale(18),
      overflow: "hidden",
    },
    heroIcon: {
      alignSelf: "center",
      width: widthScale(64),
      height: widthScale(64),
      borderRadius: widthScale(32),
      backgroundColor: theme.lightGreen07,
      borderWidth: 1,
      borderColor: theme.lightGreen015,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: moderateHeightScale(12),
    },
    heroIconError: {
      backgroundColor: theme.lightRed,
      borderColor: theme.lightRedBorder,
    },
    statusTitle: {
      fontSize: fontSize.size18,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      textAlign: "center",
    },
    statusSubtitle: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      textAlign: "center",
      lineHeight: fontSize.size18,
    },
    templatePill: {
      alignSelf: "center",
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(4),
      marginTop: moderateHeightScale(8),
      paddingHorizontal: moderateWidthScale(10),
      paddingVertical: moderateHeightScale(4),
      borderRadius: moderateWidthScale(20),
      backgroundColor: theme.lightGreen07,
    },
    templatePillText: {
      fontSize: fontSize.size11,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
    },
    elapsed: {
      marginTop: moderateHeightScale(6),
      fontSize: fontSize.size12,
      fontFamily: fonts.fontMedium,
      color: theme.lightGreen,
      textAlign: "center",
      fontVariant: ["tabular-nums"],
    },
    stepsTitle: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      textTransform: "uppercase",
      letterSpacing: 0.4,
      marginBottom: moderateHeightScale(8),
    },
    stepRow: {
      flexDirection: "row",
      gap: moderateWidthScale(12),
    },
    stepRail: {
      alignItems: "center",
      width: moderateWidthScale(24),
    },
    stepDot: {
      width: moderateWidthScale(24),
      height: moderateWidthScale(24),
      borderRadius: moderateWidthScale(12),
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: theme.lightGreen4,
      backgroundColor: theme.white,
    },
    stepDotActive: {
      borderColor: theme.buttonBack,
      backgroundColor: theme.lightGreen07,
    },
    stepDotDone: {
      borderColor: theme.buttonBack,
      backgroundColor: theme.buttonBack,
    },
    stepLine: {
      flex: 1,
      width: 2,
      minHeight: moderateHeightScale(14),
      backgroundColor: theme.lightGreen015,
    },
    stepLineDone: {
      backgroundColor: theme.buttonBack,
    },
    stepBody: {
      flex: 1,
      paddingTop: moderateHeightScale(3),
      paddingBottom: moderateHeightScale(14),
    },
    stepText: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
    },
    stepTextActive: {
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    stepSub: {
      marginTop: moderateHeightScale(2),
      fontSize: fontSize.size11,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
    },
    note: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: moderateWidthScale(8),
      paddingHorizontal: moderateWidthScale(12),
      paddingVertical: moderateHeightScale(10),
      borderRadius: moderateWidthScale(12),
      backgroundColor: theme.lightGreen07,
      borderWidth: 1,
      borderColor: theme.borderLight,
      marginBottom: moderateHeightScale(10),
    },
    noteError: {
      backgroundColor: theme.lightRed,
      borderColor: theme.lightRedBorder,
    },
    noteText: {
      flex: 1,
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.darkGreen,
      lineHeight: fontSize.size17,
    },
    previewWrap: {
      alignSelf: "center",
      width: "78%",
      aspectRatio: 9 / 16,
      maxHeight: heightScale(460),
      borderRadius: moderateWidthScale(18),
      overflow: "hidden",
      backgroundColor: theme.black,
      marginBottom: moderateHeightScale(16),
    },
    previewVideo: {
      width: "100%",
      height: "100%",
    },
    readyMetaRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "center",
      gap: moderateWidthScale(8),
      marginTop: moderateHeightScale(10),
      marginBottom: moderateHeightScale(14),
    },
    metaChip: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(4),
      backgroundColor: theme.lightGreen07,
      borderRadius: moderateWidthScale(20),
      paddingHorizontal: moderateWidthScale(10),
      paddingVertical: moderateHeightScale(5),
    },
    metaChipText: {
      fontSize: fontSize.size11,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
    },
    actions: {
      gap: moderateHeightScale(10),
      marginTop: moderateHeightScale(8),
    },
    secondaryButton: {
      flexDirection: "row",
      gap: moderateWidthScale(6),
      backgroundColor: theme.white,
      borderWidth: 1,
      borderColor: theme.buttonBack,
      borderRadius: moderateWidthScale(12),
      height: moderateHeightScale(48),
      alignItems: "center",
      justifyContent: "center",
    },
    secondaryButtonText: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    dangerButton: {
      flexDirection: "row",
      gap: moderateWidthScale(6),
      alignSelf: "center",
      alignItems: "center",
      justifyContent: "center",
      minHeight: moderateHeightScale(44),
      paddingHorizontal: moderateWidthScale(16),
      marginTop: moderateHeightScale(6),
    },
    dangerButtonText: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontMedium,
      color: theme.red,
    },
  });

function ReadyPreview({ uri }: { uri: string }) {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const player = useVideoPlayer(uri, (p) => {
    p.loop = true;
    p.muted = false;
    p.play();
  });

  return (
    <View style={styles.previewWrap}>
      <VideoView
        style={styles.previewVideo}
        player={player}
        contentFit="contain"
        nativeControls
      />
    </View>
  );
}

export default function AutoReelScreen() {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { showBanner } = useNotificationContext();

  const params = useLocalSearchParams<{ autoReelId?: string }>();
  const autoReelId = params.autoReelId ? Number(params.autoReelId) : null;

  const [autoReel, setAutoReel] = useState<AutoReel | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);
  const userRole = useAppSelector((s) => s.user.userRole);
  const [publishing, setPublishing] = useState(false);
  const [discarding, setDiscarding] = useState(false);
  // created_at stays the original time after a retry — time the retry locally
  const [retryStartedAt, setRetryStartedAt] = useState<number | null>(null);
  const inFlightRef = useRef(false);

  const status = autoReel?.status ?? null;
  const inProgress = autoReel == null || isAutoReelInProgress(status);

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

  const leaveScreen = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(main)/dashboard" as any);
    }
  }, [router]);

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

  const reelId = autoReel?.reel_id ?? autoReel?.reel?.id ?? null;

  const handlePublish = useCallback(async () => {
    if (!reelId || publishing) return;
    setPublishing(true);
    try {
      await publishReel(reelId);
      showBanner(t("success"), t("reelPublished"), "success", 2500);
      leaveScreen();
    } catch (error: any) {
      Logger.error("Failed to publish auto reel:", error);
      showBanner(
        t("error"),
        error?.message || t("failedToPublishReel"),
        "error",
        3000,
      );
    } finally {
      setPublishing(false);
    }
  }, [leaveScreen, publishing, reelId, showBanner, t]);

  const handleEditDetails = useCallback(() => {
    if (!reelId) return;
    router.push({
      pathname: "/(main)/publishReel" as any,
      params: { reelId: String(reelId) },
    });
  }, [reelId, router]);

  // Staff may only retry / publish / edit / delete what they started (403 otherwise)
  const canChange = canChangeReel(autoReel, userRole);
  const reelStatus = autoReel?.reel?.status ?? null;
  const isDraft = reelStatus === "draft";
  const isPublished = reelStatus === "published";

  const handleDiscard = useCallback(() => {
    if (!reelId || discarding) return;
    // A published reel is live in the feed — say so before deleting it
    const title = isDraft ? t("discard") : t("deleteReel");
    const message = isPublished
      ? t("autoReelDeletePublishedConfirm")
      : isDraft
        ? t("autoReelDiscardConfirm")
        : t("autoReelDeleteConfirm");
    Alert.alert(title, message, [
      { text: t("cancel"), style: "cancel" },
      {
        text: isDraft ? t("discard") : t("delete"),
        style: "destructive",
        onPress: async () => {
          setDiscarding(true);
          try {
            await deleteReel(reelId);
            showBanner(
              t("success"),
              isDraft ? t("reelDiscarded") : t("reelDeleted"),
              "success",
              2000,
            );
            leaveScreen();
          } catch (error: any) {
            Logger.error("Failed to discard auto reel:", error);
            showBanner(
              t("error"),
              error?.message ||
                (isDraft ? t("failedToDiscardReel") : t("failedToDeleteReel")),
              "error",
              3000,
            );
          } finally {
            setDiscarding(false);
          }
        },
      },
    ]);
  }, [discarding, isDraft, isPublished, leaveScreen, reelId, showBanner, t]);

  const templateName = autoReel
    ? autoReel.template?.name || t("autoReelTemplateRemoved")
    : null;

  const renderViewOnlyNote = () => (
    <View style={styles.note}>
      <MaterialIcons
        name="lock-outline"
        size={moderateWidthScale(16)}
        color={theme.buttonBack}
      />
      <Text style={styles.noteText}>{t("autoReelViewOnlyHint")}</Text>
    </View>
  );

  const renderTemplatePill = () =>
    templateName ? (
      <View style={styles.templatePill}>
        <MaterialIcons
          name="movie-filter"
          size={moderateWidthScale(12)}
          color={theme.buttonBack}
        />
        <Text style={styles.templatePillText} numberOfLines={1}>
          {templateName}
        </Text>
      </View>
    ) : null;

  const renderProgress = () => {
    if (!autoReel) {
      return (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={theme.buttonBack} />
        </View>
      );
    }
    const activeIndex = Math.max(
      0,
      STEPS.findIndex((s) => s.status === status),
    );
    const renderKey = autoReel.render_status
      ? RENDER_STATUS_KEYS[autoReel.render_status]
      : null;
    return (
      <>
        <View style={styles.cardShadow}>
          <View style={styles.card}>
            <View style={styles.heroIcon}>
              <ActivityIndicator size="small" color={theme.buttonBack} />
            </View>
            <Text style={styles.statusTitle} accessibilityLiveRegion="polite">
              {status === "analyzing"
                ? t("autoReelStatusAnalyzing")
                : status === "rendering"
                  ? t("autoReelStatusRendering")
                  : t("autoReelStatusPending")}
            </Text>
            {renderTemplatePill()}
            {elapsedLabel ? (
              <Text style={styles.elapsed}>
                {t("autoReelElapsed", { time: elapsedLabel })}
              </Text>
            ) : null}
          </View>
        </View>

        <View style={styles.cardShadow}>
          <View style={styles.card}>
            <Text style={styles.stepsTitle}>{t("autoReelProgress")}</Text>
            {STEPS.map((step, index) => {
              const done = index < activeIndex;
              const active = index === activeIndex;
              const last = index === STEPS.length - 1;
              return (
                <View
                  key={step.status}
                  style={styles.stepRow}
                  accessible
                  accessibilityLabel={`${t(step.labelKey)}${
                    done ? `, ${t("completed")}` : ""
                  }`}
                  accessibilityState={{ busy: active }}
                >
                  <View style={styles.stepRail}>
                    <View
                      style={[
                        styles.stepDot,
                        active && styles.stepDotActive,
                        done && styles.stepDotDone,
                      ]}
                    >
                      {done ? (
                        <MaterialIcons
                          name="check"
                          size={moderateWidthScale(14)}
                          color={theme.white}
                        />
                      ) : active ? (
                        <ActivityIndicator
                          size="small"
                          color={theme.buttonBack}
                          style={{ transform: [{ scale: 0.7 }] }}
                        />
                      ) : null}
                    </View>
                    {!last ? (
                      <View
                        style={[styles.stepLine, done && styles.stepLineDone]}
                      />
                    ) : null}
                  </View>
                  <View style={[styles.stepBody, last && { paddingBottom: 0 }]}>
                    <Text
                      style={[styles.stepText, active && styles.stepTextActive]}
                    >
                      {t(step.labelKey)}
                    </Text>
                    {active && step.status === "rendering" && renderKey ? (
                      <Text style={styles.stepSub}>{t(renderKey)}</Text>
                    ) : null}
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        <View style={styles.note}>
          <MaterialIcons
            name="schedule"
            size={moderateWidthScale(16)}
            color={theme.buttonBack}
          />
          <Text style={styles.noteText}>{t("autoReelTimeHint")}</Text>
        </View>
        <View style={styles.note}>
          <MaterialIcons
            name="notifications-none"
            size={moderateWidthScale(16)}
            color={theme.buttonBack}
          />
          <Text style={styles.noteText}>{t("autoReelInProgressHint")}</Text>
        </View>
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
      <>
        <View style={styles.cardShadow}>
          <View style={styles.card}>
            <View style={[styles.heroIcon, styles.heroIconError]}>
              <MaterialIcons
                name="error-outline"
                size={moderateWidthScale(30)}
                color={theme.red}
              />
            </View>
            <Text style={styles.statusTitle} accessibilityRole="alert">
              {t("autoReelFailedTitle")}
            </Text>
            {renderTemplatePill()}
          </View>
        </View>

        <View style={[styles.note, styles.noteError]}>
          <MaterialIcons
            name="info-outline"
            size={moderateWidthScale(16)}
            color={theme.red}
          />
          <Text style={styles.noteText}>
            {autoReel?.error_message || t("generationFailedHint")}
          </Text>
        </View>

        {!canChange ? renderViewOnlyNote() : null}

        <View style={styles.actions}>
          {isServerFault ? (
            <Button
              title={t("tryAgain")}
              onPress={handleRetry}
              loading={retrying}
              disabled={retrying}
            />
          ) : offerAnotherTemplate ? (
            <Button
              title={t("autoReelTryAnotherTemplate")}
              onPress={handleAnotherTemplate}
            />
          ) : (
            <Button
              title={t("autoReelUploadAnotherVideo")}
              onPress={handleNewVideo}
            />
          )}
          {offerAnotherTemplate ? (
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={handleNewVideo}
              activeOpacity={0.85}
              accessibilityRole="button"
            >
              <MaterialIcons
                name="video-call"
                size={moderateWidthScale(18)}
                color={theme.darkGreen}
              />
              <Text style={styles.secondaryButtonText}>
                {t("autoReelUploadAnotherVideo")}
              </Text>
            </TouchableOpacity>
          ) : null}
          {offerSecondaryRetry ? (
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={handleRetry}
              disabled={retrying}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityState={{ disabled: retrying, busy: retrying }}
            >
              {retrying ? (
                <ActivityIndicator size="small" color={theme.darkGreen} />
              ) : (
                <MaterialIcons
                  name="refresh"
                  size={moderateWidthScale(18)}
                  color={theme.darkGreen}
                />
              )}
              <Text style={styles.secondaryButtonText}>{t("tryAgain")}</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </>
    );
  };

  const renderReady = () => {
    const videoUrl = autoReel?.reel?.video?.playback_url ?? null;
    const isHaircut = autoReel?.template?.kind === "haircut";
    const busy = publishing || discarding || !reelId;
    // The draft can be published (here or via Edit details), removed by admin, or deleted
    const reelGone = !autoReel?.reel;
    const isRemoved = reelStatus === "removed";
    const statusChip = isPublished
      ? { icon: "public" as const, label: t("published") }
      : isRemoved
        ? { icon: "block" as const, label: t("removed") }
        : isDraft
          ? { icon: "edit-note" as const, label: t("draft") }
          : null;
    return (
      <View>
        {videoUrl ? <ReadyPreview uri={videoUrl} /> : null}
        <Text style={styles.statusTitle} accessibilityLiveRegion="polite">
          {isPublished ? t("autoReelPublishedTitle") : t("reelReady")}
        </Text>
        <Text
          style={[styles.statusSubtitle, { marginTop: moderateHeightScale(4) }]}
        >
          {reelGone
            ? t("autoReelDraftDeleted")
            : isPublished
              ? t("autoReelPublishedHint")
              : isRemoved
                ? t("autoReelRemovedHint")
                : t("autoReelReadyHint")}
        </Text>
        <View style={styles.readyMetaRow}>
          {templateName ? (
            <View style={styles.metaChip}>
              <MaterialIcons
                name="movie-filter"
                size={moderateWidthScale(13)}
                color={theme.buttonBack}
              />
              <Text style={styles.metaChipText}>{templateName}</Text>
            </View>
          ) : null}
          {autoReel?.total_seconds != null ? (
            <View style={styles.metaChip}>
              <MaterialIcons
                name="timer"
                size={moderateWidthScale(13)}
                color={theme.buttonBack}
              />
              <Text style={styles.metaChipText}>
                {t("autoReelSeconds", {
                  seconds: Math.round(autoReel.total_seconds * 10) / 10,
                })}
              </Text>
            </View>
          ) : null}
          {statusChip ? (
            <View style={styles.metaChip}>
              <MaterialIcons
                name={statusChip.icon}
                size={moderateWidthScale(13)}
                color={theme.buttonBack}
              />
              <Text style={styles.metaChipText}>{statusChip.label}</Text>
            </View>
          ) : null}
        </View>
        {isHaircut && autoReel?.has_before === false ? (
          <View style={styles.note}>
            <MaterialIcons
              name="info-outline"
              size={moderateWidthScale(16)}
              color={theme.buttonBack}
            />
            <Text style={styles.noteText}>{t("autoReelMissingBefore")}</Text>
          </View>
        ) : null}
        {isHaircut && autoReel?.has_reveal === false ? (
          <View style={styles.note}>
            <MaterialIcons
              name="info-outline"
              size={moderateWidthScale(16)}
              color={theme.buttonBack}
            />
            <Text style={styles.noteText}>{t("autoReelMissingReveal")}</Text>
          </View>
        ) : null}
        {!canChange && !reelGone ? renderViewOnlyNote() : null}
        {reelGone || !canChange ? null : (
        <View style={styles.actions}>
          {isDraft ? (
            <Button
              title={t("publish")}
              onPress={handlePublish}
              loading={publishing}
              disabled={busy}
            />
          ) : null}
          {/* Removed reels can't be edited (422) — only deleted */}
          {!isRemoved ? (
            <TouchableOpacity
              style={[styles.secondaryButton, busy && { opacity: 0.5 }]}
              onPress={handleEditDetails}
              disabled={busy}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityState={{ disabled: busy }}
            >
              <MaterialIcons
                name="edit"
                size={moderateWidthScale(18)}
                color={theme.darkGreen}
              />
              <Text style={styles.secondaryButtonText}>
                {t("autoReelEditDetails")}
              </Text>
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity
            style={[styles.dangerButton, busy && { opacity: 0.5 }]}
            onPress={handleDiscard}
            disabled={busy}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={isDraft ? t("discard") : t("deleteReel")}
            accessibilityHint={
              isPublished
                ? t("autoReelDeletePublishedConfirm")
                : t("autoReelDiscardConfirm")
            }
            accessibilityState={{ disabled: busy, busy: discarding }}
          >
            {discarding ? (
              <ActivityIndicator size="small" color={theme.red} />
            ) : (
              <MaterialIcons
                name="delete-outline"
                size={moderateWidthScale(18)}
                color={theme.red}
              />
            )}
            <Text style={styles.dangerButtonText}>
              {isDraft ? t("discard") : t("deleteReel")}
            </Text>
          </TouchableOpacity>
        </View>
        )}
      </View>
    );
  };

  return (
    <View style={[styles.safeArea, { paddingBottom: insets.bottom }]}>
      <StackHeader title={t("autoReelTitle")} />
      <ScrollView
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
      >
        {loadError ? (
          <View style={styles.cardShadow}>
            <View style={styles.card}>
              <View style={[styles.heroIcon, styles.heroIconError]}>
                <MaterialIcons
                  name="error-outline"
                  size={moderateWidthScale(30)}
                  color={theme.red}
                />
              </View>
              <Text style={styles.statusTitle} accessibilityRole="alert">
                {loadError}
              </Text>
            </View>
          </View>
        ) : status === "ready" ? (
          renderReady()
        ) : status === "failed" ? (
          renderFailed()
        ) : (
          renderProgress()
        )}
      </ScrollView>
    </View>
  );
}
