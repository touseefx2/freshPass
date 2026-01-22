import React, { useMemo, useCallback, useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  ScrollView,
  StatusBar,
  RefreshControl,
  AppState,
} from "react-native";
import LottieView from "lottie-react-native";
import { useTheme, useAppDispatch, useAppSelector } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import {
  moderateHeightScale,
  moderateWidthScale,
} from "@/src/theme/dimensions";
import SummaryStats from "./components/SummaryStats";
import StaffOnDuty from "./components/StaffOnDuty";
import AppointmentsSection from "./components/AppointmentsSection";
import WorkHistory from "./components/WorkHistory";
import WelcomeSection from "./components/WelcomeSection";
import DashboardHeader from "../../DashboardHeader";
import { useNotificationContext } from "@/src/contexts/NotificationContext";
import RetryButton from "@/src/components/retryButton";
import {
  setUserDetails,
  setBusinessStatus,
  UserRole,
  BusinessStatus,
} from "@/src/state/slices/userSlice";
import { ApiService, checkInternetConnection } from "@/src/services/api";
import Logger from "@/src/services/logger";
import {
  userEndpoints,
  dashboardEndpoints,
  staffEndpoints,
  appointmentsEndpoints,
  notificationsEndpoints,
} from "@/src/services/endpoints";
import { fetchUserStatus } from "@/src/state/thunks/businessThunks";
import { Appointment } from "@/src/components/appointmentDetail";
import { setUnreadCount } from "@/src/state/slices/userSlice";
import { IMAGES } from "@/src/constant/images";

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    line: {
      width: "100%",
      height: 1,
      backgroundColor: theme.borderLight,
    },
    scrollContent: {
      paddingVertical: moderateHeightScale(15),
    },
    statsContainer: {
      paddingHorizontal: moderateWidthScale(20),
    },
    appointmentsContainer: {
      paddingHorizontal: moderateWidthScale(20),
    },
    workHistoryContainer: {
      paddingHorizontal: moderateWidthScale(20),
      paddingTop: moderateHeightScale(15),
    },
    loaderContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: theme.background,
    },
    lottieLoader: {
      width: moderateWidthScale(350),
      height: moderateWidthScale(350),
    },
  });

interface DashboardStatsData {
  monthly_revenue?: number;
  appointments: {
    completed: number;
    upcoming: number;
    cancelled?: number;
  };
  rating?: {
    overall_rating: number;
  };
}

