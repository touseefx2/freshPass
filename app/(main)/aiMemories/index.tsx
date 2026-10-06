import React, { useMemo, useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
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
import MediaImage from "@/src/components/mediaImage";
import { ApiService } from "@/src/services/api";
import { memoriesEndpoints } from "@/src/services/endpoints";
import {
  AUTO_REELS_PER_PAGE,
  listAutoReels,
} from "@/src/services/reelsService";
import { autoReelVideo, type AutoReel } from "@/src/types/reels";

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
  /** Cover thumbnail for video / reel items */
  thumbnail_url?: string;
  /** Draft/published reel id when item comes from a ready auto reel */
  reel_id?: number;
}

type MemoriesTab = "memories" | "reels";

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

function dateKeyFromCreatedAt(createdAt?: string): string | null {
  if (!createdAt) return null;
  const match = createdAt.match(/^(\d{4}-\d{2}-\d{2})/);
  return match?.[1] ?? null;
}

/** Ready auto reels → memory items (video is on the auto reel; older ones on their draft) */
function autoReelsToMemoryItems(autoReels: AutoReel[]): MemoryItem[] {
  const items: MemoryItem[] = [];
  for (const autoReel of autoReels) {
    const video = autoReelVideo(autoReel);
    const dateKey = dateKeyFromCreatedAt(autoReel.created_at);
    if (!video?.playback_url || !dateKey) continue;
    const thumbnail = video.thumbnail_url || "";
    items.push({
      date: dateKey,
      url: video.playback_url,
      type: "video",
      thumbnail_url: thumbnail || undefined,
      image_url: thumbnail || undefined,
      reel_id: autoReel.reel_id ?? autoReel.reel?.id,
    });
  }
  return items;
}

