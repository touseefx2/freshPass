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
import { userEndpoints } from "@/src/services/endpoints";
import { setActionLoader } from "@/src/state/slices/generalSlice";
import { useNotificationContext } from "@/src/contexts/NotificationContext";
import { ChatIcon } from "@/assets/icons";

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
    messageRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: moderateWidthScale(8),
      paddingTop: moderateHeightScale(14),
      marginTop: moderateHeightScale(10),
      borderTopWidth: 1,
      borderTopColor: theme.borderLine,
    },
    messageRowText: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
      textTransform: "capitalize",
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
      textTransform: "capitalize",
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
      textTransform: "capitalize",
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
    leaveCard: {
      minWidth: widthScale(100),
      minHeight: heightScale(72),
      paddingHorizontal: moderateWidthScale(12),
      paddingVertical: moderateHeightScale(12),
      borderRadius: moderateWidthScale(10),
      backgroundColor: theme.background,
      borderWidth: 1,
      borderColor: theme.borderLine,
      justifyContent: "center",
      gap: moderateHeightScale(4),
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

    reinviteLink: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontMedium,
      color: theme.lightGreen,
      textDecorationLine: "underline",
      textDecorationColor: theme.lightGreen,
    },
  });

interface CustomerRole {
  id: number;
  name: string;
}

interface CustomerDetailData {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  country_code: string | null;
  country_name: string | null;
  zip_code: string | null;
  date_of_birth: string | null;
  email_notifications: boolean;
  profile_image_url: string | null;
  email_verified_at: string | null;
  created_at: string;
  updated_at: string;
  ai_quota: number;
  roles: CustomerRole[];
  subscriptions: unknown[];
  appointments: unknown[];
  reviews: unknown[];
  documents: unknown[];
}

function formatDate(dateString: string | null): string {
  if (!dateString) return "--";
  const d = new Date(dateString);
  if (Number.isNaN(d.getTime())) return dateString;
  return d.toLocaleDateString();
}

export default function CustomerDetail() {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);
  const router = useRouter();
  const dispatch = useDispatch();
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ id?: string }>();
  const customerId = params.id;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<CustomerDetailData | null>(null);

  const fetchCustomerDetails = useCallback(async () => {
    if (!customerId) {
      setError("Customer profile not found");
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
        data?: CustomerDetailData;
      }>(userEndpoints.detailsById(customerId));

      if (!response?.success || !response.data) {
        setError(response?.message || "Customer profile not found");
        setData(null);
      } else {
        setData(response.data);
        setError(null);
      }
    } catch (err: any) {
      const apiMessage = err?.data?.message || err?.data?.error;
      setError(apiMessage || err?.message || "Customer profile not found");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  useFocusEffect(
    useCallback(() => {
      fetchCustomerDetails();
    }, [fetchCustomerDetails]),
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />
        <StackHeader title={t("cusDetail")} />
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
        <StackHeader title={t("cusDetail")} />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <RetryButton onPress={fetchCustomerDetails} loading={loading} />
        </View>
      </View>
    );
  }

  if (!data) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />
        <StackHeader title={t("cusDetail")} />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Customer profile not found</Text>
          <RetryButton onPress={fetchCustomerDetails} loading={loading} />
        </View>
      </View>
    );
  }

  const profileImageUrl = data.profile_image_url
    ? data.profile_image_url.startsWith("http://") ||
      data.profile_image_url.startsWith("https://")
      ? data.profile_image_url
      : (process.env.EXPO_PUBLIC_API_BASE_URL || "") + data.profile_image_url
    : (process.env.EXPO_PUBLIC_DEFAULT_AVATAR_IMAGE ?? "");

  const primaryRole =
    data.roles && data.roles.length > 0 ? data.roles[0].name : null;
  const subscriptionsCount = data.subscriptions?.length ?? 0;
  const appointmentsCount = data.appointments?.length ?? 0;
  const reviewsCount = data.reviews?.length ?? 0;
  const documentsCount = data.documents?.length ?? 0;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <StackHeader title={t("cusDetail")} />
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
          </View>
          <Text style={styles.staffName}>{data.name}</Text>
          {primaryRole ? (
            <Text style={styles.description}>{primaryRole}</Text>
          ) : null}
        </View>

        <View style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.label}>{t("email")}</Text>
            <Text style={styles.value}>{data.email}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>{t("phone")}</Text>
            <Text style={styles.value}>{data.phone ?? "--"}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>{t("country")}</Text>
            <Text style={styles.value}>
              {data.country_name
                ? data.country_code
                  ? `${data.country_name} (${data.country_code})`
                  : data.country_name
                : "--"}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>{t("zipCode")}</Text>
            <Text style={styles.value}>{data.zip_code ?? "--"}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>{t("dateOfBirth")}</Text>
            <Text style={styles.value}>{formatDate(data.date_of_birth)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>{t("emailNotifications")}</Text>
            <Text style={styles.value}>
              {data.email_notifications ? t("on") || "On" : t("off") || "Off"}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>{t("memberSince")}</Text>
            <Text style={styles.value}>{formatDate(data.created_at)}</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t("activity") || "Activity"}</Text>
          <View style={styles.row}>
            <Text style={styles.label}>{t("subscriptions")}</Text>
            <Text style={styles.value}>{String(subscriptionsCount)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>{t("appointments")}</Text>
            <Text style={styles.value}>{String(appointmentsCount)}</Text>
          </View>
          {/* <View style={styles.row}>
            <Text style={styles.label}>{t("reviews")}</Text>
            <Text style={styles.value}>{String(reviewsCount)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>{t("documents")}</Text>
            <Text style={styles.value}>{String(documentsCount)}</Text>
          </View> */}
        </View>
      </ScrollView>
    </View>
  );
}
