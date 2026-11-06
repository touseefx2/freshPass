import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  iconScale,
  moderateHeightScale,
  moderateWidthScale,
} from "@/src/theme/dimensions";
import StackHeader from "@/src/components/StackHeader";
import { useNotificationContext } from "@/src/contexts/NotificationContext";
import { resetToDashboardHome } from "@/src/utils/navigation";
import {
  myEnrollments,
  parseApiError,
} from "@/src/services/masterClassService";
import type {
  ClassEnrollment,
  ClassEnrollmentFilter,
} from "@/src/types/masterClass";
import {
  ClassStateView,
  IoniconName,
} from "@/src/components/masterClasses/parts";
import {
  MyClassesCard,
  MyClassesCardSkeleton,
  MyClassesFilterPills,
} from "@/src/components/masterClasses/myClassesList";

/**
 * Customer "My classes": every class seat they paid for, split into
 * Upcoming (confirmed) / Cancelled / Refunded. Each tab keeps its own
 * list so switching back shows it at once while it refreshes quietly.
 */

type TabState = {
  items: ClassEnrollment[];
  page: number;
  lastPage: number;
  loaded: boolean;
  loading: boolean;
  error: string | null;
  /** Something may have changed elsewhere — reload on next visit. */
  stale: boolean;
};

const FILTERS: ClassEnrollmentFilter[] = ["confirmed", "cancelled", "refunded"];

const emptyTab = (): TabState => ({
  items: [],
  page: 1,
  lastPage: 1,
  loaded: false,
  loading: false,
  error: null,
  stale: false,
});

const initialTabs = (): Record<ClassEnrollmentFilter, TabState> => ({
  confirmed: emptyTab(),
  cancelled: emptyTab(),
  refunded: emptyTab(),
});

const EMPTY_META: Record<
  ClassEnrollmentFilter,
  { icon: IoniconName; titleKey: string; textKey?: string }
> = {
  confirmed: {
    icon: "school-outline",
    titleKey: "mcEmptyMyClassesTitle",
    textKey: "mcEmptyMyClassesText",
  },
  cancelled: {
    icon: "close-circle-outline",
    titleKey: "mcEmptyMyCancelled",
    textKey: "mcEmptyMyCancelledText",
  },
  refunded: {
    icon: "return-down-back-outline",
    titleKey: "mcEmptyMyRefunded",
    textKey: "mcEmptyMyRefundedText",
  },
};

const SKELETON_KEYS = ["s1", "s2", "s3"];

