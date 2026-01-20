import React, {
  useMemo,
  useState,
  useRef,
  useEffect,
  useCallback,
} from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Image,
  Animated,
  Dimensions,
  ActivityIndicator,
} from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useAppSelector, useTheme } from "@/src/hooks/hooks";
import dayjs from "dayjs";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import { useFocusEffect, useRouter } from "expo-router";
import {
  heightScale,
  moderateHeightScale,
  moderateWidthScale,
  widthScale,
} from "@/src/theme/dimensions";
import Button from "@/src/components/button";
import {
  PersonIcon,
  MonitorIcon,
  PlatformVerifiedStarIcon,
  StarIconSmall,
  ChevronDownIcon,
  ChevronRight,
} from "@/assets/icons";
import InclusionsModal from "@/src/components/inclusionsModal";
import { ApiService } from "@/src/services/api";
import {
  businessEndpoints,
  appointmentsEndpoints,
} from "@/src/services/endpoints";
import { useNotificationContext } from "@/src/contexts/NotificationContext";
import RetryButton from "@/src/components/retryButton";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    tabsContainer: {
      backgroundColor: theme.background,
    },
    contentContainer: {
      flex: 1,
    },
    swipeableContent: {
      flexDirection: "row",
    },
    tabContent: {
      width: SCREEN_WIDTH,
      overflow: "hidden",
    },
    segmentedControl: {
      flexDirection: "row",
      backgroundColor: theme.darkGreen,
      borderRadius: moderateWidthScale(999),
      padding: moderateWidthScale(3),
      marginHorizontal: moderateWidthScale(20),
      marginBottom: moderateHeightScale(12),
    },
    segment: {
      flex: 1,
      paddingVertical: moderateHeightScale(6),
      alignItems: "center",
      justifyContent: "center",
      borderRadius: moderateWidthScale(999),
    },
    segmentActive: {
      backgroundColor: theme.orangeBrown,
      borderWidth: moderateWidthScale(1),
      borderColor: theme.buttonBack,
    },
    segmentInactive: {
      backgroundColor: "transparent",
    },
    segmentText: {
      fontSize: fontSize.size14,
    },
    segmentTextActive: {
      color: theme.darkGreen,
      fontFamily: fonts.fontMedium,
    },
    segmentTextInactive: {
      color: theme.segmentInactiveTabText,
      fontFamily: fonts.fontRegular,
    },
    categoriesContainer: {
      marginTop: moderateHeightScale(4),
    },
    categoriesScroll: {
      paddingHorizontal: moderateWidthScale(20),
    },
    categoryItem: {
      alignItems: "center",
      marginRight: moderateWidthScale(16),
      width: widthScale(60),
    },
    categoryImage: {
      width: widthScale(60),
      height: heightScale(60),
      borderRadius: moderateWidthScale(8),
      backgroundColor: theme.lightGreen2,
      borderColor: theme.borderLight,
    },
    categoryImageActive: {
      borderColor: theme.selectCard,
    },
    categoryText: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.darkGreen,
      marginTop: moderateHeightScale(4),
      textAlign: "center",
      flexWrap: "wrap",
      width: widthScale(60),
    },
    categoryTextActive: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.selectCard,
      marginTop: moderateHeightScale(4),
      textAlign: "center",
      flexWrap: "wrap",
      width: widthScale(60),
    },
    categoryTabs: {
      flexDirection: "row",
      paddingHorizontal: moderateWidthScale(20),
      alignItems: "center",
      // backgroundColor: "red",
    },
    categoryTabsSticky: {
      position: "absolute",
      left: 0,
      right: 0,
      zIndex: 10,
      backgroundColor: theme.background,
      borderBottomWidth: moderateWidthScale(1),
      borderBottomColor: theme.lightGreen1,
    },
    categoryTab: {
      paddingHorizontal: moderateWidthScale(12),
      paddingVertical: moderateHeightScale(8),
      // marginRight: moderateWidthScale(1),
      alignItems: "center",
      position: "relative",
    },
    categoryTabActive: {
      // No background change for active
    },
    categoryTabText: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontMedium,
      color: theme.lightGreen,
    },
    categoryTabTextActive: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
    },
    categoryTabUnderline: {
      position: "absolute",
      bottom: moderateHeightScale(0),
      left: moderateWidthScale(12),
      right: moderateWidthScale(12),
      height: moderateHeightScale(2),
      backgroundColor: theme.selectCard,
      borderRadius: moderateWidthScale(1),
    },
    resultsHeader: {
      paddingHorizontal: moderateWidthScale(20),
      paddingVertical: moderateHeightScale(10),
      marginVertical: moderateHeightScale(12),
      backgroundColor: theme.mapCircleFill,
      width: "100%",
    },
    resultsText: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.darkGreen,
      flexWrap: "wrap",
    },
    resultsTextBold: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
    },
    appCard: {
      height: heightScale(150),
    },
    appointmentsScroll: {
      paddingHorizontal: moderateWidthScale(20),
      gap: moderateWidthScale(12),
    },
    verifiedSalonCard: {
      backgroundColor: theme.darkGreen,
      borderRadius: moderateWidthScale(12),
      padding: moderateWidthScale(16),
      height: heightScale(140),
      width: widthScale(310),
      alignItems: "center",
      justifyContent: "center",
      gap: moderateWidthScale(12),
    },
    verifiedCardTopRow: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: moderateHeightScale(12),
      gap: moderateWidthScale(4),
      width: "100%",
    },
    verifiedBadge: {
      backgroundColor: theme.orangeBrown,
      paddingHorizontal: moderateWidthScale(12),
      paddingVertical: moderateHeightScale(6),
      borderRadius: moderateWidthScale(999),
      alignSelf: "flex-start",
    },
    verifiedBadgeText: {
      fontSize: fontSize.size10,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
    },
    dateTimeBadge: {
      backgroundColor: theme.darkGreenLight,
      paddingHorizontal: moderateWidthScale(12),
      paddingVertical: moderateHeightScale(6),
      borderRadius: moderateWidthScale(999),
      alignSelf: "flex-start",
    },
    dateTimeBadgeText: {
      fontSize: fontSize.size10,
      fontFamily: fonts.fontMedium,
      color: theme.white,
    },
    verifiedCardContent: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: moderateWidthScale(12),
    },
    verifiedCardImage: {
      width: widthScale(67),
      height: heightScale(67),
      borderRadius: moderateWidthScale(999),
      backgroundColor: theme.emptyProfileImage,
      borderWidth:1,
      borderColor:theme.borderLight,
    },
    verifiedCardImageNew: {
      width: widthScale(105),
      height: heightScale(120),
      borderRadius: moderateWidthScale(999),
      backgroundColor: theme.lightGreen2,
      borderWidth: 1,
      borderColor: theme.borderLight,
      overflow: "hidden",
    },
    verifiedCardTextContainer: {
      flex: 1,
      gap: moderateHeightScale(4),
    },
    salonName: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontBold,
      color: theme.white,
      textTransform: "capitalize",
    },
    verifiedCardInfoRow: {
      flexDirection: "row",
      alignItems: "center",
    },
    verifiedCardInfoRow2: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      width: "100%",
    },
    verifiedCardInfoText: {
      fontSize: fontSize.size11,
      fontFamily: fonts.fontMedium,
      color: theme.white80,
      marginLeft: moderateWidthScale(6),
    },
    viewDetailLink: {
      flexDirection: "row",
      alignItems: "center",
      alignSelf: "flex-end",
      gap: moderateWidthScale(4),
    },
    viewDetailText: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontMedium,
      color: theme.orangeBrown,
    },
    verifiedSalonCardNew: {
      backgroundColor: theme.darkGreen,
      borderRadius: moderateWidthScale(12),
      padding: moderateWidthScale(16),
      height: heightScale(140),
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(12),
      width: widthScale(310),
    },
    verifiedSalonImage: {
      width: widthScale(100),
      height: heightScale(110),
      borderRadius: moderateWidthScale(6),
      backgroundColor: theme.emptyProfileImage,
      borderWidth: 1,
      borderColor: theme.borderLight,
      overflow: "hidden",
    },
    platformVerifiedBadge: {
      backgroundColor: theme.darkGreenLight,
      paddingHorizontal: moderateWidthScale(10),
      paddingVertical: moderateHeightScale(6),
      borderRadius: moderateWidthScale(999),
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(6),
      alignSelf: "flex-start",
    },
    platformVerifiedText: {
      fontSize: fontSize.size10,
      fontFamily: fonts.fontMedium,
      color: theme.white,
    },
    verifiedSalonContent: {
      gap: moderateHeightScale(12),
      width: "60%",
    },
    verifiedSalonBusinessName: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontBold,
      color: theme.white,
      textTransform: "capitalize",
    },
    verifiedSalonAddress: {
      fontSize: fontSize.size11,
      fontFamily: fonts.fontRegular,
      color: theme.white80,
    },
    verifiedSalonBottomRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    verifiedSalonRatingButton: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: moderateWidthScale(6),
      paddingVertical: moderateHeightScale(6),
      borderRadius: moderateWidthScale(999),
      borderWidth: moderateWidthScale(1),
      borderColor: theme.white70,
      gap: moderateWidthScale(6),
    },
    verifiedSalonRatingText: {
      fontSize: fontSize.size10,
      fontFamily: fonts.fontRegular,
      color: theme.white,
    },
    verifiedSalonViewDetail: {},
    verifiedSalonViewDetailText: {
      fontSize: fontSize.size11,
      fontFamily: fonts.fontMedium,
      color: theme.orangeBrown,
      textDecorationLine: "underline",
      textDecorationColor: theme.orangeBrown,
    },
    filtersContainer: {
      marginBottom: moderateHeightScale(16),
      marginTop: moderateHeightScale(8),
    },
    filterItem: {
      paddingHorizontal: moderateWidthScale(16),
      paddingVertical: moderateHeightScale(8),
      borderRadius: moderateWidthScale(999),
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
    },
    filterItemPrimary: {
      backgroundColor: theme.darkGreen,
    },
    filterItemInactive: {
      backgroundColor: theme.background,
      borderWidth: 0.5,
      borderColor: theme.serviceBorder,
    },
    filterItemActive: {
      backgroundColor: theme.lightGreen015,
      borderWidth: 1,
      borderColor: theme.serviceBorder,
    },
    filterText: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.darkGreen,
    },
    filterTextPrimary: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontBold,
      color: theme.background,
    },
    filterTextInactive: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.darkGreen,
    },
    filterTextActive: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.darkGreen,
    },
    filterIcon: {
      marginLeft: moderateWidthScale(5),
      top: 1,
    },
    sectionTitle: {
      fontSize: fontSize.size19,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      paddingHorizontal: moderateWidthScale(20),
      marginTop: moderateHeightScale(5),
    },
    sectionHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      paddingHorizontal: moderateWidthScale(20),
    },
    sectionSubTitle: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
      maxWidth: "75%",
      textTransform: "capitalize",
    },
    sectionViewMore: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontMedium,
      color: theme.orangeBrown,
      textDecorationLine: "underline",
      textDecorationColor: theme.orangeBrown,
    },
    serviceCard: {
      backgroundColor: theme.white,
      borderRadius: moderateWidthScale(12),
      paddingVertical: moderateWidthScale(12),
      marginBottom: moderateHeightScale(12),
      width: widthScale(225),
      height: heightScale(120),
      justifyContent: "space-between",
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
    serviceTitle: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    servicePrice: {
      alignItems: "flex-end",
      gap: moderateWidthScale(4),
    },
    priceCurrent: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    priceOriginal: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen4,
      textDecorationLine: "line-through",
    },
    serviceDescription: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      marginBottom: moderateHeightScale(8),
    },
    line: {
      height: 0.5,
      width: "100%",
      backgroundColor: theme.borderLight,
    },
    serviceBottomRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: moderateWidthScale(12),
    },
    serviceDuration: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      maxWidth: "65%",
    },
    serviceButtonContainer: {
      alignSelf: "flex-end",
    },
    servicesScroll: {
      paddingHorizontal: moderateWidthScale(20),
      paddingBottom: moderateHeightScale(16),
      gap: moderateWidthScale(12),
    },
    subscriptionCard: {
      backgroundColor: theme.white,
      borderRadius: moderateWidthScale(12),
      width: widthScale(200),
      height: heightScale(180),
      overflow: "hidden",
    },
    offerBadgesContainer: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: moderateWidthScale(4),
    },
    offerBadge: {
      paddingHorizontal: moderateWidthScale(8),
      paddingVertical: moderateHeightScale(4),
      borderRadius: moderateWidthScale(999),
      alignSelf: "flex-start",
    },
    offerBadgeOrange: {
      backgroundColor: theme.selectCard,
    },
    offerBadgeGreen: {
      borderWidth: 1,
      borderColor: theme.lightGreen,
      borderRadius: moderateWidthScale(999),
    },
    offerText: {
      fontSize: fontSize.size10,
      fontFamily: fonts.fontBold,
      color: theme.white,
    },
    subscriptionTitle: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      marginVertical: moderateHeightScale(8),
    },
    inclusionItem: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      marginBottom: moderateHeightScale(2),
    },
    moreText: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.primary,
      textDecorationLine: "underline",
      textDecorationColor: theme.primary,
    },
    inclusionsModalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      justifyContent: "center",
      alignItems: "center",
    },
    inclusionsModalContainer: {
      backgroundColor: theme.background,
      borderRadius: moderateWidthScale(12),
      padding: moderateWidthScale(20),
      width: widthScale(300),
      maxHeight: heightScale(400),
      shadowColor: "#000",
      shadowOffset: {
        width: 0,
        height: moderateHeightScale(2),
      },
      shadowOpacity: 0.25,
      shadowRadius: moderateWidthScale(3.84),
      elevation: 5,
    },
    inclusionsModalTitle: {
      fontSize: fontSize.size18,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      marginBottom: moderateHeightScale(16),
    },
    inclusionsModalList: {
      gap: moderateHeightScale(8),
    },
    inclusionsModalItem: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.text,
    },
    subscriptionPrice: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: moderateHeightScale(8),

      width: "100%",
    },
    subscriptionPriceContainer: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(4),
      maxWidth: "55%",
    },
    subscriptionButtonContainer: {
      alignSelf: "flex-end",
    },
    button: {
      backgroundColor: theme.bookNowButton,
      paddingHorizontal: moderateWidthScale(10),
      paddingVertical: moderateHeightScale(6),
      height: moderateHeightScale(28),
      borderRadius: moderateWidthScale(999),
    },
    buttonText: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.darkGreen,
    },
    sectionContainer: {
      // marginBottom: moderateHeightScale(24),
    },
  });

