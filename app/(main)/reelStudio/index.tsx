import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
  type LayoutChangeEvent,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { CloseIcon, LeafLogo } from "@/assets/icons";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import * as ImagePicker from "expo-image-picker";
import { Image as ExpoImage } from "expo-image";
import Slider from "@react-native-community/slider";
import { Audio } from "expo-av";
import { useEvent } from "expo";
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
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
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
import StickerLayer, {
  type StickerTransformPatch,
} from "@/src/components/videoEditor/stickerLayer";
import StickerPanel from "@/src/components/videoEditor/stickerPanel";
import MusicLibrarySheet from "@/src/components/videoEditor/musicLibrarySheet";
import MusicTrimmer from "@/src/components/videoEditor/musicTrimmer";
import MusicCoverage from "@/src/components/videoEditor/musicCoverage";
import MusicSongChips from "@/src/components/videoEditor/musicSongChips";
import {
  MAX_MUSIC_SEGMENTS,
  MIN_MUSIC_PART_MS,
  buildMusicSchedule,
  musicCreditText,
  musicPartsTotalMs,
  musicSegmentOffsets,
  musicSlotAt,
  newMusicSegment,
  probeAudioDurationMs,
  segmentPart,
  splitMusicName,
  type MusicSegment,
  type MusicSlot,
} from "@/src/components/videoEditor/musicModel";
import AddClipSheet, {
  type AddClipSource,
} from "@/src/components/videoEditor/addClipSheet";
import {
  trackCredit,
  type DownloadedTrack,
} from "@/src/services/musicLibraryService";
import { deliverEditedVideo } from "@/src/components/videoEditor/editorHandoff";
import { saveLocalVideoToGallery } from "@/src/services/downloadMediaService";
import {
  IMAGE_CLIP_MAX_MS,
  IMAGE_CLIP_MIN_MS,
  MAX_EDITOR_CLIPS,
  MAX_EDITOR_STICKERS,
  MAX_IMAGE_STICKERS,
  MIN_CLIP_MS,
  STICKER_SIZE_RANGE,
  activeCuts,
  buildVideoTrackClips,
  clampStickerSize,
  clipLengthMs,
  clipOffsetMs,
  clipPlayRange,
  clipThumbnail,
  isImageClip,
  normalizeDegrees,
  prepareEditorClip,
  prepareImageClip,
  playToSourceMs,
  prepareStickerImage,
  skipCutAt,
  sourceFilmstrip,
  sourceToPlayMs,
  splitClip,
  stickerToOverlay,
  totalClipsMs,
  type EditorClip,
  type EditorSticker,
} from "@/src/components/videoEditor/editorModel";
import FlowHeader from "@/src/components/reelFlow/flowHeader";
import FlowFooter from "@/src/components/reelFlow/flowFooter";
import ExportOverlay from "@/src/components/reelFlow/exportOverlay";
import StudioTrimPanel from "@/src/components/reelFlow/studioTrimPanel";
import StudioPublishStep, {
  type StudioVideo,
} from "@/src/components/reelFlow/studioPublishStep";
import {
  FlowTitle,
  OptionRow,
  SectionLabel,
  SourceCard,
} from "@/src/components/reelFlow/flowParts";
import MediaTileGrid from "@/src/components/reelFlow/mediaTileGrid";

/**
 * Reel Studio — the step-by-step reel editor.
 *
 * Same editing as the full-screen editor (app/(main)/editVideo, kept as it
 * was): clips, trim / split / per-clip mute, frame, music, text, stickers,
 * undo and a single native export. Only the layout changed — one task per
 * screen with a clear Next button:
 *
 *   create: Add video → Trim → Style & edit → Preview → Publish
 *   save:   Trim → Style & edit → Save (hands the file back to the opener,
 *           e.g. AI auto reel source or a template slot)
 *
 * Back goes one step back and keeps every choice.
 */

type StudioStep = "upload" | "trim" | "style" | "preview" | "publish";
type StyleTool = "style" | "music" | "text";
type AspectPreset = "original" | "portrait" | "square" | "landscape";
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
  /** Songs, played one after another over the reel. */
  musicTracks: MusicSegment[];
  /** Song that repeats to fill the rest of the reel; null = none. */
  musicRepeatId: string | null;
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

/** Finished file for Preview / Publish, tied to the edit it was made from. */
type ExportedReel = StudioVideo & {
  /** Project signature — unchanged edits reuse the export. */
  key: string;
  edited: boolean;
};

/** Name / type of each picked file (for the "Selected video" list and upload). */
type ClipMeta = { name: string | null; mimeType: string | null };

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

const FRAME_OPTIONS: {
  key: AspectPreset;
  labelKey: string;
  icon: keyof typeof MaterialIcons.glyphMap;
}[] = [
  { key: "original", labelKey: "flowFrameOriginal", icon: "crop-original" },
  { key: "portrait", labelKey: "flowFramePortrait", icon: "crop-portrait" },
  { key: "square", labelKey: "flowFrameSquare", icon: "crop-square" },
  { key: "landscape", labelKey: "flowFrameLandscape", icon: "crop-landscape" },
];

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
    .replace(/[‘’′]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/…/g, "...")
    .replace(/ /g, " ")
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

/** Upload type for an untouched original, from the picker or the file name. */
function videoMimeFor(meta: ClipMeta | undefined, uri: string): string {
  if (meta?.mimeType && meta.mimeType.startsWith("video/")) return meta.mimeType;
  const ext = (meta?.name || uri).split("?")[0].split(".").pop()?.toLowerCase();
  if (ext === "mov") return "video/quicktime";
  if (ext === "m4v") return "video/x-m4v";
  if (ext === "webm") return "video/webm";
  return "video/mp4";
}

const createStyles = (theme: Theme, compact: boolean) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: theme.background },
    flex: { flex: 1 },
    center: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      padding: moderateWidthScale(24),
      gap: moderateHeightScale(16),
    },
    centerLabel: {
      fontSize: fontSize.size17,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
      textAlign: "center",
    },
    pad: {
      paddingHorizontal: moderateWidthScale(20),
    },
    uploadContent: {
      paddingHorizontal: moderateWidthScale(20),
      paddingTop: moderateHeightScale(10),
      paddingBottom: moderateHeightScale(24),
      gap: moderateHeightScale(16),
    },
    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: theme.borderNormal,
      marginVertical: moderateHeightScale(4),
    },
    editTitle: {
      paddingHorizontal: moderateWidthScale(20),
      paddingTop: moderateHeightScale(compact ? 2 : 6),
      paddingBottom: moderateHeightScale(compact ? 8 : 12),
    },
    previewWrap: {
      flex: 1,
      minHeight: heightScale(compact ? 96 : 120),
      paddingHorizontal: moderateWidthScale(20),
    },
    previewCard: {
      flex: 1,
      borderRadius: moderateWidthScale(22),
      backgroundColor: theme.darkGreen,
      overflow: "hidden",
      alignItems: "center",
      justifyContent: "center",
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
    photoLayer: {
      backgroundColor: theme.black,
    },
    playOverlay: {
      ...StyleSheet.absoluteFillObject,
      alignItems: "center",
      justifyContent: "center",
      zIndex: 2,
    },
    playCircle: {
      width: widthScale(74),
      height: widthScale(74),
      borderRadius: widthScale(37),
      backgroundColor: "rgba(0, 0, 0, 0.45)",
      alignItems: "center",
      justifyContent: "center",
    },
    textLayer: {
      ...StyleSheet.absoluteFillObject,
      zIndex: 25,
    },
    textOverlay: {
      position: "absolute",
      maxWidth: "90%",
      paddingHorizontal: moderateWidthScale(12),
      paddingVertical: moderateHeightScale(8),
      zIndex: 10,
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
    badge: {
      position: "absolute",
      bottom: moderateHeightScale(10),
      right: moderateWidthScale(10),
      paddingHorizontal: moderateWidthScale(12),
      paddingVertical: moderateHeightScale(5),
      borderRadius: moderateWidthScale(12),
      backgroundColor: "rgba(0, 0, 0, 0.6)",
      zIndex: 30,
    },
    badgeText: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontBold,
      color: theme.white,
      fontVariant: ["tabular-nums"],
    },
    clipPill: {
      position: "absolute",
      top: moderateHeightScale(10),
      left: moderateWidthScale(10),
      paddingHorizontal: moderateWidthScale(12),
      paddingVertical: moderateHeightScale(5),
      borderRadius: moderateWidthScale(12),
      backgroundColor: "rgba(0, 0, 0, 0.6)",
      zIndex: 30,
    },
    undoBtn: {
      position: "absolute",
      top: moderateHeightScale(10),
      right: moderateWidthScale(10),
      height: widthScale(44),
      paddingHorizontal: moderateWidthScale(14),
      borderRadius: widthScale(22),
      backgroundColor: "rgba(0, 0, 0, 0.6)",
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(4),
      zIndex: 30,
    },
    undoText: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontBold,
      color: theme.white,
    },
    trimArea: {
      paddingHorizontal: moderateWidthScale(20),
      paddingTop: moderateHeightScale(compact ? 8 : 12),
      paddingBottom: moderateHeightScale(compact ? 4 : 6),
      gap: moderateHeightScale(compact ? 8 : 12),
    },
    rows: {
      paddingHorizontal: moderateWidthScale(20),
      paddingTop: moderateHeightScale(compact ? 10 : 14),
      // Room for the last card's edge + shadow above the footer
      paddingBottom: moderateHeightScale(compact ? 6 : 10),
      gap: moderateHeightScale(compact ? 8 : 10),
    },
    // ── Dark tool sheet (Style / Music / Text) — same surface as the
    // editor's music library and add-clip sheets.
    sheet: {
      marginTop: moderateHeightScale(12),
      backgroundColor: theme.darkGreen,
      borderTopLeftRadius: moderateWidthScale(24),
      borderTopRightRadius: moderateWidthScale(24),
      paddingTop: moderateHeightScale(8),
    },
    sheetHandle: {
      alignSelf: "center",
      width: widthScale(42),
      height: 4,
      borderRadius: 2,
      backgroundColor: theme.white15,
    },
    sheetHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: moderateWidthScale(18),
      paddingTop: moderateHeightScale(8),
      paddingBottom: moderateHeightScale(6),
      gap: moderateWidthScale(10),
    },
    sheetTitle: {
      flex: 1,
      fontSize: fontSize.size20,
      fontFamily: fonts.fontBold,
      color: theme.white,
    },
    sheetDone: {
      minHeight: heightScale(44),
      paddingHorizontal: moderateWidthScale(22),
      borderRadius: heightScale(22),
      backgroundColor: theme.orangeBrown,
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(6),
    },
    sheetDoneText: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    sheetBody: {
      paddingHorizontal: moderateWidthScale(18),
      paddingTop: moderateHeightScale(6),
      paddingBottom: moderateHeightScale(10),
      gap: moderateHeightScale(12),
    },
    sheetSection: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontBold,
      color: theme.white,
    },
    sheetHint: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.white70,
      lineHeight: fontSize.size19,
    },
    sheetDivider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: theme.white15,
      marginVertical: moderateHeightScale(2),
    },
    frameGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: moderateWidthScale(10),
    },
    frameTile: {
      flexBasis: "47%",
      flexGrow: 1,
      minHeight: heightScale(56),
      borderRadius: moderateWidthScale(14),
      borderWidth: 1.5,
      borderColor: theme.white15,
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(10),
      paddingHorizontal: moderateWidthScale(14),
    },
    frameTileActive: {
      backgroundColor: theme.orangeBrown,
      borderColor: theme.orangeBrown,
    },
    frameLabel: {
      flexShrink: 1,
      fontSize: fontSize.size16,
      fontFamily: fonts.fontBold,
      color: theme.white,
    },
    frameLabelActive: { color: theme.darkGreen },
    musicCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(12),
      minHeight: heightScale(60),
      paddingVertical: moderateHeightScale(8),
      paddingHorizontal: moderateWidthScale(14),
      borderRadius: moderateWidthScale(14),
      backgroundColor: theme.white15,
    },
    musicCardInfo: { flex: 1, minWidth: 0 },
    musicAddCard: {
      paddingVertical: 0,
      paddingHorizontal: 0,
      gap: 0,
      overflow: "hidden",
    },
    musicAddMain: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(12),
      minHeight: heightScale(64),
      paddingHorizontal: moderateWidthScale(14),
    },
    musicAddDivider: {
      width: StyleSheet.hairlineWidth,
      alignSelf: "stretch",
      marginVertical: moderateHeightScale(12),
      backgroundColor: theme.white50,
    },
    musicPhoneBtn: {
      minWidth: widthScale(76),
      minHeight: heightScale(64),
      alignItems: "center",
      justifyContent: "center",
      gap: moderateHeightScale(2),
      paddingHorizontal: moderateWidthScale(10),
    },
    musicPhoneText: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontMedium,
      color: theme.white70,
    },
    musicTitleRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    musicCancelText: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontBold,
      color: theme.orangeBrown,
    },
    musicCardTitle: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontBold,
      color: theme.white,
    },
    musicCardSub: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.white70,
    },
    iconHit: {
      width: widthScale(44),
      height: widthScale(44),
      alignItems: "center",
      justifyContent: "center",
    },
    label: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontMedium,
      color: theme.white,
    },
    rowBetween: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      minHeight: heightScale(48),
    },
    textInputWrap: {
      position: "relative",
      justifyContent: "center",
    },
    textInput: {
      minHeight: heightScale(54),
      borderWidth: 1,
      borderColor: theme.white15,
      borderRadius: moderateWidthScale(14),
      paddingLeft: moderateWidthScale(16),
      paddingRight: moderateWidthScale(46),
      paddingVertical: moderateHeightScale(12),
      fontSize: fontSize.size17,
      fontFamily: fonts.fontRegular,
      color: theme.white,
      backgroundColor: theme.black,
    },
    textInputClear: {
      position: "absolute",
      right: moderateWidthScale(4),
      top: 0,
      bottom: 0,
      width: widthScale(40),
      justifyContent: "center",
      alignItems: "center",
      zIndex: 2,
    },
    textColorBar: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(10),
    },
    segment: {
      flexDirection: "row",
      backgroundColor: theme.black,
      borderRadius: moderateWidthScale(12),
      padding: moderateWidthScale(3),
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.white15,
    },
    segmentBtn: {
      minWidth: widthScale(44),
      height: heightScale(40),
      borderRadius: moderateWidthScale(9),
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: moderateWidthScale(8),
    },
    segmentBtnActive: {
      backgroundColor: theme.buttonBack,
    },
    segmentLabel: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontBold,
      color: theme.white,
      opacity: 0.75,
    },
    segmentLabelActive: {
      opacity: 1,
      color: theme.buttonText,
    },
    colorTrack: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(10),
      paddingVertical: moderateHeightScale(4),
      paddingRight: moderateWidthScale(6),
    },
    colorDot: {
      width: widthScale(34),
      height: widthScale(34),
      borderRadius: widthScale(17),
      borderWidth: 2,
      borderColor: theme.white15,
    },
    colorDotActive: {
      borderColor: theme.orangeBrown,
      borderWidth: 3,
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
      height: 2,
      backgroundColor: theme.red,
      transform: [{ rotate: "-45deg" }],
    },
    textStyleBar: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: moderateWidthScale(10),
    },
    formatRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(8),
    },
    formatBtn: {
      width: widthScale(48),
      height: heightScale(46),
      borderRadius: moderateWidthScale(12),
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.black,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.white15,
    },
    formatBtnActive: {
      backgroundColor: theme.buttonBack,
      borderColor: theme.buttonBack,
    },
    exportedWrap: {
      flex: 1,
      paddingHorizontal: moderateWidthScale(20),
      paddingBottom: moderateHeightScale(4),
    },
    exportedArea: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    exportedCard: {
      borderRadius: moderateWidthScale(24),
      overflow: "hidden",
      backgroundColor: theme.black,
    },
    exportedBar: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: moderateWidthScale(14),
      paddingVertical: moderateHeightScale(10),
      backgroundColor: "rgba(0, 0, 0, 0.45)",
    },
    exportedTime: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontBold,
      color: theme.white,
      fontVariant: ["tabular-nums"],
    },
    brandMark: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(5),
    },
    brandText: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontMedium,
      color: theme.white,
      letterSpacing: 0.8,
    },
  });