export default function MyClassesScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);
  const insets = useSafeAreaInsets();
  const { showBanner } = useNotificationContext();

  const [filter, setFilter] = useState<ClassEnrollmentFilter>("confirmed");
  const [tabs, setTabs] = useState(initialTabs);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const tabsRef = useRef(tabs);
  tabsRef.current = tabs;
  const filterRef = useRef(filter);
  filterRef.current = filter;
  // Answers for an older request of the same tab are dropped
  const requestRef = useRef<Record<ClassEnrollmentFilter, number>>({
    confirmed: 0,
    cancelled: 0,
    refunded: 0,
  });
  const loadingMoreRef = useRef(false);
  const firstFocusRef = useRef(true);
  const listRef = useRef<FlatList<ClassEnrollment>>(null);
  // showBanner is a new function on every provider render; keep it out of deps
  const showBannerRef = useRef(showBanner);
  showBannerRef.current = showBanner;

  const patchTab = useCallback(
    (key: ClassEnrollmentFilter, patch: Partial<TabState>) => {
      setTabs((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }));
    },
    [],
  );

  const loadFirstPage = useCallback(
    async (key: ClassEnrollmentFilter, mode: "initial" | "refresh" | "silent") => {
      const request = ++requestRef.current[key];
      const hasItems = tabsRef.current[key].items.length > 0;
      if (mode === "refresh") setRefreshing(true);
      patchTab(key, {
        loading: mode === "initial" || (!hasItems && mode !== "refresh"),
        error: null,
        stale: false,
      });
      try {
        const { items, meta } = await myEnrollments(key, 1);
        if (request !== requestRef.current[key]) return;
        patchTab(key, {
          items,
          page: 1,
          lastPage: meta.last_page,
          loaded: true,
          loading: false,
          error: null,
        });
      } catch (err) {
        if (request !== requestRef.current[key]) return;
        const { message } = parseApiError(err, t("mcLoadError"));
        if (tabsRef.current[key].items.length > 0) {
          // Keep what is on screen; only a pull-to-refresh says it failed
          patchTab(key, { loading: false });
          if (mode === "refresh") {
            showBannerRef.current(t("mcLoadError"), message, "error");
          }
        } else {
          patchTab(key, { loading: false, loaded: true, error: message });
        }
      } finally {
        // Newest request clears it, whatever its mode: a silent focus load
        // may have overtaken a pull-to-refresh
        if (request === requestRef.current[key]) setRefreshing(false);
      }
    },
    [patchTab, t],
  );

  const loadMore = useCallback(async () => {
    const key = filterRef.current;
    const tab = tabsRef.current[key];
    if (
      loadingMoreRef.current ||
      tab.loading ||
      !tab.loaded ||
      tab.page >= tab.lastPage
    ) {
      return;
    }
    const request = requestRef.current[key];
    loadingMoreRef.current = true;
    setLoadingMore(true);
    try {
      const nextPage = tab.page + 1;
      const { items, meta } = await myEnrollments(key, nextPage);
      if (request !== requestRef.current[key]) return;
      setTabs((prev) => {
        const current = prev[key];
        const seen = new Set(current.items.map((e) => e.id));
        return {
          ...prev,
          [key]: {
            ...current,
            items: [...current.items, ...items.filter((e) => !seen.has(e.id))],
            page: nextPage,
            lastPage: meta.last_page,
          },
        };
      });
    } catch {
      // Keep what is loaded; scrolling again retries
    } finally {
      loadingMoreRef.current = false;
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    void loadFirstPage("confirmed", "initial");
  }, [loadFirstPage]);

  // Back from an enrollment (maybe cancelled there): every tab may differ now
  useFocusEffect(
    useCallback(() => {
      if (firstFocusRef.current) {
        firstFocusRef.current = false;
        return;
      }
      FILTERS.forEach((key) => {
        if (key !== filterRef.current) patchTab(key, { stale: true });
      });
      void loadFirstPage(filterRef.current, "silent");
    }, [loadFirstPage, patchTab]),
  );

  const onChangeFilter = useCallback(
    (next: ClassEnrollmentFilter) => {
      setFilter(next);
      setRefreshing(false);
      listRef.current?.scrollToOffset({ offset: 0, animated: false });
      const tab = tabsRef.current[next];
      if (!tab.loaded) void loadFirstPage(next, "initial");
      else if (tab.stale || tab.error) void loadFirstPage(next, "silent");
    },
    [loadFirstPage],
  );

  const openEnrollment = useCallback(
    (enrollment: ClassEnrollment) => {
      router.push({
        pathname: "/(main)/classes/enrollment",
        params: { id: String(enrollment.id) },
      } as any);
    },
    [router],
  );

  const tab = tabs[filter];
  const showSkeleton = tab.items.length === 0 && (tab.loading || !tab.loaded);

  const renderEmpty = () => {
    if (showSkeleton) {
      return (
        <View style={styles.skeletons}>
          {SKELETON_KEYS.map((key) => (
            <MyClassesCardSkeleton key={key} />
          ))}
        </View>
      );
    }
    if (tab.error) {
      return (
        <ClassStateView
          icon="cloud-offline-outline"
          title={t("mcLoadError")}
          message={tab.error !== t("mcLoadError") ? tab.error : undefined}
          actionLabel={t("retry")}
          actionIcon="refresh"
          onAction={() => void loadFirstPage(filter, "initial")}
        />
      );
    }
    const meta = EMPTY_META[filter];
    return (
      <ClassStateView
        icon={meta.icon}
        title={t(meta.titleKey)}
        message={meta.textKey ? t(meta.textKey) : undefined}
        actionLabel={filter === "confirmed" ? t("mcBrowseDeals") : undefined}
        actionIcon="pricetags-outline"
        onAction={filter === "confirmed" ? resetToDashboardHome : undefined}
      />
    );
  };

  return (
    <View style={styles.container}>
      <StackHeader title={t("mcMyClasses")} centerLogo />

      <View style={styles.top}>
        <View style={styles.titleRow}>
          <View style={styles.titleIcon}>
            <MaterialCommunityIcons
              name="school-outline"
              size={iconScale(22)}
              color={theme.darkGreen}
            />
          </View>
          <View style={styles.titleText}>
            <Text style={styles.title} accessibilityRole="header">
              {t("mcMyClasses")}
            </Text>
            <Text style={styles.subtitle}>{t("mcMyClassesSubtitle")}</Text>
          </View>
        </View>
        <MyClassesFilterPills value={filter} onChange={onChangeFilter} />
      </View>

      <FlatList
        ref={listRef}
        data={tab.items}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <MyClassesCard enrollment={item} onPress={openEnrollment} />
        )}
        contentContainerStyle={[
          styles.listContent,
          tab.items.length === 0 && styles.emptyContent,
          { paddingBottom: insets.bottom + moderateHeightScale(24) },
        ]}
        ListEmptyComponent={renderEmpty}
        ListFooterComponent={
          loadingMore ? (
            <View style={styles.footerLoader}>
              <ActivityIndicator size="small" color={theme.darkGreen} />
            </View>
          ) : null
        }
        onEndReached={() => void loadMore()}
        onEndReachedThreshold={0.4}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void loadFirstPage(filter, "refresh")}
            tintColor={theme.darkGreen}
            colors={[theme.darkGreen]}
          />
        }
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    top: {
      paddingHorizontal: moderateWidthScale(16),
      paddingTop: moderateHeightScale(16),
      paddingBottom: moderateHeightScale(12),
      gap: moderateHeightScale(14),
    },
    titleRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(12),
    },
    titleIcon: {
      width: moderateWidthScale(44),
      height: moderateWidthScale(44),
      borderRadius: moderateWidthScale(22),
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.orangeBrown015,
      borderWidth: 1,
      borderColor: theme.orangeBrown30,
    },
    titleText: {
      flex: 1,
      gap: moderateHeightScale(2),
    },
    title: {
      fontSize: fontSize.size22,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    subtitle: {
      fontSize: fontSize.size13,
      lineHeight: fontSize.size13 * 1.4,
      fontFamily: fonts.fontRegular,
      color: theme.textMuted,
    },
    listContent: {
      paddingHorizontal: moderateWidthScale(16),
      paddingTop: moderateHeightScale(4),
      gap: moderateHeightScale(12),
    },
    emptyContent: {
      flexGrow: 1,
    },
    skeletons: {
      gap: moderateHeightScale(12),
    },
    footerLoader: {
      paddingVertical: moderateHeightScale(16),
    },
  });
