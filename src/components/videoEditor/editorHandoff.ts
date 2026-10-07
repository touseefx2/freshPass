import { makeClipId } from "expo-media-edit";

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
