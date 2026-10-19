import React, { useMemo, useState, useEffect, useCallback } from "react";
import Logger from "@/src/services/logger";
import ApiService from "@/src/services/api";
import { businessEndpoints } from "@/src/services/endpoints";
import {
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ScrollView,
  Clipboard,
  BackHandler,
  Linking,
  Platform,
  Share,
} from "react-native";
import { useRouter, useLocalSearchParams, useFocusEffect } from "expo-router";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/src/hooks/hooks";
import { useNotificationContext } from "@/src/contexts/NotificationContext";
import { Theme } from "@/src/theme/colors";
import {
  heightScale,
  moderateHeightScale,
  moderateWidthScale,
  widthScale,
} from "@/src/theme/dimensions";
import { fontSize, fonts } from "@/src/theme/fonts";
import { MaterialIcons } from "@expo/vector-icons";
import dayjs from "dayjs";
import AppImage from "@/src/components/AppImage";
import FlowHeader from "@/src/components/reelFlow/flowHeader";
import FlowFooter from "@/src/components/reelFlow/flowFooter";
import { FlowCard, SectionLabel } from "@/src/components/reelFlow/flowParts";
import {
  MoneyRow,
  RowDivider,
  SuccessHero,
  formatVisitMoney,
} from "@/src/components/afterVisit/afterVisitParts";
import { resolveApiImageUrl } from "@/src/utils/media";
import { getDefaultBusinessLogo } from "@/src/services/remoteConfigService";

interface Service {
  id: number;
  name: string;
  description: string;
  price: number;
  originalPrice: number;
  duration: string;
  label?: string | null;
}

interface StaffMember {
  id: number;
  name: string;
  // Typed as a number, but the API sends the staff's own text (e.g. "3 year exp").
  experience: number | string | null;
  image: string | null;
}

type IconName = React.ComponentProps<typeof MaterialIcons>["name"];

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    flex: { flex: 1 },
    content: {
      paddingHorizontal: moderateWidthScale(20),
      paddingTop: moderateHeightScale(16),
      paddingBottom: moderateHeightScale(28),
      gap: moderateHeightScale(16),
    },
    shareBtn: {
      width: widthScale(44),
      height: widthScale(44),
      borderRadius: widthScale(22),
      alignItems: "center",
      justifyContent: "center",
    },
    idPill: {
      alignSelf: "center",
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(10),
      minHeight: heightScale(44),
      paddingLeft: moderateWidthScale(18),
      paddingRight: moderateWidthScale(14),
      borderRadius: heightScale(22),
      backgroundColor: theme.white,
      borderWidth: 1,
      borderColor: theme.borderNormal,
    },
    idLabel: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
    },
    idValue: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      fontVariant: ["tabular-nums"],
    },
    idDot: {
      width: 1,
      height: heightScale(18),
      backgroundColor: theme.borderNormal,
    },
    summary: {
      overflow: "hidden",
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(14),
      paddingHorizontal: moderateWidthScale(16),
      paddingVertical: moderateHeightScale(14),
    },
    rowBorder: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.borderNormal,
    },
    roundIcon: {
      width: widthScale(44),
      height: widthScale(44),
      borderRadius: widthScale(22),
      backgroundColor: theme.lightGreen07,
      alignItems: "center",
      justifyContent: "center",
    },
    avatar: {
      width: widthScale(44),
      height: widthScale(44),
      borderRadius: widthScale(22),
      backgroundColor: theme.emptyProfileImage,
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
    },
    logo: {
      width: widthScale(44),
      height: widthScale(44),
      borderRadius: moderateWidthScale(12),
      backgroundColor: theme.emptyProfileImage,
    },
    avatarInitial: {
      fontSize: fontSize.size17,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    rowText: {
      flex: 1,
      minWidth: 0,
      gap: moderateHeightScale(2),
    },
    rowTitle: {
      fontSize: fontSize.size17,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    rowSub: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      lineHeight: fontSize.size20,
    },
    directionsBtn: {
      width: widthScale(44),
      height: widthScale(44),
      borderRadius: widthScale(22),
      backgroundColor: theme.buttonBack,
      alignItems: "center",
      justifyContent: "center",
    },
    card: {
      padding: moderateWidthScale(16),
      gap: moderateHeightScale(12),
    },
    lines: {
      gap: moderateHeightScale(12),
    },
    line: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: moderateWidthScale(12),
    },
    lineName: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
    },
    linePrices: {
      alignItems: "flex-end",
      gap: moderateHeightScale(2),
    },
    linePrice: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      fontVariant: ["tabular-nums"],
    },
    lineOriginal: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen4,
      textDecorationLine: "line-through",
      fontVariant: ["tabular-nums"],
    },
    payStatus: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(8),
      paddingHorizontal: moderateWidthScale(12),
      paddingVertical: moderateHeightScale(10),
      borderRadius: moderateWidthScale(12),
    },
    payStatusPaid: {
      backgroundColor: theme.mintTint,
    },
    payStatusDue: {
      backgroundColor: theme.upcomingCard,
    },
    payStatusText: {
      flex: 1,
      fontSize: fontSize.size14,
      fontFamily: fonts.fontMedium,
    },
    noteText: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontRegular,
      color: theme.darkGreen,
      lineHeight: fontSize.size21,
    },
  });

