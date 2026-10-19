import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
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
    },
    loader: {
      paddingVertical: moderateHeightScale(20),
      alignItems: "center",
    },
    emptyCard: {
      marginHorizontal: moderateWidthScale(20),
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(12),
      backgroundColor: theme.white,
      borderRadius: moderateWidthScale(14),
      borderWidth: 1,
      borderColor: theme.lightGreen015,
      paddingHorizontal: moderateWidthScale(14),
      paddingVertical: moderateHeightScale(14),
    },
    emptyText: {
      flex: 1,
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen5,
    },
    emptyBtn: {
      paddingHorizontal: moderateWidthScale(14),
      paddingVertical: moderateHeightScale(8),
      borderRadius: moderateWidthScale(10),
      backgroundColor: theme.buttonBack,
    },
    emptyBtnText: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontBold,
      color: theme.buttonText,
    },
  });

/** Customer home strip: pros free right now, nearest first when location is set. */
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
        within_minutes: 0,
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

  const openAll = (withinMinutes = 0) =>
    router.push({
      pathname: "/(main)/availableNow",
      params: { within_minutes: String(withinMinutes) },
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
        <Text style={styles.seeAll} onPress={() => openAll(0)}>
          {t("seeAll")}
        </Text>
      </View>

      {loading && items.length === 0 ? (
        <View style={styles.loader}>
          <ActivityIndicator size="small" color={theme.darkGreen} />
        </View>
      ) : items.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>{t("anEmptyTitle")}</Text>
          <TouchableOpacity
            style={styles.emptyBtn}
            onPress={() => openAll(60)}
            activeOpacity={0.85}
          >
            <Text style={styles.emptyBtnText}>{t("anWidenNextHour")}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.listPad}
        >
          {items.map((item) => (
            <AvailableNowCard
              key={`${item.business.id}:${item.professional?.user_id ?? "biz"}`}
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
