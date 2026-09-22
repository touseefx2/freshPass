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
import {
  deleteAiLook,
  fetchMyLooks,
  unsaveReel,
} from "@/src/services/reelsService";
import type { MyLookListItem } from "@/src/types/reels";
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

function itemKey(item: MyLookListItem, index: number): string {
  if (item.type === "ai_look") {
    return `ai-${item.look?.id ?? index}`;
  }
  return `reel-${item.reel?.id ?? index}`;
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
    aiBadge: {
      position: "absolute",
      left: moderateWidthScale(6),
      top: moderateHeightScale(6),
      paddingHorizontal: moderateWidthScale(6),
      paddingVertical: moderateHeightScale(2),
      borderRadius: moderateWidthScale(6),
      backgroundColor: theme.lightGreen5,
    },
    aiBadgeText: {
      fontSize: fontSize.size10,
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

  const [looks, setLooks] = useState<MyLookListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const cursorReelsRef = useRef<string | null>(null);
  const cursorAiRef = useRef<string | null>(null);
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
      const { items, meta } = await fetchMyLooks({
        type: "all",
        latitude: coords?.latitude,
        longitude: coords?.longitude,
      });
      setLooks(items);
      cursorReelsRef.current = meta.cursors?.reels ?? meta.next_cursor ?? null;
      cursorAiRef.current = meta.cursors?.ai ?? null;
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
      const { items, meta } = await fetchMyLooks({
        type: "all",
        cursor_reels: cursorReelsRef.current ?? undefined,
        cursor_ai: cursorAiRef.current ?? undefined,
        latitude: coords?.latitude,
        longitude: coords?.longitude,
      });
      setLooks((prev) => {
        const seen = new Set(prev.map((row, i) => itemKey(row, i)));
        return [
          ...prev,
          ...items.filter((row, i) => !seen.has(itemKey(row, i))),
        ];
      });
      cursorReelsRef.current = meta.cursors?.reels ?? null;
      cursorAiRef.current = meta.cursors?.ai ?? null;
      hasMoreRef.current = !!meta.has_more;
    } catch (error) {
      Logger.error("Failed to load more looks:", error);
    } finally {
      setLoadingMore(false);
    }
  }, [coords, loading, loadingMore]);

  const handleUnsave = useCallback(
    async (item: MyLookListItem) => {
      const previous = looks;
      setLooks((prev) => prev.filter((row) => row !== item));
      try {
        if (item.type === "ai_look" && item.look?.id != null) {
          await deleteAiLook(item.look.id);
        } else if (item.reel?.id != null) {
          await unsaveReel(item.reel.id);
        }
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

  const openItem = useCallback(
    (item: MyLookListItem) => {
      if (item.type === "ai_look") {
        const reelId = item.reel?.id ?? item.look?.reel?.id;
        if (reelId) {
          router.push({
            pathname: "/(main)/reelsFeed",
            params: { first_reel_id: String(reelId) },
          });
        }
        return;
      }
      if (item.reel?.id) {
        router.push({
          pathname: "/(main)/reelsFeed",
          params: { first_reel_id: String(item.reel.id) },
        });
      }
    },
    [router],
  );

  const renderItem = useCallback(
    ({ item }: { item: MyLookListItem }) => {
      const isAi = item.type === "ai_look";
      const thumb = resolveApiImageUrl(
        isAi
          ? item.look?.image_url
          : item.reel?.video?.thumbnail_url,
      );
      const views = item.reel?.stats?.views ?? 0;
      return (
        <TouchableOpacity
          style={styles.tile}
          activeOpacity={0.85}
          onPress={() => openItem(item)}
        >
          {thumb ? (
            <Image source={{ uri: thumb }} style={styles.thumb} />
          ) : (
            <View style={styles.tileFallback}>
              <MaterialIcons
                name={isAi ? "face-retouching-natural" : "movie"}
                size={moderateWidthScale(28)}
                color={theme.lightGreen}
              />
            </View>
          )}
          {isAi ? (
            <View style={styles.aiBadge}>
              <Text style={styles.aiBadgeText}>{t("aiLook")}</Text>
            </View>
          ) : null}
          {!isAi ? (
            <View style={styles.tileFooter}>
              <MaterialIcons
                name="visibility"
                size={moderateWidthScale(13)}
                color={theme.white}
              />
              <Text style={styles.tileCount}>{formatCount(views)}</Text>
            </View>
          ) : null}
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
    [handleUnsave, openItem, styles, t, theme.lightGreen, theme.white],
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
          keyExtractor={(item, index) => itemKey(item, index)}
          numColumns={COLUMNS}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.listContent}
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
              <View style={styles.footerLoader}>
                <ActivityIndicator color={theme.darkGreen} />
              </View>
            ) : null
          }
        />
      )}
    </View>
  );
}
