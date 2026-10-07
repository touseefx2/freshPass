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
/** Shortest part the Cut tool removes. */
export const MIN_CUT_MS = 200;
/** Cut never leaves less than this of a clip. */
export const MIN_KEEP_MS = 1000;
/** Kept pieces shorter than this next to a cut are folded into the cut. */
const CUT_SNAP_MS = 300;
const MIN_SEGMENT_MS = 50;

/** A part removed from the middle of a clip, in SOURCE ms. */
export type CutRange = { startMs: number; endMs: number };

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
  /** Parts cut out of the trim window, SOURCE ms, sorted, non-overlapping. */
  cuts?: CutRange[];
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

type ClipRange = Pick<EditorClip, "trimStartMs" | "trimEndMs" | "cuts">;

/** Cuts that fall inside the current trim window, clipped to it. */
export function activeCuts(clip: ClipRange): CutRange[] {
  return (clip.cuts ?? [])
    .map((c) => ({
      startMs: Math.max(c.startMs, clip.trimStartMs),
      endMs: Math.min(c.endMs, clip.trimEndMs),
    }))
    .filter((c) => c.endMs - c.startMs > 0);
}

/** Parts of the source that play, in order (trim window minus cuts). */
export function keptSegments(clip: ClipRange): CutRange[] {
  const out: CutRange[] = [];
  let cursor = clip.trimStartMs;
  // Slivers left by a trim handle next to a cut aren't worth a native clip
  const push = (startMs: number, endMs: number) => {
    if (endMs - startMs >= MIN_SEGMENT_MS) out.push({ startMs, endMs });
  };
  for (const cut of activeCuts(clip)) {
    push(cursor, cut.startMs);
    cursor = Math.max(cursor, cut.endMs);
  }
  push(cursor, clip.trimEndMs);
  return out;
}

/** Length that plays: the trim window minus the cut parts. */
export function clipLengthMs(clip: ClipRange): number {
  return keptSegments(clip).reduce((sum, s) => sum + (s.endMs - s.startMs), 0);
}

/** Where playback of the clip starts / stops, SOURCE ms. */
export function clipPlayRange(clip: ClipRange): CutRange {
  const segs = keptSegments(clip);
  return {
    startMs: segs[0]?.startMs ?? clip.trimStartMs,
    endMs: segs[segs.length - 1]?.endMs ?? clip.trimEndMs,
  };
}

/** SOURCE ms → ms into the clip as it plays (cut parts skipped). */
export function sourceToPlayMs(clip: ClipRange, sourceMs: number): number {
  let played = 0;
  for (const seg of keptSegments(clip)) {
    if (sourceMs <= seg.startMs) break;
    played += Math.min(sourceMs, seg.endMs) - seg.startMs;
  }
  return Math.max(0, played);
}

/** Ms into the clip as it plays → SOURCE ms. */
export function playToSourceMs(clip: ClipRange, playMs: number): number {
  const segs = keptSegments(clip);
  let left = Math.max(0, playMs);
  for (const seg of segs) {
    const len = seg.endMs - seg.startMs;
    if (left < len) return seg.startMs + left;
    left -= len;
  }
  return segs[segs.length - 1]?.endMs ?? clip.trimEndMs;
}

/**
 * Inside a cut part → the SOURCE ms where playback should jump to
 * (the cut's end), otherwise null. `leadMs` jumps a little early so the
 * coarse preview clock doesn't show the start of the removed part.
 */
export function skipCutAt(clip: ClipRange, sourceMs: number, leadMs = 0): number | null {
  for (const cut of activeCuts(clip)) {
    if (sourceMs >= cut.startMs - leadMs && sourceMs < cut.endMs) return cut.endMs;
  }
  return null;
}

/**
 * Remove `range` from the clip. Overlapping cuts merge, and slivers
 * shorter than CUT_SNAP_MS left next to a cut are cut too. Returns null
 * when less than MIN_KEEP_MS would be left.
 */
