import { Platform } from "react-native";
import * as ImageManipulator from "expo-image-manipulator";
import {
  generateThumbnail,
  getVideoInfo,
  makeClipId,
  type OverlayClip,
  type VideoClip,
} from "expo-media-edit";
import type { MediaUploadSourceType } from "@/src/types/media";
import { ensureLocalMediaFileUri } from "@/src/utils/localMediaUri";

/** Shortest clip the editor allows (matches the trim sliders' 500ms gap). */
export const MIN_CLIP_MS = 500;
export const MAX_EDITOR_CLIPS = 10;
export const MAX_EDITOR_STICKERS = 10;
/** Android re-draws overlays every 100ms during export — keep photos few + small. */
export const MAX_IMAGE_STICKERS = 5;
export const STICKER_IMAGE_MAX_SIDE = 720;

export type EditorClip = {
  id: string;
  /** Local file:// copy that both preview and export can open. */
  uri: string;
  sourceDurationMs: number;
  trimStartMs: number;
  trimEndMs: number;
  /** Rotation-corrected pixel size. */
  width: number;
  height: number;
  sourceType: MediaUploadSourceType;
  /** This clip's own sound is off (Instagram per-clip mute). */
  muted?: boolean;
};

/**
 * Stickers live in frame-relative units so the same numbers drive the RN
 * preview and the native export:
 *   x, y      centre of the sticker, 0..1 of the frame
 *   size      emoji → glyph size as a fraction of frame HEIGHT
 *             image → width as a fraction of frame WIDTH
 *   rotation  degrees, clockwise (RN convention)
 */
export type EditorSticker =
  | {
      id: string;
      kind: "emoji";
      emoji: string;
      x: number;
      y: number;
      size: number;
      rotation: number;
    }
  | {
      id: string;
      kind: "image";
      uri: string;
      /** width / height of the image file. */
      aspect: number;
      x: number;
      y: number;
      size: number;
      rotation: number;
    };

export type StickerKind = EditorSticker["kind"];

export const STICKER_SIZE_RANGE: Record<StickerKind, { min: number; max: number; initial: number }> = {
  emoji: { min: 0.04, max: 0.4, initial: 0.1 },
  image: { min: 0.12, max: 1, initial: 0.4 },
};

/** Curated for salon / beauty reels. Single code points only (no ZWJ) so older Android fonts render them. */
export const EMOJI_STICKERS = [
  "✨",
  "🔥",
  "❤️",
  "😍",
  "💅",
  "💇",
  "💄",
  "💈",
  "✂️",
  "👑",
  "💖",
  "🌸",
  "⭐",
  "🌟",
  "💯",
  "🎉",
  "👏",
  "🙌",
  "😎",
  "🥰",
  "💋",
  "👍",
  "📍",
  "🆕",
] as const;

export function clipLengthMs(clip: Pick<EditorClip, "trimStartMs" | "trimEndMs">): number {
  return Math.max(0, clip.trimEndMs - clip.trimStartMs);
}

export function totalClipsMs(clips: EditorClip[]): number {
  return clips.reduce((sum, c) => sum + clipLengthMs(c), 0);
}

/** Timeline start of clip `index` when clips play back-to-back. */
export function clipOffsetMs(clips: EditorClip[], index: number): number {
  let offset = 0;
  for (let i = 0; i < index && i < clips.length; i++) {
    offset += clipLengthMs(clips[i]);
  }
  return offset;
}

export function clampStickerSize(kind: StickerKind, size: number): number {
  const { min, max } = STICKER_SIZE_RANGE[kind];
  return Math.min(max, Math.max(min, size));
}

export function normalizeDegrees(deg: number): number {
  let d = deg % 360;
  if (d > 180) d -= 360;
  if (d <= -180) d += 360;
  return Math.round(d * 10) / 10;
}

/**
 * Copy a picked/recorded video into the cache and read its metadata.
 * Trim defaults to the whole clip, capped to `budgetMs`.
 */
export async function prepareEditorClip(input: {
  uri: string;
  fileName?: string | null;
  sourceType: MediaUploadSourceType;
  budgetMs: number;
}): Promise<EditorClip> {
  const ext = (input.fileName || "video.mp4").split(".").pop() || "mp4";
  const localUri = await ensureLocalMediaFileUri(input.uri, ext);
  const info = await getVideoInfo(localUri);
  const sourceDurationMs =
    info.durationMs > 0 ? Math.max(MIN_CLIP_MS, Math.floor(info.durationMs)) : 5000;
  return {
    id: makeClipId("clip"),
    uri: localUri,
    sourceDurationMs,
    trimStartMs: 0,
    trimEndMs: Math.min(sourceDurationMs, Math.max(MIN_CLIP_MS, Math.floor(input.budgetMs))),
    width: Math.max(0, info.width || 0),
    height: Math.max(0, info.height || 0),
    sourceType: input.sourceType,
  };
}

export async function clipThumbnail(clip: EditorClip): Promise<string | null> {
  try {
    return await generateThumbnail(
      clip.uri,
      Math.min(clip.trimStartMs + 300, Math.max(0, clip.trimEndMs - 1)),
      { width: 200, height: 200 },
    );
  } catch {
    return null;
  }
}

