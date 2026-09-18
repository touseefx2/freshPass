import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  Platform,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  type LayoutChangeEvent,
} from "react-native";
import type { TextInput as TextInputType } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { CloseIcon } from "@/assets/icons";
import * as DocumentPicker from "expo-document-picker";
import Slider from "@react-native-community/slider";
import { Audio } from "expo-av";
import { useVideoPlayer, VideoView } from "expo-video";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";
import {
  addProgressListener,
  createProject,
  exportProject,
  getVideoInfo,
  type Project,
} from "expo-media-edit";
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
import {
  getCachedMediaLimits,
  getMediaLimits,
} from "@/src/services/mediaLibraryService";
import type { MediaUploadSourceType } from "@/src/types/media";
import { ensureLocalMediaFileUri } from "@/src/utils/localMediaUri";

type AspectPreset = "original" | "portrait" | "square" | "landscape";
type EditorTool = "trim" | "crop" | "music" | "text" | null;
type OverlaySize = "S" | "M" | "L";
type OverlayColorKey =
  | "white"
  | "selectCard"
  | "orangeBrown"
  | "bookNowButton"
  | "green"
  | "link"
  | "darkGreen"
  | "black";

type EditorSnapshot = {
  trimStartMs: number;
  trimEndMs: number;
  aspect: AspectPreset;
  muteOriginal: boolean;
  musicUri: string | null;
  musicName: string | null;
  musicVolume: number;
  overlayText: string;
  overlayX: number;
  overlayY: number;
  overlayColorKey: OverlayColorKey;
  overlayBgColorKey: OverlayColorKey | null;
  overlaySize: OverlaySize;
  overlayBold: boolean;
  overlayItalic: boolean;
  overlayMono: boolean;
};

type TextColorTarget = "text" | "bg";

const OVERLAY_COLOR_KEYS: OverlayColorKey[] = [
  "white",
  "selectCard",
  "orangeBrown",
  "bookNowButton",
  "green",
  "link",
  "darkGreen",
  "black",
];

const OVERLAY_EXPORT_FONT: Record<OverlaySize, number> = {
  S: 28,
  M: 42,
  L: 64,
};

const OVERLAY_PREVIEW_FONT: Record<OverlaySize, number> = {
  S: 16,
  M: 22,
  L: 30,
};

const ASPECT_SIZES: Record<
  Exclude<AspectPreset, "original">,
  { width: number; height: number }
> = {
  portrait: { width: 1080, height: 1920 },
  square: { width: 1080, height: 1080 },
  landscape: { width: 1920, height: 1080 },
};

const ASPECT_RATIO: Record<Exclude<AspectPreset, "original">, number> = {
  portrait: 9 / 16,
  square: 1,
  landscape: 16 / 9,
};

function getAspectRatio(
  aspect: AspectPreset,
  videoWidth: number,
  videoHeight: number,
): number {
  if (aspect === "original") {
    if (videoWidth > 0 && videoHeight > 0) return videoWidth / videoHeight;
    return 9 / 16;
  }
  return ASPECT_RATIO[aspect];
}

function getCanvasSize(
  aspect: AspectPreset,
  videoWidth: number,
  videoHeight: number,
): { width: number; height: number } {
  const even = (n: number) => Math.max(2, Math.round(n / 2) * 2);
  if (aspect !== "original") {
    const size = ASPECT_SIZES[aspect];
    return { width: even(size.width), height: even(size.height) };
  }
  const w = Math.max(2, Math.round(videoWidth) || 1080);
  const h = Math.max(2, Math.round(videoHeight) || 1920);
  const maxSide = 1080;
  if (w >= h) {
    return {
      width: maxSide,
      height: even((maxSide * h) / w),
    };
  }
  return {
    width: even((maxSide * w) / h),
    height: maxSide,
  };
}

const STABLE_CLIP_IDS = {
  video: "clip-video",
  music: "clip-music",
  text: "clip-text",
} as const;

const OVERLAY_POS_MIN = 0.16;
const OVERLAY_POS_MAX = 0.88;

function clampOverlayPos(n: number): number {
  return Math.min(OVERLAY_POS_MAX, Math.max(OVERLAY_POS_MIN, n));
}

