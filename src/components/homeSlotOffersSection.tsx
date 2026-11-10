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
import { MaterialIcons } from "@expo/vector-icons";
import { useAppSelector, useTheme } from "@/src/hooks/hooks";
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
  });

export default function HomeSlotOffersSection() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const router = useRouter();

  // Customer location, both or neither (the server sets the 20-mile area)
  const lat = useAppSelector((state: any) => state.user.location?.lat);
  const lng = useAppSelector((state: any) => state.user.location?.long);

  const [items, setItems] = useState<SlotOffer[]>([]);
  const [loading, setLoading] = useState(true);
  // Last load succeeded with no deals → Invite a Pro banner instead of the
  // strip. An error keeps today's behaviour (strip hidden).
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
        <InviteProBanner variant="standalone" />
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
