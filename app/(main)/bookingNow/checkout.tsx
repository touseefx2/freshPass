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
  BackHandler,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useRouter, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useTheme, useAppSelector, useAppDispatch } from "@/src/hooks/hooks";
import {
  setSelectedServices,
  setSelectedStaff,
  type StaffMember,
  type BusinessHours,
} from "@/src/state/slices/bsnsSlice";
import {
  setActionLoader,
  setGuestModeModalVisible,
} from "@/src/state/slices/generalSlice";
import { useNotificationContext } from "@/src/contexts/NotificationContext";
import ApiService from "@/src/services/api";
import Logger from "@/src/services/logger";
import { appointmentsEndpoints } from "@/src/services/endpoints";
import { useStripe } from "@stripe/stripe-react-native";
import { fetchAppointmentPaymentSheetParams } from "@/src/services/stripeService";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  heightScale,
  moderateWidthScale,
  moderateHeightScale,
  widthScale,
} from "@/src/theme/dimensions";
import { SvgXml } from "react-native-svg";
import Button from "@/src/components/button";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons, Feather, Octicons } from "@expo/vector-icons";
import { MorningIcon, EveningIcon, NightIcon, CloseIcon } from "@/assets/icons";
import AddServiceBottomSheet from "@/src/components/AddServiceBottomSheet";
import StaffSelectionBottomSheet from "@/src/components/StaffSelectionBottomSheet";
import dayjs from "dayjs";
import weekOfYear from "dayjs/plugin/weekOfYear";
import isoWeek from "dayjs/plugin/isoWeek";

dayjs.extend(weekOfYear);
dayjs.extend(isoWeek);

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

// Time slots in 24-hour format (HH:mm)
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

// Convert 24-hour format to 12-hour format for display (with AM/PM)
const convertTo12Hour = (time24: string): string => {
  const [hours, minutes] = time24.split(":").map(Number);
  const hour12 =
    hours === 0 ? 12 : hours > 12 ? hours - 12 : hours === 12 ? 12 : hours;
  const ampm = hours < 12 ? "AM" : "PM";
  return `${hour12}:${minutes.toString().padStart(2, "0")} ${ampm}`;
};

