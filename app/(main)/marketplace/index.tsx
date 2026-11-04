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
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useAppDispatch, useAppSelector, useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  heightScale,
  moderateHeightScale,
  moderateWidthScale,
} from "@/src/theme/dimensions";
import { useNotificationContext } from "@/src/contexts/NotificationContext";
import { setGuestModeModalVisible } from "@/src/state/slices/generalSlice";
import {
  fetchMarketplaceProducts,
  fetchProductCategories,
  subscribeToFavoriteChanges,
} from "@/src/services/marketplaceService";
import { addCartItem, getCartErrorMessage } from "@/src/services/cartService";
import { refreshCartBadgeCount } from "@/src/hooks/useMarketCart";
import { productHasVariants } from "@/src/utils/shopProductHelpers";
import { resetToDashboardHome } from "@/src/utils/navigation";
import type { ShopProduct } from "@/src/types/shopProduct";
import type {
  MarketplaceFilter,
  ProductCategory,
} from "@/src/types/marketplace";
import ProductGridCard from "@/src/components/marketplace/ProductGridCard";
import MarketplaceEmptyState from "@/src/components/marketplace/MarketplaceEmptyState";
import CatalogHeader from "@/src/components/marketplace/catalog/CatalogHeader";
import CatalogSearchBox from "@/src/components/marketplace/catalog/CatalogSearchBox";
import CategoryChips from "@/src/components/marketplace/catalog/CategoryChips";
import FilterPills from "@/src/components/marketplace/catalog/FilterPills";
import CatalogSkeletonGrid from "@/src/components/marketplace/catalog/CatalogSkeletonGrid";
import Logger from "@/src/services/logger";

const PER_PAGE = 20;
const SEARCH_DEBOUNCE_MS = 350;
const GUTTER = moderateWidthScale(16);
const GRID_GAP = moderateWidthScale(12);

type LoadStatus = "loading" | "ready" | "error";

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    searchWrap: {
      paddingHorizontal: GUTTER,
      paddingTop: moderateHeightScale(14),
      paddingBottom: moderateHeightScale(10),
    },
    listHeader: {
      gap: moderateHeightScale(14),
      paddingBottom: moderateHeightScale(16),
    },
    listContent: {
      paddingBottom: moderateHeightScale(32),
      flexGrow: 1,
    },
    row: {
      paddingHorizontal: GUTTER,
      gap: GRID_GAP,
    },
    rowSeparator: {
      height: GRID_GAP,
    },
    skeletonWrap: {
      paddingHorizontal: GUTTER,
    },
    footer: {
      paddingVertical: moderateHeightScale(20),
      alignItems: "center",
    },
    footerRetry: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(6),
      minHeight: heightScale(44),
      paddingHorizontal: moderateWidthScale(18),
      borderRadius: moderateWidthScale(22),
      borderWidth: 1,
      borderColor: theme.lightGreen2,
      backgroundColor: theme.white,
    },
    footerRetryText: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
    },
  });