const formatSlotTo12h = (time24?: string): string => {
  if (!time24 || !/^\d{1,2}:\d{2}/.test(time24)) return "";
  const [h, m] = time24.split(":").map(Number);
  return `${h % 12 || 12}:${m.toString().padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
};

export default function BookingDetail() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);
  const { showBanner } = useNotificationContext();
  const router = useRouter();
  const params = useLocalSearchParams<{
    appointmentId?: string;
    bookingId?: string;
    selectedServices?: string;
    selectedStaff?: string;
    selectedStaffMember?: string;
    selectedDate?: string;
    selectedTimeSlot?: string;
    paymentMethod?: string;
    totalPrice?: string;
    tax?: string;
    estimatedTotal?: string;
    businessId?: string;
    business_id?: string;
    note?: string;
    subscriptionId?: string;
    fromCheckoutBooking?: string;
    business_name?: string;
    business_address?: string;
    business_logo_url?: string;
    business_latitude?: string;
    business_longitude?: string;
  }>();

  const businessIdParam = params.business_id || params.businessId;

  const [selectedServices, setSelectedServices] = useState<Service[]>([]);
  const [selectedStaffMember, setSelectedStaffMember] =
    useState<StaffMember | null>(null);
  const [businessData, setBusinessData] = useState<{
    businessName: string;
    businessAddress: string;
    businessLogoUrl: string;
    businessLatitude: string;
    businessLongitude: string;
  } | null>(null);

  useEffect(() => {
    if (params.selectedServices) {
      try {
        const services = JSON.parse(params.selectedServices);
        setSelectedServices(services);
      } catch (e) {
        Logger.error("Error parsing selectedServices:", e);
      }
    }

    if (params.selectedStaffMember) {
      try {
        const staff = JSON.parse(params.selectedStaffMember);
        setSelectedStaffMember(staff);
      } catch (e) {
        Logger.error("Error parsing selectedStaffMember:", e);
      }
    }
  }, []);

  const bookingDate = params.selectedDate
    ? dayjs(params.selectedDate).format("ddd, MMM D, YYYY")
    : dayjs().format("ddd, MMM D, YYYY");
  const bookingTime = formatSlotTo12h(params.selectedTimeSlot);

  const handleCopyBookingId = () => {
    if (params.bookingId) {
      Clipboard.setString(params.bookingId);
      showBanner(t("bkDoneIdCopied"), params.bookingId, "success", 2000);
    }
  };

  const handleBackNavigation = useCallback(() => {
    router.navigate("/(main)/dashboard/(home)" as any);
  }, [router]);

  // Handle Android hardware back button
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        handleBackNavigation();
        return true; // Prevent default back behavior
      };

      const subscription = BackHandler.addEventListener(
        "hardwareBackPress",
        onBackPress,
      );

      return () => subscription.remove();
    }, [handleBackNavigation]),
  );

  const handleViewBooking = () => {
    // Navigate to booking tab
    router.navigate("/(main)/dashboard/(calendar)" as any);
  };

  // Fetch business details by business_id (same as businessDetail) for modal and display
  const fetchBusinessDetails = async () => {
    if (!businessIdParam) return;
    try {
      const response = (await ApiService.get(
        businessEndpoints.businessDetails(businessIdParam),
      )) as any;
      // Handle both: full Axios response (response.data.data.business) or body only (response.data.business)
      const body = response?.data ?? response;
      const b =
        body?.data?.business ??
        body?.business ??
        (body && typeof body === "object" && "title" in body ? body : null);
      if (b) {
        const baseUrl = process.env.EXPO_PUBLIC_API_BASE_URL || "";
        const defaultLogo = getDefaultBusinessLogo();
        const rawLogo = b?.logo_url?.trim() || "";
        const businessLogoUrlResolved = !rawLogo
          ? defaultLogo
          : rawLogo.startsWith("http://") || rawLogo.startsWith("https://")
            ? rawLogo
            : `${baseUrl}${rawLogo}`;

        setBusinessData({
          businessName: b?.title ?? "",
          businessAddress: b?.address ?? "",
          businessLogoUrl: businessLogoUrlResolved,
          businessLatitude: b?.latitude?.toString() ?? "",
          businessLongitude: b?.longitude?.toString() ?? "",
        });
      }
    } catch (e) {
      Logger.error("BookingDetail fetchBusinessDetails:", e);
    }
  };

  useEffect(() => {
    fetchBusinessDetails();
  }, [businessIdParam]);

  const businessName =
    businessData?.businessName || params.business_name || "----";
  const businessAddress =
    businessData?.businessAddress || params.business_address || "";
  const businessLogoUrl =
    businessData?.businessLogoUrl || params.business_logo_url || "";
  const businessLatitude =
    businessData?.businessLatitude || params.business_latitude || "";
  const businessLongitude =
    businessData?.businessLongitude || params.business_longitude || "";

  const totalPrice = params.totalPrice ? parseFloat(params.totalPrice) : 0;
  const tax = params.tax ? parseFloat(params.tax) : 0;
  const bookingTotal = params.estimatedTotal
    ? parseFloat(params.estimatedTotal)
    : 0;
  // Subscription bookings are covered by the plan: no price summary.
  const showPricing = !params.fromCheckoutBooking && !params.subscriptionId;
  const isPayNow = params.paymentMethod === "payNow";
  const isPayLater = params.paymentMethod === "payLater";

  const handleDirections = async () => {
    if (!businessLatitude || !businessLongitude) {
      showBanner(t("error"), t("locationCoordinatesNotAvailable"), "error");
      return;
    }
    const encodedName = encodeURIComponent(businessName);
    const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${businessLatitude},${businessLongitude}&query_place_id=${encodedName}`;
    try {
      if (await Linking.canOpenURL(googleMapsUrl)) {
        await Linking.openURL(googleMapsUrl);
      } else if (Platform.OS === "ios") {
        await Linking.openURL(
          `http://maps.apple.com/?ll=${businessLatitude},${businessLongitude}&q=${encodedName}`,
        );
      } else {
        showBanner(t("error"), t("unableToOpenMaps"), "error");
      }
    } catch {
      showBanner(t("error"), t("unableToOpenMaps"), "error");
    }
  };

  const handleShare = () => {
    Share.share({
      message: t("bkDoneShareMessage", {
        business: businessName,
        when: [bookingDate, bookingTime].filter(Boolean).join(" · "),
        id: params.bookingId || "",
      }),
    }).catch((e) => Logger.error("BookingDetail share:", e));
  };

  const isAnyone = params.selectedStaff === "anyone" && !selectedStaffMember;
  const staffExperience = selectedStaffMember?.experience;
  const staffSub = isAnyone
    ? t("bkFlowAnyoneSub")
    : staffExperience == null || String(staffExperience).trim() === ""
      ? null
      : typeof staffExperience === "number"
        ? t("bkCheckoutYearsExp", { count: staffExperience })
        : String(staffExperience);
  const staffImage = resolveApiImageUrl(selectedStaffMember?.image);
  const staffInitial =
    selectedStaffMember?.name?.trim().charAt(0).toUpperCase() || "";

  const roundIcon = (name: IconName) => (
    <View style={styles.roundIcon}>
      <MaterialIcons
        name={name}
        size={moderateWidthScale(22)}
        color={theme.darkGreen}
      />
    </View>
  );

  const summaryRow = (
    key: string,
    icon: React.ReactNode,
    title: string,
    sub: string | null,
    first: boolean,
    right?: React.ReactNode,
  ) => (
    <View key={key} style={[styles.row, !first && styles.rowBorder]}>
      {icon}
      <View style={styles.rowText}>
        <Text style={styles.rowTitle} numberOfLines={2}>
          {title}
        </Text>
        {sub ? (
          <Text style={styles.rowSub} numberOfLines={3}>
            {sub}
          </Text>
        ) : null}
      </View>
      {right}
    </View>
  );

  const summaryRows = [
    summaryRow("when", roundIcon("event"), bookingDate, bookingTime || null, true),
    ...(selectedStaffMember || isAnyone
      ? [
          summaryRow(
            "staff",
            isAnyone ? (
              roundIcon("groups")
            ) : (
              <View style={styles.avatar}>
                {staffImage ? (
                  <AppImage
                    uri={staffImage}
                    style={StyleSheet.absoluteFill}
                    resizeMode="cover"
                    fallback={
                      <Text style={styles.avatarInitial}>{staffInitial}</Text>
                    }
                  />
                ) : (
                  <Text style={styles.avatarInitial}>{staffInitial}</Text>
                )}
              </View>
            ),
            isAnyone
              ? t("bkCheckoutAnyone")
              : selectedStaffMember?.name || t("bkCheckoutAnyone"),
            staffSub,
            false,
          ),
        ]
      : []),
    summaryRow(
      "salon",
      businessLogoUrl ? (
        <AppImage
          uri={businessLogoUrl}
          style={styles.logo}
          resizeMode="cover"
          fallback={roundIcon("storefront")}
        />
      ) : (
        roundIcon("storefront")
      ),
      businessName,
      businessAddress || null,
      false,
      businessLatitude && businessLongitude ? (
        <TouchableOpacity
          style={styles.directionsBtn}
          onPress={handleDirections}
          activeOpacity={0.8}
          hitSlop={6}
          accessibilityRole="button"
          accessibilityLabel={t("getDirections")}
        >
          <MaterialIcons
            name="directions"
            size={moderateWidthScale(22)}
            color={theme.white}
          />
        </TouchableOpacity>
      ) : null,
    ),
  ];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <FlowHeader
        title={t("bookingDetail")}
        onBack={handleBackNavigation}
        backIcon="close"
        right={
          <TouchableOpacity
            style={styles.shareBtn}
            onPress={handleShare}
            activeOpacity={0.6}
            accessibilityRole="button"
            accessibilityLabel={t("share")}
          >
            <MaterialIcons
              name={Platform.OS === "ios" ? "ios-share" : "share"}
              size={moderateWidthScale(22)}
              color={theme.darkGreen}
            />
          </TouchableOpacity>
        }
      />

      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <SuccessHero title={t("bkDoneTitle")} subtitle={t("bkDoneSubtitle")} />

        {params.bookingId ? (
          <TouchableOpacity
            style={styles.idPill}
            onPress={handleCopyBookingId}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={`${t("bkDoneBookingId")} ${params.bookingId}`}
            accessibilityHint={t("bkDoneCopyId")}
          >
            <Text style={styles.idLabel}>{t("bkDoneBookingId")}</Text>
            <View style={styles.idDot} />
            <Text style={styles.idValue}>{params.bookingId}</Text>
            <MaterialIcons
              name="content-copy"
              size={moderateWidthScale(18)}
              color={theme.buttonBack}
            />
          </TouchableOpacity>
        ) : null}

        <FlowCard style={styles.summary}>{summaryRows}</FlowCard>

        {selectedServices.length > 0 ? (
          <FlowCard style={styles.card}>
            <SectionLabel
              label={t("bkCheckoutServices")}
              meta={String(selectedServices.length)}
            />
            <View style={styles.lines}>
              {selectedServices.map((service) => {
                const price = Number(service.price) || 0;
                const original = Number(service.originalPrice) || 0;
                const sub = [
                  service.duration && service.duration !== "N/A"
                    ? service.duration
                    : null,
                  service.description,
                ]
                  .filter(Boolean)
                  .join(" · ");
                return (
                  <View key={service.id} style={styles.line}>
                    <View style={styles.rowText}>
                      <Text style={styles.lineName} numberOfLines={2}>
                        {service.name}
                      </Text>
                      {sub ? (
                        <Text style={styles.rowSub} numberOfLines={2}>
                          {sub}
                        </Text>
                      ) : null}
                    </View>
                    <View style={styles.linePrices}>
                      <Text style={styles.linePrice}>
                        {formatVisitMoney(price)}
                      </Text>
                      {original > price ? (
                        <Text style={styles.lineOriginal}>
                          {formatVisitMoney(original)}
                        </Text>
                      ) : null}
                    </View>
                  </View>
                );
              })}
            </View>

            {showPricing ? (
              <>
                <RowDivider />
                <MoneyRow
                  label={t("bkCheckoutSubtotal")}
                  value={formatVisitMoney(totalPrice)}
                />
                <MoneyRow
                  label={t("bkCheckoutTax")}
                  value={formatVisitMoney(tax)}
                />
                <RowDivider />
                <MoneyRow
                  label={t("bkCheckoutTotal")}
                  value={formatVisitMoney(bookingTotal)}
                  total
                />
                {isPayNow || isPayLater ? (
                  <View
                    style={[
                      styles.payStatus,
                      isPayNow ? styles.payStatusPaid : styles.payStatusDue,
                    ]}
                  >
                    <MaterialIcons
                      name={isPayNow ? "check-circle" : "storefront"}
                      size={moderateWidthScale(20)}
                      color={isPayNow ? theme.buttonBack : theme.selectCard}
                    />
                    <Text
                      style={[
                        styles.payStatusText,
                        {
                          color: isPayNow
                            ? theme.darkGreen
                            : theme.orangeBrownText,
                        },
                      ]}
                    >
                      {isPayNow ? t("bkDonePaidOnline") : t("bkDonePayAtSalon")}
                    </Text>
                  </View>
                ) : null}
              </>
            ) : null}
          </FlowCard>
        ) : null}

        {params.note && params.note.trim() ? (
          <FlowCard style={styles.card}>
            <SectionLabel label={t("bkFlowNote")} />
            <Text style={styles.noteText}>{params.note.trim()}</Text>
          </FlowCard>
        ) : null}
      </ScrollView>

      <FlowFooter
        primary={{
          label: t("viewBookings"),
          onPress: handleViewBooking,
          icon: "event-note",
        }}
      />
    </View>
  );
}
