import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useAppSelector, useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  moderateHeightScale,
  moderateWidthScale,
} from "@/src/theme/dimensions";
import Logger from "@/src/services/logger";
import { fetchAvailableNow } from "@/src/services/availableNowService";
import type { AvailableNowListItem } from "@/src/types/availableNow";
import { HIRING_CORNER_OVERHANG } from "@/src/components/jobs/jobBadges";
import AvailableNowCard, {
  bookAvailableNow,
  openAvailableNowProfile,
} from "@/src/components/availableNow/AvailableNowCard";

const HOME_LIMIT = 10;

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    section: {
      marginTop: moderateHeightScale(16),
    },
    headerRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: moderateWidthScale(20),
      marginBottom: moderateHeightScale(12),
    },
    titleRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(8),
    },
    liveDot: {
      width: moderateWidthScale(8),
      height: moderateWidthScale(8),
      borderRadius: moderateWidthScale(4),
      backgroundColor: theme.green,
    },
    title: {
      fontSize: fontSize.size20,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    seeAll: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
      textDecorationLine: "underline",
    },
    listPad: {
      paddingHorizontal: moderateWidthScale(20),
      gap: moderateWidthScale(12),
    },
    // Room above the cards for the hiring corner badge (only when needed)
    listPadHiring: {
      paddingTop: HIRING_CORNER_OVERHANG,
    },
    loader: {
      paddingVertical: moderateHeightScale(20),
      alignItems: "center",
    },
    emptyCard: {
      marginHorizontal: moderateWidthScale(20),
      backgroundColor: theme.white,
      borderRadius: moderateWidthScale(14),
      borderWidth: 1,
      borderColor: theme.lightGreen015,
      paddingHorizontal: moderateWidthScale(14),
      paddingVertical: moderateHeightScale(14),
    },
    emptyText: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen5,
    },
  });

/** Customer home strip: businesses with free time left today, soonest then nearest. */
export default function HomeAvailableNowSection() {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();
  const router = useRouter();
  const lat = useAppSelector((state) => state.user.location?.lat);
  const lng = useAppSelector((state) => state.user.location?.long);

  const [items, setItems] = useState<AvailableNowListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const itemsRef = useRef(items);
  itemsRef.current = items;

  const load = useCallback(async () => {
    if (itemsRef.current.length === 0) setLoading(true);
    try {
      const { items: list } = await fetchAvailableNow({
        latitude: lat != null && lng != null ? Number(lat) : undefined,
        longitude: lat != null && lng != null ? Number(lng) : undefined,
        per_page: HOME_LIMIT,
      });
      setItems(list);
      setFailed(false);
    } catch (error) {
      Logger.error("Failed to load home Available Now:", error);
      if (itemsRef.current.length === 0) setFailed(true);
    } finally {
      setLoading(false);
    }
  }, [lat, lng]);

  // Live: goes stale within minutes, so re-fetch every time home is focused
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  // Same range as the strip: the rest of today
  const openAll = () =>
    router.push({
      pathname: "/(main)/availableNow",
      params: { within_minutes: "1440" },
    } as any);

  // Optional section — hide on error rather than show a broken strip
  if (failed && items.length === 0) return null;

  return (
    <View style={styles.section}>
      <View style={styles.headerRow}>
        <View style={styles.titleRow}>
          <View style={styles.liveDot} />
          <Text style={styles.title}>{t("availableNow")}</Text>
        </View>
        <Text style={styles.seeAll} onPress={openAll}>
          {t("seeAll")}
        </Text>
      </View>

      {loading && items.length === 0 ? (
        <View style={styles.loader}>
          <ActivityIndicator size="small" color={theme.darkGreen} />
        </View>
      ) : items.length === 0 ? (
        // Nothing left today, so a wider list would be empty too
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>{t("anHomeEmpty")}</Text>
        </View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[
            styles.listPad,
            items.some((i) => i.business?.is_hiring) && styles.listPadHiring,
          ]}
        >
          {items.map((item) => (
            <AvailableNowCard
              key={item.business.id}
              item={item}
              compact
              onPress={(i) => openAvailableNowProfile(router, i)}
              onBook={(i) => bookAvailableNow(router, i)}
            />
          ))}
        </ScrollView>
      )}
    </View>
  );
}
