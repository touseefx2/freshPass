import React, { useCallback, useEffect, useMemo, useState } from "react";
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
import { LinearGradient } from "expo-linear-gradient";
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
  const faceRadius = moderateWidthScale(12);
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
          backgroundColor: theme.black,
          paddingBottom: pressed
            ? moderateHeightScale(1)
            : moderateHeightScale(2),
          transform: [
            {
              translateY: pressed ? moderateHeightScale(4) : 0,
            },
          ],
          shadowColor: theme.shadow,
          shadowOffset: {
            width: 0,
            height: pressed ? moderateHeightScale(1) : moderateHeightScale(3),
          },
          shadowOpacity: pressed ? 0.12 : 0.35,
          shadowRadius: pressed
            ? moderateWidthScale(2)
            : moderateWidthScale(4),
          elevation: pressed ? 2 : 7,
        }}
      >
        <View
          style={{
            borderRadius: faceRadius,
            backgroundColor: theme.black,
            paddingBottom: pressed
              ? moderateHeightScale(1)
              : moderateHeightScale(4),
          }}
        >
          <View
            style={{
              minHeight: heightScale(50),
              borderRadius: faceRadius,
              backgroundColor: theme.buttonBack,
              alignItems: "center",
              justifyContent: "center",
              paddingTop: moderateHeightScale(6),
              paddingBottom: moderateHeightScale(6),
              paddingHorizontal: moderateWidthScale(4),
              borderWidth: 1.5,
              borderTopColor: theme.darkGreenLight,
              borderLeftColor: theme.darkGreenLight,
              borderRightColor: theme.darkGreen,
              borderBottomColor: theme.darkGreen,
            }}
          >
            <View style={{ marginBottom: moderateHeightScale(3) }}>
              <Staff3DActionIcon
                type={icon}
                size={widthScale(22)}
                color={cream}
                shade={theme.darkGreen}
              />
            </View>
            <Text
              style={{
                fontSize: fontSize.size10,
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
      </View>
    </Pressable>
  );
}

