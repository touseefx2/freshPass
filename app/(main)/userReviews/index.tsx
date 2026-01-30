import React, { useMemo, useState, useEffect, useCallback } from "react";
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  Image,
  ActivityIndicator,
  StatusBar,
} from "react-native";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  moderateHeightScale,
  moderateWidthScale,
  widthScale,
} from "@/src/theme/dimensions";
import StackHeader from "@/src/components/StackHeader";
import { MaterialIcons } from "@expo/vector-icons";
import { ApiService } from "@/src/services/api";
import { reviewsEndpoints } from "@/src/services/endpoints";
import { useNotificationContext } from "@/src/contexts/NotificationContext";
import { Skeleton } from "@/src/components/skeletons";
import dayjs from "dayjs";
import { useLocalSearchParams } from "expo-router";

type Review = {
  id: number;
  business_id: number;
  business: {
    id: number;
    title: string;
  };
  user_id: number;
  user: {
    id: number;
    name: string | null;
    email: string;
    profile_image_url: string | null;
  };
  overall_rating: string;
  comment: string;
  review_suggestion_id: number | null;
  review_suggestion: {
    id: number;
    title: string;
  } | null;
  created_at: string;
};

type ReviewsResponse = {
  success: boolean;
  message: string;
  data: Review[];
  meta: {
    current_page: number;
    per_page: number;
    total: number;
    last_page: number;
  };
  averages: {
    overall_average_rating: number;
  };
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    contentContainer: {
      flexGrow: 1,
      paddingBottom: moderateHeightScale(24),
    },
    headerSection: {
      paddingHorizontal: moderateWidthScale(20),
      paddingTop: moderateHeightScale(20),
      paddingBottom: moderateHeightScale(12),
    },
    averageText: {
      fontSize: fontSize.size32,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    countLabel: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      marginBottom: moderateHeightScale(12),
    },
    card: {
      backgroundColor: theme.lightBeige,
      borderRadius: moderateWidthScale(8),
      paddingVertical: moderateHeightScale(16),
      paddingHorizontal: moderateWidthScale(16),
      borderWidth: 1,
      borderColor: theme.lightGreen2,
      marginBottom: moderateHeightScale(16),
      marginHorizontal: moderateWidthScale(20),
    },
    cardHeaderRow: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: moderateHeightScale(8),
    },
    avatar: {
      width: widthScale(42),
      height: widthScale(42),
      borderRadius: moderateWidthScale(4),
      borderWidth: 1,
      borderColor: theme.borderLight,
      overflow: "hidden",
      alignItems: "center",
      justifyContent: "center",
      marginRight: moderateWidthScale(12),
    },
    avatarImage: {
      width: "100%",
      height: "100%",
      overflow: "hidden",
      borderRadius: moderateWidthScale(4),
    },
    nameText: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    dateText: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      marginTop: moderateHeightScale(4),
    },
    starsRow: {
      flexDirection: "row",
      marginBottom: moderateHeightScale(12),
    },
    starIcon: {
      marginRight: moderateWidthScale(4),
    },
    reviewSuggestionTitle: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontBold,
      color: theme.selectCard,
      marginBottom: moderateHeightScale(8),
    },
    reviewText: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.darkGreen,
      lineHeight: moderateHeightScale(20),
    },
    seeMoreText: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontBold,
      color: theme.selectCard,
      textDecorationLine: "underline",
      textDecorationColor: theme.selectCard,
      marginTop: moderateHeightScale(8),
    },
    emptyStateContainer: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: moderateHeightScale(40),
    },
    emptyStateText: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      textAlign: "center",
    },
    loadingFooter: {
      paddingVertical: moderateHeightScale(20),
      alignItems: "center",
    },
  });

const textWrapLength = 145;
const DEFAULT_AVATAR_URL =
  "https://imgcdn.stablediffusionweb.com/2024/3/24/3b153c48-649f-4ee2-b1cc-3d45333db028.jpg";

