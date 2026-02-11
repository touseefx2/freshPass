import React, { useMemo, useState, useEffect, useCallback } from "react";
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  StatusBar,
  ActivityIndicator,
} from "react-native";
import { useRouter, useLocalSearchParams, useFocusEffect } from "expo-router";
import { useTheme, useAppSelector, useAppDispatch } from "@/src/hooks/hooks";
import { useTranslation } from "react-i18next";
import {
  setSelectedServices,
  setSelectedStaff,
  resetBusiness,
  setBusinessData as setBusinessDataAction,
  type StaffMember,
} from "@/src/state/slices/bsnsSlice";
import { ApiService } from "@/src/services/api";
import { businessEndpoints } from "@/src/services/endpoints";
import { useNotificationContext } from "@/src/contexts/NotificationContext";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  heightScale,
  moderateWidthScale,
  moderateHeightScale,
  widthScale,
} from "@/src/theme/dimensions";
import { SvgXml } from "react-native-svg";
import { LeafLogo } from "@/assets/icons";
import Button from "@/src/components/button";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons, Octicons } from "@expo/vector-icons";
import AddServiceBottomSheet from "@/src/components/AddServiceBottomSheet";

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

interface Service {
  id: number;
  name: string;
  description: string;
  price: number;
  originalPrice: number;
  duration: string;
  label?: string | null;
}

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
    logoContainer: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(4),
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
      marginTop: moderateHeightScale(12),
    },
    scrollContent: {},
    title: {
      fontSize: fontSize.size24,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      marginBottom: moderateHeightScale(24),
    },
    serviceCard: {
      backgroundColor: theme.white,
      borderRadius: moderateWidthScale(12),
      padding: moderateWidthScale(16),
      borderBottomWidth: 1,
      borderColor: theme.borderLight,
    },
    serviceHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      marginBottom: moderateHeightScale(12),
    },
    serviceName: {
      flex: 1,
      fontSize: fontSize.size16,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      maxWidth: "80%",
    },
    deleteButton: {},
    priceContainer: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(8),
    },
    originalPrice: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontMedium,
      color: theme.lightGreen4,
      textDecorationLine: "line-through",
    },
    currentPrice: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
    },
    descriptionText: {
      flex: 1,
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: theme.darkGreen,
    },
    addServiceSection: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: moderateHeightScale(20),
      paddingHorizontal: moderateWidthScale(20),
      backgroundColor: theme.orangeBrown30,
      paddingVertical: moderateHeightScale(12),
    },
    addServiceText: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
    },
    addServiceButton: {
      width: widthScale(22),
      height: heightScale(22),
      borderRadius: 4,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1.5,
      borderColor: theme.selectCard,
    },
    staffTitle: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      marginBottom: moderateHeightScale(12),
      paddingHorizontal: moderateWidthScale(20),
    },
    staffList: {
      flexDirection: "row",
      gap: moderateWidthScale(12),
      paddingHorizontal: moderateWidthScale(20),
      paddingBottom: moderateHeightScale(2),
    },
    staffCard: {
      width: widthScale(180),
      backgroundColor: theme.white,
      borderRadius: moderateWidthScale(12),
      padding: moderateWidthScale(12),
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(12),
    },
    shadow: {
      shadowColor: theme.shadow,
      shadowOffset: {
        width: 0,
        height: 1,
      },
      shadowOpacity: 0.18,
      shadowRadius: 1.0,
      elevation: 1,
    },
    staffCardSelected: {},
    staffCardAnyone: {
      justifyContent: "space-between",
      width: widthScale(130),
      backgroundColor: theme.lightGreen015,
    },
    staffImage: {
      width: widthScale(35),
      height: widthScale(35),
      borderRadius: widthScale(35 / 2),
      backgroundColor: theme.emptyProfileImage,
      borderWidth: 1,
      borderColor: theme.borderLight,
      overflow: "hidden",
    },
    staffInfo: {
      flex: 1,
    },
    staffName: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
      marginBottom: moderateHeightScale(2),
    },
    staffExperience: {
      fontSize: fontSize.size11,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
    },
    radioButton: {
      width: moderateWidthScale(20),
      height: moderateWidthScale(20),
      borderRadius: moderateWidthScale(10),
      borderWidth: 2,
      borderColor: theme.lightGreen2,
      alignItems: "center",
      justifyContent: "center",
    },
    radioButtonInner: {
      width: moderateWidthScale(10),
      height: moderateWidthScale(10),
      borderRadius: moderateWidthScale(5),
      backgroundColor: theme.orangeBrown,
    },
    priceBreakdown: {
      padding: moderateWidthScale(20),
    },
    priceRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: moderateHeightScale(12),
    },
    priceRowLast: {
      marginBottom: 0,
    },
    priceLabel: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.darkGreen,
    },
    priceValue: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
    },
    bottom: {
      backgroundColor: theme.white,
      paddingHorizontal: moderateWidthScale(20),
      gap: moderateHeightScale(16),
      paddingVertical: moderateHeightScale(12),
      borderColor: theme.borderLight,
      borderTopWidth: 1,
    },
    totalSection: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    totalLabel: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    totalValue: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
    },
  });

