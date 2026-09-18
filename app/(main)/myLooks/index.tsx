import React, { useCallback, useMemo, useRef, useState } from "react";
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
import { MaterialIcons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useAppSelector, useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  moderateHeightScale,
  moderateWidthScale,
} from "@/src/theme/dimensions";
import StackHeader from "@/src/components/StackHeader";
import EmptyState from "@/src/components/emptyState";
import { useNotificationContext } from "@/src/contexts/NotificationContext";
import Logger from "@/src/services/logger";
import { fetchMyLooks, unsaveReel } from "@/src/services/reelsService";
import type { FeedReel } from "@/src/types/reels";
import { resolveApiImageUrl } from "@/src/utils/media";

const COLUMNS = 3;
const GRID_GAP = 2;
const TILE_SIZE =
  (Dimensions.get("window").width - GRID_GAP * (COLUMNS - 1)) / COLUMNS;

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: theme.background },
    listContent: { flexGrow: 1, paddingBottom: moderateHeightScale(24) },
    row: { gap: GRID_GAP, marginBottom: GRID_GAP },
    tile: {
      width: TILE_SIZE,
      height: TILE_SIZE * 1.5,
      backgroundColor: theme.grey15,
      overflow: "hidden",
    },
    thumb: { ...StyleSheet.absoluteFillObject },
    tileFallback: {
      ...StyleSheet.absoluteFillObject,
      alignItems: "center",
      justifyContent: "center",
    },
    tileFooter: {
      position: "absolute",
      left: moderateWidthScale(6),
      bottom: moderateHeightScale(6),
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(4),
    },
    tileCount: {
      fontSize: fontSize.size11,
      fontFamily: fonts.fontMedium,
      color: theme.white,
    },
    unsaveButton: {
      position: "absolute",
      top: moderateHeightScale(6),
      right: moderateWidthScale(6),
      width: moderateWidthScale(28),
      height: moderateWidthScale(28),
      borderRadius: moderateWidthScale(14),
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.lightGreen5,
    },
    center: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    footerLoader: { paddingVertical: moderateHeightScale(20) },
  });

export default function MyLooksScreen() {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);
  const { t } = useTranslation();
  const router = useRouter();
  const { showBanner } = useNotificationContext();
  const user = useAppSelector((s) => s.user);

  const [looks, setLooks] = useState<FeedReel[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const cursorRef = useRef<string | null>(null);
  const hasMoreRef = useRef(false);

  const coords = useMemo(() => {
    const lat = user.location?.lat;
    const lng = user.location?.long;
    if (lat == null || lng == null) return undefined;
    return { latitude: lat, longitude: lng };
  }, [user.location?.lat, user.location?.long]);

  const loadFirstPage = useCallback(async () => {
    setLoading(true);
    try {
      const { reels, meta } = await fetchMyLooks({
        latitude: coords?.latitude,
        longitude: coords?.longitude,
      });
      setLooks(reels);
      cursorRef.current = meta.next_cursor ?? null;
      hasMoreRef.current = !!meta.has_more;
    } catch (error: any) {
      Logger.error("Failed to load my looks:", error);
      showBanner(
        t("error"),
        error?.message || t("failedToLoadLooks"),
        "error",
        3000,
      );
    } finally {
      setLoading(false);
    }
  }, [coords, showBanner, t]);

  useFocusEffect(
    useCallback(() => {
      void loadFirstPage();
    }, [loadFirstPage]),
  );

  const handleEndReached = useCallback(async () => {
    if (!hasMoreRef.current || loadingMore || loading) return;
    setLoadingMore(true);
    try {
      const { reels, meta } = await fetchMyLooks({
        cursor: cursorRef.current ?? undefined,
        latitude: coords?.latitude,
        longitude: coords?.longitude,
      });
      setLooks((prev) => {
        const seen = new Set(prev.map((r) => r.id));
        return [...prev, ...reels.filter((r) => !seen.has(r.id))];
      });
      cursorRef.current = meta.next_cursor ?? null;
      hasMoreRef.current = !!meta.has_more;
    } catch (error) {
      Logger.error("Failed to load more looks:", error);
    } finally {
      setLoadingMore(false);
    }
  }, [coords, loading, loadingMore]);

  const handleUnsave = useCallback(
    async (reel: FeedReel) => {
      const previous = looks;
      setLooks((prev) => prev.filter((r) => r.id !== reel.id));
      try {
        await unsaveReel(reel.id);
      } catch (error: any) {
        setLooks(previous);
        showBanner(
          t("error"),
          error?.message || t("failedToSaveLook"),
          "error",
          2500,
        );
      }
    },
    [looks, showBanner, t],
  );

  const openReel = useCallback(
    (reel: FeedReel) => {
      router.push({
        pathname: "/(main)/reelsFeed",
        params: { first_reel_id: String(reel.id) },
      });
    },
    [router],
  );

  const renderItem = useCallback(
    ({ item }: { item: FeedReel }) => {
      const thumb = resolveApiImageUrl(item.video?.thumbnail_url);
      return (
        <TouchableOpacity
          style={styles.tile}
          activeOpacity={0.85}
          onPress={() => openReel(item)}
        >
          {thumb ? (
            <Image source={{ uri: thumb }} style={styles.thumb} />
          ) : (
            <View style={styles.tileFallback}>
              <MaterialIcons
                name="movie"
                size={moderateWidthScale(28)}
                color={theme.lightGreen}
              />
            </View>
          )}
          <View style={styles.tileFooter}>
            <MaterialIcons
              name="visibility"
              size={moderateWidthScale(13)}
              color={theme.white}
            />
            <Text style={styles.tileCount}>
              {formatCount(item.stats?.views ?? 0)}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.unsaveButton}
            onPress={() => handleUnsave(item)}
            hitSlop={8}
          >
            <MaterialIcons
              name="bookmark"
              size={moderateWidthScale(16)}
              color={theme.white}
            />
          </TouchableOpacity>
        </TouchableOpacity>
      );
    },
    [handleUnsave, openReel, styles, theme.lightGreen, theme.white],
  );

  return (
    <View style={styles.root}>
      <StackHeader title={t("myLooks")} />
      {loading && looks.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.darkGreen} />
        </View>
      ) : (
        <FlatList
          data={looks}
          keyExtractor={(item) => String(item.id)}
          numColumns={COLUMNS}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          renderItem={renderItem}
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.4}
          ListEmptyComponent={
            <EmptyState
              icon="bookmark-border"
              title={t("noSavedLooks")}
              subtitle={t("savedLooksSubtitle")}
            />
          }
          ListFooterComponent={
            loadingMore ? (
              <ActivityIndicator
                style={styles.footerLoader}
                size="small"
                color={theme.darkGreen}
              />
            ) : null
          }
        />
      )}
    </View>
  );
}
