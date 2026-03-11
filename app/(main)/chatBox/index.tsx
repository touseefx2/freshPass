import React, {
  useMemo,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Image,
  Keyboard,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  AppState,
  Linking,
  Clipboard,
  type AppStateStatus,
} from "react-native";
import { useTheme, useAppSelector } from "@/src/hooks/hooks";
import { useDownloadMedia } from "@/src/hooks/useDownloadMedia";
import { useNotificationContext } from "@/src/contexts/NotificationContext";
import { useTranslation } from "react-i18next";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  heightScale,
  moderateHeightScale,
  moderateWidthScale,
  widthScale,
} from "@/src/theme/dimensions";
import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { CloseIcon, SendIcon } from "@/assets/icons";
import { MaterialIcons, Feather } from "@expo/vector-icons";
import { useDispatch } from "react-redux";
import { ApiService } from "@/src/services/api";
import { openFullImageModal, clearChatAttachmentUrls, setChatTryOnPreselectedUrls } from "@/src/state/slices/generalSlice";
import ImagePickerModal from "@/src/components/imagePickerModal";
import {
  getEcho,
  getPrivateChatChannelName,
  CHAT_MESSAGE_EVENT,
  CHAT_MESSAGES_READ_EVENT,
  CHAT_WHISPER_TYPING,
  CHAT_WHISPER_STOP_TYPING,
} from "@/src/services/echo";
import { useVideoPlayer, VideoView } from "expo-video";

const PER_PAGE = 20;
const MAX_ATTACHMENTS = 5;
const MESSAGES_URL = (userId: string) => `/api/chat/messages/${userId}`;
const MARK_READ_URL = (userId: string) => `/api/chat/messages/${userId}/read`;
const SEND_MESSAGE_URL = "/api/chat/messages";

type MessageItem = {
  id: string;
  text: string;
  isMe: boolean;
  timeLabel: string;
  dateTimeLabel: string;
  attachments?: string[];
  is_read?: boolean;
};

type ApiMessage = {
  id: number;
  message: string | null;
  sender: { id: number; name: string; email?: string };
  attachments?: string[];
  created_at: string;
};

type MessagesResponse = {
  success: boolean;
  data: {
    data: ApiMessage[];
    meta: {
      current_page: number;
      last_page: number;
      per_page: number;
      total: number;
    };
  };
};

type SendMessageResponse = {
  success: boolean;
  message: string;
  data: ApiMessage;
};

function getMimeAndName(uri: string): { mimeType: string; name: string } {
  const ext = uri.split(".").pop()?.toLowerCase() || "jpg";
  const mimeType =
    ext === "jpg" || ext === "jpeg"
      ? "image/jpeg"
      : ext === "png"
        ? "image/png"
        : ext === "gif"
          ? "image/gif"
          : "image/jpeg";
  const name = uri.split("/").pop() || `image.${ext}`;
  return { mimeType, name };
}

/** Normalize attachment item from API/socket (can be string or object with url/path) to string. */
function attachmentToUrl(item: unknown): string | null {
  if (item == null) return null;
  if (typeof item === "string") return item;
  if (typeof item === "object" && item !== null) {
    const o = item as Record<string, unknown>;
    const u = o.url ?? o.path ?? o.src;
    if (typeof u === "string") return u;
  }
  return null;
}

function getMessageImageUrl(url: string | null | undefined): string {
  if (url == null || typeof url !== "string") return "";
  const trimmed = url.trim();
  if (trimmed === "") return "";
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }
  const base = (process.env.EXPO_PUBLIC_API_BASE_URL || "").replace(/\/$/, "");
  const path = trimmed.replace(/^\//, "");
  return path ? `${base}/${path}` : "";
}

function formatMessageTime(isoString: string): string {
  const date = new Date(isoString);
  const hours = date.getHours();
  const mins = date.getMinutes();
  const ampm = hours >= 12 ? "PM" : "AM";
  const h = hours % 12 || 12;
  const m = `${mins}`.padStart(2, "0");
  return `${h}:${m} ${ampm}`;
}

function formatMessageDateTime(isoString: string): string {
  const date = new Date(isoString);
  const day = date.getDate();
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  const time = formatMessageTime(isoString);
  return `${day} ${month} ${year}, ${time}`;
}

const URL_REGEX = /(https?:\/\/[^\s]+)/g;
const IMAGE_EXT = /\.(jpe?g|png|gif|webp)(\?.*)?$/i;
const VIDEO_EXT = /\.(mp4|webm|mov|m4v)(\?.*)?$/i;

function isImageUrl(url: string): boolean {
  const trimmed = url.trim();
  if (!trimmed) return false;
  return IMAGE_EXT.test(trimmed);
}

function isVideoUrl(url: string): boolean {
  const trimmed = url.trim();
  if (!trimmed) return false;
  return VIDEO_EXT.test(trimmed);
}

type MessageSegment =
  | { type: "text"; value: string }
  | { type: "link"; value: string; url: string }
  | { type: "image"; value: string; url: string; label?: string }
  | { type: "video"; value: string; url: string };

function extractLabelFromPreviousText(text: string): {
  label: string;
  rest: string;
} {
  const trimmed = text.trimEnd();
  const lastNewline = trimmed.lastIndexOf("\n");
  const lastLine = lastNewline >= 0 ? trimmed.slice(lastNewline + 1) : trimmed;
  const match = lastLine.match(/^(\s*)([A-Za-z]+):\s*$/);
  if (match) {
    const rest = lastNewline >= 0 ? trimmed.slice(0, lastNewline + 1) : "";
    return { label: match[2], rest };
  }
  return { label: "", rest: text };
}

function parseMessageText(text: string): MessageSegment[] {
  if (!text || typeof text !== "string") return [];
  const segments: MessageSegment[] = [];
  let lastIndex = 0;
  const re = new RegExp(URL_REGEX.source, "g");
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > lastIndex) {
      segments.push({ type: "text", value: text.slice(lastIndex, m.index) });
    }
    const url = m[1];
    const isImage = isImageUrl(url);
    const isVideo = isVideoUrl(url);
    if (isImage) {
      const prev = segments[segments.length - 1];
      let label: string | undefined;
      if (prev?.type === "text") {
        const { label: extracted, rest } = extractLabelFromPreviousText(
          prev.value,
        );
        if (extracted) {
          label = extracted;
          prev.value = rest;
          if (!rest.trim()) segments.pop();
        }
      }
      segments.push({ type: "image", value: url, url, label });
    } else if (isVideo) {
      segments.push({ type: "video", value: url, url });
    } else {
      segments.push({ type: "link", value: url, url });
    }
    lastIndex = re.lastIndex;
  }
  if (lastIndex < text.length) {
    segments.push({ type: "text", value: text.slice(lastIndex) });
  }
  return segments;
}

type ChatVideoPlayerProps = {
  videoUrl: string;
  styles: ReturnType<typeof createStyles>;
  theme: Theme;
  onDownloadPress?: (url: string, options?: { isVideo?: boolean }) => void;
  downloadingUrl?: string | null;
  compact?: boolean;
  compactSingle?: boolean;
  useOriginalMediaLayout?: boolean;
};

