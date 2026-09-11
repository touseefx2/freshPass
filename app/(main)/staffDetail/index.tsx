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
  Linking,
  Pressable,
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
import Svg, { Circle, Path, Rect } from "react-native-svg";
import StackHeader from "@/src/components/StackHeader";
import RetryButton from "@/src/components/retryButton";
import { ApiService } from "@/src/services/api";
import { staffEndpoints } from "@/src/services/endpoints";
import { setActionLoader } from "@/src/state/slices/generalSlice";
import { useNotificationContext } from "@/src/contexts/NotificationContext";
import { formatLeaveRangeDisplay } from "@/src/utils/leaveDateTime";
import { disableOwnerAsStaff } from "@/src/services/ownerAsStaffService";
import Logger from "@/src/services/logger";

type ActionIconType = "message" | "call" | "email";

/** Crisp cream icons — color matches staff-detail background */
function Staff3DActionIcon({
  type,
  size,
  color,
  shade,
}: {
  type: ActionIconType;
  size: number;
  color: string;
  shade: string;
}) {
  if (type === "message") {
    return (
      <Svg width={size} height={size} viewBox="0 0 48 48">
        <Path
          d="M8 9h28a6 6 0 0 1 6 6v14a6 6 0 0 1-6 6H22l-8 7v-7H8a6 6 0 0 1-6-6V15a6 6 0 0 1 6-6z"
          fill={shade}
          opacity={0.35}
          transform="translate(1.2 1.8)"
        />
        <Path
          d="M8 9h28a6 6 0 0 1 6 6v14a6 6 0 0 1-6 6H22l-8 7v-7H8a6 6 0 0 1-6-6V15a6 6 0 0 1 6-6z"
          fill={color}
        />
        <Circle cx="16" cy="22" r="2.4" fill={shade} opacity={0.55} />
        <Circle cx="24" cy="22" r="2.4" fill={shade} opacity={0.55} />
        <Circle cx="32" cy="22" r="2.4" fill={shade} opacity={0.55} />
      </Svg>
    );
  }

  if (type === "call") {
    return (
      <Svg width={size} height={size} viewBox="0 0 48 48">
        <Path
          d="M14.8 8c1.9-1.9 5.1-1.6 6.6.8l3.2 5.2c1.2 2 .6 4.6-1.4 5.8l-2.4 1.4c1.7 3.5 4.4 6.3 7.9 8.1l1.5-2.3c1.2-2 4-2.5 6-1.2l5.1 3.1c2.3 1.4 2.8 4.5 1 6.4l-2.7 2.8c-1.5 1.5-3.7 2.1-5.8 1.6-7.5-1.8-14.6-7.8-19-15.8C3.6 17.2 4.4 12.6 7.6 9.8L14.8 8z"
          fill={shade}
          opacity={0.35}
          transform="translate(1.2 1.8)"
        />
        <Path
          d="M14.8 8c1.9-1.9 5.1-1.6 6.6.8l3.2 5.2c1.2 2 .6 4.6-1.4 5.8l-2.4 1.4c1.7 3.5 4.4 6.3 7.9 8.1l1.5-2.3c1.2-2 4-2.5 6-1.2l5.1 3.1c2.3 1.4 2.8 4.5 1 6.4l-2.7 2.8c-1.5 1.5-3.7 2.1-5.8 1.6-7.5-1.8-14.6-7.8-19-15.8C3.6 17.2 4.4 12.6 7.6 9.8L14.8 8z"
          fill={color}
        />
      </Svg>
    );
  }

  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Rect
        x="6"
        y="12"
        width="34"
        height="24"
        rx="5"
        fill={shade}
        opacity={0.35}
        transform="translate(1.2 1.8)"
      />
      <Rect x="6" y="12" width="34" height="24" rx="5" fill={color} />
      <Path d="M8 14.5h30L23 26 8 14.5z" fill={shade} opacity={0.28} />
      <Path
        d="M8.5 15L23 25.5 37.5 15"
        stroke={shade}
        strokeWidth={2.2}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        opacity={0.45}
      />
    </Svg>
  );
}