function groupByWeek(items: MemoryItem[]): MemorySection[] {
  const ungrouped = [...items].sort(
    (a, b) =>
      parseMemoryDate(a.date).getTime() - parseMemoryDate(b.date).getTime(),
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

  const [activeTab, setActiveTab] = useState<MemoriesTab>("memories");

  const [list, setList] = useState<MemoryItem[]>([]);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [memoriesLoading, setMemoriesLoading] = useState(true);
  const [memoriesLoadingMore, setMemoriesLoadingMore] = useState(false);

  const [reelsList, setReelsList] = useState<MemoryItem[]>([]);
  const [reelsPage, setReelsPage] = useState(1);
  const [reelsHasMore, setReelsHasMore] = useState(false);
  const [reelsLoading, setReelsLoading] = useState(false);
  const [reelsLoadingMore, setReelsLoadingMore] = useState(false);
  const [reelsFetched, setReelsFetched] = useState(false);

  const memorySections = useMemo(() => groupByWeek(list), [list]);
  const reelSections = useMemo(() => groupByWeek(reelsList), [reelsList]);

  const sections = activeTab === "memories" ? memorySections : reelSections;
  const loading = activeTab === "memories" ? memoriesLoading : reelsLoading;
  const loadingMore =
    activeTab === "memories" ? memoriesLoadingMore : reelsLoadingMore;
  const hasInitialData =
    activeTab === "memories" ? list.length > 0 : reelsList.length > 0;

  const fetchMemories = useCallback(
    async (pageNum: number, append: boolean) => {
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
    },
    [],
  );

  const fetchReels = useCallback(async (pageNum: number, append: boolean) => {
    // Ready auto reels whose draft was deleted map to nothing; keep paging
    // so an all-skipped page doesn't leave the tab looking empty
    let page = pageNum;
    let { autoReels, meta } = await listAutoReels(
      page,
      "ready",
      AUTO_REELS_PER_PAGE,
      true,
    );
    let items = autoReelsToMemoryItems(autoReels);
    for (let extra = 0; items.length === 0 && meta.has_more && extra < 5; extra++) {
      page = (meta.current_page ?? page) + 1;
      ({ autoReels, meta } = await listAutoReels(
        page,
        "ready",
        AUTO_REELS_PER_PAGE,
        true,
      ));
      items = autoReelsToMemoryItems(autoReels);
    }
    setReelsHasMore(Boolean(meta.has_more));
    setReelsPage(meta.current_page ?? page);
    if (append) {
      setReelsList((prev) => {
        const seen = new Set(
          prev.map((i) => i.reel_id).filter((id): id is number => id != null),
        );
        const fresh = items.filter(
          (i) => i.reel_id == null || !seen.has(i.reel_id),
        );
        return [...prev, ...fresh];
      });
    } else {
      setReelsList(items);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setMemoriesLoading(true);
      try {
        await fetchMemories(1, false);
      } catch {
        if (!cancelled) setList([]);
      } finally {
        if (!cancelled) setMemoriesLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [fetchMemories]);

  useEffect(() => {
    if (activeTab !== "reels" || reelsFetched) return;
    let cancelled = false;
    (async () => {
      setReelsLoading(true);
      try {
        await fetchReels(1, false);
        if (!cancelled) setReelsFetched(true);
      } catch {
        if (!cancelled) {
          setReelsList([]);
          setReelsHasMore(false);
          setReelsFetched(true);
        }
      } finally {
        if (!cancelled) setReelsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeTab, reelsFetched, fetchReels]);

  const handleEndReached = useCallback(() => {
    if (loadingMore || loading) return;

    if (activeTab === "memories") {
      if (page >= lastPage) return;
      (async () => {
        setMemoriesLoadingMore(true);
        try {
          await fetchMemories(page + 1, true);
        } catch {
          // keep existing list
        } finally {
          setMemoriesLoadingMore(false);
        }
      })();
      return;
    }

    if (!reelsHasMore) return;
    (async () => {
      setReelsLoadingMore(true);
      try {
        await fetchReels(reelsPage + 1, true);
      } catch {
        // keep existing list
      } finally {
        setReelsLoadingMore(false);
      }
    })();
  }, [
    activeTab,
    loadingMore,
    loading,
    page,
    lastPage,
    reelsHasMore,
    reelsPage,
    fetchMemories,
    fetchReels,
  ]);

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
      const firstVideoThumb = item.items.find(
        (i) =>
          i.type === "video" && Boolean(i.thumbnail_url || i.image_url),
      );
      const coverUrl = firstImageItem
        ? (firstImageItem.url ?? firstImageItem.image_url ?? "")
        : (firstVideoThumb?.thumbnail_url ??
          firstVideoThumb?.image_url ??
          "");
      const hasOnlyVideos =
        item.items.length > 0 && !item.items.some((i) => i.type === "image");
      return (
        <TouchableOpacity
          style={styles.sectionCard}
          onPress={() => handleSectionPress(item)}
          activeOpacity={0.9}
        >
          <View style={styles.sectionCardImage}>
            {coverUrl ? (
              <MediaImage
                uri={coverUrl}
                style={styles.sectionCardImageInner}
                resizeMode="cover"
                placeholderIcon={hasOnlyVideos ? "videocam" : "photo-library"}
                iconSize={moderateWidthScale(48)}
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

  const listEmpty = useMemo(() => {
    if (loading || sections.length > 0) return null;
    if (activeTab === "reels") {
      return (
        <EmptyState
          icon="videocam"
          title={t("noReelsYet")}
          subtitle={t("memoriesReelsEmptySubtitle")}
          actionTitle={t("exploreAiTools")}
          onActionPress={() => router.back()}
        />
      );
    }
    return (
      <EmptyState
        icon="photo-library"
        title={t("noMemoriesFound")}
        subtitle={t("memoriesEmptySubtitle")}
        actionTitle={t("exploreAiTools")}
        onActionPress={() => router.back()}
      />
    );
  }, [loading, sections.length, activeTab, t, router]);

  const renderTabs = useCallback(
    () => (
      <View style={styles.tabsRow}>
        <TouchableOpacity
          style={[
            styles.tabButton,
            activeTab === "memories" && styles.tabButtonActive,
          ]}
          onPress={() => setActiveTab("memories")}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.tabButtonText,
              activeTab === "memories" && styles.tabButtonTextActive,
            ]}
          >
            {t("memories")}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tabButton,
            activeTab === "reels" && styles.tabButtonActive,
          ]}
          onPress={() => setActiveTab("reels")}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.tabButtonText,
              activeTab === "reels" && styles.tabButtonTextActive,
            ]}
          >
            {t("aiRequestsTabReels")}
          </Text>
        </TouchableOpacity>
      </View>
    ),
    [styles, activeTab, t],
  );

  const listHeader = useMemo(
    () => (
      <View>
        {renderTabs()}
        {sections.length > 0 ? (
          <Text style={styles.listHint}>{t("memoriesListHint")}</Text>
        ) : null}
      </View>
    ),
    [renderTabs, sections.length, styles.listHint, t],
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
      {loading && !hasInitialData ? (
        <View style={styles.loadingWithTabs}>
          {renderTabs()}
          <View style={styles.loadingSpinnerWrap}>
            <ActivityIndicator size="small" color={theme.primary} />
          </View>
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
