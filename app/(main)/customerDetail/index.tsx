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
import { MaterialIcons, Ionicons } from "@expo/vector-icons";
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
    callNowButton: {
      backgroundColor: theme.darkGreenLight,
      width: widthScale(22),
      height: widthScale(22),
      borderRadius: widthScale(22 / 2),
      alignItems: "center",
      justifyContent: "center",
      marginLeft: moderateWidthScale(12),
    },
    phoneRow: {
      flexDirection: "row",
      alignItems: "center",
    },
    phoneLabel: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      width: widthScale(120),
      textTransform: "capitalize",
    },
    phoneValueWrap: {
      flex: 1,
      justifyContent: "center",
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
  const appointmentsArray = Array.isArray(data.appointments)
    ? (data.appointments as any[])
    : [];
  const completedAppointmentsCount = appointmentsArray.filter(
    (appt) => appt?.status === "completed",
  ).length;
  const appointmentsCount = appointmentsArray.length;
  const reviewsCount = data.reviews?.length ?? 0;
  const documentsCount = data.documents?.length ?? 0;

  const latestBusinessTitle =
    appointmentsArray.length > 0
      ? [...appointmentsArray]
          .sort((a, b) => {
            const aDate = a?.created_at ? new Date(a.created_at).getTime() : 0;
            const bDate = b?.created_at ? new Date(b.created_at).getTime() : 0;
            return bDate - aDate;
          })[0]?.business?.title ?? null
      : null;

  const isActive = appointmentsCount > 0;

  const customerPhone = (() => {
    const phone = data.phone;
    const countryCode = data.country_code;
    if (phone && countryCode) {
      return `${countryCode}${phone}`;
    }
    if (phone) return phone;
    return "";
  })();

  const handleCallNow = async () => {
    if (!customerPhone) return;
    const phoneNumber = customerPhone.replace(/[^\d+]/g, "");
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
  };

  const handleEmailNow = async () => {
    const email = data.email?.trim();
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
  };

  const handleChatPress = () => {
    if (!data?.id) return;

    router.push({
      pathname: "/(main)/chatBox",
      params: {
        id: String(data.id),
        chatItem: JSON.stringify({
          id: String(data.id),
          name: data.name ?? "",
          image: profileImageUrl,
        }),
      },
    });
  };

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
          <View style={styles.phoneRow}>
            <Text style={styles.label}>{t("email")}</Text>
            <View style={styles.phoneValueWrap}>
              <Text style={styles.value}>{data.email}</Text>
            </View>
            <TouchableOpacity
              style={styles.callNowButton}
              onPress={handleEmailNow}
              activeOpacity={0.7}
            >
              <Ionicons name="mail" size={widthScale(12)} color={theme.white} />
            </TouchableOpacity>
          </View>
          {latestBusinessTitle ? (
            <View style={styles.row}>
              <Text style={styles.label}>{t("business")}</Text>
              <Text style={styles.value}>{latestBusinessTitle}</Text>
            </View>
          ) : null}
          <View style={styles.row}>
            <Text style={styles.label}>{t("completedAppointmentsCount")}</Text>
            <Text style={styles.value}>{String(completedAppointmentsCount)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>{t("status")}</Text>
            <Text style={styles.value}>{isActive ? "Active" : "Inactive"}</Text>
          </View>
          {customerPhone ? (
            <View style={styles.phoneRow}>
              <Text style={styles.phoneLabel}>{t("phone")}</Text>
              <View style={styles.phoneValueWrap}>
                <Text style={styles.value}>{customerPhone}</Text>
              </View>
              <TouchableOpacity
                style={styles.callNowButton}
                onPress={handleCallNow}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="call"
                  size={widthScale(10)}
                  color={theme.white}
                />
              </TouchableOpacity>
            </View>
          ) : null}
          <TouchableOpacity
            style={styles.messageRow}
            onPress={handleChatPress}
            activeOpacity={0.7}
          >
            <ChatIcon
              width={widthScale(18)}
              height={heightScale(18)}
              color={theme.darkGreen}
            />
            <Text style={styles.messageRowText}>
              {t("message") || "Message"}
            </Text>
          </TouchableOpacity>
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
