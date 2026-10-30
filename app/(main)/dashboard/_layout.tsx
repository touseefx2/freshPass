import { Tabs, useSegments } from "expo-router";
import { useTheme, useAppSelector, useAppDispatch } from "@/src/hooks/hooks";
import { useMemo, useEffect, useState, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import { AppState, Platform, StyleSheet, View, Text } from "react-native";
import { useStore } from "react-redux";
import type { RootState } from "@/src/state/store";
import { MaterialIcons } from "@expo/vector-icons";
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
  heightScale,
  moderateHeightScale,
  moderateWidthScale,
  widthScale,
} from "@/src/theme/dimensions";
import { fontSize, fonts } from "@/src/theme/fonts";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AiChatBot from "@/src/components/AiChatBot";
import BusinessCreateMediaMenu from "@/src/components/businessCreateMediaMenu";
import { setUserDetails } from "@/src/state/slices/userSlice";
import {
  resetChatContacts,
  setModeSwitchModalVisible,
} from "@/src/state/slices/generalSlice";
import {
  syncModeFromServer,
  type ServerModeState,
} from "@/src/state/thunks/userModeThunks";
import { getUserMode } from "@/src/services/userModeService";
import { resetToDashboardHome } from "@/src/utils/navigation";
import { useNotificationContext } from "@/src/contexts/NotificationContext";
import { ApiService } from "@/src/services/api";
import Logger from "@/src/services/logger";
import { userEndpoints } from "@/src/services/endpoints";
import { getEcho } from "@/src/services/echo";
import { refreshChatInbox } from "@/src/state/thunks/chatThunks";
import { parseDateOfBirth } from "@/src/constant/functions";
import type { UserAffiliationFields } from "@/src/types/affiliation";
import {
  pickUserModeDetails,
  type UserModeDetailsFields,
} from "@/src/services/userModeService";

const CHAT_MESSAGE_SENT = ".message.sent";
/** Broadcast after every mode switch, on any of the user's devices */
const MODE_CHANGED = ".mode.changed";

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
      borderRadius: moderateWidthScale(8),
      minWidth: widthScale(16),
      height: widthScale(16),
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: moderateWidthScale(4),
      overflow: "hidden",
    },
    badgeText: {
      color: theme.white,
      fontSize: fontSize.size8,
      fontFamily: fonts.fontMedium,
      textAlign: "center",
      textAlignVertical: "center",
      includeFontPadding: false,
      lineHeight: widthScale(16),
    },
    createTabIcon: {
      width: widthScale(44),
      height: heightScale(44),
      borderRadius: moderateWidthScale(22),
      backgroundColor: theme.buttonBack,
      alignItems: "center",
      justifyContent: "center",
      marginTop: moderateHeightScale(-6),
      borderWidth: 3,
      borderTopColor: theme.white,
      borderLeftColor: theme.white,
      borderRightColor: theme.orangeBrown,
      borderBottomColor: theme.orangeBrown,
    },
  });

