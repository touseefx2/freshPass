import { Tabs, useSegments } from "expo-router";
import { useTheme, useAppSelector, useAppDispatch } from "@/src/hooks/hooks";
import { useMemo, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Platform, StyleSheet, View, Text } from "react-native";
import { Theme } from "@/src/theme/colors";
import {
  HomeIcon,
  CalendarIcon,
  ChatIcon,
  NotificationIcon,
  AccountIcon,
  ExploreIcon,
} from "@/assets/icons";
import {
  moderateHeightScale,
  moderateWidthScale,
} from "@/src/theme/dimensions";
import { fontSize, fonts } from "@/src/theme/fonts";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AiChatBot from "@/src/components/AiChatBot";
import { setUserDetails } from "@/src/state/slices/userSlice";
import { ApiService } from "@/src/services/api";
import { userEndpoints } from "@/src/services/endpoints";

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    tabBar: {
      backgroundColor: theme.white,
      borderTopWidth: 1,
      borderTopColor: theme.borderLight,
      paddingTop: moderateHeightScale(8),
    },
    tabBarLabel: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontMedium,
      marginTop: moderateHeightScale(4),
    },
    iconContainer: {
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: moderateWidthScale(12),
      paddingVertical: moderateHeightScale(6),
      borderRadius: moderateWidthScale(20),
    },
    iconBackground: {
      backgroundColor: theme.lightGreen2,
    },
    badgeContainer: {
      position: "absolute",
      top: moderateHeightScale(-2),
      right: moderateWidthScale(1),
      backgroundColor: theme.red,
      borderRadius: moderateWidthScale(10),
      minWidth: moderateWidthScale(22),
      height: moderateHeightScale(18),
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: moderateWidthScale(4),
    },
    badgeText: {
      color: theme.white,
      fontSize: fontSize.size9,
      fontFamily: fonts.fontMedium,
    },
  });

