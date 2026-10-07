import { Audio } from "expo-av";
import { makeClipId } from "expo-media-edit";

/**
 * Background music = a list of songs that play one after another over the
 * reel (Instagram / CapCut style). Each song uses one part of its file; one
 * chosen song can repeat to fill whatever time is left.
 */
export type MusicSegment = {
  id: string;
  /** Local file:// copy (library download or phone file). */
  uri: string;
  /** "Title · Artist" for library songs, the file name for phone songs. */
  name: string;
  /** Creative Commons credit for library songs; null for phone files. */
  credit: string | null;
  /** Length of the whole file; 0 when it couldn't be read. */
  durationMs: number;
  /** Chosen part of the song (ms into the file). */
  startMs: number;
  /** End of the chosen part; 0 = automatic (to the end of the song or the reel). */
  endMs: number;
  /** 0..1 */
  volume: number;
};

/** One stretch of the reel where a song part plays. */
export type MusicSlot = {
  /** Unique per slot (a repeated song gets one slot per repeat). */
  key: string;
  segId: string;
  /** Index of the song in the list (for labels / colours). */
  index: number;
  uri: string;
  /** Where on the reel it starts. */
  at: number;
  len: number;
  /** Where in the song file it starts. */
  srcStart: number;
  volume: number;
  repeat: boolean;
};

export const MAX_MUSIC_SEGMENTS = 5;
export const MIN_MUSIC_PART_MS = 1000;
export const DEFAULT_MUSIC_VOLUME = 0.8;

export function newMusicSegment(input: {
  uri: string;
  name: string;
  credit: string | null;
  durationMs: number;
}): MusicSegment {
  return {
    id: makeClipId("music"),
    uri: input.uri,
    name: input.name,
    credit: input.credit,
    durationMs: input.durationMs,
    startMs: 0,
    endMs: 0,
    volume: DEFAULT_MUSIC_VOLUME,
  };
}

/** The part of a song that's used; automatic ends fill `availableMs`. */
export function segmentPart(
  seg: MusicSegment,
  availableMs: number,
): { start: number; end: number; len: number } {
  const dur = seg.durationMs > 0 ? seg.durationMs : Number.POSITIVE_INFINITY;
  const start = Math.max(
    0,
    Number.isFinite(dur) ? Math.min(seg.startMs, dur - MIN_MUSIC_PART_MS) : seg.startMs,
  );
  const end =
    seg.endMs > 0
      ? Math.min(seg.endMs, dur)
      : Math.min(dur, start + Math.max(MIN_MUSIC_PART_MS, availableMs));
  return { start, end, len: Math.max(0, end - start) };
}

/** Where each song part sits on the reel. Parts past the reel's end are left out. */
export function buildMusicSchedule(
  segs: MusicSegment[],
  videoMs: number,
  /** Song that repeats after the others to fill the reel; null = no repeat. */
  repeatId: string | null,
): MusicSlot[] {
  const slots: MusicSlot[] = [];
  if (videoMs <= 0) return slots;
  let at = 0;
  segs.forEach((seg, index) => {
    const part = segmentPart(seg, videoMs - at);
    if (at < videoMs && part.len > 0) {
      slots.push({
        key: seg.id,
        segId: seg.id,
        index,
        uri: seg.uri,
        at,
        len: Math.min(part.len, videoMs - at),
        srcStart: part.start,
        volume: seg.volume,
        repeat: false,
      });
    }
    at += part.len;
  });
  const repeatIndex = segs.findIndex((s) => s.id === repeatId);
  const last = segs[repeatIndex];
  if (last && at < videoMs) {
    const part = segmentPart(last, 0);
    if (part.len >= MIN_MUSIC_PART_MS / 2) {
      for (let r = 1; at < videoMs; r++) {
        slots.push({
          key: `${last.id}#${r}`,
          segId: last.id,
          index: repeatIndex,
          uri: last.uri,
          at,
          len: Math.min(part.len, videoMs - at),
          srcStart: part.start,
          volume: last.volume,
          repeat: true,
        });
        at += part.len;
      }
    }
  }
  return slots;
}

/** Total length of the chosen parts (no repeats), capped at nothing. */
export function musicPartsTotalMs(segs: MusicSegment[], videoMs: number): number {
  let at = 0;
  for (const seg of segs) at += segmentPart(seg, videoMs - at).len;
  return at;
}

/** Reel start of each song (in list order), even past the reel's end. */
export function musicSegmentOffsets(segs: MusicSegment[], videoMs: number): number[] {
  const out: number[] = [];
  let at = 0;
  for (const seg of segs) {
    out.push(at);
    at += segmentPart(seg, videoMs - at).len;
  }
  return out;
}

export function musicSlotAt(slots: MusicSlot[], reelMs: number): MusicSlot | null {
  for (const s of slots) {
    if (reelMs >= s.at && reelMs < s.at + s.len) return s;
  }
  return null;
}

/** Credits of every library song, e.g. `"A" by X (CC BY), "B" by Y (CC BY-SA)`. */
export function musicCreditText(segs: MusicSegment[]): string | null {
  const unique = Array.from(
    new Set(segs.map((s) => s.credit).filter((c): c is string => !!c)),
  );
  return unique.length ? unique.join(", ") : null;
}

/** Reads a song's length without playing it; 0 when it can't be read. */
export async function probeAudioDurationMs(uri: string): Promise<number> {
  try {
    const { sound, status } = await Audio.Sound.createAsync(
      { uri },
      { shouldPlay: false },
    );
    const ms = status.isLoaded ? status.durationMillis ?? 0 : 0;
    await sound.unloadAsync().catch(() => {});
    return ms;
  } catch {
    return 0;
  }
}

/** Splits "Title · Artist" into two lines for the song card. */
export function splitMusicName(seg: MusicSegment): { title: string; artist: string | null } {
  const i = seg.credit ? seg.name.lastIndexOf(" · ") : -1;
  return i > 0
    ? { title: seg.name.slice(0, i), artist: seg.name.slice(i + 3) }
    : { title: seg.name, artist: null };
}
