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
import EmptyState from "@/src/components/emptyState";
import { ApiService } from "@/src/services/api";
import { memoriesEndpoints } from "@/src/services/endpoints";

export interface MemorySection {
  weekKey: string;
  dateLabel: string;
  weekRange: string; // e.g. "1 Sep – 7 Sep 2026"
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

const MONTH_SHORT = [
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

function parseMemoryDate(dateStr: string): Date {
  return new Date(dateStr + "T12:00:00");
}

function getSevenDayEnd(start: Date): Date {
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return end;
}

function formatWeekRange(dateStr: string): string {
  const start = parseMemoryDate(dateStr);
  const end = getSevenDayEnd(start);
  const startDay = start.getDate();
  const startMonth = MONTH_SHORT[start.getMonth()];
  const endDay = end.getDate();
  const endMonth = MONTH_SHORT[end.getMonth()];

  if (start.getFullYear() !== end.getFullYear()) {
    return `${startDay} ${startMonth} ${start.getFullYear()} – ${endDay} ${endMonth} ${end.getFullYear()}`;
  }
  if (start.getMonth() === end.getMonth()) {
    return `${startDay} – ${endDay} ${endMonth} ${end.getFullYear()}`;
  }
  return `${startDay} ${startMonth} – ${endDay} ${endMonth} ${end.getFullYear()}`;
}

function formatDateLabel(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return `${y}/${m}/${d}`;
}

function groupByWeek(items: MemoryItem[]): MemorySection[] {
  const ungrouped = [...items].sort(
    (a, b) => parseMemoryDate(a.date).getTime() - parseMemoryDate(b.date).getTime(),
  );
  const sections: MemorySection[] = [];

  let index = 0;
  while (index < ungrouped.length) {
    const startDate = ungrouped[index].date;
    const endTime = getSevenDayEnd(parseMemoryDate(startDate)).getTime();
    const weekItems: MemoryItem[] = [];

    while (
      index < ungrouped.length &&
      parseMemoryDate(ungrouped[index].date).getTime() <= endTime
    ) {
      weekItems.push(ungrouped[index]);
      index += 1;
    }

    weekItems.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
    sections.push({
      weekKey: startDate,
      dateLabel: formatDateLabel(startDate),
      weekRange: formatWeekRange(startDate),
      items: weekItems,
    });
  }

  return sections.reverse();
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
        ? (firstImageItem.url ?? firstImageItem.image_url ?? "")
        : "";
      const hasOnlyVideos =
        item.items.length > 0 && !item.items.some((i) => i.type === "image");
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
            <Text style={styles.sectionCardDate}>{item.weekRange}</Text>
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
        <EmptyState
          icon="photo-library"
          title={t("noMemoriesFound")}
          subtitle={t("memoriesEmptySubtitle")}
          actionTitle={t("exploreAiTools")}
          onActionPress={() => router.back()}
        />
      ) : null,
    [loading, sections.length, t, router],
  );

  const listHeader = useMemo(
    () =>
      sections.length > 0 ? (
        <Text style={styles.listHint}>{t("memoriesListHint")}</Text>
      ) : null,
    [sections.length, styles.listHint, t],
  );

  return (
    <View style={styles.safeArea}>
      <StatusBar
        barStyle="light-content"
        backgroundColor={theme.darkGreen}
        translucent
      />
      <StackHeader
        title={t("memories")}
        rightIcon={
          <MaterialIcons
            name="smart-toy"
            size={moderateWidthScale(22)}
            color={theme.white}
          />
        }
        onRightPress={() => router.back()}
      />
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
          ListHeaderComponent={listHeader}
          ListFooterComponent={listFooter}
          ListEmptyComponent={listEmpty}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}
