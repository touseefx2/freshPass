import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useFocusEffect, useRouter } from "expo-router";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from "react-native";
import AppImage from "@/src/components/AppImage";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useAppDispatch, useAppSelector, useTheme } from "@/src/hooks/hooks";
import { useTranslation } from "react-i18next";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  iconScale,
  moderateHeightScale,
  moderateWidthScale,
  widthScale,
} from "@/src/theme/dimensions";
import StackHeader from "@/src/components/StackHeader";
import FloatingInput from "@/src/components/floatingInput";
import CustomToggle from "@/src/components/customToggle";
import BuyBusinessPlanModal from "@/src/components/BuyBusinessPlanModal";
import UpgradeToBusinessModal from "@/src/components/UpgradeToBusinessModal";
import RemoveOwnerAsStaffModal from "@/src/components/removeOwnerAsStaffModal";
import StaffActionMenuModal from "@/src/components/staffActionMenuModal";
import { Skeleton } from "@/src/components/skeletons";
import {
  setStaffInvitationEmail,
} from "@/src/state/slices/completeProfileSlice";
import { setActionLoader, setBusinessPlansModalVisible, setBusinessPlansModalBusinessOnly, setStripeConnectModalVisible } from "@/src/state/slices/generalSlice";
import {
  canAddStaffMembers,
  canUseOwnerAsStaff,
  isSoloSubscription,
  isStripeOnboardingCompleted,
} from "@/src/state/slices/userSlice";
import { ApiService } from "@/src/services/api";
import Logger from "@/src/services/logger";
import { staffEndpoints } from "@/src/services/endpoints";
import { useNotificationContext } from "@/src/contexts/NotificationContext";
import { validateEmail } from "@/src/services/validationService";
import {
  BusinessReelsSummaryCard,
  StaffReelUsageInline,
} from "@/src/components/MonthlyReels";
import {
  fetchMonthlyReelLimits,
  findStaffReelLimit,
  formatReelsResetDate,
} from "@/src/services/monthlyReelsService";
import type { MediaLimits } from "@/src/types/media";
import {
  disableOwnerAsStaff,
  enableOwnerAsStaff,
} from "@/src/services/ownerAsStaffService";
import {
  getDefaultAvatarImage,
} from "@/src/services/remoteConfigService";

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    content: {
      flex: 1,
      paddingHorizontal: moderateWidthScale(20),
    },
    contentContainer: {
      paddingVertical: moderateHeightScale(24),
      gap: moderateHeightScale(16),
    },
    titleSec: {
      marginTop: moderateHeightScale(8),
      gap: moderateHeightScale(5),
    },
    title: {
      fontSize: fontSize.size24,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    subtitle: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
    },
    inputSection: {
      gap: moderateHeightScale(4),
    },
    inputRowContainer: {
      flexDirection: "row",
      gap: moderateWidthScale(12),
    },
    inviteButton: {
      backgroundColor: theme.orangeBrown,
      borderRadius: moderateWidthScale(8),
      paddingHorizontal: moderateWidthScale(17),
      alignItems: "center",
      justifyContent: "center",
    },
    inviteButtonDisabled: {
      backgroundColor: theme.lightGreen2,
      opacity: 0.6,
    },
    inviteButtonText: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
    },
    errorText: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.link,
      marginTop: moderateHeightScale(4),
      paddingHorizontal: moderateWidthScale(4),
    },
    memberCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(12),
    },
    memberAvatar: {
      width: widthScale(44),
      height: widthScale(44),
      borderRadius: widthScale(44) / 2,
      backgroundColor: theme.emptyProfileImage,
    },
    memberMoreButton: {
      padding: moderateWidthScale(6),
    },
    employeesHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: moderateWidthScale(10),
    },
    employeesTitle: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    addEmployeeButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(4),
      backgroundColor: theme.darkGreen,
      paddingHorizontal: moderateWidthScale(12),
      paddingVertical: moderateHeightScale(7),
      borderRadius: moderateWidthScale(999),
    },
    addEmployeeButtonText: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontBold,
      color: theme.white,
    },
    employeesHint: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
    },
    memberContent: {
      flex: 1,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    memberInfo: {
      flex: 1,
      gap: moderateHeightScale(2),
    },
    memberName: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
    },
    memberEmail: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
    },
    memberStatus: {
      fontSize: fontSize.size11,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen4,
    },
    memberStatusActive: {
      color: theme.toggleActive,
      fontFamily: fonts.fontMedium,
    },
    divider: {
      height: 1.2,
      backgroundColor: theme.borderLight,
      width: "100%",
    },
    emptyState: {
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: moderateHeightScale(20),
    },
    emptyStateText: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen4,
      textAlign: "center",
    },
    continueButtonContainer: {
      paddingHorizontal: moderateWidthScale(20),
      paddingBottom: moderateHeightScale(24),
      paddingTop: moderateHeightScale(16),
    },
    // Home-matching owner add/remove cards
    ownerSectionTitle: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      marginBottom: moderateHeightScale(12),
    },
    emptyActionCard: {
      backgroundColor: theme.white,
      borderRadius: moderateWidthScale(16),
      paddingHorizontal: moderateWidthScale(16),
      paddingVertical: moderateHeightScale(16),
      borderWidth: 1,
      borderColor: theme.borderLight,
      shadowColor: theme.shadow,
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.1,
      shadowRadius: 5,
      elevation: 3,
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
    ownerProfileCard: {
      paddingHorizontal: moderateWidthScale(16),
      paddingTop: moderateHeightScale(16),
      paddingBottom: moderateHeightScale(14),
      backgroundColor: theme.white,
      borderRadius: moderateWidthScale(18),
      borderWidth: 1,
      borderColor: theme.borderLight,
      shadowColor: theme.shadow,
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.1,
      shadowRadius: 5,
      elevation: 3,
    },
    ownerProfileRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(14),
    },
    ownerAvatarWrap: {
      position: "relative",
      width: widthScale(58),
      height: widthScale(58),
      marginBottom: moderateHeightScale(4),
    },
    ownerAvatarClip: {
      width: widthScale(58),
      height: widthScale(58),
      borderRadius: widthScale(58) / 2,
      overflow: "hidden",
    },
    ownerAvatar: {
      width: widthScale(58),
      height: widthScale(58),
      borderRadius: widthScale(58) / 2,
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
      backgroundColor: theme.toggleActive,
    },
    ownerProfileName: {
      flex: 1,
      fontSize: fontSize.size17,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      textTransform: "capitalize",
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
  });