/** Native iOS export only accepts clean #RRGGBB — invalid colors can crash. */
function toExportHexColor(input: string | undefined | null): string {
  const raw = String(input || "").trim();
  if (/^#[0-9a-fA-F]{6}$/.test(raw)) return raw.toUpperCase();
  if (/^#[0-9a-fA-F]{3}$/.test(raw)) {
    const r = raw[1];
    const g = raw[2];
    const b = raw[3];
    return `#${r}${r}${g}${g}${b}${b}`.toUpperCase();
  }
  if (/^#[0-9a-fA-F]{8}$/.test(raw)) {
    return `#${raw.slice(1, 7)}`.toUpperCase();
  }
  const rgba = raw.match(
    /rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/i,
  );
  if (rgba) {
    const clampByte = (n: number) =>
      Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");
    return `#${clampByte(+rgba[1])}${clampByte(+rgba[2])}${clampByte(+rgba[3])}`.toUpperCase();
  }
  return "#FFFFFF";
}

function sanitizeOverlayText(text: string): string {
  return text
    .replace(/[\u2018\u2019\u2032]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/\u2026/g, "...")
    .replace(/\u00A0/g, " ")
    .trim();
}

function formatMs(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function fitFrame(
  containerW: number,
  containerH: number,
  ratio: number,
): { width: number; height: number } {
  if (containerW <= 0 || containerH <= 0) {
    return { width: 0, height: 0 };
  }
  const containerRatio = containerW / containerH;
  if (containerRatio > ratio) {
    const height = containerH;
    return { width: height * ratio, height };
  }
  const width = containerW;
  return { width, height: width / ratio };
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: theme.black },
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
    topLeftRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(8),
    },
    topBtn: {
      width: widthScale(40),
      height: heightScale(40),
      borderRadius: moderateWidthScale(20),
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.borderDark,
    },
    topBtnDisabled: { opacity: 0.35 },
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
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: theme.black,
      alignItems: "center",
      justifyContent: "center",
      zIndex: 1,
    },
    cropFrame: {
      overflow: "hidden",
      backgroundColor: theme.black,
      alignItems: "center",
      justifyContent: "center",
    },
    video: {
      width: "100%",
      height: "100%",
    },
    playOverlay: {
      ...StyleSheet.absoluteFillObject,
      alignItems: "center",
      justifyContent: "center",
      zIndex: 2,
    },
    keyboardDismissOverlay: {
      ...StyleSheet.absoluteFillObject,
      zIndex: 5,
    },
    playCircle: {
      width: widthScale(68),
      height: heightScale(68),
      borderRadius: moderateWidthScale(34),
      backgroundColor: theme.borderDark,
      alignItems: "center",
      justifyContent: "center",
    },
    textOverlay: {
      position: "absolute",
      maxWidth: "90%",
      paddingHorizontal: moderateWidthScale(12),
      paddingVertical: moderateHeightScale(8),
      zIndex: 10,
    },
    textLayer: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      zIndex: 25,
    },
    textOverlayBg: {
      borderRadius: moderateWidthScale(10),
      paddingHorizontal: moderateWidthScale(12),
      paddingVertical: moderateHeightScale(8),
    },
    textOverlayLabel: {
      textAlign: "center",
      textShadowColor: theme.black,
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 4,
    },
    textOverlayActive: {
      borderWidth: 1,
      borderColor: theme.selectCard,
      borderStyle: "dashed",
      borderRadius: moderateWidthScale(10),
    },
    textHitExpand: {
      minWidth: widthScale(100),
      minHeight: heightScale(52),
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: moderateWidthScale(16),
      paddingVertical: moderateHeightScale(10),
    },
    colorDot: {
      width: widthScale(28),
      height: heightScale(28),
      borderRadius: moderateWidthScale(14),
      borderWidth: 2,
      borderColor: theme.white15,
    },
    colorDotActive: {
      borderColor: theme.selectCard,
      borderWidth: 2.5,
    },
    colorDotNone: {
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.black,
      overflow: "hidden",
    },
    colorDotNoneSlash: {
      position: "absolute",
      width: "120%",
      height: StyleSheet.hairlineWidth,
      backgroundColor: theme.red,
      transform: [{ rotate: "-45deg" }],
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
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 20,
      backgroundColor: theme.borderDark,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.white15,
      paddingTop: moderateHeightScale(4),
    },
    bottomDockKeyboard: {
      backgroundColor: theme.black,
      borderTopWidth: 0,
      paddingTop: moderateHeightScale(2),
    },
    toolRow: {
      flexDirection: "row",
      justifyContent: "space-around",
      alignItems: "center",
      paddingHorizontal: moderateWidthScale(8),
      paddingBottom: moderateHeightScale(4),
    },
    toolBtn: {
      alignItems: "center",
      justifyContent: "center",
      minWidth: widthScale(64),
      paddingVertical: moderateHeightScale(4),
      gap: moderateHeightScale(2),
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
      paddingHorizontal: moderateWidthScale(12),
      paddingTop: moderateHeightScale(6),
      paddingBottom: moderateHeightScale(6),
    },
    panelCompact: {
      paddingBottom: moderateHeightScale(4),
    },
    panelTitle: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontBold,
      color: theme.white,
      marginBottom: moderateHeightScale(4),
    },
    panelHint: {
      fontSize: fontSize.size11,
      fontFamily: fonts.fontRegular,
      color: theme.white,
      opacity: 0.55,
      marginBottom: moderateHeightScale(2),
    },
    label: {
      fontSize: fontSize.size11,
      fontFamily: fonts.fontMedium,
      color: theme.white,
      opacity: 0.85,
      marginBottom: moderateHeightScale(2),
    },
    chipRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      alignItems: "center",
      gap: moderateWidthScale(6),
    },
    chip: {
      paddingHorizontal: moderateWidthScale(12),
      paddingVertical: moderateHeightScale(5),
      borderRadius: moderateWidthScale(14),
      borderWidth: 1,
      borderColor: theme.white15,
    },
    chipActive: {
      backgroundColor: theme.buttonBack,
      borderColor: theme.buttonBack,
    },
    chipText: {
      fontSize: fontSize.size11,
      fontFamily: fonts.fontMedium,
      color: theme.white,
    },
    chipTextActive: { color: theme.buttonText },
    textStudio: {
      gap: moderateHeightScale(8),
    },
    textColorBar: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(10),
    },
    textModeSeg: {
      flexDirection: "row",
      backgroundColor: theme.black,
      borderRadius: moderateWidthScale(10),
      padding: moderateWidthScale(2),
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.white15,
    },
    textModeBtn: {
      width: widthScale(34),
      height: heightScale(28),
      borderRadius: moderateWidthScale(8),
      alignItems: "center",
      justifyContent: "center",
    },
    textModeBtnActive: {
      backgroundColor: theme.buttonBack,
    },
    textColorTrack: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: moderateWidthScale(8),
      flexWrap: "nowrap",
    },
    textStyleBar: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: moderateWidthScale(10),
    },
    textSizeSeg: {
      flexDirection: "row",
      backgroundColor: theme.black,
      borderRadius: moderateWidthScale(10),
      padding: moderateWidthScale(2),
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.white15,
    },
    textSizeBtn: {
      width: widthScale(34),
      height: heightScale(28),
      borderRadius: moderateWidthScale(8),
      alignItems: "center",
      justifyContent: "center",
    },
    textSizeBtnActive: {
      backgroundColor: theme.buttonBack,
    },
    textSizeLabel: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontBold,
      color: theme.white,
      opacity: 0.7,
    },
    textSizeLabelActive: {
      opacity: 1,
      color: theme.buttonText,
    },
    textFormatRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(6),
    },
    textFormatBtn: {
      width: widthScale(36),
      height: heightScale(32),
      borderRadius: moderateWidthScale(8),
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.black,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.white15,
    },
    textFormatBtnActive: {
      backgroundColor: theme.buttonBack,
      borderColor: theme.buttonBack,
    },
    textInputTight: {
      marginTop: 0,
      marginBottom: 0,
      paddingVertical: moderateHeightScale(8),
      paddingLeft: moderateWidthScale(12),
      paddingRight: moderateWidthScale(36),
      borderRadius: moderateWidthScale(10),
      fontSize: fontSize.size14,
      borderColor: theme.white15,
      backgroundColor: theme.black,
    },
    textInputWrap: {
      position: "relative",
      justifyContent: "center",
    },
    textInputClear: {
      position: "absolute",
      right: moderateWidthScale(10),
      top: 0,
      bottom: 0,
      justifyContent: "center",
      alignItems: "center",
      zIndex: 2,
    },
    colorDotTight: {
      width: widthScale(18),
      height: heightScale(18),
      borderRadius: moderateWidthScale(9),
      borderWidth: 1.5,
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
    maxSeconds?: string;
  }>();

  const paramUri = params.uri ? decodeURIComponent(params.uri) : "";
  const sourceType = (
    params.sourceType === "camera" ? "camera" : "device"
  ) as MediaUploadSourceType;
  const paramMaxSeconds = Number(params.maxSeconds);
  const initialMaxSeconds =
    Number.isFinite(paramMaxSeconds) && paramMaxSeconds > 0
      ? paramMaxSeconds
      : getCachedMediaLimits()?.max_seconds ?? 15;

  const [sourceUri, setSourceUri] = useState("");
  const [loadingInfo, setLoadingInfo] = useState(true);
  const [maxSeconds, setMaxSeconds] = useState(initialMaxSeconds);
  const [durationMs, setDurationMs] = useState(5000);
  const [trimStartMs, setTrimStartMs] = useState(0);
  const [trimEndMs, setTrimEndMs] = useState(5000);
  const [aspect, setAspect] = useState<AspectPreset>("original");
  const [videoSize, setVideoSize] = useState({ width: 0, height: 0 });
  const [muteOriginal, setMuteOriginal] = useState(false);
  const [musicUri, setMusicUri] = useState<string | null>(null);
  const [musicName, setMusicName] = useState<string | null>(null);
  const [musicVolume, setMusicVolume] = useState(0.8);
  const [overlayText, setOverlayText] = useState("");
  const [overlayX, setOverlayX] = useState(0.5);
  const [overlayY, setOverlayY] = useState(0.45);
  const [overlayColorKey, setOverlayColorKey] =
    useState<OverlayColorKey>("white");
  const [overlaySize, setOverlaySize] = useState<OverlaySize>("M");
  const [overlayBold, setOverlayBold] = useState(true);
  const [overlayItalic, setOverlayItalic] = useState(false);
  const [overlayMono, setOverlayMono] = useState(false);
  const [overlayBgColorKey, setOverlayBgColorKey] =
    useState<OverlayColorKey | null>(null);
  const [textColorTarget, setTextColorTarget] =
    useState<TextColorTarget>("text");
  const [draggingText, setDraggingText] = useState(false);
  const [textBoxSize, setTextBoxSize] = useState({ width: 120, height: 36 });
  const [playing, setPlaying] = useState(false);
  const [previewReady, setPreviewReady] = useState(false);
  const [previewTimeMs, setPreviewTimeMs] = useState(0);
  const [activeTool, setActiveTool] = useState<EditorTool>(null);
  const [previewSize, setPreviewSize] = useState({ width: 0, height: 0 });
  const [dockHeight, setDockHeight] = useState(0);
  const [history, setHistory] = useState<EditorSnapshot[]>([]);
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const trimHistoryPushedRef = useRef(false);
  const textHistoryPushedRef = useRef(false);
  const textInputRef = useRef<TextInputType>(null);
  const musicSoundRef = useRef<Audio.Sound | null>(null);
  const trimStartRef = useRef(trimStartMs);
  const trimEndRef = useRef(trimEndMs);
  trimStartRef.current = trimStartMs;
  trimEndRef.current = trimEndMs;

  const dismissKeyboard = useCallback(() => {
    Keyboard.dismiss();
    textInputRef.current?.blur();
  }, []);

  useEffect(() => {
    const showEvent =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const onShow = Keyboard.addListener(showEvent, (e) => {
      setKeyboardHeight(e.endCoordinates.height);
    });
    const onHide = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });
    return () => {
      onShow.remove();
      onHide.remove();
    };
  }, []);

  const player = useVideoPlayer(paramUri || "", (p) => {
    p.loop = false;
    p.timeUpdateEventInterval = 0.1;
  });

  const resolveOverlayColor = useCallback(
    (key: OverlayColorKey) => theme[key] as string,
    [theme],
  );

  const currentSnapshot = useCallback(
    (): EditorSnapshot => ({
      trimStartMs,
      trimEndMs,
      aspect,
      muteOriginal,
      musicUri,
      musicName,
      musicVolume,
      overlayText,
      overlayX,
      overlayY,
      overlayColorKey,
      overlayBgColorKey,
      overlaySize,
      overlayBold,
      overlayItalic,
      overlayMono,
    }),
    [
      aspect,
      musicName,
      musicUri,
      musicVolume,
      muteOriginal,
      overlayBgColorKey,
      overlayBold,
      overlayColorKey,
      overlayItalic,
      overlayMono,
      overlaySize,
      overlayText,
      overlayX,
      overlayY,
      trimEndMs,
      trimStartMs,
    ],
  );

  const pushHistory = useCallback(() => {
    const snap = currentSnapshot();
    setHistory((prev) => {
      const last = prev[prev.length - 1];
      if (
        last &&
        last.trimStartMs === snap.trimStartMs &&
        last.trimEndMs === snap.trimEndMs &&
        last.aspect === snap.aspect &&
        last.muteOriginal === snap.muteOriginal &&
        last.musicUri === snap.musicUri &&
        last.musicName === snap.musicName &&
        last.musicVolume === snap.musicVolume &&
        last.overlayText === snap.overlayText &&
        last.overlayX === snap.overlayX &&
        last.overlayY === snap.overlayY &&
        last.overlayColorKey === snap.overlayColorKey &&
        last.overlayBgColorKey === snap.overlayBgColorKey &&
        last.overlaySize === snap.overlaySize &&
        last.overlayBold === snap.overlayBold &&
        last.overlayItalic === snap.overlayItalic &&
        last.overlayMono === snap.overlayMono
      ) {
        return prev;
      }
      return [...prev.slice(-29), snap];
    });
  }, [currentSnapshot]);

  const seekToTrimStart = useCallback(() => {
    try {
      player.currentTime = Math.max(0, trimStartRef.current / 1000);
      setPreviewTimeMs(0);
    } catch {}
  }, [player]);

  const handleUndo = useCallback(() => {
    setHistory((prev) => {
      if (prev.length === 0) return prev;
      const next = [...prev];
      const snap = next.pop()!;
      setTrimStartMs(snap.trimStartMs);
      setTrimEndMs(snap.trimEndMs);
      setAspect(snap.aspect);
      setMuteOriginal(snap.muteOriginal);
      setMusicUri(snap.musicUri);
      setMusicName(snap.musicName);
      setMusicVolume(snap.musicVolume);
      setOverlayText(snap.overlayText);
      setOverlayX(snap.overlayX);
      setOverlayY(snap.overlayY);
      setOverlayColorKey(snap.overlayColorKey);
      setOverlayBgColorKey(snap.overlayBgColorKey);
      setOverlaySize(snap.overlaySize);
      setOverlayBold(snap.overlayBold);
      setOverlayItalic(snap.overlayItalic);
      setOverlayMono(snap.overlayMono);
      return next;
    });
  }, []);

  const maxClipMs = Math.max(500, Math.round(maxSeconds * 1000));

  useEffect(() => {
    let cancelled = false;
    if (
      Number.isFinite(paramMaxSeconds) &&
      paramMaxSeconds > 0
    ) {
      setMaxSeconds(paramMaxSeconds);
      return;
    }
    void getMediaLimits()
      .then((limits) => {
        if (!cancelled) setMaxSeconds(limits.max_seconds);
      })
      .catch((error) => {
        Logger.error("Failed to load media limits for editor:", error);
      });
    return () => {
      cancelled = true;
    };
  }, [paramMaxSeconds]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!paramUri) {
        setLoadingInfo(false);
        return;
      }
      try {
        const localUri = await ensureLocalMediaFileUri(
          paramUri,
          (params.fileName || "video.mp4").split(".").pop() || "mp4",
        );
        if (cancelled) return;
        setSourceUri(localUri);
        await player.replaceAsync(localUri);
        const info = await getVideoInfo(localUri);
        if (cancelled) return;
        const dur = Math.max(500, info.durationMs || 5000);
        const clipCap = Math.max(
          500,
          Math.round(
            (Number.isFinite(paramMaxSeconds) && paramMaxSeconds > 0
              ? paramMaxSeconds
              : getCachedMediaLimits()?.max_seconds ?? 15) * 1000,
          ),
        );
        setDurationMs(dur);
        setTrimStartMs(0);
        setTrimEndMs(Math.min(dur, clipCap));
        setVideoSize({
          width: Math.max(0, info.width || 0),
          height: Math.max(0, info.height || 0),
        });
        setAspect("original");
        setPreviewReady(true);
        setPlaying(true);
      } catch (error) {
        Logger.error("prepare video for edit failed:", error);
        if (!cancelled) {
          setSourceUri(paramUri);
          setPreviewReady(true);
        }
        showBanner(t("error"), t("failedToLoadVideoForEdit"), "error", 3000);
      } finally {
        if (!cancelled) setLoadingInfo(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [paramUri, params.fileName, paramMaxSeconds, player, showBanner, t]);

  useEffect(() => {
    setTrimEndMs((end) => {
      const start = trimStartRef.current;
      if (end - start <= maxClipMs) return end;
      return Math.min(durationMs, start + maxClipMs);
    });
  }, [durationMs, maxClipMs]);

  const onTrimStartChange = useCallback(
    (value: number) => {
      const minStart = Math.max(0, trimEndRef.current - maxClipMs);
      const next = Math.min(
        Math.max(value, minStart),
        Math.max(0, trimEndRef.current - 500),
      );
      setTrimStartMs(next);
    },
    [maxClipMs],
  );

  const onTrimEndChange = useCallback(
    (value: number) => {
      const maxEnd = Math.min(durationMs, trimStartRef.current + maxClipMs);
      const next = Math.max(
        Math.min(value, maxEnd),
        Math.min(durationMs, trimStartRef.current + 500),
      );
      setTrimEndMs(next);
    },
    [durationMs, maxClipMs],
  );

  // Play / pause + mute
  useEffect(() => {
    try {
      player.muted = muteOriginal;
      if (playing) {
        player.play();
      } else {
        player.pause();
      }
    } catch {}
  }, [muteOriginal, player, playing]);

  // Live trim window: loop inside [start, end]
  useEffect(() => {
    const sub = player.addListener("timeUpdate", ({ currentTime }) => {
      const ms = Math.max(0, currentTime * 1000);
      const start = trimStartRef.current;
      const end = trimEndRef.current;
      if (ms < start - 40) {
        try {
          player.currentTime = start / 1000;
        } catch {}
        setPreviewTimeMs(0);
        return;
      }
      if (ms >= end - 40) {
        try {
          player.currentTime = start / 1000;
        } catch {}
        setPreviewTimeMs(0);
        return;
      }
      setPreviewTimeMs(ms - start);
    });
    return () => sub.remove();
  }, [player]);

  // When trim handles change, jump playhead into the new window
  useEffect(() => {
    seekToTrimStart();
  }, [seekToTrimStart, trimStartMs, trimEndMs]);

  // Background music preview (live)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (musicSoundRef.current) {
        try {
          await musicSoundRef.current.unloadAsync();
        } catch {}
        musicSoundRef.current = null;
      }
      if (!musicUri) return;
      try {
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
        });
        const { sound } = await Audio.Sound.createAsync(
          { uri: musicUri },
          {
            shouldPlay: playing,
            isLooping: true,
            volume: musicVolume,
          },
        );
        if (cancelled) {
          await sound.unloadAsync();
          return;
        }
        musicSoundRef.current = sound;
      } catch (error) {
        Logger.error("Music preview failed:", error);
      }
    })();
    return () => {
      cancelled = true;
      if (musicSoundRef.current) {
        void musicSoundRef.current.unloadAsync();
        musicSoundRef.current = null;
      }
    };
  }, [musicUri]);

  useEffect(() => {
    const sound = musicSoundRef.current;
    if (!sound) return;
    void (async () => {
      try {
        await sound.setVolumeAsync(musicVolume);
        if (playing) await sound.playAsync();
        else await sound.pauseAsync();
      } catch {}
    })();
  }, [musicVolume, playing]);

  const project: Project | null = useMemo(() => {
    if (!sourceUri || trimEndMs <= trimStartMs) return null;
    const clipDuration = trimEndMs - trimStartMs;
    const canvas = getCanvasSize(aspect, videoSize.width, videoSize.height);
    const tracks: Project["tracks"] = [
      {
        kind: "video",
        id: "v",
        clips: [
          {
            id: STABLE_CLIP_IDS.video,
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
            id: STABLE_CLIP_IDS.music,
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
      const exportText = sanitizeOverlayText(overlayText);
      if (exportText) {
        const hasBg = !!overlayBgColorKey;
        tracks.push({
          kind: "overlay",
          id: "o",
          items: [
            {
              id: STABLE_CLIP_IDS.text,
              kind: "text",
              content: exportText,
              x: overlayX,
              y: overlayY,
              anchor: "center",
              textAlign: "center",
              paddingX: hasBg ? 18 : 10,
              paddingY: hasBg ? 10 : 6,
              fontSize: OVERLAY_EXPORT_FONT[overlaySize],
              color: toExportHexColor(resolveOverlayColor(overlayColorKey)),
              fontWeight: overlayBold ? "bold" : "normal",
              fontStyle: overlayItalic ? "italic" : "normal",
              fontFamily: overlayMono ? "monospace" : "system",
              ...(hasBg
                ? {
                    backgroundColor: toExportHexColor(
                      resolveOverlayColor(overlayBgColorKey),
                    ),
                    cornerRadius: 12,
                  }
                : {}),
              // Avoid CATextLayer shadow + masksToBounds combo — crashes some iOS builds
            },
          ],
        });
      }
    }

    return createProject({
      id: "freshpass-edit-session",
      canvasSize: canvas,
      // Explicit fps avoids undefined → native 0 timescale black exports.
      fps: 30,
      tracks,
    });
  }, [
    aspect,
    musicUri,
    musicVolume,
    muteOriginal,
    overlayBgColorKey,
    overlayBold,
    overlayColorKey,
    overlayItalic,
    overlayMono,
    overlaySize,
    overlayText,
    overlayX,
    overlayY,
    resolveOverlayColor,
    sourceUri,
    trimEndMs,
    trimStartMs,
    videoSize.height,
    videoSize.width,
  ]);

  const pickMusic = useCallback(async () => {
    try {
      pushHistory();
      const result = await DocumentPicker.getDocumentAsync({
        type: ["audio/*"],
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];
      const localMusic = await ensureLocalMediaFileUri(
        asset.uri,
        (asset.name || "music.mp3").split(".").pop() || "mp3",
      );
      setMusicUri(localMusic);
      setMusicName(asset.name || t("backgroundMusic"));
      setPlaying(true);
    } catch (error) {
      Logger.error("Music pick failed:", error);
      showBanner(t("error"), t("failedToSelectMusic"), "error", 2500);
    }
  }, [pushHistory, showBanner, t]);

  const handleNextToPublish = useCallback(async () => {
    if (!project || exporting || !sourceUri) return;

    const clipSeconds = (trimEndMs - trimStartMs) / 1000;
    if (clipSeconds > maxSeconds + 0.05) {
      Alert.alert(
        t("reelTrimRequiredTitle"),
        t("reelTrimRequiredMessage", {
          max_seconds: maxSeconds,
          clip_seconds: Math.round(clipSeconds),
        }),
      );
      setActiveTool("trim");
      return;
    }

    dismissKeyboard();
    setPlaying(false);
    try {
      player.pause();
    } catch {}
    try {
      // Release the AVPlayer item so export can open the same file safely on iOS
      await player.replaceAsync(null);
    } catch {}
    try {
      await musicSoundRef.current?.pauseAsync();
    } catch {}

    const hasEdits =
      aspect !== "original" ||
      !!musicUri ||
      muteOriginal ||
      !!overlayText.trim() ||
      trimStartMs > 0 ||
      trimEndMs < durationMs;

    let videoUri = sourceUri;
    let fileName = params.fileName || "video.mp4";
    let mimeType = params.mimeType || "video/mp4";

    if (hasEdits) {
      setExporting(true);
      setExportProgress(0);
      // Let AVPlayer fully release the source before AVAssetExportSession opens it
      await new Promise<void>((resolve) => setTimeout(resolve, 700));
      const sub = addProgressListener(({ progress }) => {
        setExportProgress(Math.round((progress || 0) * 100));
      });
      try {
        // high + baked canvasSize (native patch) avoids black / uncropped exports
        videoUri = await exportProject(project, undefined, {
          quality: "high",
        });
        fileName = params.fileName || "edited-video.mp4";
        mimeType = "video/mp4";
      } catch (error: any) {
        Logger.error("Export for publish failed:", error);
        showBanner(
          t("error"),
          error?.message || t("failedToExportVideo"),
          "error",
          3500,
        );
        // Restore preview source after failed export
        try {
          if (sourceUri) await player.replaceAsync(sourceUri);
        } catch {}
        return;
      } finally {
        try {
          sub.remove();
        } catch {}
        setExporting(false);
        setExportProgress(0);
      }
    } else {
      try {
        if (sourceUri) await player.replaceAsync(sourceUri);
      } catch {}
    }

    router.push({
      pathname: "/(main)/publishReel" as any,
      params: {
        videoUri: encodeURIComponent(videoUri),
        mimeType,
        fileName,
        sourceType,
      },
    });
  }, [
    aspect,
    dismissKeyboard,
    durationMs,
    exporting,
    maxSeconds,
    musicUri,
    muteOriginal,
    overlayText,
    params.fileName,
    params.mimeType,
    player,
    project,
    router,
    showBanner,
    sourceType,
    sourceUri,
    t,
    trimEndMs,
    trimStartMs,
  ]);

  const toggleTool = useCallback(
    (tool: EditorTool) => {
      dismissKeyboard();
      setActiveTool((prev) => (prev === tool ? null : tool));
    },
    [dismissKeyboard],
  );

  const onPreviewLayout = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (width > 0 && height > 0) {
      setPreviewSize((prev) =>
        prev.width === Math.round(width) && prev.height === Math.round(height)
          ? prev
          : { width: Math.round(width), height: Math.round(height) },
      );
    }
  }, []);

  const frameSize = useMemo(
    () =>
      fitFrame(
        previewSize.width,
        previewSize.height,
        getAspectRatio(aspect, videoSize.width, videoSize.height),
      ),
    [aspect, previewSize.height, previewSize.width, videoSize.height, videoSize.width],
  );

  const posX = useSharedValue(overlayX);
  const posY = useSharedValue(overlayY);
  const dragOriginX = useSharedValue(overlayX);
  const dragOriginY = useSharedValue(overlayY);
  const frameW = useSharedValue(Math.max(1, frameSize.width));
  const frameH = useSharedValue(Math.max(1, frameSize.height));
  const frameLeft = useSharedValue(0);
  const frameTop = useSharedValue(0);
  const boxW = useSharedValue(Math.max(1, textBoxSize.width));
  const boxH = useSharedValue(Math.max(1, textBoxSize.height));

  useEffect(() => {
    posX.value = overlayX;
    posY.value = overlayY;
  }, [overlayX, overlayY, posX, posY]);

  useEffect(() => {
    frameW.value = Math.max(1, frameSize.width);
    frameH.value = Math.max(1, frameSize.height);
    const left = Math.max(0, (previewSize.width - frameSize.width) / 2);
    const top = Math.max(0, (previewSize.height - frameSize.height) / 2);
    frameLeft.value = left;
    frameTop.value = top;
  }, [
    frameH,
    frameLeft,
    frameSize.height,
    frameSize.width,
    frameTop,
    frameW,
    previewSize.height,
    previewSize.width,
  ]);

  useEffect(() => {
    boxW.value = Math.max(1, textBoxSize.width);
    boxH.value = Math.max(1, textBoxSize.height);
  }, [boxH, boxW, textBoxSize.height, textBoxSize.width]);

  // Keep overlay inside a draggable safe zone when crop ratio changes
  useEffect(() => {
    setOverlayX((x) => clampOverlayPos(x));
    setOverlayY((y) => clampOverlayPos(y));
  }, [aspect]);

  const commitOverlayPos = useCallback((x: number, y: number) => {
    setOverlayX(clampOverlayPos(x));
    setOverlayY(clampOverlayPos(y));
  }, []);

  const beginTextDrag = useCallback(() => {
    dismissKeyboard();
    pushHistory();
    setDraggingText(true);
  }, [dismissKeyboard, pushHistory]);

  const endTextDrag = useCallback(() => {
    setDraggingText(false);
  }, []);

  const textDragGesture = useMemo(
    () =>
      Gesture.Pan()
        .minDistance(2)
        .hitSlop(28)
        .onBegin(() => {
          dragOriginX.value = posX.value;
          dragOriginY.value = posY.value;
          runOnJS(beginTextDrag)();
        })
        .onUpdate((e) => {
          const nextX = Math.min(
            OVERLAY_POS_MAX,
            Math.max(
              OVERLAY_POS_MIN,
              dragOriginX.value + e.translationX / frameW.value,
            ),
          );
          const nextY = Math.min(
            OVERLAY_POS_MAX,
            Math.max(
              OVERLAY_POS_MIN,
              dragOriginY.value + e.translationY / frameH.value,
            ),
          );
          posX.value = nextX;
          posY.value = nextY;
        })
        .onFinalize(() => {
          runOnJS(commitOverlayPos)(posX.value, posY.value);
          runOnJS(endTextDrag)();
        }),
    [
      beginTextDrag,
      commitOverlayPos,
      dragOriginX,
      dragOriginY,
      endTextDrag,
      frameH,
      frameW,
      posX,
      posY,
    ],
  );

  const textAnimatedStyle = useAnimatedStyle(() => ({
    left: frameLeft.value + posX.value * frameW.value - boxW.value / 2,
    top: frameTop.value + posY.value * frameH.value - boxH.value / 2,
  }));

  const busy = exporting;
  const canUndo = history.length > 0;
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

  if (!paramUri) {
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
      {/* Video stays above bottom tools so text never sits under the panel */}
      <View
        style={[
          styles.previewArea,
          {
            bottom: Math.max(dockHeight, 0) + keyboardHeight,
          },
        ]}
        onLayout={onPreviewLayout}
      >
        {frameSize.width > 0 ? (
          <View
            style={[
              styles.cropFrame,
              { width: frameSize.width, height: frameSize.height },
            ]}
          >
            <VideoView
              player={player}
              style={styles.video}
              contentFit={aspect === "original" ? "contain" : "cover"}
              nativeControls={false}
              pointerEvents="none"
            />

            <View style={styles.playOverlay} pointerEvents="box-none">
              <TouchableOpacity
                style={styles.playCircle}
                activeOpacity={0.85}
                onPress={() => {
                  dismissKeyboard();
                  if (busy || !previewReady) return;
                  setPlaying((p) => !p);
                }}
                hitSlop={12}
              >
                <MaterialIcons
                  name={playing ? "pause" : "play-arrow"}
                  size={moderateWidthScale(36)}
                  color={theme.white}
                />
              </TouchableOpacity>
            </View>

            <View style={styles.timeBadge} pointerEvents="none">
              <Text style={styles.timeText}>
                {formatMs(previewTimeMs)} /{" "}
                {formatMs(Math.max(0, trimEndMs - trimStartMs))}
              </Text>
            </View>
          </View>
        ) : (
          <ActivityIndicator color={theme.white} />
        )}

        {keyboardHeight > 0 ? (
          <Pressable
            style={styles.keyboardDismissOverlay}
            onPress={dismissKeyboard}
          />
        ) : null}
      </View>

      <View
        style={[
          styles.topBar,
          { paddingTop: insets.top + moderateHeightScale(4) },
        ]}
        pointerEvents="box-none"
      >
        <View style={styles.topLeftRow}>
          <TouchableOpacity
            style={styles.topBtn}
            onPress={() => {
              dismissKeyboard();
              router.back();
            }}
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
            style={[styles.topBtn, !canUndo && styles.topBtnDisabled]}
            onPress={() => {
              dismissKeyboard();
              handleUndo();
            }}
            disabled={busy || !canUndo}
            hitSlop={8}
          >
            <MaterialIcons
              name="undo"
              size={moderateWidthScale(22)}
              color={theme.white}
            />
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          style={styles.nextBtn}
          onPress={() => {
            dismissKeyboard();
            void handleNextToPublish();
          }}
          disabled={busy || !project}
          activeOpacity={0.85}
        >
          <Text style={styles.nextText}>{t("exportAndUpload")}</Text>
        </TouchableOpacity>
      </View>

      {overlayText.trim() ? (
        <View
          style={[
            styles.textLayer,
            {
              bottom: Math.max(dockHeight, 0) + keyboardHeight,
            },
          ]}
          pointerEvents="box-none"
        >
          <GestureDetector gesture={textDragGesture}>
            <Animated.View
              onLayout={(e) => {
                const { width, height } = e.nativeEvent.layout;
                if (width > 0 && height > 0) {
                  setTextBoxSize({ width, height });
                }
              }}
              style={[
                styles.textOverlay,
                styles.textHitExpand,
                overlayBgColorKey
                  ? [
                      styles.textOverlayBg,
                      {
                        backgroundColor:
                          resolveOverlayColor(overlayBgColorKey),
                      },
                    ]
                  : null,
                (activeTool === "text" || draggingText) &&
                  styles.textOverlayActive,
                textAnimatedStyle,
              ]}
            >
              <Text
                style={[
                  styles.textOverlayLabel,
                  {
                    color: resolveOverlayColor(overlayColorKey),
                    fontSize:
                      overlaySize === "S"
                        ? fontSize.size16
                        : overlaySize === "L"
                          ? fontSize.size28
                          : fontSize.size22,
                    fontFamily: overlayMono
                      ? fonts.fontRegular
                      : overlayBold
                        ? fonts.fontBold
                        : fonts.fontMedium,
                    fontStyle: overlayItalic ? "italic" : "normal",
                  },
                ]}
              >
                {overlayText.trim()}
              </Text>
            </Animated.View>
          </GestureDetector>
        </View>
      ) : null}

      <View
        style={[
          styles.bottomDock,
          keyboardHeight > 0 && styles.bottomDockKeyboard,
          {
            bottom: keyboardHeight,
            paddingBottom:
              keyboardHeight > 0
                ? moderateHeightScale(8)
                : Math.max(insets.bottom, moderateHeightScale(8)),
          },
        ]}
        onLayout={(e) => {
          const h = Math.round(e.nativeEvent.layout.height);
          if (h > 0) {
            setDockHeight((prev) => (prev === h ? prev : h));
          }
        }}
      >
          {activeTool ? (
            <Pressable
              style={[
                styles.panel,
                keyboardHeight > 0 && styles.panelCompact,
              ]}
              onPress={dismissKeyboard}
            >
              {activeTool === "trim" ? (
                <>
                  <Text style={styles.panelTitle}>{t("trimVideo")}</Text>
                  <Text style={styles.panelHint}>
                    {t("trimRangeHint", {
                      start: formatMs(trimStartMs),
                      end: formatMs(trimEndMs),
                    })}
                  </Text>
                  <Text style={styles.panelHint}>
                    {t("reelTrimMaxHint", { max_seconds: maxSeconds })}
                  </Text>
                  <Text style={styles.label}>{t("trimStart")}</Text>
                  <Slider
                    minimumValue={Math.max(0, trimEndMs - maxClipMs)}
                    maximumValue={Math.max(0, trimEndMs - 500)}
                    value={trimStartMs}
                    onSlidingStart={() => {
                      dismissKeyboard();
                      if (!trimHistoryPushedRef.current) {
                        pushHistory();
                        trimHistoryPushedRef.current = true;
                      }
                      setPlaying(false);
                    }}
                    onValueChange={onTrimStartChange}
                    onSlidingComplete={() => {
                      trimHistoryPushedRef.current = false;
                      setPlaying(true);
                    }}
                    minimumTrackTintColor={theme.selectCard}
                    maximumTrackTintColor={theme.white15}
                    thumbTintColor={theme.selectCard}
                    disabled={busy}
                  />
                  <Text style={styles.label}>{t("trimEnd")}</Text>
                  <Slider
                    minimumValue={Math.min(durationMs, trimStartMs + 500)}
                    maximumValue={Math.min(durationMs, trimStartMs + maxClipMs)}
                    value={trimEndMs}
                    onSlidingStart={() => {
                      dismissKeyboard();
                      if (!trimHistoryPushedRef.current) {
                        pushHistory();
                        trimHistoryPushedRef.current = true;
                      }
                      setPlaying(false);
                    }}
                    onValueChange={onTrimEndChange}
                    onSlidingComplete={() => {
                      trimHistoryPushedRef.current = false;
                      setPlaying(true);
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
                        ["original", "aspectOriginal"],
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
                        onPress={() => {
                          if (aspect === key) return;
                          pushHistory();
                          setAspect(key);
                        }}
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
                          pushHistory();
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
                        onSlidingStart={() => pushHistory()}
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
                      onValueChange={(v) => {
                        pushHistory();
                        setMuteOriginal(v);
                      }}
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
                <View style={styles.textStudio}>
                  <View style={styles.textInputWrap}>
                    <TextInput
                      ref={textInputRef}
                      style={[styles.input, styles.textInputTight]}
                      value={overlayText}
                      onFocus={() => {
                        if (!textHistoryPushedRef.current) {
                          pushHistory();
                          textHistoryPushedRef.current = true;
                        }
                      }}
                      onBlur={() => {
                        textHistoryPushedRef.current = false;
                      }}
                      onChangeText={setOverlayText}
                      onSubmitEditing={dismissKeyboard}
                      returnKeyType="done"
                      blurOnSubmit
                      placeholder={t("overlayTextPlaceholder")}
                      placeholderTextColor={theme.white50}
                      editable={!busy}
                      maxLength={80}
                    />
                    {overlayText.length > 0 ? (
                      <Pressable
                        style={styles.textInputClear}
                        onPress={() => {
                          pushHistory();
                          setOverlayText("");
                        }}
                        disabled={busy}
                        hitSlop={8}
                        accessibilityLabel={t("clear")}
                      >
                        <CloseIcon color={theme.white70} />
                      </Pressable>
                    ) : null}
                  </View>

                  <View style={styles.textColorBar}>
                    <View style={styles.textModeSeg}>
                      <TouchableOpacity
                        style={[
                          styles.textModeBtn,
                          textColorTarget === "text" &&
                            styles.textModeBtnActive,
                        ]}
                        onPress={() => setTextColorTarget("text")}
                        disabled={busy}
                        accessibilityLabel={t("textColor")}
                      >
                        <MaterialIcons
                          name="format-color-text"
                          size={moderateWidthScale(16)}
                          color={
                            textColorTarget === "text"
                              ? theme.buttonText
                              : theme.white
                          }
                        />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.textModeBtn,
                          textColorTarget === "bg" && styles.textModeBtnActive,
                        ]}
                        onPress={() => setTextColorTarget("bg")}
                        disabled={busy}
                        accessibilityLabel={t("textBackground")}
                      >
                        <MaterialIcons
                          name="format-color-fill"
                          size={moderateWidthScale(16)}
                          color={
                            textColorTarget === "bg"
                              ? theme.buttonText
                              : theme.white
                          }
                        />
                      </TouchableOpacity>
                    </View>

                    <View style={styles.textColorTrack}>
                      {textColorTarget === "bg" ? (
                        <TouchableOpacity
                          style={[
                            styles.colorDot,
                            styles.colorDotTight,
                            styles.colorDotNone,
                            overlayBgColorKey === null &&
                              styles.colorDotActive,
                          ]}
                          onPress={() => {
                            if (overlayBgColorKey === null) return;
                            pushHistory();
                            setOverlayBgColorKey(null);
                          }}
                          disabled={busy}
                          accessibilityLabel={t("textBgNone")}
                        >
                          <View style={styles.colorDotNoneSlash} />
                        </TouchableOpacity>
                      ) : null}
                      {OVERLAY_COLOR_KEYS.map((key) => {
                        const selected =
                          textColorTarget === "text"
                            ? overlayColorKey === key
                            : overlayBgColorKey === key;
                        return (
                          <TouchableOpacity
                            key={key}
                            style={[
                              styles.colorDot,
                              styles.colorDotTight,
                              { backgroundColor: theme[key] as string },
                              selected && styles.colorDotActive,
                            ]}
                            onPress={() => {
                              if (textColorTarget === "text") {
                                if (overlayColorKey === key) return;
                                pushHistory();
                                setOverlayColorKey(key);
                              } else {
                                if (overlayBgColorKey === key) return;
                                pushHistory();
                                setOverlayBgColorKey(key);
                              }
                            }}
                            disabled={busy}
                          />
                        );
                      })}
                    </View>
                  </View>

                  {keyboardHeight === 0 ? (
                    <View style={styles.textStyleBar}>
                      <View style={styles.textSizeSeg}>
                        {(["S", "M", "L"] as OverlaySize[]).map((size) => {
                          const active = overlaySize === size;
                          return (
                            <TouchableOpacity
                              key={size}
                              style={[
                                styles.textSizeBtn,
                                active && styles.textSizeBtnActive,
                              ]}
                              onPress={() => {
                                if (overlaySize === size) return;
                                pushHistory();
                                setOverlaySize(size);
                              }}
                              disabled={busy}
                            >
                              <Text
                                style={[
                                  styles.textSizeLabel,
                                  active && styles.textSizeLabelActive,
                                ]}
                              >
                                {size}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>

                      <View style={styles.textFormatRow}>
                        {(
                          [
                            {
                              key: "bold",
                              icon: "format-bold" as const,
                              active: overlayBold,
                              onPress: () => {
                                pushHistory();
                                setOverlayBold((v) => !v);
                              },
                            },
                            {
                              key: "italic",
                              icon: "format-italic" as const,
                              active: overlayItalic,
                              onPress: () => {
                                pushHistory();
                                setOverlayItalic((v) => !v);
                              },
                            },
                            {
                              key: "mono",
                              icon: "code" as const,
                              active: overlayMono,
                              onPress: () => {
                                pushHistory();
                                setOverlayMono((v) => !v);
                              },
                            },
                          ] as const
                        ).map((item) => (
                          <TouchableOpacity
                            key={item.key}
                            style={[
                              styles.textFormatBtn,
                              item.active && styles.textFormatBtnActive,
                            ]}
                            onPress={item.onPress}
                            disabled={busy}
                          >
                            <MaterialIcons
                              name={item.icon}
                              size={moderateWidthScale(18)}
                              color={
                                item.active ? theme.buttonText : theme.white
                              }
                            />
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  ) : null}
                </View>
              ) : null}
            </Pressable>
          ) : null}

          {keyboardHeight === 0 ? (
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
          ) : null}
      </View>

      {busy ? (
        <View style={styles.busyOverlay}>
          <ActivityIndicator size="large" color={theme.white} />
          <Text style={styles.progressText}>
            {`${t("exportingVideo")} ${exportProgress}%`}
          </Text>
        </View>
      ) : null}
    </View>
  );
}