export default function DashboardLayout() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => createStyles(colors as Theme), [colors]);
  const theme = colors as Theme;
  const insets = useSafeAreaInsets();
  const isButtonMode = Platform.OS === "android" && insets.bottom > 30;
  const tabBarHeight = isButtonMode
    ? moderateHeightScale(110)
    : moderateHeightScale(80);
  const user = useAppSelector((state) => state.user);
  const segments = useSegments() as string[];
  const unreadCount = user.unreadCount;
  const totalUnreadChat = user.totalUnreadChat;
  const isGuest = user.isGuest;
  const userRole = user.userRole;
  const isCustomer = userRole === "customer" && !isGuest;
  const isBusiness = userRole === "business";
  // Staff get the owner's tab bar: + quick menu in the center, Profile in the header
  const hasCreateTab = isBusiness || userRole === "staff";
  const dispatch = useAppDispatch();
  const store = useStore<RootState>();
  const { showBanner } = useNotificationContext();
  const [createMenuOpen, setCreateMenuOpen] = useState(false);

  const closeCreateMenu = useCallback(() => setCreateMenuOpen(false), []);
  const toggleCreateMenu = useCallback(
    () => setCreateMenuOpen((open) => !open),
    [],
  );

  useEffect(() => {
    if (!isCustomer) return;
    fetchUserDetails();
  }, [isCustomer, dispatch]);

  // Mode switched elsewhere (another device): follow it here too
  const applyServerMode = useCallback(
    async (server: ServerModeState) => {
      const mode = await dispatch(syncModeFromServer(server)).unwrap();
      if (!mode) return;
      dispatch(setModeSwitchModalVisible(false));
      resetToDashboardHome();
      showBanner(
        mode === "customer"
          ? t("modeSwitchedCustomerTitle")
          : t("modeSwitchedBusinessTitle"),
        t("modeChangedOnAnotherDevice"),
        "info",
        3000,
      );
    },
    [dispatch, showBanner, t],
  );
  const applyServerModeRef = useRef(applyServerMode);
  applyServerModeRef.current = applyServerMode;

  // The socket can miss `.mode.changed` while backgrounded — re-check on return
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState !== "active") return;
      const { can_switch_mode, isGuest: guest, accessToken } =
        store.getState().user;
      if (!can_switch_mode || guest || !accessToken) return;
      getUserMode()
        .then((response) => {
          if (response?.success && response.data) {
            void applyServerModeRef.current({
              active_mode: response.data.active_mode,
              can_switch: response.data.can_switch,
            });
          }
        })
        .catch(() => {});
    });
    return () => subscription.remove();
  }, [store]);

  // Socket: users.{userId} for inbox updates. Only when !isGuest. Close on logout (isGuest) or unmount; keep on in background.
  useEffect(() => {
    if (isGuest || !user?.id || !user?.accessToken) {
      if (isGuest) dispatch(resetChatContacts());
      return;
    }
    const echo = getEcho(user.accessToken);
    if (!echo) {
      if (__DEV__) console.log("[InboxSocket] getEcho returned null — no socket");
      return;
    }
    const channelName = `users.${user.id}`;
    if (__DEV__) console.log("[InboxSocket] subscribe", channelName);
    const channel = echo.private(channelName);

    if (__DEV__) {
      const chAny = channel as unknown as {
        subscribed?: (cb: () => void) => void;
        error?: (cb: (err: unknown) => void) => void;
      };
      chAny.subscribed?.(() => {
        console.log("[InboxSocket] subscribed OK", channelName);
      });
      chAny.error?.((err) => {
        console.log("[InboxSocket] subscription ERROR", channelName, err);
      });
    }

    channel.listen(CHAT_MESSAGE_SENT, () => {
      dispatch(refreshChatInbox());
    });

    channel.listen(MODE_CHANGED, (payload: ServerModeState) => {
      void applyServerModeRef.current(payload ?? {});
    });

    return () => {
      channel.stopListening(CHAT_MESSAGE_SENT);
      channel.stopListening(MODE_CHANGED);
      echo.leave(channelName);
    };
  }, [isGuest, user?.id, user?.accessToken, dispatch]);

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
          date_of_birth: string | null;
        } & UserAffiliationFields &
          UserModeDetailsFields;
      }>(userEndpoints.details);

      if (response.success && response.data) {
        Logger.log("------>response.data ai_quota", response.data.ai_quota);
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
            working_with_business_id:
              response.data.working_with_business_id ?? null,
            working_with_business:
              response.data.working_with_business ?? null,
            working_with_business_request:
              response.data.working_with_business_request ?? null,
            ...pickUserModeDetails(response.data),
            dateOfBirth: response.data.date_of_birth
              ? parseDateOfBirth(response.data.date_of_birth)
              : null,
          }),
        );
      }
    } catch {
      // Silent fail
    }
  };

  const isUserReviewsScreen =
    Array.isArray(segments) &&
    segments.includes("(home)") &&
    segments.includes("userReviews");
  const isBusinessEarningsScreen =
    Array.isArray(segments) && segments.includes("businessEarnings");
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
  const isStaffWorkImagesScreen =
    Array.isArray(segments) &&
    segments.includes("(account)") &&
    segments.includes("staffWorkImages");
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
  const isFavoritesScreen =
    Array.isArray(segments) &&
    segments.includes("(home)") &&
    segments.includes("favourite");
  const isCustomersScreen =
    Array.isArray(segments) && segments.includes("customers");
  const isFollowersScreen =
    Array.isArray(segments) &&
    segments.includes("(account)") &&
    segments.includes("followers");
  const isBarberProfileScreen =
    Array.isArray(segments) &&
    segments.includes("(account)") &&
    segments.includes("barberProfile");
  const isMyAppointmentsScreen =
    Array.isArray(segments) &&
    segments.includes("(account)") &&
    segments.includes("myAppointments");
  const isAllAppointmentsScreen =
    Array.isArray(segments) &&
    segments.includes("(account)") &&
    segments.includes("allAppointments");
  // Check if we should hide the AI chat button and tab bar on certain screens
  const shouldHideAiChat =
    isUserReviewsScreen ||
    isBusinessEarningsScreen ||
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
    isStaffWorkImagesScreen ||
    isBusinessListScreen ||
    isBusinessDetailScreen ||
    isSubscriptionScreen ||
    isSubscriptionCustomerScreen ||
    isLocationScreen ||
    isSearchScreen ||
    isFavoritesScreen ||
    isCustomersScreen ||
    isFollowersScreen ||
    isBarberProfileScreen ||
    isMyAppointmentsScreen ||
    isAllAppointmentsScreen;

  useEffect(() => {
    if (shouldHideAiChat && createMenuOpen) {
      setCreateMenuOpen(false);
    }
  }, [shouldHideAiChat, createMenuOpen]);

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
              height: tabBarHeight,
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
            title:
              isCustomer || isGuest ? t("tabExplore") : t("tabNotification"),
            tabBarIcon: ({ color, size, focused }) => (
              <View
                style={[styles.iconContainer, focused && styles.iconBackground]}
              >
                {isCustomer || isGuest ? (
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
                      <View
                        style={[
                          styles.badgeContainer,
                          {
                            top: moderateHeightScale(1),
                            right: moderateWidthScale(5),
                          },
                        ]}
                      >
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
          name="(create)"
          options={{
            href: hasCreateTab ? undefined : null,
            title: "",
            tabBarLabel: () => null,
            tabBarIcon: () => (
              <View style={styles.createTabIcon}>
                <MaterialIcons
                  name={createMenuOpen ? "close" : "add"}
                  size={moderateWidthScale(28)}
                  color={theme.buttonText}
                />
              </View>
            ),
          }}
          listeners={{
            tabPress: (e) => {
              e.preventDefault();
              if (!hasCreateTab) return;
              toggleCreateMenu();
            },
          }}
        />

        <Tabs.Screen
          name="(calendar)"
          options={{
            title:
              isCustomer || isGuest ? t("tabAppointments") : t("tabCalendar"),
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
                {totalUnreadChat > 0 && (
                  <View style={styles.badgeContainer}>
                    <Text style={styles.badgeText}>
                      {totalUnreadChat > 9 ? "9+" : totalUnreadChat.toString()}
                    </Text>
                  </View>
                )}
              </View>
            ),
          }}
        />

        <Tabs.Screen
          name="(account)"
          options={{
            href: hasCreateTab ? null : undefined,
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
      {hasCreateTab && (
        <BusinessCreateMediaMenu
          visible={createMenuOpen}
          onClose={closeCreateMenu}
          tabBarHeight={tabBarHeight}
        />
      )}
      {/* Floating AI ChatBot Button */}
      {!shouldHideAiChat && <AiChatBot />}
    </>
  );
}
