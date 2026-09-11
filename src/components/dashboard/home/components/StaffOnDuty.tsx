import React, { useMemo, useEffect, useState, useCallback } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
} from "react-native";
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  type SharedValue,
} from "react-native-reanimated";
import { useRouter } from "expo-router";
import { useTheme, useAppDispatch, useAppSelector } from "@/src/hooks/hooks";
import { useTranslation } from "react-i18next";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  moderateHeightScale,
  moderateWidthScale,
  widthScale,
  heightScale,
  iconScale,
} from "@/src/theme/dimensions";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { Skeleton } from "@/src/components/skeletons";
import Button from "@/src/components/button";
import CustomToggle from "@/src/components/customToggle";
import RemoveOwnerAsStaffModal from "@/src/components/removeOwnerAsStaffModal";
import StaffActionMenuModal from "@/src/components/staffActionMenuModal";
import {
  canAddStaffMembers,
  canUseOwnerAsStaff,
  isSoloSubscription,
  isStripeOnboardingCompleted,
} from "@/src/state/slices/userSlice";
import {
  setActionLoader,
  setBusinessPlansModalVisible,
  setBusinessPlansModalBusinessOnly,
  setStripeConnectModalVisible,
} from "@/src/state/slices/generalSlice";
import BuyBusinessPlanModal from "@/src/components/BuyBusinessPlanModal";
import UpgradeToBusinessModal from "@/src/components/UpgradeToBusinessModal";
import {
  disableOwnerAsStaff,
  enableOwnerAsStaff,
} from "@/src/services/ownerAsStaffService";
import { useNotificationContext } from "@/src/contexts/NotificationContext";
import Logger from "@/src/services/logger";
import { ApiService } from "@/src/services/api";
import { staffEndpoints } from "@/src/services/endpoints";

