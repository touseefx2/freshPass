import React, { useMemo, useState, useEffect, useCallback } from "react";
import Logger from "@/src/services/logger";
import {
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ScrollView,
  Clipboard,
  BackHandler,
} from "react-native";
import { useRouter, useLocalSearchParams, useFocusEffect } from "expo-router";
import { useTheme } from "@/src/hooks/hooks";
import { useNotificationContext } from "@/src/contexts/NotificationContext";
import { Theme } from "@/src/theme/colors";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  heightScale,
  moderateHeightScale,
  moderateWidthScale,
  widthScale,
} from "@/src/theme/dimensions";
import { fontSize, fonts } from "@/src/theme/fonts";
import { SvgXml } from "react-native-svg";
import { MaterialIcons, Feather, Ionicons } from "@expo/vector-icons";
import Button from "@/src/components/button";
import dayjs from "dayjs";

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
  experience: number | null;
  image: string | null;
}

// Back Arrow Icon SVG
const backArrowIconSvg = `
<svg width="{{WIDTH}}" height="{{HEIGHT}}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M20 11H7.83L13.42 5.41L12 4L4 12L12 20L13.41 18.59L7.83 13H20V11Z" fill="{{COLOR}}"/>
</svg>
`;

const BackArrowIcon = ({ width = 24, height = 24, color = "#FFFFFF" }) => {
  const svgXml = backArrowIconSvg
    .replace(/{{WIDTH}}/g, width.toString())
    .replace(/{{HEIGHT}}/g, height.toString())
    .replace(/{{COLOR}}/g, color);
  return <SvgXml xml={svgXml} />;
};

// Scissors Icon SVG
const scissorsIconSvg = `
<svg width="{{WIDTH}}" height="{{HEIGHT}}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M9.5 6.5C10.3284 6.5 11 5.82843 11 5C11 4.17157 10.3284 3.5 9.5 3.5C8.67157 3.5 8 4.17157 8 5C8 5.82843 8.67157 6.5 9.5 6.5Z" fill="{{COLOR}}"/>
<path d="M9.5 20.5C10.3284 20.5 11 19.8284 11 19C11 18.1716 10.3284 17.5 9.5 17.5C8.67157 17.5 8 18.1716 8 19C8 19.8284 8.67157 20.5 9.5 20.5Z" fill="{{COLOR}}"/>
<path d="M20.5 4L9.5 12L20.5 20" stroke="{{COLOR}}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M3.5 4L14.5 12L3.5 20" stroke="{{COLOR}}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
</svg>
`;

