import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import Slider from "@react-native-community/slider";
import {
  MediaPreview as MediaPreviewNative,
  addProgressListener,
  createProject,
  exportProject,
  getVideoInfo,
  makeClipId,
  type Project,
} from "expo-media-edit";

const MediaPreview = MediaPreviewNative as React.ComponentType<{
  project: Project;
  time?: number;
  playing?: boolean;
  renderScale?: number;
  onTime?: (event: { nativeEvent: { ms: number } }) => void;
  onReady?: (event: { nativeEvent: { durationMs: number } }) => void;
  style?: object;
}>;
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  heightScale,
  moderateHeightScale,
  moderateWidthScale,
  widthScale,
} from "@/src/theme/dimensions";
import { useNotificationContext } from "@/src/contexts/NotificationContext";
import Logger from "@/src/services/logger";
import { uploadVideo } from "@/src/services/mediaLibraryService";
import type { MediaUploadSourceType } from "@/src/types/media";

type AspectPreset = "portrait" | "square" | "landscape";
type EditorTool = "trim" | "crop" | "music" | "text" | null;

const ASPECT_SIZES: Record<AspectPreset, { width: number; height: number }> = {
  portrait: { width: 1080, height: 1920 },
  square: { width: 1080, height: 1080 },
  landscape: { width: 1920, height: 1080 },
};

function formatMs(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: theme.black,
    },
    center: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      padding: moderateWidthScale(24),
      backgroundColor: theme.black,
    },
    centerLabel: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontMedium,
      color: theme.white,
      textAlign: "center",
      marginBottom: moderateHeightScale(16),
    },
    topBar: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      zIndex: 20,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: moderateWidthScale(12),
      paddingBottom: moderateHeightScale(10),
    },
    topBtn: {
      width: widthScale(40),
      height: heightScale(40),
      borderRadius: moderateWidthScale(20),
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.borderDark,
    },
    nextBtn: {
      paddingHorizontal: moderateWidthScale(16),
      paddingVertical: moderateHeightScale(8),
      borderRadius: moderateWidthScale(20),
      backgroundColor: theme.buttonBack,
      minWidth: widthScale(72),
      alignItems: "center",
    },
    nextText: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontBold,
      color: theme.buttonText,
    },
    previewArea: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    preview: {
      width: "100%",
      height: "100%",
      backgroundColor: theme.black,
    },
    playOverlay: {
      ...StyleSheet.absoluteFillObject,
      alignItems: "center",
      justifyContent: "center",
    },
    playCircle: {
      width: widthScale(64),
      height: heightScale(64),
      borderRadius: moderateWidthScale(32),
      backgroundColor: theme.borderDark,
      alignItems: "center",
      justifyContent: "center",
    },
    timeBadge: {
      position: "absolute",
      bottom: moderateHeightScale(12),
      alignSelf: "center",
      paddingHorizontal: moderateWidthScale(10),
      paddingVertical: moderateHeightScale(4),
      borderRadius: moderateWidthScale(12),
      backgroundColor: theme.borderDark,
    },
    timeText: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontMedium,
      color: theme.white,
    },
    bottomDock: {
      backgroundColor: theme.black,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.white15,
      paddingTop: moderateHeightScale(8),
    },
    toolRow: {
      flexDirection: "row",
      justifyContent: "space-around",
      alignItems: "center",
      paddingHorizontal: moderateWidthScale(8),
      paddingBottom: moderateHeightScale(6),
    },
    toolBtn: {
      alignItems: "center",
      justifyContent: "center",
      minWidth: widthScale(64),
      paddingVertical: moderateHeightScale(6),
      gap: moderateHeightScale(4),
    },
    toolLabel: {
      fontSize: fontSize.size11,
      fontFamily: fonts.fontMedium,
      color: theme.white,
      opacity: 0.7,
    },
    toolLabelActive: {
      opacity: 1,
      color: theme.selectCard,
      fontFamily: fonts.fontBold,
    },
    panel: {
      paddingHorizontal: moderateWidthScale(16),
      paddingTop: moderateHeightScale(8),
      paddingBottom: moderateHeightScale(12),
      minHeight: heightScale(140),
    },
    panelTitle: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontBold,
      color: theme.white,
      marginBottom: moderateHeightScale(8),
    },
    panelHint: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.white,
      opacity: 0.65,
      marginBottom: moderateHeightScale(8),
    },
    label: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontMedium,
      color: theme.white,
      opacity: 0.85,
      marginBottom: moderateHeightScale(4),
    },
    chipRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: moderateWidthScale(8),
    },
    chip: {
      paddingHorizontal: moderateWidthScale(14),
      paddingVertical: moderateHeightScale(8),
      borderRadius: moderateWidthScale(18),
      borderWidth: 1,
      borderColor: theme.white15,
    },
    chipActive: {
      backgroundColor: theme.buttonBack,
      borderColor: theme.buttonBack,
    },
    chipText: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontMedium,
      color: theme.white,
    },
    chipTextActive: {
      color: theme.buttonText,
    },
    musicRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(10),
      marginBottom: moderateHeightScale(10),
    },
    musicBtn: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: moderateWidthScale(8),
      paddingVertical: moderateHeightScale(12),
      borderRadius: moderateWidthScale(12),
      backgroundColor: theme.buttonBack,
    },
    musicBtnText: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontBold,
      color: theme.buttonText,
    },
    musicName: {
      flex: 1,
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.white,
      opacity: 0.75,
      marginBottom: moderateHeightScale(8),
    },
    rowBetween: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginTop: moderateHeightScale(8),
    },
    input: {
      borderWidth: 1,
      borderColor: theme.white15,
      borderRadius: moderateWidthScale(12),
      paddingHorizontal: moderateWidthScale(12),
      paddingVertical: moderateHeightScale(10),
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.white,
      backgroundColor: theme.borderDark,
    },
    busyOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: theme.borderDark,
      alignItems: "center",
      justifyContent: "center",
      zIndex: 30,
    },
    progressText: {
      marginTop: moderateHeightScale(12),
      fontSize: fontSize.size13,
      fontFamily: fonts.fontMedium,
      color: theme.white,
    },
    ghostBtn: {
      marginTop: moderateHeightScale(8),
      alignItems: "center",
      paddingVertical: moderateHeightScale(6),
    },
    ghostText: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontMedium,
      color: theme.white,
      opacity: 0.55,
      textDecorationLine: "underline",
    },
  });

