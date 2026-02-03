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
  images?: {
    face_match?: HairPipelineImageSet;
    trending_celebrity?: HairPipelineImageSet;
    ai_suggested?: HairPipelineImageSet;
  };
  message?: string;
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

const IMAGE_SECTIONS: (keyof NonNullable<
  HairPipelineStatusResponse["images"]
>)[] = ["face_match", "trending_celebrity", "ai_suggested"];

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
      setData(result);
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

  return (
    <View style={styles.safeArea}>
      <StackHeader title={t("aiResults")} />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {IMAGE_SECTIONS.map((key) => {
          const section = data.images?.[key];
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
          ].filter((v) => v.url);
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
                {views.map(({ key: viewKey, labelKey, url }) => (
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
                        onPress={() => handleDownload(url!)}
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
          );
        })}
      </ScrollView>
    </View>
  );
}