// Categorize time slots into Morning, Evening, and Night
const categorizeTimeSlots = (slots: string[]) => {
  const morning: string[] = [];
  const evening: string[] = [];
  const night: string[] = [];

  slots.forEach((slot) => {
    const [hours, minutes] = slot.split(":").map(Number);
    const hour24 = hours;

    if (hour24 >= 6 && hour24 < 12) {
      morning.push(slot);
    } else if (hour24 >= 12 && hour24 < 18) {
      evening.push(slot);
    } else {
      night.push(slot);
    }
  });

  return { morning, evening, night };
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
    logoContainer: {},
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
    scrollContent: {
      paddingBottom: moderateHeightScale(20),
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
    // Availability Section
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
    timeSlotCategoryButtonSelected: {
      // Selected state handled by underline
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
    // Payment Method Section
    paymentCard: {
      backgroundColor: theme.white,
      borderRadius: moderateWidthScale(8),
      marginHorizontal: moderateWidthScale(20),
      overflow: "hidden",
      marginBottom: moderateHeightScale(12),
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
    paymentOption: {
      flexDirection: "row",
      alignItems: "center",
      padding: moderateWidthScale(12),
    },
    paymentOptionSelected: {
      // Selected state handled by radio button
    },
    paymentDivider: {
      height: 1,
      backgroundColor: theme.borderLight,
    },
    paymentRadioButton: {
      width: moderateWidthScale(20),
      height: moderateWidthScale(20),
      borderRadius: moderateWidthScale(10),
      borderWidth: 2,
      borderColor: theme.darkGreen,
      alignItems: "center",
      justifyContent: "center",
      marginRight: moderateWidthScale(12),
      marginTop: moderateHeightScale(2),
    },
    paymentRadioButtonSelected: {},
    paymentRadioButtonInner: {
      width: moderateWidthScale(10),
      height: moderateWidthScale(10),
      borderRadius: moderateWidthScale(5),
      backgroundColor: theme.orangeBrown,
    },
    paymentOptionContent: {
      flex: 1,
    },
    paymentOptionTitle: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
      marginBottom: moderateHeightScale(3),
    },
    paymentOptionDescription: {
      fontSize: fontSize.size11,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
    },
    // Service Details Section
    serviceDetailsCard: {
      backgroundColor: theme.lightGreen015,
      borderRadius: moderateWidthScale(8),
      marginHorizontal: moderateWidthScale(20),
      overflow: "hidden",
    },
    serviceItem: {
      padding: moderateWidthScale(16),
    },
    serviceDetailsHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      marginBottom: moderateHeightScale(4),
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
    serviceDetailsName: {
      flex: 1,
      fontSize: fontSize.size14,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
      marginRight: moderateWidthScale(12),
    },
    serviceDetailsPrice: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      marginRight: moderateWidthScale(8),
    },
    serviceDetailsOriginalPrice: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontMedium,
      color: theme.lightGreen4,
      textDecorationLine: "line-through",
    },
    serviceDetailsPriceContainer: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(8),
    },
    serviceDetailsPriceColumn: {
      alignItems: "flex-end",
    },
    serviceDivider: {
      height: 1,
      backgroundColor: theme.borderLight,
      marginHorizontal: moderateWidthScale(16),
    },
    serviceDetailsStaff: {
      flexDirection: "row",
      alignItems: "center",
      padding: moderateWidthScale(16),
    },
    serviceDetailsStaffImageWrapper: {
      position: "relative",
      width: widthScale(32),
      height: widthScale(32),
      marginRight: moderateWidthScale(8),
      justifyContent: "center",
      alignItems: "center",
    },
    serviceDetailsStaffImage: {
      width: widthScale(32),
      height: widthScale(32),
      borderRadius: widthScale(32 / 2),
      backgroundColor: theme.emptyProfileImage,
      borderWidth: 1,
      borderColor: theme.borderLight,
      overflow: "hidden",
    },
    serviceDetailsStaffStatusDot: {
      position: "absolute",
      bottom: 2,
      right: 0,
      width: moderateWidthScale(7),
      height: moderateWidthScale(7),
      borderRadius: moderateWidthScale(7) / 2,
    },
    serviceDetailsStaffStatusDotActive: {
      backgroundColor: theme.toggleActive,
    },
    serviceDetailsStaffStatusDotInactive: {
      backgroundColor: theme.lightGreen5,
    },
    serviceDetailsStaffName: {
      flex: 1,
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: theme.darkGreen,
    },
    serviceDetailsChangeButton: {
      paddingHorizontal: moderateWidthScale(8),
      paddingVertical: moderateHeightScale(6),
      borderRadius: moderateWidthScale(6),
      backgroundColor: theme.white,
      borderWidth: 1,
      borderColor: theme.borderLight,
    },
    serviceDetailsChangeButtonText: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    // Price Breakdown Section
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
    // Privacy Policy Section
    privacyText: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      lineHeight: moderateHeightScale(16),
      marginHorizontal: moderateWidthScale(20),
    },
    privacyLink: {
      color: theme.primary,
      fontFamily: fonts.fontMedium,
    },
    // Subscription Section
    subscriptionSection: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      backgroundColor: theme.lightBeige,
      borderRadius: moderateWidthScale(12),
      padding: moderateWidthScale(16),
    },
    subscriptionText: {
      flex: 1,
      fontSize: fontSize.size14,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      marginRight: moderateWidthScale(12),
    },
    subscriptionButton: {
      backgroundColor: theme.orangeBrown,
      borderRadius: moderateWidthScale(8),
      paddingHorizontal: moderateWidthScale(16),
      paddingVertical: moderateHeightScale(8),
    },
    subscriptionButtonText: {
      fontSize: fontSize.size13,
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
    // Note Input Section
    noteInputContainer: {
      marginTop: moderateHeightScale(16),
      marginBottom: moderateHeightScale(20),
      marginHorizontal: moderateWidthScale(20),
      position: "relative",
    },
    noteInput: {
      borderRadius: moderateWidthScale(12),
      borderWidth: 1,
      borderColor: theme.lightGreen2,
      backgroundColor: theme.white,
      paddingHorizontal: moderateWidthScale(16),
      paddingVertical: moderateHeightScale(12),
      paddingRight: moderateWidthScale(40),
      fontSize: fontSize.size15,
      fontFamily: fonts.fontRegular,
      color: theme.darkGreen,
      minHeight: heightScale(100),
      textAlignVertical: "top",
    },
    noteInputIcon: {
      position: "absolute",
      left: moderateWidthScale(16),
      top: moderateHeightScale(12),
      zIndex: 1,
    },
    noteInputWithIcon: {
      paddingLeft: moderateWidthScale(48),
    },
    noteClearButton: {
      position: "absolute",
      top: moderateHeightScale(12),
      right: moderateWidthScale(12),
      zIndex: 1,
    },
    processingOverlay: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      justifyContent: "center",
      alignItems: "center",
      zIndex: 1000,
    },
    processingContainer: {
      backgroundColor: theme.background,
      borderRadius: moderateWidthScale(16),
      padding: moderateWidthScale(24),
      alignItems: "center",
      justifyContent: "center",
      minWidth: widthScale(120),
      minHeight: heightScale(120),
    },
    processingText: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontMedium,
      color: theme.text,
      marginTop: moderateHeightScale(16),
      textAlign: "center",
    },
  });

