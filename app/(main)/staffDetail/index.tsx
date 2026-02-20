import React, { useCallback, useMemo, useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  Image,
  StatusBar,
  TouchableOpacity,
  Alert,
} from "react-native";
import { useTheme, useAppSelector } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { useRouter, useLocalSearchParams, useFocusEffect } from "expo-router";
import { useTranslation } from "react-i18next";
import { useDispatch } from "react-redux";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  moderateHeightScale,
  moderateWidthScale,
  widthScale,
  heightScale,
} from "@/src/theme/dimensions";
import { MaterialIcons } from "@expo/vector-icons";
import StackHeader from "@/src/components/StackHeader";
import RetryButton from "@/src/components/retryButton";
import { ApiService } from "@/src/services/api";
import { staffEndpoints } from "@/src/services/endpoints";
import { setActionLoader } from "@/src/state/slices/generalSlice";
import { useNotificationContext } from "@/src/contexts/NotificationContext";

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
    headerRightIcons: {
      flexDirection: "row",
      alignItems: "center",
    },
    headerEditIcon: {
      marginLeft: moderateWidthScale(10),
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
    hoursScroll: {
      marginTop: moderateHeightScale(8),
    },
    hoursCardsContainer: {
      paddingVertical: moderateHeightScale(4),
      paddingHorizontal: moderateWidthScale(4),
      gap: moderateWidthScale(12),
    },
    hoursCard: {
      minWidth: widthScale(110),
      paddingHorizontal: moderateWidthScale(12),
      paddingVertical: moderateHeightScale(10),
      borderRadius: moderateWidthScale(10),
      backgroundColor: theme.background,
      borderWidth: 1,
      borderColor: theme.borderLine,
      justifyContent: "center",
      gap: moderateHeightScale(4),
    },
    hoursDay: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontMedium,
      color: theme.text,
    },
    hoursTime: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
    },
    hoursBreak: {
      fontSize: fontSize.size11,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen5,
      marginTop: moderateHeightScale(4),
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
    invitationStatus: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontMedium,
      color: theme.lightGreen,
      textAlign: "center",
      marginTop: moderateHeightScale(8),
      paddingHorizontal: moderateWidthScale(16),
    },
    invitationStatusPending: {
      color: theme.orangeBrown,
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
  invitation_token: string | null;
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

function formatTime(time: string | null | undefined): string {
  if (!time) return "--";
  const [hours, minutes] = time.split(":");
  const hourNum = parseInt(hours, 10);
  if (Number.isNaN(hourNum)) return time;
  const ampm = hourNum >= 12 ? "PM" : "AM";
  const displayHour = hourNum % 12 || 12;
  return `${displayHour}:${minutes} ${ampm}`;
}

export default function StaffDetail() {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);
  const router = useRouter();
  const dispatch = useDispatch();
  const { t } = useTranslation();
  const { showBanner } = useNotificationContext();
  const params = useLocalSearchParams<{ id?: string }>();
  const staffId = params.id;
  const user = useAppSelector((state: any) => state.user);
  const isBusinessRole = user?.role?.toLowerCase() === "business";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<StaffDetailData | null>(null);

  console.log("data : ", data?.invitation_token);

  const fetchStaffDetails = useCallback(async () => {
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
  }, [staffId, t]);

  useFocusEffect(
    useCallback(() => {
      fetchStaffDetails();
    }, []),
  );

  const handleEditPress = () => {
    if (!data) return;
    const editProfileImageUrl = data.user?.profile_image_url
      ? data.user.profile_image_url.startsWith("http://") ||
        data.user.profile_image_url.startsWith("https://")
        ? data.user.profile_image_url
        : (process.env.EXPO_PUBLIC_API_BASE_URL || "") +
          data.user.profile_image_url
      : "";
    router.push({
      pathname: "/(main)/addStaff",
      params: {
        id: String(data.id),
        name: data.name || "",
        email: data.email || "",
        description: data.description || "",
        profile_image_url: editProfileImageUrl,
        active: data.active ? "1" : "0",
        working_hours: JSON.stringify(data.user?.working_hours ?? []),
        ...(data.invitation_token
          ? { invitation_token: data.invitation_token }
          : {}),
      },
    });
  };

  const handleDeleteStaff = async () => {
    if (!data?.id) return;
    dispatch(setActionLoader(true));
    try {
      await ApiService.delete<{ success?: boolean; message?: string }>(
        staffEndpoints.delete(data.id),
      );
      showBanner(
        t("success") || "Success",
        t("staffDeletedSuccess") || "Staff deleted successfully",
        "success",
        3000,
      );
      router.back();
    } catch (err: any) {
      const errorMessage =
        err?.data?.message ||
        err?.message ||
        t("error") ||
        "Something went wrong";
      showBanner(t("error") || "Error", errorMessage, "error", 3000);
    } finally {
      dispatch(setActionLoader(false));
    }
  };

  const confirmDeleteStaff = () => {
    Alert.alert(
      t("deleteStaff") || "Delete staff",
      t("deleteStaffConfirm") ||
        `Are you sure you want to delete "${data?.name}"?`,
      [
        { text: t("cancel") || "Cancel", style: "cancel" },
        {
          text: t("delete") || "Delete",
          style: "destructive",
          onPress: handleDeleteStaff,
        },
      ],
    );
  };

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
      <StackHeader
        title={t("staffDetail")}
        rightIcon={
          isBusinessRole ? (
            <View style={styles.headerRightIcons}>
              <TouchableOpacity activeOpacity={0.7} onPress={confirmDeleteStaff}>
                <MaterialIcons
                  name="delete-outline"
                  size={moderateWidthScale(20)}
                  color={theme.white}
                />
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={handleEditPress}
                style={styles.headerEditIcon}
              >
                <MaterialIcons
                  name="edit"
                  size={moderateWidthScale(20)}
                  color={theme.white}
                />
              </TouchableOpacity>
            </View>
          ) : undefined
        }
      />
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
          {data.invitation_token != null && data.invitation_token !== "" ? (
            <Text
              style={[styles.invitationStatus, styles.invitationStatusPending]}
            >
              {t("staffInvitationPending")}
            </Text>
          ) : null}
        </View>

        <View style={styles.card}>
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
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.hoursScroll}
              contentContainerStyle={styles.hoursCardsContainer}
            >
              {sortedHours.map((wh) => {
                const breakHours = wh.break_hours || [];
                const hasBreaks = breakHours.length > 0;

                return (
                  <View key={wh.id} style={styles.hoursCard}>
                    <Text style={styles.hoursDay}>{capitalizeDay(wh.day)}</Text>
                    {wh.closed ? (
                      <Text style={styles.closedText}>{t("closed")}</Text>
                    ) : (
                      <>
                        <Text style={styles.hoursTime}>
                          {formatTime(wh.opening_time)} –{" "}
                          {formatTime(wh.closing_time)}
                        </Text>
                        {hasBreaks && (
                          <Text style={styles.hoursBreak}>
                            {/* Show first break; if more exist, append indicator */}
                            {`Break: ${formatTime(
                              breakHours[0].start,
                            )} – ${formatTime(breakHours[0].end)}${
                              breakHours.length > 1
                                ? ` (+${breakHours.length - 1} more)`
                                : ""
                            }`}
                          </Text>
                        )}
                      </>
                    )}
                  </View>
                );
              })}
            </ScrollView>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}
