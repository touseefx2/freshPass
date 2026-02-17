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
  ActivityIndicator,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRouter, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useTheme, useAppSelector, useAppDispatch } from "@/src/hooks/hooks";
import {
  setSelectedStaff,
  setBusinessData as setBusinessDataAction,
  type StaffMember,
  type BusinessHours,
} from "@/src/state/slices/bsnsSlice";
import {
  setActionLoader,
  setGuestModeModalVisible,
} from "@/src/state/slices/generalSlice";
import { useNotificationContext } from "@/src/contexts/NotificationContext";
import { ApiService } from "@/src/services/api";
import Logger from "@/src/services/logger";
import {
  appointmentsEndpoints,
  businessEndpoints,
} from "@/src/services/endpoints";
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
import { Feather } from "@expo/vector-icons";
import { MorningIcon, EveningIcon, NightIcon, CloseIcon } from "@/assets/icons";
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

interface SubscriptionData {
  id: number;
  subscriptionPlanId: number;
  subscriptionPlan: string;
  subscriptionPlanPrice: string;
  subscriptionPlanType: string;
  subscriptionPlanDescription: string;
  userId: number;
  user: string;
  businessId: number;
  business: string;
  subscriber: string;
  visits: {
    used: number;
    upcoming: number;
    total: number;
    remaining: number;
  };
  status: string;
  paymentDate: string | null;
  nextPaymentDate: string;
  remainingDays: number;
  stripePaymentIntentId: string | null;
  stripePaymentUrl: string;
  cardLastFour: string | null;
  createdAt: string;
  deleted_at: string | null;
  appointments: any[];
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
    // Staff Selection Section
    staffTitle: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      marginBottom: moderateHeightScale(12),
      paddingHorizontal: moderateWidthScale(20),
      marginTop: moderateHeightScale(20),
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
    // Subscription Card Section
    subscriptionCard: {
      marginHorizontal: moderateWidthScale(20),
      marginTop: moderateHeightScale(16),
      marginBottom: moderateHeightScale(12),
      borderRadius: moderateWidthScale(16),
      backgroundColor: theme.background,
      padding: moderateWidthScale(16),
      borderWidth: 1,
      borderColor: theme.borderLight,
      shadowColor: theme.shadow,
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    cardHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      marginBottom: moderateHeightScale(10),
    },
    planTitleRow: {
      flexDirection: "row",
      alignItems: "center",
      flex: 1,
      marginRight: moderateWidthScale(8),
    },
    starIcon: {
      marginRight: moderateWidthScale(6),
    },
    planTitle: {
      fontSize: fontSize.size20,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      textTransform: "capitalize",
      flex: 1,
    },
    statusBadge: {
      paddingHorizontal: moderateWidthScale(12),
      paddingVertical: moderateHeightScale(4),
      borderRadius: moderateWidthScale(20),
      backgroundColor: theme.orangeBrown015,
      borderWidth: 1,
      borderColor: theme.orangeBrown,
    },
    statusText: {
      fontSize: fontSize.size11,
      fontFamily: fonts.fontBold,
      color: theme.orangeBrown,
      letterSpacing: 0.5,
    },
    topSection: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: moderateHeightScale(8),
    },
    userInfoRow: {
      flexDirection: "row",
      alignItems: "center",
      flex: 1,
    },
    userIcon: {
      marginRight: moderateWidthScale(6),
    },
    userText: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
      opacity: 0.75,
    },
    priceBadge: {
      backgroundColor: theme.buttonBack,
      paddingHorizontal: moderateWidthScale(14),
      paddingVertical: moderateHeightScale(8),
      borderRadius: moderateWidthScale(12),
      alignItems: "center",
      minWidth: moderateWidthScale(90),
    },
    priceText: {
      fontSize: fontSize.size20,
      fontFamily: fonts.fontBold,
      color: theme.white,
    },
    planPriceLabel: {
      fontSize: fontSize.size10,
      fontFamily: fonts.fontRegular,
      color: theme.white,
      marginTop: moderateHeightScale(1),
      opacity: 0.9,
    },
    descriptionText: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.darkGreen,
      marginBottom: moderateHeightScale(10),
      opacity: 0.65,
      lineHeight: fontSize.size18,
    },
    usageSection: {
      marginTop: moderateHeightScale(8),
      marginBottom: moderateHeightScale(8),
      paddingTop: moderateHeightScale(10),
      borderTopWidth: 1,
      borderTopColor: theme.borderLight,
    },
    usageHeader: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: moderateHeightScale(8),
    },
    usageTitle: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      marginLeft: moderateWidthScale(6),
      flex: 1,
    },
    usageStats: {
      flexDirection: "row",
      justifyContent: "space-between",
      gap: moderateWidthScale(6),
    },
    usageItem: {
      alignItems: "center",
      flex: 1,
      paddingVertical: moderateHeightScale(8),
      backgroundColor: theme.lightGreen015,
      borderRadius: moderateWidthScale(10),
      borderWidth: 1,
      borderColor: theme.borderLight,
    },
    usageLabel: {
      fontSize: fontSize.size10,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
      marginBottom: moderateHeightScale(3),
      opacity: 0.65,
    },
    usageValue: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    paymentRenewalRow: {
      flexDirection: "row",
      marginTop: moderateHeightScale(6),
      marginBottom: moderateHeightScale(6),
      paddingTop: moderateHeightScale(8),
      borderTopWidth: 1,
      borderTopColor: theme.borderLight,
    },
    paymentDateContainer: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      marginRight: moderateWidthScale(8),
    },
    renewalContainer: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      marginLeft: moderateWidthScale(8),
    },
    dateInfoContainer: {
      marginLeft: moderateWidthScale(4),
    },
    dateLabel: {
      fontSize: fontSize.size10,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
      opacity: 0.7,
    },
    dateValue: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontBold,
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
    bottom: {
      backgroundColor: theme.white,
      paddingHorizontal: moderateWidthScale(20),
      gap: moderateHeightScale(16),
      paddingVertical: moderateHeightScale(12),
      borderColor: theme.borderLight,
      borderTopWidth: 1,
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
  const user = useAppSelector((state: any) => state.user);
  const isGuest = user.isGuest;

  const params = useLocalSearchParams<{
    businessId?: string;
    subscriptionId?: string;
    item?: string;
  }>();

  // Parse subscription data from params
  const subscriptionData: SubscriptionData | null = useMemo(() => {
    if (params.item) {
      try {
        return JSON.parse(params.item);
      } catch (e) {
        return null;
      }
    }
    return null;
  }, [params.item]);

  // State for business data
  const [businessHours, setBusinessHours] = useState<BusinessHours | null>(
    null
  );
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedStaffId, setSelectedStaffId] = useState<string>("anyone");
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
  const [note, setNote] = useState<string>("");
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
    category: "morning" | "evening" | "night"
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
      (scrollX - paddingHorizontal + slotWidth / 2) / (slotWidth + gap)
    );

    // Clamp to valid range
    const allSlots = getAllSlots();
    const clampedIndex = Math.max(
      0,
      Math.min(visibleIndex, allSlots.length - 1)
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

  // Fetch business details from backend
  const fetchBusinessDetails = useCallback(async () => {
    const businessId = params.businessId;
    if (!businessId) {
      showBanner(
        "Error",
        "Business ID is missing. Please try again.",
        "error",
        4000
      );
      return;
    }

    try {
      setLoading(true);
      const response = await ApiService.get<{
        success: boolean;
        message: string;
        data: {
          business: any;
        };
      }>(businessEndpoints.businessDetails(businessId));

      if (response.success && response.data?.business) {
        const businessData = response.data.business;

        // Parse business hours
        const parseTimeToHoursMinutes = (
          timeString: string | null | undefined
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

        // Map staff members with working_hours
        const staffMembersData = (businessData?.staff || [])
          .filter((staff: any) => staff.invitation_status === "accepted")
          .map((staff: any) => {
            const DEFAULT_AVATAR_URL =
              process.env.EXPO_PUBLIC_DEFAULT_AVATAR_IMAGE ?? "";

            let image = DEFAULT_AVATAR_URL;

            if (staff.avatar) {
              image = `${process.env.EXPO_PUBLIC_API_BASE_URL}${staff.avatar}`;
            }

            const staffWorkingHours = parseBusinessHours(staff.working_hours);

            return {
              id: staff.id || staff.user_id || 0,
              name: staff.name || "Staff Member",
              experience: staff?.description ?? null,
              image: image,
              working_hours: staffWorkingHours,
            };
          });

        const businessHoursData = parseBusinessHours(businessData?.hours);

        setBusinessHours(businessHoursData);
        setStaffMembers(staffMembersData);

        // Store in Redux for consistency
        dispatch(
          setBusinessDataAction({
            staffMembers: staffMembersData,
            businessId: businessId,
            businessHours: businessHoursData,
            allServices: [],
            selectedService: undefined,
          })
        );
      } else {
        showBanner(
          "Error",
          "Failed to load business details. Please try again.",
          "error",
          4000
        );
      }
    } catch (err: any) {
      showBanner(
        "Error",
        err.message || "Failed to load business details. Please try again.",
        "error",
        4000
      );
    } finally {
      setLoading(false);
    }
  }, [params.businessId, dispatch, showBanner]);

  // Fetch business details on mount
  useEffect(() => {
    if (params.businessId) {
      fetchBusinessDetails();
    }
  }, [params.businessId, fetchBusinessDetails]);

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
        onBackPress
      );

      return () => subscription.remove();
    }, [handleBackNavigation])
  );

  // Update selected staff member when staff ID changes
  useEffect(() => {
    if (selectedStaffId === "anyone") {
      setSelectedStaffMember(null);
    } else {
      const foundStaff = staffMembers.find(
        (s) => s.id.toString() === selectedStaffId
      );
      if (foundStaff) {
        setSelectedStaffMember(foundStaff);
      } else {
        setSelectedStaffMember(null);
      }
    }
    // Clear selected time slot when staff changes
    setSelectedTimeSlot(null);
  }, [selectedStaffId, staffMembers]);

  // Update Redux when staff changes
  useEffect(() => {
    dispatch(setSelectedStaff(selectedStaffId));
  }, [selectedStaffId, dispatch]);

  // Staff list for selection
  const staffList = useMemo(() => {
    return [
      {
        id: "anyone",
        name: "Anyone who's available",
        experience: null,
        image: null,
      },
      ...staffMembers
        .map((staff) => ({
          id: staff.id.toString(),
          name: staff.name,
          experience: staff.experience ?? null,
          image: staff.image,
        })),
    ];
  }, [staffMembers]);

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
          slotMinutes >= breakTime.start && slotMinutes < breakTime.end
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
    [availableTimeSlots]
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

  const subscriptionId = params.subscriptionId
    ? parseInt(params.subscriptionId)
    : undefined;

  const handleBookNow = async () => {
    if (!selectedTimeSlot) {
      showBanner(
        "Time Slot Required",
        "Please select a time slot to proceed with booking.",
        "warning",
        4000
      );
      return;
    }

    if (!subscriptionData) {
      showBanner(
        "Subscription Required",
        "Subscription data is missing. Please try again.",
        "error",
        4000
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
      appointment_date: string;
      appointment_time: string;
      notes?: string;
      staff_id?: number;
      subscription_id?: number;
    } = {
      business_id: parseInt(params.businessId || "0", 10),
      appointment_type: "subscription",
      appointment_date: selectedDate.format("YYYY-MM-DD"),
      appointment_time: selectedTimeSlot || "",
    };

    // Add notes only if it exists
    if (note && note.trim()) {
      requestBody.notes = note.trim();
    }

    // Add staff_id only if staff is selected (not "anyone")
    if (!isAnyoneSelected) {
      requestBody.staff_id = parseInt(selectedStaffId);
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
        requestBody
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

      Logger.log(
        "Appointment API Response:",
        JSON.stringify(response, null, 2)
      );

      const isSuccess = response?.success || response?.data?.success;

      if (isSuccess) {
        const appointmentId =
          (response?.data as any)?.id ||
          (response?.data as any)?.data?.id ||
          null;
        const appointmentDate =
          (response?.data as any)?.appointmentDate ||
          (response?.data as any)?.data?.appointmentDate ||
          null;

        // Create bookingId: appointmentDate (YYYYMMDD format) + appointmentId
        let dateFormatted = "";
        if (appointmentDate) {
          const dateParts = appointmentDate.split("/");
          if (dateParts.length === 3) {
            const [month, day, year] = dateParts;
            dateFormatted = `${year}${month.padStart(2, "0")}${day.padStart(
              2,
              "0"
            )}`;
          }
        }
        const bookingId =
          appointmentId && dateFormatted
            ? `${dateFormatted}${appointmentId}`
            : `${Date.now()}${Math.floor(Math.random() * 10000)}`;

        showBanner("Success", "Your booking is confirmed.", "success", 3000);

        // Navigate to booking detail page
        router.push({
          pathname: "/(main)/bookingDetail",
          params: {
            appointmentId: appointmentId ? appointmentId.toString() : "",
            bookingId: bookingId,
            selectedStaff: selectedStaffId,
            selectedStaffMember: selectedStaffMember
              ? JSON.stringify(selectedStaffMember)
              : "",
            selectedDate: selectedDate.format("YYYY-MM-DD"),
            selectedTimeSlot: selectedTimeSlot || "",
            businessId: params.businessId || "",
            business_id: params.businessId || "",
            subscriptionId: subscriptionId?.toString() || "",
            note: note || "",
            fromCheckoutBooking: "true",
          },
        });
      } else {
        showBanner(
          "Booking Failed",
          response?.message || "Failed to book appointment. Please try again.",
          "error",
          4000
        );
      }
    } catch (error: any) {
      dispatch(setActionLoader(false));
      Logger.error("Appointment API Error:", error);

      showBanner(
        "Booking Failed",
        error?.message || "Failed to book appointment. Please try again.",
        "error",
        4000
      );
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" />
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

            <View
              style={[styles.line, { marginTop: moderateHeightScale(20) }]}
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
                  return (
                    <TouchableOpacity
                      activeOpacity={0.7}
                      key={staff.id}
                      style={[
                        styles.staffCard,
                        selectedStaffId === staff.id &&
                          styles.staffCardSelected,
                        isAnyone && styles.staffCardAnyone,
                        !isAnyone && styles.shadow,
                      ]}
                      onPress={() => {
                        setSelectedStaffId(staff.id);
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
                            <Text
                              style={styles.staffExperience}
                              numberOfLines={1}
                            >
                              {staff.experience}
                            </Text>
                          ) : null}
                        </View>
                        <View style={[styles.radioButton]}>
                          {selectedStaffId === staff.id && (
                            <View style={styles.radioButtonInner} />
                          )}
                        </View>
                      </>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
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

            {/* Subscription Card - At the end */}
            {subscriptionData && (
              <View style={styles.subscriptionCard}>
                {/* Header: Plan Name and Status */}
                <View style={styles.cardHeader}>
                  <View style={styles.planTitleRow}>
                    <Feather
                      name="star"
                      size={moderateWidthScale(16)}
                      color={theme.orangeBrown}
                      style={styles.starIcon}
                    />
                    <Text style={styles.planTitle}>
                      {subscriptionData.subscriptionPlan}
                    </Text>
                  </View>
                  <View style={styles.statusBadge}>
                    <Text style={styles.statusText}>
                      {subscriptionData.status.toUpperCase()}
                    </Text>
                  </View>
                </View>

                {/* User Info and Price Badge */}
                <View style={styles.topSection}>
                  <View style={styles.userInfoRow}>
                    <Feather
                      name="user"
                      size={moderateWidthScale(14)}
                      color={theme.darkGreen}
                      style={styles.userIcon}
                    />
                    <Text style={styles.userText} numberOfLines={1}>
                      {subscriptionData.business}
                    </Text>
                  </View>
                  <View style={styles.priceBadge}>
                    <Text style={styles.priceText}>
                      ${subscriptionData.subscriptionPlanPrice}
                    </Text>
                    <Text style={styles.planPriceLabel}>/month</Text>
                  </View>
                </View>

                {/* Description */}
                {subscriptionData.subscriptionPlanDescription && (
                  <Text style={styles.descriptionText} numberOfLines={2}>
                    {subscriptionData.subscriptionPlanDescription}
                  </Text>
                )}

                {/* Usage Section */}
                <View style={styles.usageSection}>
                  <View style={styles.usageHeader}>
                    <Feather
                      name="zap"
                      size={moderateWidthScale(14)}
                      color={theme.orangeBrown}
                    />
                    <Text style={styles.usageTitle}>
                      {subscriptionData.visits.total} Visits Per Month
                    </Text>
                  </View>
                  <View style={styles.usageStats}>
                    <View style={styles.usageItem}>
                      <Text style={styles.usageLabel}>Used</Text>
                      <Text style={styles.usageValue}>
                        {subscriptionData.visits.used}
                      </Text>
                    </View>
                    <View style={styles.usageItem}>
                      <Text style={styles.usageLabel}>Upcoming</Text>
                      <Text style={styles.usageValue}>
                        {subscriptionData.visits.upcoming}
                      </Text>
                    </View>
                    <View style={styles.usageItem}>
                      <Text style={styles.usageLabel}>Remaining</Text>
                      <Text style={styles.usageValue}>
                        {subscriptionData.visits.remaining}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Payment Date and Next Renewal - Side by Side */}
                {(subscriptionData.paymentDate ||
                  subscriptionData.status?.trim()?.toLowerCase() ===
                    "active") && (
                  <View style={styles.paymentRenewalRow}>
                    {subscriptionData.paymentDate && (
                      <View style={styles.paymentDateContainer}>
                        <Feather
                          name="credit-card"
                          size={moderateWidthScale(12)}
                          color={theme.darkGreen}
                        />
                        <View style={styles.dateInfoContainer}>
                          <Text style={styles.dateLabel}>Payment</Text>
                          <Text style={styles.dateValue}>
                            {subscriptionData.paymentDate}
                          </Text>
                        </View>
                      </View>
                    )}
                    {subscriptionData.status?.trim()?.toLowerCase() ===
                      "active" && (
                      <View
                        style={[
                          styles.renewalContainer,
                          !subscriptionData.paymentDate && { marginLeft: 0 },
                        ]}
                      >
                        <Feather
                          name="calendar"
                          size={moderateWidthScale(12)}
                          color={theme.darkGreen}
                        />
                        <View style={styles.dateInfoContainer}>
                          <Text style={styles.dateLabel}>Renewal</Text>
                          <Text style={styles.dateValue}>
                            {subscriptionData.nextPaymentDate}
                          </Text>
                        </View>
                      </View>
                    )}
                  </View>
                )}
              </View>
            )}
          </ScrollView>

          <View style={styles.bottom}>
            {/* Book Now Button */}
            <Button title="Book now" onPress={handleBookNow} />
          </View>
        </KeyboardAvoidingView>
      </View>
    </SafeAreaView>
  );
}

export default function checkoutBooking() {
  return <CheckoutContent />;
}
