import React, { useCallback, useMemo, useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  Image,
  StatusBar,
} from "react-native";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useTranslation } from "react-i18next";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  moderateHeightScale,
  moderateWidthScale,
  widthScale,
  heightScale,
} from "@/src/theme/dimensions";
import StackHeader from "@/src/components/StackHeader";
import RetryButton from "@/src/components/retryButton";
import { ApiService } from "@/src/services/api";
import { staffEndpoints } from "@/src/services/endpoints";

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    loaderContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
    },
    errorContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: moderateWidthScale(20),
    },
    errorText: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontRegular,
      color: theme.text,
      textAlign: "center",
      marginBottom: moderateHeightScale(16),
    },
    scrollContent: {
      paddingBottom: moderateHeightScale(40),
    },
    profileSection: {
      alignItems: "center",
      paddingVertical: moderateHeightScale(24),
      paddingHorizontal: moderateWidthScale(20),
    },
    avatar: {
      width: widthScale(100),
      height: widthScale(100),
      borderRadius: widthScale(100 / 2),
      borderWidth: 1,
      borderColor: theme.borderLight,
      // overflow: "hidden",
      marginBottom: moderateHeightScale(12),
      position: "relative",
    },
    avatarImage: {
      width: "100%",
      height: "100%",
      borderRadius: widthScale(100 / 2),
    },
    staffName: {
      fontSize: fontSize.size22,
      fontFamily: fonts.fontBold,
      color: theme.text,
      marginBottom: moderateHeightScale(4),
    },
    description: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      textAlign: "center",
    },
    card: {
      backgroundColor: theme.lightGreen1,
      marginHorizontal: moderateWidthScale(20),
      marginBottom: moderateHeightScale(16),
      padding: moderateWidthScale(16),
      borderRadius: moderateWidthScale(12),
    },
    cardTitle: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      marginBottom: moderateHeightScale(8),
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: moderateHeightScale(6),
    },
    label: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontMedium,
      color: theme.text,
      width: widthScale(120),
    },
    value: {
      flex: 1,
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
    },
    workingDayRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: moderateHeightScale(8),
      borderBottomWidth: 1,
      borderBottomColor: theme.borderLine,
    },
    workingDayRowLast: {
      borderBottomWidth: 0,
    },
    dayText: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontMedium,
      color: theme.text,
    },
    timeText: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
    },
    closedText: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      fontStyle: "italic",
    },
    statusDot: {
      position: "absolute",
      right: 12,
      bottom: 5,
      width: widthScale(12),
      height: widthScale(12),
      borderRadius: widthScale(6),
      zIndex: 9999,
    },
  });

export interface StaffDetailData {
  id: number;
  user_id: number;
  name: string;
  email: string;
  business_id: number;
  active: boolean;
  description: string | null;
  invitation_token: string;
  completed_appointments_count: number;
  business: {
    id: number;
    title: string;
  };
  user: {
    id: number;
    name: string;
    email: string;
    email_notifications: boolean;
    profile_image_url: string | null;
    working_hours: Array<{
      id: number;
      day: string;
      closed: boolean;
      opening_time: string;
      closing_time: string;
      break_hours: Array<{ start: string; end: string }>;
    }>;
  };
  created_at: string;
  createdAt: string;
}

function capitalizeDay(day: string): string {
  return day.charAt(0).toUpperCase() + day.slice(1);
}

export default function StaffDetail() {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);
  const router = useRouter();
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ id?: string }>();
  const staffId = params.id;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<StaffDetailData | null>(null);

  const fetchStaffDetails = async () => {
    if (!staffId) {
      setError(t("staffProfileNotFound"));
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    setData(null);
    try {
      const response = await ApiService.get<{
        success: boolean;
        message: string;
        data?: StaffDetailData;
      }>(staffEndpoints.details(staffId));

      if (!response?.success || !response.data) {
        setError(response?.message || t("staffProfileNotFound"));
        setData(null);
      } else {
        setData(response.data);
        setError(null);
      }
    } catch (err: any) {
      const apiMessage = err?.data?.message || err?.data?.error;
      setError(apiMessage || err?.message || t("staffProfileNotFound"));
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchStaffDetails();
  }, []);

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />
        <StackHeader title={t("staffDetail")} />
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />
        <StackHeader title={t("staffDetail")} />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <RetryButton onPress={fetchStaffDetails} loading={loading} />
        </View>
      </View>
    );
  }

  if (!data) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />
        <StackHeader title={t("staffDetail")} />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{t("staffProfileNotFound")}</Text>
          <RetryButton onPress={fetchStaffDetails} loading={loading} />
        </View>
      </View>
    );
  }

  const profileImageUrl = data.user?.profile_image_url
    ? data.user.profile_image_url.startsWith("http://") ||
      data.user.profile_image_url.startsWith("https://")
      ? data.user.profile_image_url
      : (process.env.EXPO_PUBLIC_API_BASE_URL || "") +
        data.user.profile_image_url
    : (process.env.EXPO_PUBLIC_DEFAULT_AVATAR_IMAGE ?? "");

  const workingHours = data.user?.working_hours ?? [];
  const dayOrder = [
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
    "sunday",
  ];
  const sortedHours = [...workingHours].sort(
    (a, b) => dayOrder.indexOf(a.day) - dayOrder.indexOf(b.day),
  );

  const isActive = Boolean(data.active);
  const totalAppointments = data.completed_appointments_count ?? 0;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <StackHeader title={t("staffDetail")} />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.profileSection}>
          <View style={styles.avatar}>
            <Image
              source={{ uri: profileImageUrl }}
              style={styles.avatarImage}
              resizeMode="cover"
            />
            <View
              style={[
                styles.statusDot,
                {
                  backgroundColor: isActive
                    ? theme.toggleActive
                    : theme.lightGreen5,
                },
              ]}
            />
          </View>
          <Text style={styles.staffName}>{data.name}</Text>
          {data.description ? (
            <Text style={styles.description}>{data.description}</Text>
          ) : null}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t("staffDetailInfo")}</Text>
          <View style={styles.row}>
            <Text style={styles.label}>{t("email")}</Text>
            <Text style={styles.value}>{data.email}</Text>
          </View>
          {data.business ? (
            <View style={styles.row}>
              <Text style={styles.label}>{t("business")}</Text>
              <Text style={styles.value}>{data.business.title}</Text>
            </View>
          ) : null}
          <View style={styles.row}>
            <Text style={styles.label}>{t("completedAppointmentsCount")}</Text>
            <Text style={styles.value}>{String(totalAppointments)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>{t("status")}</Text>
            <Text style={styles.value}>{isActive ? "Active" : "Inactive"}</Text>
          </View>
        </View>

        {sortedHours.length > 0 ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{t("workingHours")}</Text>
            {sortedHours.map((wh, index) => (
              <View
                key={wh.id}
                style={[
                  styles.workingDayRow,
                  index === sortedHours.length - 1 && styles.workingDayRowLast,
                ]}
              >
                <Text style={styles.dayText}>{capitalizeDay(wh.day)}</Text>
                {wh.closed ? (
                  <Text style={styles.closedText}>{t("closed")}</Text>
                ) : (
                  <Text style={styles.timeText}>
                    {wh.opening_time} – {wh.closing_time}
                  </Text>
                )}
              </View>
            ))}
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}