// Static data - categories will be fetched from API

// Service filters will be populated dynamically from API

const membershipFilters = [
  { id: "list", label: "List", isPrimary: true },
  { id: "all", label: "All", isPrimary: false },
  { id: "classic-care", label: "Classic Care", isPrimary: false },
  { id: "gold-glam", label: "Gold Glam", isPrimary: false },
  { id: "vip-elite", label: "VIP Elite", isPrimary: false },
];

// Section-based data structure
interface ServiceItem {
  id: number;
  title: string;
  price: number;
  originalPrice: number;
  description: string;
  duration: string;
}

interface SubscriptionItem {
  id: number;
  title: string;
  price: number;
  originalPrice: number;
  offer: string;
  offer2?: string;
  inclusions: string[];
  image: string | null;
}

interface ServiceSection {
  id: number;
  businessName: string;
  type: "individual" | "subscription";
  services?: ServiceItem[];
  subscriptions?: SubscriptionItem[];
}

// Static data removed - now using API data

interface Appointment {
  id: number;
  businessId: number;
  businessTitle: string;
  businessAddress: string;
  businessLatitude: string;
  businessLongitude: string;
  businessLogoUrl: string | null;
  businessAverageRating: number;
  userId: number;
  user: string;
  userEmail: string;
  appointmentType: "subscription" | "service";
  paymentMethod: string;
  subscriptionId: number | null;
  subscription: string | null;
  subscriptionPlanType: string | null;
  subscriptionPlanDescription: string | null;
  services: any;
  totalPrice: number | {};
  subscriptionServices:
    | Array<{
        id: number;
        name: string;
        description: string;
        price: string;
        duration: {
          hours: number;
          minutes: number;
        };
      }>
    | {};
  subscriptionVisits: {
    used: number;
    upcoming: number;
    total: number;
    remaining: number;
  } | null;
  staffId: number | null;
  staffName: string | null;
  staffEmail: string | null;
  staffImage: string | null;
  appointmentDate: string;
  appointmentTime: string;
  status: string;
  paidAmount: string;
  notes: string | null;
  cancelReason: string | null;
  cancelDate: string | null;
  createdAt: string;
  deleted_at: string | null;
}

