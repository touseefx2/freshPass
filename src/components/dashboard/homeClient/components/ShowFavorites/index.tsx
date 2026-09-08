import React, { useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
} from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { MaterialIcons } from "@expo/vector-icons";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { heightScale, widthScale } from "@/src/theme/dimensions";
import { StarIconSmall } from "@/assets/icons";
import { createStyles } from "./styles";

export interface FavoriteBusiness {
  id: number;
  businessName: string;
  address: string;
  rating: number;
  reviewCount: number;
  image: string | null;
  categoryName?: string | null;
  ownerName?: string | null;
}

interface ShowFavoritesProps {
  favorites: FavoriteBusiness[];
}

export default function ShowFavorites({ favorites }: ShowFavoritesProps) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);
  const router = useRouter();

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
            <Image
              source={{ uri: item.image ?? "" }}
              style={styles.image}
              resizeMode="cover"
            />
            <View style={styles.heartBadge}>
              <MaterialIcons
                name="favorite"
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
            <Text numberOfLines={1} style={styles.businessName}>
              {item.businessName}
            </Text>
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
