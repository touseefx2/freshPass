import React, {
  useMemo,
  useState,
  useRef,
  useCallback,
} from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Dimensions,
} from "react-native";
import { useAppSelector, useTheme, useAppDispatch } from "@/src/hooks/hooks";
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
import { ApiService } from "@/src/services/api";
import Logger from "@/src/services/logger";
import {
  businessEndpoints,
  appointmentsEndpoints,
} from "@/src/services/endpoints";
import { useNotificationContext } from "@/src/contexts/NotificationContext";
import {
  setCategories,
  setCategoriesLoading,
  setCategoriesError,
  setSelectedCategory,
} from "@/src/state/slices/categoriesSlice";
import SearchBar from "./SearchBar";
import CategorySection from "./CategorySection";
import ShowBusiness from "./ShowBusiness";
import ShowAppointments from "./ShowAppointments";
const { width: SCREEN_WIDTH } = Dimensions.get("window");

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    contentContainer: {
      paddingTop: moderateHeightScale(18),
      paddingBottom: moderateHeightScale(40),
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
    verifiedCardImageNew: {
      width: widthScale(105),
      height: heightScale(120),
      borderRadius: moderateWidthScale(999),
      backgroundColor: theme.lightGreen2,
      borderWidth: 1,
      borderColor: theme.borderLight,
      overflow: "hidden",
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
    section: {
      marginTop: moderateHeightScale(16),
      gap: moderateHeightScale(14),
    },
    sectionTitle: {
      fontSize: fontSize.size20,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      paddingHorizontal: moderateWidthScale(20),
    },
  });


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
  const dispatch = useAppDispatch();
  const { showBanner } = useNotificationContext();
  const userRole = useAppSelector((state: any) => state.user.userRole);
  const isGuest = useAppSelector((state: any) => state.user.isGuest);
  const isCusotmerandGuest = isGuest || userRole === "customer";
  const categories = useAppSelector((state: any) => state.categories.categories);
  const selectedCategory = useAppSelector(
    (state: any) => state.categories.selectedCategory
  );
  const categoriesLoading = useAppSelector(
    (state: any) => state.categories.categoriesLoading
  );
  const categoriesError = useAppSelector(
    (state: any) => state.categories.categoriesError
  );
  const [verifiedSalons, setVerifiedSalons] = useState<VerifiedSalon[]>([]);
  const [businessesLoading, setBusinessesLoading] = useState(false);
  const [businessesError, setBusinessesError] = useState(false);
  const [appointments, setAppointments] = useState<AppointmentCard[]>([]);
  const isCategoryScrollingRef = useRef(false);


  const fetchCategories = async () => {
    try {
      dispatch(setCategoriesLoading(true));
      dispatch(setCategoriesError(false));
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
        dispatch(setCategories(mappedCategories));
      }
    } catch (error) {
      Logger.error("Failed to fetch categories:", error);
      if (categories.length <= 0) {
        dispatch(setCategoriesError(true));
      }
    } finally {
      dispatch(setCategoriesLoading(false));
    }
  };

  const fetchBusinesses = async () => {
    try {
      setBusinessesLoading(true);
      setBusinessesError(false);
      let url = businessEndpoints.businesses();

      url = `${url}?sort=completed_appointments&direction=desc`;

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

      }
    } catch (error) {
      Logger.error("Failed to fetch businesses:", error);
      verifiedSalons.length <= 0 && setBusinessesError(true);
    } finally {
      setBusinessesLoading(false);
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
        return `${subscriptionName} • ${remaining} visit${remaining !== 1 ? "s" : ""
          } left`;
      }
      return appointment.subscription || "Subscription";
    } else {
      // For service type, return service info
      if (
        Array.isArray(appointment.services) &&
        appointment.services.length > 0
      ) {
        return `${appointment.services.length} service${appointment.services.length !== 1 ? "s" : ""
          }`;
      }
      return "Service";
    }
  };

  const fetchAppointments = async () => {
    try {
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

      // Set from_date and to_date to today's date
      const today = dayjs();
      params.from_date = today.format("YYYY-MM-DD");
      params.to_date = today.format("YYYY-MM-DD");



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
            : (process.env.EXPO_PUBLIC_DEFAULT_BUSINESS_LOGO ?? "");

          const staffImageUrl = appointment.staffImage
            ? process.env.EXPO_PUBLIC_API_BASE_URL + appointment.staffImage
            : (process.env.EXPO_PUBLIC_DEFAULT_AVATAR_IMAGE ?? "");

          const dateTime = formatAppointmentDateTime(
            appointment.appointmentDate,
            appointment.appointmentTime,
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
        },
      );

      setAppointments(mappedAppointments);
    } catch (error) {
      Logger.error("Failed to fetch appointments:", error);
    }
  };

  useFocusEffect(
    useCallback(() => {
      if (userRole === "customer") {
        fetchAppointments();
      }
      if (isCusotmerandGuest) {
        fetchCategories();
        fetchBusinesses();
      }
    }, []),
  );


  return (
    <ScrollView nestedScrollEnabled style={styles.container} contentContainerStyle={styles.contentContainer}>
      <SearchBar />

      <CategorySection
        selectedCategory={selectedCategory}
        onCategorySelect={(categoryId) => dispatch(setSelectedCategory(categoryId))}
        onCategoryScrollingChange={(isScrolling) => {
          isCategoryScrollingRef.current = isScrolling;
        }}
        categories={categories}
        categoriesLoading={categoriesLoading}
        categoriesError={categoriesError}
        onRetry={fetchCategories}
      />

      {userRole === "customer" && appointments.length > 0 && (
        <View style={styles.section}>
          <ShowAppointments
            appointments={appointments}
          />
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>FreshPass Deals</Text>
        <ShowBusiness
          businessesLoading={businessesLoading}
          businessesError={businessesError}
          verifiedSalons={verifiedSalons}
          onRetry={fetchBusinesses}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recommended </Text>
        <ShowBusiness
          businessesLoading={businessesLoading}
          businessesError={businessesError}
          verifiedSalons={verifiedSalons}
          onRetry={fetchBusinesses}
        />
      </View>

    </ScrollView>
  );
}
