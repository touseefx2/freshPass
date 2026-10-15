import type { AutoReelMusic } from "@/src/types/reels";

/**
 * Music chosen on the create step of a one-video design, per auto reel id
 * (this app session only). The server answers `design.music: null` in
 * `review` both when the template's own song is kept (nothing sent) and when
 * the user chose "No music" — this tells the two apart.
 * `undefined` from `createMusicFor` = not known (e.g. made on another device).
 */
const choices = new Map<number, AutoReelMusic | null>();

export function rememberCreateMusic(
  autoReelId: number,
  music: AutoReelMusic | null,
) {
  choices.set(autoReelId, music);
}

export function createMusicFor(
  autoReelId: number,
): AutoReelMusic | null | undefined {
  return choices.has(autoReelId) ? choices.get(autoReelId) : undefined;
}