function Staff3DActionButton({
  label,
  icon,
  onPress,
  disabled,
  theme,
}: {
  label: string;
  icon: ActionIconType;
  onPress: () => void;
  disabled?: boolean;
  theme: Theme;
}) {
  const [pressed, setPressed] = useState(false);
  const faceRadius = moderateWidthScale(18);
  const cream = theme.background;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      style={{
        flex: 1,
        opacity: disabled ? 0.45 : 1,
      }}
    >
      <View
        style={{
          borderRadius: faceRadius,
          backgroundColor: theme.darkGreen,
          paddingBottom: pressed
            ? moderateHeightScale(1)
            : moderateHeightScale(5),
          transform: [
            {
              translateY: pressed ? moderateHeightScale(4) : 0,
            },
          ],
          shadowColor: theme.shadow,
          shadowOffset: {
            width: 0,
            height: moderateHeightScale(3),
          },
          shadowOpacity: pressed ? 0.12 : 0.22,
          shadowRadius: moderateWidthScale(4),
          elevation: pressed ? 2 : 6,
        }}
      >
        <View
          style={{
            minHeight: heightScale(100),
            borderRadius: faceRadius,
            backgroundColor: theme.buttonBack,
            alignItems: "center",
            justifyContent: "center",
            paddingTop: moderateHeightScale(14),
            paddingBottom: moderateHeightScale(12),
            paddingHorizontal: moderateWidthScale(6),
            borderWidth: 1,
            borderTopColor: theme.darkGreenLight,
            borderLeftColor: theme.darkGreenLight,
            borderRightColor: theme.darkGreen,
            borderBottomColor: theme.darkGreen,
          }}
        >
          <View style={{ marginBottom: moderateHeightScale(8) }}>
            <Staff3DActionIcon
              type={icon}
              size={widthScale(36)}
              color={cream}
              shade={theme.darkGreen}
            />
          </View>
          <Text
            style={{
              fontSize: fontSize.size13,
              fontFamily: fonts.fontBold,
              color: theme.white,
              textAlign: "center",
              textTransform: "capitalize",
            }}
          >
            {label}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

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
      paddingTop: moderateHeightScale(20),
      paddingBottom: moderateHeightScale(16),
      paddingHorizontal: moderateWidthScale(20),
    },
    avatar: {
      width: widthScale(104),
      height: widthScale(104),
      borderRadius: widthScale(104 / 2),
      borderWidth: 2,
      borderColor: theme.borderLight,
      marginBottom: moderateHeightScale(14),
      position: "relative",
      shadowColor: theme.shadow,
      shadowOffset: { width: 0, height: moderateHeightScale(4) },
      shadowOpacity: 0.12,
      shadowRadius: moderateWidthScale(8),
      elevation: 4,
    },
    avatarImage: {
      width: "100%",
      height: "100%",
      borderRadius: widthScale(104 / 2),
    },
    staffName: {
      fontSize: fontSize.size24,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      marginBottom: moderateHeightScale(4),
    },
    description: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      textAlign: "center",
      paddingHorizontal: moderateWidthScale(12),
    },
    card: {
      backgroundColor: theme.lightGreen1,
      marginHorizontal: moderateWidthScale(20),
      marginBottom: moderateHeightScale(16),
      paddingHorizontal: moderateWidthScale(18),
      paddingVertical: moderateHeightScale(16),
      borderRadius: moderateWidthScale(16),
    },
    headerRightIcons: {
      flexDirection: "row",
      alignItems: "center",
    },
    headerEditIcon: {
      marginLeft: moderateWidthScale(10),
    },
    sectionTitle: {
      fontSize: fontSize.size18,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      marginHorizontal: moderateWidthScale(20),
      marginBottom: moderateHeightScale(10),
    },
    row: {
      flexDirection: "row",
      alignItems: "flex-start",
      marginBottom: moderateHeightScale(10),
    },
    rowLast: {
      marginBottom: 0,
    },
    label: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      width: widthScale(130),
      paddingRight: moderateWidthScale(8),
    },
    value: {
      flex: 1,
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
      marginTop: moderateHeightScale(4),
    },
    hoursCardsContainer: {
      paddingVertical: moderateHeightScale(4),
      paddingHorizontal: moderateWidthScale(2),
      gap: moderateWidthScale(12),
    },
    hoursCard: {
      minWidth: widthScale(118),
      paddingHorizontal: moderateWidthScale(14),
      paddingVertical: moderateHeightScale(12),
      borderRadius: moderateWidthScale(12),
      backgroundColor: theme.background,
      borderWidth: 1,
      borderColor: theme.borderLine,
      justifyContent: "center",
      gap: moderateHeightScale(4),
    },
    hoursDay: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      textTransform: "capitalize",
    },
    hoursTime: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
    },
    hoursBreak: {
      fontSize: fontSize.size11,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen5,
      marginTop: moderateHeightScale(2),
    },
    leaveCard: {
      minWidth: widthScale(100),
      minHeight: heightScale(72),
      paddingHorizontal: moderateWidthScale(12),
      paddingVertical: moderateHeightScale(12),
      borderRadius: moderateWidthScale(12),
      backgroundColor: theme.background,
      borderWidth: 1,
      borderColor: theme.borderLine,
      justifyContent: "center",
      gap: moderateHeightScale(4),
    },
    statusDot: {
      position: "absolute",
      right: moderateWidthScale(6),
      bottom: moderateHeightScale(6),
      width: widthScale(14),
      height: widthScale(14),
      borderRadius: widthScale(7),
      borderWidth: 2,
      borderColor: theme.background,
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
    reinviteLink: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontMedium,
      color: theme.lightGreen,
      textDecorationLine: "underline",
      textDecorationColor: theme.lightGreen,
    },
    actionsRow: {
      flexDirection: "row",
      alignItems: "stretch",
      justifyContent: "space-between",
      marginHorizontal: moderateWidthScale(20),
      marginBottom: moderateHeightScale(24),
      marginTop: moderateHeightScale(2),
      gap: moderateWidthScale(14),
    },
  });

