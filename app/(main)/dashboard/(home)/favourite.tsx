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
import { useTheme } from "@/src/hooks/hooks";
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
import EmptyState from "@/src/components/emptyState";
import Button from "@/src/components/button";
import { useRouter, useFocusEffect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import {
  fetchFollowing,
  unfollowBusiness,
} from "@/src/services/followService";
import { useNotificationContext } from "@/src/contexts/NotificationContext";
import Logger from "@/src/services/logger";

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    contentContainer: {
      paddingHorizontal: moderateWidthScale(20),
      paddingVertical: moderateHeightScale(16),
      paddingBottom: moderateHeightScale(40),
    },
    countText: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontMedium,
      color: theme.lightGreen,
      marginBottom: moderateHeightScale(12),
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: moderateHeightScale(12),
      borderBottomWidth: 1,
      borderBottomColor: theme.borderLight,
      gap: moderateWidthScale(12),
    },
    avatar: {
      width: widthScale(52),
      height: heightScale(52),
      borderRadius: moderateWidthScale(26),
      backgroundColor: theme.emptyProfileImage,
    },
    textCol: {
      flex: 1,
      gap: moderateHeightScale(2),
    },
    nameRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(4),
    },
    name: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      flexShrink: 1,
    },
    meta: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
    },
    unfollowBtn: {
      paddingHorizontal: moderateWidthScale(12),
      paddingVertical: moderateHeightScale(8),
      borderRadius: moderateWidthScale(8),
      borderWidth: 1,
      borderColor: theme.borderNormal,
      backgroundColor: theme.lightGreen07,
    },
    unfollowBtnDisabled: {
      opacity: 0.5,
    },
    unfollowText: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
    },
    loaderContainer: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: moderateHeightScale(40),
    },
    errorContainer: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: moderateWidthScale(28),
      gap: moderateHeightScale(16),
    },
    errorText: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      textAlign: "center",
    },
    retryButton: {
      minWidth: widthScale(160),
    },
  });

export default function FollowingScreen() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);
  const router = useRouter();
  const { showBanner } = useNotificationContext();

  const [items, setItems] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [unfollowingId, setUnfollowingId] = useState<number | null>(null);

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

  const loadPage = useCallback(
    async (
      pageToLoad: number,
      mode: "initial" | "more" | "refresh" = "initial",
    ) => {
      if (mode === "initial") {
        setLoading(true);
        setError(null);
      } else if (mode === "more") {
        setLoadingMore(true);
      } else {
        setRefreshing(true);
        setError(null);
      }

      try {
        const { businesses, meta } = await fetchFollowing({
          page: pageToLoad,
          per_page: perPage,
        });

        if (pageToLoad === 1) {
          setItems(businesses);
        } else {
          setItems((prev) => [...prev, ...businesses]);
        }

        if (typeof meta.total === "number") {
          setTotalCount(meta.total);
        } else if (pageToLoad === 1) {
          setTotalCount(businesses.length);
        }

        setHasMore(Boolean(meta.has_more) || businesses.length === perPage);
        setPage(pageToLoad);
      } catch (err: any) {
        setError(err?.message || t("failedToLoadFollowing"));
      } finally {
        setLoading(false);
        setLoadingMore(false);
        setRefreshing(false);
      }
    },
    [t],
  );

  useFocusEffect(
    useCallback(() => {
      loadPage(1, "initial");
    }, [loadPage]),
  );

  const handleLoadMore = () => {
    if (!hasMore || loadingMore || loading || items.length === 0) return;
    loadPage(page + 1, "more");
  };

  const handlePressBusiness = (item: any) => {
    if (!item?.id) return;
    router.push({
      pathname: "/(main)/businessDetail",
      params: { business_id: item.id.toString() },
    } as any);
  };

  const handleUnfollow = async (item: any) => {
    if (!item?.id || unfollowingId != null) return;
    const id = Number(item.id);
    setUnfollowingId(id);
    try {
      await unfollowBusiness(id);
      setItems((prev) => prev.filter((b) => Number(b.id) !== id));
      setTotalCount((prev) =>
        prev != null ? Math.max(0, prev - 1) : prev,
      );
    } catch (err: any) {
      Logger.error("Failed to unfollow:", err);
      showBanner(
        t("error"),
        err?.message || t("failedToUnfollow"),
        "error",
        2500,
      );
    } finally {
      setUnfollowingId(null);
    }
  };

  const displayCount = totalCount ?? items.length;
  const totalLabel =
    displayCount === 1
      ? t("followingCountOne")
      : t("followingCountMany", { count: displayCount });

  const renderItem = ({ item }: { item: any }) => {
    const imageUrl = buildImageUrl(item);
    const busy = unfollowingId === Number(item.id);
    const address = item.address || item.street_address || item.city || "";

    return (
      <View style={styles.row}>
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => handlePressBusiness(item)}
          style={{ flexDirection: "row", alignItems: "center", flex: 1, gap: moderateWidthScale(12) }}
        >
          <Image source={{ uri: imageUrl }} style={styles.avatar} />
          <View style={styles.textCol}>
            <View style={styles.nameRow}>
              <Text numberOfLines={1} style={styles.name}>
                {item.title || ""}
              </Text>
              {item.is_official ? (
                <MaterialIcons
                  name="verified"
                  size={moderateWidthScale(14)}
                  color={theme.green}
                />
              ) : null}
            </View>
            {!!address && (
              <Text numberOfLines={1} style={styles.meta}>
                {address}
              </Text>
            )}
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.unfollowBtn, busy && styles.unfollowBtnDisabled]}
          onPress={() => handleUnfollow(item)}
          disabled={busy}
          activeOpacity={0.8}
        >
          {busy ? (
            <ActivityIndicator size="small" color={theme.darkGreen} />
          ) : (
            <Text style={styles.unfollowText}>{t("unfollow")}</Text>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView edges={["bottom"]} style={styles.container}>
      <StackHeader title={t("following")} />
      {loading && items.length === 0 ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={theme.darkGreen} />
        </View>
      ) : error && items.length === 0 ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <Button
            title={t("retry")}
            onPress={() => loadPage(1, "initial")}
            containerStyle={styles.retryButton}
          />
        </View>
      ) : items.length === 0 ? (
        <EmptyState
          icon="person-outline"
          title={t("noFollowingYet")}
          subtitle={t("followingEmptySubtitle")}
        />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={styles.contentContainer}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.2}
          refreshing={refreshing}
          onRefresh={() => loadPage(1, "refresh")}
          ListHeaderComponent={
            <Text style={styles.countText}>{totalLabel}</Text>
          }
          ListFooterComponent={
            loadingMore ? (
              <View style={styles.loaderContainer}>
                <ActivityIndicator size="small" color={theme.darkGreen} />
              </View>
            ) : null
          }
        />
      )}
    </SafeAreaView>
  );
}