export const FILMSTRIP_FRAMES = 10;

/**
 * Evenly spaced frames across the WHOLE source (split clips share one
 * strip per file). Failed frames come back as null so the strip keeps
 * its layout.
 */
export async function sourceFilmstrip(
  uri: string,
  sourceDurationMs: number,
  count = FILMSTRIP_FRAMES,
): Promise<(string | null)[]> {
  const step = sourceDurationMs / count;
  return Promise.all(
    Array.from({ length: count }, (_, i) =>
      generateThumbnail(
        uri,
        Math.min(Math.max(0, sourceDurationMs - 1), Math.round(step * (i + 0.5))),
        { width: 120, height: 120 },
      ).catch(() => null),
    ),
  );
}

/**
 * Cut `clip` at `atSourceMs` into two clips over the same file.
 * Returns null when either half would be shorter than MIN_CLIP_MS.
 */
export function splitClip(
  clip: EditorClip,
  atSourceMs: number,
): [EditorClip, EditorClip] | null {
  const at = Math.round(atSourceMs);
  if (at - clip.trimStartMs < MIN_CLIP_MS || clip.trimEndMs - at < MIN_CLIP_MS) {
    return null;
  }
  return [
    { ...clip, trimEndMs: at },
    { ...clip, id: makeClipId("clip"), trimStartMs: at },
  ];
}

/**
 * Normalise a picked photo for overlay use: EXIF-upright, at most
 * STICKER_IMAGE_MAX_SIDE px (Android re-decodes it per overlay frame),
 * PNG when the source may carry transparency.
 */
export async function prepareStickerImage(asset: {
  uri: string;
  width?: number;
  height?: number;
  mimeType?: string | null;
}): Promise<{ uri: string; width: number; height: number }> {
  const w = asset.width || 0;
  const h = asset.height || 0;
  const actions: ImageManipulator.Action[] = [];
  if (!w || !h || Math.max(w, h) > STICKER_IMAGE_MAX_SIDE) {
    actions.push(
      w >= h
        ? { resize: { width: STICKER_IMAGE_MAX_SIDE } }
        : { resize: { height: STICKER_IMAGE_MAX_SIDE } },
    );
  }
  const keepAlpha = /png|webp|gif/i.test(asset.mimeType || asset.uri);
  const result = await ImageManipulator.manipulateAsync(asset.uri, actions, {
    compress: keepAlpha ? 1 : 0.9,
    format: keepAlpha
      ? ImageManipulator.SaveFormat.PNG
      : ImageManipulator.SaveFormat.JPEG,
  });
  const uri = result.uri.startsWith("file://") ? result.uri : `file://${result.uri}`;
  return { uri, width: result.width, height: result.height };
}

export function buildVideoTrackClips(clips: EditorClip[]): VideoClip[] {
  let cursor = 0;
  return clips.map((clip) => {
    const start = Math.round(clip.trimStartMs);
    const end = Math.round(clip.trimEndMs);
    const len = end - start;
    const out: VideoClip = {
      id: clip.id,
      sourceUri: clip.uri,
      sourceRange: { startMs: start, endMs: end },
      timelineRange: { startMs: cursor, endMs: cursor + len },
      originalVolume: clip.muted ? 0 : 1,
    };
    cursor += len;
    return out;
  });
}

/**
 * Map a sticker onto expo-media-edit overlays. The native renderers
 * disagree on a few details, so this is where they get evened out:
 *  - iOS exports in a bottom-left (y-up) CoreAnimation space, so a positive
 *    rotation turns counter-clockwise there → flip the sign.
 *  - iOS image overlays use x/y as the TOP-LEFT and aspect-fit; Android uses
 *    x/y as the CENTRE and stretches → send an aspect-exact box and the
 *    matching origin per platform.
 *  - Emoji go through the text overlay (rendered by the system emoji font).
 */
export function stickerToOverlay(
  sticker: EditorSticker,
  canvas: { width: number; height: number },
): OverlayClip {
  const rotation =
    Platform.OS === "ios" ? -sticker.rotation : sticker.rotation;

  if (sticker.kind === "emoji") {
    return {
      id: sticker.id,
      kind: "text",
      content: sticker.emoji,
      x: sticker.x,
      y: sticker.y,
      anchor: "center",
      textAlign: "center",
      paddingX: 0,
      paddingY: 0,
      fontSize: Math.max(8, Math.round(sticker.size * 1080)),
      color: "#FFFFFF",
      fontWeight: "normal",
      fontStyle: "normal",
      fontFamily: "system",
      rotation,
    };
  }

  const canvasRatio = canvas.width / Math.max(1, canvas.height);
  const width = sticker.size;
  const height = (sticker.size * canvasRatio) / Math.max(0.01, sticker.aspect);
  const centred = Platform.OS === "android";
  return {
    id: sticker.id,
    kind: "image",
    uri: sticker.uri,
    x: centred ? sticker.x : sticker.x - width / 2,
    y: centred ? sticker.y : sticker.y - height / 2,
    width,
    height,
    opacity: 1,
    rotation,
  };
}