interface AppointmentCard {
  id: number;
  badgeText: string;
  dateTime: string;
  businessLogoUrl: string;
  services: string;
  membershipInfo: string;
  staffName: string;
  staffImage: string;
  originalAppointment?: Appointment;
}

interface Category {
  id: number;
  name: string;
  image: string | null;
}

interface VerifiedSalon {
  id: number;
  businessName: string;
  address: string;
  rating: number;
  reviewCount: number;
  image: string | null;
}

export default function DashboardContent() {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);
  const router = useRouter();
  const { showBanner } = useNotificationContext();
  const userRole = useAppSelector((state: any) => state.user.userRole);
  const isGuest = useAppSelector((state: any) => state.user.isGuest);
  const userLocation = useAppSelector((state: any) => state.user.location);
  const selectedDateISO = useAppSelector(
    (state: any) => state.general.selectedDate
  );
  const searchText = useAppSelector((state: any) => state.general.searchText);

  const isCusotmerandGuest = isGuest || userRole === "customer";

  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [categoriesError, setCategoriesError] = useState(false);
  const [verifiedSalons, setVerifiedSalons] = useState<VerifiedSalon[]>([]);
  const [businessesLoading, setBusinessesLoading] = useState(false);
  const [businessesError, setBusinessesError] = useState(false);
  const [businessesCount, setBusinessesCount] = useState(0);
  const [appointments, setAppointments] = useState<AppointmentCard[]>([]);
  const [appointmentsLoading, setAppointmentsLoading] = useState(false);
  const [appointmentsError, setAppointmentsError] = useState(false);
  const [activeTab, setActiveTab] = useState<"subscriptions" | "individual">(
    "subscriptions"
  );
  const [selectedCategory, setSelectedCategory] = useState<
    string | number | undefined
  >(undefined);
  const [showCategoryTabs, setShowCategoryTabs] = useState(false);
  const [selectedServiceFilter, setSelectedServiceFilter] =
    useState<string>("all");
  const [selectedMembershipFilter, setSelectedMembershipFilter] =
    useState<string>("all");
  const [serviceTemplates, setServiceTemplates] = useState<
    Array<{
      id: number;
      name: string;
      category_id: number;
      category: string;
      base_price: number;
      duration_hours: number;
      duration_minutes: number;
      active: boolean;
      createdAt: string;
    }>
  >([]);
  const [serviceTemplatesLoading, setServiceTemplatesLoading] = useState(false);
  const [serviceTemplatesError, setServiceTemplatesError] = useState(false);
  const [inclusionsModalVisible, setInclusionsModalVisible] = useState(false);
  const [selectedInclusions, setSelectedInclusions] = useState<string[]>([]);
  const [serviceSections, setServiceSections] = useState<ServiceSection[]>([]);
  const [subscriptionSections, setSubscriptionSections] = useState<
    ServiceSection[]
  >([]);
  const [sectionsLoading, setSectionsLoading] = useState(false);
  const [sectionsError, setSectionsError] = useState(false);
  const scrollY = useRef(new Animated.Value(0)).current;
  const stickyTabsOpacity = useRef(new Animated.Value(0)).current;
  const stickyTabsTranslateY = useRef(new Animated.Value(-20)).current;
  const categorySectionOpacity = useRef(new Animated.Value(1)).current;
  const categorySectionTranslateY = useRef(new Animated.Value(0)).current;
  const horizontalScrollViewRef = useRef<ScrollView>(null);
  const isManualScrollRef = useRef(false);
  const categoryScrollRef = useRef<ScrollView>(null);
  const isCategoryScrollingRef = useRef(false);
  const categorySectionHeight = useRef(0);
  const categorySectionRef = useRef<View>(null);
  const tabsContainerHeight = useRef(0);
  const tabsContainerRef = useRef<View>(null);

  const fetchCategories = async () => {
    try {
      setCategoriesLoading(true);
      setCategoriesError(false);
      const response = await ApiService.get<{
        success: boolean;
        message: string;
        data: Array<{
          id: number;
          name: string;
          imageUrl: string | null;
        }>;
      }>(businessEndpoints.categories);

      if (response.success && response.data) {
        // Map API response to component format (imageUrl -> image)
        const mappedCategories: Category[] = response.data.map((item) => ({
          id: item.id,
          name: item.name,
          image: item.imageUrl,
        }));
        setCategories(mappedCategories);
        // Set first category as selected if categories exist
        if (mappedCategories.length > 0) {
          setSelectedCategory(mappedCategories[0].id);
        }
      }
    } catch (error) {
      console.error("Failed to fetch categories:", error);
      setCategoriesError(true);
      showBanner("API Failed", "API failed to fetch categories", "error", 2500);
    } finally {
      setCategoriesLoading(false);
    }
  };

  const fetchServiceTemplates = async (categoryId: number | string) => {
    try {
      setServiceTemplatesLoading(true);
      setServiceTemplatesError(false);
      const response = await ApiService.get<{
        success: boolean;
        message: string;
        data: Array<{
          id: number;
          name: string;
          category_id: number;
          category: string;
          base_price: number;
          duration_hours: number;
          duration_minutes: number;
          active: boolean;
          createdAt: string;
        }>;
      }>(businessEndpoints.serviceTemplates(categoryId as number));

      if (response.success && response.data) {
        setServiceTemplates(response.data);
      } else {
        setServiceTemplates([]);
      }
    } catch (error) {
      console.error("Failed to fetch service templates:", error);
      setServiceTemplatesError(true);
      showBanner(
        "API Failed",
        "API failed to fetch service templates",
        "error",
        2500
      );
      setServiceTemplates([]);
    } finally {
      setServiceTemplatesLoading(false);
    }
  };

  const fetchBusinesses = async (
    categoryId: number | string,
    search?: string
  ) => {
    try {
      setBusinessesLoading(true);
      setBusinessesError(false);
      let url = businessEndpoints.businesses(categoryId as number);
      if (search && search.trim()) {
        url += `&search=${encodeURIComponent(search.trim())}`;
      }
      if (selectedDateISO) {
        const formattedDate = dayjs(selectedDateISO).format("YYYY-MM-DD");
        url += `&availability_date=${encodeURIComponent(formattedDate)}`;
      }
      url = `${url}&sort=completed_appointments&direction=desc`;

      // if (userLocation?.lat && userLocation?.long) {
      //   url += `&latitude=${userLocation.lat}`;
      //   url += `&longitude=${userLocation.long}`;
      //   url += `&radius_km=20`;
      // }
      const response = await ApiService.get<{
        success: boolean;
        message: string;
        data: Array<{
          id: number;
          title: string;
          address: string;
          average_rating: number;
          ratings_count: number;
          image_url: string | null;
          logo_url: string | null;
          portfolio_photos?: Array<{
            id: number;
            path: string;
            url: string;
          }>;
        }>;
      }>(url);

      if (response.success && response.data) {
        // Map API response to VerifiedSalon format
        const mappedSalons: VerifiedSalon[] = response.data.map((item) => {
          let imageUrl = process.env.EXPO_PUBLIC_DEFAULT_BUSINESS_IMAGE ?? "";

          if (
            item.portfolio_photos &&
            item.portfolio_photos.length > 0 &&
            item.portfolio_photos[0]?.url
          ) {
            imageUrl = item.portfolio_photos[0].url;
          }

          return {
            id: item.id,
            businessName: item.title,
            address: item.address,
            rating: item.average_rating || 0,
            reviewCount: item.ratings_count || 0,
            image: imageUrl,
          };
        });

        setVerifiedSalons(mappedSalons);
        setBusinessesCount(response.data.length);
      }
    } catch (error) {
      console.error("Failed to fetch businesses:", error);
      setBusinessesError(true);
      showBanner("API Failed", "API failed to fetch businesses", "error", 2500);
      setVerifiedSalons([]);
      setBusinessesCount(0);
    } finally {
      setBusinessesLoading(false);
    }
  };

  const fetchBusinessesWithData = async (
    categoryId: number | string,
    tab: "individual" | "subscriptions",
    serviceTemplateId?: number,
    search?: string
  ) => {
    try {
      setSectionsLoading(true);
      setSectionsError(false);

      // Build API URL with appropriate query parameters
      const baseUrl = businessEndpoints.businesses(categoryId as number);
      const queryParams = new URLSearchParams();

      if (tab === "individual") {
        queryParams.append("with_services", "true");
        if (serviceTemplateId) {
          queryParams.append(
            "service_template_id",
            serviceTemplateId.toString()
          );
        }
      } else {
        queryParams.append("with_subscription_plans", "true");
      }

      if (search && search.trim()) {
        queryParams.append("search", search.trim());
      }

      if (selectedDateISO) {
        const formattedDate = dayjs(selectedDateISO).format("YYYY-MM-DD");
        queryParams.append("availability_date", formattedDate);
      }

      if (userLocation?.lat && userLocation?.long) {
        queryParams.append("latitude", userLocation.lat.toString());
        queryParams.append("longitude", userLocation.long.toString());
        queryParams.append("radius_km", "100");
      }

      // const url = `${baseUrl}&${queryParams.toString()}&sort=completed_appointments`;
      const url = `${baseUrl}&${queryParams.toString()}&sort=completed_appointments&direction=desc`;

      const response = await ApiService.get<{
        success: boolean;
        message: string;
        data: Array<{
          id: number;
          title: string;
          image_url: string | null;
          logo_url: string | null;
          portfolio_photos?: Array<{
            id: number;
            path: string;
            url: string;
          }>;
          services?: Array<{
            id: number;
            name: string;
            description: string | null;
            price: string;
            duration_hours: number;
            duration_minutes: number;
          }>;
          subscription_plans?: Array<{
            id: number;
            name: string;
            description: string;
            price: string;
            visits: number;
            planType: string;
            active: boolean;
            services: Array<{
              id: number;
              name: string;
            }>;
          }>;
        }>;
      }>(url);

      if (response.success && response.data) {
        if (tab === "individual") {
          // Transform services data
          const mappedSections: ServiceSection[] = response.data
            .filter(
              (business) => business.services && business.services.length > 0
            )
            .map((business) => ({
              id: business.id,
              businessName: business.title,
              type: "individual" as const,
              services: business.services!.map((service) => {
                const durationHours = service.duration_hours || 0;
                const durationMinutes = service.duration_minutes || 0;
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
                  id: service.id,
                  title: service.name,
                  price: parseFloat(service.price),
                  originalPrice: parseFloat(
                    (parseFloat(service.price) * 1.1).toFixed(2)
                  ), // Approximate original price
                  description:
                    service.description || "No description available",
                  duration: durationText,
                };
              }),
            }));

          setServiceSections(mappedSections);
        } else {
          // Transform subscription plans data
          const mappedSections: ServiceSection[] = response.data
            .filter(
              (business) =>
                business.subscription_plans &&
                business.subscription_plans.length > 0
            )
            .map((business) => ({
              id: business.id,
              businessName: business.title,
              type: "subscription" as const,
              subscriptions: business.subscription_plans!.map((plan) => {
                // Create inclusions from services
                const inclusions = plan.services.map(
                  (service, index) => `${index + 1}. ${service.name}`
                );

                return {
                  id: plan.id,
                  title: plan.name,
                  price: parseFloat(plan.price),
                  originalPrice: parseFloat(
                    (parseFloat(plan.price) * 1.15).toFixed(2)
                  ), // Approximate original price
                  offer: `${plan.visits} visits included`,
                  offer2: plan.planType === "user" ? "User Plan" : undefined,
                  inclusions:
                    inclusions.length > 0
                      ? inclusions
                      : ["No services included"],
                  image: null,
                };
              }),
            }));

          setSubscriptionSections(mappedSections);
        }
      } else {
        // Empty response
        if (tab === "individual") {
          setServiceSections([]);
        } else {
          setSubscriptionSections([]);
        }
      }
    } catch (error) {
      console.error("Failed to fetch businesses with data:", error);
      setSectionsError(true);
      showBanner(
        "API Failed",
        `API failed to fetch ${
          tab === "individual" ? "services" : "subscriptions"
        }`,
        "error",
        2500
      );
      if (tab === "individual") {
        setServiceSections([]);
      } else {
        setSubscriptionSections([]);
      }
    } finally {
      setSectionsLoading(false);
    }
  };

  const formatAppointmentDateTime = (date: string, time: string): string => {
    try {
      // Parse date format "MM/DD/YYYY"
      const dateParts = date.split("/");
      const month = parseInt(dateParts[0]);
      const day = parseInt(dateParts[1]);
      const year = parseInt(dateParts[2]);

      // Parse time format "HH:mm"
      const [hours, minutes] = time.split(":").map(Number);
      const dateObj = new Date(year, month - 1, day, hours, minutes);

      // Format as "Day, Mon DD at H:MM AM/PM"
      const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      const months = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
      ];

      const dayName = days[dateObj.getDay()];
      const monthName = months[dateObj.getMonth()];
      let hours12 = dateObj.getHours();
      const ampm = hours12 >= 12 ? "PM" : "AM";
      hours12 = hours12 % 12;
      hours12 = hours12 ? hours12 : 12;
      const minutesStr = dateObj.getMinutes().toString().padStart(2, "0");

      return `${dayName}, ${monthName} ${day} at ${hours12}:${minutesStr} ${ampm}`;
    } catch (error) {
      return `${date} at ${time}`;
    }
  };

  const formatMembershipInfo = (appointment: Appointment): string => {
    if (appointment.appointmentType === "subscription") {
      if (appointment.subscriptionVisits) {
        const { remaining } = appointment.subscriptionVisits;
        const subscriptionName = "Subscription";
        return `${subscriptionName} • ${remaining} visit${
          remaining !== 1 ? "s" : ""
        } left`;
      }
      return appointment.subscription || "Subscription";
    } else {
      // For service type, return service info
      if (
        Array.isArray(appointment.services) &&
        appointment.services.length > 0
      ) {
        return `${appointment.services.length} service${
          appointment.services.length !== 1 ? "s" : ""
        }`;
      }
      return "Service";
    }
  };

  const fetchAppointments = async () => {
    try {
      setAppointmentsLoading(true);
      setAppointmentsError(false);

      // Build params object
      const params: {
        status: string;
        page: number;
        per_page: number;
        from_date?: string;
        to_date?: string;
        appointment_type?: string;
      } = {
        status: "scheduled",
        page: 1,
        per_page: 6,
      };

      // Add from_date parameter if selectedDate is not null
      // if (selectedDateISO) {
      //   const selectedDate = dayjs(selectedDateISO);
      //   params.from_date = selectedDate.format("YYYY-MM-DD");
      //   params.to_date = selectedDate.format("YYYY-MM-DD");
      // }

      // Add appointment_type parameter based on activeTab
      // if (activeTab === "individual") {
      //   params.appointment_type = "service";
      // } else if (activeTab === "subscriptions") {
      //   params.appointment_type = "subscription";
      // }

      const response = await ApiService.get<{
        success: boolean;
        message: string;
        data: {
          data: Appointment[];
          meta: {
            current_page: number;
            per_page: number;
            total: number;
            last_page: number;
          };
        };
      }>(appointmentsEndpoints.list(params));

      const allAppointments: Appointment[] = [];

      if (response.success && response.data?.data) {
        allAppointments.push(...response.data.data);
      }

      // Map API appointments to AppointmentCard format
      const mappedAppointments: AppointmentCard[] = allAppointments.map(
        (appointment) => {
          const imageUrl = appointment.businessLogoUrl
            ? process.env.EXPO_PUBLIC_API_BASE_URL + appointment.businessLogoUrl
            : process.env.EXPO_PUBLIC_DEFAULT_BUSINESS_LOGO ?? "";

          const staffImageUrl = appointment.staffImage
            ? process.env.EXPO_PUBLIC_API_BASE_URL + appointment.staffImage
            : process.env.EXPO_PUBLIC_DEFAULT_AVATAR_IMAGE ?? "";

          const dateTime = formatAppointmentDateTime(
            appointment.appointmentDate,
            appointment.appointmentTime
          );

          const membershipInfo = formatMembershipInfo(appointment);

          const staffName =
            appointment.staffId && appointment.staffName
              ? appointment.staffName
              : "Anyone";

          const serviceData =
            appointment.appointmentType === "subscription"
              ? appointment.subscriptionServices
              : appointment.services;

          const name =
            serviceData && serviceData.length > 0
              ? serviceData.map((service: any) => service.name).join(" + ")
              : "Services";

          return {
            id: appointment.id,
            badgeText: "Upcoming appointment",
            dateTime: dateTime,
            businessLogoUrl: imageUrl,
            services: name,
            membershipInfo: membershipInfo,
            staffName: staffName,
            staffImage: staffImageUrl,
            originalAppointment: appointment,
          };
        }
      );

      setAppointments(mappedAppointments);
    } catch (error) {
      console.error("Failed to fetch appointments:", error);
      setAppointmentsError(true);
      showBanner(
        "API Failed",
        "API failed to fetch appointments",
        "error",
        2500
      );
      setAppointments([]);
    } finally {
      setAppointmentsLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (userRole === "customer") {
        fetchAppointments();
       
      }
    }, [])
  );

  // Fetch service templates when category changes or when switching to individual tab
  useEffect(() => {
    if (isCusotmerandGuest && selectedCategory && activeTab === "individual") {
      fetchServiceTemplates(selectedCategory);
    }
  }, [selectedCategory, activeTab]);

  // Reset service filter to "all" when category changes
  useEffect(() => {
    if (isCusotmerandGuest && selectedCategory) {
      setSelectedServiceFilter("all");
    }
  }, [selectedCategory]);

  // Fetch businesses when category or tab changes (with debounced search)
  useEffect(() => {
    if (isCusotmerandGuest && selectedCategory) {
      // Trim search text
      const trimmedSearch = searchText?.trim() || "";

      // Debounce search - wait 500ms after user stops typing
      const debounceTimer = setTimeout(() => {
        fetchBusinesses(selectedCategory, trimmedSearch || undefined);
        const serviceTemplateId =
          activeTab === "individual" &&
          selectedServiceFilter !== "all" &&
          selectedServiceFilter !== "services"
            ? parseInt(selectedServiceFilter)
            : undefined;
        fetchBusinessesWithData(
          selectedCategory,
          activeTab,
          serviceTemplateId,
          trimmedSearch || undefined
        );
      }, 500);

      return () => {
        clearTimeout(debounceTimer);
      };
    }
  }, [
    selectedCategory,
    activeTab,
    selectedServiceFilter,
    searchText,
    selectedDateISO,
    userLocation,
  ]);

  // Initialize scroll position to subscriptions (index 0)
  useEffect(() => {
    // Set initial position without animation
    horizontalScrollViewRef.current?.scrollTo({
      x: 0,
      animated: false,
    });
  }, []);

  // Animate sticky tabs and category section when showCategoryTabs changes
  useEffect(() => {
    if (showCategoryTabs) {
      Animated.parallel([
        // Sticky tabs animation
        Animated.timing(stickyTabsOpacity, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(stickyTabsTranslateY, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
        // Category section hide animation
        Animated.parallel([
          Animated.timing(categorySectionOpacity, {
            toValue: 0,
            duration: 250,
            useNativeDriver: true,
          }),
          Animated.timing(categorySectionTranslateY, {
            toValue: -20,
            duration: 250,
            useNativeDriver: true,
          }),
        ]),
      ]).start();
    } else {
      Animated.parallel([
        // Sticky tabs hide animation
        Animated.timing(stickyTabsOpacity, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(stickyTabsTranslateY, {
          toValue: -20,
          duration: 250,
          useNativeDriver: true,
        }),
        // Category section show animation
        Animated.parallel([
          Animated.timing(categorySectionOpacity, {
            toValue: 1,
            duration: 250,
            useNativeDriver: true,
          }),
          Animated.timing(categorySectionTranslateY, {
            toValue: 0,
            duration: 250,
            useNativeDriver: true,
          }),
        ]),
      ]).start();
    }
  }, [showCategoryTabs]);

  // Update horizontal scroll position when tab changes (only when clicking, not swiping)
  useEffect(() => {
    // Only scroll if this was a manual tab change (click), not from swipe
    if (isManualScrollRef.current) {
      const tabIndex = activeTab === "subscriptions" ? 0 : 1;
      const targetX = tabIndex * SCREEN_WIDTH;

      // Update ScrollView position
      horizontalScrollViewRef.current?.scrollTo({
        x: targetX,
        animated: true,
      });

      // Reset flag after animation completes
      setTimeout(() => {
        isManualScrollRef.current = false;
      }, 500);
    }
  }, [activeTab]);

  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
    {
      useNativeDriver: false,
      listener: (event: any) => {
        const offsetY = event.nativeEvent.contentOffset.y;
        // Show category tabs when scrolled a bit (around 50-80px)
        const threshold = moderateHeightScale(50);

        if (offsetY > threshold && !showCategoryTabs) {
          setShowCategoryTabs(true);
        } else if (offsetY <= threshold && showCategoryTabs) {
          setShowCategoryTabs(false);
        }
      },
    }
  );

  const handleHorizontalScrollEnd = (event: any) => {
    // Only update tab when scroll ends (prevents flickering during animation)
    if (!isManualScrollRef.current) {
      const offsetX = event.nativeEvent.contentOffset.x;
      const newTabIndex = Math.round(offsetX / SCREEN_WIDTH);
      // Index 0 = subscriptions, Index 1 = individual
      const newTab = newTabIndex === 0 ? "subscriptions" : "individual";

      if (newTab !== activeTab) {
        setActiveTab(newTab);
      }
    }
  };

  const handleTabPress = (tab: "subscriptions" | "individual") => {
    isManualScrollRef.current = true;
    setActiveTab(tab);
  };

  const getCategoryName = () => {
    const category = categories.find((cat) => cat.id === selectedCategory);
    return category ? category.name : "Hair Salon";
  };

  // Generate service filters dynamically from API data
  const serviceFilters = useMemo(() => {
    const filters: Array<{ id: string; label: string; isPrimary: boolean }> = [
      { id: "services", label: "Services", isPrimary: true },
      { id: "all", label: "All", isPrimary: false },
    ];

    // Add service templates from API
    serviceTemplates.forEach((template) => {
      if (template.active) {
        filters.push({
          id: template.id.toString(),
          label: template.name,
          isPrimary: false,
        });
      }
    });

    return filters;
  }, [serviceTemplates]);

  const renderFilters = (
    filters: Array<{ id: string; label: string; isPrimary: boolean }>,
    selectedFilter: string,
    onFilterSelect: (id: string) => void
  ) => (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.filtersContainer}
      contentContainerStyle={{
        paddingHorizontal: moderateWidthScale(20),
        flexDirection: "row",
      }}
      nestedScrollEnabled={true}
    >
      {filters.map((filter, index) => (
        <TouchableOpacity
          key={filter.id}
          style={[
            styles.filterItem,
            filter.isPrimary
              ? styles.filterItemPrimary
              : selectedFilter === filter.id
              ? styles.filterItemActive
              : styles.filterItemInactive,
            index < filters.length - 1 && {
              marginRight: moderateWidthScale(12),
            },
          ]}
          onPress={() => !filter.isPrimary && onFilterSelect(filter.id)}
        >
          <Text
            style={[
              filter.isPrimary
                ? styles.filterTextPrimary
                : selectedFilter === filter.id
                ? styles.filterTextActive
                : styles.filterTextInactive,
            ]}
          >
            {filter.label}
          </Text>
          {filter.isPrimary && (
            <View style={styles.filterIcon}>
              <ChevronRight
                width={widthScale(6)}
                height={heightScale(9)}
                color={theme.background}
              />
            </View>
          )}
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  const renderTabContent = (tab: "subscriptions" | "individual") => (
    <ScrollView
      style={styles.tabContent}
      onScroll={handleScroll}
      scrollEventThrottle={16}
      showsVerticalScrollIndicator={false}
    >
      {/* Spacer for sticky tabs */}
      {showCategoryTabs && (
        <View style={{ height: moderateHeightScale(100) }} />
      )}

      {/* Categories - Show images with smooth animation */}
      <Animated.View
        ref={categorySectionRef}
        onLayout={(event) => {
          const { height } = event.nativeEvent.layout;
          if (height > 0) {
            categorySectionHeight.current = height;
          }
        }}
        style={[
          {
            opacity: categorySectionOpacity,
            transform: [{ translateY: categorySectionTranslateY }],
          },
          showCategoryTabs && {
            position: "absolute",
            width: "100%",
            height: 0,
            overflow: "hidden",
          },
        ]}
        pointerEvents={!showCategoryTabs ? "auto" : "none"}
      >
        {categoriesLoading ? (
          <View
            style={[
              styles.categoriesContainer,
              {
                paddingVertical: moderateHeightScale(20),
                alignItems: "center",
                justifyContent: "center",
              },
            ]}
          >
            <ActivityIndicator size="large" color={theme.primary} />
          </View>
        ) : categoriesError ? (
          <View
            style={[
              styles.categoriesContainer,
              {
                paddingVertical: moderateHeightScale(20),
                alignItems: "center",
                justifyContent: "center",
                gap: moderateHeightScale(12),
              },
            ]}
          >
            <Text
              style={{
                fontSize: fontSize.size14,
                fontFamily: fonts.fontRegular,
                color: theme.lightGreen,
                textAlign: "center",
              }}
            >
              Failed to load categories
            </Text>
            <RetryButton
              onPress={fetchCategories}
              loading={categoriesLoading}
            />
          </View>
        ) : categories.length > 0 ? (
          <ScrollView
            ref={categoryScrollRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.categoriesContainer}
            contentContainerStyle={styles.categoriesScroll}
            nestedScrollEnabled={true}
            onTouchStart={() => {
              isCategoryScrollingRef.current = true;
            }}
            onTouchEnd={() => {
              setTimeout(() => {
                isCategoryScrollingRef.current = false;
              }, 100);
            }}
            onScrollBeginDrag={() => {
              isCategoryScrollingRef.current = true;
            }}
            onScrollEndDrag={() => {
              setTimeout(() => {
                isCategoryScrollingRef.current = false;
              }, 100);
            }}
            onMomentumScrollEnd={() => {
              setTimeout(() => {
                isCategoryScrollingRef.current = false;
              }, 100);
            }}
          >
            {categories.map((category) => (
              <TouchableOpacity
                key={category.id}
                style={styles.categoryItem}
                onPress={() => setSelectedCategory(category.id)}
                activeOpacity={0.8}
              >
                <Image
                  source={{
                    uri: category?.image
                      ? process.env.EXPO_PUBLIC_API_BASE_URL + category?.image
                      : process.env.EXPO_PUBLIC_DEFAULT_CATEGORY_IMAGE,
                  }}
                  style={[
                    styles.categoryImage,
                    selectedCategory === category.id &&
                      styles.categoryImageActive,
                    {
                      borderWidth: moderateWidthScale(
                        selectedCategory === category.id ? 3 : 1
                      ),
                    },
                  ]}
                  resizeMode="cover"
                />
                <Text
                  style={
                    selectedCategory === category.id
                      ? styles.categoryTextActive
                      : styles.categoryText
                  }
                  numberOfLines={2}
                >
                  {category.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        ) : null}
      </Animated.View>

      {/* Results Summary */}
      <View style={styles.resultsHeader}>
        <Text style={styles.resultsText}>
          Showing:{" "}
          <Text style={styles.resultsTextBold}>{businessesCount} results</Text>{" "}
          for {getCategoryName()}
          {selectedDateISO && (
            <> on {dayjs(selectedDateISO).format("MMM D, YYYY")}</>
          )}
        </Text>
      </View>

      {/* Platform Verified Salon */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={[styles.appCard]}
        contentContainerStyle={styles.appointmentsScroll}
        nestedScrollEnabled={true}
      >
        {businessesLoading ? (
          <View
            style={{
              paddingVertical: moderateHeightScale(20),
              alignItems: "center",
              justifyContent: "center",
              width: SCREEN_WIDTH,
            }}
          >
            <ActivityIndicator size="large" color={theme.primary} />
          </View>
        ) : businessesError ? (
          <View
            style={{
              paddingVertical: moderateHeightScale(20),
              alignItems: "center",
              justifyContent: "center",
              width: SCREEN_WIDTH,
              gap: moderateHeightScale(12),
            }}
          >
            <Text
              style={{
                fontSize: fontSize.size14,
                fontFamily: fonts.fontRegular,
                color: theme.lightGreen,
                textAlign: "center",
              }}
            >
              Failed to load businesses
            </Text>
            <RetryButton
              onPress={() => {
                if (selectedCategory) {
                  const trimmedSearch = searchText?.trim() || "";
                  fetchBusinesses(selectedCategory, trimmedSearch || undefined);
                }
              }}
              loading={businessesLoading}
            />
          </View>
        ) : verifiedSalons.length > 0 ? (
          verifiedSalons.map((salon, index) => (
            <View key={salon.id} style={[styles.verifiedSalonCardNew]}>
              <Image
                source={{
                  uri: salon.image ?? "",
                }}
                style={styles.verifiedSalonImage}
                resizeMode="cover"
              />

              <View style={styles.verifiedSalonContent}>
                <View style={styles.platformVerifiedBadge}>
                  <PlatformVerifiedStarIcon
                    width={widthScale(10)}
                    height={heightScale(10)}
                  />
                  <Text style={styles.platformVerifiedText}>
                    Platform verified
                  </Text>
                </View>
                <View style={{ gap: moderateHeightScale(6) }}>
                  <Text
                    numberOfLines={1}
                    style={styles.verifiedSalonBusinessName}
                  >
                    {salon.businessName}
                  </Text>
                  <Text numberOfLines={1} style={styles.verifiedSalonAddress}>
                    {salon.address}
                  </Text>
                </View>
                <View style={styles.verifiedSalonBottomRow}>
                  <View style={styles.verifiedSalonRatingButton}>
                    <StarIconSmall
                      width={widthScale(12)}
                      height={heightScale(12)}
                      color={theme.orangeBrown}
                    />
                    <Text style={styles.verifiedSalonRatingText}>
                      {salon.rating || 0}/ {salon.reviewCount || 0} reviews
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.verifiedSalonViewDetail}
                    onPress={() => {
                      router.push({
                        pathname: "/(main)/businessDetail",
                        params: { business_id: salon.id.toString() },
                      } as any);
                    }}
                  >
                    <Text style={styles.verifiedSalonViewDetailText}>
                      View detail
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))
        ) : (
          <View
            style={{
              paddingVertical: moderateHeightScale(20),
              alignItems: "center",
              justifyContent: "center",
              width: SCREEN_WIDTH,
            }}
          >
            <Text
              style={{
                fontSize: fontSize.size14,
                fontFamily: fonts.fontMedium,
                color: theme.lightGreen,
                textAlign: "center",
              }}
            >
              No businesses found
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Booking appointment card - only show if error or has appointments */}
      {userRole === "customer" &&
        (appointmentsError || appointments.length > 0) && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={[styles.appCard]}
            contentContainerStyle={styles.appointmentsScroll}
            nestedScrollEnabled={true}
          >
            {appointmentsError ? (
              <View
                style={{
                  paddingVertical: moderateHeightScale(20),
                  alignItems: "center",
                  justifyContent: "center",
                  width: SCREEN_WIDTH,
                  gap: moderateHeightScale(12),
                }}
              >
                <Text
                  style={{
                    fontSize: fontSize.size14,
                    fontFamily: fonts.fontRegular,
                    color: theme.lightGreen,
                    textAlign: "center",
                  }}
                >
                  Failed to load upcoming appointments
                </Text>
                <RetryButton
                  onPress={fetchAppointments}
                  loading={appointmentsLoading}
                />
              </View>
            ) : (
              appointments.map((appointment, index) => (
                <View key={appointment.id} style={[styles.verifiedSalonCard]}>
                  <View style={styles.verifiedCardTopRow}>
                    <View style={styles.verifiedBadge}>
                      <Text style={styles.verifiedBadgeText}>
                        {appointment.badgeText}
                      </Text>
                    </View>
                    <View style={styles.dateTimeBadge}>
                      <Text style={styles.dateTimeBadgeText}>
                        {appointment.dateTime}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.verifiedCardContent}>
                    <Image
                      source={{
                        uri: appointment.staffImage,
                      }}
                      style={styles.verifiedCardImage}
                      resizeMode="cover"
                    />
                    <View style={styles.verifiedCardTextContainer}>
                      <Text numberOfLines={1} style={styles.salonName}>
                        {appointment.services}
                      </Text>
                      <View style={styles.verifiedCardInfoRow}>
                        <MonitorIcon
                          width={widthScale(16)}
                          height={heightScale(16)}
                          color={theme.white80}
                        />
                        <Text style={styles.verifiedCardInfoText}>
                          {appointment.membershipInfo}
                        </Text>
                      </View>
                      <View style={styles.verifiedCardInfoRow2}>
                        <View
                          style={[styles.verifiedCardInfoRow, { width: "58%" }]}
                        >
                          <PersonIcon
                            width={widthScale(16)}
                            height={heightScale(16)}
                            color={theme.white80}
                          />
                          <Text
                            numberOfLines={1}
                            style={styles.verifiedCardInfoText}
                          >
                            {appointment.staffName}
                          </Text>
                        </View>

                        <TouchableOpacity
                          style={styles.viewDetailLink}
                          onPress={() => {
                            router.push({
                              pathname: "/(main)/bookingDetailsById",
                              params: {
                                bookingId: appointment.id,
                              },
                            });
                          }}
                        >
                          <Text style={styles.viewDetailText}>View detail</Text>
                          <ChevronRight
                            width={widthScale(4)}
                            height={heightScale(8)}
                            color={theme.orangeBrown}
                          />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                </View>
              ))
            )}
          </ScrollView>
        )}

      {/* Service Filters (for Individual Services) */}
      {tab === "individual" &&
        serviceFilters.length > 0 &&
        renderFilters(
          serviceFilters,
          selectedServiceFilter,
          setSelectedServiceFilter
        )}

      {/* Membership Filters (for Subscriptions) */}
      {tab === "subscriptions" &&
        renderFilters(
          membershipFilters,
          selectedMembershipFilter,
          setSelectedMembershipFilter
        )}

      {/* Sections */}
      <Text style={styles.sectionTitle}>Nearest to you</Text>
      {sectionsLoading ? (
        <View
          style={{
            paddingVertical: moderateHeightScale(40),
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : sectionsError ? (
        <View
          style={{
            paddingVertical: moderateHeightScale(40),
            alignItems: "center",
            justifyContent: "center",
            gap: moderateHeightScale(12),
          }}
        >
          <Text
            style={{
              fontSize: fontSize.size14,
              fontFamily: fonts.fontRegular,
              color: theme.lightGreen,
              textAlign: "center",
            }}
          >
            Failed to load data
          </Text>
          <RetryButton
            onPress={() => {
              if (selectedCategory) {
                const trimmedSearch = searchText?.trim() || "";
                const serviceTemplateId =
                  tab === "individual" &&
                  selectedServiceFilter !== "all" &&
                  selectedServiceFilter !== "services"
                    ? parseInt(selectedServiceFilter)
                    : undefined;
                fetchBusinessesWithData(
                  selectedCategory,
                  tab,
                  serviceTemplateId,
                  trimmedSearch || undefined
                );
              }
            }}
            loading={sectionsLoading}
          />
        </View>
      ) : (tab === "individual" ? serviceSections : subscriptionSections)
          .length > 0 ? (
        (tab === "individual" ? serviceSections : subscriptionSections).map(
          (section, sectionIndex) => {
            const itemsCount =
              tab === "individual"
                ? section.services?.length || 0
                : section.subscriptions?.length || 0;
            const showViewMore = itemsCount >= 10;

            return (
              <View key={section.id} style={styles.sectionContainer}>
                {/* Section Header */}
                <View
                  style={[
                    styles.sectionHeader,
                    {
                      marginTop:
                        sectionIndex === 0
                          ? moderateHeightScale(16)
                          : moderateHeightScale(24),
                      marginBottom: moderateHeightScale(10),
                    },
                  ]}
                >
                  <Text
                    onPress={() => {
                      router.push({
                        pathname: "/(main)/businessDetail",
                        params: { business_id: section.id.toString() },
                      } as any);
                    }}
                    style={styles.sectionSubTitle}
                  >
                    {section.businessName}
                  </Text>
                  {showViewMore && (
                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={() => {
                        router.push({
                          pathname: "/(main)/businessDetail",
                          params: { business_id: section.id.toString() },
                        } as any);
                      }}
                      // onPress={() => {
                      //   router.push({
                      //     pathname: "/(main)/dashboard/(home)/businessList",
                      //     params: {
                      //       data: JSON.stringify({
                      //         businessName: section.businessName,
                      //         type: section.type,
                      //         services: section.services,
                      //         subscriptions: section.subscriptions,
                      //       }),
                      //     },
                      //   });
                      // }}
                    >
                      <Text style={styles.sectionViewMore}>View more</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {/* Services or Subscriptions */}
                {tab === "individual" && section.services ? (
                  <ScrollView
                    horizontal
                    nestedScrollEnabled
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.servicesScroll}
                  >
                    {section.services.map((service, index) => (
                      <View
                        key={service.id}
                        style={[styles.serviceCard, styles.shadow]}
                      >
                        <View
                          style={{
                            flexDirection: "row",
                            justifyContent: "space-between",
                            paddingHorizontal: moderateWidthScale(12),
                          }}
                        >
                          <View
                            style={{
                              gap: moderateHeightScale(8),
                              width: "70%",
                            }}
                          >
                            <Text style={styles.serviceTitle}>
                              {service.title}
                            </Text>
                            <Text
                              numberOfLines={2}
                              style={styles.serviceDescription}
                            >
                              {service.description}
                            </Text>
                          </View>
                          <View style={styles.servicePrice}>
                            <Text style={styles.priceCurrent}>
                              ${service.price}
                            </Text>
                            <Text style={styles.priceOriginal}>
                              ${service.originalPrice}
                            </Text>
                          </View>
                        </View>

                        <View style={styles.line} />
                        <View style={styles.serviceBottomRow}>
                          <Text
                            numberOfLines={1}
                            style={styles.serviceDuration}
                          >
                            {service.duration}
                          </Text>
                          <TouchableOpacity
                            activeOpacity={0.7}
                            onPress={() => {}}
                            style={styles.serviceButtonContainer}
                          >
                            <Button
                              title="Book Now"
                              onPress={() => {
                                router.push({
                                  pathname: "/(main)/bookingNow",
                                  params: {
                                    business_id: section.id.toString(),
                                    service_id: service.id.toString(),
                                  },
                                });
                              }}
                              containerStyle={styles.button}
                              textStyle={styles.buttonText}
                            />
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))}
                  </ScrollView>
                ) : (
                  section.subscriptions && (
                    <ScrollView
                      horizontal
                      nestedScrollEnabled
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.servicesScroll}
                    >
                      {section.subscriptions.map((subscription, index) => (
                        <View
                          key={subscription.id}
                          style={[styles.subscriptionCard, styles.shadow]}
                        >
                          <View
                            style={{
                              paddingHorizontal: moderateWidthScale(16),
                              paddingTop: moderateHeightScale(16),
                              flex: 1,
                              justifyContent: "space-between",
                            }}
                          >
                            <View style={styles.offerBadgesContainer}>
                              {subscription.offer && (
                                <View
                                  style={[
                                    styles.offerBadge,
                                    styles.offerBadgeOrange,
                                  ]}
                                >
                                  <Text style={styles.offerText}>
                                    {subscription.offer}
                                  </Text>
                                </View>
                              )}
                              {subscription.offer2 && (
                                <View
                                  style={[
                                    styles.offerBadge,
                                    styles.offerBadgeGreen,
                                  ]}
                                >
                                  <Text
                                    style={[
                                      styles.offerText,
                                      { color: theme.darkGreen },
                                    ]}
                                  >
                                    {subscription.offer2}
                                  </Text>
                                </View>
                              )}
                            </View>
                            <View>
                              <Text
                                numberOfLines={1}
                                style={styles.subscriptionTitle}
                              >
                                {subscription.title}
                              </Text>
                              {subscription.inclusions.length > 2 ? (
                                <>
                                  {subscription.inclusions
                                    .slice(0, 2)
                                    .map((inclusion, index) => (
                                      <Text
                                        numberOfLines={1}
                                        key={index}
                                        style={styles.inclusionItem}
                                      >
                                        {inclusion}
                                      </Text>
                                    ))}
                                  <TouchableOpacity
                                    onPress={() => {
                                      setSelectedInclusions(
                                        subscription.inclusions
                                      );
                                      setInclusionsModalVisible(true);
                                    }}
                                  >
                                    <Text style={styles.moreText}>
                                      and +{subscription.inclusions.length - 2}{" "}
                                      more
                                    </Text>
                                  </TouchableOpacity>
                                </>
                              ) : (
                                subscription.inclusions.map(
                                  (inclusion, index) => (
                                    <Text
                                      numberOfLines={1}
                                      key={index}
                                      style={styles.inclusionItem}
                                    >
                                      {inclusion}
                                    </Text>
                                  )
                                )
                              )}
                            </View>
                            <View style={styles.line} />
                            <View style={styles.subscriptionPrice}>
                              <View style={styles.subscriptionPriceContainer}>
                                <Text style={styles.priceCurrent}>
                                  ${subscription.price}
                                </Text>
                                {subscription.originalPrice && (
                                  <Text style={styles.priceOriginal}>
                                    ${subscription.originalPrice}
                                  </Text>
                                )}
                              </View>
                              <View style={styles.subscriptionButtonContainer}>
                                <Button
                                  title="Book Now"
                                  onPress={() => {
                                    console.log("subscription: ", subscription);
                                    router.push({
                                      pathname:
                                        "/(main)/bookingNow/checkoutSubscription",
                                      params: {
                                        subscriptionId:
                                          subscription.id.toString(),
                                        businessId: section.id.toString(),
                                        screenName: "DashboardContent",
                                      },
                                    });
                                  }}
                                  containerStyle={styles.button}
                                  textStyle={styles.buttonText}
                                />
                              </View>
                            </View>
                          </View>
                        </View>
                      ))}
                    </ScrollView>
                  )
                )}
              </View>
            );
          }
        )
      ) : (
        <View
          style={{
            paddingVertical: moderateHeightScale(40),
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text
            style={{
              fontSize: fontSize.size14,
              fontFamily: fonts.fontRegular,
              color: theme.lightGreen,
              textAlign: "center",
            }}
          >
            No businesses found
          </Text>
        </View>
      )}
    </ScrollView>
  );

  return (
    <View style={styles.container}>
      {/* Fixed Segmented Control */}
      <View
        ref={tabsContainerRef}
        style={styles.tabsContainer}
        onLayout={(event) => {
          const { height } = event.nativeEvent.layout;
          if (height > 0) {
            tabsContainerHeight.current = height;
          }
        }}
      >
        <View style={styles.segmentedControl}>
          <TouchableOpacity
            style={[
              styles.segment,
              activeTab === "subscriptions"
                ? styles.segmentActive
                : styles.segmentInactive,
            ]}
            onPress={() => handleTabPress("subscriptions")}
          >
            <Text
              style={[
                styles.segmentText,
                activeTab === "subscriptions"
                  ? styles.segmentTextActive
                  : styles.segmentTextInactive,
              ]}
            >
              Subscriptions list
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.segment,
              activeTab === "individual"
                ? styles.segmentActive
                : styles.segmentInactive,
            ]}
            onPress={() => handleTabPress("individual")}
          >
            <Text
              style={[
                styles.segmentText,
                activeTab === "individual"
                  ? styles.segmentTextActive
                  : styles.segmentTextInactive,
              ]}
            >
              Individual services
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Sticky Category Tabs - Fixed at top when scrolled (Image 2 design) */}
      <Animated.View
        style={[
          styles.categoryTabsSticky,
          {
            top: tabsContainerHeight.current,
            opacity: stickyTabsOpacity,
            transform: [{ translateY: stickyTabsTranslateY }],
          },
        ]}
        pointerEvents={showCategoryTabs ? "auto" : "none"}
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryTabs}
        >
          {categories.map((category) => (
            <TouchableOpacity
              key={category.id}
              style={styles.categoryTab}
              onPress={() => setSelectedCategory(category.id)}
            >
              <Text
                style={
                  selectedCategory === category.id
                    ? styles.categoryTabTextActive
                    : styles.categoryTabText
                }
              >
                {category.name}
              </Text>
              {selectedCategory === category.id && (
                <View style={styles.categoryTabUnderline} />
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </Animated.View>

      {/* Swipeable Content */}
      <GestureHandlerRootView style={styles.contentContainer}>
        <ScrollView
          ref={horizontalScrollViewRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={handleHorizontalScrollEnd}
          scrollEnabled={!isCategoryScrollingRef.current}
          style={styles.contentContainer}
          contentContainerStyle={styles.swipeableContent}
        >
          {renderTabContent("subscriptions")}
          {renderTabContent("individual")}
        </ScrollView>
      </GestureHandlerRootView>

      {/* Inclusions Modal */}
      <InclusionsModal
        visible={inclusionsModalVisible}
        onClose={() => setInclusionsModalVisible(false)}
        inclusions={selectedInclusions}
      />
    </View>
  );
}
