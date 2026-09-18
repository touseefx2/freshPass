import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewToken,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useVideoPlayer, VideoView } from "expo-video";
import { useTranslation } from "react-i18next";
import { useAppDispatch, useAppSelector, useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  moderateHeightScale,
  moderateWidthScale,
} from "@/src/theme/dimensions";
import { setGuestModeModalVisible } from "@/src/state/slices/generalSlice";
import { useNotificationContext } from "@/src/contexts/NotificationContext";
import { ApiService } from "@/src/services/api";
import { businessEndpoints } from "@/src/services/endpoints";
import Logger from "@/src/services/logger";
import {
  fetchReelFeed,
  likeReel,
  recordReelView,
  unlikeReel,
} from "@/src/services/reelsService";
import type { FeedReel } from "@/src/types/reels";
import { resolveApiImageUrl } from "@/src/utils/media";

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get("window");

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: theme.black,
    },
    item: {
      width: SCREEN_WIDTH,
      height: SCREEN_HEIGHT,
      backgroundColor: theme.black,
    },
    video: {
      ...StyleSheet.absoluteFillObject,
    },
    poster: {
      ...StyleSheet.absoluteFillObject,
    },
    topBar: {
      position: "absolute",
      left: 0,
      right: 0,
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: moderateWidthScale(12),
      zIndex: 5,
    },
    iconBtn: {
      width: moderateWidthScale(40),
      height: moderateWidthScale(40),
      borderRadius: moderateWidthScale(20),
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.lightGreen4,
    },
    sideActions: {
      position: "absolute",
      right: moderateWidthScale(12),
      bottom: moderateHeightScale(140),
      alignItems: "center",
      gap: moderateHeightScale(16),
      zIndex: 5,
    },
    sideBtn: { alignItems: "center" },
    sideCount: {
      marginTop: moderateHeightScale(4),
      fontSize: fontSize.size11,
      fontFamily: fonts.fontMedium,
      color: theme.white,
    },
    bottomMeta: {
      position: "absolute",
      left: moderateWidthScale(14),
      right: moderateWidthScale(72),
      bottom: moderateHeightScale(40),
      zIndex: 5,
    },
    businessRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(10),
      marginBottom: moderateHeightScale(8),
    },
    avatar: {
      width: moderateWidthScale(40),
      height: moderateWidthScale(40),
      borderRadius: moderateWidthScale(20),
      backgroundColor: theme.grey15,
    },
    businessName: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontBold,
      color: theme.white,
      flexShrink: 1,
    },
    followBtn: {
      paddingHorizontal: moderateWidthScale(10),
      paddingVertical: moderateHeightScale(5),
      borderRadius: moderateWidthScale(6),
      backgroundColor: theme.buttonBack,
    },
    followText: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontBold,
      color: theme.buttonText,
    },
    location: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.white70,
      marginBottom: moderateHeightScale(6),
    },
    caption: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: theme.white,
      marginBottom: moderateHeightScale(8),
    },
    badgesRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: moderateWidthScale(6),
      marginBottom: moderateHeightScale(10),
    },
    badge: {
      paddingHorizontal: moderateWidthScale(8),
      paddingVertical: moderateHeightScale(3),
      borderRadius: moderateWidthScale(4),
      backgroundColor: theme.selectCard,
    },
    badgeText: {
      fontSize: fontSize.size11,
      fontFamily: fonts.fontMedium,
      color: theme.white,
    },
    ctaRow: {
      flexDirection: "row",
      gap: moderateWidthScale(8),
    },
    cta: {
      paddingHorizontal: moderateWidthScale(12),
      paddingVertical: moderateHeightScale(8),
      borderRadius: moderateWidthScale(8),
      backgroundColor: theme.buttonBack,
    },
    ctaSecondary: {
      backgroundColor: theme.lightGreen4,
    },
    ctaText: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontBold,
      color: theme.buttonText,
    },
    centerLoader: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.black,
    },
    emptyText: {
      color: theme.white,
      fontFamily: fonts.fontMedium,
      fontSize: fontSize.size14,
      textAlign: "center",
      paddingHorizontal: moderateWidthScale(24),
    },
  });

type ReelItemProps = {
  reel: FeedReel;
  isActive: boolean;
  styles: ReturnType<typeof createStyles>;
  theme: Theme;
  topInset: number;
  onBack: () => void;
  onLike: (reel: FeedReel) => void;
  onFollow: (reel: FeedReel) => void;
  onProfile: (reel: FeedReel) => void;
  onWantLook: (reel: FeedReel) => void;
  onComingSoon: () => void;
};

