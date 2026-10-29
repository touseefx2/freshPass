import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { useAppSelector, useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  moderateHeightScale,
  moderateWidthScale,
} from "@/src/theme/dimensions";
import StackHeader from "@/src/components/StackHeader";
import AskLocationOnce from "@/src/components/AskLocationOnce";
import RetryButton from "@/src/components/retryButton";
import AvailableNowCard, {
  bookAvailableNow,
  openAvailableNowProfile,
} from "@/src/components/availableNow/AvailableNowCard";
import Logger from "@/src/services/logger";
import { ApiService } from "@/src/services/api";
import { businessEndpoints } from "@/src/services/endpoints";
import { fetchAvailableNow } from "@/src/services/availableNowService";
import type { AvailableNowListItem } from "@/src/types/availableNow";

/** "Now" = free right now, "Next hour" = 60, "Today" = 1440 */
const TIME_OPTIONS = [
  { minutes: 0, labelKey: "anTimeNow" },
  { minutes: 60, labelKey: "anTimeNextHour" },
  { minutes: 1440, labelKey: "anTimeToday" },
] as const;

const RADIUS_OPTIONS = [5, 10, 25, 50, 100];
const DEFAULT_RADIUS = 25;

const PRICE_OPTIONS: { key: string; min?: number; max?: number; label: string }[] = [
  { key: "any", label: "" },
  { key: "u25", max: 25, label: "$0–25" },
  { key: "25-50", min: 25, max: 50, label: "$25–50" },
  { key: "50-100", min: 50, max: 100, label: "$50–100" },
  { key: "100+", min: 100, label: "$100+" },
];

type CategoryOption = { id: number; name: string };

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    filters: {
      paddingTop: moderateHeightScale(12),
      paddingBottom: moderateHeightScale(4),
      gap: moderateHeightScale(10),
    },
    filterRow: {
      paddingHorizontal: moderateWidthScale(16),
      gap: moderateWidthScale(8),
      alignItems: "center",
    },
    filterLabel: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontBold,
      color: theme.lightGreen5,
      marginRight: moderateWidthScale(2),
    },
    segment: {
      flexDirection: "row",
      marginHorizontal: moderateWidthScale(16),
      padding: moderateWidthScale(4),
      borderRadius: moderateWidthScale(12),
      backgroundColor: theme.lightGreen05,
      borderWidth: 1,
      borderColor: theme.lightGreen015,
    },
    segmentItem: {
      flex: 1,
      alignItems: "center",
      paddingVertical: moderateHeightScale(8),
      borderRadius: moderateWidthScale(9),
    },
    segmentItemActive: {
      backgroundColor: theme.darkGreen,
    },
    segmentText: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
    },
    segmentTextActive: {
      color: theme.white,
      fontFamily: fonts.fontBold,
    },
    chip: {
      paddingHorizontal: moderateWidthScale(14),
      paddingVertical: moderateHeightScale(7),
      borderRadius: moderateWidthScale(18),
      borderWidth: 1,
      borderColor: theme.lightGreen2,
      backgroundColor: theme.white,
    },
    chipSelected: {
      backgroundColor: theme.darkGreen,
      borderColor: theme.darkGreen,
    },
    chipText: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
    },
    chipTextSelected: {
      color: theme.white,
    },
    locationHint: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(6),
      marginHorizontal: moderateWidthScale(16),
    },
    locationHintText: {
      flex: 1,
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen5,
    },
    listContent: {
      paddingHorizontal: moderateWidthScale(16),
      paddingTop: moderateHeightScale(12),
      paddingBottom: moderateHeightScale(32),
      gap: moderateHeightScale(10),
      flexGrow: 1,
    },
    center: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: moderateHeightScale(40),
      paddingHorizontal: moderateWidthScale(24),
      gap: moderateHeightScale(10),
    },
    emptyTitle: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      textAlign: "center",
    },
    emptySub: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen5,
      textAlign: "center",
      lineHeight: fontSize.size18,
    },
    widenRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "center",
      gap: moderateWidthScale(8),
      marginTop: moderateHeightScale(6),
    },
    widenBtn: {
      paddingHorizontal: moderateWidthScale(16),
      paddingVertical: moderateHeightScale(9),
      borderRadius: moderateWidthScale(10),
      backgroundColor: theme.buttonBack,
    },
    widenText: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontBold,
      color: theme.buttonText,
    },
    footerLoader: {
      paddingVertical: moderateHeightScale(16),
    },
  });

