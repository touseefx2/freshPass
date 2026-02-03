import React, { useMemo, useEffect } from "react";
import { StyleSheet, Text, View, TouchableOpacity } from "react-native";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  moderateHeightScale,
  moderateWidthScale,
} from "@/src/theme/dimensions";
import { Skeleton } from "@/src/components/skeletons";
import dayjs from "dayjs";
import { Appointment } from "@/src/components/appointmentDetail";
import { useRouter } from "expo-router";

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    workHistoryContainer: {
      marginBottom: moderateHeightScale(24),
    },
    sectionHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: moderateHeightScale(12),
    },
    sectionTitle: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    sectionLink: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.selectCard,
      textDecorationLine: "underline",
      textDecorationColor: theme.selectCard,
    },
    workHistoryItem: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    workHistoryService: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
      marginBottom: moderateHeightScale(4),
    },
    workHistoryDate: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
    },
    workHistoryPrice: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    line: {
      width: "100%",
      height: 1,
      backgroundColor: theme.borderLight,
      marginVertical: moderateHeightScale(12),
    },
    emptyStateContainer: {
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: moderateHeightScale(20),
    },
    emptyStateText: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      textAlign: "center",
    },
  });

interface WorkHistoryProps {
  data: Appointment[] | null;
  totalCount: number;

  callApi: () => Promise<void>;
}

export default function WorkHistory({
  data,
  totalCount,
  callApi,
}: WorkHistoryProps) {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);
  const router = useRouter();

  useEffect(() => {
    callApi();
  }, []);

  // Format date and time
  const formatDateTime = (date: string, time: string) => {
    const formattedDate = date; // Already formatted as "12/12/2025"
    const timeObj = dayjs(`2025-01-01 ${time}`, "YYYY-MM-DD HH:mm");
    const formattedTime = timeObj.format("h:mm a");
    return `${formattedDate} - ${formattedTime}`;
  };

  // Format price
  const formatPrice = (amount: string) => {
    return `$${parseFloat(amount).toFixed(2)}`;
  };

  // Get service titles
  const getServiceTitles = (appointment: Appointment) => {
    if (
      appointment.appointmentType === "subscription" &&
      Array.isArray(appointment.subscriptionServices) &&
      appointment.subscriptionServices.length > 0
    ) {
      return appointment.subscriptionServices.map((s) => s.name).join(", ");
    } else if (
      appointment.appointmentType === "service" &&
      Array.isArray(appointment.services) &&
      appointment.services.length > 0
    ) {
      return appointment.services.map((s) => s.name).join(", ");
    }
    return "Service";
  };

  // Limit to first 5 items for display
  const displayedItems = data ? data.slice(0, 5) : [];

  return (
    <View style={styles.workHistoryContainer}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Work history</Text>
        {data !== null && data.length > 5 && (
          <TouchableOpacity
            onPress={() => {
              router.push("/(main)/dashboard/(home)/workHistory");
            }}
          >
            <Text style={styles.sectionLink}>View all</Text>
          </TouchableOpacity>
        )}
      </View>
      {!data ? (
        <Skeleton screenType="WorkHistory" styles={styles} />
      ) : displayedItems.length > 0 ? (
        displayedItems.map((item, index) => (
          <View key={item.id}>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => {
                router.push({
                  pathname: "/(main)/dashboard/(home)/appointmentDetail",
                  params: {
                    appointment: JSON.stringify(item),
                  },
                });
              }}
            >
              <View style={styles.workHistoryItem}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.workHistoryService}>
                    {getServiceTitles(item)}
                  </Text>
                  <Text style={styles.workHistoryDate}>
                    {formatDateTime(item.appointmentDate, item.appointmentTime)}
                  </Text>
                </View>
                <Text style={styles.workHistoryPrice}>
                  {formatPrice(item.paidAmount)}
                </Text>
              </View>
            </TouchableOpacity>
            {index < displayedItems.length - 1 && <View style={styles.line} />}
          </View>
        ))
      ) : (
        <View style={styles.emptyStateContainer}>
          <Text style={styles.emptyStateText}>No work history found</Text>
        </View>
      )}
    </View>
  );
}
