import React, { useMemo, useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  StatusBar,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useRouter } from "expo-router";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { moderateWidthScale } from "@/src/theme/dimensions";
import { createStyles } from "./styles";
import StackHeader from "@/src/components/StackHeader";
import { ApiService } from "@/src/services/api";
import { memoriesEndpoints } from "@/src/services/endpoints";

export interface MemorySection {
  weekKey: string;
  dateLabel: string;
  items: MemoryItem[];
}

export interface MemoryItem {
  url: string;
  date: string;
  /** "video" | "image" from API */
  type?: "video" | "image";
  /** @deprecated Use url. Kept for backward compatibility. */
  image_url?: string;
}

const PER_PAGE = 20;

type MemoriesResponse = {
  success: boolean;
  data: MemoryItem[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
};

function getWeekKey(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d);
  monday.setDate(diff);
  const y = monday.getFullYear();
  const w = Math.ceil(
    (monday.getTime() - new Date(y, 0, 1).getTime()) / 604800000,
  );
  return `${y}-W${String(w).padStart(2, "0")}`;
}

function formatDateLabel(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return `${y}/${m}/${d}`;
}

function groupByWeek(items: MemoryItem[]): MemorySection[] {
  const byWeek = new Map<string, MemoryItem[]>();
  for (const item of items) {
    const key = getWeekKey(item.date);
    if (!byWeek.has(key)) byWeek.set(key, []);
    byWeek.get(key)!.push(item);
  }
  const sections: MemorySection[] = [];
  byWeek.forEach((weekItems, weekKey) => {
    const sorted = [...weekItems].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
    const firstDate = sorted[0]?.date ?? "";
    sections.push({
      weekKey,
      dateLabel: formatDateLabel(firstDate),
      items: sorted,
    });
  });
  sections.sort(
    (a, b) =>
      new Date(b.items[0]?.date ?? 0).getTime() -
      new Date(a.items[0]?.date ?? 0).getTime(),
  );
  return sections;
}

export default function AiMemories() {
  const router = useRouter();
  const { colors } = useTheme();
  const { t } = useTranslation();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);

  const [list, setList] = useState<MemoryItem[]>([]);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const sections = useMemo(() => groupByWeek(list), [list]);

  const fetchMemories = useCallback(
    async (pageNum: number, append: boolean) => {
      try {
        if (append) setLoadingMore(true);
        else setLoading(true);
        const url = memoriesEndpoints.list({
          page: pageNum,
          per_page: PER_PAGE,
        });
        const res = await ApiService.get<MemoriesResponse>(url);
        const rawData = res?.data ?? [];
        const data = rawData.map((item: any) => ({
          date: item.date,
          url: item.url ?? item.image_url ?? "",
          type: item.type,
          image_url: item.image_url,
        })) as MemoryItem[];
        const currentPage = res?.current_page ?? pageNum;
        const last = res?.last_page ?? 1;
        setLastPage(last);
        if (append) {
          setList((prev) => [...prev, ...data]);
          setPage(currentPage);
        } else {
          setList(data);
          setPage(currentPage);
        }
      } catch {
        if (!append) setList([]);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [],
  );

  useEffect(() => {
    fetchMemories(1, false);
  }, [fetchMemories]);

  const handleEndReached = useCallback(() => {
    if (loadingMore || loading || page >= lastPage) return;
    fetchMemories(page + 1, true);
  }, [loadingMore, loading, page, lastPage, fetchMemories]);

  const handleSectionPress = useCallback(
    (section: MemorySection) => {
      router.push({
        pathname: "/listMemories",
        params: { openSection: JSON.stringify(section) },
      });
    },
    [router],
  );

  const renderSection = useCallback(
    ({ item }: { item: MemorySection }) => {
      const firstImageItem = item.items.find((i) => i.type === "image");
      const firstImageUrl = firstImageItem
        ? firstImageItem.url ?? firstImageItem.image_url ?? ""
        : "";
      const hasOnlyVideos =
        item.items.length > 0 &&
        !item.items.some((i) => i.type === "image");
      return (
        <TouchableOpacity
          style={styles.sectionCard}
          onPress={() => handleSectionPress(item)}
          activeOpacity={0.9}
        >
          <View style={styles.sectionCardImage}>
            {firstImageUrl ? (
              <Image
                source={{ uri: firstImageUrl }}
                style={styles.sectionCardImageInner}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.sectionCardIconPlaceholder}>
                <MaterialIcons
                  name={hasOnlyVideos ? "videocam" : "photo-library"}
                  size={moderateWidthScale(48)}
                  color={theme.lightGreen4}
                />
              </View>
            )}
          </View>
          <View style={styles.sectionCardOverlay}>
            <Text style={styles.sectionCardTitle}>{t("happyWeekend")}</Text>
            <Text style={styles.sectionCardDate}>{item.dateLabel}</Text>
          </View>
        </TouchableOpacity>
      );
    },
    [styles, handleSectionPress, t, theme.lightGreen4],
  );

  const keyExtractor = useCallback((item: MemorySection) => item.weekKey, []);

  const listFooter = useMemo(
    () =>
      loadingMore ? (
        <View style={styles.loadingFooter}>
          <ActivityIndicator size="small" color={theme.primary} />
        </View>
      ) : null,
    [loadingMore, styles, theme.primary],
  );

  const listEmpty = useMemo(
    () =>
      !loading && sections.length === 0 ? (
        <View style={styles.emptyStateContainer}>
          <Text style={styles.emptyStateText}>{t("memories")}</Text>
        </View>
      ) : null,
    [loading, sections.length, styles, t],
  );

  return (
    <View style={styles.safeArea}>
      <StatusBar
        barStyle="light-content"
        backgroundColor={theme.darkGreen}
        translucent
      />
      <StackHeader title={t("memories")} />
      {loading && list.length === 0 ? (
        <View
          style={[styles.emptyStateContainer, { justifyContent: "center" }]}
        >
          <ActivityIndicator size="small" color={theme.primary} />
        </View>
      ) : (
        <FlatList
          data={sections}
          renderItem={renderSection}
          keyExtractor={keyExtractor}
          contentContainerStyle={styles.listContent}
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.3}
          ListFooterComponent={listFooter}
          ListEmptyComponent={listEmpty}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}