function ChatVideoPlayerInner({
  videoUrl,
  styles,
  theme,
  onDownloadPress,
  downloadingUrl,
  compact = false,
  useOriginalMediaLayout = false,
}: ChatVideoPlayerProps) {
  const { t } = useTranslation();
  const [isVideoReady, setIsVideoReady] = useState(false);
  const resolvedUrl = getMessageImageUrl(videoUrl) || videoUrl;
  const player = useVideoPlayer(resolvedUrl, (p) => {
    p.loop = false;
  });

  const containerStyle = compact
    ? styles.bubbleMediaVideoContainer
    : styles.bubbleVideoContainer;
  const videoStyle = compact ? styles.bubbleMediaVideo : styles.bubbleVideo;
  const loadingStyle = compact
    ? styles.bubbleMediaVideoLoadingOverlay
    : styles.bubbleVideoLoadingOverlay;
  const downloadStyle =
    useOriginalMediaLayout && compact
      ? styles.bubbleOriginalMediaDownloadButton
      : compact
        ? styles.bubbleMediaVideoDownloadButtonOverlay
        : styles.bubbleVideoDownloadButtonOverlay;

  return (
    <>
      <View style={containerStyle}>
        <View style={StyleSheet.absoluteFill}>
          <VideoView
            player={player}
            style={videoStyle}
            contentFit="contain"
            nativeControls={true}
            onFirstFrameRender={async () => {
              if (!isVideoReady) {
                await player.play();
                setTimeout(() => setIsVideoReady(true), 200);
              }
            }}
          />
        </View>
        {!isVideoReady && (
          <View style={loadingStyle}>
            <ActivityIndicator size="small" color={theme.white} />
            <Text style={styles.bubbleVideoLoadingText}>{t("loading")}</Text>
          </View>
        )}
        {onDownloadPress ? (
          <TouchableOpacity
            style={downloadStyle}
            onPress={(e) => {
              e.stopPropagation?.();
              onDownloadPress(resolvedUrl, { isVideo: true });
            }}
            disabled={downloadingUrl === resolvedUrl}
            activeOpacity={0.7}
          >
            {downloadingUrl === resolvedUrl ? (
              <ActivityIndicator size="small" color={theme.white} />
            ) : (
              <Feather
                name="download"
                size={moderateWidthScale(14)}
                color={theme.white}
              />
            )}
          </TouchableOpacity>
        ) : null}
      </View>
    </>
  );
}

function ChatVideoPlayer({
  videoUrl,
  styles,
  theme,
  onDownloadPress,
  downloadingUrl,
  compact = false,
  compactSingle = false,
  useOriginalMediaLayout = false,
}: ChatVideoPlayerProps) {
  const [showVideo, setShowVideo] = useState(false);

  const wrapStyle =
    useOriginalMediaLayout && compact
      ? compactSingle
        ? styles.bubbleOriginalMediaVideoWrapSingle
        : styles.bubbleOriginalMediaVideoWrap
      : compact
        ? compactSingle
          ? styles.bubbleMediaVideoWrapSingle
          : styles.bubbleMediaVideoWrap
        : styles.bubbleVideoWrap;
  const placeholderStyle = compact
    ? styles.bubbleMediaVideoPlaceholder
    : styles.bubbleVideoPlaceholder;
  const downloadOverlayStyle =
    useOriginalMediaLayout && compact
      ? styles.bubbleOriginalMediaDownloadButton
      : compact
        ? styles.bubbleMediaVideoDownloadButtonOverlay
        : styles.bubbleVideoDownloadButtonOverlay;

  if (showVideo) {
    return (
      <View style={wrapStyle}>
        <ChatVideoPlayerInner
          videoUrl={videoUrl}
          styles={styles}
          theme={theme}
          onDownloadPress={onDownloadPress}
          downloadingUrl={downloadingUrl}
          compact={compact}
          useOriginalMediaLayout={useOriginalMediaLayout}
        />
      </View>
    );
  }

  return (
    <View style={wrapStyle}>
      <TouchableOpacity
        style={placeholderStyle}
        onPress={() => setShowVideo(true)}
        activeOpacity={0.8}
      >
        <Feather
          name="play-circle"
          size={compact ? moderateWidthScale(32) : moderateWidthScale(56)}
          color={theme.white}
        />
      </TouchableOpacity>
      {onDownloadPress
        ? (() => {
            const resolvedUrl = getMessageImageUrl(videoUrl) || videoUrl;
            return (
              <TouchableOpacity
                style={downloadOverlayStyle}
                onPress={(e) => {
                  e.stopPropagation?.();
                  onDownloadPress(resolvedUrl, { isVideo: true });
                }}
                disabled={downloadingUrl === resolvedUrl}
                activeOpacity={0.7}
              >
                {downloadingUrl === resolvedUrl ? (
                  <ActivityIndicator size="small" color={theme.white} />
                ) : (
                  <Feather
                    name="download"
                    size={moderateWidthScale(14)}
                    color={theme.white}
                  />
                )}
              </TouchableOpacity>
            );
          })()
        : null}
    </View>
  );
}

type MessageContentProps = {
  text: string;
  isMe: boolean;
  hasAttachmentsAbove: boolean;
  styles: ReturnType<typeof createStyles>;
  theme: Theme;
  onLinkPress: (url: string) => void;
  onImagePress: (url: string, allUrls: string[]) => void;
  onDownloadPress?: (url: string, options?: { isVideo?: boolean }) => void;
  downloadingUrl?: string | null;
};

