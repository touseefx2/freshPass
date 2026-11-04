import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  heightScale,
  moderateHeightScale,
  moderateWidthScale,
} from "@/src/theme/dimensions";
import StackHeader from "@/src/components/StackHeader";
import { FlowCard } from "@/src/components/reelFlow/flowParts";
import MarketplaceEmptyState from "@/src/components/marketplace/MarketplaceEmptyState";
import ReviewSummary from "@/src/components/marketplace/detail/ReviewSummary";
import ReviewCard from "@/src/components/marketplace/detail/ReviewCard";
import { useNotificationContext } from "@/src/contexts/NotificationContext";
import {
  deleteProductReview,
  fetchProductReviews,
} from "@/src/services/marketplaceService";
import { isRequestCanceled } from "@/src/services/api";
import Logger from "@/src/services/logger";
import type { ProductReview, ProductReviewsPage } from "@/src/types/marketplace";

const PAGE_SIZE = 20;

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    listContent: {
      paddingHorizontal: moderateWidthScale(20),
      paddingTop: moderateHeightScale(16),
      gap: moderateHeightScale(12),
    },
    headerBlock: {
      gap: moderateHeightScale(14),
      marginBottom: moderateHeightScale(2),
    },
    productName: {
      fontSize: fontSize.size20,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    summaryCard: {
      padding: moderateWidthScale(16),
    },
    writeBtn: {
      minHeight: heightScale(48),
      borderRadius: moderateWidthScale(14),
      backgroundColor: theme.darkGreen,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: moderateWidthScale(8),
    },
    writeBtnText: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontBold,
      color: theme.white,
    },
    sectionTitle: {
      fontSize: fontSize.size17,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      marginTop: moderateHeightScale(4),
    },
    centered: {
      flex: 1,
      justifyContent: "center",
    },
    footerLoader: {
      paddingVertical: moderateHeightScale(16),
    },
  });

/** All reviews of a product: summary with 5…1 bars, own review first, paged list. */
export default function MarketplaceReviewsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const insets = useSafeAreaInsets();
  const { showBanner } = useNotificationContext();
  const { productId, productName } = useLocalSearchParams<{
    productId?: string;
    productName?: string;
  }>();

  const [page, setPage] = useState<ProductReviewsPage | null>(null);
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(false);
  const [deleting, setDeleting] = useState(false);
  // Answers for an older load are dropped
  const requestRef = useRef(0);

  const load = useCallback(
    async (pageNumber: number) => {
      if (!productId) {
        setLoading(false);
        setError(true);
        return;
      }
      const request = ++requestRef.current;
      try {
        const next = await fetchProductReviews(productId, {
          page: pageNumber,
          perPage: PAGE_SIZE,
        });
        if (request !== requestRef.current) return;
        setPage(next);
        // Own review has its own card at the top
        const rows = next.reviews.filter((r) => !r.isMine);
        setReviews((prev) => {
          if (pageNumber === 1) return rows;
          const seen = new Set(prev.map((r) => r.id));
          return [...prev, ...rows.filter((r) => !seen.has(r.id))];
        });
        setError(false);
      } catch (err) {
        if (isRequestCanceled(err) || request !== requestRef.current) return;
        Logger.error("Marketplace reviews load failed:", err);
        if (pageNumber === 1) setError(true);
      } finally {
        if (request === requestRef.current) {
          setLoading(false);
          setLoadingMore(false);
          setRefreshing(false);
        }
      }
    },
    [productId],
  );

  // Fresh after writing / editing a review
  useFocusEffect(
    useCallback(() => {
      void load(1);
    }, [load]),
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void load(1);
  }, [load]);

  const onEndReached = useCallback(() => {
    if (!page?.meta.has_more || loadingMore || loading) return;
    setLoadingMore(true);
    void load(page.meta.current_page + 1);
  }, [load, loading, loadingMore, page]);

  const openWrite = useCallback(() => {
    if (!productId) return;
    router.push({
      pathname: "/(main)/marketplace/writeReview",
      params: { productId, productName: productName ?? "" },
    } as any);
  }, [productId, productName, router]);

  const confirmDelete = useCallback(() => {
    if (!productId || deleting) return;
    Alert.alert(t("mpRevDeleteTitle"), t("mpRevDeleteMessage"), [
      { text: t("cancel"), style: "cancel" },
      {
        text: t("delete"),
        style: "destructive",
        onPress: async () => {
          setDeleting(true);
          try {
            await deleteProductReview(productId);
            showBanner(t("mpRevDeleted"), t("mpRevDeletedMessage"), "success");
            await load(1);
          } catch (err: any) {
            if (!isRequestCanceled(err)) {
              showBanner(
                t("mpRevDeleteFailed"),
                err?.data?.message || err?.message || t("somethingWentWrong"),
                "error",
              );
            }
          } finally {
            setDeleting(false);
          }
        },
      },
    ]);
  }, [deleting, load, productId, showBanner, t]);

  const myReview = page?.myReview ?? null;
  const canWrite = !!page?.canReview && !myReview;

  const listHeader = page ? (
    <View style={styles.headerBlock}>
      {productName ? (
        <Text style={styles.productName} numberOfLines={2}>
          {productName}
        </Text>
      ) : null}
      <FlowCard style={styles.summaryCard}>
        <ReviewSummary summary={page.summary} showBreakdown />
      </FlowCard>
      {canWrite ? (
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={openWrite}
          style={styles.writeBtn}
          accessibilityRole="button"
        >
          <MaterialIcons
            name="rate-review"
            size={moderateWidthScale(20)}
            color={theme.white}
          />
          <Text style={styles.writeBtnText}>{t("writeAReview")}</Text>
        </TouchableOpacity>
      ) : null}
      {myReview ? (
        <ReviewCard
          review={{ ...myReview, isMine: true }}
          onEdit={openWrite}
          onDelete={confirmDelete}
          deleting={deleting}
        />
      ) : null}
      {reviews.length > 0 ? (
        <Text style={styles.sectionTitle} accessibilityRole="header">
          {myReview ? t("mpRevOtherReviews") : t("mpRevAllReviews")}
        </Text>
      ) : null}
    </View>
  ) : null;

  const header = <StackHeader title={t("reviews")} showLine={false} />;

  if (loading && !page) {
    return (
      <View style={styles.container}>
        {header}
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={theme.darkGreen} />
        </View>
      </View>
    );
  }

  if (error && !page) {
    return (
      <View style={styles.container}>
        {header}
        <View style={styles.centered}>
          <MarketplaceEmptyState
            icon="wifi-off"
            title={t("mpRevLoadError")}
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
        data={reviews}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => <ReviewCard review={item} />}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={
          myReview ? null : (
            <MarketplaceEmptyState
              icon="star-outline"
              title={t("noReviewsYet")}
              message={t("mpRevEmptyMessage")}
            />
          )
        }
        ListFooterComponent={
          loadingMore ? (
            <ActivityIndicator style={styles.footerLoader} color={theme.darkGreen} />
          ) : null
        }
        contentContainerStyle={[
          styles.listContent,
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
