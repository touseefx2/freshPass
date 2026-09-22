import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
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

function formatViews(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
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
  });

export default function HomeReelsSection() {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();
  const router = useRouter();
  const [cards, setCards] = useState<ReelCategoryCard[]>([]);
  const [loading, setLoading] = useState(true);
  const cardsRef = useRef(cards);
  cardsRef.current = cards;

  const load = useCallback(async () => {
    // Show loader only when we don't already have data
    if (cardsRef.current.length === 0) {
      setLoading(true);
    }
    try {
      const data = await fetchReelCategories();
      setCards(data);
    } catch (error) {
      Logger.error("Failed to load reel categories:", error);
      setCards([]);
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

  if (!loading && cards.length === 0) {
    return null;
  }

  return (
    <View style={styles.section}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>{t("freshPassReels")}</Text>
      </View>

      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="small" color={theme.darkGreen} />
        </View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.listPad}
        >
          {cards.map((card) => {
            const thumb = resolveApiImageUrl(
              card.cover_reel?.video?.thumbnail_url,
            );
            return (
              <TouchableOpacity
                key={card.id}
                style={styles.card}
                activeOpacity={0.85}
                onPress={() => openFeed(card)}
              >
                <View style={styles.thumbWrap}>
                  {thumb ? (
                    <Image
                      source={{ uri: thumb }}
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
                  <Text style={[styles.meta, { marginTop: 0, flexShrink: 1 }]} numberOfLines={1}>
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
