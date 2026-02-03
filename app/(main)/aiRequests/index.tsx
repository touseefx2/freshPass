import React, { useMemo } from "react";
import { ScrollView, View, Text, Image } from "react-native";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { createStyles } from "./styles";
import StackHeader from "@/src/components/StackHeader";
import { router } from "expo-router";

const DEFAULT_AI_REQUESTS_IMAGE =
  process.env.EXPO_PUBLIC_DEFAULT_AI_REQUESTS_IMAGE || "";
const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || "";

function getJobImageUrl(images: (string | null)[] | undefined): string {
  const image = images?.length ? images[0] : null;
  if (image == null || image === "") return DEFAULT_AI_REQUESTS_IMAGE;
  const trimmed = image.trim();
  if (trimmed.startsWith("https://") || trimmed.startsWith("http://"))
    return trimmed;
  const base = API_BASE_URL.endsWith("/")
    ? API_BASE_URL.slice(0, -1)
    : API_BASE_URL;
  const path = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return `${base}${path}`;
}

const STATIC_JOBS = [
  { job_id: "1a7ddec2-9e7", images: [] as string[], prompt: "" },
  {
    job_id: "7eb35c21-5ab",
    images: [] as string[],
    prompt: "please cut my hair",
  },
];

export default function AiRequests() {
  const { colors } = useTheme();
  const { t } = useTranslation();

  const styles = useMemo(() => createStyles(colors as Theme), [colors]);

  return (
    <View style={styles.safeArea}>
      <StackHeader title={t("aiRequests")} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {STATIC_JOBS.map((job, index) => {
          const imageUri = getJobImageUrl(job.images);
          return (
            <View key={`${job.job_id}-${index}`} style={styles.jobCard}>
              <View style={styles.jobCardImageWrap}>
                <Image
                  source={{ uri: imageUri }}
                  style={styles.jobCardImage}
                  resizeMode="cover"
                />
              </View>
              <View style={styles.jobCardContent}>
                <View>
                  <Text style={styles.jobCardLabel}>{t("jobId")}</Text>
                  <Text style={styles.jobCardValue}>{job.job_id}</Text>
                  {job.prompt ? (
                    <Text style={styles.jobCardPrompt} numberOfLines={2}>
                      {job.prompt}
                    </Text>
                  ) : null}
                </View>
                <Text
                  style={styles.jobCardSeeResult}
                  onPress={() => {
                    router.push({
                      pathname: "/aiResults",
                      params: { jobId: job.job_id },
                    });
                  }}
                >
                  {t("seeResult")}
                </Text>
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}