function MessageContent({
  text,
  isMe,
  hasAttachmentsAbove,
  styles,
  theme,
  onLinkPress,
  onImagePress,
  onDownloadPress,
  downloadingUrl,
}: MessageContentProps) {
  const segments = useMemo(() => parseMessageText(text), [text]);
  const imageUrls = useMemo(
    () =>
      segments
        .filter(
          (s): s is MessageSegment & { type: "image" } => s.type === "image",
        )
        .map((s) => s.url),
    [segments],
  );
  const resolvedImageUrls = useMemo(
    () => imageUrls.map((u) => getMessageImageUrl(u) || u),
    [imageUrls],
  );

  const blocks = useMemo(() => {
    type Block =
      | { type: "inline"; segments: MessageSegment[] }
      | { type: "images"; items: { url: string; label?: string }[] }
      | { type: "videos"; items: { url: string }[] }
      | {
          type: "media";
          items: { url: string; type: "image" | "video"; label?: string }[];
        };
    const result: Block[] = [];
    let i = 0;
    while (i < segments.length) {
      const seg = segments[i];
      if (seg.type === "text" || seg.type === "link") {
        const inline: MessageSegment[] = [];
        while (
          i < segments.length &&
          (segments[i].type === "text" || segments[i].type === "link")
        ) {
          inline.push(segments[i]);
          i++;
        }
        result.push({ type: "inline", segments: inline });
        continue;
      }
      if (seg.type === "video") {
        const items: { url: string }[] = [];
        while (i < segments.length && segments[i].type === "video") {
          const s = segments[i] as MessageSegment & {
            type: "video";
            url: string;
          };
          items.push({ url: s.url });
          i++;
        }
        result.push({ type: "videos", items });
        continue;
      }
      if (seg.type === "image") {
        const items: { url: string; label?: string }[] = [];
        while (i < segments.length && segments[i].type === "image") {
          const s = segments[i] as MessageSegment & {
            type: "image";
            url: string;
            label?: string;
          };
          items.push({ url: s.url, label: s.label });
          i++;
        }
        result.push({ type: "images", items });
      }
    }
    // Merge consecutive (numbering-only inline + single-image block) into previous images block
    // so "Originals:\n1. url1\n2. url2\n3. url3" becomes one grid with 2 images per row
    const numberingOnlyRegex = /^(\s*\d+\.\s*)+$/;
    const isNumberingOnlyInline = (block: Block): boolean => {
      if (block.type !== "inline") return false;
      const combined = block.segments
        .filter(
          (s): s is MessageSegment & { type: "text" } => s.type === "text",
        )
        .map((s) => s.value)
        .join("");
      return numberingOnlyRegex.test(combined.trim());
    };
    let merged = true;
    while (merged) {
      merged = false;
      for (let j = 0; j < result.length - 2; j++) {
        const curr = result[j];
        const next = result[j + 1];
        const nextNext = result[j + 2];
        if (
          curr.type === "images" &&
          next.type === "inline" &&
          isNumberingOnlyInline(next) &&
          nextNext.type === "images" &&
          nextNext.items.length === 1
        ) {
          curr.items.push(nextNext.items[0]);
          result.splice(j + 1, 2);
          merged = true;
          break;
        }
      }
    }
    // Merge (images + optional numbering-only inline + videos) into one "media" block
    // so Original Media shows images and videos in same grid, 2 per row, same size
    merged = true;
    while (merged) {
      merged = false;
      for (let j = 0; j < result.length - 1; j++) {
        const curr = result[j];
        const next = result[j + 1];
        if (curr.type === "images" && next.type === "videos") {
          const mediaItems: {
            url: string;
            type: "image" | "video";
            label?: string;
          }[] = [
            ...curr.items.map((it) => ({
              url: it.url,
              type: "image" as const,
              label: it.label,
            })),
            ...next.items.map((it) => ({
              url: it.url,
              type: "video" as const,
            })),
          ];
          result.splice(j, 2, { type: "media", items: mediaItems });
          merged = true;
          break;
        }
      }
      if (merged) continue;
      for (let j = 0; j < result.length - 2; j++) {
        const curr = result[j];
        const mid = result[j + 1];
        const next = result[j + 2];
        if (
          curr.type === "images" &&
          mid.type === "inline" &&
          isNumberingOnlyInline(mid) &&
          next.type === "videos"
        ) {
          const mediaItems: {
            url: string;
            type: "image" | "video";
            label?: string;
          }[] = [
            ...curr.items.map((it) => ({
              url: it.url,
              type: "image" as const,
              label: it.label,
            })),
            ...next.items.map((it) => ({
              url: it.url,
              type: "video" as const,
            })),
          ];
          result.splice(j, 3, { type: "media", items: mediaItems });
          merged = true;
          break;
        }
      }
    }
    return result;
  }, [segments]);

  if (blocks.length === 0) return null;

  const contentStyle = [
    styles.bubbleText,
    isMe && styles.bubbleTextMe,
    hasAttachmentsAbove ? styles.bubbleTextBelow : null,
  ];

  return (
    <View style={hasAttachmentsAbove ? styles.bubbleTextBelow : undefined}>
      {blocks.map((block, blockIdx) => {
        if (block.type === "inline") {
          const nextBlock =
            blockIdx + 1 < blocks.length ? blocks[blockIdx + 1] : null;
          const nextBlockIsImages = nextBlock?.type === "images";
          const nextBlockIsVideos = nextBlock?.type === "videos";
          const nextBlockIsMedia = nextBlock?.type === "media";
          const stripTrailingNumbering = (val: string) =>
            nextBlockIsImages || nextBlockIsVideos || nextBlockIsMedia
              ? val.replace(/\s*\d+\.\s*$/, "")
              : val;
          const isNumberingOnly = (s: string) => /^\s*\d+\.\s*$/.test(s.trim());
          return (
            <View
              key={blockIdx}
              style={{ flexDirection: "row", flexWrap: "wrap" }}
            >
              {block.segments.map((seg, idx) => {
                if (seg.type === "text") {
                  const display = stripTrailingNumbering(seg.value);
                  if (!display || isNumberingOnly(display)) return null;
                  return (
                    <Text
                      key={idx}
                      style={contentStyle}
                      selectable
                      selectionColor={theme.primary}
                    >
                      {display}
                    </Text>
                  );
                }
                return (
                  <TouchableOpacity
                    key={idx}
                    onPress={() => onLinkPress(seg.url)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[styles.bubbleText, styles.bubbleLink]}
                      selectable
                      selectionColor={theme.primary}
                    >
                      {seg.value}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          );
        }
        if (block.type === "videos") {
          return (
            <View key={blockIdx} style={styles.bubbleVideosRow}>
              {block.items.map((item, idx) => (
                <ChatVideoPlayer
                  key={idx}
                  videoUrl={item.url}
                  styles={styles}
                  theme={theme}
                  onDownloadPress={onDownloadPress}
                  downloadingUrl={downloadingUrl}
                />
              ))}
            </View>
          );
        }
        if (block.type === "media") {
          const mediaImages = block.items.filter(
            (it): it is typeof it & { type: "image" } => it.type === "image",
          );
          const mediaVideos = block.items.filter(
            (it): it is typeof it & { type: "video" } => it.type === "video",
          );
          const imageRows: (typeof mediaImages)[] = [];
          for (let i = 0; i < mediaImages.length; i += 2) {
            imageRows.push(mediaImages.slice(i, i + 2));
          }
          const isSingleImageOnly =
            mediaImages.length === 1 && mediaVideos.length === 0;
          return (
            <View key={blockIdx} style={{ alignSelf: "stretch" }}>
              {mediaImages.length > 0 ? (
                <View
                  style={[
                    styles.bubbleOriginalMediaGrid,
                    isSingleImageOnly && { alignSelf: "flex-start" },
                  ]}
                >
                  {imageRows.map((row, rowIdx) => (
                    <View
                      key={`row-${rowIdx}`}
                      style={[
                        styles.bubbleOriginalMediaGridRow,
                        rowIdx === imageRows.length - 1 &&
                          styles.bubbleOriginalMediaGridRowSingle,
                      ]}
                    >
                      {row.map((item, idx) => (
                        <TouchableOpacity
                          key={`img-${rowIdx}-${idx}`}
                          style={[
                            styles.bubbleOriginalMediaCard,
                            isSingleImageOnly &&
                              styles.bubbleOriginalMediaCardSingle,
                          ]}
                          onPress={() =>
                            onImagePress(
                              getMessageImageUrl(item.url) || item.url,
                              resolvedImageUrls,
                            )
                          }
                          activeOpacity={0.9}
                        >
                          <Image
                            source={{
                              uri: getMessageImageUrl(item.url) || item.url,
                            }}
                            style={styles.bubbleOriginalMediaCardImage}
                            resizeMode="cover"
                          />
                          {onDownloadPress ? (
                            <TouchableOpacity
                              style={styles.bubbleOriginalMediaDownloadButton}
                              onPress={(e) => {
                                e.stopPropagation?.();
                                onDownloadPress(
                                  getMessageImageUrl(item.url) || item.url,
                                );
                              }}
                              disabled={
                                downloadingUrl ===
                                (getMessageImageUrl(item.url) || item.url)
                              }
                              activeOpacity={0.7}
                            >
                              {downloadingUrl ===
                              (getMessageImageUrl(item.url) || item.url) ? (
                                <ActivityIndicator
                                  size="small"
                                  color={theme.white}
                                />
                              ) : (
                                <Feather
                                  name="download"
                                  size={moderateWidthScale(16)}
                                  color={theme.white}
                                />
                              )}
                            </TouchableOpacity>
                          ) : null}
                        </TouchableOpacity>
                      ))}
                      {row.length === 1 && !isSingleImageOnly ? (
                        <View style={styles.bubbleOriginalMediaCardSpacer} />
                      ) : null}
                    </View>
                  ))}
                </View>
              ) : null}
              {mediaVideos.length > 0 ? (
                <View style={styles.bubbleVideosRow}>
                  {mediaVideos.map((item, idx) => (
                    <ChatVideoPlayer
                      key={`vid-${idx}`}
                      videoUrl={item.url}
                      styles={styles}
                      theme={theme}
                      onDownloadPress={onDownloadPress}
                      downloadingUrl={downloadingUrl}
                    />
                  ))}
                </View>
              ) : null}
            </View>
          );
        }
        return (
          <View
            key={blockIdx}
            style={[
              styles.bubbleInlineImagesRow,
              block.items.length === 1 && { alignSelf: "flex-start" },
            ]}
          >
            {block.items.map((item, idx) => (
              <TouchableOpacity
                key={idx}
                style={[
                  styles.bubbleInlineImageGridCell,
                  block.items.length === 1 &&
                    styles.bubbleInlineImageGridCellSingle,
                ]}
                onPress={() =>
                  onImagePress(
                    getMessageImageUrl(item.url) || item.url,
                    resolvedImageUrls,
                  )
                }
                activeOpacity={0.9}
              >
                <Image
                  source={{
                    uri: getMessageImageUrl(item.url) || item.url,
                  }}
                  style={styles.bubbleInlineImage}
                  resizeMode="cover"
                />
                {item.label ? (
                  <View style={styles.bubbleInlineImageLabelWrap}>
                    <Text
                      style={styles.bubbleInlineImageLabel}
                      numberOfLines={1}
                    >
                      {item.label}
                    </Text>
                  </View>
                ) : null}
                {onDownloadPress ? (
                  <TouchableOpacity
                    style={styles.bubbleImageDownloadButton}
                    onPress={(e) => {
                      e.stopPropagation?.();
                      onDownloadPress(getMessageImageUrl(item.url) || item.url);
                    }}
                    disabled={
                      downloadingUrl ===
                      (getMessageImageUrl(item.url) || item.url)
                    }
                    activeOpacity={0.7}
                  >
                    {downloadingUrl ===
                    (getMessageImageUrl(item.url) || item.url) ? (
                      <ActivityIndicator size="small" color={theme.white} />
                    ) : (
                      <Feather
                        name="download"
                        size={moderateWidthScale(14)}
                        color={theme.white}
                      />
                    )}
                  </TouchableOpacity>
                ) : null}
              </TouchableOpacity>
            ))}
          </View>
        );
      })}
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    main: {
      flex: 1,
      backgroundColor: theme.background,
    },
    container: {
      flex: 1,
    },
    header: {
      backgroundColor: theme.darkGreen,
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: moderateWidthScale(20),
      paddingBottom: moderateHeightScale(12),
    },
    backButton: {
      marginRight: moderateWidthScale(12),
      paddingVertical: moderateHeightScale(4),
    },
    headerInfo: {
      flexDirection: "row",
      alignItems: "center",
    },
    headerAvatar: {
      width: moderateWidthScale(36),
      height: moderateWidthScale(36),
      borderRadius: moderateWidthScale(36 / 2),
      backgroundColor: theme.galleryPhotoBack,
      alignItems: "center",
      justifyContent: "center",
      marginRight: moderateWidthScale(10),
      overflow: "hidden",
    },
    headerAvatarImage: {
      width: "100%",
      height: "100%",
      borderRadius: moderateWidthScale(36 / 2),
      overflow: "hidden",
    },
    headerInitials: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontMedium,
      color: theme.white,
    },
    headerName: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontMedium,
      color: theme.white,
    },
    sepLine: {
      width: "100%",
      height: 1,
      backgroundColor: theme.borderLight,
    },
    messagesContainer: {
      flex: 1,
    },
    messagesContentContainer: {
      paddingHorizontal: moderateWidthScale(20),
      paddingVertical: moderateHeightScale(16),
    },
    messageRow: {
      marginBottom: moderateHeightScale(10),
      maxWidth: "80%",
    },
    messageRowMe: {
      alignSelf: "flex-end",
      alignItems: "flex-end",
    },
    messageRowOther: {
      alignSelf: "flex-start",
      alignItems: "flex-start",
    },
    bubble: {
      paddingHorizontal: moderateWidthScale(16),
      paddingVertical: moderateHeightScale(10),
      borderRadius: moderateWidthScale(18),
    },
    bubbleMe: {
      backgroundColor: theme.orangeBrown,
      borderBottomRightRadius: moderateWidthScale(4),
    },
    bubbleOther: {
      backgroundColor: theme.lightGreen05,
      borderBottomLeftRadius: moderateWidthScale(4),
    },
    bubbleLongPressLayer: {
      zIndex: 0,
    },
    bubbleContentLayer: {
      zIndex: 1,
    },
    bubbleText: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
    },
    bubbleTextMe: {
      color: theme.darkGreen,
    },
    bubbleLink: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontMedium,
      color: theme.primary,
      textDecorationLine: "underline",
    },
    bubbleInlineImagesRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: moderateWidthScale(6),
      alignSelf: "stretch",
      width: "100%",
      marginTop: moderateHeightScale(6),
    },
    bubbleInlineImageGridCell: {
      width: "48%",
      aspectRatio: 1,
      overflow: "hidden",
      borderRadius: moderateWidthScale(8),
      position: "relative",
    },
    bubbleInlineImageGridCellSingle: {
      width: widthScale(160),
      height: heightScale(160),
      overflow: "hidden",
      borderRadius: moderateWidthScale(8),
      position: "relative",
    },
    bubbleInlineImage: {
      width: "100%",
      height: "100%",
      borderRadius: moderateWidthScale(8),
      backgroundColor: theme.galleryPhotoBack,
    },
    bubbleInlineImageLabelWrap: {
      position: "absolute",
      top: moderateHeightScale(4),
      left: moderateWidthScale(4),
      backgroundColor: "rgba(0, 0, 0, 0.6)",
      paddingHorizontal: moderateWidthScale(6),
      paddingVertical: moderateHeightScale(4),
      borderRadius: moderateWidthScale(6),
      maxWidth: "90%",
    },
    bubbleInlineImageLabel: {
      fontSize: fontSize.size10,
      fontFamily: fonts.fontBold,
      color: theme.white,
      textTransform: "capitalize",
    },
    bubbleVideoWrap: {
      marginTop: moderateHeightScale(6),
      alignSelf: "flex-start",
      position: "relative",
    },
    bubbleVideoPlaceholder: {
      width: widthScale(260),
      height: heightScale(200),
      borderRadius: moderateWidthScale(8),
      backgroundColor: theme.black,
      alignItems: "center",
      justifyContent: "center",
    },
    bubbleVideoContainer: {
      width: widthScale(260),
      height: heightScale(200),
      borderRadius: moderateWidthScale(8),
      overflow: "hidden",
      backgroundColor: theme.black,
      position: "relative",
    },
    bubbleVideo: {
      width: "100%",
      height: "100%",
    },
    bubbleVideoLoadingOverlay: {
      ...StyleSheet.absoluteFillObject,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.black,
    },
    bubbleVideoLoadingText: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.white,
      textAlign: "center",
      marginTop: moderateHeightScale(8),
    },
    bubbleVideoDownloadButtonOverlay: {
      position: "absolute",
      bottom: moderateHeightScale(40),
      right: moderateWidthScale(8),
      width: moderateWidthScale(26),
      height: moderateWidthScale(26),
      borderRadius: moderateWidthScale(6),
      backgroundColor: theme.primary,
      alignItems: "center",
      justifyContent: "center",
    },
    bubbleVideosRow: {
      flexDirection: "column",
      gap: moderateHeightScale(10),
      marginTop: moderateHeightScale(6),
    },
    bubbleMediaVideoWrap: {
      width: "48%",
      aspectRatio: 1,
      marginTop: moderateHeightScale(6),
      borderRadius: moderateWidthScale(8),
      overflow: "hidden",
      position: "relative",
      backgroundColor: theme.black,
    },
    bubbleMediaVideoWrapSingle: {
      width: widthScale(160),
      height: heightScale(160),
      marginTop: moderateHeightScale(6),
      borderRadius: moderateWidthScale(8),
      overflow: "hidden",
      position: "relative",
      backgroundColor: theme.black,
    },
    bubbleMediaVideoPlaceholder: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: theme.black,
      alignItems: "center",
      justifyContent: "center",
    },
    bubbleMediaVideoContainer: {
      ...StyleSheet.absoluteFillObject,
      borderRadius: moderateWidthScale(8),
      overflow: "hidden",
      backgroundColor: theme.black,
      position: "relative",
    },
    bubbleMediaVideo: {
      width: "100%",
      height: "100%",
    },
    bubbleMediaVideoLoadingOverlay: {
      ...StyleSheet.absoluteFillObject,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.black,
    },
    bubbleMediaVideoDownloadButtonOverlay: {
      position: "absolute",
      bottom: moderateHeightScale(8),
      right: moderateWidthScale(8),
      width: moderateWidthScale(24),
      height: moderateWidthScale(24),
      borderRadius: moderateWidthScale(6),
      backgroundColor: theme.primary,
      alignItems: "center",
      justifyContent: "center",
    },
    // Original media grid (same look as AI Results, chat: download only, no share)
    // Enforce exactly 2 images per row
    bubbleOriginalMediaGrid: {
      alignSelf: "stretch",
      width: "100%",
      marginTop: moderateHeightScale(6),
    },
    bubbleOriginalMediaGridRow: {
      flexDirection: "row",
      gap: moderateWidthScale(12),
      marginBottom: moderateHeightScale(12),
      width: "100%",
    },
    bubbleOriginalMediaGridRowSingle: {
      marginBottom: 0,
    },
    bubbleOriginalMediaCardSpacer: {
      flex: 1,
      minWidth: 0,
    },
    bubbleOriginalMediaCard: {
      flex: 1,
      minWidth: 0,
      height: heightScale(140),
      borderRadius: moderateWidthScale(10),
      overflow: "hidden",
      backgroundColor: theme.black,
      borderWidth: 1,
      borderColor: theme.borderLight,
      position: "relative",
      alignItems: "center",
      justifyContent: "center",
    },
    bubbleOriginalMediaCardSingle: {
      width: widthScale(160),
      height: heightScale(160),
    },
    bubbleOriginalMediaCardImage: {
      width: "100%",
      height: "100%",
      borderRadius: moderateWidthScale(8),
    },
    bubbleOriginalMediaVideoWrap: {
      width: "48%",
      height: heightScale(140),
      borderRadius: moderateWidthScale(10),
      overflow: "hidden",
      position: "relative",
      backgroundColor: theme.black,
      borderWidth: 1,
      borderColor: theme.borderLight,
    },
    bubbleOriginalMediaVideoWrapSingle: {
      width: widthScale(160),
      height: heightScale(160),
    },
    bubbleOriginalMediaDownloadButton: {
      position: "absolute",
      bottom: moderateHeightScale(6),
      right: moderateWidthScale(6),
      width: moderateWidthScale(32),
      height: moderateWidthScale(32),
      borderRadius: moderateWidthScale(16),
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 2,
    },
    bubbleImage: {
      width: widthScale(160),
      height: heightScale(160),
      borderRadius: moderateWidthScale(8),
      marginTop: moderateHeightScale(6),
      backgroundColor: theme.galleryPhotoBack,
    },
    bubbleAttachmentsRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: moderateWidthScale(6),
      alignSelf: "flex-start",
      width: widthScale(260),
    },
    bubbleAttachmentsRowSingle: {
      width: undefined,
    },
    bubbleImageGridWrap: {
      width: (widthScale(260) - moderateWidthScale(6)) / 2,
      height: (widthScale(260) - moderateWidthScale(6)) / 2,
      overflow: "hidden",
      position: "relative",
    },
    bubbleImageGridWrapSingle: {
      width: widthScale(160),
      height: heightScale(160),
    },
    bubbleImageGrid: {
      width: "100%",
      height: "100%",
      borderRadius: moderateWidthScale(8),
      backgroundColor: theme.galleryPhotoBack,
    },
    bubbleImageDownloadButton: {
      position: "absolute",
      bottom: moderateHeightScale(8),
      right: moderateWidthScale(8),
      width: moderateWidthScale(24),
      height: moderateWidthScale(24),
      borderRadius: moderateWidthScale(6),
      backgroundColor: theme.primary,
      alignItems: "center",
      justifyContent: "center",
    },
    bubbleTextBelow: {
      marginTop: moderateHeightScale(8),
    },
    senderLabel: {
      fontSize: fontSize.size11,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen5,
      marginBottom: moderateHeightScale(4),
    },
    messageDateTimeLabel: {
      fontSize: fontSize.size10,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen5,
      marginTop: moderateHeightScale(4),
    },
    typingIndicator: {
      paddingHorizontal: moderateWidthScale(16),
      paddingVertical: moderateHeightScale(4),
      backgroundColor: theme.white,
    },
    typingIndicatorText: {
      fontSize: fontSize.size11,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen5,
    },
    inputBarContainer: {
      paddingHorizontal: moderateWidthScale(16),
      paddingVertical: moderateHeightScale(8),
      backgroundColor: theme.white,
      borderTopWidth: 1,
      borderTopColor: theme.borderLight,
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(12),
    },
    inputRow: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(12),
      paddingHorizontal: moderateWidthScale(12),
      paddingVertical: moderateHeightScale(8),
      borderRadius: moderateWidthScale(20),
      backgroundColor: theme.lightGreen20,
    },
    textInput: {
      flex: 1,
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: theme.darkGreen,
      minHeight: heightScale(20),
      paddingVertical: 0,
      textAlignVertical: "center",
      includeFontPadding: false,
    },
    attachmentButton: {
      width: widthScale(40),
      height: widthScale(40),
      borderRadius: widthScale(40 / 2),
      backgroundColor: theme.lightGreen20,
      alignItems: "center",
      justifyContent: "center",
    },
    attachmentIconWrap: {
      transform: [{ rotate: "45deg" }],
    },
    sendButton: {
      width: widthScale(40),
      height: widthScale(40),
      borderRadius: widthScale(40 / 2),
      backgroundColor: theme.buttonBack,
      alignItems: "center",
      justifyContent: "center",
    },
    inputClearButton: {
      paddingHorizontal: moderateWidthScale(4),
      justifyContent: "center",
      alignItems: "center",
    },
    attachmentThumbnailsRow: {
      backgroundColor: theme.white,
      borderTopWidth: 1,
      borderTopColor: theme.borderLight,
    },
    attachmentThumbnailWrap: {
      width: widthScale(44),
      height: widthScale(44),
      borderRadius: moderateWidthScale(6),
      borderWidth: 1,
      borderColor: theme.borderLight,
      backgroundColor: theme.lightGreen20,
      marginVertical: moderateHeightScale(8),
    },
    attachmentThumbnail: {
      width: widthScale(44),
      height: widthScale(44),
      borderRadius: moderateWidthScale(6),
    },
    attachmentThumbnailDelete: {
      position: "absolute",
      top: -7,
      right: -7,
      width: widthScale(16),
      height: widthScale(16),
      borderRadius: widthScale(16 / 2),
      backgroundColor: theme.lightGreen,
      alignItems: "center",
      justifyContent: "center",
    },
  });

