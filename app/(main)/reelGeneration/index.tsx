import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { MaterialIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useVideoPlayer, VideoView } from "expo-video";
import Button from "@/src/components/button";
import StackHeader from "@/src/components/StackHeader";
import { useNotificationContext } from "@/src/contexts/NotificationContext";
import { useTheme } from "@/src/hooks/hooks";
import Logger from "@/src/services/logger";
import {
  deleteReel,
  getGenerationStatus,
  publishReel,
} from "@/src/services/reelsService";
import { Theme } from "@/src/theme/colors";
import {
  heightScale,
  moderateHeightScale,
  moderateWidthScale,
  widthScale,
} from "@/src/theme/dimensions";
import { fontSize, fonts } from "@/src/theme/fonts";
import type { GenerationStatus } from "@/src/types/reels";

const POLL_INTERVAL_MS = 4000;

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.background,
    },
    body: {
      flex: 1,
      paddingHorizontal: moderateWidthScale(20),
      paddingTop: moderateHeightScale(16),
      paddingBottom: moderateHeightScale(20),
    },
    center: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      gap: moderateHeightScale(14),
      paddingHorizontal: moderateWidthScale(24),
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
    progressTrack: {
      width: "100%",
      height: heightScale(8),
      borderRadius: moderateWidthScale(999),
      backgroundColor: theme.lightGreen015,
      overflow: "hidden",
      marginTop: moderateHeightScale(8),
    },
    progressFill: {
      height: "100%",
      backgroundColor: theme.buttonBack,
      borderRadius: moderateWidthScale(999),
    },
    progressLabel: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
      marginTop: moderateHeightScale(6),
    },
    previewWrap: {
      width: "100%",
      height: heightScale(420),
      borderRadius: moderateWidthScale(16),
      overflow: "hidden",
      backgroundColor: theme.black,
      marginBottom: moderateHeightScale(16),
    },
    previewVideo: {
      width: "100%",
      height: "100%",
    },
    actions: {
      gap: moderateHeightScale(10),
      marginTop: "auto",
    },
    secondaryButton: {
      backgroundColor: theme.lightGreen015,
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
    errorIcon: {
      width: widthScale(64),
      height: widthScale(64),
      borderRadius: moderateWidthScale(32),
      backgroundColor: theme.lightGreen07,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: moderateHeightScale(4),
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

  useEffect(() => {
    try {
      player.replaceAsync(uri);
      player.play();
    } catch {}
  }, [player, uri]);

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

export default function ReelGenerationScreen() {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { showBanner } = useNotificationContext();

  const params = useLocalSearchParams<{ reelId?: string }>();
  const reelId = params.reelId ? Number(params.reelId) : null;

  const [status, setStatus] = useState<GenerationStatus>("pending");
  const [progress, setProgress] = useState<number | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [discarding, setDiscarding] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stoppedRef = useRef(false);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const pollOnce = useCallback(async () => {
    if (!reelId || stoppedRef.current) return;
    try {
      const data = await getGenerationStatus(reelId);
      setStatus(data.generation_status);
      setProgress(
        typeof data.progress === "number" ? data.progress : null,
      );
      setVideoUrl(data.video_url);
      setErrorMessage(data.generation_error);

      if (
        data.generation_status === "ready" ||
        data.generation_status === "failed"
      ) {
        stoppedRef.current = true;
        stopPolling();
      }
    } catch (error) {
      // Keep polling on transient network errors — reel state is persisted server-side
      Logger.error("Generation status poll failed:", error);
    }
  }, [reelId, stopPolling]);

  useEffect(() => {
    if (!reelId) {
      showBanner(t("error"), t("failedToGetGenerationStatus"), "error", 2500);
      router.back();
      return;
    }

    stoppedRef.current = false;
    void pollOnce();
    pollRef.current = setInterval(() => {
      void pollOnce();
    }, POLL_INTERVAL_MS);

    return () => {
      stoppedRef.current = true;
      stopPolling();
    };
  }, [pollOnce, reelId, router, showBanner, stopPolling, t]);

  const handlePublish = useCallback(async () => {
    if (!reelId || publishing) return;
    setPublishing(true);
    try {
      await publishReel(reelId);
      showBanner(t("success"), t("reelPublished"), "success", 2500);
      if (typeof router.dismiss === "function") {
        try {
          router.dismiss(2);
          return;
        } catch {}
      }
      router.replace("/(main)/dashboard" as any);
    } catch (error: any) {
      Logger.error("Failed to publish generated reel:", error);
      showBanner(
        t("error"),
        error?.message || t("failedToPublishReel"),
        "error",
        3000,
      );
    } finally {
      setPublishing(false);
    }
  }, [publishing, reelId, router, showBanner, t]);

  const handleDiscard = useCallback(async () => {
    if (!reelId || discarding) return;
    setDiscarding(true);
    try {
      await deleteReel(reelId);
      showBanner(t("success"), t("reelDiscarded"), "success", 2000);
      router.back();
    } catch (error: any) {
      Logger.error("Failed to discard reel:", error);
      showBanner(
        t("error"),
        error?.message || t("failedToDiscardReel"),
        "error",
        3000,
      );
    } finally {
      setDiscarding(false);
    }
  }, [discarding, reelId, router, showBanner, t]);

  const handleRetry = useCallback(() => {
    router.back();
  }, [router]);

  const progressPercent = Math.max(
    0,
    Math.min(100, Math.round(progress ?? 0)),
  );

  return (
    <View style={[styles.safeArea, { paddingBottom: insets.bottom }]}>
      <StackHeader title={t("generatingReel")} />
      <View style={styles.body}>
        {status === "pending" || status === "rendering" ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={theme.buttonBack} />
            <Text style={styles.statusTitle}>
              {status === "pending"
                ? t("preparingYourReel")
                : t("renderingYourReel")}
            </Text>
            <Text style={styles.statusSubtitle}>
              {t("generationInProgressHint")}
            </Text>
            {status === "rendering" ? (
              <>
                <View style={styles.progressTrack}>
                  <View
                    style={[
                      styles.progressFill,
                      { width: `${progressPercent}%` },
                    ]}
                  />
                </View>
                <Text style={styles.progressLabel}>{progressPercent}%</Text>
              </>
            ) : null}
          </View>
        ) : null}

        {status === "failed" ? (
          <View style={styles.center}>
            <View style={styles.errorIcon}>
              <MaterialIcons
                name="error-outline"
                size={moderateWidthScale(32)}
                color={theme.selectCard}
              />
            </View>
            <Text style={styles.statusTitle}>{t("generationFailed")}</Text>
            <Text style={styles.statusSubtitle}>
              {errorMessage || t("generationFailedHint")}
            </Text>
            <View style={[styles.actions, { width: "100%", marginTop: moderateHeightScale(20) }]}>
              <Button title={t("tryAgain")} onPress={handleRetry} />
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={handleDiscard}
                disabled={discarding}
                activeOpacity={0.85}
              >
                <Text style={styles.secondaryButtonText}>
                  {discarding ? t("pleaseWait") : t("discard")}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}

        {status === "ready" && videoUrl ? (
          <>
            <ReadyPreview uri={videoUrl} />
            <Text style={styles.statusTitle}>{t("reelReady")}</Text>
            <Text style={[styles.statusSubtitle, { marginBottom: moderateHeightScale(12) }]}>
              {t("reelReadyHint")}
            </Text>
            <View style={styles.actions}>
              <Button
                title={t("publish")}
                onPress={handlePublish}
                loading={publishing}
                disabled={publishing || discarding}
              />
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={handleDiscard}
                disabled={discarding || publishing}
                activeOpacity={0.85}
              >
                <Text style={styles.secondaryButtonText}>
                  {discarding ? t("pleaseWait") : t("discard")}
                </Text>
              </TouchableOpacity>
            </View>
          </>
        ) : null}
      </View>
    </View>
  );
}