/** Customer Available Now: pros free now (or soon), with category / distance / price / time filters. */
export default function AvailableNowScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const router = useRouter();
  const params = useLocalSearchParams<{ within_minutes?: string }>();
  const user = useAppSelector((state) => state.user);
  const storeCategories = useAppSelector(
    (state: any) => state.categories?.categories ?? [],
  ) as CategoryOption[];

  const coords = useMemo(() => {
    const lat = user.location?.lat;
    const lng = user.location?.long;
    if (lat == null || lng == null) return null;
    return { latitude: Number(lat), longitude: Number(lng) };
  }, [user.location?.lat, user.location?.long]);

  const initialWithin = Number(params.within_minutes);
  const [withinMinutes, setWithinMinutes] = useState<number>(
    TIME_OPTIONS.some((o) => o.minutes === initialWithin) ? initialWithin : 0,
  );
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [radiusKm, setRadiusKm] = useState(DEFAULT_RADIUS);
  const [priceKey, setPriceKey] = useState("any");
  const [categories, setCategories] = useState<CategoryOption[]>(storeCategories);

  const [items, setItems] = useState<AvailableNowListItem[]>([]);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(false);
  const requestIdRef = useRef(0);

  // Home usually loaded these already; fetch when opened cold
  useEffect(() => {
    if (storeCategories.length > 0) {
      setCategories(storeCategories);
      return;
    }
    let active = true;
    ApiService.get<{ success: boolean; data: { id: number; name: string }[] }>(
      businessEndpoints.categories,
    )
      .then((res) => {
        if (active && Array.isArray(res?.data)) {
          setCategories(res.data.map((c) => ({ id: c.id, name: c.name })));
        }
      })
      .catch((err) => Logger.error("Failed to load categories:", err));
    return () => {
      active = false;
    };
  }, [storeCategories]);

  const price = PRICE_OPTIONS.find((p) => p.key === priceKey) ?? PRICE_OPTIONS[0];

  const load = useCallback(
    async (
      nextPage: number,
      mode: "initial" | "refresh" | "more" | "silent",
    ) => {
      const requestId = ++requestIdRef.current;
      if (mode === "initial") setLoading(true);
      if (mode === "refresh") setRefreshing(true);
      if (mode === "more") setLoadingMore(true);
      setError(false);
      try {
        const { items: pageItems, meta } = await fetchAvailableNow({
          category_id: categoryId,
          latitude: coords?.latitude,
          longitude: coords?.longitude,
          radius_km: coords ? radiusKm : undefined,
          min_price: price.min,
          max_price: price.max,
          within_minutes: withinMinutes,
          page: nextPage,
        });
        if (requestId !== requestIdRef.current) return;
        setItems((prev) => {
          if (nextPage === 1) return pageItems;
          // Same pro can't repeat across pages, but the list is live — dedupe anyway
          const seen = new Set(
            prev.map((i) => `${i.business.id}:${i.professional?.user_id}`),
          );
          return [
            ...prev,
            ...pageItems.filter(
              (i) => !seen.has(`${i.business.id}:${i.professional?.user_id}`),
            ),
          ];
        });
        setPage(meta.current_page ?? nextPage);
        setLastPage(meta.last_page ?? nextPage);
      } catch (err) {
        if (requestId !== requestIdRef.current) return;
        Logger.error("Failed to load Available Now list:", err);
        if (nextPage === 1) setError(true);
      } finally {
        if (requestId === requestIdRef.current) {
          setLoading(false);
          setRefreshing(false);
          setLoadingMore(false);
        }
      }
    },
    [categoryId, coords, price.max, price.min, radiusKm, withinMinutes],
  );

  // Live list: re-fetch on focus (quietly) and whenever a filter changes (with loader)
  const filterKey = [
    categoryId,
    priceKey,
    withinMinutes,
    coords ? `${coords.latitude},${coords.longitude},${radiusKm}` : "none",
  ].join("|");
  const lastFilterKeyRef = useRef<string | null>(null);
  useFocusEffect(
    useCallback(() => {
      const changed = lastFilterKeyRef.current !== filterKey;
      lastFilterKeyRef.current = filterKey;
      load(1, changed ? "initial" : "silent");
    }, [filterKey, load]),
  );

  const loadMore = () => {
    if (loading || loadingMore || refreshing || page >= lastPage) return;
    load(page + 1, "more");
  };

  const renderChip = (
    key: string,
    label: string,
    selected: boolean,
    onPress: () => void,
  ) => (
    <TouchableOpacity
      key={key}
      style={[styles.chip, selected && styles.chipSelected]}
      onPress={onPress}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityState={{ selected }}
    >
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  const widenOptions: { key: string; label: string; onPress: () => void }[] = [];
  if (withinMinutes < 60) {
    widenOptions.push({
      key: "hour",
      label: t("anWidenNextHour"),
      onPress: () => setWithinMinutes(60),
    });
  } else if (withinMinutes < 1440) {
    widenOptions.push({
      key: "today",
      label: t("anWidenToday"),
      onPress: () => setWithinMinutes(1440),
    });
  }
  if (coords && radiusKm < 100) {
    const wider = RADIUS_OPTIONS.find((r) => r > radiusKm) ?? 100;
    widenOptions.push({
      key: "radius",
      label: t("anWidenRadius", { km: wider }),
      onPress: () => setRadiusKm(wider),
    });
  }
  if (categoryId != null || priceKey !== "any") {
    widenOptions.push({
      key: "clear",
      label: t("anClearFilters"),
      onPress: () => {
        setCategoryId(null);
        setPriceKey("any");
      },
    });
  }

  const renderEmpty = () => {
    if (loading) {
      return (
        <View style={styles.center}>
          <ActivityIndicator color={theme.darkGreen} />
        </View>
      );
    }
    if (error) {
      return (
        <View style={styles.center}>
          <Text style={styles.emptySub}>{t("anListError")}</Text>
          <RetryButton onPress={() => load(1, "initial")} loading={loading} />
        </View>
      );
    }
    return (
      <View style={styles.center}>
        <MaterialIcons
          name="event-busy"
          size={moderateWidthScale(36)}
          color={theme.lightGreen}
        />
        <Text style={styles.emptyTitle}>
          {withinMinutes === 0 ? t("anEmptyTitle") : t("anEmptyTitleLater")}
        </Text>
        <Text style={styles.emptySub}>{t("anEmptySub")}</Text>
        {widenOptions.length > 0 ? (
          <View style={styles.widenRow}>
            {widenOptions.map((opt) => (
              <TouchableOpacity
                key={opt.key}
                style={styles.widenBtn}
                onPress={opt.onPress}
                activeOpacity={0.85}
              >
                <Text style={styles.widenText}>{opt.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : null}
      </View>
    );
  };

  return (
    <SafeAreaView edges={["bottom"]} style={styles.container}>
      <StackHeader title={t("availableNow")} />

      <View style={styles.filters}>
        <View style={styles.segment}>
          {TIME_OPTIONS.map((opt) => {
            const active = withinMinutes === opt.minutes;
            return (
              <TouchableOpacity
                key={opt.minutes}
                style={[styles.segmentItem, active && styles.segmentItemActive]}
                onPress={() => setWithinMinutes(opt.minutes)}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
              >
                <Text
                  style={[styles.segmentText, active && styles.segmentTextActive]}
                >
                  {t(opt.labelKey)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {categories.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterRow}
          >
            {renderChip("all", t("anAllCategories"), categoryId == null, () =>
              setCategoryId(null),
            )}
            {categories.map((c) =>
              renderChip(String(c.id), c.name, categoryId === c.id, () =>
                setCategoryId(c.id),
              ),
            )}
          </ScrollView>
        ) : null}

        {coords ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterRow}
          >
            <Text style={styles.filterLabel}>{t("anDistance")}</Text>
            {RADIUS_OPTIONS.map((km) =>
              renderChip(String(km), `${km} km`, radiusKm === km, () =>
                setRadiusKm(km),
              ),
            )}
          </ScrollView>
        ) : (
          <View style={styles.locationHint}>
            <MaterialIcons
              name="location-off"
              size={moderateWidthScale(16)}
              color={theme.lightGreen5}
            />
            <Text style={styles.locationHintText}>{t("anNoLocationHint")}</Text>
          </View>
        )}

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          <Text style={styles.filterLabel}>{t("anPrice")}</Text>
          {PRICE_OPTIONS.map((p) =>
            renderChip(
              p.key,
              p.key === "any" ? t("anAnyPrice") : p.label,
              priceKey === p.key,
              () => setPriceKey(p.key),
            ),
          )}
        </ScrollView>
      </View>

      <FlatList
        data={loading ? [] : items}
        keyExtractor={(item) =>
          `${item.business.id}:${item.professional?.user_id ?? "biz"}`
        }
        renderItem={({ item }) => (
          <AvailableNowCard
            item={item}
            onPress={(i) => openAvailableNowProfile(router, i)}
            onBook={(i) => bookAvailableNow(router, i)}
          />
        )}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={renderEmpty}
        ListFooterComponent={
          loadingMore ? (
            <ActivityIndicator
              color={theme.darkGreen}
              style={styles.footerLoader}
            />
          ) : null
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.4}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => load(1, "refresh")}
            tintColor={theme.darkGreen}
          />
        }
        showsVerticalScrollIndicator={false}
      />
      <AskLocationOnce feature="availableNow" />
    </SafeAreaView>
  );
}
