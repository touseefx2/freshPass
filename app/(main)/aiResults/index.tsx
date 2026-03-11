import React, {
  useMemo,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import {
  View,
  Text,
  TextInput,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Clipboard,
  Alert,
  StyleSheet,
  Share,
  Platform,
  Linking,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useVideoPlayer, VideoView } from "expo-video";
import { useTranslation } from "react-i18next";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { createStyles } from "./styles";
import StackHeader from "@/src/components/StackHeader";
import { ApiService } from "@/src/services/api";
import { aiRequestsEndpoints, chatEndpoints } from "@/src/services/endpoints";
import { Feather, MaterialIcons } from "@expo/vector-icons";
import { useDispatch } from "react-redux";
import { useAppSelector } from "@/src/hooks/hooks";
import {
  moderateWidthScale,
  moderateHeightScale,
} from "@/src/theme/dimensions";
import {
  openFullImageModal,
  setBookingTryOnImageUrls,
  clearBookingTryOnPreselectedUrls,
  setBookingTryOnSelectionForJob,
  setChatAttachmentUrls,
  clearChatTryOnPreselectedUrls,
} from "@/src/state/slices/generalSlice";
import { useNotificationContext } from "@/src/contexts/NotificationContext";
import { useDownloadMedia } from "@/src/hooks/useDownloadMedia";
import ShareOptionsBottomSheet from "@/src/components/ShareOptionsBottomSheet";
import PotentialContactsModal, {
  type PotentialContact,
} from "@/src/components/PotentialContactsModal";

const SEND_MESSAGE_URL = "/api/chat/messages";

type SendMessageResponse = {
  success: boolean;
  message: string;
  data?: unknown;
};

/** API: GET /api/ai-requests/{job_id} - response can be processing, replicate, hair_pipeline, or social media */
export interface AiRequestByJobIdResponse {
  data: {
    job_id: string;
    status: string;
    /** Empty array when processing; object when completed */
    response?: [] | ApiResponsePayload;
    message?: string;
  };
}

/** Union of all completed response payloads */
type ApiResponsePayload = ReplicateOrHairPipelineResponse | SocialMediaResponse;

interface ReplicateOrHairPipelineResponse {
  images?: ReplicateImages | HairPipelineImages;
  job_type?: string;
  attributes?: Record<string, unknown>;
  recommendations?: Record<string, { name: string; description: string }>;
}

/** Social media: generate_post, generate_collage, generate_reel */
interface SocialMediaResponse {
  job_type?: string;
  images?: {
    original?: string;
    processed?: string;
    originals?: string[];
  };
  content?: {
    caption?: string;
    hashtags?: string[];
    complete_post?: string;
  };
  video?: {
    url?: string;
    duration?: number;
    format?: string;
    resolution?: string;
    fps?: number;
    file_size_mb?: number;
  };
  music?: {
    track?: string;
    source?: string;
    has_music?: boolean;
  };
  media_count?: number;
  original_media?: Array<{ url: string; type: string; index: number }>;
  processing_time?: number;
  cost?: Record<string, unknown>;
}

/** Replicate format: front/left/right/back with url */
interface ReplicateImages {
  front?: { url?: string } | string;
  left?: { url?: string } | string;
  right?: { url?: string } | string;
  back?: { url?: string } | string;
}

/** Hair pipeline format: face_match, trending_celebrity, ai_suggested */
interface HairPipelineImages {
  face_match?: HairPipelineImageSet;
  trending_celebrity?: HairPipelineImageSet;
  ai_suggested?: HairPipelineImageSet;
}

interface HairPipelineImageSet {
  name: string;
  description: string;
  views: {
    front?: string;
    left?: string;
    right?: string;
    back?: string;
  };
}

/** Normalized section for UI */
interface NormalizedSection {
  name: string;
  description?: string;
  views: Array<{
    key: "front" | "left" | "right" | "back";
    labelKey: string;
    url: string;
  }>;
}

/** Social media normalized payload for UI */
export interface SocialMediaNormalized {
  jobType: "generate_post" | "generate_collage" | "generate_reel";
  images?: {
    original?: string;
    processed?: string;
    originals?: string[];
  };
  content?: {
    caption?: string;
    hashtags?: string[];
    complete_post?: string;
  };
  video?: {
    url?: string;
    duration?: number;
    format?: string;
    resolution?: string;
    fps?: number;
    file_size_mb?: number;
  };
  music?: {
    track?: string;
    source?: string;
    has_music?: boolean;
  };
  media_count?: number;
  original_media?: OriginalMediaItem[];
}

/** One item in original_media: image, video, or audio */
export type OriginalMediaItem = {
  url: string;
  type: string;
  index: number;
};

/** Normalized result: status + sections for completed (or socialMedia for post/collage/reel) */
interface NormalizedResult {
  status: string;
  sections: NormalizedSection[];
  socialMedia?: SocialMediaNormalized;
}

const VIEW_KEYS = [
  { key: "front" as const, labelKey: "front" },
  { key: "left" as const, labelKey: "left" },
  { key: "right" as const, labelKey: "right" },
  { key: "back" as const, labelKey: "back" },
];

const HAIR_PIPELINE_SECTION_KEYS: (keyof HairPipelineImages)[] = [
  "face_match",
  "trending_celebrity",
  "ai_suggested",
];

function getUrl(
  value: { url?: string } | string | undefined,
): string | undefined {
  if (!value) return undefined;
  if (typeof value === "string") return value;
  return value?.url;
}

function isReplicateImages(
  imgs: ReplicateImages | HairPipelineImages | undefined,
): imgs is ReplicateImages {
  if (!imgs) return false;
  const r = imgs as ReplicateImages;
  return "front" in r || "left" in r || "right" in r || "back" in r;
}

const SOCIAL_MEDIA_JOB_TYPES = [
  "generate_post",
  "generate_collage",
  "generate_reel",
] as const;

function isSocialMediaResponse(
  res: ApiResponsePayload,
): res is SocialMediaResponse {
  return (
    typeof (res as SocialMediaResponse).job_type === "string" &&
    SOCIAL_MEDIA_JOB_TYPES.includes(
      (res as SocialMediaResponse)
        .job_type as (typeof SOCIAL_MEDIA_JOB_TYPES)[number],
    )
  );
}

/** Normalize API response: handles processing, replicate, hair_pipeline, and social media shapes */
function normalizeAiRequestResponse(
  raw: AiRequestByJobIdResponse,
): NormalizedResult {
  // Support both { data: payload } and { data: { data: payload } } (double-wrapped), or payload at top level
  const d = (raw as any)?.data?.data ?? (raw as any)?.data ?? raw;
  const status = d?.status ?? "failed";
  const sections: NormalizedSection[] = [];

  const res = d?.response;
  if (Array.isArray(res) || !res || status !== "completed") {
    return { status, sections };
  }

  if (isSocialMediaResponse(res)) {
    const jobType = res.job_type as
      | "generate_post"
      | "generate_collage"
      | "generate_reel";
    const imgs = res.images;
    return {
      status,
      sections: [],
      socialMedia: {
        jobType,
        images: imgs
          ? {
              original: imgs.original,
              processed: imgs.processed,
              originals: Array.isArray(imgs.originals)
                ? imgs.originals
                : imgs.original
                  ? [imgs.original]
                  : [],
            }
          : undefined,
        content: res.content,
        video: res.video,
        music: res.music,
        media_count: res.media_count,
        original_media: Array.isArray(res.original_media)
          ? res.original_media
          : undefined,
      },
    };
  }

  const imgs = res.images;
  if (!imgs) return { status, sections };

  if (isReplicateImages(imgs)) {
    const views = VIEW_KEYS.map(({ key, labelKey }) => ({
      key,
      labelKey,
      url: getUrl(imgs[key]),
    })).filter((v): v is typeof v & { url: string } => Boolean(v.url));
    if (views.length > 0) {
      sections.push({ name: "Results", views });
    }
    return { status, sections };
  }

  for (const key of HAIR_PIPELINE_SECTION_KEYS) {
    const section = (imgs as HairPipelineImages)[key];
    if (!section?.views) continue;
    const views = VIEW_KEYS.map(({ key: viewKey, labelKey }) => ({
      key: viewKey,
      labelKey,
      url: section.views[viewKey],
    })).filter((v): v is typeof v & { url: string } => Boolean(v.url));
    if (views.length > 0) {
      sections.push({
        name: section.name,
        description: section.description,
        views,
      });
    }
  }

  return { status, sections };
}

const POLL_INTERVAL_MS = 3000;

type ReelVideoPlayerProps = {
  videoUrl: string;
  styles: ReturnType<typeof createStyles>;
  theme: Theme;
};

function ReelVideoPlayerInner({
  videoUrl,
  styles,
  theme,
}: ReelVideoPlayerProps) {
  const { t } = useTranslation();
  const [isVideoReady, setIsVideoReady] = useState(false);
  const player = useVideoPlayer(videoUrl, (p) => {
    p.loop = false;
  });

  return (
    <View style={styles.videoContainer}>
      <View style={StyleSheet.absoluteFill}>
        <VideoView
          player={player}
          style={styles.video}
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
        <View style={styles.videoLoadingOverlay}>
          <ActivityIndicator size="small" color={theme.white} />
          <Text style={styles.videoLoadingText}>{t("loading")}</Text>
        </View>
      )}
    </View>
  );
}