const STAFF_CARD_WIDTH = widthScale(152);
const STAFF_CARD_GAP = moderateWidthScale(18);
const STAFF_ITEM_SIZE = STAFF_CARD_WIDTH + STAFF_CARD_GAP;
const STAFF_LIFT = moderateHeightScale(5);
const STAFF_AVATAR_SIZE = widthScale(76);
const OWNER_AVATAR_SIZE = widthScale(58);

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    outerContainer: {
      marginBottom: moderateHeightScale(18),
    },
    sectionHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: moderateWidthScale(20),
      marginBottom: moderateHeightScale(12),
      gap: moderateWidthScale(8),
    },
    sectionTitle: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    employeesHeader: {
      marginTop: moderateHeightScale(6),
    },
    addEmployeeButton: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: theme.darkGreen,
      borderRadius: moderateWidthScale(12),
      paddingHorizontal: moderateWidthScale(12),
      paddingVertical: moderateHeightScale(8),
      gap: moderateWidthScale(6),
    },
    addEmployeeButtonText: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontBold,
      color: theme.white,
    },
    ownerProfileCard: {
      marginHorizontal: moderateWidthScale(20),
      marginBottom: moderateHeightScale(16),
      paddingHorizontal: moderateWidthScale(16),
      paddingTop: moderateHeightScale(16),
      paddingBottom: moderateHeightScale(14),
      backgroundColor: theme.white,
      borderRadius: moderateWidthScale(18),
      borderWidth: 1,
      borderColor: theme.borderLight,
    },
    ownerProfileRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(14),
    },
    ownerAvatarWrap: {
      position: "relative",
      width: OWNER_AVATAR_SIZE,
      height: OWNER_AVATAR_SIZE,
      marginBottom: moderateHeightScale(4),
    },
    ownerAvatarClip: {
      width: OWNER_AVATAR_SIZE,
      height: OWNER_AVATAR_SIZE,
      borderRadius: OWNER_AVATAR_SIZE / 2,
      overflow: "hidden",
    },
    ownerAvatar: {
      width: OWNER_AVATAR_SIZE,
      height: OWNER_AVATAR_SIZE,
      borderRadius: OWNER_AVATAR_SIZE / 2,
      backgroundColor: theme.emptyProfileImage,
    },
    ownerStatusDot: {
      position: "absolute",
      bottom: moderateHeightScale(2),
      left: moderateWidthScale(2),
      width: moderateWidthScale(12),
      height: moderateWidthScale(12),
      borderRadius: moderateWidthScale(6),
      borderWidth: 2,
      borderColor: theme.white,
      zIndex: 2,
    },
    ownerProfileName: {
      flex: 1,
      fontSize: fontSize.size17,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      textTransform: "capitalize",
    },
    ownerProfileDivider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: theme.borderLight,
      marginTop: moderateHeightScale(14),
      marginBottom: moderateHeightScale(12),
    },
    acceptRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(12),
    },
    acceptCopy: {
      flex: 1,
      gap: moderateHeightScale(3),
      paddingRight: moderateWidthScale(4),
    },
    acceptTitle: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    acceptSubtitle: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
    },
    ownerBadge: {
      position: "absolute",
      bottom: -moderateHeightScale(2),
      alignSelf: "center",
      left: 0,
      right: 0,
      alignItems: "center",
      zIndex: 3,
    },
    ownerBadgePill: {
      backgroundColor: theme.selectCard,
      paddingHorizontal: moderateWidthScale(8),
      paddingVertical: moderateHeightScale(2),
      borderRadius: moderateWidthScale(999),
      borderWidth: 1.5,
      borderColor: theme.white,
    },
    ownerBadgeText: {
      fontSize: fontSize.size10,
      fontFamily: fonts.fontBold,
      color: theme.white,
      textAlign: "center",
      lineHeight: moderateHeightScale(13),
    },
    employeesEmptyBox: {
      marginHorizontal: moderateWidthScale(20),
      backgroundColor: theme.white,
      borderRadius: moderateWidthScale(14),
      paddingVertical: moderateHeightScale(16),
      paddingHorizontal: moderateWidthScale(16),
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: moderateWidthScale(8),
      borderWidth: 1,
      borderColor: theme.borderLight,
    },
    employeesEmptyText: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
    },
    emptyCardsWrap: {
      paddingHorizontal: moderateWidthScale(20),
      marginBottom: moderateHeightScale(10),
      gap: moderateHeightScale(12),
    },
    emptyActionCard: {
      backgroundColor: theme.white,
      borderRadius: moderateWidthScale(16),
      paddingHorizontal: moderateWidthScale(16),
      paddingVertical: moderateHeightScale(16),
      borderWidth: 1,
      borderColor: theme.borderLight,
    },
    emptyActionHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(12),
    },
    emptyActionCopy: {
      flex: 1,
      gap: moderateHeightScale(2),
    },
    emptyActionTitle: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    emptyActionSubtitle: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
    },
    emptyOutlineButton: {
      width: "100%",
      height: moderateHeightScale(44),
      borderRadius: moderateWidthScale(10),
      borderWidth: 1.5,
      borderColor: theme.selectCard,
      alignItems: "center",
      justifyContent: "center",
      marginTop: moderateHeightScale(14),
      backgroundColor: theme.white,
    },
    emptyOutlineButtonText: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontBold,
      color: theme.selectCard,
    },
    emptyFilledButton: {
      width: "100%",
      height: moderateHeightScale(44),
      borderRadius: moderateWidthScale(10),
      marginTop: moderateHeightScale(14),
    },
    staffList: {
      flexDirection: "row",
      gap: STAFF_CARD_GAP,
      paddingLeft: moderateWidthScale(20),
      paddingRight: moderateWidthScale(20),
      paddingTop: moderateHeightScale(4),
      paddingBottom: moderateHeightScale(16),
    },
    staffCardWrap: {
      width: STAFF_CARD_WIDTH,
    },
    staffCard: {
      width: STAFF_CARD_WIDTH,
      minHeight: heightScale(168),
      backgroundColor: theme.white,
      borderRadius: moderateWidthScale(12),
      paddingTop: moderateHeightScale(14),
      paddingBottom: moderateHeightScale(12),
      paddingHorizontal: moderateWidthScale(10),
      alignItems: "center",
      borderWidth: 1,
      borderColor: theme.borderLight,
      overflow: "hidden",
    },
    shadow: {
      shadowColor: theme.shadow,
      shadowOffset: {
        width: 0,
        height: 3,
      },
      shadowOpacity: 0.1,
      shadowRadius: 5,
      elevation: 3,
    },
    staffImageWrapper: {
      position: "relative",
      width: STAFF_AVATAR_SIZE,
      height: STAFF_AVATAR_SIZE,
      justifyContent: "center",
      alignItems: "center",
      marginBottom: moderateHeightScale(10),
    },
    staffImageClip: {
      width: STAFF_AVATAR_SIZE,
      height: STAFF_AVATAR_SIZE,
      borderRadius: STAFF_AVATAR_SIZE / 2,
      overflow: "hidden",
    },
    staffImage: {
      width: STAFF_AVATAR_SIZE,
      height: STAFF_AVATAR_SIZE,
      borderRadius: STAFF_AVATAR_SIZE / 2,
      backgroundColor: theme.emptyProfileImage,
      borderWidth: 1.5,
      borderColor: theme.borderLight,
    },
    staffStatusDot: {
      position: "absolute",
      bottom: 1,
      left: 1,
      width: moderateWidthScale(13),
      height: moderateWidthScale(13),
      borderRadius: moderateWidthScale(13) / 2,
      borderWidth: 2,
      borderColor: theme.white,
      zIndex: 2,
    },
    staffStatusDotActive: {
      backgroundColor: theme.toggleActive,
    },
    staffStatusDotInactive: {
      backgroundColor: theme.lightGreen5,
    },
    staffInfo: {
      width: "100%",
      alignItems: "center",
      gap: moderateHeightScale(2),
    },
    staffName: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      textAlign: "center",
      textTransform: "capitalize",
      width: "100%",
    },
    ownerPill: {
      position: "absolute",
      bottom: -moderateHeightScale(1),
      right: -moderateWidthScale(4),
      backgroundColor: theme.selectCard,
      paddingHorizontal: moderateWidthScale(4),
      paddingVertical: moderateHeightScale(0.5),
      borderRadius: moderateWidthScale(999),
      borderWidth: 1,
      borderColor: theme.white,
      zIndex: 3,
    },
    ownerPillText: {
      fontSize: fontSize.size8,
      fontFamily: fonts.fontBold,
      color: theme.white,
      textAlign: "center",
      lineHeight: moderateHeightScale(11),
    },
    staffExperience: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      textAlign: "center",
      width: "100%",
    },
    // Kept for Skeleton compatibility
    staffItem: {
      width: STAFF_CARD_WIDTH,
      minHeight: heightScale(168),
      backgroundColor: theme.white,
      borderRadius: moderateWidthScale(12),
      paddingTop: moderateHeightScale(14),
      paddingBottom: moderateHeightScale(12),
      paddingHorizontal: moderateWidthScale(10),
      alignItems: "center",
      marginRight: STAFF_CARD_GAP,
      borderWidth: 1,
      borderColor: theme.borderLight,
    },
    staffItemFirst: {
      marginLeft: 0,
    },
  });

