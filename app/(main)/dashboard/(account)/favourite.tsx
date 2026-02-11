import React, { useMemo, useState, useCallback } from "react";
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  Image,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { useAppSelector, useTheme } from "@/src/hooks/hooks";
import { useTranslation } from "react-i18next";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  heightScale,
  moderateHeightScale,
  moderateWidthScale,
  widthScale,
} from "@/src/theme/dimensions";
import StackHeader from "@/src/components/StackHeader";
import { ApiService } from "@/src/services/api";
import { useRouter, useFocusEffect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { favoritesEndpoints } from "@/src/services/endpoints";
import { PlatformVerifiedStarIcon, StarIconSmall } from "@/assets/icons";

// Popular countries list with their flag emojis and zip code formats

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    contentContainer: {
      paddingHorizontal: moderateWidthScale(12),
      paddingVertical: moderateHeightScale(24),
      gap: moderateHeightScale(16),
      paddingBottom: moderateHeightScale(40),
    },
    card: {
      backgroundColor: theme.darkGreen,
      borderRadius: moderateWidthScale(12),
      paddingHorizontal: moderateWidthScale(10),
      paddingVertical: moderateHeightScale(10),
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(12),
    },
    image: {
      width: widthScale(110),
      height: heightScale(110),
      borderRadius: moderateWidthScale(6),
      backgroundColor: theme.emptyProfileImage,
      borderWidth: 1,
      borderColor: theme.borderLight,
      overflow: "hidden",
    },
    content: {
      flex: 1,
      gap: moderateHeightScale(10),
    },
    verifiedBadge: {
      backgroundColor: theme.darkGreenLight,
      paddingHorizontal: moderateWidthScale(10),
      paddingVertical: moderateHeightScale(6),
      borderRadius: moderateWidthScale(999),
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(6),
      alignSelf: "flex-start",
    },
    verifiedText: {
      fontSize: fontSize.size10,
      fontFamily: fonts.fontMedium,
      color: theme.white,
    },
    name: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontBold,
      color: theme.white,
      textTransform: "capitalize",
    },
    address: {
      fontSize: fontSize.size11,
      fontFamily: fonts.fontRegular,
      color: theme.white80,
    },
    bottomRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    ratingPill: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: moderateWidthScale(6),
      paddingVertical: moderateHeightScale(6),
      borderRadius: moderateWidthScale(999),
      borderWidth: moderateWidthScale(1),
      borderColor: theme.white70,
      gap: moderateWidthScale(6),
    },
    ratingText: {
      fontSize: fontSize.size10,
      fontFamily: fonts.fontRegular,
      color: theme.white,
    },
    emptyContainer: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: moderateHeightScale(40),
    },
    emptyText: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontMedium,
      color: theme.lightGreen,
      textAlign: "center",
    },
    loaderContainer: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: moderateHeightScale(40),
    },
  });

export default function FavouriteScreen() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);
  const router = useRouter();
  const user = useAppSelector((state) => state.user);

  const [favorites, setFavorites] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const perPage = 15;

  const buildImageUrl = useCallback((item: any) => {
    const baseUrl = process.env.EXPO_PUBLIC_API_BASE_URL || "";
    const rawUrl = item.image_url || item.logo_url || null;

    if (!rawUrl) {
      return process.env.EXPO_PUBLIC_DEFAULT_BUSINESS_IMAGE ?? "";
    }

    if (typeof rawUrl === "string" && rawUrl.startsWith("http")) {
      return rawUrl;
    }

    return `${baseUrl}${rawUrl}`;
  }, []);

  const fetchFavorites = useCallback(
    async (
      pageToLoad: number,
      mode: "initial" | "more" | "refresh" = "initial",
    ) => {
      if (mode === "initial") {
        setLoading(true);
        setError(null);
      } else if (mode === "more") {
        setLoadingMore(true);
      } else if (mode === "refresh") {
        setRefreshing(true);
        setError(null);
      }

      try {
        const response = await ApiService.get<any>(
          favoritesEndpoints.list({
            page: pageToLoad,
            per_page: perPage,
          }),
        );

        const payload = response?.data;
        const items: any[] = payload?.data ?? [];

        if (pageToLoad === 1) {
          setFavorites(items);
        } else {
          setFavorites((prev) => [...prev, ...items]);
        }

        setHasMore(items.length === perPage);
        setPage(pageToLoad);
      } catch (err: any) {
        setError(err?.message || "Failed to load favorites");
      } finally {
        setLoading(false);
        setLoadingMore(false);
        setRefreshing(false);
      }
    },
    [],
  );

  useFocusEffect(
    useCallback(() => {
      fetchFavorites(1, "initial");
    }, [fetchFavorites]),
  );

  const handleLoadMore = () => {
    if (!hasMore || loadingMore || loading || favorites.length === 0) {
      return;
    }
    fetchFavorites(page + 1, "more");
  };

  const handleRefresh = () => {
    fetchFavorites(1, "refresh");
  };

  const handlePressBusiness = (item: any) => {
    if (!item?.id) return;

    router.push({
      pathname: "/(main)/businessDetail",
      params: { business_id: item.id.toString() },
    } as any);
  };

  const renderItem = ({ item }: { item: any }) => {
    const imageUrl = buildImageUrl(item);
    const rating =
      typeof item.average_rating === "number" ? item.average_rating : 0;
    const reviews =
      typeof item.ratings_count === "number" ? item.ratings_count : 0;

    return (
      <TouchableOpacity
        activeOpacity={0.9}
        style={styles.card}
        onPress={() => handlePressBusiness(item)}
      >
        <Image source={{ uri: imageUrl }} style={styles.image} />

        <View style={styles.content}>
          <View style={styles.verifiedBadge}>
            <PlatformVerifiedStarIcon
              width={widthScale(10)}
              height={heightScale(10)}
            />
            <Text style={styles.verifiedText}>{t("platformVerified")}</Text>
          </View>

          <View>
            <Text numberOfLines={1} style={styles.name}>
              {item.title}
            </Text>
            <Text numberOfLines={1} style={styles.address}>
              {item.address || item.street_address}
            </Text>
          </View>

          <View style={styles.bottomRow}>
            <View style={styles.ratingPill}>
              <StarIconSmall
                width={widthScale(12)}
                height={heightScale(12)}
                color={theme.orangeBrown}
              />
              <Text style={styles.ratingText}>
                {rating || 0}/ {reviews || 0} {t("reviews").toLowerCase()}
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView edges={["bottom"]} style={styles.container}>
      <StackHeader title={t("favorites")} />
      {loading && favorites.length === 0 ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : favorites.length === 0 && !error ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>{t("noDataFound")}</Text>
        </View>
      ) : (
        <FlatList
          data={favorites}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.contentContainer}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.2}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          ListFooterComponent={
            loadingMore ? (
              <View style={styles.loaderContainer}>
                <ActivityIndicator size="small" color={theme.primary} />
              </View>
            ) : null
          }
        />
      )}
    </SafeAreaView>
  );
}
