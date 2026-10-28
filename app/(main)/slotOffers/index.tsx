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
import { useFocusEffect, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { MaterialIcons } from "@expo/vector-icons";
import { useAppSelector, useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  moderateHeightScale,
  moderateWidthScale,
} from "@/src/theme/dimensions";
import StackHeader from "@/src/components/StackHeader";
import RetryButton from "@/src/components/retryButton";
import SlotOfferCard from "@/src/components/slotOffer/SlotOfferCard";
import Logger from "@/src/services/logger";
import { ApiService } from "@/src/services/api";
import { businessEndpoints } from "@/src/services/endpoints";
import { fetchSlotOffers } from "@/src/services/slotOfferService";
import type { SlotOffer } from "@/src/types/slotOffer";

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
    footerLoader: {
      paddingVertical: moderateHeightScale(16),
    },
  });

export default function SlotOffersListScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const router = useRouter();
  const storeCategories = useAppSelector(
    (state: any) => state.categories?.categories ?? [],
  ) as CategoryOption[];

  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [priceKey, setPriceKey] = useState("any");
  const [categories, setCategories] = useState<CategoryOption[]>(storeCategories);

  const [items, setItems] = useState<SlotOffer[]>([]);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(false);
  const requestIdRef = useRef(0);

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
        const { items: pageItems, meta } = await fetchSlotOffers({
          category_id: categoryId ?? undefined,
          min_price: price.min,
          max_price: price.max,
          page: nextPage,
        });
        if (requestId !== requestIdRef.current) return;
        setItems((prev) => {
          if (nextPage === 1) return pageItems;
          const seen = new Set(prev.map((i) => i.id));
          return [...prev, ...pageItems.filter((i) => !seen.has(i.id))];
        });
        setPage(meta.current_page ?? nextPage);
        setLastPage(meta.last_page ?? nextPage);
      } catch (err) {
        if (requestId !== requestIdRef.current) return;
        Logger.error("Failed to load slot offers:", err);
        if (nextPage === 1) setError(true);
      } finally {
        if (requestId === requestIdRef.current) {
          setLoading(false);
          setRefreshing(false);
          setLoadingMore(false);
        }
      }
    },
    [categoryId, price.max, price.min],
  );

  const didMount = useRef(false);

  useFocusEffect(
    useCallback(() => {
      if (!didMount.current) {
        didMount.current = true;
        load(1, "initial");
      } else {
        load(1, "silent");
      }
    }, [load]),
  );

  const handleRefresh = () => load(1, "refresh");
  const handleLoadMore = () => {
    if (!loadingMore && page < lastPage) load(page + 1, "more");
  };

  const renderItem = useCallback(
    ({ item }: { item: SlotOffer }) => <SlotOfferCard deal={item} />,
    [],
  );

  const renderEmpty = () => {
    if (loading) return null;
    if (error) return <RetryButton onPress={() => load(1, "initial")} />;
    return (
      <View style={styles.center}>
        <MaterialIcons
          name="local-offer"
          size={moderateWidthScale(48)}
          color={theme.lightGreen2}
        />
        <Text style={styles.emptyTitle}>{t("sdEmptyTitle")}</Text>
        <Text style={styles.emptySub}>{t("sdEmptySub")}</Text>
      </View>
    );
  };

  const renderHeader = () => (
    <View style={styles.filters}>
      {/* Category chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
      >
        <Text style={styles.filterLabel}>{t("sdCategory")}</Text>
        <TouchableOpacity
          style={[styles.chip, categoryId === null && styles.chipSelected]}
          onPress={() => setCategoryId(null)}
          activeOpacity={0.75}
        >
          <Text
            style={[
              styles.chipText,
              categoryId === null && styles.chipTextSelected,
            ]}
          >
            {t("sdAll")}
          </Text>
        </TouchableOpacity>
        {categories.map((cat) => (
          <TouchableOpacity
            key={cat.id}
            style={[
              styles.chip,
              categoryId === cat.id && styles.chipSelected,
            ]}
            onPress={() =>
              setCategoryId(categoryId === cat.id ? null : cat.id)
            }
            activeOpacity={0.75}
          >
            <Text
              style={[
                styles.chipText,
                categoryId === cat.id && styles.chipTextSelected,
              ]}
            >
              {cat.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Price chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
      >
        <Text style={styles.filterLabel}>{t("sdPrice")}</Text>
        {PRICE_OPTIONS.map((opt) => (
          <TouchableOpacity
            key={opt.key}
            style={[
              styles.chip,
              priceKey === opt.key && styles.chipSelected,
            ]}
            onPress={() => setPriceKey(opt.key)}
            activeOpacity={0.75}
          >
            <Text
              style={[
                styles.chipText,
                priceKey === opt.key && styles.chipTextSelected,
              ]}
            >
              {opt.key === "any" ? t("sdAnyPrice") : opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  return (
    <View style={styles.container}>
      <StackHeader title={t("sdLastMinuteDeals")} />
      {loading && items.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.darkGreen} />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={theme.darkGreen}
              colors={[theme.darkGreen]}
            />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.3}
          ListFooterComponent={
            loadingMore ? (
              <ActivityIndicator
                style={styles.footerLoader}
                color={theme.darkGreen}
              />
            ) : null
          }
        />
      )}
    </View>
  );
}
