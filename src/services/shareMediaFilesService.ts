import { Platform, TurboModuleRegistry } from "react-native";
import * as FileSystem from "expo-file-system/legacy";

export type ShareMediaItem = { url: string; isVideo?: boolean };

export type ShareFilesProgress = {
  done: number;
  total: number;
  /** 0–1 across all files (bytes where the server sends a size) */
  fraction: number;
};

export type ShareFilesTask = {
  promise: Promise<string[]>;
  cancel: () => void;
};

export class ShareFilesCancelledError extends Error {
  constructor() {
    super("cancelled");
  }
}

const SHARE_DIR = `${FileSystem.cacheDirectory ?? ""}share/`;

const MIME_BY_EXT: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  heic: "image/heic",
  gif: "image/gif",
  mp4: "video/mp4",
  mov: "video/quicktime",
  m4v: "video/x-m4v",
  webm: "video/webm",
};

/**
 * react-native-share has native code, so it's missing in app builds made
 * before it was added (e.g. this JS arriving by OTA). Callers fall back to
 * the plain text share then.
 */
export const canShareFiles = () =>
  Platform.OS !== "web" && TurboModuleRegistry.get("RNShare") != null;

const extFor = (item: ShareMediaItem) => {
  const path = item.url.split("?")[0].split("#")[0];
  const last = path.split("/").pop() ?? "";
  const ext = last.includes(".")
    ? last.slice(last.lastIndexOf(".") + 1).toLowerCase()
    : "";
  if (ext && MIME_BY_EXT[ext]) return ext;
  return item.isVideo ? "mp4" : "jpg";
};

const mimeFor = (uri: string) => {
  const ext = uri.slice(uri.lastIndexOf(".") + 1).toLowerCase();
  return MIME_BY_EXT[ext] ?? "application/octet-stream";
};

/**
 * Downloads every file into the cache (old share files are cleared first, the
 * receiving app may still be reading the last batch until then).
 */
export function downloadFilesForShare(
  items: ShareMediaItem[],
  onProgress?: (progress: ShareFilesProgress) => void,
): ShareFilesTask {
  let cancelled = false;
  const fractions = items.map(() => 0);
  let done = 0;
  const report = () =>
    onProgress?.({
      done,
      total: items.length,
      fraction: fractions.reduce((a, b) => a + b, 0) / (items.length || 1),
    });

  const batch = Date.now();
  const tasks = items.map((item, i) =>
    FileSystem.createDownloadResumable(
      item.url,
      `${SHARE_DIR}${batch}_${i + 1}.${extFor(item)}`,
      {},
      ({ totalBytesWritten, totalBytesExpectedToWrite }) => {
        if (totalBytesExpectedToWrite > 0) {
          fractions[i] = Math.min(
            0.99,
            totalBytesWritten / totalBytesExpectedToWrite,
          );
          report();
        }
      },
    ),
  );

  const promise = (async () => {
    await FileSystem.deleteAsync(SHARE_DIR, { idempotent: true });
    await FileSystem.makeDirectoryAsync(SHARE_DIR, { intermediates: true });
    report();
    return Promise.all(
      tasks.map(async (task, i) => {
        const result = await task.downloadAsync();
        if (cancelled || !result) throw new ShareFilesCancelledError();
        if (result.status < 200 || result.status >= 300) {
          throw new Error(`Download failed (${result.status})`);
        }
        fractions[i] = 1;
        done += 1;
        report();
        return result.uri;
      }),
    );
  })();

  return {
    promise,
    cancel: () => {
      cancelled = true;
      tasks.forEach((task) => void task.cancelAsync().catch(() => {}));
    },
  };
}

/** Opens the phone share sheet with real files (+ text as the caption) */
export async function shareLocalFiles(
  uris: string[],
  options: { message?: string; title?: string } = {},
) {
  // Required lazily: importing it throws when the native module is missing
  const Share = require("react-native-share").default;
  const types = Array.from(new Set(uris.map(mimeFor)));
  const type =
    types.length === 1
      ? types[0]
      : types.every((t) => t.startsWith("image/"))
        ? "image/*"
        : types.every((t) => t.startsWith("video/"))
          ? "video/*"
          : "*/*";
  await Share.open({
    urls: uris,
    type,
    message: options.message || undefined,
    title: options.title,
    failOnCancel: false,
  });
}
