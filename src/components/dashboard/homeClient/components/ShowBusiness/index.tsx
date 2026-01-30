import React, { useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { useRouter } from "expo-router";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { heightScale, widthScale } from "@/src/theme/dimensions";
import { PlatformVerifiedStarIcon, StarIconSmall } from "@/assets/icons";
import RetryButton from "@/src/components/retryButton";
import { createStyles } from "./styles";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

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

export default function ShowBusiness({
  businessesLoading,
  businessesError,
  verifiedSalons,
  onRetry,
}: ShowBusinessProps) {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);
  const router = useRouter();

  return (
    <ScrollView
      decelerationRate={0.8}
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.appCard}
      contentContainerStyle={styles.appointmentsScroll}
      nestedScrollEnabled={true}
    >
      {businessesLoading && verifiedSalons.length <= 0 ? (
        <View
          style={[
            styles.loadingContainer,
            {
              width: SCREEN_WIDTH,
            },
          ]}
        >
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : businessesError ? (
        <View
          style={[
            styles.errorContainer,
            {
              width: SCREEN_WIDTH,
            },
          ]}
        >
          <Text style={styles.errorText}>Failed to load businesses</Text>
          <RetryButton onPress={onRetry} loading={businessesLoading} />
        </View>
      ) : verifiedSalons.length > 0 ? (
        verifiedSalons.map((salon) => (
          <View key={salon.id} style={[styles.verifiedSalonCardNew]}>
            <Image
              source={{
                uri: salon.image ?? "",
              }}
              style={styles.verifiedSalonImage}
              resizeMode="cover"
            />

            <View style={styles.verifiedSalonContent}>
              <View style={styles.platformVerifiedBadge}>
                <PlatformVerifiedStarIcon
                  width={widthScale(10)}
                  height={heightScale(10)}
                />
                <Text style={styles.platformVerifiedText}>
                  Platform verified
                </Text>
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
                  <Text style={styles.verifiedSalonViewDetailText}>
                    View detail
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ))
      ) : (
        <View
          style={[
            styles.emptyContainer,
            {
              width: SCREEN_WIDTH,
            },
          ]}
        >
          <Text style={styles.emptyText}>No businesses found</Text>
        </View>
      )}
    </ScrollView>
  );
}