function getImageUri(profileImage: string | null | undefined) {
  if (!profileImage) {
    return getDefaultAvatarImage();
  }
  if (
    profileImage.startsWith("http://") ||
    profileImage.startsWith("https://")
  ) {
    return profileImage;
  }
  return process.env.EXPO_PUBLIC_API_BASE_URL + profileImage;
}

/** Row from GET /api/staff (same list the home "Staff on duty" section uses). */
interface TeamMember {
  id: number;
  user_id: number;
  name: string;
  email: string | null;
  active: number;
  description: string | null;
  invitation_token?: string | null;
  invitation_status?: string;
  completed_appointments_count: number;
  monthly_reel_limit?: number | null;
  is_owner?: boolean;
  is_business_owner?: boolean;
  user?: {
    profile_image_url: string | null;
    working_hours?: any[];
  } | null;
}

export default function ManageTeamScreen() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { colors } = useTheme();
  const { t } = useTranslation();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);
  const { showBanner } = useNotificationContext();

  const { staffInvitationEmail } = useAppSelector(
    (state) => state.completeProfile,
  );
  const userId = useAppSelector((state) => state.user.id);
  const userName = useAppSelector((state) => state.user.name);
  const userProfileImage = useAppSelector(
    (state) => state.user.profile_image_url,
  );
  const businessStatus = useAppSelector((state) => state.user.businessStatus);
  const canAddStaff = canAddStaffMembers(businessStatus);
  const isSoloPlan = isSoloSubscription(businessStatus);
  const showOwnerCta = canUseOwnerAsStaff(businessStatus);
  const ownerEnabled = businessStatus?.owner_as_staff?.enabled === true;

  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [reelLimits, setReelLimits] = useState<MediaLimits | null>(null);
  const [loading, setLoading] = useState(true);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [buyPlanModalVisible, setBuyPlanModalVisible] = useState(false);
  const [upgradeModalVisible, setUpgradeModalVisible] = useState(false);
  const [ownerBusy, setOwnerBusy] = useState(false);
  const [removeModalVisible, setRemoveModalVisible] = useState(false);
  const [actionMenuMember, setActionMenuMember] = useState<TeamMember | null>(
    null,
  );

  const canInvite = useMemo(() => {
    if (!staffInvitationEmail.trim()) {
      return false;
    }
    const validation = validateEmail(staffInvitationEmail.trim());
    return validation.isValid;
  }, [staffInvitationEmail]);

  useEffect(() => {
    if (staffInvitationEmail.length > 0) {
      const validation = validateEmail(staffInvitationEmail);
      setEmailError(validation.error);
    } else {
      setEmailError(null);
    }
  }, [staffInvitationEmail]);

  const fetchTeam = async () => {
    setLoading(true);

    // Reel limits are extra info — never let them block the team list
    fetchMonthlyReelLimits()
      .then(setReelLimits)
      .catch((error) => {
        Logger.error("Failed to load monthly reel limits:", error);
      });

    try {
      const response = await ApiService.get<{
        success: boolean;
        message: string;
        data: TeamMember[];
      }>(staffEndpoints.list());

      if (response.success && Array.isArray(response.data)) {
        // Active members first, same as the home screen
        setTeamMembers(
          [...response.data].sort(
            (a, b) => Number(b.active === 1) - Number(a.active === 1),
          ),
        );
      } else {
        setTeamMembers([]);
      }
    } catch (error: any) {
      Logger.error("Failed to fetch team:", error);
      showBanner(
        t("error"),
        error?.message || t("failedToFetchTeam"),
        "error",
        3000,
      );
      setTeamMembers([]);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchTeam();
      return () => {
        dispatch(setStaffInvitationEmail(""));
        setEmailError(null);
      };
    }, [dispatch]),
  );

  const handleClearEmail = () => {
    dispatch(setStaffInvitationEmail(""));
    setEmailError(null);
  };

  const handleInvite = async () => {
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

    if (!staffInvitationEmail.trim()) {
      return;
    }

    const email = staffInvitationEmail.trim();

    dispatch(setActionLoader(true));

    try {
      const response = await ApiService.post<{
        success: boolean;
        message: string;
      }>(staffEndpoints.invite, {
        email: email,
      });

      if (response.success) {
        fetchTeam();
        dispatch(setStaffInvitationEmail(""));

        showBanner(
          t("success"),
          response.message || t("staffInvitationSentSuccess"),
          "success",
          3000,
        );
      } else {
        showBanner(
          t("error"),
          response.message || t("failedToSendInvitation"),
          "error",
          3000,
        );
      }
    } catch (error: any) {
      Logger.error("Failed to send invitation:", error);
      showBanner(
        t("error"),
        error?.message || t("failedToSendInvitationTryAgain"),
        "error",
        3000,
      );
    } finally {
      dispatch(setActionLoader(false));
    }
  };

  const runOwnerEnable = async () => {
    setOwnerBusy(true);
    dispatch(setActionLoader(true));
    try {
      const response = await enableOwnerAsStaff();
      if (response.success) {
        showBanner(
          t("success"),
          response.message || t("ownerAddedAsStaffSuccess"),
          "success",
          2500,
        );
        await fetchTeam();
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
      dispatch(setActionLoader(false));
    }
  };

  const runOwnerDisable = async () => {
    setOwnerBusy(true);
    dispatch(setActionLoader(true));
    try {
      const response = await disableOwnerAsStaff();
      if (response.success) {
        setRemoveModalVisible(false);
        showBanner(
          t("success"),
          response.message || t("ownerRemovedAsStaffSuccess"),
          "success",
          2500,
        );
        await fetchTeam();
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
      dispatch(setActionLoader(false));
    }
  };

  const handleOwnerEnablePress = () => {
    if (ownerBusy) return;

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

  const handleOpenMember = (member: TeamMember) => {
    router.push({
      pathname: "/(main)/staffDetail",
      params: { id: String(member.id) },
    });
  };

  const handleEditMember = () => {
    if (!actionMenuMember) return;
    const member = actionMenuMember;
    setActionMenuMember(null);

    const profileImage = member.user?.profile_image_url;
    router.push({
      pathname: "/(main)/addStaff",
      params: {
        id: String(member.id),
        name: member.name || "",
        email: member.email || "",
        description: member.description || "",
        profile_image_url: profileImage ? getImageUri(profileImage) : "",
        active: member.active ? "1" : "0",
        working_hours: JSON.stringify(member.user?.working_hours ?? []),
        is_owner: "0",
        monthly_reel_limit:
          member.monthly_reel_limit != null
            ? String(member.monthly_reel_limit)
            : "",
        ...(member.invitation_token
          ? { invitation_token: member.invitation_token }
          : {}),
      },
    });
  };

  const handleDeleteMember = () => {
    if (!actionMenuMember) return;
    const { id: staffId, name: staffName } = actionMenuMember;
    setActionMenuMember(null);

    // Let the action sheet dismiss before presenting the system alert
    setTimeout(() => {
      Alert.alert(
        t("deleteStaff") || "Delete staff",
        t("deleteStaffConfirm") ||
          `Are you sure you want to delete "${staffName}"?`,
        [
          { text: t("cancel"), style: "cancel" },
          {
            text: t("delete"),
            style: "destructive",
            onPress: async () => {
              dispatch(setActionLoader(true));
              try {
                await ApiService.delete(staffEndpoints.delete(staffId));
                showBanner(
                  t("success"),
                  t("staffDeletedSuccess") || "Staff deleted successfully",
                  "success",
                  3000,
                );
                await fetchTeam();
              } catch (error: any) {
                Logger.error("deleteStaff from team failed:", error);
                showBanner(
                  t("error"),
                  error?.data?.message || error?.message || t("error"),
                  "error",
                  3000,
                );
              } finally {
                dispatch(setActionLoader(false));
              }
            },
          },
        ],
      );
    }, 250);
  };

  const getMemberStatus = (member: TeamMember) => {
    if (member.invitation_token && member.invitation_status !== "accepted") {
      return { label: t("invitationSent"), active: false };
    }
    return member.active === 1
      ? { label: t("active"), active: true }
      : { label: t("inactive"), active: false };
  };

  const isOwnerMember = (member: TeamMember) =>
    member.is_owner === true ||
    member.is_business_owner === true ||
    (ownerEnabled && userId != null && member.user_id === userId);

  const ownerMember =
    teamMembers.find((member) => isOwnerMember(member)) ?? null;
  const employees = teamMembers.filter((member) => !isOwnerMember(member));
  const ownerName = ownerMember?.name || userName || "";
  const ownerImageUri = getImageUri(userProfileImage);

  return (
    <SafeAreaView edges={["bottom"]} style={styles.container}>
      <StackHeader title={t("manageTeamTitle")} />
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {loading && teamMembers.length === 0 ? (
          <Skeleton screenType="Team" styles={styles} />
        ) : (
          <>
            <View style={styles.titleSec}>
              <Text style={styles.title}>{t("addStaffMembers")}</Text>
              <Text style={styles.subtitle}>{t("inviteStaffSubtitle")}</Text>
            </View>

            {showOwnerCta && !ownerEnabled ? (
              <View style={styles.emptyActionCard}>
                <View style={styles.emptyActionHeader}>
                  <Feather
                    name="user"
                    size={iconScale(22)}
                    color={theme.selectCard}
                  />
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
            ) : null}

            {showOwnerCta && ownerEnabled ? (
              <View>
                <Text style={styles.ownerSectionTitle}>
                  {t("myBookingProfile")}
                </Text>
                <View style={styles.ownerProfileCard}>
                  <View style={styles.ownerProfileRow}>
                    <View style={styles.ownerAvatarWrap}>
                      <View style={styles.ownerAvatarClip}>
                        <AppImage
                          uri={ownerImageUri}
                          style={styles.ownerAvatar}
                        />
                      </View>
                      <View style={styles.ownerStatusDot} />
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
                      <Text style={styles.acceptTitle}>
                        {t("acceptAppointments")}
                      </Text>
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
              </View>
            ) : null}

            <View style={styles.inputSection}>
              <View style={styles.inputRowContainer}>
                <FloatingInput
                  label={t("email")}
                  value={staffInvitationEmail}
                  onChangeText={(value) =>
                    dispatch(setStaffInvitationEmail(value))
                  }
                  placeholder={t("enterEmail")}
                  placeholderTextColor={theme.lightGreen2}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  onClear={handleClearEmail}
                  containerStyle={{ flex: 1 }}
                />
                <TouchableOpacity
                  onPress={handleInvite}
                  disabled={!canInvite}
                  style={[
                    styles.inviteButton,
                    !canInvite && styles.inviteButtonDisabled,
                  ]}
                  activeOpacity={canInvite ? 0.7 : 1}
                >
                  <Text style={styles.inviteButtonText}>{t("invite")}</Text>
                </TouchableOpacity>
              </View>
              {emailError && <Text style={styles.errorText}>{emailError}</Text>}
            </View>

            <View style={styles.employeesHeader}>
              <Text style={styles.employeesTitle}>{t("employees")}</Text>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={handleAddStaffPress}
                style={styles.addEmployeeButton}
                accessibilityLabel={t("addEmployee")}
              >
                <Feather name="plus" size={iconScale(14)} color={theme.white} />
                <Text style={styles.addEmployeeButtonText}>
                  {t("addEmployee")}
                </Text>
              </TouchableOpacity>
            </View>

            {employees.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>
                  {t("noTeamMemberYet")}
                </Text>
              </View>
            ) : (
              <>
                {reelLimits?.staff_reel_limits ? (
                  <BusinessReelsSummaryCard
                    limits={reelLimits}
                    resetLabel={formatReelsResetDate(
                      reelLimits.monthly_reels_reset_on,
                    )}
                  />
                ) : null}
                <Text style={styles.employeesHint}>
                  {t("manageTeamMemberHint")}
                </Text>
                {employees.map((member) => {
                  const reelRow = findStaffReelLimit(reelLimits, member.id);
                  const status = getMemberStatus(member);
                  return (
                    <React.Fragment key={member.id}>
                      <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={() => handleOpenMember(member)}
                        onLongPress={() => setActionMenuMember(member)}
                        style={styles.memberCard}
                        accessibilityRole="button"
                        accessibilityLabel={member.name || member.email || ""}
                      >
                        <AppImage
                          uri={getImageUri(member.user?.profile_image_url)}
                          style={styles.memberAvatar}
                        />
                        <View style={styles.memberContent}>
                          <View style={styles.memberInfo}>
                            <Text style={styles.memberName} numberOfLines={1}>
                              {member.name || member.email}
                            </Text>
                            {member.email ? (
                              <Text
                                style={styles.memberEmail}
                                numberOfLines={1}
                              >
                                {member.email}
                              </Text>
                            ) : null}
                            <Text
                              style={[
                                styles.memberStatus,
                                status.active && styles.memberStatusActive,
                              ]}
                            >
                              {status.label}
                            </Text>
                            {reelRow ? (
                              <StaffReelUsageInline
                                limit={reelRow.monthly_reel_limit}
                                used={reelRow.reels_used_this_month}
                              />
                            ) : null}
                          </View>
                          <TouchableOpacity
                            onPress={() => setActionMenuMember(member)}
                            style={styles.memberMoreButton}
                            hitSlop={8}
                            accessibilityLabel={t("edit")}
                          >
                            <Feather
                              name="more-vertical"
                              size={iconScale(20)}
                              color={theme.darkGreen}
                            />
                          </TouchableOpacity>
                        </View>
                      </TouchableOpacity>
                      <View style={styles.divider} />
                    </React.Fragment>
                  );
                })}
              </>
            )}
          </>
        )}
      </ScrollView>

      <BuyBusinessPlanModal
        visible={buyPlanModalVisible}
        onClose={() => setBuyPlanModalVisible(false)}
        onViewPlans={() => {
          setBuyPlanModalVisible(false);
          dispatch(setBusinessPlansModalVisible(true));
        }}
      />

      <UpgradeToBusinessModal
        visible={upgradeModalVisible}
        onClose={() => setUpgradeModalVisible(false)}
        onUpgradePlan={() => {
          setUpgradeModalVisible(false);
          dispatch(setBusinessPlansModalBusinessOnly(true));
          dispatch(setBusinessPlansModalVisible(true));
        }}
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
        visible={actionMenuMember != null}
        staffName={actionMenuMember?.name}
        imageUri={
          actionMenuMember
            ? getImageUri(actionMenuMember.user?.profile_image_url)
            : undefined
        }
        isActive={actionMenuMember?.active === 1}
        onClose={() => setActionMenuMember(null)}
        onEdit={handleEditMember}
        onDelete={handleDeleteMember}
      />
    </SafeAreaView>
  );
}
