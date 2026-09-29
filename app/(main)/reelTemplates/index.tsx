import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { MaterialIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import StackHeader from "@/src/components/StackHeader";
import { useNotificationContext } from "@/src/contexts/NotificationContext";
import { useTheme } from "@/src/hooks/hooks";
import Logger from "@/src/services/logger";
import { listReelTemplates } from "@/src/services/reelsService";
import { Theme } from "@/src/theme/colors";
import {
  heightScale,
  moderateHeightScale,
  moderateWidthScale,
  widthScale,
} from "@/src/theme/dimensions";
import { fontSize, fonts } from "@/src/theme/fonts";
import type { ReelTemplate } from "@/src/types/reels";

const TEMPLATE_CATEGORIES = [
  "all",
  "salon",
  "barbershop",
  "general",
  "uncategorized",
] as const;

type TemplateCategoryFilter = (typeof TEMPLATE_CATEGORIES)[number];

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.background,
    },
    filters: {
      paddingHorizontal: moderateWidthScale(16),
      paddingVertical: moderateHeightScale(10),
      gap: moderateWidthScale(8),
    },
    filterChip: {
      paddingHorizontal: moderateWidthScale(14),
      paddingVertical: moderateHeightScale(8),
      borderRadius: moderateWidthScale(999),
      backgroundColor: theme.lightGreen07,
      borderWidth: 1,
      borderColor: theme.borderLight,
    },
    filterChipActive: {
      backgroundColor: theme.buttonBack,
      borderColor: theme.buttonBack,
    },
    filterChipText: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
      textTransform: "capitalize",
    },
    filterChipTextActive: {
      color: theme.white,
    },
    listContent: {
      paddingHorizontal: moderateWidthScale(16),
      paddingBottom: moderateHeightScale(32),
      gap: moderateHeightScale(12),
    },
    columnWrapper: {
      gap: moderateWidthScale(12),
    },
    card: {
      flex: 1,
      backgroundColor: theme.white,
      borderRadius: moderateWidthScale(16),
      overflow: "hidden",
      borderWidth: 1,
      borderColor: theme.borderLight,
    },
    thumb: {
      width: "100%",
      height: heightScale(160),
      backgroundColor: theme.lightGreen07,
    },
    thumbPlaceholder: {
      alignItems: "center",
      justifyContent: "center",
    },
    cardBody: {
      paddingHorizontal: moderateWidthScale(10),
      paddingVertical: moderateHeightScale(10),
      gap: moderateHeightScale(4),
    },
    cardTitle: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    badgeRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: moderateWidthScale(4),
      marginTop: moderateHeightScale(2),
    },
    badge: {
      backgroundColor: theme.lightGreen015,
      borderRadius: moderateWidthScale(6),
      paddingHorizontal: moderateWidthScale(6),
      paddingVertical: moderateHeightScale(2),
    },
    badgeText: {
      fontSize: fontSize.size10,
      fontFamily: fonts.fontMedium,
      color: theme.lightGreen,
      textTransform: "capitalize",
    },
    metaText: {
      fontSize: fontSize.size11,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
    },
    musicRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(4),
      marginTop: moderateHeightScale(2),
    },
    emptyWrap: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: moderateWidthScale(32),
      paddingTop: moderateHeightScale(80),
    },
    emptyTitle: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      textAlign: "center",
      marginBottom: moderateHeightScale(6),
    },
    emptySubtitle: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      textAlign: "center",
    },
    loader: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
    },
  });

export default function ReelTemplatesScreen() {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { showBanner } = useNotificationContext();

  const [templates, setTemplates] = useState<ReelTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [category, setCategory] = useState<TemplateCategoryFilter>("all");

  const loadTemplates = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      try {
        const data = await listReelTemplates(
          category === "all" ? undefined : category,
        );
        setTemplates(data.filter((item) => item.is_active !== false));
      } catch (error: any) {
        Logger.error("Failed to load reel templates:", error);
        showBanner(
          t("error"),
          error?.message || t("failedToLoadTemplates"),
          "error",
          3000,
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [category, showBanner, t],
  );

  useEffect(() => {
    void loadTemplates();
  }, [loadTemplates]);

  const renderItem = useCallback(
    ({ item }: { item: ReelTemplate }) => {
      const mediaLabel =
        item.media_count === 1
          ? t("photosNeededOne")
          : t("photosNeeded", { count: item.media_count });

      return (
        <TouchableOpacity
          style={styles.card}
          activeOpacity={0.85}
          onPress={() =>
            router.push({
              pathname: "/(main)/reelTemplates/[id]" as any,
              params: { id: String(item.id) },
            })
          }
          accessibilityRole="button"
          accessibilityLabel={item.name}
        >
          {item.thumbnail_url ? (
            <Image
              source={{ uri: item.thumbnail_url }}
              style={styles.thumb}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.thumb, styles.thumbPlaceholder]}>
              <MaterialIcons
                name="movie"
                size={moderateWidthScale(36)}
                color={theme.lightGreen}
              />
            </View>
          )}
          <View style={styles.cardBody}>
            <Text style={styles.cardTitle} numberOfLines={2}>
              {item.name}
            </Text>
            <View style={styles.badgeRow}>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{item.category}</Text>
              </View>
              {(item.text_fields?.length ?? 0) > 0 ? (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{t("customizableText")}</Text>
                </View>
              ) : null}
            </View>
            <Text style={styles.metaText}>{mediaLabel}</Text>
            {item.has_music ? (
              <View style={styles.musicRow}>
                <MaterialIcons
                  name="music-note"
                  size={moderateWidthScale(14)}
                  color={theme.lightGreen}
                />
                <Text style={styles.metaText} numberOfLines={1}>
                  {item.music_name || t("includesMusic")}
                </Text>
              </View>
            ) : null}
          </View>
        </TouchableOpacity>
      );
    },
    [router, styles, t, theme.lightGreen],
  );

  return (
    <View style={[styles.safeArea, { paddingBottom: insets.bottom }]}>
      <StackHeader title={t("reelTemplates")} />

      <FlatList
        horizontal
        data={TEMPLATE_CATEGORIES as unknown as TemplateCategoryFilter[]}
        keyExtractor={(item) => item}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filters}
        renderItem={({ item }) => {
          const active = category === item;
          return (
            <TouchableOpacity
              style={[styles.filterChip, active && styles.filterChipActive]}
              onPress={() => setCategory(item)}
              activeOpacity={0.85}
            >
              <Text
                style={[
                  styles.filterChipText,
                  active && styles.filterChipTextActive,
                ]}
              >
                {item === "all" ? t("all") : item}
              </Text>
            </TouchableOpacity>
          );
        }}
        style={{ flexGrow: 0 }}
      />

      {loading && !refreshing ? (
        <View style={styles.loader}>
          <ActivityIndicator color={theme.buttonBack} />
        </View>
      ) : (
        <FlatList
          data={templates}
          keyExtractor={(item) => String(item.id)}
          numColumns={2}
          columnWrapperStyle={styles.columnWrapper}
          contentContainerStyle={styles.listContent}
          renderItem={renderItem}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadTemplates(true)}
              tintColor={theme.buttonBack}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyTitle}>{t("noTemplatesYet")}</Text>
              <Text style={styles.emptySubtitle}>
                {t("noTemplatesSubtitle")}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}
