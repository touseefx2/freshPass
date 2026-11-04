import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

  const load = useCallback(async (pageNumber: number) => {
    const request = ++requestRef.current;
    const removedAtStart = removedSinceReload.current;
    try {
      const result = await fetchFavoriteProducts({
        page: pageNumber,
        perPage: PAGE_SIZE,
      });
      if (request !== requestRef.current) return;
      setProducts((prev) => {
        if (pageNumber === 1) return result.products;
        const seen = new Set(prev.map((p) => p.id));
        return [...prev, ...result.products.filter((p) => !seen.has(p.id))];
      });
      if (pageNumber === 1) removedSinceReload.current -= removedAtStart;
      setPage(result.meta.current_page);
      setHasMore(result.meta.has_more);
      setError(false);
      loadedOnce.current = true;
    } catch (err) {
      if (isRequestCanceled(err) || request !== requestRef.current) return;
      Logger.error("Saved products load failed:", err);
      if (pageNumber === 1) setError(true);
    } finally {
      if (request === requestRef.current) {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    }
  }, []);

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
    // After removals, page N+1 would skip rows: start over from page 1
    void load(removedSinceReload.current > 0 ? 1 : page + 1);
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
            <ActivityIndicator style={styles.footerLoader} color={theme.darkGreen} />
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