export default function UserReviewsScreen() {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);
  const { showBanner } = useNotificationContext();
  const params = useLocalSearchParams<{
    business_id?: string;
    user_id?: string;
  }>();

  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalReviews, setTotalReviews] = useState(0);
  const [averageRating, setAverageRating] = useState(0);
  const [expandedReviews, setExpandedReviews] = useState<
    Record<string, boolean>
  >({});

  const fetchReviews = useCallback(
    async (page: number = 1, append: boolean = false) => {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }

      try {
        const apiParams: {
          page: number;
          per_page: number;
          business_id?: string;
          user_id?: string;
        } = {
          page,
          per_page: 10,
        };

        // Add business_id if it exists in params
        if (params.business_id) {
          apiParams.business_id = params.business_id;
        }

        // Add user_id if it exists in params
        // if (params.user_id) {
        //   apiParams.user_id = params.user_id;
        // }

        const response = await ApiService.get<ReviewsResponse>(
          reviewsEndpoints.list(apiParams),
        );

        if (response.success && response.data) {
          if (append) {
            setReviews((prev) => [...prev, ...response.data]);
          } else {
            setReviews(response.data);
          }
          setCurrentPage(response.meta.current_page);
          setTotalPages(response.meta.last_page);
          setTotalReviews(response.meta.total);
          setAverageRating(response.averages.overall_average_rating);
        }
      } catch (error: any) {
        showBanner(
          "API Failed",
          error?.message || "Failed to fetch reviews",
          "error",
          2500,
        );
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [showBanner, params.business_id, params.user_id],
  );

  useEffect(() => {
    fetchReviews(1, false);
  }, []);

  const loadMore = useCallback(() => {
    if (!loadingMore && currentPage < totalPages) {
      fetchReviews(currentPage + 1, true);
    }
  }, [loadingMore, currentPage, totalPages, fetchReviews]);

  const getStars = (rating: number) => {
    const stars: ("star" | "star-half" | "star-border")[] = [];
    const ratingNum = parseFloat(rating.toString());
    for (let i = 1; i <= 5; i += 1) {
      if (ratingNum >= i) {
        stars.push("star");
      } else if (ratingNum >= i - 0.5) {
        stars.push("star-half");
      } else {
        stars.push("star-border");
      }
    }
    return stars;
  };

  const formatDate = (dateString: string) => {
    return dayjs(dateString).format("MMMM D, YYYY");
  };

  const getProfileImageUrl = (profileImageUrl: string | null) => {
    if (profileImageUrl) {
      if (
        profileImageUrl.startsWith("http://") ||
        profileImageUrl.startsWith("https://")
      ) {
        return profileImageUrl;
      }
      return `${process.env.EXPO_PUBLIC_API_BASE_URL}${profileImageUrl}`;
    }
    return DEFAULT_AVATAR_URL;
  };

  const getUserName = (user: Review["user"]) => {
    return user.name || user.email.split("@")[0] || "User";
  };

  const renderReviewItem = ({ item }: { item: Review }) => {
    const hasImage = !!item.user.profile_image_url;
    const reviewText = item.comment || "";
    const isExpanded = expandedReviews[item.id.toString()];
    const shouldShowSeeMore = reviewText.length > textWrapLength && !isExpanded;

    return (
      <View style={styles.card}>
        <View style={styles.cardHeaderRow}>
          <View
            style={[
              styles.avatar,
              {
                backgroundColor: hasImage ? theme.lightGreen07 : theme.green,
              },
            ]}
          >
            <Image
              source={{ uri: getProfileImageUrl(item.user.profile_image_url) }}
              style={styles.avatarImage}
            />
          </View>
          <View>
            <Text style={styles.nameText}>{getUserName(item.user)}</Text>
            {/* <Text style={styles.dateText}>{formatDate(item.created_at)}</Text> */}
            <Text style={styles.dateText}>{item.created_at}</Text>
          </View>
        </View>

        <View style={styles.starsRow}>
          {getStars(parseFloat(item.overall_rating)).map((icon, index) => (
            <MaterialIcons
              key={`${item.id}-star-${index}`}
              name={icon}
              size={moderateWidthScale(18)}
              color={theme.darkGreen}
              style={styles.starIcon}
            />
          ))}
        </View>

        {item.review_suggestion && (
          <Text style={styles.reviewSuggestionTitle}>
            {item.review_suggestion.title}
          </Text>
        )}

        {reviewText && (
          <>
            <Text style={styles.reviewText}>
              {isExpanded || reviewText.length <= textWrapLength
                ? reviewText
                : `${reviewText.slice(0, textWrapLength).trim()}...`}
            </Text>

            {shouldShowSeeMore && (
              <Text
                style={styles.seeMoreText}
                onPress={() =>
                  setExpandedReviews((prev) => ({
                    ...prev,
                    [item.id.toString()]: true,
                  }))
                }
              >
                See more
              </Text>
            )}
          </>
        )}
      </View>
    );
  };

  const renderFooter = () => {
    if (!loadingMore) return null;
    return (
      <View style={styles.loadingFooter}>
        <ActivityIndicator size="small" color={theme.primary} />
      </View>
    );
  };

  const renderEmptyState = () => {
    if (loading) return null;
    return (
      <View style={styles.emptyStateContainer}>
        <Text style={styles.emptyStateText}>No any review</Text>
      </View>
    );
  };

  const renderHeader = () => {
    if (loading) return null;
    return (
      <View style={styles.headerSection}>
        <Text style={styles.averageText}>
          {averageRating.toFixed(1)} Average
        </Text>
        <Text style={styles.countLabel}>
          {totalReviews} {totalReviews === 1 ? "rating" : "ratings"}
        </Text>
      </View>
    );
  };

  const listData = loading ? [] : reviews;

  return (
    <View style={styles.container}>
      <StackHeader title="User reviews rate" />

      {loading ? (
        <View style={styles.contentContainer}>
          <Skeleton screenType="Reviews" styles={styles} />
        </View>
      ) : (
        <FlatList
          data={listData}
          renderItem={renderReviewItem}
          keyExtractor={(item) => item.id.toString()}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={renderEmptyState}
          ListFooterComponent={renderFooter}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}