/** Plays the exported reel (Preview step): tap to play / pause. */
function ExportedPreview({
  uri,
  ratio,
  styles,
  theme,
}: {
  uri: string;
  ratio: number;
  styles: ReturnType<typeof createStyles>;
  theme: Theme;
}) {
  const { t } = useTranslation();
  const [area, setArea] = useState({ width: 0, height: 0 });
  const [timeMs, setTimeMs] = useState(0);
  const player = useVideoPlayer(uri, (p) => {
    p.loop = true;
    p.timeUpdateEventInterval = 0.25;
  });
  const { isPlaying } = useEvent(player, "playingChange", {
    isPlaying: player.playing,
  });
  useEffect(() => {
    const sub = player.addListener("timeUpdate", ({ currentTime }) => {
      setTimeMs(Math.max(0, currentTime * 1000));
    });
    return () => sub.remove();
  }, [player]);

  const durationMs = Math.max(0, (player.duration || 0) * 1000);
  const frame = fitFrame(area.width, area.height, ratio > 0 ? ratio : 9 / 16);

  return (
    <View
      style={styles.exportedArea}
      onLayout={(e) => {
        const { width, height } = e.nativeEvent.layout;
        setArea({ width: Math.round(width), height: Math.round(height) });
      }}
    >
      {frame.width > 0 ? (
        <Pressable
          style={[styles.exportedCard, { width: frame.width, height: frame.height }]}
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
          {!isPlaying ? (
            <View style={styles.playOverlay} pointerEvents="none">
              <View style={styles.playCircle}>
                <MaterialIcons
                  name="play-arrow"
                  size={moderateWidthScale(44)}
                  color={theme.white}
                />
              </View>
            </View>
          ) : null}
          <View style={styles.exportedBar} pointerEvents="none">
            <Text style={styles.exportedTime}>
              {formatMs(timeMs)} / {formatMs(durationMs)}
            </Text>
            <View style={styles.brandMark}>
              <LeafLogo
                width={moderateWidthScale(14)}
                height={moderateWidthScale(17)}
                color1={theme.orangeBrown}
                color2={theme.white}
              />
              <Text style={styles.brandText}>{t("freshPass")}</Text>
            </View>
          </View>
        </Pressable>
      ) : (
        <ActivityIndicator color={theme.buttonBack} />
      )}
    </View>
  );
}

