import React, { useMemo } from "react";
import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import {
  heightScale,
  moderateHeightScale,
  moderateWidthScale,
  widthScale,
} from "@/src/theme/dimensions";
import {
  PlatformVerifiedStarIcon,
  StarIconSmall,
} from "@/assets/icons";
import RetryButton from "@/src/components/retryButton";
import { createStyles } from "./styles";

interface VerifiedSalon {
  id: number;
  businessName: string;
  address: string;
  rating: number;
  reviewCount: number;
  image: string | null;
}

interface ShowBusinessProps {
  businessesLoading: boolean;
  businessesError: boolean;
  verifiedSalons: VerifiedSalon[];
  onRetry: () => void;
}

export default function ShowBusinessList({
  businessesLoading,
  businessesError,
  verifiedSalons,
  onRetry,
}: ShowBusinessProps) {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);
  const router = useRouter();

  const renderCard = ({ item: salon }: { item: VerifiedSalon }) => (
    <View style={styles.verifiedSalonCardNew}>
      <Image
        source={{ uri: salon.image ?? "" }}
        style={styles.verifiedSalonImage}
        resizeMode="cover"
      />
      <View style={styles.verifiedSalonContent}>
        <View style={styles.platformVerifiedBadge}>
          <PlatformVerifiedStarIcon
            width={widthScale(10)}
            height={heightScale(10)}
          />
          <Text style={styles.platformVerifiedText}>Platform verified</Text>
        </View>
        <View style={styles.businessInfoContainer}>
          <Text
            numberOfLines={1}
            style={styles.verifiedSalonBusinessName}
          >
            {salon.businessName}
          </Text>
          <Text numberOfLines={1} style={styles.verifiedSalonAddress}>
            {salon.address}
          </Text>
        </View>
        <View style={styles.verifiedSalonBottomRow}>
          <View style={styles.verifiedSalonRatingButton}>
            <StarIconSmall
              width={widthScale(12)}
              height={heightScale(12)}
              color={theme.orangeBrown}
            />
            <Text style={styles.verifiedSalonRatingText}>
              {salon.rating || 0}/ {salon.reviewCount || 0} reviews
            </Text>
          </View>
          <TouchableOpacity
            style={styles.verifiedSalonViewDetail}
            onPress={() => {
              router.push({
                pathname: "/(main)/businessDetail",
                params: { business_id: salon.id.toString() },
              } as any);
            }}
          >
            <Text style={styles.verifiedSalonViewDetailText}>View detail</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const ListEmpty = () => {
    if (businessesLoading) {
      return (
        <View style={[styles.loadingContainer, { alignSelf: "stretch" }]}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      );
    }
    if (businessesError) {
      return (
        <View style={[styles.errorContainer, { alignSelf: "stretch" }]}>
          <Text style={styles.errorText}>Failed to load businesses</Text>
          <RetryButton onPress={onRetry} loading={businessesLoading} />
        </View>
      );
    }
    return (
      <View style={[styles.emptyContainer, { alignSelf: "stretch" }]}>
        <Text style={styles.emptyText}>No businesses found</Text>
      </View>
    );
  };

  return (
    <FlatList
      data={verifiedSalons}
      renderItem={renderCard}
      keyExtractor={(item) => item.id.toString()}
      ListEmptyComponent={ListEmpty}
      ItemSeparatorComponent={() => (
        <View style={{ height: moderateHeightScale(12) }} />
      )}
      style={styles.appCard}
      contentContainerStyle={{
        paddingHorizontal: moderateWidthScale(20),
        paddingVertical: moderateHeightScale(12),
        flexGrow: 1,
      }}
      showsVerticalScrollIndicator={false}
      nestedScrollEnabled
    />
  );
}
