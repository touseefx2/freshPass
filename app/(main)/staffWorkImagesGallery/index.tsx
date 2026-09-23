import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams } from "expo-router";
import { useDispatch } from "react-redux";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  moderateHeightScale,
  moderateWidthScale,
} from "@/src/theme/dimensions";
import StackHeader from "@/src/components/StackHeader";
import RetryButton from "@/src/components/retryButton";
import { ApiService } from "@/src/services/api";
import Logger from "@/src/services/logger";
import { businessEndpoints, staffEndpoints } from "@/src/services/endpoints";
import { openFullImageModal } from "@/src/state/slices/generalSlice";
import type {
  StaffWorkImage,
  StaffWorkImagePage,
} from "@/src/types/staffWorkImages";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const PADDING = moderateWidthScale(16);
const GAP = moderateWidthScale(10);
const NUM_COLUMNS = 3;
/** See-all gallery page size */
const PER_PAGE = 15;

const calculateItemWidth = () => {
  const availableWidth = SCREEN_WIDTH - PADDING * 2;
  const totalGaps = GAP * (NUM_COLUMNS - 1);
  return (availableWidth - totalGaps) / NUM_COLUMNS;
};

const resolveHasMore = (
  meta: StaffWorkImagePage["meta"] | undefined,
  loadedCount: number,
): boolean => {
  if (!meta) {
    return false;
  }
  if (meta.has_more === true) {
    return true;
  }
  if (
    typeof meta.current_page === "number" &&
    typeof meta.last_page === "number" &&
    meta.current_page < meta.last_page
  ) {
    return true;
  }
  if (typeof meta.total === "number" && loadedCount < meta.total) {
    return true;
  }
  return false;
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    listContent: {
      paddingHorizontal: PADDING,
      paddingTop: moderateHeightScale(16),
      paddingBottom: moderateHeightScale(24),
      flexGrow: 1,
    },
    columnWrapper: {
      justifyContent: "flex-start",
    },
    cardShadow: {
      marginRight: GAP,
      marginBottom: GAP,
      borderRadius: moderateWidthScale(12),
      backgroundColor: theme.background,
      shadowColor: theme.shadow,
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.16,
      shadowRadius: 5,
      elevation: 4,
    },
    gridItem: {
      width: "100%",
      aspectRatio: 1,
      borderRadius: moderateWidthScale(12),
      overflow: "hidden",
      backgroundColor: theme.grey15,
      borderWidth: 1,
      borderColor: theme.borderLight,
    },
    photo: {
      width: "100%",
      height: "100%",
    },
    centered: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: moderateWidthScale(24),
      gap: moderateHeightScale(12),
    },
    emptyText: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen4,
      textAlign: "center",
    },
    footerLoader: {
      paddingVertical: moderateHeightScale(16),
      alignItems: "center",
    },
  });

export default function StaffWorkImagesGalleryScreen() {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const params = useLocalSearchParams<{
    staffId?: string;
    businessId?: string;
    name?: string;
  }>();
  const staffId = params.staffId;
  const businessId = params.businessId;
  const isOwnerGallery = Boolean(businessId) && !staffId;

  const [images, setImages] = useState<StaffWorkImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadingMoreRef = useRef(false);
  const hasMoreRef = useRef(false);
  const pageRef = useRef(1);
  const imagesRef = useRef<StaffWorkImage[]>([]);
  imagesRef.current = images;

  const itemWidth = useMemo(() => calculateItemWidth(), []);

  const fetchPage = useCallback(
    async (pageToLoad: number, append: boolean) => {
      if (!staffId && !businessId) {
        setError(t("failedToLoadWorkImages"));
        setLoading(false);
        return;
      }

      if (append) {
        if (loadingMoreRef.current || !hasMoreRef.current) {
          return;
        }
        loadingMoreRef.current = true;
        setLoadingMore(true);
      } else {
        setLoading(true);
        setError(null);
        loadingMoreRef.current = false;
      }

      try {
        const endpoint = isOwnerGallery
          ? businessEndpoints.ownerWorkImages(businessId!, pageToLoad, PER_PAGE)
          : staffEndpoints.images(staffId!, pageToLoad, PER_PAGE);

        const response = await ApiService.get<{
          success: boolean;
          message: string;
          data: StaffWorkImagePage;
        }>(endpoint);

        const pageData = response.data;
        const nextItems = pageData?.data ?? [];

        let merged: StaffWorkImage[];
        if (!append) {
          merged = nextItems;
        } else {
          const seen = new Set(imagesRef.current.map((img) => img.id));
          const unique = nextItems.filter((img) => !seen.has(img.id));
          merged = [...imagesRef.current, ...unique];
        }

        setImages(merged);

        const nextPage = pageData?.meta?.current_page ?? pageToLoad;
        const nextHasMore = resolveHasMore(pageData?.meta, merged.length);

        pageRef.current = nextPage;
        hasMoreRef.current = nextHasMore;
        setError(null);
      } catch (err: any) {
        Logger.error("Failed to load staff work images gallery:", err);
        if (!append) {
          setError(err?.message || t("failedToLoadWorkImages"));
          setImages([]);
          hasMoreRef.current = false;
        }
      } finally {
        setLoading(false);
        setLoadingMore(false);
        loadingMoreRef.current = false;
      }
    },
    [businessId, isOwnerGallery, staffId, t],
  );

  useEffect(() => {
    pageRef.current = 1;
    hasMoreRef.current = false;
    fetchPage(1, false);
  }, [fetchPage]);

  const handleLoadMore = useCallback(() => {
    if (loading || loadingMoreRef.current || !hasMoreRef.current) {
      return;
    }
    fetchPage(pageRef.current + 1, true);
  }, [fetchPage, loading]);

  const handleOpenImage = useCallback(
    (index: number) => {
      const urls = images.map((img) => img.url).filter(Boolean);
      if (!urls.length) {
        return;
      }
      dispatch(
        openFullImageModal({
          images: urls,
          initialIndex: index,
        }),
      );
    },
    [dispatch, images],
  );

  const renderItem = useCallback(
    ({ item, index }: { item: StaffWorkImage; index: number }) => {
      const isLastInRow = (index + 1) % NUM_COLUMNS === 0;
      return (
        <TouchableOpacity
          style={[
            styles.cardShadow,
            { width: itemWidth },
            isLastInRow && { marginRight: 0 },
          ]}
          activeOpacity={0.85}
          onPress={() => handleOpenImage(index)}
        >
          <View style={styles.gridItem}>
            <Image source={{ uri: item.url }} style={styles.photo} />
          </View>
        </TouchableOpacity>
      );
    },
    [handleOpenImage, itemWidth, styles],
  );

  return (
    <SafeAreaView edges={["bottom"]} style={styles.container}>
      <StackHeader title={t("workPhotosTitle")} />
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={theme.darkGreen} />
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Text style={styles.emptyText}>{error}</Text>
          <RetryButton onPress={() => fetchPage(1, false)} />
        </View>
      ) : images.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyText}>{t("noWorkPhotosYet")}</Text>
        </View>
      ) : (
        <FlatList
          data={images}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          numColumns={NUM_COLUMNS}
          columnWrapperStyle={styles.columnWrapper}
          contentContainerStyle={styles.listContent}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.35}
          ListFooterComponent={
            loadingMore ? (
              <View style={styles.footerLoader}>
                <ActivityIndicator size="small" color={theme.darkGreen} />
              </View>
            ) : null
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}