export default function ReelStudioScreen() {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const { height: windowHeight } = useWindowDimensions();
  const compact = windowHeight < 720;
  const styles = useMemo(() => createStyles(theme, compact), [theme, compact]);
  const { t } = useTranslation();
  const router = useRouter();
  const navigation = useNavigation();
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
    /** "save" → trim + edit, export, save to gallery and hand back to the opener. */
    mode?: string;
    requestId?: string;
    /** "reel" → save mode for a reel-length clip (template slots), not auto reel */
    limitContext?: string;
    /** Header title of the flow that opened the studio (e.g. "AI auto reel"). */
    flowTitle?: string;
    /** Step numbers of the opener's flow: first studio step and total. */
    stepStart?: string;
    stepTotal?: string;
    /** "1" → every studio step shows `stepStart` (a sub-step of the opener). */
    stepFixed?: string;
  }>();

  const isSaveMode = params.mode === "save" && !!params.requestId;
  // Save mode for an AI auto reel source (3 min) vs a template slot (reel length)
  const isAutoSource = isSaveMode && params.limitContext !== "reel";

  const paramUri = params.uri ? decodeURIComponent(params.uri) : "";
  const sourceType = (
    params.sourceType === "camera" ? "camera" : "device"
  ) as MediaUploadSourceType;
  const paramMaxSeconds = Number(params.maxSeconds);
  const initialMaxSeconds =
    Number.isFinite(paramMaxSeconds) && paramMaxSeconds > 0
      ? paramMaxSeconds
      : getCachedMediaLimits()?.max_seconds ?? REEL_LIMIT_FALLBACK.max_seconds;

  const steps = useMemo<StudioStep[]>(
    () =>
      isSaveMode
        ? ["trim", "style"]
        : ["upload", "trim", "style", "preview", "publish"],
    [isSaveMode],
  );
  // A video handed in (save mode / Media Library) starts at Trim
  const [step, setStep] = useState<StudioStep>(() =>
    isSaveMode || paramUri ? "trim" : "upload",
  );
  const [styleTool, setStyleTool] = useState<StyleTool | null>(null);
  const [exported, setExported] = useState<ExportedReel | null>(null);
  const [published, setPublished] = useState(false);
  const [publishBusy, setPublishBusy] = useState(false);
  const publishAbortRef = useRef<(() => void) | null>(null);

  const [clips, setClips] = useState<EditorClip[]>([]);
  const [clipMeta, setClipMeta] = useState<Record<string, ClipMeta>>({});
  /** Clip open in the Trim step (one is always picked there). */
  const [editingClipId, setEditingClipId] = useState<string | null>(null);
  const [thumbs, setThumbs] = useState<Record<string, string | null>>({});
  /** Trimmer frames per source file (split clips share one). */
  const [filmstrips, setFilmstrips] = useState<
    Record<string, (string | null)[]>
  >({});
  const [addingClips, setAddingClips] = useState(false);
  /** Which "Add video" card is picking (its icon shows the spinner). */
  const [pickingFrom, setPickingFrom] = useState<"gallery" | "camera" | null>(
    null,
  );
  const [loadingInfo, setLoadingInfo] = useState(!!paramUri);
  const [maxSeconds, setMaxSeconds] = useState(initialMaxSeconds);
  const [aspect, setAspect] = useState<AspectPreset>("original");
  const [musicTracks, setMusicTracks] = useState<MusicSegment[]>([]);
  /** Song that repeats after the others to fill the reel; null = none. */
  const [musicRepeatId, setMusicRepeatId] = useState<string | null>(null);
  const [selectedMusicId, setSelectedMusicId] = useState<string | null>(null);
  /** Picking a song: "add" = a new one at the end, "replace" = swap the selected one. */
  const [musicPickMode, setMusicPickMode] = useState<"add" | "replace" | null>(
    null,
  );
  const [musicLibraryOpen, setMusicLibraryOpen] = useState(false);
  const selectedMusicIdRef = useRef(selectedMusicId);
  selectedMusicIdRef.current = selectedMusicId;
  const musicPickModeRef = useRef(musicPickMode);
  musicPickModeRef.current = musicPickMode;
  const musicTracksRef = useRef(musicTracks);
  musicTracksRef.current = musicTracks;
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
  const [previewTimeMs, setPreviewTimeMs] = useState(0);
  const [previewSize, setPreviewSize] = useState({ width: 0, height: 0 });
  const [history, setHistory] = useState<EditorSnapshot[]>([]);
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [savingToGallery, setSavingToGallery] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [activeSlot, setActiveSlot] = useState<PlayerSlot>(0);

  const trimHistoryPushedRef = useRef(false);
  const textHistoryPushedRef = useRef(false);
  const textInputRef = useRef<TextInput>(null);

  // Live preview only runs on the Trim and Style steps.
  const engineVisible = step === "trim" || step === "style";
  const engineVisibleRef = useRef(engineVisible);
  engineVisibleRef.current = engineVisible;
  const previewReady = clips.length > 0;

  const maxClipMs = Math.max(MIN_CLIP_MS, Math.round(maxSeconds * 1000));
  const totalMs = totalClipsMs(clips);
  const totalMsRef = useRef(totalMs);
  totalMsRef.current = totalMs;
  // Photos have no sound — mute state only counts videos.
  const videoClipCount = clips.filter((c) => !isImageClip(c)).length;
  const mutedClipCount = clips.filter((c) => c.muted && !isImageClip(c)).length;
  /** "Mute original audio" (Music panel) = every clip's own sound is off. */
  const allClipsMuted = videoClipCount > 0 && mutedClipCount === videoClipCount;
  const editingIndex = clips.findIndex((c) => c.id === editingClipId);
  const editingClip: EditorClip | null =
    editingIndex >= 0 ? clips[editingIndex] : null;
  const selectedSticker =
    stickers.find((s) => s.id === selectedStickerId) ?? null;
  // Trim step previews only the clip being trimmed; Style plays the whole reel.
  const focusIndex = step === "trim" && editingClip ? editingIndex : null;

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
  /** Photo clip on screen (preview players are paused while it shows). */
  const [activeImageUri, setActiveImageUri] = useState<string | null>(null);
  const imageActiveRef = useRef(false);
  /** Ms of the current photo clip already shown. */
  const imageElapsedRef = useRef(0);
  const [addClipOpen, setAddClipOpen] = useState(false);
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
      musicTracks,
      musicRepeatId,
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
      musicRepeatId,
      musicTracks,
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
        last.musicTracks === snap.musicTracks &&
        last.musicRepeatId === snap.musicRepeatId &&
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
      setMusicTracks(snap.musicTracks);
      setMusicRepeatId(snap.musicRepeatId);
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
    if (Number.isFinite(paramMaxSeconds) && paramMaxSeconds > 0) {
      setMaxSeconds(paramMaxSeconds);
      return;
    }
    void getMediaLimits()
      .then((limits) => {
        if (!cancelled) setMaxSeconds(limits.max_seconds);
      })
      .catch((error) => {
        Logger.error("Failed to load media limits for studio:", error);
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

  // Video handed in by the opener (save mode / Media Library)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!paramUri) return;
      const clipCap = Math.max(
        MIN_CLIP_MS,
        Math.round(
          (Number.isFinite(paramMaxSeconds) && paramMaxSeconds > 0
            ? paramMaxSeconds
            : getCachedMediaLimits()?.max_seconds ??
              REEL_LIMIT_FALLBACK.max_seconds) * 1000,
        ),
      );
      const meta: ClipMeta = {
        name: params.fileName || null,
        mimeType: params.mimeType || null,
      };
      try {
        const first = await prepareEditorClip({
          uri: paramUri,
          fileName: params.fileName,
          sourceType,
          // Whole video loaded; a longer one starts with a window of the
          // allowed length that the user slides to their best moment.
          budgetMs: clipCap,
        });
        if (cancelled) return;
        clipsRef.current = [first];
        setClips([first]);
        setClipMeta({ [first.id]: meta });
        setEditingClipId(first.id);
        setAspect("original");
        setPlaying(true);
        loadThumbnail(first);
      } catch (error) {
        Logger.error("prepare video for studio failed:", error);
        if (!cancelled) {
          // Keep "use as-is" possible even when metadata can't be read.
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
          setClipMeta({ [fallback.id]: meta });
          setEditingClipId(fallback.id);
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
      // Photos don't use a player — nothing to preload.
      if (!clip || isImageClip(clip)) return;
      const slot = otherSlot(activeSlotRef.current);
      try {
        players[slot].pause();
        await ensureSlotSource(slot, clip.uri);
        if (gen !== engineGenRef.current) return;
        players[slot].pause();
        players[slot].currentTime = clipPlayRange(clip).startMs / 1000;
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
      if (isImageClip(clip)) {
        try {
          players.forEach((pl) => pl.pause());
        } catch {}
        activeIndexRef.current = index;
        imageActiveRef.current = true;
        imageElapsedRef.current = 0;
        setActiveImageUri(clip.uri);
        engineLoadingRef.current = false;
        setPreviewTimeMs(
          focusIndexRef.current != null ? 0 : clipOffsetMs(list, index),
        );
        void preloadNext(gen);
        return;
      }
      imageActiveRef.current = false;
      setActiveImageUri(null);
      engineLoadingRef.current = true;
      try {
        players[otherSlot(slot)].pause();
        await ensureSlotSource(slot, clip.uri);
        if (gen !== engineGenRef.current) return;
        activeIndexRef.current = index;
        p.currentTime = clipPlayRange(clip).startMs / 1000;
        p.muted = !!clip.muted;
        slotClipIdRef.current[slot] = clip.id;
        if (playingRef.current && engineVisibleRef.current) p.play();
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
      if (isImageClip(clip)) {
        imageElapsedRef.current = 0;
        setPreviewTimeMs(0);
        return;
      }
      try {
        players[slot].currentTime = clipPlayRange(clip).startMs / 1000;
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
      imageActiveRef.current = false;
      setActiveImageUri(null);
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
            scrubbingRef.current ||
            imageActiveRef.current
          ) {
            return;
          }
          const list = clipsRef.current;
          const idx = activeIndexRef.current;
          const clip = list[idx];
          if (!clip) return;
          const ms = Math.max(0, currentTime * 1000);
          const range = clipPlayRange(clip);
          if (ms >= range.endMs - 40) {
            advance();
            return;
          }
          if (ms < range.startMs - 40) {
            try {
              p.currentTime = range.startMs / 1000;
            } catch {}
            return;
          }
          // Hop over parts removed with Cut (export leaves them out exactly)
          const resumeAt = skipCutAt(clip, ms, 60);
          if (resumeAt != null) {
            try {
              p.currentTime = resumeAt / 1000;
            } catch {}
            return;
          }
          const local = sourceToPlayMs(clip, ms);
          setPreviewTimeMs(
            focusIndexRef.current != null
              ? local
              : clipOffsetMs(list, idx) + local,
          );
        }),
        p.addListener("playToEnd", () => {
          if (
            slot !== activeSlotRef.current ||
            engineLoadingRef.current ||
            imageActiveRef.current
          ) {
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

  // Leaving the live preview (Add video / Preview / Publish) stops it.
  useEffect(() => {
    if (!engineVisible) setPlaying(false);
  }, [engineVisible]);

  // Play / pause
  useEffect(() => {
    try {
      players[otherSlot(activeSlot)].pause();
      if (activeImageUri || !engineVisible) {
        players[activeSlot].pause();
      } else if (playing && !engineLoadingRef.current) {
        players[activeSlot].play();
      } else if (!playing) {
        players[activeSlot].pause();
      }
    } catch {}
  }, [activeImageUri, activeSlot, engineVisible, players, playing]);

  // Photo clip clock: no player drives time, so tick the playhead here.
  useEffect(() => {
    if (!activeImageUri || !playing) return;
    let last = Date.now();
    const id = setInterval(() => {
      if (scrubbingRef.current || !imageActiveRef.current) return;
      const now = Date.now();
      imageElapsedRef.current += now - last;
      last = now;
      const list = clipsRef.current;
      const idx = activeIndexRef.current;
      const clip = list[idx];
      if (!clip || !isImageClip(clip)) return;
      const elapsed = imageElapsedRef.current;
      if (elapsed >= clipLengthMs(clip)) {
        advance();
        return;
      }
      setPreviewTimeMs(
        focusIndexRef.current != null ? elapsed : clipOffsetMs(list, idx) + elapsed,
      );
    }, 100);
    return () => clearInterval(id);
  }, [activeImageUri, advance, playing]);

  // (Re)start playback when the clip list / trims / focus change.
  const clipsKey = clips
    .map(
      (c) =>
        `${c.id}:${c.uri}:${c.trimStartMs}:${c.trimEndMs}:` +
        activeCuts(c)
          .map((cut) => `${cut.startMs}-${cut.endMs}`)
          .join(","),
    )
    .join("|");
  useEffect(() => {
    if (!previewReady || scrubbingRef.current) return;
    if (clipsRef.current.length === 0) return;
    // Trim loops the picked clip; Style plays the reel from the top.
    void startAt(focusIndex ?? 0);
  }, [clipsKey, focusIndex, previewReady, startAt]);

  // Trim step always has a clip picked (first one by default).
  useEffect(() => {
    if (step !== "trim" || clips.length === 0) return;
    if (!editingClipId || !clips.some((c) => c.id === editingClipId)) {
      setEditingClipId(clips[0].id);
    }
  }, [clips, editingClipId, step]);

  const scrubTo = useCallback(
    (ms: number) => {
      try {
        players[activeSlotRef.current].currentTime = Math.max(0, ms) / 1000;
      } catch {}
    },
    [players],
  );

  /**
   * Move one trim handle of the selected clip. No length limit here —
   * Next checks the final reel and says what to fix.
   */
  const updateSelectedTrim = useCallback(
    (edge: "start" | "end", value: number) => {
      const list = clipsRef.current;
      const idx = list.findIndex((c) => c.id === editingClipIdRef.current);
      const clip = list[idx];
      if (!clip) return;
      let next: EditorClip;
      if (edge === "start") {
        const start = Math.round(
          Math.min(
            Math.max(value, 0),
            Math.max(0, clip.trimEndMs - MIN_CLIP_MS),
          ),
        );
        if (start === clip.trimStartMs) return;
        next = { ...clip, trimStartMs: start };
        scrubTo(start);
      } else {
        const end = Math.round(
          Math.max(
            Math.min(value, clip.sourceDurationMs),
            Math.min(clip.sourceDurationMs, clip.trimStartMs + MIN_CLIP_MS),
          ),
        );
        if (end === clip.trimEndMs) return;
        next = { ...clip, trimEndMs: end };
        scrubTo(Math.max(clip.trimStartMs, end - 60));
      }
      // Don't let the window close in on a cut so nothing is left to play
      if (clipLengthMs(next) < MIN_CLIP_MS) return;
      const updated = [...list];
      updated[idx] = next;
      clipsRef.current = updated;
      setClips(updated);
    },
    [scrubTo],
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

  /** Slide the selected clip's trim window (bounds come in SOURCE ms). */
  const moveSelectedTrim = useCallback(
    (startMs: number, endMs: number) => {
      const list = clipsRef.current;
      const idx = list.findIndex((c) => c.id === editingClipIdRef.current);
      const clip = list[idx];
      if (!clip) return;
      const start = Math.round(Math.max(0, startMs));
      const end = Math.round(Math.min(clip.sourceDurationMs, endMs));
      if (start === clip.trimStartMs && end === clip.trimEndMs) return;
      const moved = { ...clip, trimStartMs: start, trimEndMs: end };
      if (clipLengthMs(moved) < MIN_CLIP_MS) return;
      const updated = [...list];
      updated[idx] = moved;
      clipsRef.current = updated;
      setClips(updated);
      scrubTo(start);
    },
    [scrubTo],
  );

  const onTrimSlideStart = useCallback(() => {
    dismissKeyboard();
    if (!trimHistoryPushedRef.current) {
      pushHistory();
      trimHistoryPushedRef.current = true;
    }
    scrubbingRef.current = true;
    setPlaying(false);
  }, [dismissKeyboard, pushHistory]);

  const onTrimSlideComplete = useCallback(() => {
    trimHistoryPushedRef.current = false;
    scrubbingRef.current = false;
    playingRef.current = true;
    setPlaying(true);
    void startAt(focusIndexRef.current ?? 0);
  }, [startAt]);

  // Playhead in SOURCE ms of the clip open in the Trim step.
  const playheadSourceMs =
    editingClip && focusIndex != null
      ? playToSourceMs(editingClip, previewTimeMs)
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
      setPreviewTimeMs(sourceToPlayMs(clip, ms));
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
      setClipMeta((prev) => ({ ...prev, [parts[1].id]: prev[clip.id] ?? { name: null, mimeType: null } }));
      loadThumbnail(parts[1]);
      // First half stays picked; both halves now show in the clips row.
      showBanner(t("splitClip"), t("clipSplitDone"), "success", 2500);
    },
    [loadThumbnail, playheadSourceMs, pushHistory, showBanner, t],
  );

  /** "Reset": the whole clip again (trim + removed parts undone). */
  const resetClip = useCallback(
    (id: string) => {
      const list = clipsRef.current;
      const index = list.findIndex((c) => c.id === id);
      const clip = list[index];
      if (!clip || isImageClip(clip)) return;
      pushHistory();
      const updated = [...list];
      updated[index] = {
        ...clip,
        trimStartMs: 0,
        trimEndMs: clip.sourceDurationMs,
        cuts: undefined,
      };
      clipsRef.current = updated;
      setClips(updated);
    },
    [pushHistory],
  );

  // Load trimmer frames for the open clip's file (once per file).
  const selectedUri = editingClip?.uri;
  const selectedSourceMs = editingClip?.sourceDurationMs ?? 0;
  const selectedIsImage = !!editingClip && isImageClip(editingClip);
  useEffect(() => {
    if (step !== "trim" || !selectedUri || exporting) return;
    if (selectedIsImage) return;
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
  }, [step, exporting, filmstrips, selectedIsImage, selectedSourceMs, selectedUri]);

  // ── Background music: songs back to back over the reel ─────────────
  const musicSchedule = useMemo(
    () => buildMusicSchedule(musicTracks, totalMs, musicRepeatId),
    [musicRepeatId, musicTracks, totalMs],
  );
  const musicPartsMs = useMemo(
    () => musicPartsTotalMs(musicTracks, totalMs),
    [musicTracks, totalMs],
  );
  const selectedMusicIndex = Math.max(
    0,
    musicTracks.findIndex((m) => m.id === selectedMusicId),
  );
  const selectedMusic: MusicSegment | null = musicTracks[selectedMusicIndex] ?? null;
  // Selected song gone (undo / delete) → select the first one again.
  useEffect(() => {
    if (musicTracks.length === 0) {
      if (selectedMusicId) setSelectedMusicId(null);
    } else if (!musicTracks.some((m) => m.id === selectedMusicId)) {
      setSelectedMusicId(musicTracks[0].id);
    }
  }, [musicTracks, selectedMusicId]);
  // Reel playhead (Trim step → that clip's place in the reel)
  const reelPlayheadMs =
    focusIndex != null ? clipOffsetMs(clips, focusIndex) + previewTimeMs : previewTimeMs;

  const musicSoundsRef = useRef<Map<string, Audio.Sound>>(new Map());
  const musicScheduleRef = useRef<MusicSlot[]>(musicSchedule);
  musicScheduleRef.current = musicSchedule;
  const activeMusicSlotRef = useRef<MusicSlot | null>(null);
  const reelPlayheadRef = useRef(reelPlayheadMs);
  reelPlayheadRef.current = reelPlayheadMs;

  /** Bumped on every music sync; an older sync that finishes late must not play. */
  const musicSyncGenRef = useRef(0);

  /** Play the song part that belongs at `reelMs`; every other song is paused. */
  const syncMusic = useCallback(async (reelMs: number, force: boolean) => {
    const slot = musicSlotAt(musicScheduleRef.current, reelMs);
    const prev = activeMusicSlotRef.current;
    if (!force && slot?.key === prev?.key) return;
    const gen = ++musicSyncGenRef.current;
    activeMusicSlotRef.current = slot;
    const sounds = musicSoundsRef.current;
    const pauseOthers = () =>
      Promise.all(
        [...sounds].map(([id, snd]) =>
          id === slot?.segId ? null : snd.pauseAsync().catch(() => {}),
        ),
      );
    await pauseOthers();
    if (gen !== musicSyncGenRef.current || !slot) return;
    const snd = sounds.get(slot.segId);
    if (!snd) return;
    try {
      await snd.setVolumeAsync(slot.volume);
      await snd.setPositionAsync(slot.srcStart + Math.max(0, reelMs - slot.at));
      if (gen !== musicSyncGenRef.current) return;
      if (!playingRef.current) {
        await snd.pauseAsync();
        return;
      }
      await snd.playAsync();
      if (gen !== musicSyncGenRef.current) {
        // A newer sync took over while this one started — stop unless it's the same song.
        if (activeMusicSlotRef.current?.segId !== slot.segId) await snd.pauseAsync();
        return;
      }
      // Belt and braces: anything a late call started gets stopped here.
      await pauseOthers();
    } catch {}
  }, []);

  // One preview sound per song; load new ones, unload removed ones.
  const musicFilesKey = musicTracks.map((m) => `${m.id}:${m.uri}`).join("|");
  useEffect(() => {
    let cancelled = false;
    const sounds = musicSoundsRef.current;
    const wanted = new Map(musicTracks.map((m) => [m.id, m.uri]));
    for (const [id, snd] of sounds) {
      if (!wanted.has(id)) {
        sounds.delete(id);
        snd.unloadAsync().catch(() => {});
      }
    }
    (async () => {
      try {
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
        });
      } catch {}
      for (const [id, uri] of wanted) {
        if (sounds.has(id)) continue;
        try {
          const { sound } = await Audio.Sound.createAsync(
            { uri },
            { shouldPlay: false, isLooping: false },
          );
          if (cancelled || !wanted.has(id)) {
            await sound.unloadAsync();
            continue;
          }
          sounds.set(id, sound);
        } catch (error) {
          Logger.error("Music preview failed:", error);
        }
      }
      if (!cancelled) void syncMusic(reelPlayheadRef.current, true);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [musicFilesKey, syncMusic]);

  useEffect(
    () => () => {
      for (const snd of musicSoundsRef.current.values()) {
        snd.unloadAsync().catch(() => {});
      }
      musicSoundsRef.current.clear();
    },
    [],
  );

  // Follow the playhead: switch songs at their boundaries, re-seek when it jumps back.
  const lastReelPlayheadRef = useRef(reelPlayheadMs);
  useEffect(() => {
    const last = lastReelPlayheadRef.current;
    lastReelPlayheadRef.current = reelPlayheadMs;
    void syncMusic(reelPlayheadMs, reelPlayheadMs < last - 800);
  }, [reelPlayheadMs, syncMusic]);

  /** Move the reel preview to `reelMs` and play from there (Style step only). */
  const seekReelTo = useCallback(
    async (reelMs: number) => {
      if (focusIndexRef.current != null) return;
      const list = clipsRef.current;
      let offset = 0;
      let idx = list.length - 1;
      for (let i = 0; i < list.length; i++) {
        const len = clipLengthMs(list[i]);
        if (reelMs < offset + len) {
          idx = i;
          break;
        }
        offset += len;
      }
      const clip = list[idx];
      if (!clip) return;
      const local = Math.max(0, reelMs - offset);
      playingRef.current = true;
      setPlaying(true);
      await startAt(idx);
      if (isImageClip(clip)) {
        imageElapsedRef.current = local;
      } else {
        try {
          players[activeSlotRef.current].currentTime =
            playToSourceMs(clip, local) / 1000;
        } catch {}
      }
      setPreviewTimeMs(offset + local);
      void syncMusic(offset + local, true);
    },
    [players, startAt, syncMusic],
  );

  /** Tap a song (chip or bar block): select it and play from where it starts. */
  const selectMusicSong = useCallback(
    (id: string) => {
      setSelectedMusicId(id);
      const slot = musicScheduleRef.current.find((m) => m.segId === id && !m.repeat);
      if (slot) void seekReelTo(slot.at);
    },
    [seekReelTo],
  );

  // Parts / order / volume / Repeat changed, or play ↔ pause → re-apply.
  const musicScheduleKey = musicSchedule
    .map((m) => `${m.key}@${m.at}+${m.len}:${m.srcStart}:${m.volume}`)
    .join("|");
  useEffect(() => {
    void syncMusic(reelPlayheadRef.current, true);
  }, [musicScheduleKey, playing, syncMusic]);

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

    if (musicSchedule.length > 0) {
      // Every song part at its own place on the reel (repeats included).
      tracks.push({
        kind: "audio",
        id: "a",
        clips: musicSchedule.map((slot, i) => ({
          id: i === 0 ? STABLE_CLIP_IDS.music : `${STABLE_CLIP_IDS.music}-${i}`,
          sourceUri: slot.uri,
          sourceRange: { startMs: slot.srcStart, endMs: slot.srcStart + slot.len },
          timelineRange: { startMs: slot.at, endMs: slot.at + slot.len },
          volume: slot.volume,
          trimToVideo: true,
        })),
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
      id: "freshpass-studio-session",
      canvasSize,
      // Explicit fps avoids undefined → native 0 timescale black exports.
      fps: 30,
      tracks,
    });
  }, [
    canvasSize,
    clips,
    musicSchedule,
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

  /** Same edit as an earlier export → reuse that file. */
  const exportKey = useMemo(
    () => (project ? JSON.stringify(project) : ""),
    [project],
  );

  /** Put a picked song in: append ("add") or swap the selected one ("replace"). */
  const placeMusic = useCallback(
    async (input: { uri: string; name: string; credit: string | null }) => {
      const durationMs = await probeAudioDurationMs(input.uri);
      const seg = newMusicSegment({ ...input, durationMs });
      pushHistory();
      // First song repeats by default (fills a long reel); a replaced
      // repeating song hands the repeat to its replacement.
      const replacing =
        musicPickModeRef.current === "replace" &&
        musicTracksRef.current.some((m) => m.id === selectedMusicIdRef.current);
      setMusicRepeatId((cur) => {
        if (musicTracksRef.current.length === 0) return seg.id;
        if (replacing && cur === selectedMusicIdRef.current) return seg.id;
        return cur;
      });
      setMusicTracks((list) => {
        const sel = list.findIndex((m) => m.id === selectedMusicIdRef.current);
        if (musicPickModeRef.current === "replace" && sel >= 0) {
          const next = [...list];
          next[sel] = { ...seg, volume: list[sel].volume };
          return next;
        }
        // Earlier songs already fill the reel → shorten the last one to make room.
        const next = [...list];
        const total = musicPartsTotalMs(next, totalMsRef.current);
        const lastIdx = next.length - 1;
        if (lastIdx >= 0 && total >= totalMsRef.current - MIN_MUSIC_PART_MS) {
          const offsets = musicSegmentOffsets(next, totalMsRef.current);
          const lastPart = segmentPart(
            next[lastIdx],
            totalMsRef.current - offsets[lastIdx],
          );
          const keep = Math.max(MIN_MUSIC_PART_MS, Math.round(lastPart.len / 2));
          next[lastIdx] = { ...next[lastIdx], startMs: lastPart.start, endMs: lastPart.start + keep };
        }
        return [...next, seg];
      });
      setSelectedMusicId(seg.id);
      setMusicPickMode(null);
      setPlaying(engineVisibleRef.current);
    },
    [pushHistory],
  );

  const pickMusic = useCallback(async () => {
    try {
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
      await placeMusic({
        uri: localMusic,
        name: asset.name || t("backgroundMusic"),
        credit: null,
      });
    } catch (error) {
      Logger.error("Music pick failed:", error);
      showBanner(t("error"), t("failedToSelectMusic"), "error", 2500);
    }
  }, [placeMusic, showBanner, t]);

  /** Free library pick. Copies into cache so removing the download later can't break export. */
  const applyLibraryTrack = useCallback(
    async (track: DownloadedTrack) => {
      setMusicLibraryOpen(false);
      try {
        const cacheDir = FileSystem.cacheDirectory;
        if (!cacheDir) throw new Error("Cache directory unavailable");
        const dest = `${cacheDir}media-edit-music-${Date.now()}.mp3`;
        await FileSystem.copyAsync({ from: track.localUri, to: dest });
        await placeMusic({
          uri: dest,
          name: `${track.title} · ${track.artist}`,
          credit: trackCredit(track),
        });
      } catch (error) {
        Logger.error("Library music apply failed:", error);
        showBanner(t("error"), t("failedToSelectMusic"), "error", 2500);
      }
    },
    [placeMusic, showBanner, t],
  );

  /** Pauses the preview so the library's track preview isn't mixed with it. */
  const openMusicLibrary = useCallback(() => {
    setPlaying(false);
    setMusicLibraryOpen(true);
  }, []);

  const removeSelectedMusic = useCallback(() => {
    const id = selectedMusicIdRef.current;
    pushHistory();
    setMusicTracks((list) => {
      const idx = list.findIndex((m) => m.id === id);
      if (idx < 0) return list;
      const next = list.filter((m) => m.id !== id);
      setMusicRepeatId((cur) => (cur === id ? null : cur));
      setSelectedMusicId(next[Math.max(0, idx - 1)]?.id ?? null);
      return next;
    });
    setMusicPickMode(null);
  }, [pushHistory]);

  /** Drag-and-drop on the song chips: new play order. */
  const reorderMusic = useCallback(
    (orderedIds: string[]) => {
      pushHistory();
      setMusicTracks((list) => {
        const byId = new Map(list.map((m) => [m.id, m]));
        const next = orderedIds
          .map((id) => byId.get(id))
          .filter((m): m is MusicSegment => !!m);
        return next.length === list.length ? next : list;
      });
    },
    [pushHistory],
  );

  /** Change the selected song's part / volume (no history — callers push it). */
  const updateSelectedMusic = useCallback((patch: Partial<MusicSegment>) => {
    const id = selectedMusicIdRef.current;
    setMusicTracks((list) =>
      list.map((m) => (m.id === id ? { ...m, ...patch } : m)),
    );
  }, []);

  // ── Clips: add (gallery / camera), reorder, remove ────────────────

  /**
   * Returns a reason the user can't add another clip, or null. Length is NOT
   * checked here — add freely; Next checks the final reel.
   */
  const clipAddBlocker = useCallback((): string | null => {
    if (clipsRef.current.length >= MAX_EDITOR_CLIPS) {
      return t("clipsLimitReached", { max: MAX_EDITOR_CLIPS });
    }
    return null;
  }, [t]);

  const appendClips = useCallback(
    async (
      assets: ImagePicker.ImagePickerAsset[],
      type: MediaUploadSourceType,
      snap: EditorSnapshot,
    ) => {
      setAddingClips(true);
      const added: EditorClip[] = [];
      const metas: Record<string, ClipMeta> = {};
      let failed = 0;
      // The reel's only video starts with a window of the allowed length
      // (slide it to the best moment); added clips come in whole.
      const firstOnly = clipsRef.current.length === 0 && assets.length === 1;
      const videoBudgetMs = firstOnly
        ? Math.max(MIN_CLIP_MS, Math.round(maxSeconds * 1000))
        : Number.POSITIVE_INFINITY;
      // Original audio muted for every clip → new clips come in muted too
      const inheritMute =
        clipsRef.current.length > 0 && clipsRef.current.every((c) => c.muted);
      for (const asset of assets) {
        if (!asset.uri) continue;
        if (clipsRef.current.length + added.length >= MAX_EDITOR_CLIPS) break;
        try {
          const isPhoto = asset.type === "image";
          // Whole videos / default photo length — the user trims afterwards.
          const clip = isPhoto
            ? await prepareImageClip({
                uri: asset.uri,
                width: asset.width,
                height: asset.height,
                sourceType: type,
                budgetMs: Number.POSITIVE_INFINITY,
              })
            : await prepareEditorClip({
                uri: asset.uri,
                fileName: asset.fileName,
                sourceType: type,
                budgetMs: videoBudgetMs,
              });
          added.push(inheritMute ? { ...clip, muted: true } : clip);
          metas[clip.id] = {
            name: asset.fileName ?? null,
            mimeType: (asset as { mimeType?: string }).mimeType ?? null,
          };
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
        setClipMeta((prev) => ({ ...prev, ...metas }));
        added.forEach(loadThumbnail);
        // A newly added clip opens in Trim (the first ever pick stays first)
        if (step === "trim") setEditingClipId(added[0].id);
      }

      if (failed > 0) {
        showBanner(t("error"), t("failedToAddClip"), "error", 3000);
      }
    },
    [loadThumbnail, maxSeconds, pushSnapshot, showBanner, step, t],
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
        mediaTypes: ["videos", "images"],
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
      setPlaying(engineVisibleRef.current);
    }
  }, [
    appendClips,
    clipAddBlocker,
    currentSnapshot,
    dismissKeyboard,
    showBanner,
    t,
  ]);

  const addClipFromCamera = useCallback(async (mode: "video" | "photo" = "video") => {
    dismissKeyboard();
    const blocked = clipAddBlocker();
    if (blocked) {
      showBanner(t("trimVideo"), blocked, "warning", 3500);
      return;
    }
    const hasPermission = await handleCameraPermission();
    if (!hasPermission) return;
    const snap = currentSnapshot();
    setPlaying(false);
    try {
      const result = await ImagePicker.launchCameraAsync(
        mode === "photo"
          ? { mediaTypes: ["images"], quality: 1, ...IOS_PICKER_COMPAT }
          : {
              mediaTypes: ["videos"],
              quality: 1,
              videoMaxDuration: Math.max(1, Math.floor(maxSeconds)),
              ...IOS_PICKER_COMPAT,
            },
      );
      if (!result.canceled && result.assets?.[0]) {
        await appendClips([result.assets[0]], "camera", snap);
      }
    } catch (error) {
      Logger.error("Record clip failed:", error);
      showBanner(t("error"), t("failedToRecordVideo"), "error", 3000);
    } finally {
      setPlaying(engineVisibleRef.current);
    }
  }, [
    appendClips,
    clipAddBlocker,
    currentSnapshot,
    dismissKeyboard,
    maxSeconds,
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

  /** Remove a clip. The Add video step may remove the last one too. */
  const removeClip = useCallback(
    (id: string, allowEmpty = false) => {
      const list = clipsRef.current;
      if (list.length <= 1 && !allowEmpty) return;
      const index = list.findIndex((c) => c.id === id);
      if (index < 0) return;
      pushHistory();
      const next = list.filter((c) => c.id !== id);
      clipsRef.current = next;
      setClips(next);
      if (editingClipIdRef.current === id) {
        setEditingClipId(next[Math.min(index, next.length - 1)]?.id ?? null);
      }
    },
    [pushHistory],
  );

  /** Drag-to-reorder result from the clips row. */
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

  /** "Add clip" → sheet (gallery / record / photo). */
  const openAddClipChooser = useCallback(() => {
    dismissKeyboard();
    const blocked = clipAddBlocker();
    if (blocked) {
      showBanner(t("trimVideo"), blocked, "warning", 3500);
      return;
    }
    setAddClipOpen(true);
  }, [clipAddBlocker, dismissKeyboard, showBanner, t]);

  const onAddClipSource = useCallback(
    (source: AddClipSource) => {
      setAddClipOpen(false);
      // Pickers can't present while the sheet's Modal is still dismissing (iOS).
      setTimeout(() => {
        if (source === "gallery") void addClipsFromGallery();
        else void addClipFromCamera(source === "takePhoto" ? "photo" : "video");
      }, 400);
    },
    [addClipFromCamera, addClipsFromGallery],
  );

  /** Photo clip length (Trim → a photo is picked). */
  const setSelectedPhotoDuration = useCallback((ms: number) => {
    const list = clipsRef.current;
    const idx = list.findIndex((c) => c.id === editingClipIdRef.current);
    const clip = list[idx];
    if (!clip || !isImageClip(clip)) return;
    const end = Math.round(
      Math.min(IMAGE_CLIP_MAX_MS, Math.max(IMAGE_CLIP_MIN_MS, ms)),
    );
    if (end === clip.trimEndMs) return;
    const updated = [...list];
    updated[idx] = { ...clip, trimStartMs: 0, trimEndMs: end };
    clipsRef.current = updated;
    setClips(updated);
  }, []);

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
        setStyleTool("style");
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

  // ── Export ────────────────────────────────────────────────────────

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

  /** Back to Trim with the clip to fix picked. */
  const showTrimToFix = useCallback(() => {
    setStyleTool(null);
    setStep("trim");
    if (clipsRef.current.length === 1) setEditingClipId(clipsRef.current[0].id);
  }, []);

  /** Reel length check (Next on Trim, and again before export). */
  const validateLength = useCallback((): boolean => {
    if (clips.length === 0) return false;
    const clipSeconds = totalMs / 1000;
    // Small tolerance: phones report lengths a few ms off.
    if (clipSeconds < MIN_REEL_SECONDS - 0.05) {
      Alert.alert(
        t("reelTooShortTitle"),
        t("reelTooShortMessage", {
          min_seconds: MIN_REEL_SECONDS,
          length: formatVideoDuration(clipSeconds),
        }),
      );
      showTrimToFix();
      return false;
    }
    if (clipSeconds > maxSeconds + 0.05) {
      Alert.alert(
        t("reelTrimRequiredTitle"),
        isAutoSource
          ? t("autoReelTrimRequiredMessage", {
              length: formatVideoDuration(clipSeconds),
              max: formatVideoDuration(maxSeconds),
            })
          : t("reelTrimRequiredMessage", {
              max_seconds: maxSeconds,
              clip_seconds: Math.round(clipSeconds),
            }),
      );
      showTrimToFix();
      return false;
    }
    return true;
  }, [clips.length, isAutoSource, maxSeconds, showTrimToFix, t, totalMs]);

  /** Single native export of the whole edit (skipped when nothing changed). */
  const exportReel = useCallback(async (): Promise<ExportedReel | null> => {
    if (!project || exporting || clips.length === 0) return null;
    dismissKeyboard();
    setPlaying(false);
    playingRef.current = false;
    await releasePlayers();
    for (const snd of musicSoundsRef.current.values()) {
      snd.pauseAsync().catch(() => {});
    }

    const single = clips.length === 1 ? clips[0] : null;
    const hasEdits =
      !single ||
      isImageClip(single) ||
      aspect !== "original" ||
      musicTracks.length > 0 ||
      mutedClipCount > 0 ||
      !!overlayText.trim() ||
      stickers.length > 0 ||
      single.trimStartMs > 0 ||
      single.trimEndMs < single.sourceDurationMs ||
      activeCuts(single).length > 0;

    const firstMeta = clipMeta[clips[0].id];
    let videoUri = clips[0].uri;
    let fileName = firstMeta?.name || "video.mp4";
    let mimeType = videoMimeFor(firstMeta, clips[0].uri);

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
        fileName = "edited-video.mp4";
        mimeType = "video/mp4";
      } catch (error: any) {
        Logger.error("Studio export failed:", error);
        // Android reports any input it can't open as "Asset loader error" —
        // point at the photo / clips first, then at a song file.
        const raw = String(error?.message ?? "");
        const unreadable = /asset loader/i.test(raw);
        const hasPhoto = clips.some(isImageClip);
        showBanner(
          t("error"),
          unreadable
            ? hasPhoto || musicTracks.length === 0
              ? t("flowExportSourceFailed")
              : t("flowExportSongFailed")
            : raw || t("failedToExportVideo"),
          "error",
          5000,
        );
        restorePreview();
        setPlaying(engineVisibleRef.current);
        return null;
      } finally {
        try {
          sub.remove();
        } catch {}
        setExporting(false);
        setExportProgress(0);
      }
    }

    return {
      key: exportKey,
      uri: videoUri,
      fileName,
      mimeType,
      durationMs: Math.round(totalMs),
      width: hasEdits ? canvasSize.width : Math.round(videoSize.width),
      height: hasEdits ? canvasSize.height : Math.round(videoSize.height),
      sourceType: clips[0].sourceType ?? sourceType,
      musicCredit: musicCreditText(musicTracks),
      edited: hasEdits,
    };
  }, [
    aspect,
    canvasSize.height,
    canvasSize.width,
    clipMeta,
    clips,
    dismissKeyboard,
    exportKey,
    exporting,
    musicTracks,
    mutedClipCount,
    overlayText,
    project,
    releasePlayers,
    restorePreview,
    showBanner,
    sourceType,
    stickers.length,
    t,
    totalMs,
    videoSize.height,
    videoSize.width,
  ]);

  // ── Navigation between steps ──────────────────────────────────────

  /** Lets deliberate exits (saved / published / discarded) pass the guard. */
  const allowLeaveRef = useRef(false);

  const leaveStudio = useCallback(() => {
    allowLeaveRef.current = true;
    if (router.canGoBack()) router.back();
    else router.replace("/(main)/dashboard/(home)" as any);
  }, [router]);

  const goToTrim = useCallback(() => {
    if (clipsRef.current.length === 0) return;
    // Undo covers the editing steps only — picks on "Add video" can't be undone away
    if (step === "upload") setHistory([]);
    setStyleTool(null);
    if (
      !editingClipIdRef.current ||
      !clipsRef.current.some((c) => c.id === editingClipIdRef.current)
    ) {
      setEditingClipId(clipsRef.current[0].id);
    }
    setStep("trim");
    setPlaying(true);
  }, [step]);

  const goToStyle = useCallback(() => {
    if (!validateLength()) return;
    dismissKeyboard();
    setStyleTool(null);
    setSelectedStickerId(null);
    setStep("style");
    setPlaying(true);
  }, [dismissKeyboard, validateLength]);

  const goToPreview = useCallback(async () => {
    if (!validateLength()) return;
    dismissKeyboard();
    setStyleTool(null);
    setSelectedStickerId(null);
    if (exported && exported.key === exportKey) {
      setStep("preview");
      return;
    }
    const result = await exportReel();
    if (!result) return;
    setExported(result);
    setStep("preview");
  }, [dismissKeyboard, exportKey, exportReel, exported, validateLength]);

  /** Save mode: export, keep a copy in the gallery, hand the file back. */
  const saveAndReturn = useCallback(async () => {
    if (!params.requestId || !validateLength()) return;
    dismissKeyboard();
    setStyleTool(null);
    const result = await exportReel();
    if (!result) return;
    let savedToGallery = false;
    if (result.edited) {
      setSavingToGallery(true);
      savedToGallery = await saveLocalVideoToGallery(result.uri);
      setSavingToGallery(false);
    }
    deliverEditedVideo({
      requestId: params.requestId,
      uri: result.uri,
      fileName: result.fileName,
      mimeType: result.mimeType,
      durationMs: result.durationMs,
      width: result.width,
      height: result.height,
      edited: result.edited,
      savedToGallery,
      musicCredit: result.musicCredit,
    });
    leaveStudio();
  }, [dismissKeyboard, exportReel, leaveStudio, params.requestId, validateLength]);

  const backToEditing = useCallback(() => {
    setStep("style");
    restorePreview();
    setPlaying(true);
  }, [restorePreview]);

  const busy = exporting || savingToGallery;

  /** One step back. Returns false on the first step (the caller leaves). */
  const stepBack = useCallback((): boolean => {
    if (busy) return true;
    if (step === "style" && styleTool) {
      dismissKeyboard();
      setSelectedStickerId(null);
      setMusicPickMode(null);
      setStyleTool(null);
      return true;
    }
    if (step === "publish") {
      if (published) return false;
      setStep("preview");
      return true;
    }
    if (step === "preview") {
      backToEditing();
      return true;
    }
    const idx = steps.indexOf(step);
    if (idx <= 0) return false;
    const prev = steps[idx - 1];
    dismissKeyboard();
    if (prev === "trim") goToTrim();
    else setStep(prev);
    return true;
  }, [backToEditing, busy, dismissKeyboard, goToTrim, published, step, steps, styleTool]);

  const hasWork = isSaveMode ? history.length > 0 : clips.length > 0;

  const guardRef = useRef({ stepBack, busy, publishBusy, hasWork, published });
  guardRef.current = { stepBack, busy, publishBusy, hasWork, published };

  // Hardware back / gestures: one step back; leaving with work asks first.
  useEffect(() => {
    const unsubscribe = navigation.addListener("beforeRemove", (event: any) => {
      if (allowLeaveRef.current) return;
      const g = guardRef.current;
      if (g.busy && event?.data?.action?.type === "GO_BACK") {
        event.preventDefault();
        return;
      }
      if (g.publishBusy) {
        event.preventDefault();
        Alert.alert(t("autoReelLeaveUploadTitle"), t("flowLeavePublishMessage"), [
          { text: t("autoReelKeepUploading"), style: "cancel" },
          {
            text: t("autoReelLeave"),
            style: "destructive",
            onPress: () => {
              publishAbortRef.current?.();
              allowLeaveRef.current = true;
              navigation.dispatch(event.data.action);
            },
          },
        ]);
        return;
      }
      // Only back presses step back / ask — resets (e.g. sign-out) go through
      const type = event?.data?.action?.type;
      if (type !== "GO_BACK" && type !== "POP") return;
      if (g.stepBack()) {
        event.preventDefault();
        return;
      }
      if (!g.hasWork || g.published) return;
      event.preventDefault();
      Alert.alert(
        isSaveMode ? t("flowDiscardEditsTitle") : t("flowDiscardTitle"),
        isSaveMode ? t("flowDiscardEditsMessage") : t("flowDiscardMessage"),
        [
          { text: t("flowKeepEditing"), style: "cancel" },
          {
            text: t("flowDiscard"),
            style: "destructive",
            onPress: () => {
              allowLeaveRef.current = true;
              navigation.dispatch(event.data.action);
            },
          },
        ],
      );
    });
    return unsubscribe;
  }, [isSaveMode, navigation, t]);

  /** Header back: a step back, or leave the flow from the first step. */
  const onHeaderBack = useCallback(() => {
    if (stepBack()) return;
    if (router.canGoBack()) router.back();
    else router.replace("/(main)/dashboard/(home)" as any);
  }, [router, stepBack]);

  const registerPublishAbort = useCallback((abort: (() => void) | null) => {
    publishAbortRef.current = abort;
  }, []);

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

  // Text moves only on the Style step (Trim shows it, untouchable).
  const textDragEnabled = step === "style" && !busy;
  const textDragGesture = useMemo(
    () =>
      Gesture.Pan()
        .enabled(textDragEnabled)
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
      textDragEnabled,
    ],
  );

  const textAnimatedStyle = useAnimatedStyle(() => ({
    left: frameLeft.value + posX.value * frameW.value - boxW.value / 2,
    top: frameTop.value + posY.value * frameH.value - boxH.value / 2,
  }));

  const selectedMusicName = selectedMusic ? splitMusicName(selectedMusic) : null;
  const selectedMusicPart = selectedMusic
    ? segmentPart(
        selectedMusic,
        totalMs - (musicSegmentOffsets(musicTracks, totalMs)[selectedMusicIndex] ?? 0),
      )
    : null;
  // White line on the song strip: where in the selected song's part we are now
  const selectedMusicSlot = musicSlotAt(musicSchedule, reelPlayheadMs);
  const selectedMusicPlayheadMs =
    selectedMusicSlot && selectedMusicSlot.segId === selectedMusic?.id
      ? reelPlayheadMs - selectedMusicSlot.at
      : null;
  const canUndo = history.length > 0;

  const badgeTotalMs =
    focusIndex != null && editingClip ? clipLengthMs(editingClip) : totalMs;

  // ── Step labels ───────────────────────────────────────────────────
  const stepIndex = Math.max(0, steps.indexOf(step));
  const stepStartParam = Number(params.stepStart);
  const stepTotalParam = Number(params.stepTotal);
  const stepStart = stepStartParam > 0 ? stepStartParam : 1;
  const stepTotal = stepTotalParam > 0 ? stepTotalParam : steps.length;
  const stepNumber = params.stepFixed === "1" ? stepStart : stepStart + stepIndex;
  const headerTitle = params.flowTitle || t("createReel");
  const keyboardOpen = keyboardHeight > 0;

  // ── Renders ───────────────────────────────────────────────────────

  const renderPreview = () => (
    <View style={styles.previewWrap}>
      <View style={styles.previewCard} onLayout={onPreviewLayout}>
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
            {activeImageUri ? (
              // Export letterboxes photos into the frame — preview matches.
              <ExpoImage
                source={{ uri: activeImageUri }}
                style={[styles.videoLayer, styles.photoLayer]}
                contentFit="contain"
                pointerEvents="none"
              />
            ) : null}

            <View style={styles.playOverlay} pointerEvents="box-none">
              <TouchableOpacity
                activeOpacity={0.8}
                style={styles.playCircle}
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
                  size={moderateWidthScale(40)}
                  color={theme.white}
                />
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <ActivityIndicator color={theme.white} />
        )}

        <StickerLayer
          stickers={stickers}
          selectedId={selectedSticker?.id ?? null}
          frame={stickerFrame}
          bottomInset={0}
          editing={step === "style" && styleTool === "style"}
          disabled={busy || step !== "style"}
          selectionColor={theme.selectCard}
          onSelect={selectSticker}
          onBeginTransform={beginStickerTransform}
          onCommit={commitStickerTransform}
        />

        {overlayText.trim() ? (
          <View style={styles.textLayer} pointerEvents="box-none">
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
                  ((step === "style" && styleTool === "text") || draggingText) &&
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

        {step === "trim" && clips.length > 1 && editingClip ? (
          <View style={styles.clipPill} pointerEvents="none">
            <Text style={styles.badgeText}>
              {t("clipLabel", { index: editingIndex + 1, count: clips.length })}
            </Text>
          </View>
        ) : null}

        {canUndo ? (
          <TouchableOpacity
            activeOpacity={0.8}
            style={styles.undoBtn}
            onPress={() => {
              dismissKeyboard();
              handleUndo();
            }}
            disabled={busy}
            hitSlop={6}
            accessibilityRole="button"
            accessibilityLabel={t("undo")}
          >
            <MaterialIcons
              name="undo"
              size={moderateWidthScale(22)}
              color={theme.white}
            />
            <Text style={styles.undoText}>{t("undo")}</Text>
          </TouchableOpacity>
        ) : null}

        <View style={styles.badge} pointerEvents="none">
          <Text style={styles.badgeText}>
            {formatMs(previewTimeMs)} / {formatMs(badgeTotalMs)}
          </Text>
        </View>
      </View>
    </View>
  );

  const renderUploadStep = () => {
    const totalLabel =
      clips.length > 0 ? formatVideoDuration(totalMs / 1000) : null;
    return (
      <>
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.uploadContent}
          showsVerticalScrollIndicator={false}
        >
          <FlowTitle
            title={t("flowAddVideoTitle")}
            subtitle={t("flowAddClipsSubtitle")}
          />
          <SourceCard
            icon="video-library"
            label={t("flowChooseFromGallery")}
            sublabel={t("flowGalleryVideosPhotos")}
            sublabelIcon="perm-media"
            badgeIcon="add"
            onPress={() => {
              setPickingFrom("gallery");
              void addClipsFromGallery().finally(() => setPickingFrom(null));
            }}
            disabled={addingClips}
            loading={addingClips && pickingFrom === "gallery"}
          />
          <SourceCard
            icon="videocam"
            label={t("flowRecordVideo")}
            sublabel={t("flowRecordUpTo", {
              time: formatVideoDuration(maxSeconds),
            })}
            sublabelIcon="timer"
            badgeIcon="fiber-manual-record"
            onPress={() => {
              setPickingFrom("camera");
              void addClipFromCamera("video").finally(() => setPickingFrom(null));
            }}
            disabled={addingClips}
            loading={addingClips && pickingFrom === "camera"}
          />

          {clips.length > 0 ? (
            <>
              <View style={styles.divider} />
              <SectionLabel
                label={
                  clips.length > 1
                    ? t("flowSelectedClips", { n: clips.length })
                    : clips.length === 1 && isImageClip(clips[0])
                      ? t("flowSelectedPhoto")
                      : t("flowSelectedVideo")
                }
                meta={totalLabel}
              />
              <MediaTileGrid
                items={clips.map((clip) => ({
                  id: clip.id,
                  thumbUri: thumbs[clip.id],
                  isPhoto: isImageClip(clip),
                  badge: isImageClip(clip)
                    ? `${Math.round(clipLengthMs(clip) / 1000)}s`
                    : formatVideoDuration(clip.sourceDurationMs / 1000),
                }))}
                onRemove={(id) => removeClip(id, true)}
                disabled={addingClips}
              />
            </>
          ) : null}
        </ScrollView>
        <FlowFooter
          primary={{
            label: t("flowNextTrim"),
            onPress: goToTrim,
            disabled: clips.length === 0 || addingClips,
            trailingIcon: "chevron-right",
          }}
          hint={clips.length === 0 && !addingClips ? t("flowPickClipsHint") : null}
        />
      </>
    );
  };

  const renderTrimControls = () => {
    if (!editingClip) return null;
    return (
      <View style={styles.trimArea}>
        {clips.length > 1 ? (
          <ClipTimeline
            tone="light"
            title={null}
            hint={null}
            selectedId={editingClip.id}
            clips={clips}
            thumbs={thumbs}
            totalMs={totalMs}
            maxMs={maxClipMs}
            canAdd={clips.length < MAX_EDITOR_CLIPS}
            adding={addingClips}
            disabled={busy}
            formatMs={formatMs}
            onOpen={setEditingClipId}
            onAdd={openAddClipChooser}
            onRemove={(id) => removeClip(id)}
            onMove={moveClip}
            onReorder={reorderClips}
          />
        ) : null}
        <StudioTrimPanel
          compact={compact}
          clip={editingClip}
          frames={filmstrips[editingClip.uri]}
          playheadMs={playheadSourceMs}
          disabled={busy}
          reelTotalMs={totalMs}
          maxMs={maxClipMs}
          multi={clips.length > 1}
          canAddClip={clips.length < MAX_EDITOR_CLIPS}
          addingClip={addingClips}
          onSplit={() => splitSelectedClip(editingClip.id)}
          onReset={() => resetClip(editingClip.id)}
          onToggleMute={() => toggleClipMuted(editingClip.id)}
          onAddClip={openAddClipChooser}
          onTrimBegin={onTrimSlideStart}
          onTrimChange={updateSelectedTrim}
          onTrimEnd={onTrimSlideComplete}
          onTrimMove={moveSelectedTrim}
          onScrubBegin={onScrubBegin}
          onScrub={onScrub}
          onScrubEnd={onScrubEnd}
          onImageDurationBegin={pushHistory}
          onImageDurationChange={setSelectedPhotoDuration}
        />
      </View>
    );
  };

  const frameLabel = t(
    FRAME_OPTIONS.find((f) => f.key === aspect)?.labelKey ?? "flowFrameOriginal",
  );
  const styleSummary = [
    frameLabel,
    stickers.length === 1
      ? t("flowOneSticker")
      : stickers.length > 1
        ? t("flowStickersCount", { n: stickers.length })
        : null,
  ]
    .filter(Boolean)
    .join(" · ");
  const musicSummary =
    musicTracks.length === 0
      ? t("flowMusicChoose")
      : musicTracks.length === 1
        ? splitMusicName(musicTracks[0]).title
        : t("flowSongsCount", { n: musicTracks.length });
  const textSummary = overlayText.trim() || t("flowTextAdd");

  const renderStyleRows = () => (
    <View style={styles.rows}>
      <OptionRow
        icon="palette"
        title={t("flowStyle")}
        subtitle={styleSummary}
        done={aspect !== "original" || stickers.length > 0}
        onPress={() => setStyleTool("style")}
        disabled={busy}
      />
      <OptionRow
        icon="music-note"
        title={t("backgroundMusic")}
        subtitle={musicSummary}
        done={musicTracks.length > 0}
        onPress={() => setStyleTool("music")}
        disabled={busy}
      />
      <OptionRow
        icon="text-fields"
        title={t("overlayText")}
        subtitle={textSummary}
        done={!!overlayText.trim()}
        onPress={() => setStyleTool("text")}
        disabled={busy}
      />
    </View>
  );

  const renderStylePanel = () => (
    <>
      <Text style={styles.sheetSection}>{t("flowFrame")}</Text>
      <View style={styles.frameGrid}>
        {FRAME_OPTIONS.map((option) => {
          const active = aspect === option.key;
          return (
            <TouchableOpacity
              activeOpacity={0.8}
              key={option.key}
              style={[styles.frameTile, active && styles.frameTileActive]}
              onPress={() => {
                if (aspect === option.key) return;
                pushHistory();
                setAspect(option.key);
              }}
              disabled={busy}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
            >
              <MaterialIcons
                name={option.icon}
                size={moderateWidthScale(24)}
                color={active ? theme.darkGreen : theme.white}
              />
              <Text
                style={[styles.frameLabel, active && styles.frameLabelActive]}
                numberOfLines={1}
              >
                {t(option.labelKey)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      <Text style={styles.sheetHint}>{t("aspectRatioHint")}</Text>
      <View style={styles.sheetDivider} />
      <Text style={styles.sheetSection}>{t("stickers")}</Text>
      <StickerPanel
        large
        hideTitle
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
    </>
  );

  const renderMusicPanel = () => (
    <>
      {musicPickMode && musicTracks.length > 0 ? (
        <View style={styles.musicTitleRow}>
          <Text style={styles.sheetHint}>
            {musicPickMode === "replace" ? t("changeMusic") : t("musicAddSong")}
          </Text>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setMusicPickMode(null)}
            disabled={busy}
            hitSlop={12}
            accessibilityRole="button"
          >
            <Text style={styles.musicCancelText}>{t("cancel")}</Text>
          </TouchableOpacity>
        </View>
      ) : null}
      {musicTracks.length === 0 || musicPickMode ? (
        <View style={[styles.musicCard, styles.musicAddCard]}>
          <TouchableOpacity
            activeOpacity={0.8}
            style={styles.musicAddMain}
            onPress={openMusicLibrary}
            disabled={busy}
            accessibilityRole="button"
            accessibilityLabel={t("musicAddTitle")}
          >
            <MaterialIcons
              name="library-music"
              size={moderateWidthScale(26)}
              color={theme.orangeBrown}
            />
            <View style={styles.musicCardInfo}>
              <Text style={styles.musicCardTitle} numberOfLines={1}>
                {t("musicAddTitle")}
              </Text>
              <Text style={styles.musicCardSub} numberOfLines={1}>
                {t("musicAddSub")}
              </Text>
            </View>
            <MaterialIcons
              name="chevron-right"
              size={moderateWidthScale(26)}
              color={theme.white70}
            />
          </TouchableOpacity>
          <View style={styles.musicAddDivider} />
          <TouchableOpacity
            activeOpacity={0.8}
            style={styles.musicPhoneBtn}
            onPress={() => void pickMusic()}
            disabled={busy}
            accessibilityRole="button"
            accessibilityLabel={t("musicFromPhone")}
          >
            <MaterialIcons
              name="folder-open"
              size={moderateWidthScale(24)}
              color={theme.white}
            />
            <Text style={styles.musicPhoneText}>{t("musicPhoneShort")}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <MusicSongChips
            large
            songs={musicTracks.map((m) => ({
              id: m.id,
              title: splitMusicName(m).title,
            }))}
            selectedId={selectedMusic?.id ?? null}
            canAdd={musicTracks.length < MAX_MUSIC_SEGMENTS}
            disabled={busy}
            onSelect={selectMusicSong}
            onAdd={() => setMusicPickMode("add")}
            onReorder={reorderMusic}
          />
          {musicTracks.length > 1 ? (
            <Text style={styles.sheetHint}>{t("musicReorderHint")}</Text>
          ) : null}

          {selectedMusic && selectedMusicName ? (
            <>
              <View style={styles.musicCard}>
                <MaterialIcons
                  name="music-note"
                  size={moderateWidthScale(24)}
                  color={theme.orangeBrown}
                />
                <View style={styles.musicCardInfo}>
                  <Text style={styles.musicCardTitle} numberOfLines={1}>
                    {selectedMusicName.title}
                  </Text>
                  {selectedMusicName.artist ? (
                    <Text style={styles.musicCardSub} numberOfLines={1}>
                      {selectedMusicName.artist}
                    </Text>
                  ) : null}
                </View>
                <TouchableOpacity
                  activeOpacity={0.8}
                  style={styles.iconHit}
                  onPress={() => setMusicPickMode("replace")}
                  disabled={busy}
                  accessibilityRole="button"
                  accessibilityLabel={t("changeMusic")}
                >
                  <MaterialIcons
                    name="swap-horiz"
                    size={moderateWidthScale(26)}
                    color={theme.white}
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  activeOpacity={0.8}
                  style={styles.iconHit}
                  onPress={removeSelectedMusic}
                  disabled={busy}
                  accessibilityRole="button"
                  accessibilityLabel={t("remove")}
                >
                  <MaterialIcons
                    name="delete-outline"
                    size={moderateWidthScale(26)}
                    color={theme.white70}
                  />
                </TouchableOpacity>
              </View>

              {selectedMusicPart && selectedMusic.durationMs > 0 ? (
                <MusicTrimmer
                  large
                  seed={selectedMusic.uri}
                  musicDurationMs={selectedMusic.durationMs}
                  startMs={selectedMusicPart.start}
                  endMs={selectedMusicPart.end}
                  playheadMs={selectedMusicPlayheadMs}
                  disabled={busy}
                  onDragStart={pushHistory}
                  onChange={(start, end) =>
                    updateSelectedMusic({ startMs: start, endMs: end })
                  }
                />
              ) : null}

              <Text style={styles.label}>
                {t("musicVolume")}: {Math.round(selectedMusic.volume * 100)}%
              </Text>
              <Slider
                minimumValue={0}
                maximumValue={1}
                value={selectedMusic.volume}
                onSlidingStart={() => pushHistory()}
                onValueChange={(v) => updateSelectedMusic({ volume: v })}
                minimumTrackTintColor={theme.orangeBrown}
                maximumTrackTintColor={theme.white15}
                thumbTintColor={theme.orangeBrown}
                disabled={busy}
                accessibilityLabel={t("musicVolume")}
              />
            </>
          ) : null}

          <MusicCoverage
            large
            videoMs={totalMs}
            slots={musicSchedule}
            selectedIndex={selectedMusicIndex}
            partsTotalMs={musicPartsMs}
            repeatIndex={musicTracks.findIndex((m) => m.id === musicRepeatId)}
            playheadMs={reelPlayheadMs}
            disabled={busy}
            onSelect={(i) => {
              const m = musicTracks[i];
              if (m) selectMusicSong(m.id);
            }}
            onToggleLoop={() => {
              pushHistory();
              const id = selectedMusic?.id ?? null;
              setMusicRepeatId((cur) => (cur === id ? null : id));
            }}
          />
        </>
      )}
      <View style={styles.sheetDivider} />
      <View style={styles.rowBetween}>
        <Text style={styles.label}>{t("muteOriginalAudio")}</Text>
        <Switch
          value={allClipsMuted}
          onValueChange={setAllClipsMuted}
          accessibilityLabel={t("muteOriginalAudio")}
          disabled={busy || videoClipCount === 0}
          trackColor={{
            false: theme.white15,
            true: theme.orangeBrown,
          }}
          thumbColor={theme.white}
        />
      </View>
      {clips.length > 1 ? (
        <Text style={styles.sheetHint}>
          {mutedClipCount > 0 && !allClipsMuted
            ? t("clipsMutedCount", {
                count: mutedClipCount,
                total: clips.length,
              })
            : t("muteAllClipsHint")}
        </Text>
      ) : null}
    </>
  );

  const renderTextPanel = () => (
    <>
      <View style={styles.textInputWrap}>
        <TextInput
          ref={textInputRef}
          style={styles.textInput}
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
          accessibilityLabel={t("overlayText")}
        />
        {overlayText.length > 0 ? (
          <TouchableOpacity
            activeOpacity={0.8}
            style={styles.textInputClear}
            onPress={() => {
              pushHistory();
              setOverlayText("");
            }}
            disabled={busy}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={t("clear")}
          >
            <CloseIcon color={theme.white70} />
          </TouchableOpacity>
        ) : null}
      </View>

      <View style={styles.textColorBar}>
        <View style={styles.segment}>
          {(
            [
              { key: "text", icon: "format-color-text", label: "textColor" },
              { key: "bg", icon: "format-color-fill", label: "textBackground" },
            ] as const
          ).map((item) => {
            const active = textColorTarget === item.key;
            return (
              <TouchableOpacity
                activeOpacity={0.8}
                key={item.key}
                style={[styles.segmentBtn, active && styles.segmentBtnActive]}
                onPress={() => setTextColorTarget(item.key)}
                disabled={busy}
                accessibilityRole="button"
                accessibilityLabel={t(item.label)}
                accessibilityState={{ selected: active }}
              >
                <MaterialIcons
                  name={item.icon}
                  size={moderateWidthScale(22)}
                  color={active ? theme.buttonText : theme.white}
                />
              </TouchableOpacity>
            );
          })}
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.colorTrack}
          keyboardShouldPersistTaps="handled"
        >
          {textColorTarget === "bg" ? (
            <TouchableOpacity
              activeOpacity={0.8}
              style={[
                styles.colorDot,
                styles.colorDotNone,
                overlayBgColorKey === null && styles.colorDotActive,
              ]}
              onPress={() => {
                if (overlayBgColorKey === null) return;
                pushHistory();
                setOverlayBgColorKey(null);
              }}
              disabled={busy}
              accessibilityRole="button"
              accessibilityLabel={t("textBgNone")}
              accessibilityState={{ selected: overlayBgColorKey === null }}
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
                activeOpacity={0.8}
                key={key}
                style={[
                  styles.colorDot,
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
                accessibilityRole="button"
                accessibilityLabel={t("flowColorN", { n: OVERLAY_COLOR_KEYS.indexOf(key) + 1 })}
                accessibilityState={{ selected }}
              />
            );
          })}
        </ScrollView>
      </View>

      {!keyboardOpen ? (
        <View style={styles.textStyleBar}>
          <View style={styles.segment}>
            {(["S", "M", "L"] as OverlaySize[]).map((size) => {
              const active = overlaySize === size;
              return (
                <TouchableOpacity
                  activeOpacity={0.8}
                  key={size}
                  style={[styles.segmentBtn, active && styles.segmentBtnActive]}
                  onPress={() => {
                    if (overlaySize === size) return;
                    pushHistory();
                    setOverlaySize(size);
                  }}
                  disabled={busy}
                  accessibilityRole="button"
                  accessibilityLabel={t("flowTextSizeN", { size })}
                  accessibilityState={{ selected: active }}
                >
                  <Text
                    style={[
                      styles.segmentLabel,
                      active && styles.segmentLabelActive,
                    ]}
                  >
                    {size}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.formatRow}>
            {(
              [
                {
                  key: "bold",
                  icon: "format-bold" as const,
                  label: "flowBold",
                  active: overlayBold,
                  onPress: () => {
                    pushHistory();
                    setOverlayBold((v) => !v);
                  },
                },
                {
                  key: "italic",
                  icon: "format-italic" as const,
                  label: "flowItalic",
                  active: overlayItalic,
                  onPress: () => {
                    pushHistory();
                    setOverlayItalic((v) => !v);
                  },
                },
                {
                  key: "mono",
                  icon: "code" as const,
                  label: "flowMono",
                  active: overlayMono,
                  onPress: () => {
                    pushHistory();
                    setOverlayMono((v) => !v);
                  },
                },
              ] as const
            ).map((item) => (
              <TouchableOpacity
                activeOpacity={0.8}
                key={item.key}
                style={[styles.formatBtn, item.active && styles.formatBtnActive]}
                onPress={item.onPress}
                disabled={busy}
                accessibilityRole="switch"
                accessibilityLabel={t(item.label)}
                accessibilityState={{ checked: item.active }}
              >
                <MaterialIcons
                  name={item.icon}
                  size={moderateWidthScale(24)}
                  color={item.active ? theme.buttonText : theme.white}
                />
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ) : null}
      <Text style={styles.sheetHint}>{t("flowTextDragHint")}</Text>
    </>
  );

  const toolTitle =
    styleTool === "style"
      ? t("flowStyle")
      : styleTool === "music"
        ? t("backgroundMusic")
        : t("overlayText");

  const renderToolSheet = () => (
    <View
      style={[
        styles.sheet,
        {
          paddingBottom: keyboardOpen
            ? moderateHeightScale(6)
            : Math.max(insets.bottom, moderateHeightScale(12)),
          maxHeight: windowHeight * (keyboardOpen ? 0.42 : 0.58),
        },
      ]}
    >
      <View style={styles.sheetHandle} />
      <View style={styles.sheetHeader}>
        <Text style={styles.sheetTitle} accessibilityRole="header">
          {toolTitle}
        </Text>
        <TouchableOpacity
          activeOpacity={0.8}
          style={styles.sheetDone}
          onPress={() => {
            dismissKeyboard();
            setSelectedStickerId(null);
            setMusicPickMode(null);
            setStyleTool(null);
          }}
          disabled={busy}
          accessibilityRole="button"
          accessibilityLabel={t("done")}
        >
          <MaterialIcons
            name="check"
            size={moderateWidthScale(20)}
            color={theme.darkGreen}
          />
          <Text style={styles.sheetDoneText}>{t("done")}</Text>
        </TouchableOpacity>
      </View>
      <ScrollView
        contentContainerStyle={styles.sheetBody}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {styleTool === "style"
          ? renderStylePanel()
          : styleTool === "music"
            ? renderMusicPanel()
            : renderTextPanel()}
      </ScrollView>
    </View>
  );

  const renderEditStep = () => {
    const isTrim = step === "trim";
    const title = isTrim ? t("flowTrimTitle") : t("flowStyleTitle");
    const subtitle = isTrim
      ? isAutoSource
        ? t("flowTrimSubtitleAuto", { max: formatVideoDuration(maxSeconds) })
        : t("flowTrimSubtitle", { max_seconds: maxSeconds })
      : isSaveMode
        ? t("flowStyleSubtitleSave")
        : t("flowStyleSubtitle");
    // Short screens: give the preview the room while a tool / clip row is open
    const showTitle =
      !(keyboardOpen && step === "style") &&
      !(compact && step === "style" && !!styleTool) &&
      !(compact && isTrim && clips.length > 1);

    if (loadingInfo) {
      return (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.buttonBack} />
          <Text style={styles.centerLabel}>{t("flowLoadingVideo")}</Text>
        </View>
      );
    }
    if (clips.length === 0) {
      return (
        <View style={styles.center}>
          <Text style={styles.centerLabel}>{t("noVideoToEdit")}</Text>
        </View>
      );
    }

    return (
      <>
        <View
          style={[
            styles.flex,
            step === "style" && keyboardOpen
              ? { paddingBottom: keyboardHeight }
              : null,
          ]}
        >
          {showTitle ? (
            <FlowTitle
              compact
              title={title}
              subtitle={compact ? null : subtitle}
              style={styles.editTitle}
            />
          ) : null}
          {renderPreview()}
          {isTrim
            ? renderTrimControls()
            : styleTool
              ? renderToolSheet()
              : renderStyleRows()}
        </View>
        {isTrim ? (
          <FlowFooter
            primary={{
              label: t("flowNextStyle"),
              onPress: goToStyle,
              disabled: busy || addingClips,
              trailingIcon: "chevron-right",
            }}
          />
        ) : !styleTool ? (
          <FlowFooter
            primary={
              isSaveMode
                ? {
                    label: t("flowSaveVideo"),
                    onPress: () => void saveAndReturn(),
                    disabled: busy || !project || addingSticker,
                    icon: "check",
                  }
                : {
                    label: t("flowNextPreview"),
                    onPress: () => void goToPreview(),
                    disabled: busy || !project || addingSticker,
                    trailingIcon: "chevron-right",
                  }
            }
          />
        ) : null}
      </>
    );
  };

  const renderPreviewStep = () => {
    if (!exported) return null;
    const ratio =
      exported.width > 0 && exported.height > 0
        ? exported.width / exported.height
        : getAspectRatio(aspect, videoSize.width, videoSize.height);
    return (
      <>
        <View style={styles.exportedWrap}>
          <FlowTitle
            compact
            title={t("flowPreviewTitle")}
            subtitle={compact ? null : t("flowPreviewSubtitle")}
            style={styles.editTitle}
          />
          <ExportedPreview
            key={exported.uri}
            uri={exported.uri}
            ratio={ratio}
            styles={styles}
            theme={theme}
          />
        </View>
        <FlowFooter
          secondary={{
            label: t("flowBackToEditing"),
            onPress: backToEditing,
            icon: "edit",
          }}
          primary={{
            label: t("flowNextPublish"),
            onPress: () => setStep("publish"),
            trailingIcon: "chevron-right",
          }}
        />
      </>
    );
  };

  return (
    <View style={styles.root}>
      <FlowHeader
        title={headerTitle}
        step={{ current: stepNumber, total: stepTotal }}
        onBack={onHeaderBack}
        backDisabled={busy || publishBusy}
        backIcon={
          stepIndex === 0 || (step === "publish" && published) ? "close" : "back"
        }
      />

      {step === "upload" ? renderUploadStep() : null}
      {step === "trim" || step === "style" ? renderEditStep() : null}
      {step === "preview" ? renderPreviewStep() : null}
      {step === "publish" && exported ? (
        <StudioPublishStep
          video={exported}
          onBusyChange={setPublishBusy}
          registerAbort={registerPublishAbort}
          onPublished={() => setPublished(true)}
          onFinished={leaveStudio}
        />
      ) : null}

      {busy ? (
        <ExportOverlay
          title={savingToGallery ? t("savingVideo") : t("flowExportingTitle")}
          percent={savingToGallery ? null : exportProgress}
          hint={t("exportKeepAppOpen")}
        />
      ) : null}

      <AddClipSheet
        visible={addClipOpen}
        timeLabel={
          totalMs > maxClipMs + 50
            ? t("addClipOverLimit", {
                time: formatMs(totalMs - maxClipMs),
                max: formatMs(maxClipMs),
              })
            : t("addClipTimeLeft", { time: formatMs(maxClipMs - totalMs) })
        }
        onClose={() => setAddClipOpen(false)}
        onPick={onAddClipSource}
      />

      <MusicLibrarySheet
        visible={musicLibraryOpen}
        onClose={() => setMusicLibraryOpen(false)}
        onSelect={(track) => void applyLibraryTrack(track)}
      />
    </View>
  );
}
