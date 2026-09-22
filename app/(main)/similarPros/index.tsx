import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useAppSelector, useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  moderateHeightScale,
  moderateWidthScale,
  widthScale,
} from "@/src/theme/dimensions";
import StackHeader from "@/src/components/StackHeader";
import EmptyState from "@/src/components/emptyState";
import { useNotificationContext } from "@/src/contexts/NotificationContext";
import Logger from "@/src/services/logger";
import { fetchSimilarPros } from "@/src/services/reelsService";
import { resolveApiImageUrl } from "@/src/utils/media";

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: theme.background },
    listContent: {
      flexGrow: 1,
      paddingHorizontal: moderateWidthScale(16),
      paddingBottom: moderateHeightScale(24),
      gap: moderateHeightScale(12),
    },
    card: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(12),
      padding: moderateWidthScale(12),
      borderRadius: moderateWidthScale(14),
      backgroundColor: theme.white,
      borderWidth: 1,
      borderColor: theme.borderLight,
    },
    avatar: {
      width: widthScale(56),
      height: widthScale(56),
      borderRadius: moderateWidthScale(12),
      backgroundColor: theme.grey15,
    },
    textCol: { flex: 1, gap: moderateHeightScale(2) },
    title: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    subtitle: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
    },
    center: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
    },
  });

function businessLabel(item: any): string {
  return (
    item?.title ||
    item?.business_title ||
    item?.name ||
    item?.businessName ||
    "Business"
  );
}

function businessImage(item: any): string | null {
  return (
    resolveApiImageUrl(
      item?.image_url ||
        item?.logo_url ||
        item?.businessLogoUrl ||
        item?.image ||
        null,
    ) || null
  );
}

function businessMeta(item: any): string {
  const parts: string[] = [];
  if (item?.distance_km != null) {
    parts.push(`${Number(item.distance_km).toFixed(1)} km`);
  }
  if (item?.city) parts.push(String(item.city));
  else if (item?.complete_address) parts.push(String(item.complete_address));
  return parts.join(" · ");
}

export default function SimilarProsScreen() {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);
  const { t } = useTranslation();
  const router = useRouter();
  const { showBanner } = useNotificationContext();
  const user = useAppSelector((s) => s.user);
  const params = useLocalSearchParams<{ reel_id?: string }>();
  const reelId = params.reel_id ? Number(params.reel_id) : null;

  const [businesses, setBusinesses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [radiusKm, setRadiusKm] = useState(20);

  const coords = useMemo(() => {
    const lat = user.location?.lat;
    const lng = user.location?.long;
    if (lat == null || lng == null) return undefined;
    return { latitude: lat, longitude: lng };
  }, [user.location?.lat, user.location?.long]);

  const load = useCallback(
    async (radius: number) => {
      if (!reelId) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const { businesses: list } = await fetchSimilarPros(reelId, {
          latitude: coords?.latitude,
          longitude: coords?.longitude,
          radius_km: radius,
          per_page: 10,
        });
        if (list.length === 0 && radius < 50) {
          const wider = radius * 2;
          setRadiusKm(wider);
          const retry = await fetchSimilarPros(reelId, {
            latitude: coords?.latitude,
            longitude: coords?.longitude,
            radius_km: wider,
            per_page: 10,
          });
          setBusinesses(retry.businesses);
        } else {
          setBusinesses(list);
          setRadiusKm(radius);
        }
      } catch (error: any) {
        Logger.error("Failed to load similar pros:", error);
        showBanner(
          t("error"),
          error?.message || t("failedToLoadSimilarPros"),
          "error",
          3000,
        );
      } finally {
        setLoading(false);
      }
    },
    [coords, reelId, showBanner, t],
  );

  useFocusEffect(
    useCallback(() => {
      void load(20);
    }, [load]),
  );

  const openBusiness = useCallback(
    (item: any) => {
      const id = item?.id ?? item?.business_id;
      if (!id) return;
      router.push({
        pathname: "/(main)/businessDetail",
        params: {
          business_id: String(id),
          ...(reelId ? { reel_id: String(reelId) } : {}),
        },
      });
    },
    [reelId, router],
  );

  return (
    <View style={styles.root}>
      <StackHeader title={t("findAnotherPro")} />
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.darkGreen} />
        </View>
      ) : (
        <FlatList
          data={businesses}
          keyExtractor={(item, index) =>
            String(item?.id ?? item?.business_id ?? index)
          }
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <EmptyState
              icon="storefront"
              title={t("noSimilarPros")}
              subtitle={t("noSimilarProsSubtitle", { radius: radiusKm })}
            />
          }
          renderItem={({ item }) => {
            const uri = businessImage(item);
            const meta = businessMeta(item);
            return (
              <TouchableOpacity
                style={styles.card}
                activeOpacity={0.85}
                onPress={() => openBusiness(item)}
              >
                {uri ? (
                  <Image source={{ uri }} style={styles.avatar} />
                ) : (
                  <View style={[styles.avatar, styles.center]}>
                    <MaterialIcons
                      name="storefront"
                      size={moderateWidthScale(24)}
                      color={theme.lightGreen}
                    />
                  </View>
                )}
                <View style={styles.textCol}>
                  <Text style={styles.title} numberOfLines={1}>
                    {businessLabel(item)}
                  </Text>
                  {meta ? (
                    <Text style={styles.subtitle} numberOfLines={2}>
                      {meta}
                    </Text>
                  ) : null}
                </View>
                <MaterialIcons
                  name="chevron-right"
                  size={moderateWidthScale(22)}
                  color={theme.lightGreen}
                />
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
  );
}