const AVATAR_SIZE = widthScale(92);

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
      paddingBottom: moderateHeightScale(36),
      paddingTop: 0,
    },
    heroWrap: {
      marginHorizontal: 0,
      marginBottom: moderateHeightScale(-15),
      width: "100%",
      alignSelf: "stretch",
      zIndex: 1,
    },
    heroCard: {
      width: "100%",
      alignSelf: "stretch",
      overflow: "hidden",
      borderBottomLeftRadius: moderateWidthScale(28),
      borderBottomRightRadius: moderateWidthScale(28),
    },
    heroTop: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: moderateWidthScale(18),
      paddingTop: moderateHeightScale(14),
      paddingBottom: moderateHeightScale(12),
      gap: moderateWidthScale(14),
    },
    avatarRing: {
      width: AVATAR_SIZE + moderateWidthScale(8),
      height: AVATAR_SIZE + moderateWidthScale(8),
      borderRadius: (AVATAR_SIZE + moderateWidthScale(8)) / 2,
      padding: moderateWidthScale(3),
      backgroundColor: theme.white15,
      borderWidth: 2,
      borderColor: theme.white50,
    },
    avatar: {
      width: AVATAR_SIZE,
      height: AVATAR_SIZE,
      borderRadius: AVATAR_SIZE / 2,
      overflow: "hidden",
      position: "relative",
      backgroundColor: theme.darkGreenLight,
    },
    avatarImage: {
      width: "100%",
      height: "100%",
      borderRadius: AVATAR_SIZE / 2,
    },
    statusDot: {
      position: "absolute",
      right: moderateWidthScale(2),
      bottom: moderateHeightScale(2),
      width: widthScale(15),
      height: widthScale(15),
      borderRadius: widthScale(8),
      borderWidth: 2.5,
      borderColor: theme.darkGreen,
      zIndex: 2,
    },
    heroInfo: {
      flex: 1,
      justifyContent: "center",
      gap: moderateHeightScale(6),
    },
    staffName: {
      fontSize: fontSize.size22,
      fontFamily: fonts.fontBold,
      color: theme.white,
      textTransform: "capitalize",
    },
    badgesRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      alignItems: "center",
      gap: moderateWidthScale(6),
    },
    statusPill: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(5),
      paddingHorizontal: moderateWidthScale(10),
      paddingVertical: moderateHeightScale(5),
      borderRadius: moderateWidthScale(999),
      backgroundColor: theme.white15,
    },
    statusPillInactive: {
      backgroundColor: theme.white15,
    },
    statusPillDot: {
      width: widthScale(7),
      height: widthScale(7),
      borderRadius: widthScale(4),
    },
    statusPillText: {
      fontSize: fontSize.size11,
      fontFamily: fonts.fontMedium,
      color: theme.white,
    },
    ownerPill: {
      paddingHorizontal: moderateWidthScale(10),
      paddingVertical: moderateHeightScale(5),
      borderRadius: moderateWidthScale(999),
      backgroundColor: theme.selectCard,
    },
    ownerPillText: {
      fontSize: fontSize.size11,
      fontFamily: fonts.fontBold,
      color: theme.white,
    },
    description: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: theme.white70,
      lineHeight: fontSize.size13 * 1.4,
    },
    heroStatsLine: {
      flexDirection: "row",
      alignItems: "center",
      flexWrap: "wrap",
      gap: moderateWidthScale(8),
      marginTop: moderateHeightScale(2),
    },
    heroStatText: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontMedium,
      color: theme.white70,
    },
    heroStatValue: {
      fontFamily: fonts.fontBold,
      color: theme.white,
    },
    heroStatDivider: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontMedium,
      color: theme.white50,
    },
    invitationStatus: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontMedium,
      color: theme.white70,
      marginTop: moderateHeightScale(2),
    },
    invitationStatusPending: {
      color: theme.orangeBrown,
    },
    reinviteLink: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontMedium,
      color: theme.orangeBrown,
      textDecorationLine: "underline",
      textDecorationColor: theme.orangeBrown,
    },
    actionsRow: {
      flexDirection: "row",
      alignItems: "stretch",
      justifyContent: "space-between",
      paddingHorizontal: moderateWidthScale(16),
      paddingTop: moderateHeightScale(4),
      paddingBottom: moderateHeightScale(28),
      gap: moderateWidthScale(10),
    },
    sectionContainer: {
      marginBottom: moderateHeightScale(18),
      paddingHorizontal: moderateWidthScale(16),
      zIndex: 2,
    },
    sectionContainerFlush: {
      marginBottom: moderateHeightScale(18),
      paddingHorizontal: 0,
      zIndex: 2,
    },
    sectionHeaderRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: moderateHeightScale(12),
    },
    sectionHeaderPadded: {
      paddingHorizontal: moderateWidthScale(16),
    },
    sectionTitle: {
      fontSize: fontSize.size17,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    sectionHint: {
      fontSize: fontSize.size11,
      fontFamily: fonts.fontMedium,
      color: theme.lightGreen5,
    },
    contactPanel: {
      backgroundColor: theme.white,
      borderRadius: moderateWidthScale(24),
      paddingTop: moderateHeightScale(8),
      paddingBottom: moderateHeightScale(8),
      paddingHorizontal: moderateWidthScale(8),
      borderWidth: 1,
      borderColor: theme.borderLight,
      shadowColor: theme.darkGreen,
      shadowOffset: { width: 0, height: moderateHeightScale(8) },
      shadowOpacity: 0.12,
      shadowRadius: moderateWidthScale(16),
      elevation: 6,
    },
    contactRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: moderateHeightScale(11),
      paddingHorizontal: moderateWidthScale(8),
      gap: moderateWidthScale(12),
    },
    contactRowDivider: {
      borderBottomWidth: 1,
      borderBottomColor: theme.borderLight,
    },
    contactIconWrap: {
      width: moderateWidthScale(44),
      height: moderateWidthScale(44),
      borderRadius: moderateWidthScale(14),
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.darkGreen,
    },
    contactTextWrap: {
      flex: 1,
      gap: moderateHeightScale(2),
    },
    contactLabel: {
      fontSize: fontSize.size11,
      fontFamily: fonts.fontMedium,
      color: theme.lightGreen5,
    },
    contactValue: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    headerRightIcons: {
      flexDirection: "row",
      alignItems: "center",
    },
    headerEditIcon: {
      marginLeft: moderateWidthScale(10),
    },
    hoursScroll: {
      gap: moderateWidthScale(12),
      paddingHorizontal: moderateWidthScale(16),
    },
    hoursCard: {
      width: widthScale(156),
      borderRadius: moderateWidthScale(20),
      overflow: "hidden",
      backgroundColor: theme.white,
      borderWidth: 1,
      borderColor: theme.borderLight,
    },
    hoursCardToday: {
      borderColor: theme.darkGreen,
    },
    hoursCardClosed: {
      opacity: 0.72,
    },
    hoursDayBand: {
      paddingHorizontal: moderateWidthScale(14),
      paddingVertical: moderateHeightScale(12),
      backgroundColor: theme.darkGreen,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: moderateWidthScale(8),
    },
    hoursDayBandToday: {
      backgroundColor: theme.buttonBack,
    },
    hoursDayBandClosed: {
      backgroundColor: theme.lightGreen4,
    },
    hoursDay: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontBold,
      color: theme.white,
      textTransform: "capitalize",
      flex: 1,
    },
    hoursTodayTag: {
      paddingHorizontal: moderateWidthScale(8),
      paddingVertical: moderateHeightScale(3),
      borderRadius: moderateWidthScale(999),
      backgroundColor: theme.orangeBrown,
    },
    hoursTodayTagText: {
      fontSize: fontSize.size10,
      fontFamily: fonts.fontBold,
      color: theme.white,
    },
    hoursBody: {
      paddingHorizontal: moderateWidthScale(14),
      paddingVertical: moderateHeightScale(14),
      gap: moderateHeightScale(8),
      minHeight: heightScale(88),
    },
    hoursTimeRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(6),
    },
    hoursTime: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
      flex: 1,
      lineHeight: fontSize.size13 * 1.35,
    },
    hoursBreakChip: {
      alignSelf: "flex-start",
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(4),
      backgroundColor: theme.apptPeachBg,
      borderRadius: moderateWidthScale(999),
      paddingHorizontal: moderateWidthScale(10),
      paddingVertical: moderateHeightScale(5),
    },
    hoursBreak: {
      fontSize: fontSize.size11,
      fontFamily: fonts.fontMedium,
      color: theme.apptPeachAccent,
    },
    closedText: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontMedium,
      color: theme.lightGreen5,
      fontStyle: "italic",
    },
    leaveScroll: {
      gap: moderateWidthScale(12),
      paddingHorizontal: moderateWidthScale(16),
    },
    leaveCard: {
      width: widthScale(200),
      borderRadius: moderateWidthScale(20),
      overflow: "hidden",
      backgroundColor: theme.white,
      borderWidth: 1,
      borderColor: theme.borderLight,
      minHeight: heightScale(128),
    },
    leaveCardBreak: {
      borderColor: theme.upcomingBorder,
    },
    leaveCardClose: {
      borderColor: theme.lightRedBorder,
    },
    leaveTopBand: {
      paddingHorizontal: moderateWidthScale(14),
      paddingVertical: moderateHeightScale(12),
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(10),
    },
    leaveTopBandBreak: {
      backgroundColor: theme.apptPeachBg,
    },
    leaveTopBandClose: {
      backgroundColor: theme.lightRed,
    },
    leaveIconWrap: {
      width: moderateWidthScale(34),
      height: moderateWidthScale(34),
      borderRadius: moderateWidthScale(11),
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.white,
    },
    leaveType: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      flex: 1,
    },
    leaveBody: {
      paddingHorizontal: moderateWidthScale(14),
      paddingVertical: moderateHeightScale(12),
      gap: moderateHeightScale(6),
      flex: 1,
    },
    leaveRange: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontMedium,
      color: theme.lightGreen,
      lineHeight: fontSize.size12 * 1.4,
    },
    leaveReason: {
      fontSize: fontSize.size11,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen5,
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

function getTodayDayName(): string {
  const days = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
  ];
  return days[new Date().getDay()];
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
  const dataRef = React.useRef<StaffDetailData | null>(null);
  dataRef.current = data;

  useEffect(() => {
    setData(null);
    setError(null);
    setLoading(true);
  }, [staffId]);

  const fetchStaffDetails = useCallback(async () => {
    if (!staffId) {
      setError(t("staffProfileNotFound"));
      setLoading(false);
      setData(null);
      return;
    }

    const hasExistingData = dataRef.current != null;
    if (!hasExistingData) {
      setLoading(true);
      setError(null);
    }

    try {
      const response = await ApiService.get<{
        success: boolean;
        message: string;
        data?: StaffDetailData;
      }>(staffEndpoints.details(staffId));

      if (!response?.success || !response.data) {
        if (!hasExistingData) {
          setError(response?.message || t("staffProfileNotFound"));
          setData(null);
        }
      } else {
        setData(response.data);
        setError(null);
      }
    } catch (err: any) {
      if (!hasExistingData) {
        const apiMessage = err?.data?.message || err?.data?.error;
        setError(apiMessage || err?.message || t("staffProfileNotFound"));
        setData(null);
      }
    } finally {
      setLoading(false);
    }
  }, [staffId, t]);

  useFocusEffect(
    useCallback(() => {
      fetchStaffDetails();
    }, [fetchStaffDetails]),
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
        <StackHeader title="" showLine={false} useGradient />
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
        <StackHeader title="" showLine={false} useGradient />
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
        <StackHeader title="" showLine={false} useGradient />
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
  const todayDay = getTodayDayName();
  const openDaysCount = sortedHours.filter((wh) => !wh.closed).length;
  const leaveCount = data.leaves?.length ?? 0;
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

  const contactRows: Array<{
    key: string;
    label: string;
    value: string;
    icon: React.ComponentProps<typeof MaterialIcons>["name"];
    accent: string;
    iconBg: string;
  }> = [
    {
      key: "email",
      label: t("email"),
      value: data.email,
      icon: "mail-outline",
      accent: theme.buttonBack,
      iconBg: theme.apptMintBg,
    },
    ...(data.business
      ? [
          {
            key: "business",
            label: t("business"),
            value: data.business.title,
            icon: "storefront" as const,
            accent: theme.apptPeachAccent,
            iconBg: theme.apptPeachBg,
          },
        ]
      : []),
    ...(staffPhone
      ? [
          {
            key: "phone",
            label: t("phone"),
            value: staffPhone,
            icon: "phone" as const,
            accent: theme.darkGreen,
            iconBg: theme.lightGreen1,
          },
        ]
      : []),
  ];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <StackHeader
        title=""
        showLine={false}
        useGradient
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
        <View style={styles.heroWrap}>
          <LinearGradient
            colors={[theme.darkGreen, theme.darkGreenLight]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroCard}
          >
            <View style={styles.heroTop}>
              <View style={styles.avatarRing}>
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
              </View>

              <View style={styles.heroInfo}>
                <Text style={styles.staffName} numberOfLines={2}>
                  {data.name}
                </Text>

                <View style={styles.badgesRow}>
                  <View
                    style={[
                      styles.statusPill,
                      !isActive && styles.statusPillInactive,
                    ]}
                  >
                    <View
                      style={[
                        styles.statusPillDot,
                        {
                          backgroundColor: isActive
                            ? theme.toggleActive
                            : theme.lightGreen5,
                        },
                      ]}
                    />
                    <Text style={styles.statusPillText}>
                      {isActive ? "Active" : "Inactive"}
                    </Text>
                  </View>
                  {isOwnerStaff ? (
                    <View style={styles.ownerPill}>
                      <Text style={styles.ownerPillText}>{t("owner")}</Text>
                    </View>
                  ) : null}
                </View>

                {data.description ? (
                  <Text style={styles.description} numberOfLines={2}>
                    {data.description}
                  </Text>
                ) : null}

                <View style={styles.heroStatsLine}>
                  <Text style={styles.heroStatText}>
                    <Text style={styles.heroStatValue}>
                      {String(totalAppointments)}
                    </Text>
                    {` ${t("appointments")}`}
                  </Text>
                  {sortedHours.length > 0 ? (
                    <>
                      <Text style={styles.heroStatDivider}>|</Text>
                      <Text style={styles.heroStatText}>
                        <Text style={styles.heroStatValue}>
                          {String(openDaysCount)}
                        </Text>
                        {` ${t("workingHours")}`}
                      </Text>
                    </>
                  ) : null}
                </View>

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
                      <Text style={styles.reinviteLink}>
                        {reinviting ? t("sendingInvite") : t("reinvite")}
                      </Text>
                    </TouchableOpacity>
                  </>
                ) : null}
              </View>
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

              {staffPhone ? (
                <Staff3DActionButton
                  label={t("call") || "Call"}
                  icon="call"
                  onPress={handleCallNow}
                  theme={theme}
                />
              ) : null}

              <Staff3DActionButton
                label={t("email") || "Email"}
                icon="email"
                onPress={handleEmailNow}
                disabled={!data.email}
                theme={theme}
              />
            </View>
          </LinearGradient>
        </View>

        <View style={styles.sectionContainer}>
          {contactRows.length > 0 ? (
            <View style={styles.contactPanel}>
              {contactRows.map((row, index) => (
                <View
                  key={row.key}
                  style={[
                    styles.contactRow,
                    index < contactRows.length - 1
                      ? styles.contactRowDivider
                      : null,
                  ]}
                >
                  <View style={styles.contactIconWrap}>
                    <MaterialIcons
                      name={row.icon}
                      size={moderateWidthScale(18)}
                      color={theme.white}
                    />
                  </View>
                  <View style={styles.contactTextWrap}>
                    <Text style={styles.contactLabel}>{row.label}</Text>
                    <Text style={styles.contactValue} numberOfLines={2}>
                      {row.value}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          ) : null}
        </View>

        {sortedHours.length > 0 ? (
          <View style={styles.sectionContainerFlush}>
            <View
              style={[styles.sectionHeaderRow, styles.sectionHeaderPadded]}
            >
              <Text style={styles.sectionTitle}>{t("workingHours")}</Text>
              <Text style={styles.sectionHint}>
                {openDaysCount}/{sortedHours.length} open
              </Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.hoursScroll}
            >
              {sortedHours.map((wh) => {
                const breakHours = wh.break_hours || [];
                const hasBreaks = breakHours.length > 0;
                const isToday = wh.day.toLowerCase() === todayDay;

                return (
                  <View
                    key={wh.id}
                    style={[
                      styles.hoursCard,
                      wh.closed && styles.hoursCardClosed,
                      isToday && styles.hoursCardToday,
                    ]}
                  >
                    <View
                      style={[
                        styles.hoursDayBand,
                        wh.closed && styles.hoursDayBandClosed,
                        isToday && styles.hoursDayBandToday,
                      ]}
                    >
                      <Text style={styles.hoursDay} numberOfLines={1}>
                        {capitalizeDay(wh.day)}
                      </Text>
                      {isToday ? (
                        <View style={styles.hoursTodayTag}>
                          <Text style={styles.hoursTodayTagText}>Today</Text>
                        </View>
                      ) : null}
                    </View>
                    <View style={styles.hoursBody}>
                      {wh.closed ? (
                        <Text style={styles.closedText}>{t("closed")}</Text>
                      ) : (
                        <>
                          <View style={styles.hoursTimeRow}>
                            <MaterialIcons
                              name="schedule"
                              size={moderateWidthScale(14)}
                              color={theme.buttonBack}
                            />
                            <Text style={styles.hoursTime}>
                              {formatTime(wh.opening_time)} –{" "}
                              {formatTime(wh.closing_time)}
                            </Text>
                          </View>
                          {hasBreaks ? (
                            <View style={styles.hoursBreakChip}>
                              <MaterialIcons
                                name="free-breakfast"
                                size={moderateWidthScale(12)}
                                color={theme.apptPeachAccent}
                              />
                              <Text style={styles.hoursBreak}>
                                {`${formatTime(breakHours[0].start)} – ${formatTime(
                                  breakHours[0].end,
                                )}${
                                  breakHours.length > 1
                                    ? ` (+${breakHours.length - 1})`
                                    : ""
                                }`}
                              </Text>
                            </View>
                          ) : null}
                        </>
                      )}
                    </View>
                  </View>
                );
              })}
            </ScrollView>
          </View>
        ) : null}

        {leaveCount > 0 ? (
          <View style={styles.sectionContainerFlush}>
            <View
              style={[styles.sectionHeaderRow, styles.sectionHeaderPadded]}
            >
              <Text style={styles.sectionTitle}>
                {t("closeBreak") || "Close/Break"}
              </Text>
              <Text style={styles.sectionHint}>{String(leaveCount)}</Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.leaveScroll}
            >
              {data.leaves!.map((leave) => {
                const isBreak = leave.type === "break";
                return (
                  <View
                    key={leave.id}
                    style={[
                      styles.leaveCard,
                      isBreak ? styles.leaveCardBreak : styles.leaveCardClose,
                    ]}
                  >
                    <View
                      style={[
                        styles.leaveTopBand,
                        isBreak
                          ? styles.leaveTopBandBreak
                          : styles.leaveTopBandClose,
                      ]}
                    >
                      <View style={styles.leaveIconWrap}>
                        <MaterialIcons
                          name={isBreak ? "free-breakfast" : "event-busy"}
                          size={moderateWidthScale(16)}
                          color={isBreak ? theme.apptPeachAccent : theme.red}
                        />
                      </View>
                      <Text style={styles.leaveType}>
                        {isBreak
                          ? t("break") || "Break"
                          : t("close") || "Close"}
                      </Text>
                    </View>
                    <View style={styles.leaveBody}>
                      <Text style={styles.leaveRange}>
                        {formatLeaveRangeDisplay(leave)}
                      </Text>
                      {leave.reason ? (
                        <Text style={styles.leaveReason} numberOfLines={2}>
                          {leave.reason}
                        </Text>
                      ) : null}
                    </View>
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
