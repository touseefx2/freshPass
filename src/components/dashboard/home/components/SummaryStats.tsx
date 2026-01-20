import React, { useEffect, useMemo } from "react";
import { StyleSheet, Text, View, TouchableOpacity } from "react-native";
import { useAppSelector, useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  moderateHeightScale,
  moderateWidthScale,
} from "@/src/theme/dimensions";
import { Entypo } from "@expo/vector-icons";
import {
  CalendarIcon,
  CircleTickIcon,
  DollarCheckIcon,
  StarIcon,
} from "@/assets/icons";
import { useRouter } from "expo-router";
import { Skeleton } from "@/src/components/skeletons";

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    statsRow: {
      flexDirection: "row",
      marginBottom: moderateHeightScale(12),
      width: "100%",
      alignSelf: "center",
      justifyContent: "space-between",
    },
    statsRowStaff: {
      flexDirection: "row",
      width: "100%",
      alignSelf: "center",
      justifyContent: "space-between",
      marginBottom: moderateHeightScale(18),
    },
    titleSec: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: moderateHeightScale(4),
    },
    shadow: {
      shadowColor: theme.shadow,
      shadowOffset: {
        width: 0,
        height: 1,
      },
      shadowOpacity: 0.2,
      shadowRadius: 1.41,
      elevation: 2,
    },

    revenueCard: {
      width: "48.5%",
      backgroundColor: theme.darkGreen,
      borderRadius: moderateWidthScale(8),
      paddingHorizontal: moderateWidthScale(16),
      height: moderateHeightScale(81),
      justifyContent: "center",
    },
    revenueAmount: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontBold,
      color: theme.white,
      maxWidth: "87%",
    },
    revenueLabel: {
      fontSize: fontSize.size10,
      fontFamily: fonts.fontMedium,
      color: theme.white,
      maxWidth: "87%",
    },
    reviewCard: {
      backgroundColor: theme.orangeBrown,
    },
    reviewRate: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      maxWidth: "87%",
    },
    reviewLabel: {
      fontSize: fontSize.size10,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
      maxWidth: "87%",
    },
    appointmentStatsRow: {
      flexDirection: "row",
      gap: moderateWidthScale(12),
      marginBottom: moderateHeightScale(18),
    },
    appointmentStatCard: {
      flex: 1,
      backgroundColor: theme.white,
      borderRadius: moderateWidthScale(8),
      paddingHorizontal: moderateWidthScale(16),
      alignItems: "center",
      justifyContent: "center",
      height: moderateHeightScale(81),
    },
    appointmentStatNumber: {
      fontSize: fontSize.size18,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      marginBottom: moderateHeightScale(4),
    },
    appointmentStatLabel: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
    },
  });

interface DashboardStats {
  monthly_revenue?: number;
  appointments: {
    completed: number;
    upcoming: number;
    cancelled?: number;
  };
  rating?: {
    overall_rating: number;
  };
}

interface SummaryStatsProps {
  data: DashboardStats | null;
  callApi: () => Promise<void>;
}

export default function SummaryStats({ data, callApi }: SummaryStatsProps) {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);
  const router = useRouter();
  const userRole = useAppSelector((state) => state.user.userRole);
  const isStaff = userRole === "staff";
  const isBusiness = userRole === "business";
  const isClient = userRole === "customer";

  useEffect(() => {
    callApi();
  }, []);

  // Format revenue amount
  const formatRevenue = (amount: number | null | undefined): string => {
    if (amount === null || amount === undefined) return "USD $0";
    return `USD $${amount.toLocaleString("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })}`;
  };

  // Format rating
  const formatRating = (rating: number | null | undefined): string => {
    if (rating === null || rating === undefined) return "0.0";
    return rating.toFixed(1);
  };

  if (!data) {
    return <Skeleton screenType="SummaryStats" styles={styles} />;
  }

  const monthlyRevenue = data?.monthly_revenue ?? 0;
  const overallRating = data?.rating?.overall_rating ?? 0;
  const upcomingCount = data?.appointments?.upcoming ?? 0;
  const completedCount = data?.appointments?.completed ?? 0;
  const cancelledCount = data?.appointments?.cancelled ?? 0;

  return (
    <>
      <View style={isStaff ? styles.statsRowStaff : styles.statsRow}>
        <View style={[styles.revenueCard, styles.shadow]}>
          <View style={styles.titleSec}>
            <Text numberOfLines={1} style={styles.revenueAmount}>
              {isStaff ? upcomingCount : formatRevenue(monthlyRevenue)}
            </Text>
            {isStaff ? (
              <CalendarIcon
                width={moderateWidthScale(18)}
                height={moderateWidthScale(18)}
                color={theme.white}
              />
            ) : (
              <DollarCheckIcon
                width={moderateWidthScale(18)}
                height={moderateWidthScale(18)}
              />
            )}
          </View>
          <Text numberOfLines={1} style={styles.revenueLabel}>
            {isStaff ? "Upcoming appointment" : "Total revenue"}
          </Text>
        </View>
        <TouchableOpacity
          disabled={isStaff}
          activeOpacity={0.8}
          style={[styles.revenueCard, styles.reviewCard]}
          onPress={() => {
            isStaff ? null : router.push("/(main)/userReviews");
          }}
        >
          <View style={styles.titleSec}>
            <Text numberOfLines={1} style={styles.reviewRate}>
              {isStaff ? completedCount : formatRating(overallRating)}
            </Text>
            {isStaff ? (
              <CircleTickIcon
                width={moderateWidthScale(18)}
                height={moderateWidthScale(18)}
                color={theme.darkGreen}
              />
            ) : (
              <StarIcon
                width={moderateWidthScale(18)}
                height={moderateWidthScale(18)}
              />
            )}
          </View>
          <View style={styles.titleSec}>
            <Text numberOfLines={1} style={styles.reviewLabel}>
              {isStaff ? "Completed appointments" : "User reviews rate"}
            </Text>
            {isBusiness && (
              <Entypo
                name="chevron-small-right"
                size={18}
                color={theme.darkGreen}
              />
            )}
          </View>
        </TouchableOpacity>
      </View>

      {isBusiness && (
        <View style={styles.appointmentStatsRow}>
          <View style={[styles.appointmentStatCard, styles.shadow]}>
            <Text style={styles.appointmentStatNumber}>{upcomingCount}</Text>
            <Text style={styles.appointmentStatLabel}>Upcoming</Text>
          </View>
          <View style={[styles.appointmentStatCard, styles.shadow]}>
            <Text style={styles.appointmentStatNumber}>{completedCount}</Text>
            <Text style={styles.appointmentStatLabel}>Complete</Text>
          </View>
          <View style={[styles.appointmentStatCard, styles.shadow]}>
            <Text style={styles.appointmentStatNumber}>{cancelledCount}</Text>
            <Text style={styles.appointmentStatLabel}>Canceled</Text>
          </View>
        </View>
      )}
    </>
  );
}
