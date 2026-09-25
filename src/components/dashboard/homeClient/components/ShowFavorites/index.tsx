import React, { useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import AppImage from "@/src/components/AppImage";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { MaterialIcons } from "@expo/vector-icons";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { heightScale, widthScale } from "@/src/theme/dimensions";
import { StarIconSmall } from "@/assets/icons";
import RetryButton from "@/src/components/retryButton";
import { createStyles } from "./styles";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export interface FavoriteBusiness {
  id: number;
  businessName: string;
  address: string;
  rating: number;
  reviewCount: number;
  image: string | null;
  categoryName?: string | null;
  ownerName?: string | null;
  isOfficial?: boolean;
}

interface ShowFavoritesProps {
  favorites: FavoriteBusiness[];
  loading?: boolean;
  error?: boolean;
  onRetry?: () => void;
}

export default function ShowFavorites({
  favorites,
  loading = false,
  error = false,
  onRetry,
}: ShowFavoritesProps) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);
  const router = useRouter();

  if (loading && favorites.length === 0) {
    return (
      <View style={[styles.loadingContainer, { width: SCREEN_WIDTH }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  if (error && favorites.length === 0) {
    return (
      <View style={[styles.errorContainer, { width: SCREEN_WIDTH }]}>
        <Text style={styles.errorText}>{t("failedToLoadFollowing")}</Text>
        {onRetry ? (
          <RetryButton onPress={onRetry} loading={loading} />
        ) : null}
      </View>
    );
  }

  if (favorites.length === 0) {
    return null;
  }

  return (
    <ScrollView
      horizontal
      decelerationRate={0.8}
      showsHorizontalScrollIndicator={false}
      style={styles.scroll}
      contentContainerStyle={styles.scrollContent}
      nestedScrollEnabled
    >
      {favorites.map((item) => (
        <TouchableOpacity
          key={item.id}
          activeOpacity={0.9}
          style={styles.card}
          onPress={() => {
            router.push({
              pathname: "/(main)/businessDetail",
              params: { business_id: item.id.toString() },
            } as any);
          }}
        >
          <View style={styles.imageWrap}>
            <AppImage
              uri={item.image}
              style={styles.image}
              iconSize={widthScale(36)}
              iconColor={theme.white50}
            />
            <View style={styles.heartBadge}>
              <MaterialIcons
                name={item.isOfficial ? "verified" : "person"}
                size={widthScale(16)}
                color={theme.white}
              />
            </View>
            {!!item.categoryName && (
              <View style={styles.categoryBadge}>
                <Text numberOfLines={1} style={styles.categoryText}>
                  {item.categoryName}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.content}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: widthScale(4),
              }}
            >
              <Text
                numberOfLines={1}
                style={[styles.businessName, { flexShrink: 1 }]}
              >
                {item.businessName}
              </Text>
              {item.isOfficial ? (
                <MaterialIcons
                  name="verified"
                  size={widthScale(14)}
                  color={theme.green}
                />
              ) : null}
            </View>
            {!!item.ownerName && (
              <Text numberOfLines={1} style={styles.ownerName}>
                {t("ownedBy", { name: item.ownerName })}
              </Text>
            )}
            <Text numberOfLines={1} style={styles.address}>
              {item.address}
            </Text>
            <View style={styles.ratingRow}>
              <StarIconSmall
                width={widthScale(12)}
                height={heightScale(12)}
                color={theme.orangeBrown}
              />
              <Text style={styles.ratingText}>
                {item.rating || 0} · {item.reviewCount || 0} reviews
              </Text>
            </View>
          </View>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}