export default function BookingNow() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);
  const { showBanner } = useNotificationContext();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const params = useLocalSearchParams<{
    business_id?: string;
    service_id?: string;
  }>();

  // Get data from Redux
  const businessData = useAppSelector((state) => state.bsns);
  const {
    allServices,
    staffMembers,
    selectedServices: reduxSelectedServices,
    selectedStaff: reduxSelectedStaff,
    businessId: reduxBusinessId,
  } = businessData || {
    selectedService: null,
    allServices: [],
    staffMembers: [],
    selectedServices: [],
    selectedStaff: "anyone",
    businessId: "",
  };

  // Use Redux directly - no local state needed
  const selectedServices = useMemo(() => {
    if (reduxSelectedServices.length > 0) {
      return reduxSelectedServices;
    } else {
      return [];
    }
  }, [reduxSelectedServices]);

  const selectedStaff = reduxSelectedStaff || "anyone";
  const [addServiceModalVisible, setAddServiceModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Always fetch business data - API call happens in both cases
  const fetchBusinessDetails = useCallback(async () => {
    // Get business_id from params or from Redux (when coming from businessDetail)
    const businessId = params.business_id || reduxBusinessId;
    if (!businessId) {
      return;
    }

    // Check if Redux already has data - if yes, don't show loader
    const hasReduxData =
      reduxBusinessId === businessId && allServices.length > 0;

    try {
      // Only show loading indicator if Redux doesn't have data
      if (!hasReduxData) {
        setLoading(true);
      }
      setError(null);
      const response = await ApiService.get<{
        success: boolean;
        message: string;
        data: {
          business: any;
        };
      }>(businessEndpoints.businessDetails(businessId));

      if (response.success && response.data?.business) {
        const businessData = response.data.business;

        // Parse business hours from API format to Redux format
        const parseTimeToHoursMinutes = (
          timeString: string | null | undefined,
        ): { hours: number; minutes: number } => {
          if (!timeString || typeof timeString !== "string") {
            return { hours: 0, minutes: 0 };
          }
          const [hours, minutes] = timeString.split(":").map(Number);
          return { hours: hours || 0, minutes: minutes || 0 };
        };

        const getDayDisplayFormat = (day: string): string => {
          if (!day) return day;
          const dayLower = day.toLowerCase();
          const dayMap: { [key: string]: string } = {
            monday: "Monday",
            tuesday: "Tuesday",
            wednesday: "Wednesday",
            thursday: "Thursday",
            friday: "Friday",
            saturday: "Saturday",
            sunday: "Sunday",
          };
          return dayMap[dayLower] || day;
        };

        const parseBusinessHours = (hoursArray: any[] | null | undefined) => {
          if (
            !hoursArray ||
            !Array.isArray(hoursArray) ||
            hoursArray.length === 0
          ) {
            return null;
          }

          const businessHours: { [key: string]: any } = {};

          // Initialize all days with default closed state
          const DAYS = [
            "Monday",
            "Tuesday",
            "Wednesday",
            "Thursday",
            "Friday",
            "Saturday",
            "Sunday",
          ];
          DAYS.forEach((day) => {
            businessHours[day] = {
              isOpen: false,
              fromHours: 0,
              fromMinutes: 0,
              tillHours: 0,
              tillMinutes: 0,
              breaks: [],
            };
          });

          // Parse API hours
          hoursArray.forEach((dayData: any) => {
            const dayName = getDayDisplayFormat(dayData.day);
            if (!DAYS.includes(dayName)) return;

            let fromHours = 0;
            let fromMinutes = 0;
            let tillHours = 0;
            let tillMinutes = 0;

            if (dayData.opening_time) {
              const parsed = parseTimeToHoursMinutes(dayData.opening_time);
              fromHours = parsed.hours;
              fromMinutes = parsed.minutes;
            }

            if (dayData.closing_time) {
              const parsed = parseTimeToHoursMinutes(dayData.closing_time);
              tillHours = parsed.hours;
              tillMinutes = parsed.minutes;
            }

            const breaks = (dayData.break_hours || []).map((breakTime: any) => {
              const { hours: breakFromHours, minutes: breakFromMinutes } =
                parseTimeToHoursMinutes(breakTime.start || "00:00");
              const { hours: breakTillHours, minutes: breakTillMinutes } =
                parseTimeToHoursMinutes(breakTime.end || "00:00");
              return {
                fromHours: breakFromHours,
                fromMinutes: breakFromMinutes,
                tillHours: breakTillHours,
                tillMinutes: breakTillMinutes,
              };
            });

            businessHours[dayName] = {
              isOpen: !dayData.closed,
              fromHours,
              fromMinutes,
              tillHours,
              tillMinutes,
              breaks,
            };
          });

          return businessHours;
        };

        // Get individual services
        const individualServices = businessData.services || [];

        // Map all services - convert API format to Redux format
        const allServicesData = individualServices.map((s: any) => {
          // Convert price from string to number
          const price = parseFloat(s.price) || 0;
          // Calculate originalPrice (10% more) or use same as price if not available
          const originalPrice = s.originalPrice
            ? parseFloat(s.originalPrice)
            : parseFloat((price * 1.1).toFixed(2));

          // Format duration from hours and minutes
          const durationHours = s.duration_hours || 0;
          const durationMinutes = s.duration_minutes || 0;
          let durationText = "";
          if (durationHours > 0 && durationMinutes > 0) {
            durationText = `${durationHours} hr ${durationMinutes} min`;
          } else if (durationHours > 0) {
            durationText = `${durationHours} hr`;
          } else if (durationMinutes > 0) {
            durationText = `${durationMinutes} min`;
          } else {
            durationText = "N/A";
          }

          return {
            id: s.id,
            name: s.name,
            description: s.description || "",
            price: price,
            originalPrice: originalPrice,
            duration: durationText,
            label: s.label || null,
          };
        });

        // Map staff members with working_hours
        const staffMembersData = (businessData?.staff || [])
          .filter((staff: any) => staff.invitation_status === "accepted")
          .map((staff: any) => {
            // Construct image URL from API response
            const DEFAULT_AVATAR_URL =
              process.env.EXPO_PUBLIC_DEFAULT_AVATAR_IMAGE ?? "";

            let image = DEFAULT_AVATAR_URL;
            if (staff.avatar) {
              const isAbsoluteUrl =
                typeof staff.avatar === "string" &&
                (staff.avatar.startsWith("http://") ||
                  staff.avatar.startsWith("https://"));

              if (isAbsoluteUrl) {
                image = staff.avatar;
              } else {
                image = `${process.env.EXPO_PUBLIC_API_BASE_URL}${staff.avatar}`;
              }
            }

            // Parse working_hours if available (even if empty array)
            const staffWorkingHours = parseBusinessHours(staff.working_hours);

            return {
              id: staff.id || staff.user_id || 0,
              name: staff.name || "Staff Member",
              experience: staff?.description ?? null,
              image: image,
              working_hours: staffWorkingHours,
              active: staff.active,
            };
          });

        const businessHoursData = parseBusinessHours(businessData?.hours);

        // Find the service to select - use service_id from params if provided
        // If coming from businessDetail, use the service that was already selected in Redux
        // If coming from DashboardContent, use service_id from params
        const serviceIdToSelect = params.service_id
          ? parseInt(params.service_id)
          : null;

        let serviceToSelect = null;
        if (serviceIdToSelect && allServicesData.length > 0) {
          // Find service by ID from params (DashboardContent case)
          serviceToSelect =
            allServicesData.find((s: Service) => s.id === serviceIdToSelect) ||
            allServicesData[0];
        } else if (hasReduxData && reduxSelectedServices.length > 0) {
          // If Redux has data, keep the already selected service (businessDetail case)
          const selectedServiceId = reduxSelectedServices[0].id;
          serviceToSelect =
            allServicesData.find((s: Service) => s.id === selectedServiceId) ||
            allServicesData[0];
        } else if (allServicesData.length > 0) {
          // Fallback to first service
          serviceToSelect = allServicesData[0];
        }

        const businessPayload = {
          selectedService: serviceToSelect,
          allServices: allServicesData,
          staffMembers: staffMembersData,
          businessId: businessId,
          businessHours: businessHoursData,
        };

        dispatch(setBusinessDataAction(businessPayload));

        // Set selected service in selectedServices - preserve existing selection if from businessDetail
        if (serviceToSelect) {
          if (hasReduxData && reduxSelectedServices.length > 0) {
            // Keep existing selection from Redux (businessDetail case)
            const existingService = allServicesData.find(
              (s: Service) => s.id === reduxSelectedServices[0].id,
            );
            if (existingService) {
              dispatch(setSelectedServices([existingService]));
            } else {
              dispatch(setSelectedServices([serviceToSelect]));
            }
          } else {
            // New selection (DashboardContent case or first time)
            dispatch(setSelectedServices([serviceToSelect]));
          }
        }
      } else {
        setError("Failed to load business details");
        showBanner(t("error"), t("failedToLoadBusinessDetails"), "error", 4000);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load business details");
      showBanner(
        "Error",
        err.message || "Failed to load business details. Please try again.",
        "error",
        4000,
      );
    } finally {
      // Only set loading to false if we were showing loader
      if (!hasReduxData) {
        setLoading(false);
      }
    }
  }, [
    params.business_id,
    params.service_id,
    reduxBusinessId,
    allServices.length,
    reduxSelectedServices,
    dispatch,
    showBanner,
  ]);

  // Fetch data on mount - check both params and Redux for business_id
  useEffect(() => {
    // Call API if we have business_id from params OR from Redux (businessDetail case)
    if (params.business_id || reduxBusinessId) {
      fetchBusinessDetails();
    }

    return () => {
      dispatch(resetBusiness());
    };
  }, []);

  const staffList = [
    {
      id: "anyone",
      name: "Anyone who's available",
      experience: null,
      image: null,
      active: null,
    },
    ...staffMembers.map((staff) => ({
      id: staff.id.toString(),
      name: staff.name,
      experience: staff.experience ?? null,
      image: staff.image,
      active: staff.active,
    })),
  ];
  const totalPrice = selectedServices.reduce(
    (sum, service) => sum + service.price,
    0,
  );

  const handleDeleteService = (serviceId: number) => {
    const updatedServices = selectedServices.filter(
      (service) => service.id !== serviceId,
    );
    dispatch(setSelectedServices(updatedServices));
  };

  const handleAddService = () => {
    setAddServiceModalVisible(true);
  };

  const handleCloseModal = useCallback(() => {
    setAddServiceModalVisible(false);
  }, []);

  const handleUpdateSelectedServices = useCallback(
    (services: Service[]) => {
      dispatch(setSelectedServices(services));
    },
    [dispatch],
  );

  // Memoize selectedServiceIds to prevent infinite loops
  const selectedServiceIds = useMemo(
    () => selectedServices.map((s) => s.id),
    [selectedServices],
  );

  // Show loading indicator while fetching data
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => {
                router.back();
              }}
            >
              <BackArrowIcon
                width={widthScale(25)}
                height={heightScale(25)}
                color={theme.darkGreen}
              />
            </TouchableOpacity>
            <View style={styles.logoContainer}>
              <LeafLogo
                width={widthScale(22)}
                height={heightScale(22)}
                color1={theme.darkGreen}
                color2={theme.darkGreen}
              />
              <Text style={styles.logoText}>FRESHPASS</Text>
            </View>
          </View>
        </View>
        <View style={styles.line} />
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <ActivityIndicator size="large" color={theme.darkGreen} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              router.back();
            }}
          >
            <BackArrowIcon
              width={widthScale(25)}
              height={heightScale(25)}
              color={theme.darkGreen}
            />
          </TouchableOpacity>
          <View style={styles.logoContainer}>
            <LeafLogo
              width={widthScale(22)}
              height={heightScale(22)}
              color1={theme.darkGreen}
              color2={theme.darkGreen}
            />
            <Text style={styles.logoText}>FRESHPASS</Text>
          </View>
        </View>
      </View>

      <View style={styles.line} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Service Details */}
        {selectedServices.map((service) => (
          <View key={service.id} style={styles.serviceCard}>
            <View style={styles.serviceHeader}>
              <Text style={styles.serviceName}>{service.name}</Text>
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => handleDeleteService(service.id)}
              >
                <MaterialIcons
                  name="delete-outline"
                  size={moderateWidthScale(20)}
                  color={theme.red}
                />
              </TouchableOpacity>
            </View>

            <View style={{ gap: moderateHeightScale(4) }}>
              <View style={styles.priceContainer}>
                <Text style={styles.currentPrice}>
                  - ${service.price.toFixed(2)} USD
                </Text>
                <Text style={styles.originalPrice}>
                  ${service.originalPrice.toFixed(2)} USD
                </Text>
              </View>

              <Text style={styles.descriptionText}>
                - {service.description}
              </Text>
            </View>
          </View>
        ))}

        {/* Add Another Service */}
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={handleAddService}
          style={styles.addServiceSection}
        >
          <Text style={styles.addServiceText}>Add another service</Text>
          <View style={styles.addServiceButton}>
            <Octicons
              name="plus"
              size={moderateWidthScale(16)}
              color={theme.selectCard}
            />
          </View>
        </TouchableOpacity>

        {/* Staff Selection */}
        <View>
          <Text style={styles.staffTitle}>Choose staff members</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.staffList}
          >
            {staffList.map((staff) => {
              const isAnyone = staff.id === "anyone";
              const isActive = staff.active;
              console.log("isActive", isActive);

              return (
                <TouchableOpacity
                  activeOpacity={0.7}
                  key={staff.id}
                  style={[
                    styles.staffCard,
                    selectedStaff === staff.id && styles.staffCardSelected,
                    isAnyone && styles.staffCardAnyone,
                    !isAnyone && styles.shadow,
                  ]}
                  onPress={() => {
                    dispatch(setSelectedStaff(staff.id));
                  }}
                >
                  <>
                    {!isAnyone && (
                      <Image
                        source={{ uri: staff.image || "" }}
                        style={styles.staffImage}
                      />
                    )}

                    <View style={styles.staffInfo}>
                      <Text
                        style={styles.staffName}
                        numberOfLines={isAnyone ? 2 : 1}
                      >
                        {staff.name}
                      </Text>
                      {staff.experience ? (
                        <Text style={styles.staffExperience} numberOfLines={1}>
                          {staff.experience}
                        </Text>
                      ) : null}
                    </View>
                    <View style={[styles.radioButton]}>
                      {selectedStaff === staff.id && (
                        <View style={styles.radioButtonInner} />
                      )}
                    </View>
                  </>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        <View style={[styles.line, { marginTop: moderateHeightScale(20) }]} />

        {/* Price Breakdown */}
        <View style={styles.priceBreakdown}>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Subtotal:</Text>
            <Text style={styles.priceValue}>${totalPrice.toFixed(2)} USD</Text>
          </View>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Tax:</Text>
            <Text style={styles.priceValue}>Calculated at the checkout</Text>
          </View>
          <View
            style={[
              styles.line,
              {
                backgroundColor: theme.lightGreen2,
                marginBottom: moderateHeightScale(12),
              },
            ]}
          />
          <View style={styles.priceRow}>
            <Text style={[styles.priceLabel, { fontFamily: fonts.fontBold }]}>
              Estimated Total:
            </Text>
            <Text style={[styles.priceValue, { fontFamily: fonts.fontBold }]}>
              ${totalPrice.toFixed(2)} USD
            </Text>
          </View>
        </View>
      </ScrollView>

      <View style={styles.bottom}>
        {/* Final Total */}
        <View style={styles.totalSection}>
          <Text style={styles.totalLabel}>Estimated total:</Text>
          <Text style={styles.totalValue}>${totalPrice.toFixed(2)} USD</Text>
        </View>

        {/* Checkout Button */}
        <Button
          title={t("checkout")}
          onPress={() => {
            if (selectedServices.length === 0) {
              showBanner(
                t("noServiceSelected"),
                t("pleaseSelectAtLeastOneService"),
                "warning",
                4000,
              );
              return;
            }
            // Data is already in Redux, just navigate
            router.push({
              pathname: "/(main)/bookingNow/checkout",
            });
          }}
        />
      </View>

      {/* Add Service Bottom Sheet */}
      <AddServiceBottomSheet
        visible={addServiceModalVisible}
        onClose={handleCloseModal}
        services={allServices}
        selectedServiceIds={selectedServiceIds}
        onUpdateServices={handleUpdateSelectedServices}
      />
    </SafeAreaView>
  );
}
