import React, { useMemo, useState, useEffect, useCallback } from "react";
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
import { AiToolsService } from "@/src/services/aiToolsService";
import { Feather } from "@expo/vector-icons";
import { moderateWidthScale } from "@/src/theme/dimensions";

export interface HairPipelineStatusResponse {
  job_id: string;
  status: string;
  created_at?: string;
  updated_at?: string;
  completed_at?: string;
  attributes?: Record<string, unknown>;
  recommendations?: Record<string, { name: string; description: string }>;
  images?:
    | {
        face_match?: HairPipelineImageSet;
        trending_celebrity?: HairPipelineImageSet;
        ai_suggested?: HairPipelineImageSet;
      }
    | HairPipelineFlatImages;
  message?: string;
  prompt?: string;
  generate_all_views?: boolean;
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

/** Flat format: images.front.url, images.left.url, etc. */
export interface HairPipelineFlatImages {
  front?: { url?: string };
  left?: { url?: string };
  right?: { url?: string };
  back?: { url?: string };
}

const IMAGE_SECTIONS: ("face_match" | "trending_celebrity" | "ai_suggested")[] =
  ["face_match", "trending_celebrity", "ai_suggested"];

const FLAT_VIEW_KEYS = ["front", "left", "right", "back"] as const;

function isFlatImages(
  images: HairPipelineStatusResponse["images"],
): images is HairPipelineFlatImages {
  if (!images || typeof images !== "object") return false;
  const first = (images as Record<string, unknown>)["front"];
  return (
    first != null &&
    typeof first === "object" &&
    "url" in first &&
    typeof (first as { url?: string }).url === "string"
  );
}

function normalizePayload(raw: unknown): HairPipelineStatusResponse | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  if (typeof obj.job_id === "string" && typeof obj.status === "string") {
    return raw as HairPipelineStatusResponse;
  }
  if (typeof obj.data === "string") {
    try {
      const parsed = JSON.parse(obj.data) as HairPipelineStatusResponse;
      return parsed?.job_id && parsed?.status ? parsed : null;
    } catch {
      return null;
    }
  }
  if (
    obj.data &&
    typeof obj.data === "object" &&
    (obj.data as Record<string, unknown>).job_id
  ) {
    return obj.data as HairPipelineStatusResponse;
  }
  return null;
}

export default function AiResults() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ jobId?: string }>();
  const jobId = params.jobId;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<HairPipelineStatusResponse | null>(null);

  const fetchStatus = useCallback(async () => {
    if (!jobId) {
      setError(t("missingJobId"));
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    setData(null);
    try {
      const result = await AiToolsService.getHairPipelineStatus(jobId);
      const payload = normalizePayload(result);
      setData(payload ?? (result as HairPipelineStatusResponse));
    } catch (e: any) {
      setError(e?.message || t("somethingWentWrong"));
    } finally {
      setLoading(false);
    }
  }, [jobId, t]);

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleDownload = async (uri: string) => {
    try {
      const canOpen = await Linking.canOpenURL(uri);
      if (canOpen) await Linking.openURL(uri);
    } catch (_) {}
  };

  const styles = useMemo(() => createStyles(colors as Theme), [colors]);
  const theme = colors as Theme;

  if (loading) {
    return (
      <View style={styles.safeArea}>
        <StackHeader title={t("aiResults")} />
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={styles.loadingText}>{t("yourApiIsProcessing")}</Text>
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
            onPress={fetchStatus}
            activeOpacity={0.7}
          >
            <Text style={styles.retryButtonText}>{t("retry")}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (!data || data.status !== "completed" || !data.images) {
    return (
      <View style={styles.safeArea}>
        <StackHeader title={t("aiResults")} />
        <View style={styles.centerContainer}>
          <Text style={styles.emptyText}>{t("noDataFound")}</Text>
        </View>
      </View>
    );
  }

  const flatImages = isFlatImages(data.images);
  const viewsFromFlat = flatImages
    ? (FLAT_VIEW_KEYS.map((key) => ({
        key,
        labelKey: key,
        url: data.images && (data.images as HairPipelineFlatImages)[key]?.url,
      })).filter((v) => !!v.url) as {
        key: "front" | "left" | "right" | "back";
        labelKey: "front" | "left" | "right" | "back";
        url: string;
      }[])
    : [];

  const renderImageCard = (
    viewKey: "front" | "left" | "right" | "back",
    url: string,
  ) => (
    <View key={viewKey} style={styles.imageCard}>
      <View style={styles.imageCardInner}>
        <Image
          source={{ uri: url }}
          style={styles.resultImage}
          resizeMode="cover"
        />
        <View style={styles.imageLabel}>
          <Text style={styles.imageLabelText}>{t(viewKey)}</Text>
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
          <Text style={styles.downloadButtonText}>{t("download")}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.safeArea}>
      <StackHeader title={t("aiResults")} />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {flatImages ? (
          <View style={styles.section}>
            {data.prompt ? (
              <Text style={styles.sectionDescription}>{data.prompt}</Text>
            ) : null}
            <View style={styles.imageGrid}>
              {viewsFromFlat.map(({ key: viewKey, url }) =>
                renderImageCard(viewKey, url),
              )}
            </View>
          </View>
        ) : (
          IMAGE_SECTIONS.map((key) => {
            const section = (
              data.images as {
                face_match?: HairPipelineImageSet;
                trending_celebrity?: HairPipelineImageSet;
                ai_suggested?: HairPipelineImageSet;
              }
            )?.[key];
            if (!section?.views) return null;
            const views = [
              {
                key: "front" as const,
                labelKey: "front" as const,
                url: section.views.front,
              },
              {
                key: "left" as const,
                labelKey: "left" as const,
                url: section.views.left,
              },
              {
                key: "right" as const,
                labelKey: "right" as const,
                url: section.views.right,
              },
              {
                key: "back" as const,
                labelKey: "back" as const,
                url: section.views.back,
              },
            ].filter((v) => !!v.url);
            if (views.length === 0) return null;
            return (
              <View key={key} style={styles.section}>
                <Text style={styles.sectionTitle}>{section.name}</Text>
                {section.description ? (
                  <Text style={styles.sectionDescription}>
                    {section.description}
                  </Text>
                ) : null}
                <View style={styles.imageGrid}>
                  {views.map(({ key: viewKey, url }) =>
                    renderImageCard(viewKey, url!),
                  )}
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}
