import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  AppState,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import AppImage from "@/src/components/AppImage";
import { MaterialIcons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useIsFocused } from "@react-navigation/native";
import { useVideoPlayer, VideoView } from "expo-video";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  heightScale,
  moderateHeightScale,
  moderateWidthScale,
  widthScale,
} from "@/src/theme/dimensions";
import Logger from "@/src/services/logger";
import { fetchReelCategories } from "@/src/services/reelsService";
import type { ReelCategoryCard } from "@/src/types/reels";
import { resolveApiImageUrl } from "@/src/utils/media";
import RetryButton from "@/src/components/retryButton";

function formatViews(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

/**
 * Muted looping preview on the card in focus (like Instagram suggested reels).
 * Fades in over the thumbnail once the first frame is ready.
 */
function CardPreviewVideo({ uri }: { uri: string }) {
  const [ready, setReady] = useState(false);
  const player = useVideoPlayer(uri, (p) => {
    p.loop = true;
    p.muted = true;
    p.play();
  });

  useEffect(() => {
    // The OS pauses players in the background; carry on once the app is back
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") player.play();
    });
    return () => sub.remove();
  }, [player]);

  return (
    <VideoView
      player={player}
      style={[StyleSheet.absoluteFill, { opacity: ready ? 1 : 0 }]}
      contentFit="cover"
      nativeControls={false}
      // SurfaceView under overlays freezes on Android
      {...(Platform.OS === "android"
        ? { surfaceType: "textureView" as const }
        : null)}
      onFirstFrameRender={() => setReady(true)}
    />
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    section: {
      marginTop: moderateHeightScale(8),
      marginBottom: moderateHeightScale(8),
    },
    headerRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: moderateWidthScale(20),
      marginBottom: moderateHeightScale(12),
    },
    title: {
      fontSize: fontSize.size18,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    card: {
      width: widthScale(140),
      marginRight: moderateWidthScale(12),
    },
    thumbWrap: {
      width: "100%",
      height: heightScale(200),
      borderRadius: moderateWidthScale(12),
      overflow: "hidden",
      backgroundColor: theme.grey15,
    },
    thumb: {
      width: "100%",
      height: "100%",
    },
    viewsBadge: {
      position: "absolute",
      bottom: moderateHeightScale(8),
      left: moderateWidthScale(8),
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(4),
      backgroundColor: theme.lightGreen4,
      borderRadius: moderateWidthScale(4),
      paddingHorizontal: moderateWidthScale(6),
      paddingVertical: moderateHeightScale(2),
    },
    viewsText: {
      fontSize: fontSize.size11,
      fontFamily: fonts.fontMedium,
      color: theme.white,
    },
    categoryName: {
      marginTop: moderateHeightScale(8),
      fontSize: fontSize.size13,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    meta: {
      marginTop: moderateHeightScale(2),
      fontSize: fontSize.size11,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
    },
    listPad: {
      paddingHorizontal: moderateWidthScale(20),
    },
    loader: {
      paddingVertical: moderateHeightScale(24),
      alignItems: "center",
    },
    errorContainer: {
      paddingVertical: moderateHeightScale(20),
      paddingHorizontal: moderateWidthScale(20),
      alignItems: "center",
      justifyContent: "center",
      gap: moderateHeightScale(12),
    },
    errorText: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      textAlign: "center",
    },
  });

export default function HomeReelsSection({
  inView = true,
}: {
  /** Section is on screen in the parent scroll; previews stop when it isn't */
  inView?: boolean;
}) {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();
  const router = useRouter();
  const [cards, setCards] = useState<ReelCategoryCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const cardsRef = useRef(cards);
  cardsRef.current = cards;
  const isFocused = useIsFocused();
  // Card whose preview plays: slides from first to last as the row scrolls,
  // so every card gets a turn while fully visible
  const [activeIndex, setActiveIndex] = useState(0);
  const onRowScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
      const maxX = contentSize.width - layoutMeasurement.width;
      const last = cardsRef.current.length - 1;
      const next =
        maxX > 0 && last > 0
          ? Math.min(last, Math.max(0, Math.round((contentOffset.x / maxX) * last)))
          : 0;
      setActiveIndex((prev) => (prev === next ? prev : next));
    },
    [],
  );

  const load = useCallback(async () => {
    // Show loader only when we don't already have data
    if (cardsRef.current.length === 0) {
      setLoading(true);
    }
    setError(false);
    try {
      const data = await fetchReelCategories();
      setCards(data);
      setError(false);
    } catch (err) {
      Logger.error("Failed to load reel categories:", err);
      if (cardsRef.current.length <= 0) {
        setError(true);
        setCards([]);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const openFeed = useCallback(
    (card: ReelCategoryCard) => {
      const firstId = card.cover_reel?.id;
      if (!firstId) return;
      router.push({
        pathname: "/(main)/reelsFeed" as any,
        params: {
          category_id: String(card.id),
          first_reel_id: String(firstId),
        },
      });
    },
    [router],
  );

  if (!loading && !error && cards.length === 0) {
    return null;
  }

  return (
    <View style={styles.section}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>{t("freshPassReels")}</Text>
      </View>

      {loading && cards.length === 0 ? (
        <View style={styles.loader}>
          <ActivityIndicator size="small" color={theme.darkGreen} />
        </View>
      ) : error && cards.length === 0 ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{t("failedToLoadReels")}</Text>
          <RetryButton onPress={load} loading={loading} />
        </View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.listPad}
          onScroll={onRowScroll}
          scrollEventThrottle={100}
        >
          {cards.map((card, index) => {
            const thumb = resolveApiImageUrl(
              card.cover_reel?.video?.thumbnail_url,
            );
            const previewUri =
              index === activeIndex && inView && isFocused
                ? resolveApiImageUrl(card.cover_reel?.video?.playback_url)
                : null;
            return (
              <TouchableOpacity
                key={card.id}
                style={styles.card}
                activeOpacity={0.85}
                onPress={() => openFeed(card)}
              >
                <View style={styles.thumbWrap}>
                  {thumb ? (
                    <AppImage
                      uri={thumb}
                      style={styles.thumb}
                      resizeMode="cover"
                    />
                  ) : (
                    <View
                      style={[
                        styles.thumb,
                        {
                          alignItems: "center",
                          justifyContent: "center",
                          backgroundColor: theme.lightGreen07,
                        },
                      ]}
                    >
                      <MaterialIcons
                        name="play-circle-filled"
                        size={moderateWidthScale(36)}
                        color={theme.lightGreen}
                      />
                    </View>
                  )}
                  {previewUri ? (
                    <CardPreviewVideo key={previewUri} uri={previewUri} />
                  ) : null}
                  <View style={styles.viewsBadge}>
                    <MaterialIcons
                      name="visibility"
                      size={moderateWidthScale(12)}
                      color={theme.white}
                    />
                    <Text style={styles.viewsText}>
                      {formatViews(card.total_views || 0)}
                    </Text>
                  </View>
                </View>
                <Text style={styles.categoryName} numberOfLines={1}>
                  {card.name}
                </Text>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    marginTop: moderateHeightScale(2),
                  }}
                >
                  <Text
                    style={[styles.meta, { marginTop: 0, flexShrink: 1 }]}
                    numberOfLines={1}
                  >
                    {card.cover_reel?.business?.title ||
                      card.cover_reel?.caption ||
                      ""}
                  </Text>
                  {card.cover_reel?.business?.is_official ? (
                    <MaterialIcons
                      name="verified"
                      size={moderateWidthScale(12)}
                      color={theme.green}
                      style={{ marginLeft: moderateWidthScale(4) }}
                    />
                  ) : null}
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}