function ReelVideoPlayer({ videoUrl, styles, theme }: ReelVideoPlayerProps) {
  const [showVideo, setShowVideo] = useState(false);

  if (showVideo) {
    return (
      <ReelVideoPlayerInner videoUrl={videoUrl} styles={styles} theme={theme} />
    );
  }

  return (
    <TouchableOpacity
      style={styles.videoPlaceholder}
      onPress={() => setShowVideo(true)}
      activeOpacity={0.8}
    >
      <Feather
        name="play-circle"
        size={moderateWidthScale(72)}
        color={theme.white}
      />
    </TouchableOpacity>
  );
}

type MiniVideoPlayerProps = {
  videoUrl: string;
  styles: ReturnType<typeof createStyles>;
  theme: Theme;
};

function MiniVideoPlayerInner({
  videoUrl,
  styles,
  theme,
}: MiniVideoPlayerProps) {
  const { t } = useTranslation();
  const [isVideoReady, setIsVideoReady] = useState(false);
  const player = useVideoPlayer(videoUrl, (p) => {
    p.loop = false;
  });

  return (
    <View style={styles.originalMediaMiniVideoContainer}>
      <View style={StyleSheet.absoluteFill}>
        <VideoView
          player={player}
          style={styles.originalMediaMiniVideo}
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
        <View style={styles.originalMediaMiniVideoLoading}>
          <ActivityIndicator size="small" color={theme.white} />
          <Text style={styles.originalMediaMiniVideoLoadingText}>
            {t("loading")}
          </Text>
        </View>
      )}
    </View>
  );
}

function MiniVideoPlayer({ videoUrl, styles, theme }: MiniVideoPlayerProps) {
  const [showVideo, setShowVideo] = useState(false);

  if (showVideo) {
    return (
      <View style={StyleSheet.absoluteFill}>
        <MiniVideoPlayerInner
          videoUrl={videoUrl}
          styles={styles}
          theme={theme}
        />
      </View>
    );
  }

  return (
    <TouchableOpacity
      style={[StyleSheet.absoluteFill, { backgroundColor: "transparent" }]}
      onPress={() => setShowVideo(true)}
      activeOpacity={0.9}
    >
      <View style={styles.originalMediaCardIconWrap}>
        <Feather
          name="play-circle"
          size={moderateWidthScale(28)}
          color={theme.white}
        />
      </View>
    </TouchableOpacity>
  );
}

type OriginalMediaCardProps = {
  item: OriginalMediaItem;
  styles: ReturnType<typeof createStyles>;
  theme: Theme;
  onImagePress: (uri: string, allUris?: string[]) => void;
  allUrls: string[];
  onSharePress?: (url: string, labelKey: string) => void;
  onDownloadPress?: (url: string, options?: { isVideo?: boolean }) => void;
  downloadingUrl?: string | null;
  selectionMode?: boolean;
  selectedUrls?: Set<string>;
  onToggleUrl?: (url: string) => void;
};