const ScissorsIcon = ({ width = 24, height = 24, color = "#283618" }) => {
  const svgXml = scissorsIconSvg
    .replace(/{{WIDTH}}/g, width.toString())
    .replace(/{{HEIGHT}}/g, height.toString())
    .replace(/{{COLOR}}/g, color);
  return <SvgXml xml={svgXml} />;
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: moderateWidthScale(20),
      paddingVertical: moderateHeightScale(12),
    },
    headerLeft: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(8),
    },
    backButton: {
      width: widthScale(32),
      height: heightScale(32),
      borderRadius: moderateWidthScale(8),
      backgroundColor: "rgba(255, 255, 255, 0.2)",
      alignItems: "center",
      justifyContent: "center",
      marginRight: moderateWidthScale(8),
    },
    logoText: {
      fontSize: fontSize.size18,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    line: {
      width: "100%",
      height: 1.1,
      backgroundColor: theme.borderLight,
      alignSelf: "center",
    },
    lineV: {
      width: 1.1,
      height: "100%",
      backgroundColor: theme.borderLight,
    },
    scrollContent: {
      paddingBottom: moderateHeightScale(30),
    },
    section: {
      backgroundColor: theme.white,
      paddingVertical: moderateHeightScale(8),
      gap: moderateHeightScale(12),
      borderBottomWidth: 1,
      borderColor: theme.borderLight,
    },
    bookingInfoCard: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    bookingInfoRow: {
      width: "65%",
      paddingHorizontal: moderateWidthScale(20),
    },
    bookingInfoRowLast: {
      width: "30%",
      paddingHorizontal: moderateWidthScale(20),
    },
    bookingInfoLabel: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.darkGreen,
    },
    bookingInfoValue: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
    },
    copyButton: {
      padding: moderateWidthScale(4),
    },
    confirmationCard: {
      gap: moderateWidthScale(6),
      paddingHorizontal: moderateWidthScale(20),
    },
    confirmationCardRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(8),
    },
    confirmationIcon: {
      width: widthScale(40),
      height: heightScale(40),
      alignItems: "center",
      justifyContent: "center",
    },
    confirmationTitle: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      marginBottom: moderateHeightScale(4),
    },
    confirmationMessage: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
    },
    serviceCard: {
      paddingHorizontal: moderateWidthScale(20),
    },
    serviceName: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontMedium,
      color: theme.lightGreen,
      marginBottom: moderateHeightScale(8),
    },
    serviceDescription: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
    },
    servicePriceRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(8),
    },
    servicePriceColumn: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(8),
    },
    serviceCurrentPrice: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontMedium,
      color: theme.lightGreen,
    },
    serviceOriginalPrice: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontMedium,
      color: theme.lightGreen4,
      textDecorationLine: "line-through",
    },
    serviceIncludes: {
      marginTop: moderateHeightScale(12),
    },
    serviceIncludeItem: {
      flexDirection: "row",
      alignItems: "flex-start",
      marginBottom: moderateHeightScale(8),
    },
    bulletPoint: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.darkGreen,
      marginRight: moderateWidthScale(4),
      marginTop: moderateHeightScale(2),
    },
    serviceIncludeText: {
      flex: 1,
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.darkGreen,
      lineHeight: moderateHeightScale(18),
    },
    summaryCard: {
      padding: moderateWidthScale(20),
      gap: moderateHeightScale(12),
    },
    summaryTitle: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    summaryTitle2: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontMedium,
      color: theme.lightGreen,
    },
    summaryRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    summaryRowLast: {
      marginBottom: 0,
    },
    summaryLabel: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
    },
    summaryValue: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
    },
    summaryTotalLabel: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
    },
    summaryTotalValue: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
    },
    divider: {
      height: 1,
      backgroundColor: theme.borderLight,
    },
    salonCard: {
      paddingHorizontal: moderateWidthScale(20),
      paddingVertical: moderateHeightScale(12),
    },
    salonLabel: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      marginBottom: moderateHeightScale(8),
    },
    salonName: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontMedium,
      color: theme.lightGreen,
      marginBottom: moderateHeightScale(4),
    },
    salonAddress: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      lineHeight: moderateHeightScale(20),
    },
    noteCard: {
      paddingHorizontal: moderateWidthScale(20),
      paddingVertical: moderateHeightScale(12),
    },
    noteLabel: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      marginBottom: moderateHeightScale(8),
    },
    noteText: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      lineHeight: moderateHeightScale(18),
    },
    staffCard: {
      padding: moderateWidthScale(20),
    },
    staffLabel: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      marginBottom: moderateHeightScale(8),
    },
    staffName: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
      marginBottom: moderateHeightScale(4),
    },
    staffExperience: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
    },
    paymentCard: {
      backgroundColor: theme.white,
      borderRadius: moderateWidthScale(12),
      padding: moderateWidthScale(20),
      marginTop: moderateHeightScale(20),
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(12),
    },
    paymentMethod: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
    },
    actionContainer: {
      width: "100%",
      backgroundColor: theme.lightGreen05,
      paddingVertical: moderateHeightScale(16),
      paddingHorizontal: moderateWidthScale(20),
      alignItems:"center",
      justifyContent:"center"
    },
    actionSection: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      width: "70%",
    },
    actionButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(12),
    },
    actionText: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontMedium,
      color: theme.lightGreen,
    },
    policySection: {
      backgroundColor: theme.white,
      paddingVertical: moderateHeightScale(12),
    },
    policyRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: moderateWidthScale(20),
      paddingVertical: moderateHeightScale(12),
    },
    policyText: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
    },
    bottomButton: {
      paddingHorizontal: moderateWidthScale(20),
      paddingBottom: moderateHeightScale(20),
      paddingTop: moderateHeightScale(2),
    },
  });

