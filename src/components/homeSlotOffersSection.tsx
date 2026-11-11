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
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useAppDispatch, useAppSelector, useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  moderateHeightScale,
  moderateWidthScale,
} from "@/src/theme/dimensions";
import Logger from "@/src/services/logger";
import { fetchSlotOffers } from "@/src/services/slotOfferService";
import type { SlotOffer } from "@/src/types/slotOffer";
import SlotOfferCard from "@/src/components/slotOffer/SlotOfferCard";
import InviteProBanner, {
  withInviteBanners,
} from "@/src/components/invitePro/InviteProBanner";
import { setGuestModeModalVisible } from "@/src/state/slices/generalSlice";

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
    dealIcon: {
      width: moderateWidthScale(8),
      height: moderateWidthScale(8),
      borderRadius: moderateWidthScale(4),
      backgroundColor: "#F59E0B",
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
    // Last-Minute Deals empty state (client sample 11-11)
    emptyCard: {
      marginHorizontal: moderateWidthScale(20),
      backgroundColor: theme.noticeCream,
      borderWidth: 1,
      borderColor: theme.goldBorder,
      borderRadius: moderateWidthScale(14),
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: moderateWidthScale(16),
      paddingVertical: moderateHeightScale(16),
      gap: moderateWidthScale(12),
    },
    emptyTextCol: {
      flex: 1,
    },
    emptyTitle: {
      fontSize: fontSize.size20,
      fontFamily: fonts.fontExtraBold,
      color: theme.darkGreen,
      lineHeight: fontSize.size20 * 1.25,
    },
    emptyBody: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      marginTop: moderateHeightScale(8),
      lineHeight: fontSize.size14 * 1.45,
    },
    emptyInvite: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
      marginTop: moderateHeightScale(4),
    },
    emptyButton: {
      backgroundColor: theme.orangeBrown,
      paddingHorizontal: moderateWidthScale(20),
      paddingVertical: moderateHeightScale(10),
      borderRadius: moderateWidthScale(999),
      flexDirection: "row",
      alignItems: "center",
      alignSelf: "flex-start",
      gap: moderateWidthScale(6),
      marginTop: moderateHeightScale(14),
    },
    emptyButtonText: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    emptyMedallion: {
      width: moderateWidthScale(64),
      height: moderateWidthScale(64),
      borderRadius: moderateWidthScale(32),
      backgroundColor: theme.orangeBrown01,
      alignItems: "center",
      justifyContent: "center",
    },
  });

export default function HomeSlotOffersSection() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const router = useRouter();
  const dispatch = useAppDispatch();
  const isGuest = useAppSelector((state: any) => state.user.isGuest);

  const lat = useAppSelector((state: any) => state.user.location?.lat);
  const lng = useAppSelector((state: any) => state.user.location?.long);

  const [items, setItems] = useState<SlotOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [emptyNearby, setEmptyNearby] = useState(false);
  const requestIdRef = useRef(0);

  const load = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    try {
      const hasLocation = lat != null && lng != null;
      const { items: deals } = await fetchSlotOffers({
        per_page: HOME_LIMIT,
        latitude: hasLocation ? Number(lat) : null,
        longitude: hasLocation ? Number(lng) : null,
      });
      if (requestId !== requestIdRef.current) return;
      setItems(deals);
      setEmptyNearby(deals.length === 0);
    } catch (err) {
      if (requestId !== requestIdRef.current) return;
      Logger.error("Failed to load home slot offers:", err);
      setEmptyNearby(false);
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }, [lat, lng]);

  const stripItems = useMemo(() => withInviteBanners(items ?? []), [items]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const showEmptyBanner =
    !loading && emptyNearby && (!items || items.length === 0);

  if (!loading && !showEmptyBanner && (!items || items.length === 0)) {
    return null;
  }

  const handleInvite = () => {
    if (isGuest) {
      dispatch(setGuestModeModalVisible(true));
      return;
    }
    router.push("/(main)/invitePro" as any);
  };

  return (
    <View style={styles.section}>
      <View style={styles.headerRow}>
        <View style={styles.titleRow}>
          <View style={styles.dealIcon} />
          <Text style={styles.title}>{t("sdLastMinuteDeals")}</Text>
        </View>
        {showEmptyBanner ? null : (
          <TouchableOpacity
            onPress={() => router.push("/(main)/slotOffers" as any)}
            activeOpacity={0.75}
            hitSlop={12}
            accessibilityRole="button"
          >
            <Text style={styles.seeAll}>{t("seeAll")}</Text>
          </TouchableOpacity>
        )}
      </View>
      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator color={theme.darkGreen} />
        </View>
      ) : showEmptyBanner ? (
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={handleInvite}
          style={styles.emptyCard}
          accessibilityRole="button"
        >
          <View style={styles.emptyTextCol}>
            <Text style={styles.emptyTitle}>{t("sdEmptyDealsTitle")}</Text>
            <Text style={styles.emptyBody}>{t("sdEmptyDealsBody")}</Text>
            <Text style={styles.emptyInvite}>
              {t("sdEmptyDealsInvite")}
            </Text>
            <View style={styles.emptyButton}>
              <Text style={styles.emptyButtonText}>{t("ipBannerCta")}</Text>
              <MaterialCommunityIcons
                name="arrow-right"
                size={moderateWidthScale(16)}
                color={theme.darkGreen}
              />
            </View>
          </View>
          <View style={styles.emptyMedallion}>
            <MaterialCommunityIcons
              name="clock-outline"
              size={moderateWidthScale(28)}
              color={theme.orangeBrown}
            />
          </View>
        </TouchableOpacity>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.listPad}
        >
          {stripItems.map((entry) =>
            entry.kind === "banner" ? (
              <InviteProBanner key={entry.key} variant="strip" />
            ) : (
              <SlotOfferCard key={entry.item.id} deal={entry.item} compact />
            ),
          )}
        </ScrollView>
      )}
    </View>
  );
}
