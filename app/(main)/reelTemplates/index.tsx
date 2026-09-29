import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { MaterialIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import ReelTemplateCardThumb from "@/src/components/reelTemplateCardThumb";
import StackHeader from "@/src/components/StackHeader";
import { useNotificationContext } from "@/src/contexts/NotificationContext";
import { useTheme } from "@/src/hooks/hooks";
import Logger from "@/src/services/logger";
import { listReelTemplates } from "@/src/services/reelsService";
import { Theme } from "@/src/theme/colors";
import {
  moderateHeightScale,
  moderateWidthScale,
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
    tabBarWrap: {
      flexShrink: 0,
      minHeight: moderateHeightScale(52),
      justifyContent: "center",
      backgroundColor: theme.background,
      borderBottomWidth: 1,
      borderBottomColor: theme.borderLight,
      zIndex: 2,
    },
    tabBarContent: {
      paddingHorizontal: moderateWidthScale(16),
      paddingVertical: moderateHeightScale(10),
      flexDirection: "row",
      alignItems: "center",
    },
    filterChip: {
      marginRight: moderateWidthScale(8),
      paddingHorizontal: moderateWidthScale(16),
      paddingVertical: moderateHeightScale(8),
      borderRadius: moderateWidthScale(999),
      backgroundColor: theme.white,
      borderWidth: 1,
      borderColor: theme.borderLight,
    },
    list: {
      flex: 1,
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
      includeFontPadding: false,
      textAlignVertical: "center",
    },
    filterChipTextActive: {
      color: theme.white,
      fontFamily: fonts.fontBold,
    },
    listContent: {
      paddingHorizontal: moderateWidthScale(16),
      paddingTop: moderateHeightScale(14),
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
      shadowColor: theme.shadow,
      shadowOffset: { width: 0, height: moderateHeightScale(2) },
      shadowOpacity: 0.06,
      shadowRadius: moderateWidthScale(6),
      elevation: 2,
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

function formatMusicName(name: string | null): string {
  if (!name?.trim()) return "";
  return name.replace(/\.(mp3|wav|m4a|aac)$/i, "").replace(/-/g, " ");
}

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
      const musicLabel = formatMusicName(item.music_name);

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
          <ReelTemplateCardThumb
            templateId={item.id}
            thumbnailUrl={item.thumbnail_url}
            previewVideoUrl={item.preview_video_url}
          />
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
                  {musicLabel || t("includesMusic")}
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

      <View style={styles.tabBarWrap}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          bounces={false}
          nestedScrollEnabled
          contentContainerStyle={styles.tabBarContent}
        >
          {TEMPLATE_CATEGORIES.map((item) => {
            const active = category === item;
            return (
              <TouchableOpacity
                key={item}
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
          })}
        </ScrollView>
      </View>

      {loading && !refreshing ? (
        <View style={styles.loader}>
          <ActivityIndicator color={theme.buttonBack} />
        </View>
      ) : (
        <FlatList
          style={styles.list}
          data={templates}
          keyExtractor={(item) => String(item.id)}
          numColumns={2}
          nestedScrollEnabled
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