export default function MarketplaceCatalogScreen() {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();
  const { showBanner } = useNotificationContext();
  const isGuest = useAppSelector((s) => s.user.isGuest);
  const { width: screenWidth } = useWindowDimensions();
  const cardWidth = Math.floor((screenWidth - GUTTER * 2 - GRID_GAP) / 2);

  // ── Query ──────────────────────────────────────────────────────────
  const [searchText, setSearchText] = useState("");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  // Opens on Featured (client sample). That default steps aside when nothing
  // is featured yet, or once the customer searches / picks a category.
  const [filter, setFilter] = useState<MarketplaceFilter | null>("featured");
  const autoFeaturedRef = useRef(true);
  const chooseFilter = useCallback((next: MarketplaceFilter | null) => {
    autoFeaturedRef.current = false;
    setFilter(next);
  }, []);
  const hasQuery = search.trim() !== "" || category != null || filter != null;

  useEffect(() => {
    if (autoFeaturedRef.current && (search !== "" || category != null)) {
      autoFeaturedRef.current = false;
      setFilter(null);
    }
  }, [search, category]);

  useEffect(() => {
    const next = searchText.trim();
    if (next === search) return;
    const timer = setTimeout(() => setSearch(next), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchText, search]);

  // ── Categories ─────────────────────────────────────────────────────
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);

  const loadCategories = useCallback(async () => {
    try {
      setCategories(await fetchProductCategories({ inMarketplace: true }));
    } catch (error) {
      // Chips fall back to "All" only; the grid still works
      Logger.error("Marketplace categories failed:", error);
    } finally {
      setCategoriesLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCategories();
  }, [loadCategories]);

  // ── Products ───────────────────────────────────────────────────────
  const [products, setProducts] = useState<ShopProduct[]>([]);
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadMoreFailed, setLoadMoreFailed] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Latest query wins: responses for an older query are dropped
  const requestIdRef = useRef(0);
  const pageRef = useRef(1);
  const loadingMoreRef = useRef(false);
  const productCountRef = useRef(0);
  productCountRef.current = products.length;

  const loadFirstPage = useCallback(
    async (mode: "initial" | "refresh") => {
      const requestId = ++requestIdRef.current;
      loadingMoreRef.current = false;
      setLoadingMore(false);
      setLoadMoreFailed(false);
      if (mode === "initial") setStatus("loading");
      try {
        const { products: rows, meta } = await fetchMarketplaceProducts({
          search,
          category: category ?? undefined,
          filter: filter ?? undefined,
          page: 1,
          perPage: PER_PAGE,
        });
        if (requestId !== requestIdRef.current) return;
        if (
          rows.length === 0 &&
          autoFeaturedRef.current &&
          filter === "featured"
        ) {
          // Nothing featured yet → show every product instead
          autoFeaturedRef.current = false;
          setFilter(null);
          return;
        }
        pageRef.current = 1;
        setProducts(rows);
        setHasMore(meta.has_more);
        setStatus("ready");
      } catch (error) {
        if (requestId !== requestIdRef.current) return;
        Logger.error("Marketplace products failed:", error);
        if (mode === "refresh" && productCountRef.current > 0) {
          showBanner(t("somethingWentWrong"), t("mpCatLoadError"), "error");
        } else {
          setStatus("error");
        }
      } finally {
        if (requestId === requestIdRef.current) setRefreshing(false);
      }
    },
    [search, category, filter, showBanner, t],
  );

  useEffect(() => {
    void loadFirstPage("initial");
  }, [loadFirstPage]);

  /** `retry` = footer button after a failed page (scrolling alone won't re-ask). */
  const loadNextPage = useCallback(
    async (retry = false) => {
      if (
        status !== "ready" ||
        !hasMore ||
        loadingMoreRef.current ||
        (loadMoreFailed && !retry)
      ) {
        return;
      }
      const requestId = requestIdRef.current;
      const nextPage = pageRef.current + 1;
      loadingMoreRef.current = true;
      setLoadMoreFailed(false);
      setLoadingMore(true);
      try {
        const { products: rows, meta } = await fetchMarketplaceProducts({
          search,
          category: category ?? undefined,
          filter: filter ?? undefined,
          page: nextPage,
          perPage: PER_PAGE,
        });
        if (requestId !== requestIdRef.current) return;
        pageRef.current = nextPage;
        setProducts((prev) => {
          const seen = new Set(prev.map((p) => p.id));
          return [...prev, ...rows.filter((p) => !seen.has(p.id))];
        });
        setHasMore(meta.has_more);
      } catch (error) {
        if (requestId !== requestIdRef.current) return;
        Logger.error("Marketplace next page failed:", error);
        setLoadMoreFailed(true);
      } finally {
        if (requestId === requestIdRef.current) {
          loadingMoreRef.current = false;
          setLoadingMore(false);
        }
      }
    },
    [status, hasMore, loadMoreFailed, search, category, filter],
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void loadCategories();
    if (!isGuest) refreshCartBadgeCount(true);
    void loadFirstPage("refresh");
  }, [isGuest, loadCategories, loadFirstPage]);

  // Heart toggled here, on the product page or in Saved → keep cards in sync
  useEffect(
    () =>
      subscribeToFavoriteChanges((productId, isFavorite) => {
        setProducts((prev) =>
          prev.some((p) => p.id === productId && p.isFavorite !== isFavorite)
            ? prev.map((p) => (p.id === productId ? { ...p, isFavorite } : p))
            : prev,
        );
      }),
    [],
  );

  // ── Actions ────────────────────────────────────────────────────────
  const openProduct = useCallback(
    (product: ShopProduct) => {
      router.push({
        pathname: "/(main)/marketplace/product",
        params: { productId: String(product.id) },
      } as any);
    },
    [router],
  );

  const [addingIds, setAddingIds] = useState<Record<string, boolean>>({});
  const addingRef = useRef<Set<string>>(new Set());

  const addToCart = useCallback(
    async (product: ShopProduct) => {
      if (isGuest) {
        dispatch(setGuestModeModalVisible(true));
        return;
      }
      // An option must be picked first — that happens on the product page
      if (productHasVariants(product)) {
        openProduct(product);
        return;
      }
      const id = String(product.id);
      if (addingRef.current.has(id)) return;
      addingRef.current.add(id);
      setAddingIds((prev) => ({ ...prev, [id]: true }));
      try {
        await addCartItem({ productId: product.id });
        showBanner(
          t("addedToCart"),
          t("mpCatAddedToCartMessage", { name: product.name }),
          "success",
        );
      } catch (error) {
        showBanner(
          t("mpCatAddToCartFailed"),
          getCartErrorMessage(error) ?? t("somethingWentWrong"),
          "error",
        );
      } finally {
        addingRef.current.delete(id);
        setAddingIds((prev) => {
          const next = { ...prev };
          delete next[id];
          return next;
        });
      }
    },
    [dispatch, isGuest, openProduct, showBanner, t],
  );

  const goBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      resetToDashboardHome();
    }
  }, [router]);

  const clearFilters = useCallback(() => {
    setSearchText("");
    setSearch("");
    setCategory(null);
    autoFeaturedRef.current = false;
    setFilter(null);
  }, []);

  // ── Render ─────────────────────────────────────────────────────────
  const RowSeparator = useMemo(
    () =>
      function Separator() {
        return <View style={styles.rowSeparator} />;
      },
    [styles],
  );

  const renderItem = useCallback(
    ({ item }: { item: ShopProduct }) => (
      <ProductGridCard
        product={item}
        width={cardWidth}
        onPress={() => openProduct(item)}
        onAddToCart={() => void addToCart(item)}
        adding={!!addingIds[String(item.id)]}
      />
    ),
    [addToCart, addingIds, cardWidth, openProduct],
  );

  const listHeader = (
    <View style={styles.listHeader}>
      <CategoryChips
        categories={categories}
        selected={category}
        onSelect={setCategory}
        loading={categoriesLoading}
      />
      <FilterPills selected={filter} onSelect={chooseFilter} />
    </View>
  );

  const renderEmpty = () => {
    if (status === "loading") {
      return (
        <View style={styles.skeletonWrap}>
          <CatalogSkeletonGrid cardWidth={cardWidth} gap={GRID_GAP} />
        </View>
      );
    }
    if (status === "error") {
      return (
        <MarketplaceEmptyState
          icon="wifi-off"
          title={t("somethingWentWrong")}
          message={t("mpCatLoadError")}
          actionLabel={t("retry")}
          onAction={() => void loadFirstPage("initial")}
        />
      );
    }
    if (hasQuery) {
      return (
        <MarketplaceEmptyState
          icon="shopping-search"
          title={t("mpCatNoProductsTitle")}
          message={t("mpCatNoProductsMessage")}
          actionLabel={t("clearFilters")}
          onAction={clearFilters}
        />
      );
    }
    return (
      <MarketplaceEmptyState
        icon="storefront-outline"
        title={t("mpCatEmptyTitle")}
        message={t("mpCatEmptyMessage")}
      />
    );
  };

  const renderFooter = () => {
    if (status !== "ready" || products.length === 0) return null;
    if (loadingMore) {
      return (
        <View style={styles.footer}>
          <ActivityIndicator color={theme.darkGreen} />
        </View>
      );
    }
    if (loadMoreFailed) {
      return (
        <View style={styles.footer}>
          <TouchableOpacity
            activeOpacity={0.75}
            onPress={() => void loadNextPage(true)}
            style={styles.footerRetry}
            accessibilityRole="button"
            accessibilityLabel={t("mpCatLoadMoreRetry")}
          >
            <MaterialCommunityIcons
              name="refresh"
              size={moderateWidthScale(18)}
              color={theme.darkGreen}
            />
            <Text style={styles.footerRetryText}>
              {t("mpCatLoadMoreRetry")}
            </Text>
          </TouchableOpacity>
        </View>
      );
    }
    return null;
  };

  return (
    <View style={styles.container}>
      <CatalogHeader
        title={t("mpCatTitle")}
        onBack={goBack}
      />

      <View style={styles.searchWrap}>
        <CatalogSearchBox
          value={searchText}
          onChangeText={setSearchText}
          onClear={() => {
            setSearchText("");
            setSearch("");
          }}
        />
      </View>

      <FlatList
        data={status === "ready" ? products : []}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        numColumns={2}
        columnWrapperStyle={styles.row}
        ItemSeparatorComponent={RowSeparator}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={renderEmpty()}
        ListFooterComponent={renderFooter()}
        contentContainerStyle={[
          styles.listContent,
          // Main stack, no tab bar: keep the last row clear of the home bar
          { paddingBottom: moderateHeightScale(32) + insets.bottom },
        ]}
        onEndReached={() => void loadNextPage()}
        onEndReachedThreshold={0.5}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.darkGreen}
            colors={[theme.darkGreen]}
          />
        }
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
        initialNumToRender={6}
        windowSize={7}
        removeClippedSubviews={false}
      />
    </View>
  );
}