export default function DashboardLayout() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => createStyles(colors as Theme), [colors]);
  const theme = colors as Theme;
  const insets = useSafeAreaInsets();
  const isButtonMode = Platform.OS === "android" && insets.bottom > 30;
  const user = useAppSelector((state) => state.user);
  const segments = useSegments() as string[];
  const unreadCount = user.unreadCount;
  const isGuest = user.isGuest;
  const userRole = user.userRole;
  const isCustomer = userRole === "customer" && !isGuest;
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (!isCustomer) return;
    const fetchUserDetails = async () => {
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
            business: { id: number; title: string };
            ai_quota?: number;
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
              business_id: response.data.business?.id ?? undefined,
              business_name: response.data.business?.title ?? undefined,
              ai_quota: response.data.ai_quota ?? 0,
            }),
          );
        }
      } catch {
        // Silent fail
      }
    };
    fetchUserDetails();
  }, [isCustomer, dispatch]);

  const isUserReviewsScreen =
    Array.isArray(segments) &&
    segments.includes("(home)") &&
    segments.includes("userReviews");
  const isStaffDetailScreen =
    Array.isArray(segments) && segments.includes("staffDetail");
  const isAiRequestsScreen =
    Array.isArray(segments) && segments.includes("aiRequests");
  const isAiResultsScreen =
    Array.isArray(segments) && segments.includes("aiResults");
  const isAppointmentDetailScreen =
    Array.isArray(segments) &&
    segments.includes("(home)") &&
    segments.includes("appointmentDetail");
  const isCalendarAppointmentDetailScreen =
    Array.isArray(segments) &&
    segments.includes("(calendar)") &&
    segments.includes("appointmentDetail");
  const isChatBoxScreen =
    Array.isArray(segments) && segments.includes("chatBox");
  const isProfileScreen =
    Array.isArray(segments) &&
    segments.includes("(account)") &&
    segments.includes("(profile)");
  const isBusinessProfileSettingsScreen =
    Array.isArray(segments) &&
    segments.includes("(account)") &&
    segments.includes("(businessProfileSettings)");
  const isNotificationSettingsScreen =
    Array.isArray(segments) &&
    segments.includes("(account)") &&
    segments.includes("notificationSettings");
  const isLanguageChangeScreen =
    Array.isArray(segments) &&
    segments.includes("(account)") &&
    segments.includes("languageChange");
  const isCountryChangeScreen =
    Array.isArray(segments) &&
    segments.includes("(account)") &&
    segments.includes("countryChange");
  const isRulesAndTermsScreen =
    Array.isArray(segments) &&
    segments.includes("(account)") &&
    segments.includes("rulesAndTerms");
  const isWorkHistoryScreen =
    Array.isArray(segments) &&
    segments.includes("(home)") &&
    segments.includes("workHistory");
  const isStaffAvailabilityScreen =
    Array.isArray(segments) &&
    segments.includes("(account)") &&
    segments.includes("staffAvailability");
  const isBusinessListScreen =
    Array.isArray(segments) &&
    segments.includes("(home)") &&
    segments.includes("businessList");
  const isBusinessDetailScreen =
    Array.isArray(segments) &&
    segments.includes("(home)") &&
    segments.includes("businessDetail");
  const isSubscriptionScreen =
    Array.isArray(segments) &&
    segments.includes("(account)") &&
    segments.includes("subscription");
  const isSubscriptionCustomerScreen =
    Array.isArray(segments) &&
    segments.includes("(account)") &&
    segments.includes("subscriptionCustomer");
  const isLocationScreen =
    Array.isArray(segments) &&
    segments.includes("(explore)") &&
    segments.includes("location");
  const isSearchScreen =
    Array.isArray(segments) &&
    segments.includes("(explore)") &&
    segments.includes("search");
  const isSearch2Screen =
    Array.isArray(segments) &&
    segments.includes("(explore)") &&
    segments.includes("search2");
  const isFavoritesScreen =
    Array.isArray(segments) &&
    segments.includes("(account)") &&
    segments.includes("favourite");
  // Check if we should hide the AI chat button and tab bar on certain screens
  const shouldHideAiChat =
    isUserReviewsScreen ||
    isStaffDetailScreen ||
    isAiRequestsScreen ||
    isAiResultsScreen ||
    isAppointmentDetailScreen ||
    isCalendarAppointmentDetailScreen ||
    isProfileScreen ||
    isRulesAndTermsScreen ||
    isNotificationSettingsScreen ||
    isLanguageChangeScreen ||
    isCountryChangeScreen ||
    isBusinessProfileSettingsScreen ||
    isChatBoxScreen ||
    isWorkHistoryScreen ||
    isStaffAvailabilityScreen ||
    isBusinessListScreen ||
    isBusinessDetailScreen ||
    isSubscriptionScreen ||
    isSubscriptionCustomerScreen ||
    isLocationScreen ||
    isSearchScreen ||
    isSearch2Screen ||
    isFavoritesScreen;

  return (
    <>
      <Tabs
        initialRouteName={"(home)"}
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: theme.buttonBack,
          tabBarInactiveTintColor: theme.lightGreen,
          tabBarStyle: [
            styles.tabBar,
            {
              height: isButtonMode
                ? moderateHeightScale(110)
                : moderateHeightScale(80),
            },
            shouldHideAiChat && { display: "none" },
          ],
          tabBarLabelStyle: styles.tabBarLabel,
          tabBarHideOnKeyboard: true,
        }}
      >
        <Tabs.Screen
          name="(home)"
          options={{
            title: t("tabHome"),
            tabBarIcon: ({ color, size, focused }) => (
              <View
                style={[styles.iconContainer, focused && styles.iconBackground]}
              >
                <HomeIcon
                  width={size}
                  height={size}
                  color={theme.darkGreen}
                  focused={focused}
                />
              </View>
            ),
          }}
        />

        <Tabs.Screen
          name="(explore)"
          options={{
            title: isCustomer ? t("tabExplore") : t("tabNotification"),
            tabBarIcon: ({ color, size, focused }) => (
              <View
                style={[styles.iconContainer, focused && styles.iconBackground]}
              >
                {isCustomer ? (
                  <ExploreIcon
                    width={size}
                    height={size}
                    color={theme.darkGreen}
                    focused={focused}
                  />
                ) : (
                  <>
                    <NotificationIcon
                      width={size}
                      height={size}
                      color={theme.darkGreen}
                      focused={focused}
                    />

                    {unreadCount > 0 && (
                      <View style={styles.badgeContainer}>
                        <Text style={styles.badgeText}>
                          {unreadCount > 9 ? "9+" : unreadCount.toString()}
                        </Text>
                      </View>
                    )}
                  </>
                )}
              </View>
            ),
          }}
        />

        <Tabs.Screen
          name="(calendar)"
          options={{
            title: isCustomer ? t("tabAppointments") : t("tabCalendar"),
            tabBarIcon: ({ color, size, focused }) => (
              <View
                style={[styles.iconContainer, focused && styles.iconBackground]}
              >
                <CalendarIcon
                  width={size}
                  height={size}
                  color={theme.darkGreen}
                  focused={focused}
                />
              </View>
            ),
          }}
        />

        <Tabs.Screen
          name="(chat)"
          options={{
            title: t("tabChat"),
            tabBarIcon: ({ color, size, focused }) => (
              <View
                style={[styles.iconContainer, focused && styles.iconBackground]}
              >
                <ChatIcon
                  width={size}
                  height={size}
                  color={theme.darkGreen}
                  focused={focused}
                />
              </View>
            ),
          }}
        />

        <Tabs.Screen
          name="(account)"
          options={{
            title: t("tabProfile"),
            tabBarIcon: ({ color, size, focused }) => (
              <View
                style={[styles.iconContainer, focused && styles.iconBackground]}
              >
                <AccountIcon
                  width={size}
                  height={size}
                  color={theme.darkGreen}
                  focused={focused}
                />
              </View>
            ),
          }}
        />
      </Tabs>
      {/* Floating AI ChatBot Button */}
      {!shouldHideAiChat && <AiChatBot />}
    </>
  );
}
