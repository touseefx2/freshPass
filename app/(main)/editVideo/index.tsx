import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActionSheetIOS,
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
import * as ImagePicker from "expo-image-picker";
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
  makeClipId,
  type OverlayClip,
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
import { formatVideoDuration } from "@/src/utils/videoDuration";
import {
  getCachedMediaLimits,
  getMediaLimits,
} from "@/src/services/mediaLibraryService";
import {
  handleCameraPermission,
  handleMediaLibraryPermission,
} from "@/src/services/mediaPermissionService";
import type { MediaUploadSourceType } from "@/src/types/media";
import { ensureLocalMediaFileUri } from "@/src/utils/localMediaUri";
import { MIN_REEL_SECONDS, REEL_LIMIT_FALLBACK } from "@/src/utils/reelLimits";
import ClipTimeline from "@/src/components/videoEditor/clipTimeline";
import ClipEditor from "@/src/components/videoEditor/clipEditor";
import StickerLayer, {
  type StickerTransformPatch,
} from "@/src/components/videoEditor/stickerLayer";
import StickerPanel from "@/src/components/videoEditor/stickerPanel";
import { deliverEditedVideo } from "@/src/components/videoEditor/editorHandoff";
import { saveLocalVideoToGallery } from "@/src/services/downloadMediaService";
import {
  MAX_EDITOR_CLIPS,
  MAX_EDITOR_STICKERS,
  MAX_IMAGE_STICKERS,
  MIN_CLIP_MS,
  STICKER_SIZE_RANGE,
  buildVideoTrackClips,
  clampStickerSize,
  clipLengthMs,
  clipOffsetMs,
  clipThumbnail,
  normalizeDegrees,
  prepareEditorClip,
  prepareStickerImage,
  sourceFilmstrip,
  splitClip,
  stickerToOverlay,
  totalClipsMs,
  type EditorClip,
  type EditorSticker,
} from "@/src/components/videoEditor/editorModel";

type AspectPreset = "original" | "portrait" | "square" | "landscape";
type EditorTool = "trim" | "crop" | "music" | "text" | "sticker" | null;
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
  clips: EditorClip[];
  stickers: EditorSticker[];
  aspect: AspectPreset;
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
  music: "clip-music",
  text: "clip-text",
} as const;

/** Fan new stickers out a little so they don't stack exactly. */
function stickerSpawnPos(count: number): { x: number; y: number } {
  const step = ((count % 5) - 2) * 0.06;
  return { x: 0.5 + step, y: 0.4 + step };
}

type PlayerSlot = 0 | 1;
const otherSlot = (slot: PlayerSlot): PlayerSlot => (slot === 0 ? 1 : 0);

