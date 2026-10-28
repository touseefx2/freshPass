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
import { useTheme } from "@/src/hooks/hooks";
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

  const [items, setItems] = useState<SlotOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const requestIdRef = useRef(0);

  const load = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    try {
      const { items: deals } = await fetchSlotOffers({ per_page: HOME_LIMIT });
      if (requestId !== requestIdRef.current) return;
      setItems(deals);
    } catch (err) {
      if (requestId !== requestIdRef.current) return;
      Logger.error("Failed to load home slot offers:", err);
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  if (!loading && (!items || items.length === 0)) return null;

  return (
    <View style={styles.section}>
      <View style={styles.headerRow}>
        <View style={styles.titleRow}>
          <View style={styles.dealIcon} />
          <Text style={styles.title}>{t("sdLastMinuteDeals")}</Text>
        </View>
        <TouchableOpacity
          onPress={() => router.push("/(main)/slotOffers" as any)}
          activeOpacity={0.75}
          accessibilityRole="button"
        >
          <Text style={styles.seeAll}>{t("seeAll")}</Text>
        </TouchableOpacity>
      </View>
      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator color={theme.darkGreen} />
        </View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.listPad}
        >
          {(items ?? []).map((deal) => (
            <SlotOfferCard key={deal.id} deal={deal} compact />
          ))}
        </ScrollView>
      )}
    </View>
  );
}