export interface StaffLeave {
  id: number;
  user_id: number;
  staff_name: string | null;
  staff: unknown;
  type: "break" | "leave";
  start_date: string;
  start_time: string | null;
  end_date: string;
  end_time: string | null;
  reason: string | null;
  created_at: string;
}

export interface StaffDetailData {
  id: number;
  user_id: number;
  name: string;
  email: string;
  business_id: number;
  active: boolean;
  description: string | null;
  invitation_token: string | null;
  invitation_status?: string;
  is_owner?: boolean;
  is_business_owner?: boolean;
  completed_appointments_count: number;
  leaves?: StaffLeave[];
  business: {
    id: number;
    title: string;
  };
  user: {
    id: number;
    name: string;
    email: string;
    phone?: string | null;
    country_code?: string | null;
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
  const isBusinessRole = user?.userRole?.toLowerCase() === "business";
  const ownerStaffId = user?.businessStatus?.owner_as_staff?.staff_id ?? null;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<StaffDetailData | null>(null);
  const [reinviting, setReinviting] = useState(false);

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
        country_code: data.user?.country_code || "",
        phone: data.user?.phone || "",
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

  const handleReinvite = useCallback(async () => {
    if (!data?.id || reinviting) return;
    setReinviting(true);
    try {
      const response = await ApiService.post<{
        success: boolean;
        message?: string;
      }>(staffEndpoints.resendInvitation(data.id), {});
      if (response?.success) {
        showBanner(
          t("success") || "Success",
          response.message ||
            t("staffInvitationSentSuccess") ||
            "Invitation email resent successfully.",
          "success",
          3000,
        );
      } else {
        showBanner(
          t("error") || "Error",
          (response as any)?.message ||
            t("failedToSendInvitation") ||
            "Failed to send invitation",
          "error",
          3000,
        );
      }
    } catch (err: any) {
      const errorMessage =
        err?.data?.message ||
        err?.message ||
        t("error") ||
        "Something went wrong";
      showBanner(t("error") || "Error", errorMessage, "error", 3000);
    } finally {
      setReinviting(false);
    }
  }, [data?.id, reinviting, showBanner, t]);

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

  const handleRemoveYourself = async () => {
    dispatch(setActionLoader(true));
    try {
      const response = await disableOwnerAsStaff();
      if (response.success) {
        showBanner(
          t("success") || "Success",
          response.message || t("ownerRemovedAsStaffSuccess"),
          "success",
          2500,
        );
        router.back();
      } else {
        showBanner(
          t("error") || "Error",
          response.message || t("ownerAsStaffFailed"),
          "error",
          3000,
        );
      }
    } catch (err: any) {
      Logger.error("disableOwnerAsStaff from staff detail failed:", err);
      showBanner(
        t("error") || "Error",
        err?.message || t("ownerAsStaffFailed"),
        "error",
        3000,
      );
    } finally {
      dispatch(setActionLoader(false));
    }
  };

  const confirmRemoveYourself = () => {
    Alert.alert(t("removeYourself"), t("removeYourselfConfirm"), [
      { text: t("cancel") || "Cancel", style: "cancel" },
      {
        text: t("removeYourself"),
        style: "destructive",
        onPress: () => {
          void handleRemoveYourself();
        },
      },
    ]);
  };

  const handleChatPress = useCallback(() => {
    if (!data?.user?.id) return;
    const staffImage = data.user?.profile_image_url;

    router.push({
      pathname: "/(main)/chatBox",
      params: {
        id: String(data.user.id),
        chatItem: JSON.stringify({
          id: String(data.user.id),
          name: data.name ?? "",
          image:
            staffImage || (process.env.EXPO_PUBLIC_DEFAULT_AVATAR_IMAGE ?? ""),
        }),
      },
    });
  }, [data?.user?.id, data?.user?.profile_image_url, data?.name, router]);

  const staffPhone = useMemo(() => {
    const phone = data?.user?.phone;
    const countryCode = data?.user?.country_code;
    if (phone && countryCode) {
      return `${countryCode}${phone}`;
    }
    if (phone) return phone;
    return "";
  }, [data?.user?.phone, data?.user?.country_code]);

  const handleCallNow = useCallback(async () => {
    if (!staffPhone) return;
    const phoneNumber = staffPhone.replace(/[^\d+]/g, "");
    const phoneUrl = `tel:${phoneNumber}`;
    try {
      const canOpen = await Linking.canOpenURL(phoneUrl);
      if (canOpen) {
        await Linking.openURL(phoneUrl);
      } else {
        Alert.alert(t("error"), t("unableToMakePhoneCall"));
      }
    } catch {
      Alert.alert(t("error"), t("unableToMakePhoneCall"));
    }
  }, [staffPhone, t]);

  const handleEmailNow = useCallback(async () => {
    const email = data?.email?.trim();
    if (!email) return;
    const emailUrl = `mailto:${email}`;
    try {
      const canOpen = await Linking.canOpenURL(emailUrl);
      if (canOpen) {
        await Linking.openURL(emailUrl);
      } else {
        Alert.alert(t("error"), t("somethingWentWrong"));
      }
    } catch {
      Alert.alert(t("error"), t("somethingWentWrong"));
    }
  }, [data?.email, t]);

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
  const isOwnerStaff =
    data.is_owner === true ||
    data.is_business_owner === true ||
    (ownerStaffId != null && data.id === ownerStaffId);
  // Business role viewing their own self-added staff profile → hide chat message row only
  const hideSelfStaffMessage = isBusinessRole && isOwnerStaff;
  const showPendingInvite =
    !isOwnerStaff &&
    data.invitation_token != null &&
    data.invitation_token !== "";

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <StackHeader
        title={t("staffDetail")}
        rightIcon={
          isBusinessRole ? (
            <View style={styles.headerRightIcons}>
              {isOwnerStaff ? (
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={confirmRemoveYourself}
                >
                  <MaterialIcons
                    name="person-remove"
                    size={moderateWidthScale(20)}
                    color={theme.white}
                  />
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={confirmDeleteStaff}
                >
                  <MaterialIcons
                    name="delete-outline"
                    size={moderateWidthScale(20)}
                    color={theme.white}
                  />
                </TouchableOpacity>
              )}
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
          {isOwnerStaff ? (
            <Text style={styles.invitationStatus}>{t("owner")}</Text>
          ) : null}
          {data.description ? (
            <Text style={styles.description}>{data.description}</Text>
          ) : null}
          {showPendingInvite ? (
            <>
              <Text
                style={[
                  styles.invitationStatus,
                  styles.invitationStatusPending,
                ]}
              >
                {t("staffInvitationPending")}
              </Text>

              <TouchableOpacity
                onPress={handleReinvite}
                disabled={reinviting}
                activeOpacity={0.7}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={[styles.invitationStatus, styles.reinviteLink]}>
                  {reinviting ? t("sendingInvite") : t("reinvite")}
                </Text>
              </TouchableOpacity>
            </>
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
          <View style={[styles.row, !staffPhone ? styles.rowLast : null]}>
            <Text style={styles.label}>{t("status")}</Text>
            <Text style={styles.value}>{isActive ? "Active" : "Inactive"}</Text>
          </View>
          {staffPhone ? (
            <View style={[styles.row, styles.rowLast]}>
              <Text style={styles.label}>{t("phone")}</Text>
              <Text style={styles.value}>{staffPhone}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.actionsRow}>
          {!hideSelfStaffMessage && data?.user?.id != null ? (
            <Staff3DActionButton
              label={t("message") || "Message"}
              icon="message"
              onPress={handleChatPress}
              theme={theme}
            />
          ) : null}

          <Staff3DActionButton
            label={t("call") || "Call"}
            icon="call"
            onPress={handleCallNow}
            disabled={!staffPhone}
            theme={theme}
          />

          <Staff3DActionButton
            label={t("email") || "Email"}
            icon="email"
            onPress={handleEmailNow}
            disabled={!data.email}
            theme={theme}
          />
        </View>

        {sortedHours.length > 0 ? (
          <>
            <Text style={styles.sectionTitle}>{t("workingHours")}</Text>
            <View style={styles.card}>
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
                      <Text style={styles.hoursDay}>
                        {capitalizeDay(wh.day)}
                      </Text>
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
          </>
        ) : null}

        {(data.leaves?.length ?? 0) > 0 ? (
          <>
            <Text style={styles.sectionTitle}>
              {t("closeBreak") || "Close/Break"}
            </Text>
            <View style={styles.card}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.hoursScroll}
                contentContainerStyle={styles.hoursCardsContainer}
              >
                {data.leaves!.map((leave) => (
                  <View key={leave.id} style={styles.leaveCard}>
                    <Text style={styles.hoursDay}>
                      {leave.type === "break"
                        ? t("break") || "Break"
                        : t("close") || "Close"}
                    </Text>
                    <Text style={styles.hoursTime}>
                      {formatLeaveRangeDisplay(leave)}
                    </Text>
                  </View>
                ))}
              </ScrollView>
            </View>
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}