type ChatContentProps = {
  messages: MessageItem[];
  chatItem: {
    id: string;
    name: string;
    image: string;
    message?: string;
    timeLabel?: string;
  } | null;
  styles: ReturnType<typeof createStyles>;
  theme: Theme;
  insets: { bottom: number };
  currentUserName: string;
  loading?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  onLoadMore?: () => void;
  loadingMore?: boolean;
  onImagePress?: (uri: string, allUris?: string[]) => void;
  onDownloadPress?: (url: string, options?: { isVideo?: boolean }) => void;
  downloadingUrl?: string | null;
  onAttachmentPress?: () => void;
  selectedAttachments?: string[];
  onRemoveAttachment?: (index: number) => void;
  inputValue?: string;
  onInputChange?: (text: string) => void;
  sending?: boolean;
  onSend?: () => void;
  isTyping?: boolean;
  onMessageCopied?: () => void;
};

const ChatContent = ({
  messages,
  chatItem,
  styles,
  theme,
  insets,
  currentUserName,
  loading,
  refreshing,
  onRefresh,
  onLoadMore,
  loadingMore,
  onImagePress,
  onDownloadPress,
  downloadingUrl,
  onAttachmentPress,
  selectedAttachments = [],
  onRemoveAttachment,
  inputValue = "",
  onInputChange,
  sending = false,
  onSend,
  isTyping = false,
  onMessageCopied,
}: ChatContentProps) => {
  const hasInputValue = Boolean(inputValue && inputValue.trim().length > 0);
  const canSend = hasInputValue || selectedAttachments.length > 0;
  const sendDisabled = !canSend || sending;
  return (
    <>
      <FlatList
        style={styles.messagesContainer}
        contentContainerStyle={styles.messagesContentContainer}
        data={messages}
        inverted={true}
        keyExtractor={(item) => item.id}
        onScrollBeginDrag={() => Keyboard.dismiss()}
        refreshControl={
          onRefresh ? (
            <RefreshControl
              refreshing={!!refreshing}
              onRefresh={onRefresh}
              colors={[theme.darkGreen]}
              tintColor={theme.darkGreen}
            />
          ) : undefined
        }
        onEndReached={onLoadMore}
        onEndReachedThreshold={0.3}
        ListEmptyComponent={
          loading ? (
            <View
              style={{
                paddingVertical: moderateHeightScale(40),
                alignItems: "center",
              }}
            >
              <ActivityIndicator size="large" color={theme.darkGreen} />
            </View>
          ) : null
        }
        ListFooterComponent={
          loadingMore ? (
            <View
              style={{
                paddingVertical: moderateHeightScale(12),
                alignItems: "center",
              }}
            >
              <ActivityIndicator size="small" color={theme.darkGreen} />
            </View>
          ) : null
        }
        renderItem={({ item }) => {
          const copyFullMessage = () => {
            const textPart = item.text?.trim() ?? "";
            const attachmentPart =
              item.attachments && item.attachments.length > 0
                ? item.attachments.join("\n")
                : "";
            const fullText = [textPart, attachmentPart].filter(Boolean).join("\n");
            if (fullText) {
              Clipboard.setString(fullText);
              onMessageCopied?.();
            }
          };
          return (
          <View
            style={[
              styles.messageRow,
              item.isMe ? styles.messageRowMe : styles.messageRowOther,
            ]}
          >
            <Text style={styles.senderLabel}>
              {item.isMe ? currentUserName : chatItem?.name}
            </Text>
            <View
              style={[
                styles.bubble,
                item.isMe ? styles.bubbleMe : styles.bubbleOther,
              ]}
            >
              <TouchableOpacity
                style={[StyleSheet.absoluteFillObject, styles.bubbleLongPressLayer]}
                onLongPress={copyFullMessage}
                onPress={() => Keyboard.dismiss()}
                delayLongPress={500}
                activeOpacity={1}
              />
              <View
                style={styles.bubbleContentLayer}
                pointerEvents="box-none"
              >
                {item.attachments && item.attachments.length > 0 ? (
                <View
                  style={[
                    styles.bubbleAttachmentsRow,
                    item.attachments.length === 1 &&
                      styles.bubbleAttachmentsRowSingle,
                  ]}
                >
                  {item.attachments.map((uri, idx) => (
                    <TouchableOpacity
                      key={`${item.id}-${idx}`}
                      onPress={() => onImagePress?.(uri, item.attachments)}
                      activeOpacity={0.9}
                      style={[
                        styles.bubbleImageGridWrap,
                        (item.attachments?.length ?? 0) === 1 &&
                          styles.bubbleImageGridWrapSingle,
                      ]}
                    >
                      <Image
                        style={styles.bubbleImageGrid}
                        source={{ uri }}
                        resizeMode="cover"
                      />
                      <TouchableOpacity
                        style={styles.bubbleImageDownloadButton}
                        onPress={(e) => {
                          e.stopPropagation?.();
                          onDownloadPress?.(uri);
                        }}
                        disabled={downloadingUrl === uri}
                        activeOpacity={0.7}
                      >
                        {downloadingUrl === uri ? (
                          <ActivityIndicator size="small" color={theme.white} />
                        ) : (
                          <Feather
                            name="download"
                            size={moderateWidthScale(14)}
                            color={theme.white}
                          />
                        )}
                      </TouchableOpacity>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : null}
              {item.text ? (
                <MessageContent
                  text={item.text}
                  isMe={item.isMe}
                  hasAttachmentsAbove={
                    !!(item.attachments && item.attachments.length > 0)
                  }
                  styles={styles}
                  theme={theme}
                  onLinkPress={(url) => {
                    Linking.openURL(url).catch(() => {});
                  }}
                  onImagePress={(url, allUrls) => onImagePress?.(url, allUrls)}
                  onDownloadPress={onDownloadPress}
                  downloadingUrl={downloadingUrl}
                />
              ) : null}
              </View>
            </View>
            <Text style={styles.messageDateTimeLabel}>
              {item.dateTimeLabel}
            </Text>
          </View>
          );
        }}
        showsVerticalScrollIndicator={false}
      />
      {selectedAttachments.length > 0 ? (
        <View style={styles.attachmentThumbnailsRow}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{
              gap: moderateWidthScale(10),
              paddingHorizontal: moderateWidthScale(16),
            }}
          >
            {selectedAttachments.map((uri, idx) => (
              <View
                key={`${uri}-${idx}`}
                style={styles.attachmentThumbnailWrap}
              >
                <Image
                  style={styles.attachmentThumbnail}
                  source={{ uri }}
                  resizeMode="cover"
                />
                <TouchableOpacity
                  style={styles.attachmentThumbnailDelete}
                  onPress={() => onRemoveAttachment?.(idx)}
                  activeOpacity={0.8}
                >
                  <MaterialIcons
                    name="close"
                    size={moderateWidthScale(10)}
                    color={theme.white}
                  />
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        </View>
      ) : null}
      {isTyping && chatItem ? (
        <View style={styles.typingIndicator}>
          <Text style={styles.typingIndicatorText}>
            {chatItem.name} is typing...
          </Text>
        </View>
      ) : null}
      <View
        style={[
          styles.inputBarContainer,
          {
            paddingBottom: Math.max(insets.bottom, moderateHeightScale(8)),
          },
        ]}
      >
        <View style={styles.inputRow}>
          <TextInput
            style={styles.textInput}
            placeholder="Enter message"
            placeholderTextColor={theme.lightGreen4}
            value={inputValue}
            onChangeText={onInputChange}
          />
          {hasInputValue ? (
            <TouchableOpacity
              style={styles.inputClearButton}
              onPress={() => onInputChange?.("")}
              activeOpacity={0.7}
              hitSlop={{
                top: moderateHeightScale(8),
                bottom: moderateHeightScale(8),
                left: moderateWidthScale(8),
                right: moderateWidthScale(8),
              }}
            >
              <CloseIcon color={theme.darkGreen} />
            </TouchableOpacity>
          ) : null}
        </View>
        <TouchableOpacity
          style={[styles.attachmentButton, sending && { opacity: 0.5 }]}
          activeOpacity={0.8}
          onPress={() => onAttachmentPress?.()}
          disabled={sending}
        >
          <View style={styles.attachmentIconWrap}>
            <MaterialIcons
              name="attach-file"
              size={22}
              color={theme.darkGreen}
            />
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.sendButton, sendDisabled && { opacity: 0.5 }]}
          activeOpacity={0.8}
          onPress={onSend}
          disabled={sendDisabled}
        >
          {sending ? (
            <ActivityIndicator size="small" color={theme.buttonText} />
          ) : (
            <SendIcon width={18} height={18} color={theme.buttonText} />
          )}
        </TouchableOpacity>
      </View>
    </>
  );
};

export default function ChatBoxScreen() {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);
  const { showBanner } = useNotificationContext();
  const { downloadMedia, downloadingUrl } = useDownloadMedia();
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams<{ chatItem?: string; id?: string }>();
  const insets = useSafeAreaInsets();
  const user = useAppSelector((state: any) => state.user);
  const currentUserId = user?.id ?? null;
  const currentUserName = user?.name ?? "Me";
  const accessToken = user?.accessToken ?? null;
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const dispatch = useDispatch();
  const [imagePickerVisible, setImagePickerVisible] = useState(false);
  const [selectedAttachments, setSelectedAttachments] = useState<string[]>([]);
  const [inputText, setInputText] = useState("");
  const [sending, setSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  type ChannelHandle = {
    whisper: (event: string, data: Record<string, unknown>) => void;
    stopListening: (event: string) => void;
    stopListeningForWhisper: (event: string) => void;
  };
  const channelRef = useRef<ChannelHandle | null>(null);
  const channelActiveRef = useRef(false);

  const chatAttachmentUrlsFromRedux = useAppSelector(
    (state) => state.general.chatAttachmentUrls,
  );

  useFocusEffect(
    useCallback(() => {
      if (chatAttachmentUrlsFromRedux?.length > 0) {
        setSelectedAttachments((prev) => {
          const existingSet = new Set(prev);
          const toAdd = chatAttachmentUrlsFromRedux.filter(
            (url) => !existingSet.has(url),
          );
          if (toAdd.length === 0) return prev;
          const combined = [...prev, ...toAdd];
          return combined.slice(0, MAX_ATTACHMENTS);
        });
        dispatch(clearChatAttachmentUrls());
      }
    }, [chatAttachmentUrlsFromRedux, dispatch]),
  );

  const chatItem = useMemo(() => {
    if (params.chatItem) {
      try {
        return JSON.parse(params.chatItem) as {
          id: string;
          name: string;
          image: string;
          message?: string;
          timeLabel?: string;
        };
      } catch {
        return null;
      }
    }
    return null;
  }, [params.chatItem]);

  const userId = params.id ?? chatItem?.id ?? "";
  const name = chatItem?.name || "-----";
  let image = chatItem?.image || "";

  if (!image) {
    image = process.env.EXPO_PUBLIC_DEFAULT_AVATAR_IMAGE ?? "";
  } else if (image.startsWith("http") || image.startsWith("https")) {
    image = image;
  } else {
    image = process.env.EXPO_PUBLIC_API_BASE_URL + image;
  }

  const apiMessageToItem = useCallback(
    (m: ApiMessage): MessageItem => {
      const isMe = currentUserId != null && m.sender.id === currentUserId;
      const text = m.message ?? "";
      const attachments = (m.attachments ?? [])
        .map((item) => getMessageImageUrl(attachmentToUrl(item) ?? undefined))
        .filter(Boolean);
      return {
        id: String(m.id),
        text,
        isMe,
        timeLabel: formatMessageTime(m.created_at),
        dateTimeLabel: formatMessageDateTime(m.created_at),
        attachments: attachments.length ? attachments : undefined,
      };
    },
    [currentUserId],
  );

  const fetchMessages = useCallback(
    async (pageNum: number, append: boolean) => {
      if (!userId) return;
      try {
        if (append) setLoadingMore(true);
        else if (pageNum === 1) setLoading(true);
        const res = await ApiService.get<MessagesResponse>(
          MESSAGES_URL(userId),
          { params: { per_page: PER_PAGE, page: pageNum } },
        );
        const list = (res.data?.data ?? []).map(apiMessageToItem);
        setMessages((prev) => (append ? [...prev, ...list] : list));
        setPage(res.data?.meta?.current_page ?? pageNum);
        setLastPage(res.data?.meta?.last_page ?? 1);
      } catch {
        if (!append) setMessages([]);
      } finally {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    },
    [userId, apiMessageToItem],
  );

  useEffect(() => {
    if (userId) fetchMessages(1, false);
    else setLoading(false);
  }, [userId, fetchMessages]);

  // Mark that user's messages as read once when opening this chat screen
  useEffect(() => {
    if (!userId) return;
    ApiService.post(MARK_READ_URL(userId), {}).catch(() => {});
  }, [userId]);

  // When app returns from background: refetch messages so any missed (throttled) socket events are synced
  useEffect(() => {
    const sub = AppState.addEventListener(
      "change",
      (nextState: AppStateStatus) => {
        if (nextState === "active" && userId) {
          fetchMessages(1, false);
          ApiService.post(MARK_READ_URL(userId), {}).catch(() => {});
        }
      },
    );
    return () => sub.remove();
  }, [userId, fetchMessages]);

  // Real-time: subscribe to private chat channel (matches web: chat.id1.id2), messages, read receipts, typing
  // Cleanup only on unmount (navigate back). Background: socket stays connected. App kill: connection drops and server closes.
  useEffect(() => {
    if (!userId || !accessToken || currentUserId == null) return;
    const echo = getEcho(accessToken);
    if (!echo) return;
    const channelName = getPrivateChatChannelName(currentUserId, userId);
    const channel = echo.private(channelName);
    channelRef.current = channel;
    channelActiveRef.current = true;

    // New message: only add when sender is the other user (we add our own from API response)
    channel.listen(CHAT_MESSAGE_EVENT, (payload: unknown) => {
      if (!channelActiveRef.current) return;
      const raw = (payload as { message?: ApiMessage })?.message ?? payload;
      const msg = raw as ApiMessage;
      if (!msg?.id || !msg?.sender?.id || msg.created_at == null) return;
      if (msg.sender.id === currentUserId) return; // skip own message from socket
      setIsTyping(false);
      // Mark that user's messages as read when we receive their message
      ApiService.post(MARK_READ_URL(String(msg.sender.id)), {}).catch(() => {});
      setMessages((prev) => {
        if (!channelActiveRef.current) return prev;
        if (prev.some((m) => m.id === String(msg.id))) return prev;
        return [apiMessageToItem(msg), ...prev];
      });
    });

    // Read receipts: mark our messages as read when other user reads
    channel.listen(
      CHAT_MESSAGES_READ_EVENT,
      (e: { senderId: number; receiverId: number }) => {
        if (!channelActiveRef.current) return;
        if (e.receiverId === currentUserId && e.senderId === Number(userId)) {
          setMessages((prev) =>
            prev.map((m) => (m.isMe ? { ...m, is_read: true } : m)),
          );
        }
      },
    );

    // Typing indicator
    channel.listenForWhisper(CHAT_WHISPER_TYPING, (e: { userId?: number }) => {
      if (!channelActiveRef.current) return;
      if (e.userId === Number(userId)) {
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => {
          if (channelActiveRef.current) setIsTyping(false);
        }, 3000);
        setIsTyping(true);
      }
    });
    channel.listenForWhisper(
      CHAT_WHISPER_STOP_TYPING,
      (e: { userId?: number }) => {
        if (!channelActiveRef.current) return;
        if (e.userId === Number(userId)) {
          if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
            typingTimeoutRef.current = null;
          }
          setIsTyping(false);
        }
      },
    );

    return () => {
      channelActiveRef.current = false;
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
      channel.stopListening(CHAT_MESSAGE_EVENT);
      channel.stopListening(CHAT_MESSAGES_READ_EVENT);
      channel.stopListeningForWhisper(CHAT_WHISPER_TYPING);
      channel.stopListeningForWhisper(CHAT_WHISPER_STOP_TYPING);
      echo.leave(channelName);
      channelRef.current = null;
    };
  }, [userId, accessToken, currentUserId, apiMessageToItem]);

  // Send typing / stop-typing whisper (debounced: typing at most every 1.5s, stop when idle 2s or empty)
  useEffect(() => {
    if (!userId || currentUserId == null) return;
    const ch = channelRef.current;
    if (!ch) return;
    const trimmed = inputText.trim();
    if (trimmed.length > 0) {
      ch.whisper(CHAT_WHISPER_TYPING, { userId: currentUserId });
      const stopT = setTimeout(() => {
        channelRef.current?.whisper(CHAT_WHISPER_STOP_TYPING, {
          userId: currentUserId,
        });
      }, 2000);
      return () => clearTimeout(stopT);
    }
    ch.whisper(CHAT_WHISPER_STOP_TYPING, { userId: currentUserId });
  }, [userId, currentUserId, inputText]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchMessages(1, false);
  }, [fetchMessages]);

  const onLoadMore = useCallback(() => {
    if (loadingMore || loading || page >= lastPage) return;
    fetchMessages(page + 1, true);
  }, [loadingMore, loading, page, lastPage, fetchMessages]);

  const handleSend = useCallback(async () => {
    const trimmed = inputText.trim();
    const hasAttachments = selectedAttachments.length > 0;
    if (!userId || sending || (!trimmed && !hasAttachments)) return;

    setSending(true);
    try {
      const formData = new FormData();
      formData.append("receiver_id", String(Number(userId)));
      formData.append("message", trimmed || "");

      for (let i = 0; i < selectedAttachments.length; i++) {
        const uri = selectedAttachments[i];
        const { mimeType, name } = getMimeAndName(uri);
        formData.append("attachments[]", {
          uri,
          type: mimeType,
          name,
        } as any);
      }

      const res = await ApiService.post<SendMessageResponse>(
        SEND_MESSAGE_URL,
        formData,
        {
          headers: {
            "Content-Type": false as any,
          },
        },
      );

      if (res?.success && res?.data) {
        const newItem = apiMessageToItem(res.data);
        setMessages((prev) => [newItem, ...prev]);
        setInputText("");
        setSelectedAttachments([]);
      }
    } catch {
      showBanner(
        t("error") || "Error",
        t("somethingWentWrong") || "Something went wrong. Please try again.",
        "error",
        3000,
      );
    } finally {
      setSending(false);
    }
  }, [
    userId,
    inputText,
    selectedAttachments,
    sending,
    apiMessageToItem,
    showBanner,
    t,
  ]);

  useEffect(() => {
    if (Platform.OS === "android") {
      const keyboardWillShowListener = Keyboard.addListener(
        "keyboardDidShow",
        (e) => {
          setKeyboardHeight(e.endCoordinates.height);
        },
      );
      const keyboardWillHideListener = Keyboard.addListener(
        "keyboardDidHide",
        () => {
          setKeyboardHeight(0);
        },
      );

      return () => {
        keyboardWillShowListener.remove();
        keyboardWillHideListener.remove();
      };
    }
  }, []);

  const renderInitials = (fullName: string) => {
    const parts = fullName.trim().split(" ");
    const first = parts[0]?.[0] ?? "";
    const second = parts[1]?.[0] ?? "";
    return `${first}${second}`.toUpperCase();
  };

  return (
    <View style={styles.main}>
      <StatusBar
        barStyle="light-content"
        backgroundColor={theme.darkGreen}
        translucent
      />
      <View
        style={[
          styles.header,
          { paddingTop: insets.top + moderateHeightScale(12) },
        ]}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <MaterialIcons
            name="keyboard-backspace"
            size={moderateWidthScale(24)}
            color={theme.white}
          />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <View style={styles.headerAvatar}>
            {image ? (
              <Image style={styles.headerAvatarImage} source={{ uri: image }} />
            ) : (
              <Text style={styles.headerInitials}>{renderInitials(name)}</Text>
            )}
          </View>
          <Text numberOfLines={1} style={styles.headerName}>
            {name}
          </Text>
        </View>
      </View>
      <View style={styles.sepLine} />
      {Platform.OS === "ios" ? (
        <KeyboardAvoidingView
          style={styles.container}
          behavior="padding"
          keyboardVerticalOffset={0}
        >
          <ChatContent
            messages={messages}
            chatItem={chatItem}
            styles={styles}
            theme={theme}
            insets={insets}
            currentUserName={currentUserName}
            loading={loading}
            refreshing={refreshing}
            onRefresh={onRefresh}
            onLoadMore={onLoadMore}
            loadingMore={loadingMore}
            onImagePress={(uri, allUris) =>
              dispatch(
                openFullImageModal({
                  images: allUris ?? [uri],
                  initialIndex: allUris ? allUris.indexOf(uri) : 0,
                }),
              )
            }
            onDownloadPress={(url, options) =>
              downloadMedia(url, options ?? {})
            }
            downloadingUrl={downloadingUrl}
            onAttachmentPress={() => setImagePickerVisible(true)}
            selectedAttachments={selectedAttachments}
            onRemoveAttachment={(idx) =>
              setSelectedAttachments((prev) => prev.filter((_, i) => i !== idx))
            }
            onMessageCopied={() =>
              showBanner(
                t("copied") || "Copied",
                "",
                "success",
                1500,
              )
            }
            inputValue={inputText}
            onInputChange={setInputText}
            sending={sending}
            onSend={handleSend}
            isTyping={isTyping}
          />
        </KeyboardAvoidingView>
      ) : (
        <View
          style={[
            styles.container,
            {
              paddingBottom: keyboardHeight,
            },
          ]}
        >
          <ChatContent
            messages={messages}
            chatItem={chatItem}
            styles={styles}
            theme={theme}
            insets={insets}
            currentUserName={currentUserName}
            loading={loading}
            refreshing={refreshing}
            onRefresh={onRefresh}
            onLoadMore={onLoadMore}
            loadingMore={loadingMore}
            onImagePress={(uri, allUris) =>
              dispatch(
                openFullImageModal({
                  images: allUris ?? [uri],
                  initialIndex: allUris ? allUris.indexOf(uri) : 0,
                }),
              )
            }
            onDownloadPress={(url, options) =>
              downloadMedia(url, options ?? {})
            }
            downloadingUrl={downloadingUrl}
            onAttachmentPress={() => setImagePickerVisible(true)}
            selectedAttachments={selectedAttachments}
            onRemoveAttachment={(idx) =>
              setSelectedAttachments((prev) => prev.filter((_, i) => i !== idx))
            }
            onMessageCopied={() =>
              showBanner(
                t("copied") || "Copied",
                "",
                "success",
                1500,
              )
            }
            inputValue={inputText}
            onInputChange={setInputText}
            sending={sending}
            onSend={handleSend}
            isTyping={isTyping}
          />
        </View>
      )}
      <ImagePickerModal
        visible={imagePickerVisible}
        onClose={() => setImagePickerVisible(false)}
        allowsMultipleSelection
        showTryOnOption
        onFromTryOnPress={() => {
          setImagePickerVisible(false);
          dispatch(setChatTryOnPreselectedUrls(selectedAttachments));
          router.push({
            pathname: "/aiRequests",
            params: { returnTo: "chat" },
          });
        }}
        onImageSelected={(uri) => {
          setSelectedAttachments((prev) => {
            if (prev.length >= MAX_ATTACHMENTS) {
              showBanner(
                t("limitExceeded"),
                t("collageMax6Images"),
                "error",
                3000,
              );
              return prev;
            }
            return [...prev, uri];
          });
        }}
        onImagesSelected={(uris) => {
          setSelectedAttachments((prev) => {
            const remaining = MAX_ATTACHMENTS - prev.length;
            if (remaining <= 0) {
              showBanner(
                t("limitExceeded"),
                t("collageMax6Images"),
                "error",
                3000,
              );
              return prev;
            }
            const toAdd = uris.slice(0, remaining);
            if (uris.length > remaining) {
              showBanner(
                t("limitExceeded"),
                t("collageMax6Images"),
                "error",
                3000,
              );
            }
            return [...prev, ...toAdd];
          });
        }}
      />
    </View>
  );
}