/** iOS needs the "Compatible" representation so HEVC / slo-mo clips open in AVFoundation. */
const IOS_PICKER_COMPAT =
  Platform.OS === "ios"
    ? {
        preferredAssetRepresentationMode:
          ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
      }
    : {};

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
    lengthNotice: {
      position: "absolute",
      left: moderateWidthScale(16),
      right: moderateWidthScale(16),
      zIndex: 19,
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(8),
      paddingHorizontal: moderateWidthScale(12),
      paddingVertical: moderateHeightScale(8),
      borderRadius: moderateWidthScale(12),
      borderWidth: 1,
      borderColor: theme.orangeBrown,
      backgroundColor: theme.darkGreen,
    },
    lengthNoticeText: {
      flex: 1,
      fontSize: fontSize.size12,
      fontFamily: fonts.fontMedium,
      color: theme.white,
      lineHeight: fontSize.size16,
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
    videoLayer: {
      ...StyleSheet.absoluteFillObject,
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
    progressHint: {
      marginTop: moderateHeightScale(8),
      paddingHorizontal: moderateWidthScale(40),
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.white80,
      textAlign: "center",
      lineHeight: fontSize.size16,
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
    width?: string;
    height?: string;
    /** "save" → export, save to gallery and hand back to the opener (no publish). */
    mode?: string;
    requestId?: string;
    /** "reel" → save mode for a reel-length clip (template slots): reel wording, not auto reel */
    limitContext?: string;
  }>();

  const isSaveMode = params.mode === "save" && !!params.requestId;

  const paramUri = params.uri ? decodeURIComponent(params.uri) : "";
  const sourceType = (
    params.sourceType === "camera" ? "camera" : "device"
  ) as MediaUploadSourceType;
  const paramMaxSeconds = Number(params.maxSeconds);
  const initialMaxSeconds =
    Number.isFinite(paramMaxSeconds) && paramMaxSeconds > 0
      ? paramMaxSeconds
      : getCachedMediaLimits()?.max_seconds ?? REEL_LIMIT_FALLBACK.max_seconds;

  const [clips, setClips] = useState<EditorClip[]>([]);
  /** Clip open in the trim tool's single-clip view; null = clips overview. */
  const [editingClipId, setEditingClipId] = useState<string | null>(null);
  const [thumbs, setThumbs] = useState<Record<string, string | null>>({});
  /** Trimmer frames per source file (split clips share one). */
  const [filmstrips, setFilmstrips] = useState<
    Record<string, (string | null)[]>
  >({});
  const [addingClips, setAddingClips] = useState(false);
  const [loadingInfo, setLoadingInfo] = useState(true);
  const [maxSeconds, setMaxSeconds] = useState(initialMaxSeconds);
  const [aspect, setAspect] = useState<AspectPreset>("original");
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
  const [stickers, setStickers] = useState<EditorSticker[]>([]);
  const [selectedStickerId, setSelectedStickerId] = useState<string | null>(
    null,
  );
  const [addingSticker, setAddingSticker] = useState(false);
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
  const [savingToGallery, setSavingToGallery] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [activeSlot, setActiveSlot] = useState<PlayerSlot>(0);

  const trimHistoryPushedRef = useRef(false);
  /** Clip length when the current trim drag began — it may shrink back from over the limit, never grow past it. */
  const trimAllowedMsRef = useRef(0);
  const textHistoryPushedRef = useRef(false);
  const textInputRef = useRef<TextInputType>(null);
  const musicSoundRef = useRef<Audio.Sound | null>(null);

  const maxClipMs = Math.max(MIN_CLIP_MS, Math.round(maxSeconds * 1000));
  const totalMs = totalClipsMs(clips);
  // Outside the allowed length (e.g. a long recording) — shown on top until it fits
  const lengthOutOfRange =
    clips.length > 0 &&
    (totalMs > maxSeconds * 1000 + 50 ||
      totalMs < MIN_REEL_SECONDS * 1000 - 50);
  const mutedClipCount = clips.filter((c) => c.muted).length;
  /** "Mute original audio" (Music panel) = every clip's own sound is off. */
  const allClipsMuted = clips.length > 0 && mutedClipCount === clips.length;
  const editingIndex = clips.findIndex((c) => c.id === editingClipId);
  const editingClip: EditorClip | null =
    editingIndex >= 0 ? clips[editingIndex] : null;
  const selectedSticker =
    stickers.find((s) => s.id === selectedStickerId) ?? null;
  // Trim panel previews only the clip being trimmed; otherwise the whole reel plays.
  const focusIndex =
    activeTool === "trim" && editingClip ? editingIndex : null;

  // ── Preview engine refs (two players → gapless hand-off between clips)
  const clipsRef = useRef(clips);
  clipsRef.current = clips;
  const editingClipIdRef = useRef<string | null>(null);
  editingClipIdRef.current = editingClip?.id ?? null;
  const focusIndexRef = useRef<number | null>(focusIndex);
  focusIndexRef.current = focusIndex;
  const playingRef = useRef(playing);
  playingRef.current = playing;
  const activeSlotRef = useRef<PlayerSlot>(0);
  const activeIndexRef = useRef(0);
  const slotUriRef = useRef<(string | null)[]>([null, null]);
  /** Clip loaded in each player — its own mute applies to that player. */
  const slotClipIdRef = useRef<(string | null)[]>([null, null]);
  const preloadRef = useRef<{
    slot: PlayerSlot;
    index: number;
    clipId: string;
  } | null>(null);
  const engineGenRef = useRef(0);
  const engineLoadingRef = useRef(false);
  const scrubbingRef = useRef(false);
  const filmstripLoadingRef = useRef(new Set<string>());

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

  const setupPlayer = useCallback((p: { loop: boolean; timeUpdateEventInterval: number }) => {
    p.loop = false;
    p.timeUpdateEventInterval = 0.1;
  }, []);
  const playerA = useVideoPlayer(null, setupPlayer);
  const playerB = useVideoPlayer(null, setupPlayer);
  const players = useMemo(() => [playerA, playerB] as const, [playerA, playerB]);

  const resolveOverlayColor = useCallback(
    (key: OverlayColorKey) => theme[key] as string,
    [theme],
  );

  const currentSnapshot = useCallback(
    (): EditorSnapshot => ({
      clips,
      stickers,
      aspect,
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
      clips,
      musicName,
      musicUri,
      musicVolume,
      overlayBgColorKey,
      overlayBold,
      overlayColorKey,
      overlayItalic,
      overlayMono,
      overlaySize,
      overlayText,
      overlayX,
      overlayY,
      stickers,
    ],
  );

  /** Push a snapshot taken earlier (e.g. before an async picker resolved). */
  const pushSnapshot = useCallback((snap: EditorSnapshot) => {
    setHistory((prev) => {
      const last = prev[prev.length - 1];
      if (
        last &&
        last.clips === snap.clips &&
        last.stickers === snap.stickers &&
        last.aspect === snap.aspect &&
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
  }, []);

  const pushHistory = useCallback(() => {
    pushSnapshot(currentSnapshot());
  }, [currentSnapshot, pushSnapshot]);

  const handleUndo = useCallback(() => {
    setHistory((prev) => {
      if (prev.length === 0) return prev;
      const next = [...prev];
      const snap = next.pop()!;
      setClips(snap.clips);
      setStickers(snap.stickers);
      setAspect(snap.aspect);
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

  const loadThumbnail = useCallback((clip: EditorClip) => {
    void clipThumbnail(clip).then((uri) => {
      if (uri) setThumbs((prev) => ({ ...prev, [clip.id]: uri }));
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!paramUri) {
        setLoadingInfo(false);
        return;
      }
      const clipCap = Math.max(
        MIN_CLIP_MS,
        Math.round(
          (Number.isFinite(paramMaxSeconds) && paramMaxSeconds > 0
            ? paramMaxSeconds
            : getCachedMediaLimits()?.max_seconds ??
              REEL_LIMIT_FALLBACK.max_seconds) * 1000,
        ),
      );
      try {
        const first = await prepareEditorClip({
          uri: paramUri,
          fileName: params.fileName,
          sourceType,
          // Load the whole video so the user picks the part to keep;
          // Next / Save stays blocked until it fits the limit.
          budgetMs: Number.POSITIVE_INFINITY,
        });
        if (cancelled) return;
        clipsRef.current = [first];
        setClips([first]);
        setAspect("original");
        setPreviewReady(true);
        setPlaying(true);
        loadThumbnail(first);
        // Over the limit — open the trimmer on the full original video straight away
        // (normal reel, template slot and auto reel alike); the top notice says
        // what length is needed and Next / Save re-checks it.
        if (clipLengthMs(first) > clipCap) {
          setActiveTool("trim");
          setEditingClipId(first.id);
        }
      } catch (error) {
        Logger.error("prepare video for edit failed:", error);
        if (!cancelled) {
          // Keep "upload as-is" possible even when metadata can't be read.
          const fallback: EditorClip = {
            id: makeClipId("clip"),
            uri: paramUri,
            sourceDurationMs: clipCap,
            trimStartMs: 0,
            trimEndMs: clipCap,
            width: Number(params.width) || 0,
            height: Number(params.height) || 0,
            sourceType,
          };
          clipsRef.current = [fallback];
          setClips([fallback]);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paramUri, params.fileName, paramMaxSeconds, showBanner, t]);

  // ── Preview engine ────────────────────────────────────────────────
  // expo-video plays one source per player, so clips are previewed back
  // to back on two players: the inactive one is preloaded + seeked to the
  // next clip's trim start, then the views swap at the boundary. Export is
  // a single native composition (expo-media-edit), so it has no seams.

  const ensureSlotSource = useCallback(
    async (slot: PlayerSlot, uri: string) => {
      if (slotUriRef.current[slot] === uri) return;
      slotUriRef.current[slot] = uri;
      try {
        await players[slot].replaceAsync(uri);
      } catch (error) {
        slotUriRef.current[slot] = null;
        throw error;
      }
    },
    [players],
  );

  const preloadNext = useCallback(
    async (gen: number) => {
      const list = clipsRef.current;
      if (focusIndexRef.current != null || list.length < 2) return;
      const nextIndex = (activeIndexRef.current + 1) % list.length;
      const clip = list[nextIndex];
      const slot = otherSlot(activeSlotRef.current);
      try {
        players[slot].pause();
        await ensureSlotSource(slot, clip.uri);
        if (gen !== engineGenRef.current) return;
        players[slot].pause();
        players[slot].currentTime = clip.trimStartMs / 1000;
        players[slot].muted = !!clip.muted;
        slotClipIdRef.current[slot] = clip.id;
        preloadRef.current = { slot, index: nextIndex, clipId: clip.id };
      } catch (error) {
        Logger.error("Preload next clip failed:", error);
      }
    },
    [ensureSlotSource, players],
  );

  const startAt = useCallback(
    async (index: number) => {
      const gen = ++engineGenRef.current;
      preloadRef.current = null;
      const list = clipsRef.current;
      const clip = list[index];
      if (!clip) return;
      const slot = activeSlotRef.current;
      const p = players[slot];
      engineLoadingRef.current = true;
      try {
        players[otherSlot(slot)].pause();
        await ensureSlotSource(slot, clip.uri);
        if (gen !== engineGenRef.current) return;
        activeIndexRef.current = index;
        p.currentTime = clip.trimStartMs / 1000;
        p.muted = !!clip.muted;
        slotClipIdRef.current[slot] = clip.id;
        if (playingRef.current) p.play();
        else p.pause();
        setPreviewTimeMs(
          focusIndexRef.current != null ? 0 : clipOffsetMs(list, index),
        );
      } catch (error) {
        Logger.error("Preview clip load failed:", error);
        return;
      } finally {
        if (gen === engineGenRef.current) engineLoadingRef.current = false;
      }
      void preloadNext(gen);
    },
    [ensureSlotSource, players, preloadNext],
  );

  const advance = useCallback(() => {
    const list = clipsRef.current;
    const slot = activeSlotRef.current;
    const focus = focusIndexRef.current;
    const idx = activeIndexRef.current;

    if (focus != null || list.length < 2) {
      const clip = list[focus ?? idx] ?? list[0];
      if (!clip) return;
      try {
        players[slot].currentTime = clip.trimStartMs / 1000;
        if (playingRef.current) players[slot].play();
      } catch {}
      setPreviewTimeMs(0);
      return;
    }

    const nextIndex = (idx + 1) % list.length;
    const pre = preloadRef.current;
    if (
      pre &&
      pre.index === nextIndex &&
      pre.slot !== slot &&
      list[nextIndex]?.id === pre.clipId
    ) {
      const gen = ++engineGenRef.current;
      preloadRef.current = null;
      activeSlotRef.current = pre.slot;
      activeIndexRef.current = nextIndex;
      setActiveSlot(pre.slot);
      try {
        if (playingRef.current) players[pre.slot].play();
        players[slot].pause();
      } catch {}
      setPreviewTimeMs(clipOffsetMs(list, nextIndex));
      void preloadNext(gen);
      return;
    }

    // Next clip not ready yet — fall back to loading it on the active player.
    try {
      players[slot].pause();
    } catch {}
    void startAt(nextIndex);
  }, [players, preloadNext, startAt]);

  useEffect(() => {
    const subs = players.flatMap((p, i) => {
      const slot = i as PlayerSlot;
      return [
        p.addListener("timeUpdate", ({ currentTime }) => {
          if (
            slot !== activeSlotRef.current ||
            engineLoadingRef.current ||
            scrubbingRef.current
          ) {
            return;
          }
          const list = clipsRef.current;
          const idx = activeIndexRef.current;
          const clip = list[idx];
          if (!clip) return;
          const ms = Math.max(0, currentTime * 1000);
          if (ms >= clip.trimEndMs - 40) {
            advance();
            return;
          }
          if (ms < clip.trimStartMs - 40) {
            try {
              p.currentTime = clip.trimStartMs / 1000;
            } catch {}
            return;
          }
          const local = ms - clip.trimStartMs;
          setPreviewTimeMs(
            focusIndexRef.current != null
              ? local
              : clipOffsetMs(list, idx) + local,
          );
        }),
        p.addListener("playToEnd", () => {
          if (slot !== activeSlotRef.current || engineLoadingRef.current) {
            return;
          }
          advance();
        }),
      ];
    });
    return () => subs.forEach((s) => s.remove());
  }, [advance, players]);

  // Per-clip mute changed → re-apply to whatever each player holds.
  const mutedKey = clips.map((c) => (c.muted ? 1 : 0)).join("");
  useEffect(() => {
    try {
      players.forEach((p, slot) => {
        const id = slotClipIdRef.current[slot];
        const clip = clipsRef.current.find((c) => c.id === id);
        p.muted = !!clip?.muted;
      });
    } catch {}
  }, [mutedKey, players]);

  // Play / pause
  useEffect(() => {
    try {
      players[otherSlot(activeSlot)].pause();
      if (playing && !engineLoadingRef.current) {
        players[activeSlot].play();
      } else if (!playing) {
        players[activeSlot].pause();
      }
    } catch {}
  }, [activeSlot, players, playing]);

  // (Re)start playback when the clip list / trims / focus change.
  const clipsKey = clips
    .map((c) => `${c.id}:${c.uri}:${c.trimStartMs}:${c.trimEndMs}`)
    .join("|");
  useEffect(() => {
    if (!previewReady || scrubbingRef.current) return;
    if (clipsRef.current.length === 0) return;
    // Single-clip view loops that clip; the overview plays the reel from the top.
    void startAt(focusIndex ?? 0);
  }, [clipsKey, focusIndex, previewReady, startAt]);

  const scrubTo = useCallback(
    (ms: number) => {
      try {
        players[activeSlotRef.current].currentTime = Math.max(0, ms) / 1000;
      } catch {}
    },
    [players],
  );

  /** Move one trim handle of the selected clip, keeping the reel within the account limit. */
  const updateSelectedTrim = useCallback(
    (edge: "start" | "end", value: number) => {
      const list = clipsRef.current;
      const idx = list.findIndex((c) => c.id === editingClipIdRef.current);
      const clip = list[idx];
      if (!clip) return;
      // A full long source starts over the limit: let it shrink without snapping
      const budget = Math.max(
        maxClipMs - (totalClipsMs(list) - clipLengthMs(clip)),
        trimAllowedMsRef.current,
      );
      let next: EditorClip;
      if (edge === "start") {
        const minStart = Math.max(0, clip.trimEndMs - budget);
        const start = Math.round(
          Math.min(
            Math.max(value, minStart),
            Math.max(0, clip.trimEndMs - MIN_CLIP_MS),
          ),
        );
        if (start === clip.trimStartMs) return;
        next = { ...clip, trimStartMs: start };
        scrubTo(start);
      } else {
        const maxEnd = Math.min(clip.sourceDurationMs, clip.trimStartMs + budget);
        const end = Math.round(
          Math.max(
            Math.min(value, maxEnd),
            Math.min(clip.sourceDurationMs, clip.trimStartMs + MIN_CLIP_MS),
          ),
        );
        if (end === clip.trimEndMs) return;
        next = { ...clip, trimEndMs: end };
        scrubTo(Math.max(clip.trimStartMs, end - 60));
      }
      const updated = [...list];
      updated[idx] = next;
      clipsRef.current = updated;
      setClips(updated);
    },
    [maxClipMs, scrubTo],
  );

  /** Mute / unmute one clip's own sound (Instagram per-clip mute). */
  const toggleClipMuted = useCallback(
    (id: string) => {
      const list = clipsRef.current;
      const idx = list.findIndex((c) => c.id === id);
      if (idx < 0) return;
      pushHistory();
      const updated = [...list];
      updated[idx] = { ...list[idx], muted: !list[idx].muted };
      clipsRef.current = updated;
      setClips(updated);
    },
    [pushHistory],
  );

  /** Music panel switch: mute / unmute every clip at once. */
  const setAllClipsMuted = useCallback(
    (muted: boolean) => {
      pushHistory();
      const updated = clipsRef.current.map((c) => ({ ...c, muted }));
      clipsRef.current = updated;
      setClips(updated);
    },
    [pushHistory],
  );

  /** Slide the selected clip's trim window, keeping its length. */
  const moveSelectedTrim = useCallback(
    (startMs: number) => {
      const list = clipsRef.current;
      const idx = list.findIndex((c) => c.id === editingClipIdRef.current);
      const clip = list[idx];
      if (!clip) return;
      const length = clipLengthMs(clip);
      const start = Math.round(
        Math.min(Math.max(startMs, 0), Math.max(0, clip.sourceDurationMs - length)),
      );
      if (start === clip.trimStartMs) return;
      const updated = [...list];
      updated[idx] = { ...clip, trimStartMs: start, trimEndMs: start + length };
      clipsRef.current = updated;
      setClips(updated);
      scrubTo(start);
    },
    [scrubTo],
  );

  const onTrimSlideStart = useCallback(() => {
    dismissKeyboard();
    const clip = clipsRef.current.find(
      (c) => c.id === editingClipIdRef.current,
    );
    trimAllowedMsRef.current = clip ? clipLengthMs(clip) : 0;
    if (!trimHistoryPushedRef.current) {
      pushHistory();
      trimHistoryPushedRef.current = true;
    }
    scrubbingRef.current = true;
    setPlaying(false);
  }, [dismissKeyboard, pushHistory]);

  const onTrimSlideComplete = useCallback(() => {
    trimHistoryPushedRef.current = false;
    trimAllowedMsRef.current = 0;
    scrubbingRef.current = false;
    playingRef.current = true;
    setPlaying(true);
    void startAt(focusIndexRef.current ?? 0);
  }, [startAt]);

  // Playhead in SOURCE ms of the clip open in the single-clip view.
  const playheadSourceMs =
    editingClip && focusIndex != null
      ? editingClip.trimStartMs + previewTimeMs
      : null;

  const onScrubBegin = useCallback(() => {
    dismissKeyboard();
    scrubbingRef.current = true;
    setPlaying(false);
  }, [dismissKeyboard]);

  const onScrub = useCallback(
    (ms: number) => {
      const clip = clipsRef.current.find(
        (c) => c.id === editingClipIdRef.current,
      );
      if (!clip) return;
      scrubTo(ms);
      setPreviewTimeMs(Math.max(0, ms - clip.trimStartMs));
    },
    [scrubTo],
  );

  // Stay paused on the scrubbed frame (Instagram-style) so Split lands there.
  const onScrubEnd = useCallback(() => {
    scrubbingRef.current = false;
  }, []);

  const splitSelectedClip = useCallback(
    (id: string) => {
      const list = clipsRef.current;
      const index = list.findIndex((c) => c.id === id);
      const clip = list[index];
      if (!clip || playheadSourceMs == null) return;
      if (list.length >= MAX_EDITOR_CLIPS) {
        showBanner(
          t("trimVideo"),
          t("clipsLimitReached", { max: MAX_EDITOR_CLIPS }),
          "warning",
          3000,
        );
        return;
      }
      const parts = splitClip(clip, playheadSourceMs);
      if (!parts) {
        // Playhead too close to an edge — say how to fix it instead of a dead button.
        showBanner(t("splitClip"), t("splitClipHint"), "info", 3500);
        return;
      }
      pushHistory();
      const next = [...list];
      next.splice(index, 1, ...parts);
      clipsRef.current = next;
      setClips(next);
      loadThumbnail(parts[1]);
      // Back to the overview so both halves are visible as separate clips.
      setEditingClipId(null);
      showBanner(t("splitClip"), t("clipSplitDone"), "success", 2500);
    },
    [loadThumbnail, playheadSourceMs, pushHistory, showBanner, t],
  );

  // Load trimmer frames for the open clip's file (once per file).
  const selectedUri = editingClip?.uri;
  const selectedSourceMs = editingClip?.sourceDurationMs ?? 0;
  useEffect(() => {
    if (activeTool !== "trim" || !selectedUri || exporting) return;
    if (filmstrips[selectedUri] || filmstripLoadingRef.current.has(selectedUri)) {
      return;
    }
    filmstripLoadingRef.current.add(selectedUri);
    void sourceFilmstrip(selectedUri, selectedSourceMs)
      .then((frames) => {
        setFilmstrips((prev) => ({ ...prev, [selectedUri]: frames }));
      })
      .finally(() => {
        filmstripLoadingRef.current.delete(selectedUri);
      });
  }, [activeTool, exporting, filmstrips, selectedSourceMs, selectedUri]);

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

  const firstClip = clips[0];
  const videoSize = useMemo(
    () => ({
      width: firstClip?.width ?? 0,
      height: firstClip?.height ?? 0,
    }),
    [firstClip?.height, firstClip?.width],
  );

  const canvasSize = useMemo(
    () => getCanvasSize(aspect, videoSize.width, videoSize.height),
    [aspect, videoSize.height, videoSize.width],
  );

  const project: Project | null = useMemo(() => {
    if (clips.length === 0) return null;
    const videoClips = buildVideoTrackClips(clips);
    const reelDuration =
      videoClips[videoClips.length - 1]?.timelineRange.endMs ?? 0;
    if (reelDuration <= 0) return null;
    const tracks: Project["tracks"] = [
      {
        kind: "video",
        id: "v",
        clips: videoClips,
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
            sourceRange: { startMs: 0, endMs: reelDuration },
            timelineRange: { startMs: 0, endMs: reelDuration },
            volume: musicVolume,
            trimToVideo: true,
          },
        ],
      });
    }

    // Order = z-order on export: stickers first, caption on top (same as preview).
    const overlayItems: OverlayClip[] = stickers.map((s) =>
      stickerToOverlay(s, canvasSize),
    );

    if (overlayText.trim()) {
      const exportText = sanitizeOverlayText(overlayText);
      if (exportText) {
        const hasBg = !!overlayBgColorKey;
        overlayItems.push({
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
        });
      }
    }

    if (overlayItems.length > 0) {
      tracks.push({ kind: "overlay", id: "o", items: overlayItems });
    }

    return createProject({
      id: "freshpass-edit-session",
      canvasSize,
      // Explicit fps avoids undefined → native 0 timescale black exports.
      fps: 30,
      tracks,
    });
  }, [
    canvasSize,
    clips,
    musicUri,
    musicVolume,
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
    stickers,
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

  // ── Clips: add (gallery / camera), reorder, remove ────────────────

  /** Returns a reason the user can't add another clip, or null. */
  const clipAddBlocker = useCallback((): string | null => {
    const list = clipsRef.current;
    if (list.length >= MAX_EDITOR_CLIPS) {
      return t("clipsLimitReached", { max: MAX_EDITOR_CLIPS });
    }
    if (maxClipMs - totalClipsMs(list) < MIN_CLIP_MS) {
      return t("clipsNoTimeLeft", { max_seconds: maxSeconds });
    }
    return null;
  }, [maxClipMs, maxSeconds, t]);

  const appendClips = useCallback(
    async (
      assets: ImagePicker.ImagePickerAsset[],
      type: MediaUploadSourceType,
      snap: EditorSnapshot,
    ) => {
      setAddingClips(true);
      const added: EditorClip[] = [];
      let failed = 0;
      let outOfTime = 0;
      let shortened = false;
      let budget = maxClipMs - totalClipsMs(clipsRef.current);
      // Original audio muted for every clip → new clips come in muted too
      const inheritMute =
        clipsRef.current.length > 0 && clipsRef.current.every((c) => c.muted);
      for (const asset of assets) {
        if (!asset.uri) continue;
        if (clipsRef.current.length + added.length >= MAX_EDITOR_CLIPS) break;
        if (budget < MIN_CLIP_MS) {
          outOfTime += 1;
          continue;
        }
        try {
          const clip = await prepareEditorClip({
            uri: asset.uri,
            fileName: asset.fileName,
            sourceType: type,
            budgetMs: budget,
          });
          if (clip.trimEndMs < clip.sourceDurationMs) shortened = true;
          budget -= clipLengthMs(clip);
          added.push(inheritMute ? { ...clip, muted: true } : clip);
        } catch (error) {
          Logger.error("Add clip failed:", error);
          failed += 1;
        }
      }
      setAddingClips(false);

      if (added.length > 0) {
        pushSnapshot(snap);
        const next = [...clipsRef.current, ...added];
        clipsRef.current = next;
        setClips(next);
        added.forEach(loadThumbnail);
      }

      if (failed > 0) {
        showBanner(t("error"), t("failedToAddClip"), "error", 3000);
      } else if (outOfTime > 0) {
        showBanner(
          t("trimVideo"),
          t("clipsNoTimeLeft", { max_seconds: maxSeconds }),
          "warning",
          4000,
        );
      } else if (shortened) {
        showBanner(
          t("trimVideo"),
          t("clipsShortenedToFit", { max_seconds: maxSeconds }),
          "info",
          3500,
        );
      }
    },
    [loadThumbnail, maxClipMs, maxSeconds, pushSnapshot, showBanner, t],
  );

  const addClipsFromGallery = useCallback(async () => {
    dismissKeyboard();
    const blocked = clipAddBlocker();
    if (blocked) {
      showBanner(t("trimVideo"), blocked, "warning", 3500);
      return;
    }
    const hasPermission = await handleMediaLibraryPermission();
    if (!hasPermission) return;
    const snap = currentSnapshot();
    setPlaying(false);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["videos"],
        allowsMultipleSelection: true,
        orderedSelection: true,
        selectionLimit: Math.max(1, MAX_EDITOR_CLIPS - clipsRef.current.length),
        quality: 1,
        ...IOS_PICKER_COMPAT,
      });
      if (!result.canceled && result.assets?.length) {
        await appendClips(result.assets, "device", snap);
      }
    } catch (error) {
      Logger.error("Pick clips failed:", error);
      showBanner(t("error"), t("failedToSelectMedia"), "error", 3000);
    } finally {
      setPlaying(true);
    }
  }, [
    appendClips,
    clipAddBlocker,
    currentSnapshot,
    dismissKeyboard,
    showBanner,
    t,
  ]);

  const addClipFromCamera = useCallback(async () => {
    dismissKeyboard();
    const blocked = clipAddBlocker();
    if (blocked) {
      showBanner(t("trimVideo"), blocked, "warning", 3500);
      return;
    }
    const hasPermission = await handleCameraPermission();
    if (!hasPermission) return;
    const remainingMs = maxClipMs - totalClipsMs(clipsRef.current);
    const snap = currentSnapshot();
    setPlaying(false);
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ["videos"],
        quality: 1,
        videoMaxDuration: Math.max(1, Math.floor(remainingMs / 1000)),
        ...IOS_PICKER_COMPAT,
      });
      if (!result.canceled && result.assets?.[0]) {
        await appendClips([result.assets[0]], "camera", snap);
      }
    } catch (error) {
      Logger.error("Record clip failed:", error);
      showBanner(t("error"), t("failedToRecordVideo"), "error", 3000);
    } finally {
      setPlaying(true);
    }
  }, [
    appendClips,
    clipAddBlocker,
    currentSnapshot,
    dismissKeyboard,
    maxClipMs,
    showBanner,
    t,
  ]);

  const moveClip = useCallback(
    (id: string, direction: -1 | 1) => {
      const list = clipsRef.current;
      const from = list.findIndex((c) => c.id === id);
      const to = from + direction;
      if (from < 0 || to < 0 || to >= list.length) return;
      pushHistory();
      const next = [...list];
      [next[from], next[to]] = [next[to], next[from]];
      setClips(next);
    },
    [pushHistory],
  );

  const removeClip = useCallback(
    (id: string) => {
      const list = clipsRef.current;
      if (list.length <= 1) return;
      const index = list.findIndex((c) => c.id === id);
      if (index < 0) return;
      pushHistory();
      setClips(list.filter((c) => c.id !== id));
      if (editingClipIdRef.current === id) setEditingClipId(null);
    },
    [pushHistory],
  );

  /** Drag-to-reorder result from the clips overview. */
  const reorderClips = useCallback(
    (orderedIds: string[]) => {
      const list = clipsRef.current;
      const byId = new Map(list.map((c) => [c.id, c]));
      const next = orderedIds
        .map((id) => byId.get(id))
        .filter((c): c is EditorClip => !!c);
      if (
        next.length !== list.length ||
        next.every((c, i) => c.id === list[i].id)
      ) {
        return;
      }
      pushHistory();
      clipsRef.current = next;
      setClips(next);
    },
    [pushHistory],
  );

  /** "+" tile → native chooser (action sheet on iOS, dialog on Android). */
  const openAddClipChooser = useCallback(() => {
    dismissKeyboard();
    const blocked = clipAddBlocker();
    if (blocked) {
      showBanner(t("trimVideo"), blocked, "warning", 3500);
      return;
    }
    const gallery = () => void addClipsFromGallery();
    const camera = () => void addClipFromCamera();
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          title: t("addClip"),
          options: [t("clipsGallery"), t("clipsCamera"), t("cancel")],
          cancelButtonIndex: 2,
        },
        (i) => {
          if (i === 0) gallery();
          else if (i === 1) camera();
        },
      );
      return;
    }
    Alert.alert(
      t("addClip"),
      undefined,
      [
        { text: t("cancel"), style: "cancel" },
        { text: t("clipsCamera"), onPress: camera },
        { text: t("clipsGallery"), onPress: gallery },
      ],
      { cancelable: true },
    );
  }, [
    addClipFromCamera,
    addClipsFromGallery,
    clipAddBlocker,
    dismissKeyboard,
    showBanner,
    t,
  ]);

  // ── Stickers ──────────────────────────────────────────────────────

  const addEmojiSticker = useCallback(
    (emoji: string) => {
      if (stickers.length >= MAX_EDITOR_STICKERS) {
        showBanner(
          t("stickers"),
          t("stickerLimitReached", { max: MAX_EDITOR_STICKERS }),
          "warning",
          3000,
        );
        return;
      }
      pushHistory();
      const sticker: EditorSticker = {
        id: makeClipId("sticker"),
        kind: "emoji",
        emoji,
        ...stickerSpawnPos(stickers.length),
        size: STICKER_SIZE_RANGE.emoji.initial,
        rotation: 0,
      };
      setStickers((prev) => [...prev, sticker]);
      setSelectedStickerId(sticker.id);
    },
    [pushHistory, showBanner, stickers.length, t],
  );

  const imageStickerCount = stickers.filter((s) => s.kind === "image").length;

  const addPhotoSticker = useCallback(async () => {
    dismissKeyboard();
    if (stickers.length >= MAX_EDITOR_STICKERS) {
      showBanner(
        t("stickers"),
        t("stickerLimitReached", { max: MAX_EDITOR_STICKERS }),
        "warning",
        3000,
      );
      return;
    }
    if (imageStickerCount >= MAX_IMAGE_STICKERS) {
      showBanner(
        t("stickers"),
        t("photoStickerLimitReached", { max: MAX_IMAGE_STICKERS }),
        "warning",
        3000,
      );
      return;
    }
    const hasPermission = await handleMediaLibraryPermission();
    if (!hasPermission) return;
    const snap = currentSnapshot();
    const count = stickers.length;
    setAddingSticker(true);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsMultipleSelection: false,
        quality: 1,
      });
      if (result.canceled || !result.assets?.[0]) return;
      const prepared = await prepareStickerImage(result.assets[0]);
      pushSnapshot(snap);
      const sticker: EditorSticker = {
        id: makeClipId("sticker"),
        kind: "image",
        uri: prepared.uri,
        aspect: prepared.width / Math.max(1, prepared.height),
        ...stickerSpawnPos(count),
        size: STICKER_SIZE_RANGE.image.initial,
        rotation: 0,
      };
      setStickers((prev) => [...prev, sticker]);
      setSelectedStickerId(sticker.id);
    } catch (error) {
      Logger.error("Add photo sticker failed:", error);
      showBanner(t("error"), t("failedToAddSticker"), "error", 3000);
    } finally {
      setAddingSticker(false);
    }
  }, [
    currentSnapshot,
    dismissKeyboard,
    imageStickerCount,
    pushSnapshot,
    showBanner,
    stickers.length,
    t,
  ]);

  const selectSticker = useCallback(
    (id: string | null) => {
      setSelectedStickerId(id);
      if (id) {
        dismissKeyboard();
        setActiveTool("sticker");
      }
    },
    [dismissKeyboard],
  );

  const beginStickerTransform = useCallback(() => {
    pushHistory();
  }, [pushHistory]);

  const commitStickerTransform = useCallback(
    (id: string, patch: StickerTransformPatch) => {
      setStickers((prev) =>
        prev.map((s) =>
          s.id === id
            ? {
                ...s,
                x: patch.x,
                y: patch.y,
                size: clampStickerSize(s.kind, patch.size),
                rotation: normalizeDegrees(patch.rotation),
              }
            : s,
        ),
      );
    },
    [],
  );

  const resizeSelectedSticker = useCallback(
    (size: number) => {
      if (!selectedStickerId) return;
      setStickers((prev) =>
        prev.map((s) =>
          s.id === selectedStickerId
            ? { ...s, size: clampStickerSize(s.kind, size) }
            : s,
        ),
      );
    },
    [selectedStickerId],
  );

  const rotateSelectedSticker = useCallback(
    (degrees: number) => {
      if (!selectedStickerId) return;
      pushHistory();
      setStickers((prev) =>
        prev.map((s) =>
          s.id === selectedStickerId
            ? { ...s, rotation: normalizeDegrees(s.rotation + degrees) }
            : s,
        ),
      );
    },
    [pushHistory, selectedStickerId],
  );

  const removeSelectedSticker = useCallback(() => {
    if (!selectedStickerId) return;
    pushHistory();
    setStickers((prev) => prev.filter((s) => s.id !== selectedStickerId));
    setSelectedStickerId(null);
  }, [pushHistory, selectedStickerId]);

  // ── Export → publish ──────────────────────────────────────────────

  /** Stop the engine and unload both players (iOS export can't share the file with AVPlayer). */
  const releasePlayers = useCallback(async () => {
    engineGenRef.current += 1;
    engineLoadingRef.current = true;
    preloadRef.current = null;
    try {
      players.forEach((p) => p.pause());
    } catch {}
    await Promise.all(
      players.map((p) => p.replaceAsync(null).catch(() => undefined)),
    );
    slotUriRef.current = [null, null];
  }, [players]);

  const restorePreview = useCallback(() => {
    void startAt(focusIndexRef.current ?? 0);
  }, [startAt]);

  const handleNextToPublish = useCallback(async () => {
    if (!project || exporting || clips.length === 0) return;

    // Over the limit (reel limit, or the auto reel source limit in save mode)
    const clipSeconds = totalMs / 1000;

    // Too short — normal reel (Next) and auto reel (Save) both need 3 s.
    // Small tolerance: phones report lengths a few ms off.
    if (clipSeconds < MIN_REEL_SECONDS - 0.05) {
      Alert.alert(
        t("reelTooShortTitle"),
        t("reelTooShortMessage", {
          min_seconds: MIN_REEL_SECONDS,
          length: formatVideoDuration(clipSeconds),
        }),
      );
      setActiveTool("trim");
      if (clips.length === 1) setEditingClipId(clips[0].id);
      return;
    }

    if (clipSeconds > maxSeconds + 0.05) {
      Alert.alert(
        t("reelTrimRequiredTitle"),
        isSaveMode && params.limitContext !== "reel"
          ? t("autoReelTrimRequiredMessage", {
              length: formatVideoDuration(clipSeconds),
              max: formatVideoDuration(maxSeconds),
            })
          : t("reelTrimRequiredMessage", {
              max_seconds: maxSeconds,
              clip_seconds: Math.round(clipSeconds),
            }),
      );
      setActiveTool("trim");
      // One clip: open its trimmer directly
      if (clips.length === 1) setEditingClipId(clips[0].id);
      return;
    }

    dismissKeyboard();
    setPlaying(false);
    playingRef.current = false;
    await releasePlayers();
    try {
      await musicSoundRef.current?.pauseAsync();
    } catch {}

    const single = clips.length === 1 ? clips[0] : null;
    const hasEdits =
      !single ||
      aspect !== "original" ||
      !!musicUri ||
      mutedClipCount > 0 ||
      !!overlayText.trim() ||
      stickers.length > 0 ||
      single.trimStartMs > 0 ||
      single.trimEndMs < single.sourceDurationMs;

    let videoUri = clips[0].uri;
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
        restorePreview();
        return;
      } finally {
        try {
          sub.remove();
        } catch {}
        setExporting(false);
        setExportProgress(0);
      }
    }
    if (isSaveMode && params.requestId) {
      // Keep a copy on the phone, then hand the file back — no publish here.
      let savedToGallery = false;
      if (hasEdits) {
        setSavingToGallery(true);
        savedToGallery = await saveLocalVideoToGallery(videoUri);
        setSavingToGallery(false);
      }
      deliverEditedVideo({
        requestId: params.requestId,
        uri: videoUri,
        fileName: hasEdits ? "edited-video.mp4" : fileName,
        mimeType,
        durationMs: Math.round(totalMs),
        width: hasEdits ? canvasSize.width : Math.round(videoSize.width),
        height: hasEdits ? canvasSize.height : Math.round(videoSize.height),
        edited: hasEdits,
        savedToGallery,
      });
      router.back();
      return;
    }

    // Reload (paused) so the preview is back if the user returns from publish.
    restorePreview();

    const clipDurationSeconds = Math.max(1, Math.round(totalMs / 1000));
    // Exported file has the canvas size; an untouched upload keeps the source size.
    const widthParam = hasEdits
      ? String(canvasSize.width)
      : params.width ||
        (videoSize.width > 0 ? String(Math.round(videoSize.width)) : undefined);
    const heightParam = hasEdits
      ? String(canvasSize.height)
      : params.height ||
        (videoSize.height > 0 ? String(Math.round(videoSize.height)) : undefined);

    router.push({
      pathname: "/(main)/publishReel" as any,
      params: {
        videoUri: encodeURIComponent(videoUri),
        mimeType,
        fileName,
        sourceType,
        durationSeconds: String(clipDurationSeconds),
        ...(widthParam ? { width: widthParam } : {}),
        ...(heightParam ? { height: heightParam } : {}),
      },
    });
  }, [
    aspect,
    params.limitContext,
    canvasSize.height,
    canvasSize.width,
    clips,
    dismissKeyboard,
    exporting,
    isSaveMode,
    maxSeconds,
    musicUri,
    mutedClipCount,
    overlayText,
    params.fileName,
    params.height,
    params.mimeType,
    params.requestId,
    params.width,
    project,
    releasePlayers,
    restorePreview,
    router,
    showBanner,
    sourceType,
    stickers.length,
    t,
    totalMs,
    videoSize.height,
    videoSize.width,
  ]);

  const toggleTool = useCallback(
    (tool: EditorTool) => {
      dismissKeyboard();
      const next = activeTool === tool ? null : tool;
      // Sticker selection only means something while the sticker tool is open.
      if (next !== "sticker") setSelectedStickerId(null);
      // Trim always opens on the clips overview.
      setEditingClipId(null);
      setActiveTool(next);
    },
    [activeTool, dismissKeyboard],
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

  const stickerFrame = useMemo(
    () => ({
      left: Math.max(0, (previewSize.width - frameSize.width) / 2),
      top: Math.max(0, (previewSize.height - frameSize.height) / 2),
      width: frameSize.width,
      height: frameSize.height,
    }),
    [frameSize.height, frameSize.width, previewSize.height, previewSize.width],
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

  const busy = exporting || savingToGallery;
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
    { key: "sticker", icon: "emoji-emotions", label: t("stickers") },
  ];

  const editingClipBudget = editingClip
    ? maxClipMs - (totalMs - clipLengthMs(editingClip))
    : 0;
  const badgeTotalMs =
    focusIndex != null && editingClip ? clipLengthMs(editingClip) : totalMs;
  const badgePrefix =
    focusIndex != null && clips.length > 1
      ? `${t("clipLabel", { index: editingIndex + 1, count: clips.length })} · `
      : "";

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
            {players.map((p, slot) => (
              <VideoView
                key={slot}
                player={p}
                style={[
                  styles.videoLayer,
                  { opacity: slot === activeSlot ? 1 : 0 },
                ]}
                // Multi-clip export aspect-fills every clip into the frame.
                contentFit={
                  aspect === "original" && clips.length === 1
                    ? "contain"
                    : "cover"
                }
                nativeControls={false}
                // TextureView respects opacity; SurfaceView ignores it on Android.
                surfaceType="textureView"
                pointerEvents="none"
              />
            ))}

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
                accessibilityRole="button"
                accessibilityLabel={playing ? t("pause") : t("play")}
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
                {badgePrefix}
                {formatMs(previewTimeMs)} / {formatMs(badgeTotalMs)}
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

      <StickerLayer
        stickers={stickers}
        selectedId={selectedSticker?.id ?? null}
        frame={stickerFrame}
        bottomInset={Math.max(dockHeight, 0) + keyboardHeight}
        editing={activeTool === "sticker"}
        disabled={busy}
        selectionColor={theme.selectCard}
        onSelect={selectSticker}
        onBeginTransform={beginStickerTransform}
        onCommit={commitStickerTransform}
      />

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
          style={[
            styles.nextBtn,
            (addingClips || addingSticker) && styles.topBtnDisabled,
          ]}
          onPress={() => {
            dismissKeyboard();
            void handleNextToPublish();
          }}
          disabled={busy || !project || addingClips || addingSticker}
          activeOpacity={0.85}
        >
          <Text style={styles.nextText}>
            {isSaveMode ? t("saveVideo") : t("exportAndUpload")}
          </Text>
        </TouchableOpacity>
      </View>
      {lengthOutOfRange ? (
        <View
          style={[
            styles.lengthNotice,
            { top: insets.top + moderateHeightScale(62) },
          ]}
          pointerEvents="none"
          accessibilityLiveRegion="polite"
        >
          <MaterialIcons
            name="content-cut"
            size={moderateWidthScale(16)}
            color={theme.orangeBrown}
          />
          <Text style={styles.lengthNoticeText}>
            {t("editorLengthRequired", {
              min: formatVideoDuration(MIN_REEL_SECONDS),
              max: formatVideoDuration(maxSeconds),
              length: formatVideoDuration(totalMs / 1000),
            })}
          </Text>
        </View>
      ) : null}
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
              {activeTool === "trim" && editingClip ? (
                <ClipEditor
                  clip={editingClip}
                  index={editingIndex}
                  count={clips.length}
                  frames={filmstrips[editingClip.uri]}
                  maxLengthMs={editingClipBudget}
                  playheadMs={playheadSourceMs}
                  disabled={busy}
                  onDone={() => setEditingClipId(null)}
                  onSplit={() => splitSelectedClip(editingClip.id)}
                  onToggleMute={() => toggleClipMuted(editingClip.id)}
                  onRemove={() => removeClip(editingClip.id)}
                  onTrimBegin={onTrimSlideStart}
                  onTrimChange={updateSelectedTrim}
                  onTrimEnd={onTrimSlideComplete}
                  onTrimMove={moveSelectedTrim}
                  onScrubBegin={onScrubBegin}
                  onScrub={onScrub}
                  onScrubEnd={onScrubEnd}
                />
              ) : null}

              {activeTool === "trim" && !editingClip ? (
                <>
                  <ClipTimeline
                    clips={clips}
                    thumbs={thumbs}
                    totalMs={totalMs}
                    maxMs={maxClipMs}
                    canAdd={
                      clips.length < MAX_EDITOR_CLIPS &&
                      maxClipMs - totalMs >= MIN_CLIP_MS
                    }
                    adding={addingClips}
                    disabled={busy}
                    formatMs={formatMs}
                    onOpen={setEditingClipId}
                    onAdd={openAddClipChooser}
                    onRemove={removeClip}
                    onMove={moveClip}
                    onReorder={reorderClips}
                  />
                  {maxClipMs - totalMs < MIN_CLIP_MS ? (
                    <Text style={styles.panelHint}>
                      {t("reelTrimMaxHint", { max_seconds: maxSeconds })}
                    </Text>
                  ) : null}
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
                      value={allClipsMuted}
                      onValueChange={setAllClipsMuted}
                      accessibilityLabel={t("muteOriginalAudio")}
                      disabled={busy}
                      trackColor={{
                        false: theme.white15,
                        true: theme.orangeBrown,
                      }}
                      thumbColor={theme.white}
                    />
                  </View>
                  {clips.length > 1 ? (
                    <Text style={styles.panelHint}>
                      {mutedClipCount > 0 && !allClipsMuted
                        ? t("clipsMutedCount", {
                            count: mutedClipCount,
                            total: clips.length,
                          })
                        : t("muteAllClipsHint")}
                    </Text>
                  ) : null}
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

              {activeTool === "sticker" ? (
                <StickerPanel
                  selected={selectedSticker}
                  canAdd={stickers.length < MAX_EDITOR_STICKERS}
                  canAddPhoto={imageStickerCount < MAX_IMAGE_STICKERS}
                  addingPhoto={addingSticker}
                  disabled={busy}
                  onAddEmoji={addEmojiSticker}
                  onAddPhoto={() => void addPhotoSticker()}
                  onSizeStart={pushHistory}
                  onSizeChange={resizeSelectedSticker}
                  onRotateBy={rotateSelectedSticker}
                  onRemove={removeSelectedSticker}
                />
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
            {savingToGallery
              ? t("savingVideo")
              : `${t("exportingVideo")} ${exportProgress}%`}
          </Text>
          <Text style={styles.progressHint}>{t("exportKeepAppOpen")}</Text>
        </View>
      ) : null}
    </View>
  );
}