export default function HomeScreen() {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);
  const dispatch = useAppDispatch();
  const { showBanner } = useNotificationContext();
  const userRole = useAppSelector((state) => state.user.userRole) as UserRole;
  const businessStatus = useAppSelector((state) => state.user.businessStatus);
  const isLoading = useAppSelector((state) => state.user.businessStatusLoading);
  const apiError = useAppSelector((state) => state.user.businessStatusError);

  const [dashboardStats, setDashboardStats] =
    useState<DashboardStatsData | null>(null);
  const [staffData, setStaffData] = useState<any[] | null>(null);
  const [appointmentsData, setAppointmentsData] = useState<
    Appointment[] | null
  >(null);
  const [appointmentsTotalCount, setAppointmentsTotalCount] = useState(0);
  const [workHistoryData, setWorkHistoryData] = useState<Appointment[] | null>(
    null
  );
  const [workHistoryTotalCount, setWorkHistoryTotalCount] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const handleFetchUserStatus = async (): Promise<boolean> => {
    try {
      await dispatch(fetchUserStatus({ showError: true })).unwrap();
      return true;
    } catch (error: any) {
      showBanner(
        "API Failed",
        error || "Failed to fetch business status",
        "error",
        2500
      );
      return false; // Failed
    }
  };

  const handleFetchUserDetails = async () => {
    try {
      const response = await ApiService.get<{
        success: boolean;
        message: string;
        data: {
          name: string;
          email: string;
          phone: string | null;
          country_code: string | null;
          email_notifications: boolean | null;
          profile_image_url: string | null;
          business: {
            id: number;
            title: string;
          };
        };
      }>(userEndpoints.details);

      if (response.success && response.data) {
        dispatch(
          setUserDetails({
            name: response.data.name,
            email: response.data.email,
            phone: response.data.phone,
            country_code: response.data.country_code,
            email_notifications: response.data.email_notifications,
            profile_image_url: response.data.profile_image_url,
            business_id: response.data.business.id ?? "",
            business_name: response.data.business.title ?? "",
          })
        );
      }
    } catch (error: any) {}
  };

  const handleFetchUnreadCount = async () => {
    try {
      const response = await ApiService.get<{
        success: boolean;
        message: string;
        data: {
          unread_count: number;
        };
      }>(notificationsEndpoints.unreadCount);

      if (response.success && response.data) {
        dispatch(setUnreadCount(response.data.unread_count));
      }
    } catch (error: any) {
      // Silent fail - no banner or console
    }
  };

  const handleFetchDashboardStats = async () => {
    try {
      // Role-based endpoint - same endpoint but backend handles role
      const response = await ApiService.get<{
        success: boolean;
        message: string;
        data: DashboardStatsData;
      }>(dashboardEndpoints.stats());

      if (response.success && response.data) {
        setDashboardStats(response.data);
      }
    } catch (error: any) {
      showBanner(
        "API Failed",
        error?.message || "Failed to fetch dashboard stats",
        "error",
        2500
      );
    }
  };

  const handleFetchStaff = async (active?: string) => {
    // Only fetch staff for business role
    if (userRole !== "business") return;
    try {
      const response = await ApiService.get<{
        success: boolean;
        message: string;
        data: Array<{
          id: number;
          user_id: number;
          name: string;
          email: string;
          business_id: number;
          active: number;
          description: string | null;
          invitation_token: string;
          completed_appointments_count: number;
          business: {
            id: number;
            title: string;
          };
          user: {
            id: number;
            name: string;
            email: string;
            email_notifications: boolean | null;
            profile_image_url: string | null;
            working_hours: any[];
          };
          created_at: string;
          createdAt: string;
        }>;
      }>(staffEndpoints.list(active));

      if (response.success && response.data) {
        setStaffData(response.data);
      }
    } catch (error: any) {
      showBanner(
        "API Failed",
        error?.message || "Failed to fetch staff details",
        "error",
        2500
      );
    }
  };

  const handleFetchAppointments = async () => {
    try {
      // Role-based appointment fetching
      let params: {
        status?: string;
        per_page: number;
        direction: string;
        staff_id?: number;
      } = {
        status: "scheduled",
        per_page: 10,
        direction: "desc",
      };

      // For staff role, fetch appointments assigned to this staff
      if (userRole === "staff") {
        // Backend should filter by current staff user automatically
        params.status = "scheduled";
      }
      // For client role, fetch client's appointments
      else if (userRole === "customer") {
        params.status = "scheduled";
      }
      // For business, fetch all scheduled appointments
      else {
        params.status = "scheduled";
      }

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

      if (response.success && response.data) {
        setAppointmentsData(response.data.data);
        setAppointmentsTotalCount(response.data.meta.total);
      }
    } catch (error: any) {
      showBanner(
        "API Failed",
        error?.message || "Failed to fetch appointments",
        "error",
        2500
      );
    }
  };

  const handleFetchWorkHistory = async () => {
    try {
      // Role-based work history fetching
      let params: {
        status?: string;
        per_page: number;
        direction: string;
        staff_id?: number;
      } = {
        per_page: 10,
        direction: "desc",
      };

      // For staff role, fetch completed appointments
      if (userRole === "staff") {
        params.status = "without_scheduled";
      }
      // For client role, fetch past appointments
      else if (userRole === "customer") {
        params.status = "without_scheduled";
      }
      // For business, fetch without_scheduled (past appointments)
      else {
        params.status = "without_scheduled";
      }

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

      if (response.success && response.data) {
        setWorkHistoryData(response.data.data);
        setWorkHistoryTotalCount(response.data.meta.total);
      }
    } catch (error: any) {
      showBanner(
        "API Failed",
        error?.message || "Failed to fetch work history",
        "error",
        2500
      );
    }
  };

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);

    try {
      // Check internet connection first
      const hasInternet = await checkInternetConnection();

      if (!hasInternet) {
        showBanner(
          "No Internet Connection",
          "Please check your internet connection and try again.",
          "error",
          2500
        );
        setRefreshing(false);
        return;
      }

      await fetchInitialData();
    } catch (error: any) {
    } finally {
      setRefreshing(false);
    }
  }, []);

  const fetchInitialData = async () => {
    const statusSuccess = await handleFetchUserStatus();
    // Only proceed with other APIs if status fetch succeeded
    if (statusSuccess) {
      handleFetchUserDetails();
      handleFetchUnreadCount();
      handleFetchDashboardStats();
      if (userRole === "business") {
        handleFetchStaff("active");
      }
      handleFetchAppointments();
      handleFetchWorkHistory();
    }
  };

  useEffect(() => {
    if(userRole === "business" || userRole==="staff"){
    fetchInitialData();
    }

    const subscription = AppState.addEventListener(
      "change",
      async (nextAppState) => {
        if (nextAppState === "active") {
          Logger.log("app comes to foreground");
          // Refresh data when app comes to foreground
          handleFetchUserStatus();
          handleFetchUnreadCount();
        }
      }
    );

    return () => {
      subscription.remove();
    };
  }, []);

  const showLoadingState =
    (isLoading && !businessStatus && !apiError) ||
    (!businessStatus && !apiError);
  const showErrorState = apiError && !isLoading;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <DashboardHeader />
      {showLoadingState || showErrorState ? (
        <View style={styles.loaderContainer}>
          {showErrorState ? (
            <RetryButton onPress={fetchInitialData} loading={isLoading} />
          ) : (
            <LottieView
              source={IMAGES.plusLoader}
              autoPlay
              loop
              style={styles.lottieLoader}
            />
          )}
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={theme.primary}
              colors={[theme.primary]}
            />
          }
        >
          {/* Welcome Section - Only for Staff role */}
          {userRole === "staff" && <WelcomeSection />}

          {/* Summary Statistics - All roles */}
          <View style={styles.statsContainer}>
            <SummaryStats
              callApi={handleFetchDashboardStats}
              data={dashboardStats}
            />
          </View>

          {/* Staff on Duty - Only for Business role */}
          {userRole === "business" && (
            <StaffOnDuty
              data={staffData}
              callApi={() => handleFetchStaff("active")}
            />
          )}

          {/* Appointments - All roles */}
          <View style={styles.appointmentsContainer}>
            <AppointmentsSection
              data={appointmentsData}
              totalCount={appointmentsTotalCount}
              callApi={handleFetchAppointments}
            />
          </View>

          <View style={styles.line} />

          {/* Work History - All roles */}
          <View style={styles.workHistoryContainer}>
            <WorkHistory
              data={workHistoryData}
              totalCount={workHistoryTotalCount}
              callApi={handleFetchWorkHistory}
            />
          </View>
        </ScrollView>
      )}
    </View>
  );
}
