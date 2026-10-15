import { makeClipId } from "expo-media-edit";
import type { MediaUploadSourceType } from "@/src/types/media";
import type { AutoReelMusic } from "@/src/types/reels";

/**
 * One-shot hand-off from the editor's "save" mode back to the screen that
 * opened it (e.g. Reel Templates). The opener creates a request id, passes
 * it to /editVideo, and takes the result when it regains focus. Kept in
 * memory only — route params can't carry a result back through router.back().
 */
export type EditedVideoResult = {
  requestId: string;
  /** Local file:// MP4 (cache) — ready to upload. */
  uri: string;
  fileName: string;
  mimeType: string;
  durationMs: number;
  width: number;
  height: number;
  /** false when nothing changed — the original file is handed back as-is. */
  edited: boolean;
  /** false when gallery permission was denied or saving failed. */
  savedToGallery: boolean;
  /** Creative Commons credit for library music — must go in the reel caption. */
  musicCredit?: string | null;
  /** AI auto reel: the music chosen under Trim (undefined = not asked there) */
  reelMusic?: AutoReelMusic | null;
};

let pending: EditedVideoResult | null = null;

export function createEditRequestId(): string {
  return makeClipId("edit");
}

export function deliverEditedVideo(result: EditedVideoResult): void {
  pending = result;
}

/** Returns (and clears) the result for `requestId`, if the editor delivered one. */
export function takeEditedVideo(requestId: string | null): EditedVideoResult | null {
  if (!requestId || !pending || pending.requestId !== requestId) return null;
  const result = pending;
  pending = null;
  return result;
}

/** A picked photo / video the editor opens with. */
export type EditorSeedAsset = {
  uri: string;
  kind: "video" | "image";
  fileName?: string | null;
  mimeType?: string | null;
  width?: number;
  height?: number;
  sourceType: MediaUploadSourceType;
};

let seed: { requestId: string; assets: EditorSeedAsset[] } | null = null;

/**
 * Several picks for the editor to open with — route params carry one uri.
 * Set right before pushing the studio with the same request id.
 */
export function setEditorSeed(requestId: string, assets: EditorSeedAsset[]): void {
  seed = { requestId, assets };
}

/** Picks left for `requestId` (kept until the next request, so a remount still finds them). */
export function getEditorSeed(requestId: string | null | undefined): EditorSeedAsset[] | null {
  if (!requestId || !seed || seed.requestId !== requestId) return null;
  return seed.assets;
}

/**
 * AI auto reel (trim-only studio): the last step before the reel is made —
 * the button's words, the note under it and, for a silent design, the music
 * choice shown under Trim. Set with the seed, same request id.
 */
export type EditorAutoReelOptions = {
  doneLabel: string;
  doneHint: string | null;
  music: {
    /** The template's own song (selected to start) */
    defaultMusic: AutoReelMusic | null;
    /** Start choice: undefined = none yet, null = No music */
    value: AutoReelMusic | null | undefined;
    /** Reel length — shorter library tracks are hidden */
    lengthSeconds: number | null;
  } | null;
};

let autoReelOptions: { requestId: string; options: EditorAutoReelOptions } | null =
  null;

export function setEditorAutoReelOptions(
  requestId: string,
  options: EditorAutoReelOptions | null,
): void {
  autoReelOptions = options ? { requestId, options } : null;
}

export function getEditorAutoReelOptions(
  requestId: string | null | undefined,
): EditorAutoReelOptions | null {
  if (!requestId || !autoReelOptions || autoReelOptions.requestId !== requestId) {
    return null;
  }
  return autoReelOptions.options;
}
