import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  View,
  useWindowDimensions,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import {
  moderateHeightScale,
  moderateWidthScale,
} from "@/src/theme/dimensions";
import StackHeader from "@/src/components/StackHeader";
import CartIconButton from "@/src/components/marketplace/CartIconButton";
import ProductGridCard from "@/src/components/marketplace/ProductGridCard";
import MarketplaceEmptyState from "@/src/components/marketplace/MarketplaceEmptyState";
import {
  openMarketplaceProduct,
  useQuickAddToCart,
} from "@/src/components/marketplace/detail/useQuickAddToCart";
import {
  fetchFavoriteProducts,
  subscribeToFavoriteChanges,
} from "@/src/services/marketplaceService";
import { isRequestCanceled } from "@/src/services/api";
import Logger from "@/src/services/logger";
import type { ShopProduct } from "@/src/types/shopProduct";

const PAGE_SIZE = 20;
const GUTTER = moderateWidthScale(20);
const GAP = moderateWidthScale(14);

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    listContent: {
      paddingHorizontal: GUTTER,
      paddingTop: moderateHeightScale(16),
    },
    emptyContent: {
      flexGrow: 1,
      justifyContent: "center",
    },
    row: {
      gap: GAP,
      marginBottom: GAP,
    },
    centered: {
      flex: 1,
      justifyContent: "center",
    },
    footerLoader: {
      paddingVertical: moderateHeightScale(16),
    },
  });

/** Customer's saved (hearted) Marketplace products, two per row. */
export default function SavedProductsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const cardWidth = Math.floor((width - GUTTER * 2 - GAP) / 2);
  const { addToCart, addingId } = useQuickAddToCart();

  const [products, setProducts] = useState<ShopProduct[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(false);
  const requestRef = useRef(0);
  const loadedOnce = useRef(false);
  // Cards unsaved since the last page-1 load shift the server's pages
  const removedSinceReload = useRef(0);

  /**
   * Reads pages fromPage..toPage. "replace" starts the list over (first load,
   * focus, pull to refresh); "append" adds the rows after the ones shown,
   * skipping any already there.
   */
  const load = useCallback(
    async (
      fromPage: number,
      toPage: number = fromPage,
      mode: "replace" | "append" = fromPage === 1 ? "replace" : "append",
    ) => {
      const request = ++requestRef.current;
      const removedAtStart = removedSinceReload.current;
      try {
        const rows: ShopProduct[] = [];
        let result = await fetchFavoriteProducts({
          page: fromPage,
          perPage: PAGE_SIZE,
        });
        rows.push(...result.products);
        for (
          let n = fromPage + 1;
          n <= toPage && result.meta.has_more;
          n += 1
        ) {
          if (request !== requestRef.current) return;
          result = await fetchFavoriteProducts({ page: n, perPage: PAGE_SIZE });
          rows.push(...result.products);
        }
        if (request !== requestRef.current) return;
        setProducts((prev) => {
          const base = mode === "replace" ? [] : prev;
          const seen = new Set(base.map((p) => p.id));
          const merged = [...base];
          rows.forEach((p) => {
            if (!seen.has(p.id)) {
              seen.add(p.id);
              merged.push(p);
            }
          });
          return merged;
        });
        // These pages were read after the unsaves, so the shift is accounted for
        removedSinceReload.current -= removedAtStart;
        setPage(result.meta.current_page);
        setHasMore(result.meta.has_more);
        setError(false);
        loadedOnce.current = true;
      } catch (err) {
        if (isRequestCanceled(err) || request !== requestRef.current) return;
        Logger.error("Saved products load failed:", err);
        if (mode === "replace") setError(true);
      } finally {
        if (request === requestRef.current) {
          setLoading(false);
          setRefreshing(false);
          setLoadingMore(false);
        }
      }
    },
    [],
  );

  // Re-read on focus: a heart may have changed on the product page
  useFocusEffect(
    useCallback(() => {
      void load(1);
    }, [load]),
  );

  // Unsaved anywhere → the card leaves this list at once
  useEffect(
    () =>
      subscribeToFavoriteChanges((id, isFavorite) => {
        if (!isFavorite) {
          removedSinceReload.current += 1;
          setProducts((prev) => prev.filter((p) => p.id !== id));
        }
      }),
    [],
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void load(1);
  }, [load]);

  const onEndReached = useCallback(() => {
    if (!hasMore || loadingMore || loading) return;
    setLoadingMore(true);
    // Each unsave moves later rows one place up, so page N+1 alone would skip
    // some. Step back only as many pages as the unsaves shifted (1 page per
    // PAGE_SIZE unsaves) and append — a few requests, never the whole list.
    const removed = removedSinceReload.current;
    const stepBack = removed > 0 ? Math.ceil(removed / PAGE_SIZE) : 0;
    void load(Math.max(1, page + 1 - stepBack), page + 1, "append");
  }, [hasMore, load, loading, loadingMore, page]);

  const browse = useCallback(() => {
    // Catalog copy outside the tab bar, so Back returns here
    router.push("/(main)/marketplace" as any);
  }, [router]);

  const renderItem = useCallback(
    ({ item }: { item: ShopProduct }) => (
      <ProductGridCard
        product={item}
        width={cardWidth}
        onPress={() => openMarketplaceProduct(router, item.id)}
        onAddToCart={() => void addToCart(item)}
        adding={addingId === item.id}
      />
    ),
    [addToCart, addingId, cardWidth, router],
  );

  const header = (
    <StackHeader
      title={t("mpSavedTitle")}
      showLine={false}
      rightIcon={<CartIconButton color={theme.white} />}
    />
  );

  if (loading && !loadedOnce.current) {
    return (
      <View style={styles.container}>
        {header}
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={theme.darkGreen} />
        </View>
      </View>
    );
  }

  if (error && products.length === 0) {
    return (
      <View style={styles.container}>
        {header}
        <View style={styles.centered}>
          <MarketplaceEmptyState
            icon="wifi-off"
            title={t("mpSavedLoadError")}
            actionLabel={t("retry")}
            onAction={() => {
              setLoading(true);
              void load(1);
            }}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {header}
      <FlatList
        data={products}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.row}
        renderItem={renderItem}
        ListEmptyComponent={
          <MarketplaceEmptyState
            icon="heart-outline"
            title={t("mpSavedEmptyTitle")}
            message={t("mpSavedEmptyMessage")}
            actionLabel={t("mpSavedBrowse")}
            onAction={browse}
          />
        }
        ListFooterComponent={
          loadingMore ? (
            <ActivityIndicator
              style={styles.footerLoader}
              color={theme.darkGreen}
            />
          ) : null
        }
        contentContainerStyle={[
          styles.listContent,
          products.length === 0 && styles.emptyContent,
          { paddingBottom: insets.bottom + moderateHeightScale(24) },
        ]}
        onEndReached={onEndReached}
        onEndReachedThreshold={0.4}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.darkGreen}
            colors={[theme.darkGreen]}
          />
        }
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}