function OriginalMediaCard({
  item,
  styles,
  theme,
  onImagePress,
  allUrls,
  onSharePress,
  onDownloadPress,
  downloadingUrl,
  selectionMode,
  selectedUrls,
  onToggleUrl,
}: OriginalMediaCardProps) {
  const { t } = useTranslation();
  const isImage = item.type === "image";
  const isVideo =
    item.type === "video" ||
    (item.url && /\.(mp4|webm|mov|m4v)(\?.*)?$/i.test(item.url));
  const isAudio =
    !isImage &&
    !isVideo &&
    (item.type === "audio" ||
      item.type === "mp3" ||
      (item.url && /\.(mp3|m4a|aac|wav)(\?.*)?$/i.test(item.url)));

  const shareLabelKey = isVideo ? "video" : isImage ? "image" : "audio";
  const isSelected =
    selectionMode && selectedUrls != null && selectedUrls.has(item.url);

  return (
    <View style={styles.originalMediaCard}>
      <Text style={styles.originalMediaCardIndex}>{item.index}</Text>
      {isImage && (
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          onPress={() =>
            selectionMode && onToggleUrl
              ? onToggleUrl(item.url)
              : onImagePress(item.url, allUrls)
          }
          activeOpacity={0.9}
        >
          <Image
            source={{ uri: item.url }}
            style={styles.originalMediaCardImage}
            resizeMode="cover"
          />
        </TouchableOpacity>
      )}
      {isVideo && (
        <View
          style={[StyleSheet.absoluteFill, { backgroundColor: theme.black }]}
        >
          <Image
            source={{ uri: item.url }}
            style={[
              styles.originalMediaCardImage,
              StyleSheet.absoluteFillObject,
            ]}
            resizeMode="cover"
          />
          <MiniVideoPlayer videoUrl={item.url} styles={styles} theme={theme} />
        </View>
      )}
      {isAudio && (
        <View style={styles.originalMediaCardIconWrap}>
          <Feather
            name="music"
            size={moderateWidthScale(28)}
            color={theme.white}
          />
          <Text style={styles.originalMediaAudioLabel}>{t("audio")}</Text>
        </View>
      )}
      {!isImage && !isVideo && !isAudio && (
        <View style={styles.originalMediaCardIconWrap}>
          <Feather
            name="file"
            size={moderateWidthScale(28)}
            color={theme.white}
          />
          <Text style={styles.originalMediaAudioLabel} numberOfLines={1}>
            {item.type || "File"}
          </Text>
        </View>
      )}
      {isImage && selectionMode && (
        <View
          style={[
            styles.selectionOverlay,
            isSelected && styles.selectionOverlaySelected,
          ]}
        >
          {isSelected ? (
            <Feather
              name="check"
              size={moderateWidthScale(14)}
              color={theme.white}
            />
          ) : null}
        </View>
      )}
      {isVideo && selectionMode && onToggleUrl && (
        <TouchableOpacity
          style={[
            styles.selectionOverlayVideo,
            isSelected && styles.selectionOverlayVideoSelected,
          ]}
          onPress={() => onToggleUrl(item.url)}
          activeOpacity={0.8}
        >
          {isSelected ? (
            <Feather
              name="check"
              size={moderateWidthScale(14)}
              color={theme.white}
            />
          ) : null}
        </TouchableOpacity>
      )}
      {onSharePress && !selectionMode && (
        <TouchableOpacity
          style={styles.originalMediaShareIcon}
          onPress={() => onSharePress(item.url, shareLabelKey)}
          activeOpacity={0.7}
        >
          <Feather
            name="share-2"
            size={moderateWidthScale(16)}
            color={theme.white}
          />
        </TouchableOpacity>
      )}
      {onDownloadPress && !selectionMode && (
        <TouchableOpacity
          style={[
            styles.originalMediaDownloadIcon,
            isVideo && styles.originalMediaDownloadIconVideo,
          ]}
          onPress={() =>
            onDownloadPress(item.url, { isVideo: Boolean(isVideo) })
          }
          disabled={downloadingUrl === item.url}
          activeOpacity={0.7}
        >
          {downloadingUrl === item.url ? (
            <ActivityIndicator size="small" color={theme.white} />
          ) : (
            <Feather
              name="download"
              size={moderateWidthScale(16)}
              color={theme.white}
            />
          )}
        </TouchableOpacity>
      )}
    </View>
  );
}

type PotentialContactsResponse = {
  success: boolean;
  data: {
    data: PotentialContact[];
    meta: { current_page: number; last_page: number };
  };
};

