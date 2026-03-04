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
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { Video, ResizeMode, AVPlaybackStatus } from "expo-av";
import { useTranslation } from "react-i18next";
import { useLocalSearchParams } from "expo-router";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { createStyles } from "./styles";
import StackHeader from "@/src/components/StackHeader";
import { ApiService } from "@/src/services/api";
import { aiRequestsEndpoints, chatEndpoints } from "@/src/services/endpoints";
import { Feather, MaterialIcons } from "@expo/vector-icons";
import { useDispatch } from "react-redux";
import { moderateWidthScale } from "@/src/theme/dimensions";
import { openFullImageModal } from "@/src/state/slices/generalSlice";
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
}

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
                : [],
            }
          : undefined,
        content: res.content,
        video: res.video,
        music: res.music,
        media_count: res.media_count,
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
  const params = useLocalSearchParams<{ jobId?: string }>();
  const jobId = params.jobId;
  const { showBanner } = useNotificationContext();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [normalized, setNormalized] = useState<NormalizedResult | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const dispatch = useDispatch();
  const { downloadMedia, downloadingUrl } = useDownloadMedia();
  const videoRef = useRef<Video>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isVideoReady, setIsVideoReady] = useState(false);
  const [playbackStatus, setPlaybackStatus] = useState<AVPlaybackStatus | null>(
    null,
  );
  const [editableCaption, setEditableCaption] = useState("");
  const [editableCompletePost, setEditableCompletePost] = useState("");

  const [shareSheetVisible, setShareSheetVisible] = useState(false);
  const [shareContext, setShareContext] = useState<null | {
    url: string;
    labelKey: string;
    linkOnly?: boolean;
  }>(null);
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

  const handlePlayPause = async () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      await videoRef.current.pauseAsync();
      setIsPlaying(false);
    } else {
      if (
        playbackStatus?.isLoaded &&
        playbackStatus.positionMillis !== undefined &&
        playbackStatus.durationMillis !== undefined &&
        playbackStatus.positionMillis >= playbackStatus.durationMillis - 100
      ) {
        await videoRef.current.setPositionAsync(0);
      }
      await videoRef.current.playAsync();
      setIsPlaying(true);
    }
  };

  const handlePlaybackStatusUpdate = (status: AVPlaybackStatus) => {
    setPlaybackStatus(status);
    if (status.isLoaded) {
      const isReady =
        !status.isBuffering &&
        status.durationMillis !== undefined &&
        status.durationMillis > 0;
      if (isReady && !isVideoReady) setIsVideoReady(true);
      setIsPlaying(status.isPlaying);
      if (status.didJustFinish) {
        setIsPlaying(false);
        videoRef.current?.setPositionAsync(0);
      }
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
        const message = shareContext.linkOnly
          ? shareContext.url
          : `${t("aiResults")} – ${t(shareContext.labelKey)}: ${shareContext.url}`;
        await Share.share({
          message: message.trim(),
          url: shareContext.linkOnly ? undefined : shareContext.url,
        });
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
      return shareContext.url;
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
    (normalized.sections.length > 0 || !!normalized.socialMedia);

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
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {isReel && downloadUri && (
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
          </View>
        )}

        {isReel && sm.video?.url && (
          <View style={styles.videoContainer}>
            <Video
              ref={videoRef}
              source={{ uri: sm.video.url }}
              style={styles.video}
              resizeMode={ResizeMode.CONTAIN}
              isLooping={false}
              shouldPlay={false}
              onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
            />
            {!isVideoReady ? (
              <View style={styles.playButton}>
                <ActivityIndicator size="large" color={theme.white} />
              </View>
            ) : (
              <TouchableOpacity
                style={styles.playButton}
                onPress={handlePlayPause}
                activeOpacity={0.7}
              >
                <View style={styles.playButtonInner}>
                  {isPlaying ? (
                    <MaterialIcons
                      name="pause"
                      size={moderateWidthScale(40)}
                      color={theme.white}
                    />
                  ) : (
                    <MaterialIcons
                      name="play-arrow"
                      size={moderateWidthScale(40)}
                      color={theme.white}
                    />
                  )}
                </View>
              </TouchableOpacity>
            )}
            <View style={styles.videoInfoContainer}>
              {sm.video.duration != null && (
                <Text style={styles.videoInfoText}>
                  {sm.video.duration.toFixed(1)}s
                </Text>
              )}
            </View>
          </View>
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

        {!isReel && sm.images?.processed && (
          <View style={styles.singleImageContainer}>
            <TouchableOpacity
              style={styles.singleImageTouchable}
              onPress={() =>
                sm.images?.processed && openFullImage(sm.images.processed)
              }
              activeOpacity={1}
            >
              <Image
                source={{ uri: sm.images.processed }}
                style={styles.singleImage}
                resizeMode="cover"
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.shareIconOverlay}
              onPress={() =>
                openShareSheetForImage(
                  sm.images!.processed!,
                  "image",
                  true,
                )
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
              onPress={() =>
                handleDownloadPrimary(sm.images?.processed)
              }
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
                  <View
                    key={`${url}-${index}`}
                    style={styles.originalsCard}
                  >
                    <TouchableOpacity
                      style={styles.singleImageTouchable}
                      onPress={() =>
                        openFullImage(
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
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {normalized.sections.map((section, idx) => (
          <View key={idx} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.name}</Text>
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
                        openFullImage(
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
                    <TouchableOpacity
                      style={styles.imageLabel}
                      onPress={() => openShareSheetForImage(url, labelKey)}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.imageLabelText}>{t(labelKey)}</Text>
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
                      {/* <Text style={styles.downloadButtonText}>
                        {t("download")}
                      </Text> */}
                    </TouchableOpacity>
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
    </View>
  );
}