function CheckoutContent() {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);
  const { showBanner } = useNotificationContext();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const user = useAppSelector((state: any) => state.user);
  const isGuest = user.isGuest;
  // Get data from Redux
  const businessData = useAppSelector((state) => state.bsns);
  const {
    selectedServices: reduxSelectedServices,
    allServices,
    staffMembers,
    selectedStaff: reduxSelectedStaff,
    businessId,
    businessHours,
  } = businessData;

  // Use Redux directly - no local state needed
  const selectedServices = reduxSelectedServices || [];
  const selectedStaffId = reduxSelectedStaff || "anyone";
  const [addServiceModalVisible, setAddServiceModalVisible] = useState(false);
  const [staffSelectionModalVisible, setStaffSelectionModalVisible] =
    useState(false);
  const [selectedStaffMember, setSelectedStaffMember] =
    useState<StaffMember | null>(null);
  // Initialize with today's date (not in past)
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = dayjs();
    return today;
  });
  const [week, setWeek] = useState(() => getWeekDays(dayjs()));
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<
    "morning" | "evening" | "night"
  >("morning");
  const [paymentMethod, setPaymentMethod] = useState<"payNow" | "payLater">(
    "payNow",
  );
  const [note, setNote] = useState<string>("");
  const [processingPayment, setProcessingPayment] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  // Get all slots in order (morning, evening, night)
  const getAllSlots = () => {
    return [...morning, ...evening, ...night];
  };

  // Get category of a slot
  const getSlotCategory = (slot: string): "morning" | "evening" | "night" => {
    if (morning.includes(slot)) return "morning";
    if (evening.includes(slot)) return "evening";
    return "night";
  };

  // Get index of first slot in a category
  const getCategoryStartIndex = (
    category: "morning" | "evening" | "night",
  ): number => {
    const allSlots = getAllSlots();
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

  // Scroll to category
  const scrollToCategory = (category: "morning" | "evening" | "night") => {
    const startIndex = getCategoryStartIndex(category);
    const slotWidth = widthScale(90);
    const gap = moderateWidthScale(12);
    const paddingHorizontal = moderateWidthScale(20);
    const scrollPosition = startIndex * (slotWidth + gap) + paddingHorizontal;

    scrollViewRef.current?.scrollTo({
      x: scrollPosition,
      animated: true,
    });
  };

  // Handle scroll to detect which category is visible
  const handleScroll = (event: any) => {
    const scrollX = event.nativeEvent.contentOffset.x;
    const slotWidth = widthScale(90);
    const gap = moderateWidthScale(12);
    const paddingHorizontal = moderateWidthScale(20);

    // Calculate which slot index is currently visible (centered)
    const visibleIndex = Math.round(
      (scrollX - paddingHorizontal + slotWidth / 2) / (slotWidth + gap),
    );

    // Clamp to valid range
    const allSlots = getAllSlots();
    const clampedIndex = Math.max(
      0,
      Math.min(visibleIndex, allSlots.length - 1),
    );

    // Get the slot at this index
    const visibleSlot = allSlots[clampedIndex];

    // Determine category based on visible slot
    const category = getSlotCategory(visibleSlot);

    // Update selected category if it changed
    if (category !== selectedCategory) {
      setSelectedCategory(category);
    }
  };

  // Check if a time slot is disabled (past time for today's date)
  const isSlotDisabled = (slot: string): boolean => {
    const today = dayjs().startOf("day");
    const selectedDay = selectedDate.startOf("day");

    // Only disable if selected date is today
    if (!selectedDay.isSame(today, "day")) {
      return false;
    }

    // Get current time
    const now = dayjs();
    const [hours, minutes] = slot.split(":").map(Number);

    // Create slot time for today
    const slotTime = dayjs()
      .hour(hours)
      .minute(minutes)
      .second(0)
      .millisecond(0);

    // Disable if slot time has passed
    return slotTime.isBefore(now);
  };

  // Handle slot selection
  const handleSlotSelect = (slot: string) => {
    // Don't allow selection of disabled slots
    if (isSlotDisabled(slot)) {
      return;
    }
    setSelectedTimeSlot(slot);
    const category = getSlotCategory(slot);
    setSelectedCategory(category);
  };

  // Handle service deletion
  const handleDeleteService = (serviceId: number) => {
    const updatedServices = selectedServices.filter(
      (service) => service.id !== serviceId,
    );
    dispatch(setSelectedServices(updatedServices));
  };

  // Handle add service modal
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

  // Memoize selectedServiceIds for AddServiceBottomSheet
  const selectedServiceIds = useMemo(
    () => selectedServices.map((s) => s.id),
    [selectedServices],
  );

  // Handle back navigation with updated data
  const handleBackNavigation = useCallback(() => {
    // Use router.back() to properly go back in navigation stack
    // This maintains the correct navigation history (Business Detail -> BookingNow -> Checkout)
    // The previous screen (bookingNow) will read updated params via useFocusEffect
    router.back();
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

  // Dummy staff member
  const dummyStaff: StaffMember = {
    id: 1,
    name: "Md Shariful Islam Khan",
    experience: 5,
    image: null,
    working_hours: null,
  };

  const totalPrice = selectedServices.reduce(
    (sum, service) => sum + service.price,
    0,
  );
  // Tax rate (5% = 0.1)
  const taxRate = 0.0;
  const tax = totalPrice * taxRate;
  const estimatedTotal = totalPrice + tax;

  // Update selected staff member when staff ID changes
  useEffect(() => {
    if (selectedStaffId === "anyone") {
      setSelectedStaffMember(null);
    } else {
      const foundStaff = staffMembers.find(
        (s) => s.id.toString() === selectedStaffId,
      );
      if (foundStaff) {
        setSelectedStaffMember(foundStaff);
      } else {
        setSelectedStaffMember(dummyStaff);
      }
    }
    // Clear selected time slot when staff changes
    setSelectedTimeSlot(null);
  }, [selectedStaffId, staffMembers]);

  // Update Redux when local state changes
  useEffect(() => {
    dispatch(setSelectedServices(selectedServices));
  }, [selectedServices, dispatch]);

  useEffect(() => {
    dispatch(setSelectedStaff(selectedStaffId));
  }, [selectedStaffId, dispatch]);

  const prevWeek = () => {
    const newWeek = week[0].subtract(1, "week");
    const newWeekDays = getWeekDays(newWeek);
    // Don't allow going to past weeks
    const today = dayjs().startOf("day");
    const weekStart = newWeekDays[0].startOf("day");
    if (weekStart.isBefore(today)) {
      // If the week start is in the past, set to current week
      setWeek(getWeekDays(dayjs()));
    } else {
      setWeek(newWeekDays);
    }
  };

  const nextWeek = () => {
    const newWeek = week[0].add(1, "week");
    setWeek(getWeekDays(newWeek));
  };

  const handleDateSelect = (date: dayjs.Dayjs) => {
    // Don't allow selecting past dates or closed days
    if (isDateDisabled(date)) {
      return;
    }
    setSelectedDate(date);
    setWeek(getWeekDays(date));
  };

  // Check if a date is disabled (past date or closed day)
  const isDateDisabled = (date: dayjs.Dayjs): boolean => {
    const today = dayjs().startOf("day");
    const selectedDay = date.startOf("day");

    // Disable past dates
    if (selectedDay.isBefore(today)) {
      return true;
    }

    const dayName = getDayNameFromDate(date);

    // If staff member is selected, check staff working hours
    if (selectedStaffId !== "anyone" && selectedStaffMember?.working_hours) {
      const staffDayHours = selectedStaffMember.working_hours[dayName];
      if (staffDayHours && !staffDayHours.isOpen) {
        return true; // Staff is closed on this day
      }
    }

    // Check if business is closed on this day (for "anyone" or fallback)
    if (businessHours) {
      const dayHours = businessHours[dayName];
      if (dayHours && !dayHours.isOpen) {
        return true; // Business is closed on this day
      }
    }

    return false;
  };

  // Auto-select current date if available, otherwise select first available date
  useEffect(() => {
    if (!businessHours) {
      return; // Wait for business hours to load
    }

    const today = dayjs().startOf("day");
    const currentSelected = selectedDate.startOf("day");

    // If current date is already today and available, don't change
    if (currentSelected.isSame(today, "day") && !isDateDisabled(today)) {
      return;
    }

    // Check if today is available (not disabled)
    if (!isDateDisabled(today)) {
      setSelectedDate(today);
      setWeek(getWeekDays(today));
      return;
    }

    // If today is not available, find first available date (next 30 days)
    for (let i = 0; i < 30; i++) {
      const checkDate = today.add(i, "day");
      if (!isDateDisabled(checkDate)) {
        setSelectedDate(checkDate);
        setWeek(getWeekDays(checkDate));
        return;
      }
    }
  }, [businessHours, selectedStaffId, selectedStaffMember]);

  // Get day name from date (e.g., "Monday", "Tuesday")
  const getDayNameFromDate = (date: dayjs.Dayjs): string => {
    const dayIndex = date.day();
    const dayNamesFull = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];
    return dayNamesFull[dayIndex];
  };

  // Get available time slots for selected date based on business hours or staff working hours
  const availableTimeSlots = useMemo(() => {
    if (!selectedDate) {
      return [];
    }

    // Determine which hours to use: staff working_hours if staff is selected, otherwise business hours
    let hoursToUse: BusinessHours | null = null;

    if (selectedStaffId !== "anyone") {
      // Staff member is selected - use staff working hours
      if (selectedStaffMember?.working_hours) {
        hoursToUse = selectedStaffMember.working_hours;
      } else {
        // Staff member selected but has no working_hours (null or empty) - show no slots
        return [];
      }
    } else {
      // "Anyone" selected - use business hours
      hoursToUse = businessHours || null;
    }

    // If no hours available, return empty array (don't show all slots)
    if (!hoursToUse) {
      return [];
    }

    const dayName = getDayNameFromDate(selectedDate);
    const dayHours = hoursToUse[dayName];

    // If business/staff is closed on this day, return empty array
    if (!dayHours || !dayHours.isOpen) {
      return [];
    }

    // Calculate opening and closing time in minutes from midnight
    const openingMinutes = dayHours.fromHours * 60 + dayHours.fromMinutes;
    const closingMinutes = dayHours.tillHours * 60 + dayHours.tillMinutes;

    // Get break times
    const breakTimes = (dayHours.breaks || []).map((breakTime: any) => {
      const breakStart = breakTime.fromHours * 60 + breakTime.fromMinutes;
      const breakEnd = breakTime.tillHours * 60 + breakTime.tillMinutes;
      return { start: breakStart, end: breakEnd };
    });

    // Filter slots that are within business/staff hours and not during breaks
    const availableSlots = allTimeSlots.filter((slot) => {
      const [hours, minutes] = slot.split(":").map(Number);
      const slotMinutes = hours * 60 + minutes;

      // Check if slot is within hours
      if (slotMinutes < openingMinutes || slotMinutes >= closingMinutes) {
        return false;
      }

      // Check if slot is during a break
      const isDuringBreak = breakTimes.some(
        (breakTime) =>
          slotMinutes >= breakTime.start && slotMinutes < breakTime.end,
      );
      if (isDuringBreak) {
        return false;
      }

      return true;
    });

    return availableSlots;
  }, [businessHours, selectedDate, selectedStaffId, selectedStaffMember]);

  // Re-categorize available slots
  const { morning, evening, night } = useMemo(
    () => categorizeTimeSlots(availableTimeSlots),
    [availableTimeSlots],
  );

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
    } catch (error) {
      return "In your time zone, South Africa (GMT +1:00)";
    }
  };

  const params = useLocalSearchParams<{ subscription_id?: string }>();
  const subscriptionId = params.subscription_id
    ? parseInt(params.subscription_id, 10)
    : undefined;

  const handleBookNow = async () => {
    if (!selectedTimeSlot) {
      showBanner(
        "Time Slot Required",
        "Please select a time slot to proceed with booking.",
        "warning",
        4000,
      );
      return;
    }
    if (selectedServices.length === 0) {
      showBanner(
        "No Service Selected",
        "Please select at least one service to proceed with checkout.",
        "warning",
        4000,
      );
      return;
    }

    if (isGuest) {
      dispatch(setGuestModeModalVisible(true));
      return;
    }

    // Prepare request body
    const isAnyoneSelected = selectedStaffId === "anyone";

    const requestBody: {
      business_id: number;
      appointment_type: string;
      payment_method: string;
      service_ids: number[];
      appointment_date: string;
      appointment_time: string;
      notes?: string;
      staff_id?: number;
      subscription_id?: number;
    } = {
      business_id: parseInt(businessId || "0", 10),
      appointment_type: subscriptionId ? "subscription" : "service",
      payment_method: paymentMethod === "payNow" ? "pay_now" : "pay_later",
      service_ids: selectedServices.map((service) => service.id),
      appointment_date: selectedDate.format("YYYY-MM-DD"),
      appointment_time: selectedTimeSlot || "",
    };

    // Add notes only if it exists
    if (note && note.trim()) {
      requestBody.notes = note.trim();
    }

    // Add staff_id only if staff is selected (not "anyone")
    if (!isAnyoneSelected) {
      requestBody.staff_id = parseInt(selectedStaffId, 10);
    }

    // Add subscription_id only if it exists
    if (subscriptionId) {
      requestBody.subscription_id = subscriptionId;
    }

    Logger.log("requestBody", requestBody);

    // Show loader
    dispatch(setActionLoader(true));

    try {
      const response = (await ApiService.post(
        appointmentsEndpoints.create,
        requestBody,
      )) as {
        success?: boolean;
        message?: string;
        data?: {
          success: boolean;
          message: string;
          data: {
            id: number;
            [key: string]: any;
          };
        };
      };

      // Hide loader
      dispatch(setActionLoader(false));

      // Console log response
      Logger.log(
        "Appointment API Response:",
        JSON.stringify(response, null, 2),
      );

      // Check success - ApiService.post returns response.data, so structure is:
      // { success: true, message: "...", data: { id: ... } }
      // But terminal shows nested structure, so check both
      const isSuccess = response?.success || response?.data?.success;

      Logger.log("isSuccess:", isSuccess, "response:", response);

      if (isSuccess) {
        // Extract appointment ID and date from response
        // Response structure: response.data.id and response.data.appointmentDate
        const appointmentId =
          (response?.data as any)?.id ||
          (response?.data as any)?.data?.id ||
          null;
        const appointmentDate =
          (response?.data as any)?.appointmentDate ||
          (response?.data as any)?.data?.appointmentDate ||
          null;

        if (paymentMethod === "payNow") {
          if (!appointmentId) {
            showBanner(
              "Payment Failed",
              "Appointment ID is missing. Please try again.",
              "error",
              4000,
            );
            return;
          }

          try {
            // Step 1: Fetch payment sheet parameters from backend
            const {
              paymentIntent,
              setupIntent,
              customerSessionClientSecret,
              ephemeralKey,
              customer,
            } = await fetchAppointmentPaymentSheetParams(appointmentId);

            // Step 2: Initialize payment sheet
            const paymentConfig: any = {
              merchantDisplayName: "Fresh Pass",
              customerId: customer,
              allowsDelayedPaymentMethods: true,
              defaultBillingDetails: {
                name: user.name || undefined,
                email: user.email || undefined,
              },
              customFlow: false,
            };

            // Use CustomerSession (newer approach) if available, otherwise fall back to EphemeralKey
            if (customerSessionClientSecret) {
              paymentConfig.customerSessionClientSecret =
                customerSessionClientSecret;
            } else if (ephemeralKey) {
              paymentConfig.customerEphemeralKeySecret = ephemeralKey;
            } else {
              throw new Error(
                "Either customerSessionClientSecret or ephemeralKey must be provided",
              );
            }

            // Use paymentIntent for subscription payment, or setupIntent as fallback
            if (paymentIntent && paymentIntent.trim() !== "") {
              paymentConfig.paymentIntentClientSecret = paymentIntent;
            } else if (setupIntent && setupIntent.trim() !== "") {
              paymentConfig.setupIntentClientSecret = setupIntent;
            } else {
              throw new Error(
                "Either Payment Intent or Setup Intent must be provided",
              );
            }
            const { error: initError } = await initPaymentSheet(paymentConfig);

            if (initError) {
              throw new Error(
                initError.message || "Failed to initialize payment",
              );
            }

            // Step 3: Present payment sheet to user
            const { error: presentError } = await presentPaymentSheet();

            if (presentError) {
              // Payment was cancelled or failed
              if (!presentError.code?.includes("Canceled")) {
                showBanner(
                  "Payment Failed",
                  presentError.message || "Payment could not be completed",
                  "error",
                  4000,
                );
              }
              // If user canceled, don't show error (silent cancel)
              return;
            }

            // Show processing loader
            setProcessingPayment(true);

            // Wait 2 seconds before showing success and navigating
            setTimeout(() => {
              setProcessingPayment(false);
              showBanner(
                "Success",
                "Payment successful! Your booking is confirmed.",
                "success",
                3000,
              );

              // Create bookingId: appointmentDate (YYYYMMDD format) + appointmentId
              let dateFormatted = "";
              if (appointmentDate) {
                // Parse date from "MM/DD/YYYY" format and convert to "YYYYMMDD"
                const dateParts = appointmentDate.split("/");
                if (dateParts.length === 3) {
                  const [month, day, year] = dateParts;
                  dateFormatted = `${year}${month.padStart(
                    2,
                    "0",
                  )}${day.padStart(2, "0")}`;
                }
              }
              const bookingId =
                appointmentId && dateFormatted
                  ? `${dateFormatted}${appointmentId}`
                  : `${Date.now()}${Math.floor(Math.random() * 10000)}`;

              // Navigate to booking detail page
              router.push({
                pathname: "/(main)/bookingDetail",
                params: {
                  appointmentId: appointmentId ? appointmentId.toString() : "",
                  bookingId: bookingId,
                  selectedServices: JSON.stringify(selectedServices),
                  selectedStaff: selectedStaffId,
                  selectedStaffMember: selectedStaffMember
                    ? JSON.stringify(selectedStaffMember)
                    : "",
                  selectedDate: selectedDate.format("YYYY-MM-DD"),
                  selectedTimeSlot: selectedTimeSlot || "",
                  paymentMethod: paymentMethod,
                  totalPrice: totalPrice.toFixed(2),
                  tax: tax.toFixed(2),
                  estimatedTotal: estimatedTotal.toFixed(2),
                  businessId: businessId || "",
                  business_id: businessId || "",
                  note: note || "",
                },
              });
            }, 2000);
          } catch (err: any) {
            // Extract clean error message
            let errorMessage = "Failed to process payment";

            // Check error response data first (from API)
            if (err.data?.message) {
              errorMessage = err.data.message;
            } else if (err.data?.error) {
              errorMessage = err.data.error;
            } else if (err.message) {
              // Use error message directly (API service already extracts clean message)
              errorMessage = err.message;
            }

            showBanner("Payment Failed", errorMessage, "error", 4000);
          }
          return;
        }

        if (paymentMethod === "payLater") {
          // Create bookingId: appointmentDate (YYYYMMDD format) + appointmentId
          // Example: "01/08/2026" -> "20260108" + "54" = "2026010854"
          let dateFormatted = "";
          if (appointmentDate) {
            // Parse date from "MM/DD/YYYY" format and convert to "YYYYMMDD"
            const dateParts = appointmentDate.split("/");
            if (dateParts.length === 3) {
              const [month, day, year] = dateParts;
              dateFormatted = `${year}${month.padStart(2, "0")}${day.padStart(
                2,
                "0",
              )}`;
            }
          }
          const bookingId =
            appointmentId && dateFormatted
              ? `${dateFormatted}${appointmentId}`
              : `${Date.now()}${Math.floor(Math.random() * 10000)}`;

          router.push({
            pathname: "/(main)/bookingDetail",
            params: {
              appointmentId: appointmentId ? appointmentId.toString() : "",
              bookingId: bookingId,
              selectedServices: JSON.stringify(selectedServices),
              selectedStaff: selectedStaffId,
              selectedStaffMember: selectedStaffMember
                ? JSON.stringify(selectedStaffMember)
                : "",
              selectedDate: selectedDate.format("YYYY-MM-DD"),
              selectedTimeSlot: selectedTimeSlot || "",
              paymentMethod: paymentMethod,
              totalPrice: totalPrice.toFixed(2),
              tax: tax.toFixed(2),
              estimatedTotal: estimatedTotal.toFixed(2),
              businessId: businessId || "",
              business_id: businessId || "",
              note: note || "",
            },
          });
        }
      } else {
        showBanner(
          "Booking Failed",
          response?.message || "Failed to book appointment. Please try again.",
          "error",
          4000,
        );
      }
    } catch (error: any) {
      // Hide loader
      dispatch(setActionLoader(false));

      // Console log error
      Logger.error("Appointment API Error:", error);

      showBanner(
        "Booking Failed",
        error?.message || "Failed to book appointment. Please try again.",
        "error",
        4000,
      );
    }
  };

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
          <View style={styles.logoContainer}>
            <Text style={styles.logoText}>Checkout</Text>
          </View>
        </View>
      </View>

      <View style={styles.line} />

      <View style={{ flex: 1 }}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "padding"}
          enabled={true}
          keyboardVerticalOffset={0}
        >
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            {/* Availability Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Availability</Text>

              {/* Week Navigation */}
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
                <Text style={styles.weekRangeText}>
                  {formatWeekRange(week)}
                </Text>
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

              {/* Calendar Grid */}
              <View style={styles.calendarGrid}>
                {/* Days Header */}
                <View style={styles.daysHeader}>
                  {dayNames.map((dayName) => (
                    <View key={dayName} style={styles.dayHeader}>
                      <Text style={styles.dayHeaderText}>{dayName}</Text>
                    </View>
                  ))}
                </View>

                {/* Days Row */}
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

              {/* Timezone Information */}
              <Text style={styles.timezoneText}>{getTimezoneText()}</Text>

              {/* Time Slots */}
              <View style={styles.timeSlotSection}>
                {/* Category Selector - Horizontal Tabs */}
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

                {/* Time Slots - All slots in one horizontal scroll */}
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

            <View style={[styles.line, { marginTop: 0 }]} />

            {/* Payment Method Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Choose payment method</Text>

              <View style={[styles.paymentCard, styles.shadow]}>
                <TouchableOpacity
                  style={styles.paymentOption}
                  onPress={() => setPaymentMethod("payNow")}
                >
                  <View
                    style={[
                      styles.paymentRadioButton,
                      paymentMethod === "payNow" &&
                        styles.paymentRadioButtonSelected,
                    ]}
                  >
                    {paymentMethod === "payNow" && (
                      <View style={styles.paymentRadioButtonInner} />
                    )}
                  </View>
                  <View style={styles.paymentOptionContent}>
                    <Text style={styles.paymentOptionTitle}>Pay now</Text>
                    <Text style={styles.paymentOptionDescription}>
                      Securely pay online to confirm your booking instantly.
                    </Text>
                  </View>
                </TouchableOpacity>

                <View style={styles.paymentDivider} />

                <TouchableOpacity
                  style={styles.paymentOption}
                  onPress={() => setPaymentMethod("payLater")}
                >
                  <View
                    style={[
                      styles.paymentRadioButton,
                      paymentMethod === "payLater" &&
                        styles.paymentRadioButtonSelected,
                    ]}
                  >
                    {paymentMethod === "payLater" && (
                      <View style={styles.paymentRadioButtonInner} />
                    )}
                  </View>
                  <View style={styles.paymentOptionContent}>
                    <Text style={styles.paymentOptionTitle}>Pay later</Text>
                    <Text style={styles.paymentOptionDescription}>
                      Pay in person at the salon.
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.line} />

            {/* Service Details Section */}

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>You're paying for:</Text>
              <View style={styles.serviceDetailsCard}>
                {selectedServices.length > 0 &&
                  selectedServices.map((service, index) => (
                    <React.Fragment key={service.id}>
                      <View style={styles.serviceItem}>
                        <View style={styles.serviceDetailsHeader}>
                          <Text style={styles.serviceDetailsName}>
                            {service.name}
                            <Text style={{ fontFamily: fonts.fontRegular }}>
                              {" "}
                              - {service.description}
                            </Text>
                          </Text>
                          <View style={styles.serviceDetailsPriceContainer}>
                            <View style={styles.serviceDetailsPriceColumn}>
                              <Text style={styles.serviceDetailsPrice}>
                                ${service.price.toFixed(2)} USD
                              </Text>
                              <Text style={styles.serviceDetailsOriginalPrice}>
                                ${service.originalPrice.toFixed(2)}
                              </Text>
                            </View>
                            <TouchableOpacity
                              onPress={() => handleDeleteService(service.id)}
                              activeOpacity={0.5}
                            >
                              <MaterialIcons
                                name="delete-outline"
                                size={moderateWidthScale(20)}
                                color={theme.red}
                              />
                            </TouchableOpacity>
                          </View>
                        </View>
                      </View>
                      {index < selectedServices.length - 1 && (
                        <View style={styles.serviceDivider} />
                      )}
                    </React.Fragment>
                  ))}
                {/* Add Service Button - Always show */}
                {selectedServices.length > 0 && (
                  <View style={styles.serviceDivider} />
                )}
                {selectedServices.length <= 0 && (
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={handleAddService}
                    style={[
                      styles.serviceItem,
                      {
                        flexDirection: "row",
                        justifyContent: "space-between",
                        alignItems: "center",
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.serviceDetailsName,
                        { fontFamily: fonts.fontRegular },
                      ]}
                    >
                      Add another service
                    </Text>
                    <View style={styles.addServiceButton}>
                      <Octicons
                        name="plus"
                        size={moderateWidthScale(16)}
                        color={theme.selectCard}
                      />
                    </View>
                  </TouchableOpacity>
                )}
                {/* Staff Section - Always show */}
                <View
                  style={[styles.serviceDivider, { marginHorizontal: 0 }]}
                />
                <View style={styles.serviceDetailsStaff}>
                  {selectedStaffId === "anyone" ? (
                    <>
                      <Image
                        source={{
                          uri: "https://www.w3schools.com/howto/img_avatar2.png",
                        }}
                        style={styles.serviceDetailsStaffImage}
                        resizeMode="cover"
                      />
                      <Text
                        style={[
                          styles.serviceDetailsStaffName,
                          { marginLeft: 8 },
                        ]}
                      >
                        Anyone available
                      </Text>
                    </>
                  ) : selectedStaffMember ? (
                    <>
                      <View style={styles.serviceDetailsStaffImageWrapper}>
                        <Image
                          source={{ uri: selectedStaffMember.image ?? "" }}
                          style={styles.serviceDetailsStaffImage}
                          resizeMode="cover"
                        />
                        <View
                          style={[
                            styles.serviceDetailsStaffStatusDot,
                            selectedStaffMember.active
                              ? styles.serviceDetailsStaffStatusDotActive
                              : styles.serviceDetailsStaffStatusDotInactive,
                          ]}
                        />
                      </View>

                      <Text style={styles.serviceDetailsStaffName}>
                        {selectedStaffMember.name}
                      </Text>
                    </>
                  ) : (
                    <>
                      <Image
                        source={{
                          uri: "https://www.w3schools.com/howto/img_avatar2.png",
                        }}
                        style={styles.serviceDetailsStaffImage}
                        resizeMode="cover"
                      />
                      <Text
                        style={[
                          styles.serviceDetailsStaffName,
                          { marginLeft: 8 },
                        ]}
                      >
                        Anyone available
                      </Text>
                    </>
                  )}
                  <TouchableOpacity
                    style={styles.serviceDetailsChangeButton}
                    onPress={() => setStaffSelectionModalVisible(true)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.serviceDetailsChangeButtonText}>
                      Change
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* Price Breakdown Section */}
            <View style={styles.priceBreakdown}>
              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>Subtotal:</Text>
                <Text style={styles.priceValue}>
                  ${totalPrice.toFixed(2)} USD
                </Text>
              </View>
              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>Tax:</Text>
                <Text style={styles.priceValue}>${tax.toFixed(2)} USD</Text>
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
                <Text
                  style={[styles.priceLabel, { fontFamily: fonts.fontBold }]}
                >
                  Estimated Total:
                </Text>
                <Text
                  style={[styles.priceValue, { fontFamily: fonts.fontBold }]}
                >
                  ${estimatedTotal.toFixed(2)} USD
                </Text>
              </View>
            </View>

            {/* Privacy Policy Section */}
            <View style={styles.section}>
              <Text style={styles.privacyText}>
                By placing this order, you agree to our{" "}
                <Text style={styles.privacyLink} onPress={() => {}}>
                  Privacy Policy
                </Text>
                . Your personal data will be processed by the partner with whom
                you're booking an appointment.
              </Text>
            </View>

            {/* Leave a Note Section */}
            <View style={styles.noteInputContainer}>
              <View style={styles.noteInputIcon}>
                <Feather
                  name="file-text"
                  size={moderateWidthScale(18)}
                  color={theme.lightGreen}
                />
              </View>
              <TextInput
                style={[styles.noteInput, styles.noteInputWithIcon]}
                value={note}
                onChangeText={setNote}
                placeholder="Leave a note (optional)"
                placeholderTextColor={theme.lightGreen2}
                multiline
                numberOfLines={4}
              />
              {note.length > 0 && (
                <Pressable
                  onPress={() => setNote("")}
                  style={styles.noteClearButton}
                  hitSlop={moderateWidthScale(8)}
                >
                  <CloseIcon color={theme.darkGreen} />
                </Pressable>
              )}
            </View>
          </ScrollView>

          <View style={styles.bottom}>
            {/* Final Total */}
            <View style={styles.totalSection}>
              <Text style={styles.totalLabel}>Order total:</Text>
              <Text style={styles.totalValue}>
                ${estimatedTotal.toFixed(2)} USD
              </Text>
            </View>

            {/* Checkout Button */}
            <Button title="Book now" onPress={handleBookNow} />
          </View>
        </KeyboardAvoidingView>
      </View>

      {/* Add Service Bottom Sheet */}
      <AddServiceBottomSheet
        visible={addServiceModalVisible}
        onClose={handleCloseModal}
        services={allServices}
        selectedServiceIds={selectedServiceIds}
        onUpdateServices={handleUpdateSelectedServices}
      />

      {/* Staff Selection Bottom Sheet */}
      <StaffSelectionBottomSheet
        visible={staffSelectionModalVisible}
        onClose={() => setStaffSelectionModalVisible(false)}
        staffMembers={staffMembers}
        selectedStaffId={selectedStaffId}
        onSelectStaff={(staffId) => {
          dispatch(setSelectedStaff(staffId));
          if (staffId === "anyone") {
            setSelectedStaffMember(null);
          } else {
            const foundStaff = staffMembers.find(
              (s) => s.id.toString() === staffId,
            );
            if (foundStaff) {
              setSelectedStaffMember(foundStaff);
            } else {
              setSelectedStaffMember(dummyStaff);
            }
          }
        }}
      />

      {/* Processing Payment Overlay */}
      {processingPayment && (
        <View style={styles.processingOverlay}>
          <View style={styles.processingContainer}>
            <ActivityIndicator size="large" color={theme.primary} />
            <Text style={styles.processingText}>Processing payment...</Text>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

export default function Checkout() {
  return <CheckoutContent />;
}