export default function AiResults() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ jobId?: string; returnTo?: string }>();
  const jobId = params.jobId;
  const fromBooking = params.returnTo === "booking";
  const fromChat = params.returnTo === "chat";
  const isSelectionMode = fromBooking || fromChat;
  const router = useRouter();
  const { showBanner } = useNotificationContext();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [normalized, setNormalized] = useState<NormalizedResult | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const dispatch = useDispatch();
  const { downloadMedia, downloadingUrl } = useDownloadMedia();
  const [editableCaption, setEditableCaption] = useState("");
  const [editableCompletePost, setEditableCompletePost] = useState("");

  const [shareSheetVisible, setShareSheetVisible] = useState(false);
  const [shareContext, setShareContext] = useState<
    | null
    | {
        url: string;
        labelKey: string;
        linkOnly?: boolean;
        /** When true, share only video + simple text (AI Result - Video) */
        simpleReelShare?: boolean;
      }
    | { section: NormalizedSection }
  >(null);
  const [shareToUserModalVisible, setShareToUserModalVisible] = useState(false);
  const [potentialContacts, setPotentialContacts] = useState<
    PotentialContact[]
  >([]);
  const [potentialPage, setPotentialPage] = useState(1);
  const [potentialLastPage, setPotentialLastPage] = useState(1);
  const [potentialLoading, setPotentialLoading] = useState(false);
  const [potentialLoadingMore, setPotentialLoadingMore] = useState(false);
  const [potentialError, setPotentialError] = useState(false);
  const [shareSending, setShareSending] = useState(false);
  const [originalsExpanded, setOriginalsExpanded] = useState(false);
  const [originalMediaExpanded, setOriginalMediaExpanded] = useState(false);
  const [selectedUrls, setSelectedUrls] = useState<Set<string>>(new Set());

  const toggleUrl = useCallback((url: string) => {
    setSelectedUrls((prev) => {
      const next = new Set(prev);
      if (next.has(url)) next.delete(url);
      else next.add(url);
      return next;
    });
  }, []);
  const selectSection = useCallback((urls: string[]) => {
    setSelectedUrls((prev) => {
      const next = new Set(prev);
      urls.forEach((u) => next.add(u));
      return next;
    });
  }, []);
  const unselectSection = useCallback((urls: string[]) => {
    setSelectedUrls((prev) => {
      const next = new Set(prev);
      urls.forEach((u) => next.delete(u));
      return next;
    });
  }, []);
  const selectAll = useCallback((urls: string[]) => {
    setSelectedUrls(new Set(urls));
  }, []);
  const unselectAll = useCallback(() => {
    setSelectedUrls(new Set());
  }, []);
  const allSelectableUrls = useMemo(() => {
    if (!normalized || normalized.status !== "completed") return [];
    if (normalized.socialMedia) {
      const sm = normalized.socialMedia;
      const list: string[] = [];
      if (sm.images?.processed) list.push(sm.images.processed);
      if (sm.images?.originals?.length) list.push(...sm.images.originals);
      if (sm.video?.url) list.push(sm.video.url);
      if (sm.original_media?.length) {
        sm.original_media
          .filter((m) => m.type === "image" || m.type === "video")
          .forEach((m) => list.push(m.url));
      }
      return list;
    }
    const list: string[] = [];
    normalized.sections.forEach((s) =>
      s.views.forEach((v) => list.push(v.url)),
    );
    return list;
  }, [normalized]);

  const allSelected =
    allSelectableUrls.length > 0 &&
    selectedUrls.size === allSelectableUrls.length;

  const bookingPreselectedUrls = useAppSelector(
    (state) => state.general.bookingTryOnPreselectedUrls,
  );
  const bookingTryOnSelectionByJobId = useAppSelector(
    (state) => state.general.bookingTryOnSelectionByJobId,
  );
  const chatTryOnPreselectedUrls = useAppSelector(
    (state) => state.general.chatTryOnPreselectedUrls,
  );
  const hasSyncedPreselected = useRef(false);
  useEffect(() => {
    hasSyncedPreselected.current = false;
  }, [jobId]);
  useEffect(() => {
    if (
      normalized?.status !== "completed" ||
      allSelectableUrls.length === 0 ||
      hasSyncedPreselected.current
    )
      return;
    const preselected =
      fromBooking && Array.isArray(bookingPreselectedUrls)
        ? bookingPreselectedUrls
        : [];
    const fromPreselected = preselected.filter((u) =>
      allSelectableUrls.includes(u),
    );
    const chatPreselected =
      fromChat && Array.isArray(chatTryOnPreselectedUrls)
        ? chatTryOnPreselectedUrls.filter((u) =>
            allSelectableUrls.includes(u),
          )
        : [];
    const storedForJob =
      !fromBooking &&
      jobId &&
      bookingTryOnSelectionByJobId?.[jobId]
        ? (bookingTryOnSelectionByJobId[jobId] || []).filter((u) =>
            allSelectableUrls.includes(u),
          )
        : [];
    if (fromPreselected.length > 0) {
      setSelectedUrls(new Set(fromPreselected));
      dispatch(clearBookingTryOnPreselectedUrls());
    } else if (chatPreselected.length > 0) {
      setSelectedUrls(new Set(chatPreselected));
    } else if (storedForJob.length > 0) {
      setSelectedUrls(new Set(storedForJob));
    }
    hasSyncedPreselected.current = true;
  }, [
    fromBooking,
    fromChat,
    jobId,
    normalized?.status,
    allSelectableUrls,
    bookingPreselectedUrls,
    bookingTryOnSelectionByJobId,
    chatTryOnPreselectedUrls,
    dispatch,
  ]);

  const fetchStatus = useCallback(
    async (isPolling = false) => {
      if (!jobId) {
        setError(t("missingJobId"));
        setLoading(false);
        setNormalized(null);
        return;
      }
      if (!isPolling) {
        setLoading(true);
        setError(null);
        setNormalized(null);
      }
      try {
        const result = await ApiService.get<AiRequestByJobIdResponse>(
          aiRequestsEndpoints.getByJobId(jobId),
        );
        setNormalized(normalizeAiRequestResponse(result));
      } catch (e: any) {
        setError(e?.message || t("somethingWentWrong"));
      } finally {
        setLoading(false);
      }
    },
    [jobId, t],
  );

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  useEffect(() => {
    if (!normalized || normalized.status !== "processing" || !jobId) return;
    const poll = () => fetchStatus(true);
    pollRef.current = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [normalized?.status, jobId, fetchStatus]);

  // Sync editable caption and complete post from API when social media result loads
  useEffect(() => {
    if (normalized?.status === "completed" && normalized.socialMedia?.content) {
      const c = normalized.socialMedia.content;
      setEditableCaption(c.caption ?? "");
      setEditableCompletePost(c.complete_post ?? "");
    }
  }, [
    normalized?.status,
    normalized?.socialMedia?.content?.caption,
    normalized?.socialMedia?.content?.complete_post,
  ]);

  useEffect(() => {
    if (
      fromBooking &&
      normalized?.status === "completed" &&
      normalized.socialMedia
    ) {
      setOriginalsExpanded(!!normalized.socialMedia.images?.originals?.length);
      setOriginalMediaExpanded(
        !!normalized.socialMedia.original_media?.some(
          (m) => m.type === "image",
        ),
      );
    }
  }, [fromBooking, normalized?.status, normalized?.socialMedia]);

  const handleDownload = useCallback(
    (uri: string) => {
      downloadMedia(uri);
    },
    [downloadMedia],
  );

  const handleDownloadPrimary = useCallback(
    (uri?: string) => {
      if (!uri) return;
      const isVideo = normalized?.socialMedia?.jobType === "generate_reel";
      downloadMedia(uri, { isVideo });
    },
    [downloadMedia, normalized?.socialMedia?.jobType],
  );

  const handleCopy = async (text: string) => {
    try {
      Clipboard.setString(text);
    } catch (_) {
      Alert.alert(t("error"), t("failedToCopyToClipboard"));
    }
  };

  const openFullImage = (uri: string, allUris?: string[]) => {
    dispatch(
      openFullImageModal({
        images: allUris ?? [uri],
        initialIndex: allUris ? allUris.indexOf(uri) : 0,
      }),
    );
  };

  const handleShareAiResult = useCallback(async () => {
    try {
      if (shareContext) {
        if ("section" in shareContext && shareContext.section) {
          const section = shareContext.section;
          let message = `${section.name}\n`;
          if (section.description) message += `${section.description}\n`;
          section.views.forEach((v) => {
            message += `${t(v.labelKey)}: ${v.url}\n`;
          });
          const url = section.views?.[0]?.url;
          if (message.trim()) {
            await Share.share({
              message: message.trim(),
              url: url || undefined,
            });
          }
          setShareContext(null);
          return;
        }
        if ("url" in shareContext) {
          const message = shareContext.simpleReelShare
            ? `${t("aiResults")} – ${t("video")}\n\n${t("video")}: ${shareContext.url}`
            : shareContext.linkOnly
              ? shareContext.url
              : `${t("aiResults")} – ${t(shareContext.labelKey)}: ${shareContext.url}`;
          await Share.share({
            message: message.trim(),
            url: shareContext.linkOnly ? undefined : shareContext.url,
          });
        }
        return;
      }
      if (!normalized || normalized.status !== "completed") return;

      let message = "";
      let url: string | undefined;

      if (normalized.socialMedia) {
        const sm = normalized.socialMedia;
        const isReel = sm.jobType === "generate_reel";
        const typeLabel = isReel
          ? t("video")
          : sm.jobType === "generate_collage"
            ? t("collage")
            : t("post");
        message = `${t("aiResults")} – ${typeLabel}\n\n`;
        if (editableCaption) {
          message += `${editableCaption}\n\n`;
        }
        if (sm.content?.hashtags?.length) {
          message += `${sm.content.hashtags.join(" ")}\n\n`;
        }
        if (editableCompletePost) {
          message += `${editableCompletePost}\n\n`;
        }
        if (isReel && sm.video?.url) {
          url = sm.video.url;
          message += `${t("video")}: ${url}`;
        } else if (sm.images?.processed) {
          url = sm.images.processed;
          message += `${t("image")}: ${url}`;
        }
        if (sm.images?.originals?.length) {
          message += `\n\n${t("originals")}:\n`;
          sm.images.originals.forEach((u, i) => {
            message += `${i + 1}. ${u}\n`;
          });
        }
        if (sm.original_media?.length) {
          message += `\n\n${t("originalMedia")}:\n`;
          sm.original_media.forEach((item, i) => {
            message += `${item.index}. ${item.url}\n`;
          });
        }
      } else if (normalized.sections.length > 0) {
        message = `${t("aiResults")}\n\n`;
        normalized.sections.forEach((section, sectionIndex) => {
          message += `${section.name}\n`;
          if (section.description) {
            message += `${section.description}\n`;
          }
          section.views.forEach((v) => {
            message += `${t(v.labelKey)}: ${v.url}\n`;
          });
          if (sectionIndex < normalized.sections.length - 1) {
            message += "\n";
          }
        });
        url = normalized.sections[0]?.views?.[0]?.url;
      }

      if (!message.trim()) return;

      await Share.share({
        message: message.trim(),
        url: url || undefined,
      });
    } catch (_error) {
      // Silently ignore share errors
    }
  }, [normalized, t, editableCaption, editableCompletePost, shareContext]);

  /** Build the same message text used for native share / send to user */
  const getShareMessageText = useCallback((): string => {
    if (shareContext) {
      if ("section" in shareContext && shareContext.section) {
        const section = shareContext.section;
        let message = `${section.name}\n`;
        if (section.description) message += `${section.description}\n`;
        section.views.forEach((v) => {
          message += `${t(v.labelKey)}: ${v.url}\n`;
        });
        return message.trim();
      }
      if ("url" in shareContext) {
        if (shareContext.simpleReelShare) {
          return `${t("aiResults")} – ${t("video")}\n\n${t("video")}: ${shareContext.url}`;
        }
        return shareContext.url;
      }
    }
    if (!normalized || normalized.status !== "completed") return "";
    let message = "";
    if (normalized.socialMedia) {
      const sm = normalized.socialMedia;
      const isReel = sm.jobType === "generate_reel";
      const typeLabel = isReel
        ? t("video")
        : sm.jobType === "generate_collage"
          ? t("collage")
          : t("post");
      message = `${t("aiResults")} – ${typeLabel}\n\n`;
      if (editableCaption) message += `${editableCaption}\n\n`;
      if (sm.content?.hashtags?.length) {
        message += `${sm.content.hashtags.join(" ")}\n\n`;
      }
      if (editableCompletePost) message += `${editableCompletePost}\n\n`;
      if (isReel && sm.video?.url) {
        message += `${t("video")}: ${sm.video.url}`;
      } else if (sm.images?.processed) {
        message += `${t("image")}: ${sm.images.processed}`;
      }
      if (sm.images?.originals?.length) {
        message += `\n\n${t("originals")}:\n`;
        sm.images.originals.forEach((u, i) => {
          message += `${i + 1}. ${u}\n`;
        });
      }
      if (sm.original_media?.length) {
        message += `\n\n${t("originalMedia")}:\n`;
        sm.original_media.forEach((item) => {
          message += `${item.index}. ${item.url}\n`;
        });
      }
    } else if (normalized.sections.length > 0) {
      message = `${t("aiResults")}\n\n`;
      normalized.sections.forEach((section, sectionIndex) => {
        message += `${section.name}\n`;
        if (section.description) message += `${section.description}\n`;
        section.views.forEach((v) => {
          message += `${t(v.labelKey)}: ${v.url}\n`;
        });
        if (sectionIndex < normalized.sections.length - 1) message += "\n";
      });
    }
    return message.trim();
  }, [normalized, t, editableCaption, editableCompletePost, shareContext]);

  const fetchPotentialContacts = useCallback(
    async (pageNum: number, append: boolean) => {
      try {
        setPotentialError(false);
        if (append) setPotentialLoadingMore(true);
        else setPotentialLoading(true);
        const url = chatEndpoints.potentialContacts({
          page: pageNum,
          per_page: 20,
        });
        const res = await ApiService.get<PotentialContactsResponse>(url);
        const list = res.data?.data ?? [];
        const meta = res.data?.meta;
        if (append) {
          setPotentialContacts((prev) => [...prev, ...list]);
        } else {
          setPotentialContacts(list);
        }
        setPotentialPage(meta?.current_page ?? pageNum);
        setPotentialLastPage(meta?.last_page ?? 1);
      } catch {
        if (!append) setPotentialError(true);
      } finally {
        setPotentialLoading(false);
        setPotentialLoadingMore(false);
      }
    },
    [],
  );

  const openShareSheet = useCallback(() => {
    setShareContext(null);
    setShareSheetVisible(true);
  }, []);

  const openShareSheetForImage = useCallback(
    (url: string, labelKey: string, linkOnly?: boolean) => {
      setShareContext({ url, labelKey, linkOnly });
      setShareSheetVisible(true);
    },
    [],
  );

  const openShareSheetForReelVideo = useCallback((videoUrl: string) => {
    setShareContext({
      url: videoUrl,
      labelKey: "video",
      simpleReelShare: true,
    });
    setShareSheetVisible(true);
  }, []);

  const openShareSheetForSection = useCallback((section: NormalizedSection) => {
    setShareContext({ section });
    setShareSheetVisible(true);
  }, []);

  const openShareToUserModal = useCallback(() => {
    setShareToUserModalVisible(true);
    setPotentialContacts([]);
    setPotentialPage(1);
    setPotentialLastPage(1);
    setPotentialError(false);
    fetchPotentialContacts(1, false);
  }, [fetchPotentialContacts]);

  const onPotentialContactPress = useCallback(
    async (contact: PotentialContact) => {
      const messageText = getShareMessageText();
      if (!messageText.trim()) return;

      setShareSending(true);
      try {
        const formData = new FormData();
        formData.append("receiver_id", String(Number(contact.id)));
        formData.append("message", messageText);

        const res = await ApiService.post<SendMessageResponse>(
          SEND_MESSAGE_URL,
          formData,
          {
            headers: {
              "Content-Type": false as any,
            },
          },
        );

        if (res?.success) {
          setShareToUserModalVisible(false);
          setShareContext(null);
          showBanner(
            t("success"),
            t("messageSentSuccessfully"),
            "success",
            3000,
          );
        } else {
          showBanner(
            t("error"),
            t("somethingWentWrong") || "Something went wrong.",
            "error",
            3000,
          );
        }
      } catch {
        showBanner(
          t("error"),
          t("somethingWentWrong") || "Something went wrong.",
          "error",
          3000,
        );
      } finally {
        setShareSending(false);
      }
    },
    [getShareMessageText, showBanner, t],
  );

  const onPotentialEndReached = useCallback(() => {
    if (
      potentialLoadingMore ||
      potentialLoading ||
      potentialPage >= potentialLastPage
    )
      return;
    fetchPotentialContacts(potentialPage + 1, true);
  }, [
    potentialLoadingMore,
    potentialLoading,
    potentialPage,
    potentialLastPage,
    fetchPotentialContacts,
  ]);

  const canShare =
    normalized?.status === "completed" &&
    (normalized.sections.length > 0 || !!normalized.socialMedia) &&
    !isSelectionMode;

  const styles = useMemo(() => createStyles(colors as Theme), [colors]);
  const theme = colors as Theme;

  let content: React.ReactNode;

  if (loading && !normalized) {
    content = (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={styles.loadingText}>{t("aiStillProcessing")}</Text>
      </View>
    );
  } else if (error) {
    content = (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => fetchStatus()}
          activeOpacity={0.7}
        >
          <Text style={styles.retryButtonText}>{t("retry")}</Text>
        </TouchableOpacity>
      </View>
    );
  } else if (normalized?.status === "processing") {
    content = (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={styles.loadingText}>{t("aiStillProcessing")}</Text>
      </View>
    );
  } else if (normalized?.status === "failed") {
    content = (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{t("somethingWentWrong")}</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => fetchStatus()}
          activeOpacity={0.7}
        >
          <Text style={styles.retryButtonText}>{t("retry")}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Social media result: generate_post, generate_collage, generate_reel
  else if (normalized?.status === "completed" && normalized.socialMedia) {
    const sm = normalized.socialMedia;
    const isReel = sm.jobType === "generate_reel";
    const downloadUri = isReel ? sm.video?.url : sm.images?.processed;

    content = (
      <KeyboardAwareScrollView
        contentContainerStyle={[
          styles.scrollContent,
          isSelectionMode && { paddingBottom: moderateHeightScale(100) },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {isSelectionMode && allSelectableUrls.length > 0 && (
          <View style={styles.selectAllRow}>
            <Text style={styles.sectionTitleUppercase}>
              {t("selectImagesForTryOn")}
            </Text>
            <TouchableOpacity
              style={styles.selectAllButton}
              onPress={() =>
                allSelected ? unselectAll() : selectAll(allSelectableUrls)
              }
              activeOpacity={0.7}
            >
              <Text style={styles.selectAllButtonText}>
                {allSelected ? t("unselectAll") : t("selectAll")}
              </Text>
            </TouchableOpacity>
          </View>
        )}
        {isReel && downloadUri && !isSelectionMode && (
          <View style={styles.headerContainer}>
            <TouchableOpacity
              style={styles.downloadButtonPrimary}
              onPress={() => handleDownloadPrimary(downloadUri)}
              disabled={downloadingUrl === downloadUri}
              activeOpacity={0.7}
            >
              {downloadingUrl === downloadUri ? (
                <ActivityIndicator size="small" color={theme.white} />
              ) : (
                <>
                  <Feather
                    name="download"
                    size={moderateWidthScale(16)}
                    color={theme.white}
                  />
                  <Text style={styles.downloadButtonPrimaryText}>
                    {t("download")} {t("video")}
                  </Text>
                </>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.reelShareIconButton}
              onPress={() =>
                sm.video?.url && openShareSheetForReelVideo(sm.video.url)
              }
              activeOpacity={0.7}
            >
              <MaterialIcons
                name="share"
                size={moderateWidthScale(20)}
                color={theme.white}
              />
            </TouchableOpacity>
          </View>
        )}

        {isReel && sm.video?.url && (
          isSelectionMode ? (
            <View style={styles.videoContainer}>
              <ReelVideoPlayer
                videoUrl={sm.video.url}
                styles={styles}
                theme={theme}
              />
              <TouchableOpacity
                style={[
                  styles.selectionOverlayVideo,
                  selectedUrls.has(sm.video.url) &&
                    styles.selectionOverlayVideoSelected,
                ]}
                onPress={() => toggleUrl(sm.video!.url!)}
                activeOpacity={0.8}
              >
                {selectedUrls.has(sm.video.url) ? (
                  <Feather
                    name="check"
                    size={moderateWidthScale(14)}
                    color={theme.white}
                  />
                ) : null}
              </TouchableOpacity>
            </View>
          ) : (
            <ReelVideoPlayer
              videoUrl={sm.video.url}
              styles={styles}
              theme={theme}
            />
          )
        )}

        {isReel && sm.video && (
          <View style={styles.section}>
            <Text style={styles.sectionTitleUppercase}>
              {t("videoDetails")}
            </Text>
            <View style={styles.videoDetailsGrid}>
              {sm.video.duration != null && (
                <View style={styles.videoDetailCard}>
                  <View style={styles.videoDetailIconContainer}>
                    <MaterialIcons
                      name="timer"
                      size={moderateWidthScale(20)}
                      color={theme.white}
                    />
                  </View>
                  <View style={styles.videoDetailContent}>
                    <Text style={styles.videoDetailLabel}>{t("duration")}</Text>
                    <Text style={styles.videoDetailValue}>
                      {sm.video.duration.toFixed(1)}s
                    </Text>
                  </View>
                </View>
              )}
              {sm.video.resolution && (
                <View style={styles.videoDetailCard}>
                  <View style={styles.videoDetailIconContainer}>
                    <MaterialIcons
                      name="high-quality"
                      size={moderateWidthScale(20)}
                      color={theme.white}
                    />
                  </View>
                  <View style={styles.videoDetailContent}>
                    <Text style={styles.videoDetailLabel}>
                      {t("resolution")}
                    </Text>
                    <Text style={styles.videoDetailValue}>
                      {sm.video.resolution}
                    </Text>
                  </View>
                </View>
              )}
              {sm.video.format && (
                <View style={styles.videoDetailCard}>
                  <View style={styles.videoDetailIconContainer}>
                    <MaterialIcons
                      name="video-file"
                      size={moderateWidthScale(20)}
                      color={theme.white}
                    />
                  </View>
                  <View style={styles.videoDetailContent}>
                    <Text style={styles.videoDetailLabel}>{t("format")}</Text>
                    <Text style={styles.videoDetailValue}>
                      {sm.video.format.toUpperCase()}
                    </Text>
                  </View>
                </View>
              )}
              {sm.video.file_size_mb != null && (
                <View style={styles.videoDetailCard}>
                  <View style={styles.videoDetailIconContainer}>
                    <MaterialIcons
                      name="storage"
                      size={moderateWidthScale(20)}
                      color={theme.white}
                    />
                  </View>
                  <View style={styles.videoDetailContent}>
                    <Text style={styles.videoDetailLabel}>{t("fileSize")}</Text>
                    <Text style={styles.videoDetailValue}>
                      {sm.video.file_size_mb.toFixed(2)} MB
                    </Text>
                  </View>
                </View>
              )}
              {sm.media_count != null && (
                <View style={styles.videoDetailCard}>
                  <View style={styles.videoDetailIconContainer}>
                    <MaterialIcons
                      name="collections"
                      size={moderateWidthScale(20)}
                      color={theme.white}
                    />
                  </View>
                  <View style={styles.videoDetailContent}>
                    <Text style={styles.videoDetailLabel}>
                      {t("mediaCount")}
                    </Text>
                    <Text style={styles.videoDetailValue}>
                      {String(sm.media_count)}
                    </Text>
                  </View>
                </View>
              )}
            </View>
          </View>
        )}

        {sm.original_media && sm.original_media.length > 0 && (
          <View style={styles.section}>
            <TouchableOpacity
              style={styles.originalMediaDropdownHeader}
              onPress={() => setOriginalMediaExpanded((prev) => !prev)}
              activeOpacity={0.7}
            >
              <Text style={styles.sectionTitleUppercase}>
                {t("originalMedia")}
              </Text>
              <Feather
                name={originalMediaExpanded ? "chevron-up" : "chevron-down"}
                size={moderateWidthScale(22)}
                color={theme.text}
              />
            </TouchableOpacity>
            {originalMediaExpanded && (
              <View style={styles.originalMediaGrid}>
                {sm.original_media.map((mediaItem, idx) => (
                  <OriginalMediaCard
                    key={`${mediaItem.url}-${mediaItem.index}-${idx}`}
                    item={mediaItem}
                    styles={styles}
                    theme={theme}
                    onImagePress={openFullImage}
                    allUrls={sm.original_media!.map((m) => m.url)}
                    onSharePress={
                      isSelectionMode
                        ? undefined
                        : (url, labelKey) =>
                            openShareSheetForImage(url, labelKey, true)
                    }
                    onDownloadPress={
                      isSelectionMode
                        ? undefined
                        : (url, options) => downloadMedia(url, options ?? {})
                    }
                    downloadingUrl={downloadingUrl}
                    selectionMode={isSelectionMode}
                    selectedUrls={isSelectionMode ? selectedUrls : undefined}
                    onToggleUrl={isSelectionMode ? toggleUrl : undefined}
                  />
                ))}
              </View>
            )}
          </View>
        )}

        {!isReel && sm.images?.processed && (
          <View style={styles.singleImageContainer}>
            <TouchableOpacity
              style={styles.singleImageTouchable}
              onPress={() => {
                const url = sm.images?.processed;
                if (!url) return;
                if (isSelectionMode) toggleUrl(url);
                else openFullImage(url);
              }}
              activeOpacity={1}
            >
              <Image
                source={{ uri: sm.images.processed }}
                style={styles.singleImage}
                resizeMode="cover"
              />
            </TouchableOpacity>
            {isSelectionMode ? (
              <View
                style={[
                  styles.selectionOverlay,
                  selectedUrls.has(sm.images.processed) &&
                    styles.selectionOverlaySelected,
                ]}
              >
                {selectedUrls.has(sm.images.processed) ? (
                  <Feather
                    name="check"
                    size={moderateWidthScale(14)}
                    color={theme.white}
                  />
                ) : null}
              </View>
            ) : (
              <>
                <TouchableOpacity
                  style={styles.shareIconOverlay}
                  onPress={() =>
                    openShareSheetForImage(sm.images!.processed!, "image", true)
                  }
                  activeOpacity={0.7}
                >
                  <Feather
                    name="share-2"
                    size={moderateWidthScale(20)}
                    color={theme.white}
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.downloadIconOverlay}
                  onPress={() => handleDownloadPrimary(sm.images?.processed)}
                  disabled={downloadingUrl === sm.images?.processed}
                  activeOpacity={0.7}
                >
                  {downloadingUrl === sm.images?.processed ? (
                    <ActivityIndicator size="small" color={theme.white} />
                  ) : (
                    <Feather
                      name="download"
                      size={moderateWidthScale(20)}
                      color={theme.white}
                    />
                  )}
                </TouchableOpacity>
              </>
            )}
          </View>
        )}

        {!isReel && sm.images?.originals && sm.images.originals.length > 0 && (
          <View style={styles.section}>
            <TouchableOpacity
              style={styles.originalsDropdownHeader}
              onPress={() => setOriginalsExpanded((prev) => !prev)}
              activeOpacity={0.7}
            >
              <Text style={styles.sectionTitleUppercase}>
                {t("originalImages")}
              </Text>
              <Feather
                name={originalsExpanded ? "chevron-up" : "chevron-down"}
                size={moderateWidthScale(22)}
                color={theme.text}
              />
            </TouchableOpacity>
            {originalsExpanded && (
              <View style={styles.originalsGrid}>
                {sm.images.originals.map((url, index) => (
                  <View key={`${url}-${index}`} style={styles.originalsCard}>
                    <TouchableOpacity
                      style={styles.singleImageTouchable}
                      onPress={() =>
                        isSelectionMode
                          ? toggleUrl(url)
                          : openFullImage(
                              url,
                              sm.images!.originals ?? undefined,
                            )
                      }
                      activeOpacity={1}
                    >
                      <Image
                        source={{ uri: url }}
                        style={styles.singleImage}
                        resizeMode="cover"
                      />
                    </TouchableOpacity>
                    {isSelectionMode ? (
                      <View
                        style={[
                          styles.selectionOverlay,
                          selectedUrls.has(url) &&
                            styles.selectionOverlaySelected,
                        ]}
                      >
                        {selectedUrls.has(url) ? (
                          <Feather
                            name="check"
                            size={moderateWidthScale(14)}
                            color={theme.white}
                          />
                        ) : null}
                      </View>
                    ) : (
                      <>
                        <TouchableOpacity
                          style={styles.shareIconOverlay}
                          onPress={() =>
                            openShareSheetForImage(url, "image", true)
                          }
                          activeOpacity={0.7}
                        >
                          <Feather
                            name="share-2"
                            size={moderateWidthScale(20)}
                            color={theme.white}
                          />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.downloadIconOverlay}
                          onPress={() => handleDownloadPrimary(url)}
                          disabled={downloadingUrl === url}
                          activeOpacity={0.7}
                        >
                          {downloadingUrl === url ? (
                            <ActivityIndicator
                              size="small"
                              color={theme.white}
                            />
                          ) : (
                            <Feather
                              name="download"
                              size={moderateWidthScale(20)}
                              color={theme.white}
                            />
                          )}
                        </TouchableOpacity>
                      </>
                    )}
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {sm.content?.caption != null && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitleUppercase}>{t("caption")}</Text>
              <TouchableOpacity
                style={styles.copyButton}
                onPress={() => handleCopy(editableCaption)}
                activeOpacity={0.7}
              >
                <MaterialIcons
                  name="content-copy"
                  size={moderateWidthScale(18)}
                  color={theme.darkGreen}
                />
              </TouchableOpacity>
            </View>
            <View style={styles.sectionContent}>
              <TextInput
                value={editableCaption}
                onChangeText={setEditableCaption}
                style={styles.editableCaptionInput}
                multiline
                placeholderTextColor={theme.lightGreen4}
              />
            </View>
          </View>
        )}

        {sm.content?.hashtags && sm.content.hashtags.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitleUppercase}>{t("hashtags")}</Text>
              <TouchableOpacity
                style={styles.copyButton}
                onPress={() => handleCopy(sm.content!.hashtags!.join(" "))}
                activeOpacity={0.7}
              >
                <MaterialIcons
                  name="content-copy"
                  size={moderateWidthScale(18)}
                  color={theme.darkGreen}
                />
              </TouchableOpacity>
            </View>
            <View style={styles.sectionContent}>
              <View style={styles.hashtagsContainer}>
                {sm.content.hashtags.map((hashtag, index) => (
                  <View key={index} style={styles.hashtagChip}>
                    <Text style={styles.hashtagText}>{hashtag}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        )}

        {sm.content?.complete_post != null && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitleUppercase}>
                {t("completePostText")}
              </Text>
              <TouchableOpacity
                style={styles.copyButton}
                onPress={() => handleCopy(editableCompletePost)}
                activeOpacity={0.7}
              >
                <MaterialIcons
                  name="content-copy"
                  size={moderateWidthScale(18)}
                  color={theme.darkGreen}
                />
              </TouchableOpacity>
            </View>
            <View style={styles.sectionContent}>
              <TextInput
                value={editableCompletePost}
                onChangeText={setEditableCompletePost}
                style={styles.editableCompletePostInput}
                multiline
                placeholderTextColor={theme.lightGreen4}
              />
            </View>
          </View>
        )}
      </KeyboardAwareScrollView>
    );
  } else if (
    !normalized ||
    normalized.status !== "completed" ||
    (normalized.sections.length === 0 && !normalized.socialMedia)
  ) {
    content = (
      <View style={styles.centerContainer}>
        <Text style={styles.emptyText}>{t("resultNotFound")}</Text>
      </View>
    );
  } else {
    content = (
      <KeyboardAwareScrollView
        contentContainerStyle={[
          styles.scrollContent,
          isSelectionMode && { paddingBottom: moderateHeightScale(100) },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {isSelectionMode && allSelectableUrls.length > 0 && (
          <View style={styles.selectAllRow}>
            <Text style={styles.sectionTitleUppercase}>
              {t("selectImagesForTryOn")}
            </Text>
            <TouchableOpacity
              style={styles.selectAllButton}
              onPress={() =>
                allSelected ? unselectAll() : selectAll(allSelectableUrls)
              }
              activeOpacity={0.7}
            >
              <Text style={styles.selectAllButtonText}>
                {allSelected ? t("unselectAll") : t("selectAll")}
              </Text>
            </TouchableOpacity>
          </View>
        )}
        {normalized.sections.map((section, idx) => (
          <View key={idx} style={styles.section}>
            <View style={styles.sectionTitleRow}>
              <Text style={styles.sectionTitleFlex} numberOfLines={1}>
                {section.name}
              </Text>
              {!isSelectionMode && (
                <TouchableOpacity
                  style={styles.sectionShareButton}
                  onPress={() => openShareSheetForSection(section)}
                  activeOpacity={0.7}
                  accessibilityLabel={t("share")}
                >
                  <MaterialIcons
                    name="share"
                    size={moderateWidthScale(18)}
                    color={theme.text}
                  />
                </TouchableOpacity>
              )}
              {isSelectionMode &&
                section.views.length > 0 &&
                (() => {
                  const sectionUrls = section.views.map((v) => v.url);
                  const sectionAllSelected = sectionUrls.every((u) =>
                    selectedUrls.has(u),
                  );
                  return (
                    <TouchableOpacity
                      style={styles.selectSectionButton}
                      onPress={() =>
                        sectionAllSelected
                          ? unselectSection(sectionUrls)
                          : selectSection(sectionUrls)
                      }
                      activeOpacity={0.7}
                    >
                      <Text style={styles.selectSectionButtonText}>
                        {sectionAllSelected
                          ? t("unselectSection")
                          : t("selectSection")}
                      </Text>
                    </TouchableOpacity>
                  );
                })()}
            </View>
            {section.description ? (
              <Text style={styles.sectionDescription}>
                {section.description}
              </Text>
            ) : null}
            <View style={styles.imageGrid}>
              {section.views.map(({ key: viewKey, labelKey, url }) => (
                <View key={viewKey} style={styles.imageCard}>
                  <View style={styles.imageCardInner}>
                    <TouchableOpacity
                      style={StyleSheet.absoluteFill}
                      onPress={() =>
                        isSelectionMode
                          ? toggleUrl(url)
                          : openFullImage(
                              url,
                              section.views.map((v) => v.url),
                            )
                      }
                      activeOpacity={1}
                    >
                      <Image
                        source={{ uri: url }}
                        style={styles.resultImage}
                        resizeMode="cover"
                      />
                    </TouchableOpacity>
                    {isSelectionMode ? (
                      <View
                        style={[
                          styles.selectionOverlay,
                          selectedUrls.has(url) &&
                            styles.selectionOverlaySelected,
                        ]}
                      >
                        {selectedUrls.has(url) ? (
                          <Feather
                            name="check"
                            size={moderateWidthScale(14)}
                            color={theme.white}
                          />
                        ) : null}
                      </View>
                    ) : (
                      <>
                        <TouchableOpacity
                          style={styles.imageLabel}
                          onPress={() => openShareSheetForImage(url, labelKey)}
                          activeOpacity={0.8}
                        >
                          <Text style={styles.imageLabelText}>
                            {t(labelKey)}
                          </Text>
                          <MaterialIcons
                            name="share"
                            size={moderateWidthScale(14)}
                            color={theme.white}
                          />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.downloadButton}
                          onPress={() => handleDownload(url)}
                          disabled={downloadingUrl === url}
                          activeOpacity={0.7}
                        >
                          {downloadingUrl === url ? (
                            <ActivityIndicator
                              size="small"
                              color={theme.white}
                            />
                          ) : (
                            <Feather
                              name="download"
                              size={moderateWidthScale(14)}
                              color={theme.white}
                            />
                          )}
                        </TouchableOpacity>
                      </>
                    )}
                  </View>
                </View>
              ))}
            </View>
          </View>
        ))}
      </KeyboardAwareScrollView>
    );
  }

  return (
    <View style={styles.safeArea}>
      <StackHeader
        title={t("aiResults")}
        rightIcon={
          canShare ? (
            <MaterialIcons
              name="share"
              size={moderateWidthScale(22)}
              color={theme.white}
            />
          ) : undefined
        }
        onRightPress={canShare ? openShareSheet : undefined}
      />
      {content}

      <ShareOptionsBottomSheet
        visible={shareSheetVisible}
        onClose={() => setShareSheetVisible(false)}
        onSelectInAppUser={openShareToUserModal}
        onSelectNativeShare={handleShareAiResult}
      />

      <PotentialContactsModal
        visible={shareToUserModalVisible}
        onClose={() => setShareToUserModalVisible(false)}
        contacts={potentialContacts}
        loading={potentialLoading}
        loadingMore={potentialLoadingMore}
        error={potentialError}
        onRetry={() => fetchPotentialContacts(1, false)}
        onContactPress={onPotentialContactPress}
        onEndReached={onPotentialEndReached}
        sending={shareSending}
      />

      {(fromBooking || fromChat) &&
        normalized?.status === "completed" &&
        allSelectableUrls.length > 0 && (
          <View style={styles.selectFooter}>
            <TouchableOpacity
              style={[
                styles.selectButton,
                selectedUrls.size === 0 && styles.selectButtonDisabled,
              ]}
              onPress={() => {
                if (selectedUrls.size > 0 && jobId) {
                  if (fromBooking) {
                    dispatch(
                      setBookingTryOnSelectionForJob({
                        jobId,
                        urls: Array.from(selectedUrls),
                      }),
                    );
                    dispatch(setBookingTryOnImageUrls(Array.from(selectedUrls)));
                  }
                  if (fromChat) {
                    dispatch(setChatAttachmentUrls(Array.from(selectedUrls)));
                  }
                  router.back();
                  router.back();
                }
              }}
              disabled={selectedUrls.size === 0}
              activeOpacity={0.7}
            >
              <Text style={styles.selectButtonText}>
                {t("select") || "Select"} ({selectedUrls.size})
              </Text>
            </TouchableOpacity>
          </View>
        )}
    </View>
  );
}
