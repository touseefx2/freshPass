import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
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
  moderateHeightScale,
  moderateWidthScale,
} from "@/src/theme/dimensions";
import Button from "@/src/components/button";
import { ApiService } from "@/src/services/api";
import { businessEndpoints } from "@/src/services/endpoints";
import Logger from "@/src/services/logger";
import { resolveApiImageUrl } from "@/src/utils/media";
import { useNotificationContext } from "@/src/contexts/NotificationContext";

const SCREEN_WIDTH = Dimensions.get("window").width;
const PADDING = moderateWidthScale(20);
const GAP = moderateWidthScale(10);
const NUM_COLUMNS = 3;

const calculateItemWidth = () => {
  const availableWidth = SCREEN_WIDTH - PADDING * 2;
  const totalGaps = GAP * (NUM_COLUMNS - 1);
  return (availableWidth - totalGaps) / NUM_COLUMNS;
};

type PortfolioPhoto = {
  id: number;
  name?: string;
  path?: string;
  url?: string;
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    root: {
      flex: 1,
    },
    manageWrap: {
      paddingHorizontal: PADDING,
      paddingTop: moderateHeightScale(16),
      paddingBottom: moderateHeightScale(12),
    },
    listContent: {
      paddingHorizontal: PADDING,
      paddingBottom: moderateHeightScale(32),
      flexGrow: 1,
    },
    columnWrapper: {
      gap: GAP,
      marginBottom: GAP,
    },
    tile: {
      aspectRatio: 1,
      borderRadius: moderateWidthScale(8),
      overflow: "hidden",
      backgroundColor: theme.grey15,
      borderWidth: 1,
      borderColor: theme.borderLight,
    },
    photo: {
      width: "100%",
      height: "100%",
    },
    photoPlaceholder: {
      width: "100%",
      height: "100%",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.lightGreen07,
    },
    emptyWrap: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: moderateHeightScale(48),
      paddingHorizontal: moderateWidthScale(24),
    },
    emptyTitle: {
      marginTop: moderateHeightScale(12),
      fontSize: fontSize.size16,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      textAlign: "center",
    },
    emptySubtitle: {
      marginTop: moderateHeightScale(6),
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      textAlign: "center",
    },
    centerLoader: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: moderateHeightScale(48),
    },
  });

export default function MediaLibraryPhotosTab() {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();
  const router = useRouter();
  const { showBanner } = useNotificationContext();
  const itemWidth = useMemo(() => calculateItemWidth(), []);

  const [photos, setPhotos] = useState<PortfolioPhoto[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPhotos = useCallback(async () => {
    setLoading(true);
    try {
      const response = await ApiService.get<{
        success: boolean;
        message?: string;
        data?: { portfolio_photos?: PortfolioPhoto[] };
      }>(businessEndpoints.moduleData("portfolio"));

      if (response.success && response.data?.portfolio_photos) {
        setPhotos(response.data.portfolio_photos);
      } else {
        setPhotos([]);
      }
    } catch (error: any) {
      Logger.error("Failed to fetch portfolio photos:", error);
      showBanner(
        t("error"),
        error?.message || t("failedToLoadPhotos"),
        "error",
        3000,
      );
      setPhotos([]);
    } finally {
      setLoading(false);
    }
  }, [showBanner, t]);

  useFocusEffect(
    useCallback(() => {
      fetchPhotos();
    }, [fetchPhotos]),
  );

  const openPortfolioManager = useCallback(() => {
    router.push(
      "/(main)/dashboard/(account)/(businessProfileSettings)/portfolio",
    );
  }, [router]);

  const renderItem = useCallback(
    ({ item }: { item: PortfolioPhoto }) => {
      const uri = resolveApiImageUrl(item.url || item.path);
      return (
        <TouchableOpacity
          style={[styles.tile, { width: itemWidth }]}
          activeOpacity={0.85}
          onPress={openPortfolioManager}
        >
          {uri ? (
            <Image source={{ uri }} style={styles.photo} resizeMode="cover" />
          ) : (
            <View style={styles.photoPlaceholder}>
              <MaterialIcons
                name="image"
                size={moderateWidthScale(28)}
                color={theme.lightGreen}
              />
            </View>
          )}
        </TouchableOpacity>
      );
    },
    [itemWidth, openPortfolioManager, styles, theme],
  );

  return (
    <View style={styles.root}>
      <View style={styles.manageWrap}>
        <Button title={t("managePortfolioPhotos")} onPress={openPortfolioManager} />
      </View>

      {loading && photos.length === 0 ? (
        <View style={styles.centerLoader}>
          <ActivityIndicator size="large" color={theme.darkGreen} />
        </View>
      ) : (
        <FlatList
          data={photos}
          keyExtractor={(item) => String(item.id)}
          numColumns={NUM_COLUMNS}
          renderItem={renderItem}
          columnWrapperStyle={
            photos.length > 0 ? styles.columnWrapper : undefined
          }
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <MaterialIcons
                name="photo-library"
                size={moderateWidthScale(40)}
                color={theme.lightGreen}
              />
              <Text style={styles.emptyTitle}>{t("noPhotosYet")}</Text>
              <Text style={styles.emptySubtitle}>{t("noPhotosSubtitle")}</Text>
            </View>
          }
        />
      )}
    </View>
  );
}