export function addCut(clip: EditorClip, range: CutRange): EditorClip | null {
  let start = Math.max(clip.trimStartMs, Math.round(Math.min(range.startMs, range.endMs)));
  let end = Math.min(clip.trimEndMs, Math.round(Math.max(range.startMs, range.endMs)));
  if (end - start < MIN_CUT_MS) return null;
  if (start - clip.trimStartMs < CUT_SNAP_MS) start = clip.trimStartMs;
  if (clip.trimEndMs - end < CUT_SNAP_MS) end = clip.trimEndMs;

  const all = [...(clip.cuts ?? []), { startMs: start, endMs: end }].sort(
    (a, b) => a.startMs - b.startMs,
  );
  const merged: CutRange[] = [];
  for (const cut of all) {
    const last = merged[merged.length - 1];
    if (last && cut.startMs - last.endMs < CUT_SNAP_MS) {
      last.endMs = Math.max(last.endMs, cut.endMs);
    } else {
      merged.push({ ...cut });
    }
  }
  const next = { ...clip, cuts: merged };
  return clipLengthMs(next) >= MIN_KEEP_MS ? next : null;
}

/**
 * Cut tool: remove the part between the orange handles, then open the
 * window back up to `outer` so the rest of the clip stays.
 */
export function cutTrimWindow(clip: EditorClip, outer: CutRange): EditorClip | null {
  return addCut(
    { ...clip, trimStartMs: outer.startMs, trimEndMs: outer.endMs },
    { startMs: clip.trimStartMs, endMs: clip.trimEndMs },
  );
}

// ── Trimmer view: the source with every cut part taken out, so a cut
// disappears from the strip and the parts around it join up.

function sortedCuts(clip: Pick<EditorClip, "cuts">): CutRange[] {
  return [...(clip.cuts ?? [])].sort((a, b) => a.startMs - b.startMs);
}

/** Length of the source once cut parts are taken out. */
export function viewDurationMs(clip: Pick<EditorClip, "sourceDurationMs" | "cuts">): number {
  const cut = sortedCuts(clip).reduce((sum, c) => sum + (c.endMs - c.startMs), 0);
  return Math.max(1, clip.sourceDurationMs - cut);
}

/** SOURCE ms → trimmer view ms. */
export function sourceToViewMs(clip: Pick<EditorClip, "cuts">, sourceMs: number): number {
  let view = sourceMs;
  for (const cut of sortedCuts(clip)) {
    if (cut.startMs >= sourceMs) break;
    view -= Math.min(sourceMs, cut.endMs) - cut.startMs;
  }
  return Math.max(0, view);
}

/**
 * Trimmer view ms → SOURCE ms. Where a cut was, `bias` picks the side:
 * "after" (start handles) lands past the cut, "before" (end handles) ahead of it.
 */
export function viewToSourceMs(
  clip: Pick<EditorClip, "cuts">,
  viewMs: number,
  bias: "after" | "before" = "after",
): number {
  let source = viewMs;
  for (const cut of sortedCuts(clip)) {
    const passed = bias === "after" ? cut.startMs <= source : cut.startMs < source;
    if (!passed) break;
    source += cut.endMs - cut.startMs;
  }
  return source;
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
      Math.min(clipPlayRange(clip).startMs + 300, Math.max(0, clip.trimEndMs - 1)),
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
  // Both halves keep the cut list; each only plays the cuts in its window.
  const parts: [EditorClip, EditorClip] = [
    { ...clip, trimEndMs: at },
    { ...clip, id: makeClipId("clip"), trimStartMs: at },
  ];
  if (
    at <= clip.trimStartMs ||
    at >= clip.trimEndMs ||
    clipLengthMs(parts[0]) < MIN_CLIP_MS ||
    clipLengthMs(parts[1]) < MIN_CLIP_MS
  ) {
    return null;
  }
  return parts;
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

/** One native video clip per kept part, so cut parts never reach the export. */
export function buildVideoTrackClips(clips: EditorClip[]): VideoClip[] {
  let cursor = 0;
  return clips.flatMap((clip) =>
    keptSegments(clip).map((seg, i) => {
      const start = Math.round(seg.startMs);
      const end = Math.round(seg.endMs);
      const len = end - start;
      const out: VideoClip = {
        id: i === 0 ? clip.id : `${clip.id}-part${i}`,
        sourceUri: clip.uri,
        sourceRange: { startMs: start, endMs: end },
        timelineRange: { startMs: cursor, endMs: cursor + len },
        originalVolume: clip.muted ? 0 : 1,
      };
      cursor += len;
      return out;
    }),
  );
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