export interface StaffData {
  id: number;
  user_id: number;
  name: string;
  email: string;
  business_id: number;
  active: number;
  description: string | null;
  invitation_token: string;
  invitation_status?: string;
  is_owner?: boolean;
  is_business_owner?: boolean;
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
}

interface StaffOnDutyProps {
  data: StaffData[] | null;
  callApi: () => Promise<void>;
}

function isOwnerMember(staff: StaffData) {
  return staff.is_owner === true || staff.is_business_owner === true;
}

function getImageUri(profileImage: string | null | undefined) {
  if (!profileImage) {
    return process.env.EXPO_PUBLIC_DEFAULT_AVATAR_IMAGE ?? "";
  }
  if (
    profileImage.startsWith("http://") ||
    profileImage.startsWith("https://")
  ) {
    return profileImage;
  }
  return process.env.EXPO_PUBLIC_API_BASE_URL + profileImage;
}

function getStaffImageUri(staff: StaffData) {
  return getImageUri(staff.user?.profile_image_url);
}

const STAFF_MOTION_THRESHOLD = 4;

type StaffMotionCardProps = {
  staff: StaffData;
  index: number;
  scrollX: SharedValue<number>;
  enableMotion: boolean;
  styles: ReturnType<typeof createStyles>;
  onPress: () => void;
  onLongPress: () => void;
};

