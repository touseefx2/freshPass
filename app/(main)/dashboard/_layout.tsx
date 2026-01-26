import { Tabs, useSegments } from "expo-router";
import { useTheme, useAppSelector } from "@/src/hooks/hooks";
import { useMemo } from "react";
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
  const styles = useMemo(() => createStyles(colors as Theme), [colors]);
  const theme = colors as Theme;
  const insets = useSafeAreaInsets();
  const isButtonMode = Platform.OS === "android" && insets.bottom > 30;
  const user = useAppSelector((state) => state.user);
  const segments = useSegments() as string[];
  const unreadCount = user.unreadCount;
  const isGuest = user.isGuest;
  const userRole = user.userRole;
  const isCustomer = isGuest || userRole === "customer";

  const isUserReviewsScreen =
    Array.isArray(segments) &&
    segments.includes("(home)") &&
    segments.includes("userReviews");
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
  // Check if we should hide the AI chat button on certain screens
  const shouldHideAiChat =
    isUserReviewsScreen ||
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
    isSubscriptionCustomerScreen;

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
            title: "Home",
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
            title: "Explore",
            tabBarIcon: ({ color, size, focused }) => (
              <View
                style={[styles.iconContainer, focused && styles.iconBackground]}
              >
                <ExploreIcon
                  width={size}
                  height={size}
                  color={theme.darkGreen}
                  focused={focused}
                />
                {/* {unreadCount > 0 && (
                  <View style={styles.badgeContainer}>
                    <Text style={styles.badgeText}>
                      {unreadCount > 99 ? "99+" : unreadCount.toString()}
                    </Text>
                  </View>
                )} */}
              </View>
            ),
          }}
        />

        <Tabs.Screen
          name="(calendar)"
          options={{
            title: isCustomer ? "Appointments" : "Calendar",
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
            title: "Chat",
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
            title: "Profile",
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