export default function BookingDetail() {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);
  const { showBanner } = useNotificationContext();
  const router = useRouter();
  const params = useLocalSearchParams<{
    appointmentId?:string;
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
    note?: string;
    subscriptionId?: string;
    fromCheckoutBooking?: string;
  }>();

  const [selectedServices, setSelectedServices] = useState<Service[]>([]);
  const [selectedStaffMember, setSelectedStaffMember] =
    useState<StaffMember | null>(null);
  const [bookingDate, setBookingDate] = useState<string>("");

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

    if (params.selectedDate) {
      const date = dayjs(params.selectedDate);
      setBookingDate(date.format("MMM D, YYYY"));
    }
  }, []);

  const handleCopyBookingId = () => {
    if (params.bookingId) {
      Clipboard.setString(params.bookingId);
      showBanner("Copied", "Booking ID copied to clipboard", "success", 2000);
    }
  };

  const handleShare = () => {
    // Handle share functionality
    showBanner("Share", "Share functionality coming soon", "info", 2000);
  };

  const handleDownloadReceipt = () => {
    // Handle download receipt functionality
    showBanner(
      "Download",
      "Download receipt functionality coming soon",
      "info",
      2000
    );
  };

  const handleBackNavigation = useCallback(() => {
    if (params.businessId) {
      router.navigate("/(main)/dashboard/(home)" as any);
      // router.replace({
      //   pathname: "/(main)/businessDetail",
      //   params: { business_id: params.businessId },
      // });
    }  
  }, [params.businessId, router]);

  // Handle Android hardware back button
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        handleBackNavigation();
        return true; // Prevent default back behavior
      };

      const subscription = BackHandler.addEventListener(
        "hardwareBackPress",
        onBackPress
      );

      return () => subscription.remove();
    }, [handleBackNavigation])
  );

  const handleViewBooking = () => {
    // Navigate to booking tab
    router.navigate("/(main)/dashboard/(calendar)" as any);
  };

  // Dummy business data (in real app, fetch from businessId)
  const businessName = "Ra Benjamin Styles LLC";
  const businessAddress =
    "240 E Exchange Blvd, Columbia, SC 29209, United States.";

  const totalPrice = params.totalPrice ? parseFloat(params.totalPrice) : 0;
  const tax = params.tax ? parseFloat(params.tax) : 0;
  const bookingTotal = params.estimatedTotal
    ? parseFloat(params.estimatedTotal)
    : 0;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleBackNavigation}
          >
            <BackArrowIcon
              width={widthScale(25)}
              height={heightScale(25)}
              color={theme.darkGreen}
            />
          </TouchableOpacity>
          <Text style={styles.logoText}>Booking Detail</Text>
        </View>
      </View>

      <View style={styles.line} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Booking Info Section */}
        <View style={styles.section}>
          <View style={styles.bookingInfoCard}>
            <View style={styles.bookingInfoRow}>
              <Text style={styles.bookingInfoLabel}>Booking ID:</Text>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: moderateWidthScale(8),
                }}
              >
                <Text style={styles.bookingInfoValue}>
                  {params.bookingId || "N/A"}
                </Text>
                <TouchableOpacity
                  style={styles.copyButton}
                  onPress={handleCopyBookingId}
                >
                  <MaterialIcons
                    name="content-copy"
                    size={moderateWidthScale(18)}
                    color={theme.darkGreen}
                  />
                </TouchableOpacity>
              </View>
            </View>
            <View style={styles.lineV} />
            <View style={[styles.bookingInfoRow, styles.bookingInfoRowLast]}>
              <Text style={styles.bookingInfoLabel}>Date:</Text>
              <Text style={styles.bookingInfoValue}>
                {bookingDate || dayjs().format("MMM D, YYYY")}
              </Text>
            </View>
          </View>

          <View style={styles.line} />

          <View style={styles.confirmationCard}>
            <View style={styles.confirmationCardRow}>
              <ScissorsIcon
                width={widthScale(24)}
                height={heightScale(24)}
                color={theme.red}
              />
              <Text style={styles.confirmationTitle}>
                Your appointment is confirmed
              </Text>
            </View>

            <Text style={styles.confirmationMessage}>
              Booking confirmed! Can't wait to give you the Freshpass
              experience.
            </Text>
          </View>

          <View style={styles.line} />

          {selectedServices.length > 0 &&
            selectedServices.map((service, index) => (
              <React.Fragment key={service.id}>
                <View style={styles.serviceCard}>
                  <Text style={styles.serviceName}>{service.name}</Text>
                  <View style={styles.servicePriceRow}>
                    <Text style={styles.serviceCurrentPrice}>
                      - ${service.price.toFixed(2)} USD
                    </Text>
                    <Text style={styles.serviceOriginalPrice}>
                      ${service.originalPrice.toFixed(2)} USD
                    </Text>
                  </View>
                  {service.description && (
                    <Text style={styles.serviceDescription}>
                      - {service.description}
                    </Text>
                  )}
                </View>
                {index < selectedServices.length - 1 && (
                  <View style={[styles.line, { width: "90%" }]} />
                )}
              </React.Fragment>
            ))}
        </View>

        {/* Summary - Hide for subscription bookings from checkoutBooking */}
        {!params.fromCheckoutBooking && !params.subscriptionId && (
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>
              Summary <Text style={styles.summaryTitle2}>(you'll pay)</Text>
            </Text>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Subtotal:</Text>
              <Text style={styles.summaryValue}>
                ${totalPrice.toFixed(2)} USD
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Total Tax:</Text>
              <Text style={styles.summaryValue}>${tax.toFixed(2)} USD</Text>
            </View>
            <View style={styles.divider} />
            <View style={[styles.summaryRow, styles.summaryRowLast]}>
              <Text style={styles.summaryTotalLabel}>Booking Total:</Text>
              <Text style={styles.summaryTotalValue}>
                ${bookingTotal.toFixed(2)} USD
              </Text>
            </View>
          </View>
        )}

        {/* Salon Address */}
        <View style={styles.salonCard}>
          <Text style={styles.salonLabel}>Salon address:</Text>
          <Text style={styles.salonName}>{businessName}</Text>
          <Text style={styles.salonAddress}>{businessAddress}</Text>
        </View>

        {/* Note Section */}
        {params.note && params.note.trim() && (
          <View style={styles.noteCard}>
            <Text style={styles.noteLabel}>Note:</Text>
            <Text style={styles.noteText}>{params.note}</Text>
          </View>
        )}

        {/* Staff Member */}
          <View style={styles.staffCard}>
            <Text style={styles.staffLabel}>Staff member:</Text>
            <Text style={styles.staffName}>{selectedStaffMember?.name || "Anyone"}</Text>
            {selectedStaffMember?.experience && (
              <Text style={styles.staffExperience}>
                {selectedStaffMember.experience} Years Of Experience
              </Text>
            )}
          </View>
       

        {/* Action Buttons */}
        <View style={styles.actionContainer}>
          <View style={styles.actionSection}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleShare}
              activeOpacity={0.7}
            >
              <Text style={styles.actionText}>Share</Text>
              <Feather
                name="upload"
                size={moderateWidthScale(14)}
                color={theme.lightGreen}
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleDownloadReceipt}
              activeOpacity={0.7}
            >
              <Text style={styles.actionText}>Download receipt</Text>
              <Feather
                name="download"
                size={moderateWidthScale(15)}
                color={theme.lightGreen}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Policies */}
        <View style={styles.policySection}>
          <TouchableOpacity style={styles.policyRow} activeOpacity={0.7}>
            <Text style={styles.policyText}>Booking cancel policy</Text>
            <Feather
              name="chevron-right"
              size={moderateWidthScale(16)}
              color={theme.darkGreen}
            />
          </TouchableOpacity>
          <View style={styles.line} />
          <TouchableOpacity style={styles.policyRow} activeOpacity={0.7}>
            <Text style={styles.policyText}>Payment return policy</Text>
            <Feather
              name="chevron-right"
              size={moderateWidthScale(16)}
              color={theme.darkGreen}
            />
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Bottom Button */}
      <View style={styles.bottomButton}>
        <Button title="View bookings" onPress={handleViewBooking} />
      </View>
    </SafeAreaView>
  );
}
