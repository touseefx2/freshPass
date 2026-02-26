import React, {
  useMemo,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
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
  setSelectedDate,
  setSelectedTimeSlot,
  resetBusiness,
  setBusinessData as setBusinessDataAction,
  type StaffMember,
  type BusinessHours,
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
import { Feather } from "@expo/vector-icons";
import { MorningIcon, EveningIcon, NightIcon } from "@/assets/icons";
import AddServiceBottomSheet from "@/src/components/AddServiceBottomSheet";
import dayjs from "dayjs";
import weekOfYear from "dayjs/plugin/weekOfYear";
import isoWeek from "dayjs/plugin/isoWeek";

dayjs.extend(weekOfYear);
dayjs.extend(isoWeek);

const getWeekDays = (date: dayjs.Dayjs) => {
  const startOfWeek = date.startOf("week");
  return Array.from({ length: 7 }).map((_, i) => startOfWeek.add(i, "day"));
};

const formatWeekRange = (week: dayjs.Dayjs[]) => {
  if (week.length === 0) return "";
  const start = week[0];
  const end = week[6];
  return `${start.format("MMM D")} - ${end.format("MMM D, YYYY")}`;
};

const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const allTimeSlots = [
  "08:00",
  "08:30",
  "09:00",
  "09:30",
  "10:00",
  "10:30",
  "11:00",
  "11:30",
  "12:00",
  "12:30",
  "13:00",
  "13:30",
  "14:00",
  "14:30",
  "15:00",
  "15:30",
  "16:00",
  "16:30",
  "17:00",
  "17:30",
  "18:00",
  "18:30",
  "19:00",
  "19:30",
  "20:00",
  "20:30",
  "21:00",
  "21:30",
  "22:00",
];

const convertTo12Hour = (time24: string): string => {
  const [hours, minutes] = time24.split(":").map(Number);
  const hour12 =
    hours === 0 ? 12 : hours > 12 ? hours - 12 : hours === 12 ? 12 : hours;
  const ampm = hours < 12 ? "AM" : "PM";
  return `${hour12}:${minutes.toString().padStart(2, "0")} ${ampm}`;
};

const categorizeTimeSlots = (slots: string[]) => {
  const morning: string[] = [];
  const evening: string[] = [];
  const night: string[] = [];
  slots.forEach((slot) => {
    const [hours] = slot.split(":").map(Number);
    if (hours >= 6 && hours < 12) morning.push(slot);
    else if (hours >= 12 && hours < 18) evening.push(slot);
    else night.push(slot);
  });
  return { morning, evening, night };
};

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
    staffImageWrapper: {
      position: "relative",
      width: widthScale(35),
      height: widthScale(35),
      justifyContent: "center",
      alignItems: "center",
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
    staffStatusDot: {
      position: "absolute",
      bottom: 2,
      right: 2,
      width: moderateWidthScale(7),
      height: moderateWidthScale(7),
      borderRadius: moderateWidthScale(7) / 2,
      zIndex: 9999,
    },
    staffStatusDotActive: {
      backgroundColor: theme.toggleActive,
    },
    staffStatusDotInactive: {
      backgroundColor: theme.lightGreen5,
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
    section: {
      marginTop: moderateHeightScale(16),
    },
    sectionTitle: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      marginBottom: moderateHeightScale(20),
      paddingHorizontal: moderateWidthScale(20),
    },
    weekNavigation: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: moderateHeightScale(16),
      paddingHorizontal: moderateWidthScale(20),
    },
    weekNavigationButton: {
      width: moderateWidthScale(32),
      height: moderateWidthScale(40),
      borderRadius: moderateWidthScale(6),
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: theme.borderLight,
    },
    weekRangeText: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
    },
    calendarGrid: {
      marginBottom: moderateHeightScale(16),
      paddingHorizontal: moderateWidthScale(20),
    },
    daysHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: moderateHeightScale(12),
    },
    dayHeader: {
      flex: 1,
      alignItems: "center",
    },
    dayHeaderText: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
    },
    daysRow: {
      flexDirection: "row",
      justifyContent: "space-between",
    },
    dayContainer: {
      flex: 1,
      alignItems: "center",
    },
    dayNumberContainer: {
      width: widthScale(35),
      height: widthScale(35),
      borderRadius: widthScale(35 / 2),
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: "transparent",
    },
    dayNumberSelected: {
      backgroundColor: theme.orangeBrown30,
      borderColor: theme.selectCard,
    },
    dayNumber: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
    },
    dayNumberSelectedText: {
      color: theme.darkGreen,
    },
    dayNumberDisabled: {
      opacity: 0.3,
    },
    dayNumberDisabledText: {
      color: theme.lightGreen,
    },
    timezoneText: {
      fontSize: fontSize.size11,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      marginBottom: moderateHeightScale(5),
      paddingHorizontal: moderateWidthScale(20),
    },
    timeSlotSection: {
      marginTop: moderateHeightScale(16),
    },
    timeSlotCategoryRow: {
      flexDirection: "row",
      paddingHorizontal: moderateWidthScale(20),
      marginBottom: moderateHeightScale(16),
      borderBottomWidth: 1,
      borderBottomColor: theme.lightGreen2,
    },
    timeSlotCategoryButton: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: moderateHeightScale(12),
      position: "relative",
    },
    timeSlotCategoryUnderline: {
      position: "absolute",
      bottom: -1,
      left: 0,
      right: 0,
      height: 2,
      backgroundColor: theme.orangeBrown,
    },
    timeSlotCategoryIcon: {
      marginRight: moderateWidthScale(6),
    },
    timeSlotCategoryText: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontBold,
      color: theme.lightGreen,
    },
    timeSlotCategoryTextSelected: {
      color: theme.darkGreen,
    },
    timeSlotsContainer: {
      marginBottom: moderateHeightScale(5),
    },
    timeSlotsContentContainer: {
      marginBottom: moderateHeightScale(16),
      paddingHorizontal: moderateWidthScale(20),
      gap: moderateWidthScale(12),
    },
    timeSlotButton: {
      width: widthScale(90),
      paddingVertical: moderateHeightScale(10),
      borderRadius: moderateWidthScale(6),
      borderWidth: 1,
      borderColor: theme.lightGreen2,
      alignItems: "center",
      justifyContent: "center",
    },
    timeSlotButtonSelected: {
      backgroundColor: theme.darkGreenLight,
      borderColor: theme.darkGreen,
    },
    timeSlotButtonDisabled: {
      opacity: 0.4,
      backgroundColor: theme.background,
    },
    timeSlotText: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    timeSlotTextSelected: {
      color: theme.white,
    },
    timeSlotTextDisabled: {
      color: theme.lightGreen,
    },
    noSlotsContainer: {
      paddingVertical: moderateHeightScale(20),
      paddingHorizontal: moderateWidthScale(20),
      alignItems: "center",
    },
    noSlotsText: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      textAlign: "center",
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
    businessHours,
  } = businessData || {
    selectedService: null,
    allServices: [],
    staffMembers: [],
    selectedServices: [],
    selectedStaff: "anyone",
    businessId: "",
    businessHours: null,
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
  const [selectedStaffMember, setSelectedStaffMember] =
    useState<StaffMember | null>(null);
  const [selectedDate, setSelectedDateState] = useState(() => dayjs());
  const [week, setWeek] = useState(() => getWeekDays(dayjs()));
  const [selectedTimeSlot, setSelectedTimeSlotState] = useState<string | null>(
    null,
  );
  const [selectedCategory, setSelectedCategory] = useState<
    "morning" | "evening" | "night"
  >("morning");
  const scrollViewRef = useRef<ScrollView>(null);

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

  // Update selected staff member when staff ID changes
  useEffect(() => {
    if (selectedStaff === "anyone") {
      setSelectedStaffMember(null);
    } else {
      const foundStaff = staffMembers.find(
        (s) => s.id.toString() === selectedStaff,
      );
      if (foundStaff) {
        setSelectedStaffMember(foundStaff);
      } else {
        setSelectedStaffMember(null);
      }
    }
    setSelectedTimeSlotState(null);
    dispatch(setSelectedTimeSlot(null));
  }, [selectedStaff, staffMembers, dispatch]);

  const getDayNameFromDate = (date: dayjs.Dayjs): string => {
    const dayNamesFull = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];
    return dayNamesFull[date.day()];
  };

  const availableTimeSlots = useMemo(() => {
    if (!selectedDate) return [];
    let hoursToUse: BusinessHours | null = null;
    if (selectedStaff !== "anyone") {
      if (selectedStaffMember?.working_hours) {
        hoursToUse = selectedStaffMember.working_hours;
      } else {
        return [];
      }
    } else {
      hoursToUse = businessHours || null;
    }
    if (!hoursToUse) return [];
    const dayName = getDayNameFromDate(selectedDate);
    const dayHours = hoursToUse[dayName];
    if (!dayHours || !dayHours.isOpen) return [];
    const openingMinutes = dayHours.fromHours * 60 + dayHours.fromMinutes;
    const closingMinutes = dayHours.tillHours * 60 + dayHours.tillMinutes;
    const breakTimes = (dayHours.breaks || []).map((b: any) => ({
      start: b.fromHours * 60 + b.fromMinutes,
      end: b.tillHours * 60 + b.tillMinutes,
    }));
    return allTimeSlots.filter((slot) => {
      const [hours, minutes] = slot.split(":").map(Number);
      const slotMinutes = hours * 60 + minutes;
      if (slotMinutes < openingMinutes || slotMinutes >= closingMinutes)
        return false;
      const isDuringBreak = breakTimes.some(
        (bt: { start: number; end: number }) =>
          slotMinutes >= bt.start && slotMinutes < bt.end,
      );
      return !isDuringBreak;
    });
  }, [businessHours, selectedDate, selectedStaff, selectedStaffMember]);

  const { morning, evening, night } = useMemo(
    () => categorizeTimeSlots(availableTimeSlots),
    [availableTimeSlots],
  );

  const getAllSlots = () => [...morning, ...evening, ...night];

  const getSlotCategory = (slot: string): "morning" | "evening" | "night" => {
    if (morning.includes(slot)) return "morning";
    if (evening.includes(slot)) return "evening";
    return "night";
  };

  const getCategoryStartIndex = (
    category: "morning" | "evening" | "night",
  ): number => {
    switch (category) {
      case "morning":
        return 0;
      case "evening":
        return morning.length;
      case "night":
        return morning.length + evening.length;
      default:
        return 0;
    }
  };

  const scrollToCategory = (category: "morning" | "evening" | "night") => {
    const startIndex = getCategoryStartIndex(category);
    const slotWidth = widthScale(90);
    const gap = moderateWidthScale(12);
    const paddingHorizontal = moderateWidthScale(20);
    const scrollPosition = startIndex * (slotWidth + gap) + paddingHorizontal;
    scrollViewRef.current?.scrollTo({ x: scrollPosition, animated: true });
  };

  const handleScroll = (event: any) => {
    const scrollX = event.nativeEvent.contentOffset.x;
    const slotWidth = widthScale(90);
    const gap = moderateWidthScale(12);
    const paddingHorizontal = moderateWidthScale(20);
    const visibleIndex = Math.round(
      (scrollX - paddingHorizontal + slotWidth / 2) / (slotWidth + gap),
    );
    const allSlots = getAllSlots();
    const clampedIndex = Math.max(
      0,
      Math.min(visibleIndex, allSlots.length - 1),
    );
    const visibleSlot = allSlots[clampedIndex];
    const category = getSlotCategory(visibleSlot);
    if (category !== selectedCategory) setSelectedCategory(category);
  };

  const isSlotDisabled = (slot: string): boolean => {
    const today = dayjs().startOf("day");
    const selectedDay = selectedDate.startOf("day");
    if (!selectedDay.isSame(today, "day")) return false;
    const now = dayjs();
    const [hours, minutes] = slot.split(":").map(Number);
    const slotTime = dayjs()
      .hour(hours)
      .minute(minutes)
      .second(0)
      .millisecond(0);
    return slotTime.isBefore(now);
  };

  const handleSlotSelect = (slot: string) => {
    if (isSlotDisabled(slot)) return;
    setSelectedTimeSlotState(slot);
    dispatch(setSelectedTimeSlot(slot));
    setSelectedCategory(getSlotCategory(slot));
  };

  const prevWeek = () => {
    const newWeek = week[0].subtract(1, "week");
    const newWeekDays = getWeekDays(newWeek);
    const today = dayjs().startOf("day");
    const weekStart = newWeekDays[0].startOf("day");
    if (weekStart.isBefore(today)) {
      setWeek(getWeekDays(dayjs()));
    } else {
      setWeek(newWeekDays);
    }
  };

  const nextWeek = () => {
    setWeek(getWeekDays(week[0].add(1, "week")));
  };

  const handleDateSelect = (date: dayjs.Dayjs) => {
    if (isDateDisabled(date)) return;
    setSelectedDateState(date);
    dispatch(setSelectedDate(date.format("YYYY-MM-DD")));
    setWeek(getWeekDays(date));
  };

  const isDateDisabled = (date: dayjs.Dayjs): boolean => {
    const today = dayjs().startOf("day");
    const selectedDay = date.startOf("day");
    if (selectedDay.isBefore(today)) return true;
    const dayName = getDayNameFromDate(date);
    if (selectedStaff !== "anyone" && selectedStaffMember?.working_hours) {
      const staffDayHours = selectedStaffMember.working_hours[dayName];
      if (staffDayHours && !staffDayHours.isOpen) return true;
    }
    if (businessHours) {
      const dayHours = businessHours[dayName];
      if (dayHours && !dayHours.isOpen) return true;
    }
    return false;
  };

  useEffect(() => {
    if (!businessHours) return;
    const today = dayjs().startOf("day");
    const currentSelected = selectedDate.startOf("day");
    if (currentSelected.isSame(today, "day") && !isDateDisabled(today)) return;
    if (!isDateDisabled(today)) {
      setSelectedDateState(today);
      dispatch(setSelectedDate(today.format("YYYY-MM-DD")));
      setWeek(getWeekDays(today));
      return;
    }
    for (let i = 0; i < 30; i++) {
      const checkDate = today.add(i, "day");
      if (!isDateDisabled(checkDate)) {
        setSelectedDateState(checkDate);
        dispatch(setSelectedDate(checkDate.format("YYYY-MM-DD")));
        setWeek(getWeekDays(checkDate));
        return;
      }
    }
  }, [businessHours, selectedStaff, selectedStaffMember]);

  const getTimezoneText = () => {
    try {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const offset = new Date().getTimezoneOffset();
      const offsetHours = Math.abs(Math.floor(offset / 60));
      const offsetMinutes = Math.abs(offset % 60);
      const sign = offset <= 0 ? "+" : "-";
      const gmtOffset = `GMT${sign}${offsetHours}${
        offsetMinutes > 0 ? `:${offsetMinutes.toString().padStart(2, "0")}` : ""
      }`;
      return `In your time zone, ${timezone} (${gmtOffset})`;
    } catch {
      return "In your time zone, South Africa (GMT +1:00)";
    }
  };

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
        <View
          style={[
            styles.line,
            {
              marginTop: moderateHeightScale(10),
              backgroundColor: "transparent",
            },
          ]}
        />

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
                      <View style={styles.staffImageWrapper}>
                        <Image
                          source={{ uri: staff.image || "" }}
                          style={styles.staffImage}
                        />
                        <View
                          style={[
                            styles.staffStatusDot,
                            isActive
                              ? styles.staffStatusDotActive
                              : styles.staffStatusDotInactive,
                          ]}
                        />
                      </View>
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

        {/* Availability Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Availability</Text>

          <View style={styles.weekNavigation}>
            <TouchableOpacity
              onPress={prevWeek}
              style={styles.weekNavigationButton}
              activeOpacity={0.7}
            >
              <Feather
                name="chevron-left"
                size={moderateWidthScale(17)}
                color={theme.darkGreen}
              />
            </TouchableOpacity>
            <Text style={styles.weekRangeText}>{formatWeekRange(week)}</Text>
            <TouchableOpacity
              onPress={nextWeek}
              style={styles.weekNavigationButton}
              activeOpacity={0.7}
            >
              <Feather
                name="chevron-right"
                size={moderateWidthScale(17)}
                color={theme.darkGreen}
              />
            </TouchableOpacity>
          </View>

          <View style={styles.calendarGrid}>
            <View style={styles.daysHeader}>
              {dayNames.map((dayName) => (
                <View key={dayName} style={styles.dayHeader}>
                  <Text style={styles.dayHeaderText}>{dayName}</Text>
                </View>
              ))}
            </View>

            <View style={styles.daysRow}>
              {week.map((day) => {
                const isSelected = day.isSame(selectedDate, "day");
                const isDisabled = isDateDisabled(day);
                return (
                  <TouchableOpacity
                    key={day.format("YYYY-MM-DD")}
                    style={styles.dayContainer}
                    onPress={() => handleDateSelect(day)}
                    disabled={isDisabled}
                    activeOpacity={isDisabled ? 1 : 0.7}
                  >
                    <View
                      style={[
                        styles.dayNumberContainer,
                        isSelected && styles.dayNumberSelected,
                        isDisabled && styles.dayNumberDisabled,
                      ]}
                    >
                      <Text
                        style={[
                          styles.dayNumber,
                          isSelected && styles.dayNumberSelectedText,
                          isDisabled && styles.dayNumberDisabledText,
                        ]}
                      >
                        {day.format("D")}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <Text style={styles.timezoneText}>{getTimezoneText()}</Text>

          <View style={styles.timeSlotSection}>
            <View style={styles.timeSlotCategoryRow}>
              <TouchableOpacity
                activeOpacity={0.7}
                style={styles.timeSlotCategoryButton}
                onPress={() => {
                  setSelectedCategory("morning");
                  scrollToCategory("morning");
                }}
              >
                <View style={styles.timeSlotCategoryIcon}>
                  <MorningIcon
                    width={moderateWidthScale(18)}
                    height={moderateHeightScale(13)}
                  />
                </View>
                <Text
                  style={[
                    styles.timeSlotCategoryText,
                    selectedCategory === "morning" &&
                      styles.timeSlotCategoryTextSelected,
                  ]}
                >
                  Morning
                </Text>
                {selectedCategory === "morning" && (
                  <View style={styles.timeSlotCategoryUnderline} />
                )}
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.7}
                style={styles.timeSlotCategoryButton}
                onPress={() => {
                  setSelectedCategory("evening");
                  scrollToCategory("evening");
                }}
              >
                <View style={styles.timeSlotCategoryIcon}>
                  <EveningIcon
                    width={moderateWidthScale(18)}
                    height={moderateHeightScale(10)}
                  />
                </View>
                <Text
                  style={[
                    styles.timeSlotCategoryText,
                    selectedCategory === "evening" &&
                      styles.timeSlotCategoryTextSelected,
                  ]}
                >
                  Evening
                </Text>
                {selectedCategory === "evening" && (
                  <View style={styles.timeSlotCategoryUnderline} />
                )}
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.7}
                style={styles.timeSlotCategoryButton}
                onPress={() => {
                  setSelectedCategory("night");
                  scrollToCategory("night");
                }}
              >
                <View style={styles.timeSlotCategoryIcon}>
                  <NightIcon
                    width={moderateWidthScale(15)}
                    height={moderateHeightScale(15)}
                  />
                </View>
                <Text
                  style={[
                    styles.timeSlotCategoryText,
                    selectedCategory === "night" &&
                      styles.timeSlotCategoryTextSelected,
                  ]}
                >
                  Night
                </Text>
                {selectedCategory === "night" && (
                  <View style={styles.timeSlotCategoryUnderline} />
                )}
              </TouchableOpacity>
            </View>

            <ScrollView
              ref={scrollViewRef}
              horizontal
              showsHorizontalScrollIndicator={false}
              onScroll={handleScroll}
              scrollEventThrottle={16}
              style={styles.timeSlotsContainer}
              contentContainerStyle={styles.timeSlotsContentContainer}
            >
              {availableTimeSlots.length > 0 ? (
                getAllSlots().map((slot) => {
                  const isDisabled = isSlotDisabled(slot);
                  return (
                    <TouchableOpacity
                      activeOpacity={isDisabled ? 1 : 0.7}
                      key={slot}
                      style={[
                        styles.timeSlotButton,
                        selectedTimeSlot === slot &&
                          styles.timeSlotButtonSelected,
                        isDisabled && styles.timeSlotButtonDisabled,
                      ]}
                      onPress={() => handleSlotSelect(slot)}
                      disabled={isDisabled}
                    >
                      <Text
                        style={[
                          styles.timeSlotText,
                          selectedTimeSlot === slot &&
                            styles.timeSlotTextSelected,
                          isDisabled && styles.timeSlotTextDisabled,
                        ]}
                      >
                        {convertTo12Hour(slot)}
                      </Text>
                    </TouchableOpacity>
                  );
                })
              ) : (
                <View style={styles.noSlotsContainer}>
                  <Text style={styles.noSlotsText}>
                    No available time slots for this day
                  </Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>

        <View style={[styles.line, { marginTop: moderateHeightScale(20) }]} />

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
            if (!selectedTimeSlot) {
              showBanner(
                "Select time",
                "Please select a date and time slot before checkout.",
                "warning",
                4000,
              );
              return;
            }
            dispatch(setSelectedDate(selectedDate.format("YYYY-MM-DD")));
            dispatch(setSelectedTimeSlot(selectedTimeSlot));
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
