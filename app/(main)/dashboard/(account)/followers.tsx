import React, { useMemo, useState, useCallback } from "react";
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { useTheme } from "@/src/hooks/hooks";
import { useTranslation } from "react-i18next";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  moderateHeightScale,
  moderateWidthScale,
  widthScale,
} from "@/src/theme/dimensions";
import StackHeader from "@/src/components/StackHeader";
import EmptyState from "@/src/components/emptyState";
import Button from "@/src/components/button";
import BusinessCustomerAvatar from "@/src/components/businessCustomerAvatar";
import { useRouter, useFocusEffect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  BUSINESS_FOLLOWERS_PER_PAGE,
  fetchBusinessFollowers,
} from "@/src/services/followService";
import type { BusinessFollower } from "@/src/types/businessFollowers";

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
    textCol: {
      flex: 1,
      gap: moderateHeightScale(2),
    },
    name: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    meta: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
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

function formatFollowedAt(value: string | null, t: (key: string) => string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  try {
    return date.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return t("followed");
  }
}

export default function BusinessFollowersScreen() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);
  const router = useRouter();

  const [items, setItems] = useState<BusinessFollower[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

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
        const { followers, meta } = await fetchBusinessFollowers({
          page: pageToLoad,
          per_page: BUSINESS_FOLLOWERS_PER_PAGE,
        });

        if (pageToLoad === 1) {
          setItems(followers);
        } else {
          setItems((prev) => {
            const seen = new Set(prev.map((f) => f.id));
            return [...prev, ...followers.filter((f) => !seen.has(f.id))];
          });
        }

        if (typeof meta.total === "number") {
          setTotalCount(meta.total);
        } else if (pageToLoad === 1) {
          setTotalCount(followers.length);
        }

        setHasMore(
          Boolean(meta.has_more) ||
            followers.length === BUSINESS_FOLLOWERS_PER_PAGE,
        );
        setPage(pageToLoad);
      } catch (err: any) {
        setError(err?.message || t("failedToLoadFollowers"));
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

  const handlePressFollower = (item: BusinessFollower) => {
    if (!item?.id) return;
    router.push({
      pathname: "/(main)/businessCustomerDetail",
      params: { id: item.id.toString() },
    } as any);
  };

  const displayCount = totalCount ?? items.length;
  const totalLabel =
    displayCount === 1
      ? t("followersCountOne")
      : t("followersCountMany", { count: displayCount });

  const renderItem = ({ item }: { item: BusinessFollower }) => {
    const followedLabel = formatFollowedAt(item.followed_at, t);
    const contact = item.email?.trim() || item.phone?.trim() || "";

    return (
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => handlePressFollower(item)}
        style={styles.row}
      >
        <BusinessCustomerAvatar
          name={item.name}
          profileImageUrl={item.profile_image_url}
          size={moderateWidthScale(52)}
        />
        <View style={styles.textCol}>
          <Text numberOfLines={1} style={styles.name}>
            {item.name?.trim() || t("unknown")}
          </Text>
          {!!contact && (
            <Text numberOfLines={1} style={styles.meta}>
              {contact}
            </Text>
          )}
          {!!followedLabel && (
            <Text numberOfLines={1} style={styles.meta}>
              {t("followedOn", { date: followedLabel })}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView edges={["bottom"]} style={styles.container}>
      <StackHeader title={t("followers")} />
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
          icon="people-outline"
          title={t("noFollowersYet")}
          subtitle={t("followersEmptySubtitle")}
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