function StaffMotionCard({
  staff,
  index,
  scrollX,
  enableMotion,
  styles,
  onPress,
  onLongPress,
}: StaffMotionCardProps) {
  const isActive = staff.active === 1;
  const experience = staff.description?.trim() || null;

  const motionStyle = useAnimatedStyle(() => {
    if (!enableMotion) {
      return { transform: [{ translateY: 0 }] };
    }

    const inputRange = [
      (index - 1) * STAFF_ITEM_SIZE,
      index * STAFF_ITEM_SIZE,
      (index + 1) * STAFF_ITEM_SIZE,
    ];

    const translateY = interpolate(
      scrollX.value,
      inputRange,
      [STAFF_LIFT, 0, STAFF_LIFT],
      Extrapolation.CLAMP,
    );

    return {
      transform: [{ translateY }],
    };
  }, [enableMotion, index]);

  return (
    <Animated.View style={[styles.staffCardWrap, motionStyle]}>
      <TouchableOpacity
        activeOpacity={0.7}
        style={[styles.staffCard, styles.shadow]}
        onPress={onPress}
        onLongPress={onLongPress}
        delayLongPress={350}
      >
        <View style={styles.staffImageWrapper}>
          <View style={styles.staffImageClip}>
            <Image
              source={{ uri: getStaffImageUri(staff) }}
              style={styles.staffImage}
            />
          </View>
          <View
            style={[
              styles.staffStatusDot,
              isActive
                ? styles.staffStatusDotActive
                : styles.staffStatusDotInactive,
            ]}
          />
        </View>

        <View style={styles.staffInfo}>
          <Text style={styles.staffName} numberOfLines={1}>
            {staff.name ?? ""}
          </Text>
          {experience ? (
            <Text style={styles.staffExperience} numberOfLines={2}>
              {experience}
            </Text>
          ) : (
            <Text style={styles.staffExperience} numberOfLines={1}>
              {" "}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function StaffOnDuty({ data, callApi }: StaffOnDutyProps) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { showBanner } = useNotificationContext();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);
  const user = useAppSelector((state) => state.user);
  const businessStatus = user.businessStatus;
  const canAddStaff = canAddStaffMembers(businessStatus);
  const isSoloPlan = isSoloSubscription(businessStatus);
  const showOwnerCta = canUseOwnerAsStaff(businessStatus);
  const ownerEnabled = businessStatus?.owner_as_staff?.enabled === true;
  const [buyPlanModalVisible, setBuyPlanModalVisible] = useState(false);
  const [upgradeModalVisible, setUpgradeModalVisible] = useState(false);
  const [ownerBusy, setOwnerBusy] = useState(false);
  const [removeModalVisible, setRemoveModalVisible] = useState(false);
  const [actionMenuStaff, setActionMenuStaff] = useState<StaffData | null>(
    null,
  );

  const staffScrollX = useSharedValue(0);
  const staffScrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      staffScrollX.value = event.contentOffset.x;
    },
  });

  const ownerStaff = useMemo(
    () => data?.find(isOwnerMember) ?? null,
    [data],
  );
  const employees = useMemo(
    () => (data ?? []).filter((staff) => !isOwnerMember(staff)),
    [data],
  );
  const employeeCount = employees.length;
  const enableStaffMotion = employeeCount > STAFF_MOTION_THRESHOLD;
  const isFullyEmpty = !ownerEnabled && employeeCount === 0;
  const ownerName = ownerStaff?.name || user.name || "";
  const ownerImageUri = ownerStaff
    ? getStaffImageUri(ownerStaff)
    : getImageUri(user.profile_image_url);
  const ownerIsActive = ownerStaff ? ownerStaff.active === 1 : ownerEnabled;

  useEffect(() => {
    callApi();
  }, []);

  const handleAddStaffPress = () => {
    if (!isStripeOnboardingCompleted(businessStatus)) {
      dispatch(setStripeConnectModalVisible(true));
      return;
    }
    if (isSoloPlan) {
      setUpgradeModalVisible(true);
      return;
    }
    if (!canAddStaff) {
      setBuyPlanModalVisible(true);
      return;
    }
    router.push("/(main)/addStaff");
  };

  const closeStaffActionMenu = useCallback(() => {
    setActionMenuStaff(null);
  }, []);

  const handleStaffLongPress = useCallback((staff: StaffData) => {
    setActionMenuStaff(staff);
  }, []);

  const handleEditStaff = useCallback(() => {
    if (!actionMenuStaff) return;
    const staff = actionMenuStaff;
    setActionMenuStaff(null);

    const editProfileImageUrl = staff.user?.profile_image_url
      ? staff.user.profile_image_url.startsWith("http://") ||
        staff.user.profile_image_url.startsWith("https://")
        ? staff.user.profile_image_url
        : (process.env.EXPO_PUBLIC_API_BASE_URL || "") +
          staff.user.profile_image_url
      : "";

    router.push({
      pathname: "/(main)/addStaff",
      params: {
        id: String(staff.id),
        name: staff.name || "",
        email: staff.email || "",
        description: staff.description || "",
        profile_image_url: editProfileImageUrl,
        active: staff.active ? "1" : "0",
        working_hours: JSON.stringify(staff.user?.working_hours ?? []),
        ...(staff.invitation_token
          ? { invitation_token: staff.invitation_token }
          : {}),
      },
    });
  }, [actionMenuStaff, router]);

  const confirmDeleteStaff = useCallback(() => {
    if (!actionMenuStaff) return;
    const staffId = actionMenuStaff.id;
    const staffName = actionMenuStaff.name;
    setActionMenuStaff(null);

    const runDelete = () => {
      Alert.alert(
        t("deleteStaff") || "Delete staff",
        t("deleteStaffConfirm") ||
          `Are you sure you want to delete "${staffName}"?`,
        [
          { text: t("cancel") || "Cancel", style: "cancel" },
          {
            text: t("delete") || "Delete",
            style: "destructive",
            onPress: () => {
              void (async () => {
                dispatch(setActionLoader(true));
                try {
                  await ApiService.delete<{
                    success?: boolean;
                    message?: string;
                  }>(staffEndpoints.delete(staffId));
                  showBanner(
                    t("success") || "Success",
                    t("staffDeletedSuccess") || "Staff deleted successfully",
                    "success",
                    3000,
                  );
                  await callApi();
                } catch (err: any) {
                  Logger.error("deleteStaff from home failed:", err);
                  const errorMessage =
                    err?.data?.message ||
                    err?.message ||
                    t("error") ||
                    "Something went wrong";
                  showBanner(
                    t("error") || "Error",
                    errorMessage,
                    "error",
                    3000,
                  );
                } finally {
                  dispatch(setActionLoader(false));
                }
              })();
            },
          },
        ],
      );
    };

    // Let the action sheet dismiss before presenting the system alert
    setTimeout(runDelete, 250);
  }, [actionMenuStaff, callApi, dispatch, showBanner, t]);

  const runOwnerEnable = async () => {
    setOwnerBusy(true);
    try {
      const response = await enableOwnerAsStaff();
      if (response.success) {
        showBanner(
          t("success") || "Success",
          response.message || t("ownerAddedAsStaffSuccess"),
          "success",
          2500,
        );
        await callApi();
      } else {
        showBanner(
          t("error"),
          response.message || t("ownerAsStaffFailed"),
          "error",
          3000,
        );
      }
    } catch (error: any) {
      Logger.error("enableOwnerAsStaff failed:", error);
      showBanner(
        t("error"),
        error?.message || t("ownerAsStaffFailed"),
        "error",
        3000,
      );
    } finally {
      setOwnerBusy(false);
    }
  };

  const runOwnerDisable = async () => {
    setOwnerBusy(true);
    try {
      const response = await disableOwnerAsStaff();
      if (response.success) {
        setRemoveModalVisible(false);
        showBanner(
          t("success") || "Success",
          response.message || t("ownerRemovedAsStaffSuccess"),
          "success",
          2500,
        );
        await callApi();
      } else {
        showBanner(
          t("error"),
          response.message || t("ownerAsStaffFailed"),
          "error",
          3000,
        );
      }
    } catch (error: any) {
      Logger.error("disableOwnerAsStaff failed:", error);
      showBanner(
        t("error"),
        error?.message || t("ownerAsStaffFailed"),
        "error",
        3000,
      );
    } finally {
      setOwnerBusy(false);
    }
  };

  const handleOwnerEnablePress = () => {
    if (ownerBusy) return;
    if (!isStripeOnboardingCompleted(businessStatus)) {
      dispatch(setStripeConnectModalVisible(true));
      return;
    }
    void runOwnerEnable();
  };

  const handleOwnerRemovePress = () => {
    if (ownerBusy) return;
    setRemoveModalVisible(true);
  };

  const handleOwnerToggle = (nextValue: boolean) => {
    if (nextValue) {
      handleOwnerEnablePress();
      return;
    }
    handleOwnerRemovePress();
  };

  const handleViewPlans = () => {
    setBuyPlanModalVisible(false);
    dispatch(setBusinessPlansModalVisible(true));
  };

  const handleUpgradePlan = () => {
    setUpgradeModalVisible(false);
    dispatch(setBusinessPlansModalBusinessOnly(true));
    dispatch(setBusinessPlansModalVisible(true));
  };

  const renderOwnerEnableCard = () =>
    showOwnerCta ? (
      <View style={[styles.emptyActionCard, styles.shadow]}>
        <View style={styles.emptyActionHeader}>
          <Feather name="user" size={iconScale(22)} color={theme.selectCard} />
          <View style={styles.emptyActionCopy}>
            <Text style={styles.emptyActionTitle} numberOfLines={1}>
              {t("staffEmptyOwnerTitle")}
            </Text>
            <Text style={styles.emptyActionSubtitle} numberOfLines={2}>
              {t("staffEmptyOwnerSubtitle")}
            </Text>
          </View>
        </View>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={handleOwnerEnablePress}
          disabled={ownerBusy}
          style={styles.emptyOutlineButton}
        >
          {ownerBusy ? (
            <ActivityIndicator size="small" color={theme.selectCard} />
          ) : (
            <Text style={styles.emptyOutlineButtonText}>
              {t("addMyselfAsBarber")}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    ) : null;

  const renderOwnerProfile = () => (
    <>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{t("myBookingProfile")}</Text>
      </View>
      <View style={[styles.ownerProfileCard, styles.shadow]}>
        <View style={styles.ownerProfileRow}>
          <View style={styles.ownerAvatarWrap}>
            <View style={styles.ownerAvatarClip}>
              <Image
                source={{ uri: ownerImageUri }}
                style={styles.ownerAvatar}
              />
            </View>
            <View
              style={[
                styles.ownerStatusDot,
                ownerIsActive
                  ? styles.staffStatusDotActive
                  : styles.staffStatusDotInactive,
              ]}
            />
            <View style={styles.ownerBadge}>
              <View style={styles.ownerBadgePill}>
                <Text style={styles.ownerBadgeText}>{t("owner")}</Text>
              </View>
            </View>
          </View>
          <Text style={styles.ownerProfileName} numberOfLines={1}>
            {ownerName}
          </Text>
        </View>

        <View style={styles.ownerProfileDivider} />

        <View style={styles.acceptRow}>
          <View style={styles.acceptCopy}>
            <Text style={styles.acceptTitle}>{t("acceptAppointments")}</Text>
            <Text style={styles.acceptSubtitle} numberOfLines={2}>
              {t("acceptAppointmentsSubtitle")}
            </Text>
          </View>
          {ownerBusy ? (
            <ActivityIndicator size="small" color={theme.darkGreen} />
          ) : (
            <CustomToggle
              value={ownerEnabled}
              onValueChange={handleOwnerToggle}
              activeTrackColor={theme.darkGreen}
              inactiveTrackColor={theme.lightGreen2}
            />
          )}
        </View>
      </View>
    </>
  );

  const renderEmployeesSection = () => (
    <>
      <View style={[styles.sectionHeader, styles.employeesHeader]}>
        <Text style={styles.sectionTitle}>{t("employees")}</Text>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={handleAddStaffPress}
          style={styles.addEmployeeButton}
          accessibilityLabel={t("addEmployee")}
        >
          <Feather name="plus" size={iconScale(14)} color={theme.white} />
          <Text style={styles.addEmployeeButtonText}>{t("addEmployee")}</Text>
        </TouchableOpacity>
      </View>

      {employeeCount === 0 ? (
        <View style={styles.employeesEmptyBox}>
          <Feather
            name="users"
            size={iconScale(16)}
            color={theme.lightGreen}
          />
          <Text style={styles.employeesEmptyText}>
            {t("noEmployeesAddedYet")}
          </Text>
        </View>
      ) : (
        <Animated.ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.staffList}
          onScroll={enableStaffMotion ? staffScrollHandler : undefined}
          scrollEventThrottle={enableStaffMotion ? 16 : undefined}
          snapToInterval={enableStaffMotion ? STAFF_ITEM_SIZE : undefined}
          decelerationRate={enableStaffMotion ? "fast" : "normal"}
          disableIntervalMomentum={enableStaffMotion}
        >
          {employees.map((staff, index) => (
            <StaffMotionCard
              key={staff.id}
              staff={staff}
              index={index}
              scrollX={staffScrollX}
              enableMotion={enableStaffMotion}
              styles={styles}
              onPress={() =>
                router.push({
                  pathname: "/(main)/staffDetail",
                  params: { id: String(staff.id) },
                })
              }
              onLongPress={() => handleStaffLongPress(staff)}
            />
          ))}
        </Animated.ScrollView>
      )}
    </>
  );

  return (
    <View style={styles.outerContainer}>
      {!data ? (
        <>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t("staffOnDuty")}</Text>
          </View>
          <Skeleton screenType="StaffOnDuty" styles={styles} />
        </>
      ) : isFullyEmpty ? (
        <>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t("staffOnDuty")}</Text>
          </View>
          <View style={styles.emptyCardsWrap}>
            {renderOwnerEnableCard()}
            <View style={[styles.emptyActionCard, styles.shadow]}>
              <View style={styles.emptyActionHeader}>
                <MaterialCommunityIcons
                  name="account-group"
                  size={iconScale(26)}
                  color={theme.darkGreen}
                />
                <View style={styles.emptyActionCopy}>
                  <Text style={styles.emptyActionTitle} numberOfLines={1}>
                    {t("staffEmptyTeamTitle")}
                  </Text>
                  <Text style={styles.emptyActionSubtitle} numberOfLines={2}>
                    {t("staffEmptyTeamSubtitle")}
                  </Text>
                </View>
              </View>
              <Button
                title={t("addBarber")}
                onPress={handleAddStaffPress}
                backgroundColor={theme.darkGreen}
                containerStyle={[
                  styles.emptyFilledButton,
                  { backgroundColor: theme.darkGreen },
                ]}
              />
            </View>
          </View>
        </>
      ) : (
        <>
          {showOwnerCta && ownerEnabled
            ? renderOwnerProfile()
            : showOwnerCta
              ? (
                  <View style={styles.emptyCardsWrap}>
                    {renderOwnerEnableCard()}
                  </View>
                )
              : null}
          {renderEmployeesSection()}
        </>
      )}

      <BuyBusinessPlanModal
        visible={buyPlanModalVisible}
        onClose={() => setBuyPlanModalVisible(false)}
        onViewPlans={handleViewPlans}
      />

      <UpgradeToBusinessModal
        visible={upgradeModalVisible}
        onClose={() => setUpgradeModalVisible(false)}
        onUpgradePlan={handleUpgradePlan}
      />

      <RemoveOwnerAsStaffModal
        visible={removeModalVisible}
        loading={ownerBusy}
        onClose={() => {
          if (!ownerBusy) setRemoveModalVisible(false);
        }}
        onConfirm={() => {
          void runOwnerDisable();
        }}
      />

      <StaffActionMenuModal
        visible={actionMenuStaff != null}
        staffName={actionMenuStaff?.name}
        imageUri={
          actionMenuStaff ? getStaffImageUri(actionMenuStaff) : undefined
        }
        isActive={actionMenuStaff?.active === 1}
        onClose={closeStaffActionMenu}
        onEdit={handleEditStaff}
        onDelete={confirmDeleteStaff}
      />
    </View>
  );
}
