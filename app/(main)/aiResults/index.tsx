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
} from "react-native";
import { useTranslation } from "react-i18next";
import { useLocalSearchParams } from "expo-router";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { createStyles } from "./styles";
import StackHeader from "@/src/components/StackHeader";
import { ApiService } from "@/src/services/api";
import { aiRequestsEndpoints } from "@/src/services/endpoints";
import { Feather } from "@expo/vector-icons";
import { moderateWidthScale } from "@/src/theme/dimensions";

/** API: GET /api/ai-requests/{job_id} - response can be processing, replicate, or hair_pipeline */
export interface AiRequestByJobIdResponse {
  data: {
    job_id: string;
    status: string;
    /** Empty array when processing; object when completed */
    response?:
      | []
      | {
          images?: ReplicateImages | HairPipelineImages;
          job_type?: string;
          attributes?: Record<string, unknown>;
          recommendations?: Record<
            string,
            { name: string; description: string }
          >;
        };
    message?: string;
  };
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

/** Normalized result: status + sections for completed */
interface NormalizedResult {
  status: string;
  sections: NormalizedSection[];
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

/** Normalize API response: handles processing, replicate, and hair_pipeline shapes */
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

  if (
    !normalized ||
    normalized.status !== "completed" ||
    normalized.sections.length === 0
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