export default function EditVideoScreen() {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { showBanner } = useNotificationContext();

  const params = useLocalSearchParams<{
    uri?: string;
    mimeType?: string;
    fileName?: string;
    sourceType?: string;
  }>();

  const sourceUri = params.uri ? decodeURIComponent(params.uri) : "";
  const sourceType = (
    params.sourceType === "camera" ? "camera" : "device"
  ) as MediaUploadSourceType;

  const [loadingInfo, setLoadingInfo] = useState(true);
  const [durationMs, setDurationMs] = useState(5000);
  const [trimStartMs, setTrimStartMs] = useState(0);
  const [trimEndMs, setTrimEndMs] = useState(5000);
  const [aspect, setAspect] = useState<AspectPreset>("portrait");
  const [muteOriginal, setMuteOriginal] = useState(false);
  const [musicUri, setMusicUri] = useState<string | null>(null);
  const [musicName, setMusicName] = useState<string | null>(null);
  const [musicVolume, setMusicVolume] = useState(0.8);
  const [overlayText, setOverlayText] = useState("");
  const [playing, setPlaying] = useState(true);
  const [previewTimeMs, setPreviewTimeMs] = useState(0);
  const [activeTool, setActiveTool] = useState<EditorTool>(null);
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!sourceUri) {
        setLoadingInfo(false);
        return;
      }
      try {
        const info = await getVideoInfo(sourceUri);
        if (cancelled) return;
        const dur = Math.max(500, info.durationMs || 5000);
        setDurationMs(dur);
        setTrimStartMs(0);
        setTrimEndMs(dur);
        if (info.width > info.height) setAspect("landscape");
        else if (Math.abs(info.width - info.height) < 40) setAspect("square");
        else setAspect("portrait");
      } catch (error) {
        Logger.error("getVideoInfo failed:", error);
        showBanner(t("error"), t("failedToLoadVideoForEdit"), "error", 3000);
      } finally {
        if (!cancelled) setLoadingInfo(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [showBanner, sourceUri, t]);

  const project: Project | null = useMemo(() => {
    if (!sourceUri || trimEndMs <= trimStartMs) return null;
    const clipDuration = trimEndMs - trimStartMs;
    const canvas = ASPECT_SIZES[aspect];
    const tracks: Project["tracks"] = [
      {
        kind: "video",
        id: "v",
        clips: [
          {
            id: makeClipId("c"),
            sourceUri,
            sourceRange: { startMs: trimStartMs, endMs: trimEndMs },
            timelineRange: { startMs: 0, endMs: clipDuration },
            originalVolume: muteOriginal ? 0 : 1,
          },
        ],
      },
    ];

    if (musicUri) {
      tracks.push({
        kind: "audio",
        id: "a",
        clips: [
          {
            id: makeClipId("m"),
            sourceUri: musicUri,
            sourceRange: { startMs: 0, endMs: clipDuration },
            timelineRange: { startMs: 0, endMs: clipDuration },
            volume: musicVolume,
            trimToVideo: true,
          },
        ],
      });
    }

    if (overlayText.trim()) {
      tracks.push({
        kind: "overlay",
        id: "o",
        items: [
          {
            id: makeClipId("t"),
            kind: "text",
            content: overlayText.trim(),
            x: 0.5,
            y: 0.88,
            anchor: "center",
            textAlign: "center",
            paddingX: 16,
            paddingY: 8,
            fontSize: 42,
            color: theme.white,
            fontWeight: "bold",
            shadowColor: theme.black,
            shadowRadius: 4,
            shadowOpacity: 0.6,
          },
        ],
      });
    }

    return createProject({
      canvasSize: canvas,
      tracks,
    });
  }, [
    aspect,
    musicUri,
    musicVolume,
    muteOriginal,
    overlayText,
    sourceUri,
    theme.black,
    theme.white,
    trimEndMs,
    trimStartMs,
  ]);

  const pickMusic = useCallback(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["audio/*"],
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];
      setMusicUri(asset.uri);
      setMusicName(asset.name || t("backgroundMusic"));
    } catch (error) {
      Logger.error("Music pick failed:", error);
      showBanner(t("error"), t("failedToSelectMusic"), "error", 2500);
    }
  }, [showBanner, t]);

  const handleExportAndUpload = useCallback(async () => {
    if (!project || exporting || uploading) return;
    setPlaying(false);
    setExporting(true);
    setExportProgress(0);
    const sub = addProgressListener(({ progress }) => {
      setExportProgress(Math.round((progress || 0) * 100));
    });
    try {
      const outputUri = await exportProject(project, undefined, {
        quality: "high",
      });
      sub.remove();
      setExporting(false);
      setUploading(true);
      setUploadProgress(0);
      await uploadVideo(
        {
          uri: outputUri,
          mimeType: "video/mp4",
          fileName: params.fileName || "edited-video.mp4",
          sourceType,
        },
        setUploadProgress,
      );
      showBanner(t("success"), t("videoUploaded"), "success", 2500);
      router.replace("/(main)/aiTools/toolList" as any);
    } catch (error: any) {
      Logger.error("Export/upload failed:", error);
      showBanner(
        t("error"),
        error?.message || t("failedToExportVideo"),
        "error",
        3500,
      );
    } finally {
      try {
        sub.remove();
      } catch {}
      setExporting(false);
      setUploading(false);
      setExportProgress(0);
      setUploadProgress(0);
    }
  }, [
    exporting,
    params.fileName,
    project,
    router,
    showBanner,
    sourceType,
    t,
    uploading,
  ]);

  const handleUploadOriginal = useCallback(async () => {
    if (exporting || uploading || !sourceUri) return;
    setPlaying(false);
    setUploading(true);
    setUploadProgress(0);
    try {
      await uploadVideo(
        {
          uri: sourceUri,
          mimeType: params.mimeType || "video/mp4",
          fileName: params.fileName || "video.mp4",
          sourceType,
        },
        setUploadProgress,
      );
      showBanner(t("success"), t("videoUploaded"), "success", 2500);
      router.replace("/(main)/aiTools/toolList" as any);
    } catch (error: any) {
      showBanner(
        t("error"),
        error?.message || t("failedToUploadVideo"),
        "error",
        3000,
      );
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  }, [
    exporting,
    params.fileName,
    params.mimeType,
    router,
    showBanner,
    sourceType,
    sourceUri,
    t,
    uploading,
  ]);

  const toggleTool = useCallback((tool: EditorTool) => {
    setActiveTool((prev) => (prev === tool ? null : tool));
  }, []);

  const busy = exporting || uploading;
  const tools: {
    key: Exclude<EditorTool, null>;
    icon: keyof typeof MaterialIcons.glyphMap;
    label: string;
  }[] = [
    { key: "trim", icon: "content-cut", label: t("trimVideo") },
    { key: "crop", icon: "crop", label: t("aspectRatio") },
    { key: "music", icon: "music-note", label: t("backgroundMusic") },
    { key: "text", icon: "text-fields", label: t("overlayText") },
  ];

  if (!sourceUri) {
    return (
      <View style={styles.center}>
        <Text style={styles.centerLabel}>{t("noVideoToEdit")}</Text>
        <TouchableOpacity style={styles.nextBtn} onPress={() => router.back()}>
          <Text style={styles.nextText}>{t("goBack")}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (loadingInfo) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={theme.white} />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View
          style={[
            styles.topBar,
            { paddingTop: insets.top + moderateHeightScale(4) },
          ]}
        >
          <TouchableOpacity
            style={styles.topBtn}
            onPress={() => router.back()}
            disabled={busy}
            hitSlop={8}
          >
            <MaterialIcons
              name="close"
              size={moderateWidthScale(22)}
              color={theme.white}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.nextBtn}
            onPress={handleExportAndUpload}
            disabled={busy || !project}
            activeOpacity={0.85}
          >
            <Text style={styles.nextText}>{t("exportAndUpload")}</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.previewArea}
          activeOpacity={1}
          onPress={() => !busy && setPlaying((p) => !p)}
        >
          {project ? (
            <MediaPreview
              project={project}
              time={previewTimeMs}
              playing={playing}
              onTime={({ nativeEvent }) =>
                setPreviewTimeMs(nativeEvent.ms ?? 0)
              }
              style={styles.preview}
            />
          ) : (
            <View style={[styles.preview, styles.center]}>
              <ActivityIndicator color={theme.white} />
            </View>
          )}

          {!playing && !busy ? (
            <View style={styles.playOverlay} pointerEvents="none">
              <View style={styles.playCircle}>
                <MaterialIcons
                  name="play-arrow"
                  size={moderateWidthScale(36)}
                  color={theme.white}
                />
              </View>
            </View>
          ) : null}

          <View style={styles.timeBadge} pointerEvents="none">
            <Text style={styles.timeText}>
              {formatMs(previewTimeMs)} / {formatMs(trimEndMs - trimStartMs)}
            </Text>
          </View>
        </TouchableOpacity>

        <View
          style={[
            styles.bottomDock,
            { paddingBottom: Math.max(insets.bottom, moderateHeightScale(8)) },
          ]}
        >
          {activeTool ? (
            <View style={styles.panel}>
              {activeTool === "trim" ? (
                <>
                  <Text style={styles.panelTitle}>{t("trimVideo")}</Text>
                  <Text style={styles.panelHint}>
                    {t("trimRangeHint", {
                      start: formatMs(trimStartMs),
                      end: formatMs(trimEndMs),
                    })}
                  </Text>
                  <Text style={styles.label}>{t("trimStart")}</Text>
                  <Slider
                    minimumValue={0}
                    maximumValue={Math.max(0, trimEndMs - 500)}
                    value={trimStartMs}
                    onValueChange={(v) => {
                      setTrimStartMs(v);
                      setPreviewTimeMs(0);
                      setPlaying(false);
                    }}
                    minimumTrackTintColor={theme.selectCard}
                    maximumTrackTintColor={theme.white15}
                    thumbTintColor={theme.selectCard}
                    disabled={busy}
                  />
                  <Text style={styles.label}>{t("trimEnd")}</Text>
                  <Slider
                    minimumValue={Math.min(durationMs, trimStartMs + 500)}
                    maximumValue={durationMs}
                    value={trimEndMs}
                    onValueChange={(v) => {
                      setTrimEndMs(v);
                      setPreviewTimeMs(0);
                      setPlaying(false);
                    }}
                    minimumTrackTintColor={theme.selectCard}
                    maximumTrackTintColor={theme.white15}
                    thumbTintColor={theme.selectCard}
                    disabled={busy}
                  />
                </>
              ) : null}

              {activeTool === "crop" ? (
                <>
                  <Text style={styles.panelTitle}>{t("aspectRatio")}</Text>
                  <Text style={styles.panelHint}>{t("aspectRatioHint")}</Text>
                  <View style={styles.chipRow}>
                    {(
                      [
                        ["portrait", "aspectPortrait"],
                        ["square", "aspectSquare"],
                        ["landscape", "aspectLandscape"],
                      ] as const
                    ).map(([key, labelKey]) => (
                      <TouchableOpacity
                        key={key}
                        style={[
                          styles.chip,
                          aspect === key && styles.chipActive,
                        ]}
                        onPress={() => setAspect(key)}
                        disabled={busy}
                      >
                        <Text
                          style={[
                            styles.chipText,
                            aspect === key && styles.chipTextActive,
                          ]}
                        >
                          {t(labelKey)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              ) : null}

              {activeTool === "music" ? (
                <>
                  <Text style={styles.panelTitle}>{t("backgroundMusic")}</Text>
                  <View style={styles.musicRow}>
                    <TouchableOpacity
                      style={styles.musicBtn}
                      onPress={pickMusic}
                      disabled={busy}
                      activeOpacity={0.85}
                    >
                      <MaterialIcons
                        name="library-music"
                        size={moderateWidthScale(18)}
                        color={theme.buttonText}
                      />
                      <Text style={styles.musicBtnText}>
                        {musicUri ? t("changeMusic") : t("selectMusic")}
                      </Text>
                    </TouchableOpacity>
                    {musicUri ? (
                      <TouchableOpacity
                        onPress={() => {
                          setMusicUri(null);
                          setMusicName(null);
                        }}
                        disabled={busy}
                        hitSlop={8}
                      >
                        <MaterialIcons
                          name="close"
                          size={moderateWidthScale(24)}
                          color={theme.white}
                        />
                      </TouchableOpacity>
                    ) : null}
                  </View>
                  {musicName ? (
                    <Text style={styles.musicName} numberOfLines={1}>
                      {musicName}
                    </Text>
                  ) : null}
                  {musicUri ? (
                    <>
                      <Text style={styles.label}>
                        {t("musicVolume")}: {Math.round(musicVolume * 100)}%
                      </Text>
                      <Slider
                        minimumValue={0}
                        maximumValue={1}
                        value={musicVolume}
                        onValueChange={setMusicVolume}
                        minimumTrackTintColor={theme.selectCard}
                        maximumTrackTintColor={theme.white15}
                        thumbTintColor={theme.selectCard}
                        disabled={busy}
                      />
                    </>
                  ) : null}
                  <View style={styles.rowBetween}>
                    <Text style={styles.label}>{t("muteOriginalAudio")}</Text>
                    <Switch
                      value={muteOriginal}
                      onValueChange={setMuteOriginal}
                      disabled={busy}
                      trackColor={{
                        false: theme.white15,
                        true: theme.orangeBrown,
                      }}
                      thumbColor={theme.white}
                    />
                  </View>
                </>
              ) : null}

              {activeTool === "text" ? (
                <>
                  <Text style={styles.panelTitle}>{t("overlayText")}</Text>
                  <TextInput
                    style={styles.input}
                    value={overlayText}
                    onChangeText={setOverlayText}
                    placeholder={t("overlayTextPlaceholder")}
                    placeholderTextColor={theme.white15}
                    editable={!busy}
                    maxLength={80}
                  />
                </>
              ) : null}

              <TouchableOpacity
                style={styles.ghostBtn}
                onPress={handleUploadOriginal}
                disabled={busy}
              >
                <Text style={styles.ghostText}>{t("uploadOriginal")}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.ghostBtn}
              onPress={handleUploadOriginal}
              disabled={busy}
            >
              <Text style={styles.ghostText}>{t("uploadOriginal")}</Text>
            </TouchableOpacity>
          )}

          <View style={styles.toolRow}>
            {tools.map((tool) => {
              const active = activeTool === tool.key;
              return (
                <TouchableOpacity
                  key={tool.key}
                  style={styles.toolBtn}
                  onPress={() => toggleTool(tool.key)}
                  disabled={busy}
                  activeOpacity={0.8}
                >
                  <MaterialIcons
                    name={tool.icon}
                    size={moderateWidthScale(24)}
                    color={active ? theme.selectCard : theme.white}
                  />
                  <Text
                    style={[
                      styles.toolLabel,
                      active && styles.toolLabelActive,
                    ]}
                  >
                    {tool.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </KeyboardAvoidingView>

      {busy ? (
        <View style={styles.busyOverlay}>
          <ActivityIndicator size="large" color={theme.white} />
          <Text style={styles.progressText}>
            {exporting
              ? `${t("exportingVideo")} ${exportProgress}%`
              : `${t("uploadingVideo")} ${uploadProgress}%`}
          </Text>
        </View>
      ) : null}
    </View>
  );
}