function ReelFeedItem({
  reel,
  isActive,
  styles,
  theme,
  topInset,
  onBack,
  onLike,
  onFollow,
  onProfile,
  onWantLook,
  onComingSoon,
}: ReelItemProps) {
  const { t } = useTranslation();
  const playbackUrl = resolveApiImageUrl(reel.video?.playback_url) || "";
  const posterUrl = resolveApiImageUrl(reel.video?.thumbnail_url);
  const [showPoster, setShowPoster] = useState(true);

  const player = useVideoPlayer(playbackUrl, (p) => {
    p.loop = true;
  });

  useEffect(() => {
    if (!player) return;
    if (isActive) {
      try {
        player.play();
      } catch {}
    } else {
      try {
        player.pause();
      } catch {}
    }
  }, [isActive, player]);

  const cityState = [reel.business?.city, reel.business?.state]
    .filter(Boolean)
    .join(", ");
  const distance =
    reel.distance_km != null
      ? `${reel.distance_km.toFixed(1)} km`
      : null;

  return (
    <View style={styles.item}>
      {playbackUrl ? (
        <VideoView
          player={player}
          style={styles.video}
          contentFit="cover"
          nativeControls={false}
          onFirstFrameRender={() => setShowPoster(false)}
        />
      ) : null}
      {showPoster && posterUrl ? (
        <Image source={{ uri: posterUrl }} style={styles.poster} />
      ) : null}

      <View style={[styles.topBar, { top: topInset + moderateHeightScale(8) }]}>
        <TouchableOpacity style={styles.iconBtn} onPress={onBack}>
          <MaterialIcons
            name="arrow-back"
            size={moderateWidthScale(22)}
            color={theme.white}
          />
        </TouchableOpacity>
      </View>

      <View style={styles.sideActions}>
        <TouchableOpacity style={styles.sideBtn} onPress={() => onLike(reel)}>
          <MaterialIcons
            name={reel.viewer?.liked ? "favorite" : "favorite-border"}
            size={moderateWidthScale(30)}
            color={reel.viewer?.liked ? theme.red : theme.white}
          />
          <Text style={styles.sideCount}>
            {formatCount(reel.stats?.likes ?? 0)}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.sideBtn} onPress={onComingSoon}>
          <MaterialIcons
            name="chat-bubble-outline"
            size={moderateWidthScale(28)}
            color={theme.white}
          />
          <Text style={styles.sideCount}>
            {formatCount(reel.stats?.comments ?? 0)}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.sideBtn} onPress={onComingSoon}>
          <MaterialIcons
            name="share"
            size={moderateWidthScale(28)}
            color={theme.white}
          />
          <Text style={styles.sideCount}>
            {formatCount(reel.stats?.shares ?? 0)}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.sideBtn} onPress={onComingSoon}>
          <MaterialIcons
            name="bookmark-border"
            size={moderateWidthScale(28)}
            color={theme.white}
          />
          <Text style={styles.sideCount}>{t("save")}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.bottomMeta}>
        <View style={styles.businessRow}>
          <TouchableOpacity onPress={() => onProfile(reel)}>
            {resolveApiImageUrl(reel.business?.image_url) ? (
              <Image
                source={{
                  uri: resolveApiImageUrl(reel.business?.image_url)!,
                }}
                style={styles.avatar}
              />
            ) : (
              <View
                style={[
                  styles.avatar,
                  { alignItems: "center", justifyContent: "center" },
                ]}
              >
                <MaterialIcons
                  name="storefront"
                  size={moderateWidthScale(20)}
                  color={theme.lightGreen}
                />
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={{ flexShrink: 1 }}
            onPress={() => onProfile(reel)}
          >
            <Text style={styles.businessName} numberOfLines={1}>
              {reel.business?.title || ""}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.followBtn}
            onPress={() => onFollow(reel)}
          >
            <Text style={styles.followText}>
              {reel.viewer?.following ? t("following") : t("follow")}
            </Text>
          </TouchableOpacity>
        </View>

        {(cityState || distance) && (
          <Text style={styles.location} numberOfLines={1}>
            {[cityState, distance].filter(Boolean).join(" · ")}
          </Text>
        )}

        {!!reel.caption && (
          <Text style={styles.caption} numberOfLines={3}>
            {reel.caption}
          </Text>
        )}

        <View style={styles.badgesRow}>
          {!!reel.promotion_text && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{reel.promotion_text}</Text>
            </View>
          )}
          {reel.available_now && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{t("availableNow")}</Text>
            </View>
          )}
          {!!reel.category?.name && (
            <View style={[styles.badge, { backgroundColor: theme.lightGreen4 }]}>
              <Text style={styles.badgeText}>{reel.category.name}</Text>
            </View>
          )}
        </View>

        <View style={styles.ctaRow}>
          <TouchableOpacity
            style={styles.cta}
            onPress={() => onWantLook(reel)}
          >
            <Text style={styles.ctaText}>{t("iWantThisLook")}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.cta, styles.ctaSecondary]}
            onPress={() => onProfile(reel)}
          >
            <Text style={styles.ctaText}>{t("viewProfile")}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

