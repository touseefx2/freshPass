import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system/legacy";
import Logger from "@/src/services/logger";

/**
 * Free background music for the video editor.
 *
 * Source: Openverse (https://api.openverse.org) — no API key, Creative Commons
 * audio mostly from Jamendo / ccMixter. Only licenses that allow commercial use
 * AND remixing (syncing music to video counts as an adaptation) are requested:
 * CC0, CC BY, CC BY-SA. NC / ND tracks are never returned.
 *
 * Anonymous quota is 20 req/min and 200 req/day per IP, so results are cached
 * in memory and the sheet debounces search. Move this behind our backend (with
 * registered Openverse credentials) if usage grows.
 */

const API_BASE = "https://api.openverse.org/v1/audio/";
const PAGE_SIZE = 20;
const ALLOWED_LICENSES = "cc0,by,by-sa";
const ALLOWED_SOURCES = "jamendo,ccmixter";
/** Openverse "short" ≈ under 2 min — fits reels; long tracks aren't useful here. */
const TRACK_LENGTH = "short";
const CACHE_TTL_MS = 30 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 15000;

const DOWNLOADS_KEY = "musicLibrary.downloads.v1";
const DOWNLOAD_DIR = `${FileSystem.documentDirectory ?? ""}music-library/`;

export type LibraryTrack = {
  id: string;
  title: string;
  artist: string;
  durationMs: number;
  streamUrl: string;
  /** Openverse license slug: "cc0" | "by" | "by-sa". */
  license: string;
  licenseVersion: string | null;
  licenseUrl: string | null;
  sourceUrl: string | null;
  genres: string[];
};

export type DownloadedTrack = LibraryTrack & {
  localUri: string;
  downloadedAt: number;
};

export type MusicMood = { key: string; labelKey: string; query: string };

/**
 * Chips in the library sheet. Empty query = popular / default ranking.
 * Picked so each has plenty of short (≤ ~2 min) tracks — e.g. "lofi" / "chill" return almost none.
 */
export const MUSIC_MOODS: MusicMood[] = [
  { key: "trending", labelKey: "musicMoodTrending", query: "" },
  { key: "upbeat", labelKey: "musicMoodUpbeat", query: "upbeat" },
  { key: "happy", labelKey: "musicMoodHappy", query: "happy" },
  { key: "energetic", labelKey: "musicMoodEnergetic", query: "energetic" },
  { key: "dance", labelKey: "musicMoodDance", query: "dance" },
  { key: "motivational", labelKey: "musicMoodMotivational", query: "motivational" },
  { key: "romantic", labelKey: "musicMoodRomantic", query: "romantic" },
  { key: "cinematic", labelKey: "musicMoodCinematic", query: "cinematic" },
  { key: "piano", labelKey: "musicMoodPiano", query: "piano" },
  { key: "guitar", labelKey: "musicMoodGuitar", query: "guitar" },
  { key: "ambient", labelKey: "musicMoodAmbient", query: "ambient" },
  { key: "jazz", labelKey: "musicMoodJazz", query: "jazz" },
];

export type MusicLibraryErrorCode = "rate_limited" | "failed";

export class MusicLibraryError extends Error {
  code: MusicLibraryErrorCode;
  constructor(code: MusicLibraryErrorCode, message?: string) {
    super(message ?? code);
    this.code = code;
  }
}

type SearchPage = { tracks: LibraryTrack[]; hasMore: boolean };

const searchCache = new Map<string, { at: number; page: SearchPage }>();

function mapResult(r: any): LibraryTrack | null {
  if (!r?.id || typeof r.url !== "string" || !r.url.startsWith("https://")) {
    return null;
  }
  return {
    id: String(r.id),
    title: String(r.title || "Untitled").trim(),
    artist: String(r.creator || "Unknown artist").trim(),
    durationMs: typeof r.duration === "number" ? r.duration : 0,
    streamUrl: r.url,
    license: String(r.license || "").toLowerCase(),
    licenseVersion: r.license_version ? String(r.license_version) : null,
    licenseUrl: r.license_url ?? null,
    sourceUrl: r.foreign_landing_url ?? null,
    genres: Array.isArray(r.genres) ? r.genres.map(String) : [],
  };
}

