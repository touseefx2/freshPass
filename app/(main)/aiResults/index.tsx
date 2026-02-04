import React, {
  useMemo,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import {
  ScrollView,
  View,
  Text,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  Clipboard,
  Alert,
} from "react-native";
import { Video, ResizeMode, AVPlaybackStatus } from "expo-av";
import { useTranslation } from "react-i18next";
import { useLocalSearchParams } from "expo-router";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { createStyles } from "./styles";
import StackHeader from "@/src/components/StackHeader";
import { ApiService } from "@/src/services/api";
import { aiRequestsEndpoints } from "@/src/services/endpoints";
import { Feather, MaterialIcons } from "@expo/vector-icons";
import { moderateWidthScale } from "@/src/theme/dimensions";
import FullImageModal from "@/src/components/fullImageModal";

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
  const d = raw?.data;
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
    return {
      status,
      sections: [],
      socialMedia: {
        jobType,
        images: res.images,
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

export default function AiResults() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ jobId?: string }>();
  const jobId = params.jobId;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [normalized, setNormalized] = useState<NormalizedResult | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [fullImageModalVisible, setFullImageModalVisible] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const videoRef = useRef<Video>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isVideoReady, setIsVideoReady] = useState(false);
  const [playbackStatus, setPlaybackStatus] = useState<AVPlaybackStatus | null>(
    null,
  );

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

  const handleDownload = async (uri: string) => {
    try {
      const canOpen = await Linking.canOpenURL(uri);
      if (canOpen) await Linking.openURL(uri);
    } catch (_) {}
  };

  const handleCopy = async (text: string) => {
    try {
      Clipboard.setString(text);
    } catch (_) {
      Alert.alert(t("error"), t("failedToCopyToClipboard"));
    }
  };

  const handleDownloadPrimary = async (uri?: string) => {
    if (!uri) return;
    setDownloading(true);
    try {
      const canOpen = await Linking.canOpenURL(uri);
      if (canOpen) await Linking.openURL(uri);
    } catch (_) {}
    setDownloading(false);
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

  const styles = useMemo(() => createStyles(colors as Theme), [colors]);
  const theme = colors as Theme;

  if (loading && !normalized) {
    return (
      <View style={styles.safeArea}>
        <StackHeader title={t("aiResults")} />
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={styles.loadingText}>{t("aiStillProcessing")}</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.safeArea}>
        <StackHeader title={t("aiResults")} />
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
      </View>
    );
  }

  if (normalized?.status === "processing") {
    return (
      <View style={styles.safeArea}>
        <StackHeader title={t("aiResults")} />
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={styles.loadingText}>{t("aiStillProcessing")}</Text>
        </View>
      </View>
    );
  }

  if (normalized?.status === "failed") {
    return (
      <View style={styles.safeArea}>
        <StackHeader title={t("aiResults")} />
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
      </View>
    );
  }

  // Social media result: generate_post, generate_collage, generate_reel
  if (normalized?.status === "completed" && normalized.socialMedia) {
    const sm = normalized.socialMedia;
    const isReel = sm.jobType === "generate_reel";
    const downloadUri = isReel ? sm.video?.url : sm.images?.processed;

    return (
      <View style={styles.safeArea}>
        <StackHeader title={t("aiResults")} />
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {downloadUri && (
            <View style={styles.headerContainer}>
              <TouchableOpacity
                style={styles.downloadButtonPrimary}
                onPress={() => handleDownloadPrimary(downloadUri)}
                disabled={downloading}
                activeOpacity={0.7}
              >
                {downloading ? (
                  <ActivityIndicator size="small" color={theme.white} />
                ) : (
                  <>
                    <Feather
                      name="download"
                      size={moderateWidthScale(16)}
                      color={theme.white}
                    />
                    <Text style={styles.downloadButtonPrimaryText}>
                      {t("download")} {isReel ? t("video") : t("image")}
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
                      <Text style={styles.videoDetailLabel}>
                        {t("duration")}
                      </Text>
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
                      <Text style={styles.videoDetailLabel}>
                        {t("fileSize")}
                      </Text>
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
            <TouchableOpacity
              style={styles.singleImageContainer}
              onPress={() => setFullImageModalVisible(true)}
              activeOpacity={1}
            >
              <Image
                source={{ uri: sm.images.processed }}
                style={styles.singleImage}
                resizeMode="cover"
              />
            </TouchableOpacity>
          )}

          {sm.content?.caption && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitleUppercase}>{t("caption")}</Text>
                <TouchableOpacity
                  style={styles.copyButton}
                  onPress={() => handleCopy(sm.content!.caption!)}
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
                <Text style={styles.captionText}>{sm.content.caption}</Text>
              </View>
            </View>
          )}

          {sm.content?.hashtags && sm.content.hashtags.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitleUppercase}>
                  {t("hashtags")}
                </Text>
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

          {sm.content?.complete_post && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitleUppercase}>
                  {t("completePostText")}
                </Text>
                <TouchableOpacity
                  style={styles.copyButton}
                  onPress={() => handleCopy(sm.content!.complete_post!)}
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
                <Text style={styles.completePostText}>
                  {sm.content.complete_post}
                </Text>
              </View>
            </View>
          )}
        </ScrollView>

        <FullImageModal
          visible={fullImageModalVisible}
          onClose={() => setFullImageModalVisible(false)}
          imageUri={sm.images?.processed ?? null}
        />
      </View>
    );
  }

  if (
    !normalized ||
    normalized.status !== "completed" ||
    (normalized.sections.length === 0 && !normalized.socialMedia)
  ) {
    return (
      <View style={styles.safeArea}>
        <StackHeader title={t("aiResults")} />
        <View style={styles.centerContainer}>
          <Text style={styles.emptyText}>{t("resultNotFound")}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.safeArea}>
      <StackHeader title={t("aiResults")} />
      <ScrollView
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
                    <Image
                      source={{ uri: url }}
                      style={styles.resultImage}
                      resizeMode="cover"
                    />
                    <View style={styles.imageLabel}>
                      <Text style={styles.imageLabelText}>{t(labelKey)}</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.downloadButton}
                      onPress={() => handleDownload(url)}
                      activeOpacity={0.7}
                    >
                      <Feather
                        name="download"
                        size={moderateWidthScale(12)}
                        color={theme.white}
                      />
                      <Text style={styles.downloadButtonText}>
                        {t("download")}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