export default function ReelsFeedScreen() {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();
  const { showBanner } = useNotificationContext();
  const user = useAppSelector((s) => s.user);
  const isGuest = user.isGuest;

  const params = useLocalSearchParams<{
    category_id?: string;
    first_reel_id?: string;
  }>();
  const categoryId = params.category_id;
  const firstReelId = params.first_reel_id;

  const [reels, setReels] = useState<FeedReel[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<number | null>(
    firstReelId ? Number(firstReelId) : null,
  );
  const viewedIdsRef = useRef<Set<number>>(new Set());
  const likeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingLikeRef = useRef<{
    id: number;
    liked: boolean;
  } | null>(null);

  const coords = useMemo(() => {
    const lat = user.location?.lat;
    const lng = user.location?.long;
    if (lat == null || lng == null) return undefined;
    return { latitude: lat, longitude: lng };
  }, [user.location?.lat, user.location?.long]);

  const loadPage = useCallback(
    async (nextCursor?: string | null, append = false) => {
      if (!append) setLoading(true);
      try {
        const { reels: pageReels, meta } = await fetchReelFeed({
          category_id: categoryId,
          first_reel_id: firstReelId,
          cursor: nextCursor || undefined,
          latitude: coords?.latitude,
          longitude: coords?.longitude,
        });
        setReels((prev) =>
          append
            ? [
                ...prev,
                ...pageReels.filter((r) => !prev.some((x) => x.id === r.id)),
              ]
            : pageReels,
        );
        setCursor(meta.next_cursor ?? null);
        setHasMore(Boolean(meta.has_more));
        if (!append && pageReels[0] && !activeId) {
          setActiveId(pageReels[0].id);
        }
      } catch (error: any) {
        Logger.error("Failed to load reels feed:", error);
        showBanner(
          t("error"),
          error?.message || t("failedToLoadReels"),
          "error",
          3000,
        );
      } finally {
        setLoading(false);
      }
    },
    [activeId, categoryId, coords, firstReelId, showBanner, t],
  );

  useEffect(() => {
    loadPage(null, false);
  }, []);

  useEffect(() => {
    if (activeId == null) return;
    if (viewedIdsRef.current.has(activeId)) return;
    viewedIdsRef.current.add(activeId);
    recordReelView(activeId).then((views) => {
      if (views == null) return;
      setReels((prev) =>
        prev.map((r) =>
          r.id === activeId
            ? { ...r, stats: { ...r.stats, views } }
            : r,
        ),
      );
    });
  }, [activeId]);

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      const first = viewableItems.find((v) => v.isViewable);
      if (first?.item?.id) {
        setActiveId(first.item.id);
      }
    },
  ).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 80,
  }).current;

  const handleEndReached = useCallback(() => {
    if (!hasMore || !cursor || loading) return;
    loadPage(cursor, true);
  }, [cursor, hasMore, loadPage, loading]);

  const flushLike = useCallback(async () => {
    const pending = pendingLikeRef.current;
    pendingLikeRef.current = null;
    if (!pending) return;
    try {
      const result = pending.liked
        ? await likeReel(pending.id)
        : await unlikeReel(pending.id);
      setReels((prev) =>
        prev.map((r) =>
          r.id === pending.id
            ? {
                ...r,
                viewer: { ...r.viewer, liked: result.liked },
                stats: { ...r.stats, likes: result.likes },
              }
            : r,
        ),
      );
    } catch (error: any) {
      const status = error?.response?.status || error?.status;
      setReels((prev) =>
        prev.map((r) => {
          if (r.id !== pending.id) return r;
          const revertLiked = !pending.liked;
          const delta = revertLiked ? 1 : -1;
          return {
            ...r,
            viewer: { ...r.viewer, liked: revertLiked },
            stats: {
              ...r.stats,
              likes: Math.max(0, (r.stats?.likes ?? 0) + delta),
            },
          };
        }),
      );
      if (status === 401) {
        dispatch(setGuestModeModalVisible(true));
      } else {
        showBanner(t("error"), error?.message || t("failedToLikeReel"), "error", 2500);
      }
    }
  }, [dispatch, showBanner, t]);

  const handleLike = useCallback(
    (reel: FeedReel) => {
      if (isGuest || !user.accessToken) {
        dispatch(setGuestModeModalVisible(true));
        return;
      }
      const nextLiked = !reel.viewer?.liked;
      setReels((prev) =>
        prev.map((r) => {
          if (r.id !== reel.id) return r;
          const delta = nextLiked ? 1 : -1;
          return {
            ...r,
            viewer: { ...r.viewer, liked: nextLiked },
            stats: {
              ...r.stats,
              likes: Math.max(0, (r.stats?.likes ?? 0) + delta),
            },
          };
        }),
      );
      pendingLikeRef.current = { id: reel.id, liked: nextLiked };
      if (likeTimerRef.current) clearTimeout(likeTimerRef.current);
      likeTimerRef.current = setTimeout(flushLike, 350);
    },
    [dispatch, flushLike, isGuest, user.accessToken],
  );

  const handleFollow = useCallback(
    async (reel: FeedReel) => {
      if (isGuest || !user.accessToken) {
        dispatch(setGuestModeModalVisible(true));
        return;
      }
      const businessId = reel.business?.id;
      if (!businessId) return;
      const prev = !!reel.viewer?.following;
      setReels((list) =>
        list.map((r) =>
          r.id === reel.id
            ? { ...r, viewer: { ...r.viewer, following: !prev } }
            : r,
        ),
      );
      try {
        const response = await ApiService.post<{
          success?: boolean;
          data?: { favorited?: boolean };
          favorited?: boolean;
        }>(businessEndpoints.favorite(businessId));
        const favorited =
          response?.data?.favorited ?? response?.favorited ?? !prev;
        setReels((list) =>
          list.map((r) =>
            r.id === reel.id
              ? { ...r, viewer: { ...r.viewer, following: !!favorited } }
              : r,
          ),
        );
      } catch (error: any) {
        setReels((list) =>
          list.map((r) =>
            r.id === reel.id
              ? { ...r, viewer: { ...r.viewer, following: prev } }
              : r,
          ),
        );
        showBanner(
          t("error"),
          error?.message || t("failedToFollow"),
          "error",
          2500,
        );
      }
    },
    [dispatch, isGuest, showBanner, t, user.accessToken],
  );

  const openProfile = useCallback(
    (reel: FeedReel) => {
      router.push({
        pathname: "/(main)/businessDetail",
        params: {
          business_id: String(reel.business.id),
          reel_id: String(reel.id),
        },
      });
    },
    [router],
  );

  const wantLook = useCallback(
    (reel: FeedReel) => {
      if (reel.service?.id) {
        router.push({
          pathname: "/(main)/bookingNow",
          params: {
            business_id: String(reel.business.id),
            service_id: String(reel.service.id),
            reel_id: String(reel.id),
          },
        });
      } else {
        openProfile(reel);
      }
    },
    [openProfile, router],
  );

  if (loading && reels.length === 0) {
    return (
      <View style={styles.centerLoader}>
        <ActivityIndicator size="large" color={theme.white} />
      </View>
    );
  }

  if (!loading && reels.length === 0) {
    return (
      <View style={styles.centerLoader}>
        <TouchableOpacity
          style={[styles.iconBtn, { position: "absolute", top: insets.top + 8, left: 12 }]}
          onPress={() => router.back()}
        >
          <MaterialIcons name="arrow-back" size={22} color={theme.white} />
        </TouchableOpacity>
        <Text style={styles.emptyText}>{t("noReelsInFeed")}</Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <FlatList
        data={reels}
        keyExtractor={(item) => String(item.id)}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        snapToInterval={SCREEN_HEIGHT}
        decelerationRate="fast"
        getItemLayout={(_, index) => ({
          length: SCREEN_HEIGHT,
          offset: SCREEN_HEIGHT * index,
          index,
        })}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.3}
        renderItem={({ item }) => (
          <ReelFeedItem
            reel={item}
            isActive={item.id === activeId}
            styles={styles}
            theme={theme}
            topInset={insets.top}
            onBack={() => router.back()}
            onLike={handleLike}
            onFollow={handleFollow}
            onProfile={openProfile}
            onWantLook={wantLook}
            onComingSoon={() =>
              showBanner(t("comingSoon"), t("reelFeatureComingSoon"), "info", 2000)
            }
          />
        )}
      />
    </View>
  );
}