/** One page of tracks. `query` empty = default ranking. Throws MusicLibraryError. */
export async function searchLibraryTracks(
  query: string,
  page = 1,
): Promise<SearchPage> {
  const q = query.trim().toLowerCase();
  const cacheKey = `${q}|${page}`;
  const cached = searchCache.get(cacheKey);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.page;

  const params = [
    q ? `q=${encodeURIComponent(q)}` : "",
    "category=music",
    `license=${ALLOWED_LICENSES}`,
    `source=${ALLOWED_SOURCES}`,
    "mature=false",
    `length=${TRACK_LENGTH}`,
    `page_size=${PAGE_SIZE}`,
    `page=${page}`,
  ]
    .filter(Boolean)
    .join("&");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(`${API_BASE}?${params}`, {
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
  } catch (error) {
    Logger.error("Music library request failed:", error);
    throw new MusicLibraryError("failed");
  } finally {
    clearTimeout(timer);
  }

  if (res.status === 429) throw new MusicLibraryError("rate_limited");
  // Openverse returns 400 when paging past the last result page.
  if (res.status === 400 && page > 1) return { tracks: [], hasMore: false };
  if (!res.ok) throw new MusicLibraryError("failed", `HTTP ${res.status}`);

  const json = await res.json();
  const tracks = (Array.isArray(json?.results) ? json.results : [])
    .map(mapResult)
    .filter((t: LibraryTrack | null): t is LibraryTrack => !!t);
  const pageCount = typeof json?.page_count === "number" ? json.page_count : 1;
  const result: SearchPage = { tracks, hasMore: page < pageCount };
  searchCache.set(cacheKey, { at: Date.now(), page: result });
  return result;
}

/** Short credit line, e.g. `"Winter Chill" by Color Out (CC BY 3.0)`. */
export function trackCredit(track: LibraryTrack): string {
  const license =
    track.license === "cc0"
      ? "CC0"
      : `CC ${track.license.toUpperCase()}${track.licenseVersion ? ` ${track.licenseVersion}` : ""}`;
  return `"${track.title}" by ${track.artist} (${license})`;
}

/** Caption line for one or more credits, e.g. `🎵 Music: "Song" by Artist (CC BY 4.0)`. */
export function musicCreditLine(credits: (string | null | undefined)[]): string {
  const unique = Array.from(new Set(credits.filter((c): c is string => !!c)));
  return unique.length ? `🎵 Music: ${unique.join(", ")}` : "";
}

/** Appends the credit line to the caption (once). Library tracks require it. */
export function captionWithMusicCredit(caption: string, creditLine: string): string {
  const text = caption.trim();
  if (!creditLine || text.includes(creditLine)) return text;
  return text ? `${text}\n\n${creditLine}` : creditLine;
}

/** Caption characters to keep free for the credit line. */
export function musicCreditReserve(creditLine: string): number {
  return creditLine ? creditLine.length + 2 : 0;
}

export function licenseLabel(track: LibraryTrack): string {
  return track.license === "cc0" ? "CC0" : `CC ${track.license.toUpperCase()}`;
}

// ── Offline downloads ───────────────────────────────────────────────

async function readIndex(): Promise<DownloadedTrack[]> {
  try {
    const raw = await AsyncStorage.getItem(DOWNLOADS_KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

async function writeIndex(list: DownloadedTrack[]): Promise<void> {
  await AsyncStorage.setItem(DOWNLOADS_KEY, JSON.stringify(list));
}

/** Downloaded tracks, newest first. Drops entries whose file is gone. */
export async function getDownloadedTracks(): Promise<DownloadedTrack[]> {
  const list = await readIndex();
  const checked = await Promise.all(
    list.map(async (t) => {
      try {
        const info = await FileSystem.getInfoAsync(t.localUri);
        return info.exists ? t : null;
      } catch {
        return null;
      }
    }),
  );
  const valid = checked.filter((t): t is DownloadedTrack => !!t);
  if (valid.length !== list.length) await writeIndex(valid);
  return valid.sort((a, b) => b.downloadedAt - a.downloadedAt);
}

const inFlight = new Map<string, Promise<DownloadedTrack>>();

/** Saves the track for offline use (deduped per track). `onProgress` gets 0–1. */
export function downloadTrack(
  track: LibraryTrack,
  onProgress?: (progress: number) => void,
): Promise<DownloadedTrack> {
  const existing = inFlight.get(track.id);
  if (existing) return existing;

  const task = (async () => {
    if (!FileSystem.documentDirectory) {
      throw new Error("Document directory unavailable");
    }
    const dirInfo = await FileSystem.getInfoAsync(DOWNLOAD_DIR);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(DOWNLOAD_DIR, { intermediates: true });
    }
    const dest = `${DOWNLOAD_DIR}${track.id.replace(/[^a-zA-Z0-9-]/g, "")}.mp3`;
    const resumable = FileSystem.createDownloadResumable(
      track.streamUrl,
      dest,
      {},
      ({ totalBytesWritten, totalBytesExpectedToWrite }) => {
        if (totalBytesExpectedToWrite > 0) {
          onProgress?.(totalBytesWritten / totalBytesExpectedToWrite);
        }
      },
    );
    const result = await resumable.downloadAsync();
    if (!result || result.status < 200 || result.status >= 300) {
      await FileSystem.deleteAsync(dest, { idempotent: true });
      throw new Error(`Download failed (${result?.status ?? "no response"})`);
    }
    const saved: DownloadedTrack = {
      ...track,
      localUri: result.uri,
      downloadedAt: Date.now(),
    };
    const list = (await readIndex()).filter((t) => t.id !== track.id);
    await writeIndex([saved, ...list]);
    return saved;
  })();

  inFlight.set(track.id, task);
  task.then(
    () => inFlight.delete(track.id),
    () => inFlight.delete(track.id),
  );
  return task;
}

export async function removeDownloadedTrack(id: string): Promise<void> {
  const list = await readIndex();
  const target = list.find((t) => t.id === id);
  if (target) {
    await FileSystem.deleteAsync(target.localUri, { idempotent: true });
  }
  await writeIndex(list.filter((t) => t.id !== id));
}
