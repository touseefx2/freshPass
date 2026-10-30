import React, { useCallback, useMemo, useState } from "react";
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
import { Feather, MaterialIcons } from "@expo/vector-icons";
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
import CustomToggle from "@/src/components/customToggle";
import BuyBusinessPlanModal from "@/src/components/BuyBusinessPlanModal";
import UpgradeToBusinessModal from "@/src/components/UpgradeToBusinessModal";
import RemoveOwnerAsStaffModal from "@/src/components/removeOwnerAsStaffModal";
import StaffActionMenuModal from "@/src/components/staffActionMenuModal";
import { Skeleton } from "@/src/components/skeletons";
import { setActionLoader, setBusinessPlansModalVisible, setBusinessPlansModalBusinessOnly } from "@/src/state/slices/generalSlice";
import {
  canAddStaffMembers,
  canUseOwnerAsStaff,
  isSoloSubscription,
} from "@/src/state/slices/userSlice";
import { ApiService } from "@/src/services/api";
import Logger from "@/src/services/logger";
import { staffEndpoints } from "@/src/services/endpoints";
import { useNotificationContext } from "@/src/contexts/NotificationContext";
import { BusinessReelsSummaryCard } from "@/src/components/MonthlyReels";
import {
  fetchMonthlyReelLimits,
  findStaffReelLimit,
  formatReelsResetDate,
} from "@/src/services/monthlyReelsService";
import type { MediaLimits } from "@/src/types/media";
import { RatingBadge } from "@/src/components/reviews/reviewMedia";
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
      paddingTop: moderateHeightScale(20),
      paddingBottom: moderateHeightScale(32),
      gap: moderateHeightScale(24),
    },
    titleSec: {
      gap: moderateHeightScale(6),
    },
    // Team overview (top)
    hero: {
      backgroundColor: theme.darkGreen,
      borderRadius: moderateWidthScale(20),
      paddingHorizontal: moderateWidthScale(18),
      paddingTop: moderateHeightScale(18),
      paddingBottom: moderateHeightScale(16),
      gap: moderateHeightScale(16),
    },
    heroTitle: {
      fontSize: fontSize.size20,
      fontFamily: fonts.fontBold,
      color: theme.white,
    },
    heroSubtitle: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: theme.white70,
      lineHeight: fontSize.size13 * 1.45,
      marginTop: moderateHeightScale(4),
    },
    heroStats: {
      flexDirection: "row",
      borderRadius: moderateWidthScale(14),
      backgroundColor: theme.white15,
      paddingVertical: moderateHeightScale(12),
    },
    heroStat: {
      flex: 1,
      alignItems: "center",
      gap: moderateHeightScale(2),
    },
    heroStatDivider: {
      width: StyleSheet.hairlineWidth,
      backgroundColor: theme.white50,
      marginVertical: moderateHeightScale(4),
    },
    heroStatValue: {
      fontSize: fontSize.size20,
      fontFamily: fonts.fontBold,
      color: theme.white,
      fontVariant: ["tabular-nums"],
    },
    heroStatLabel: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontMedium,
      color: theme.white70,
    },
    section: {
      gap: moderateHeightScale(12),
    },
    sectionHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: moderateWidthScale(10),
    },
    sectionTitleRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(8),
    },
    sectionTitle: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    countPill: {
      minWidth: moderateWidthScale(24),
      paddingHorizontal: moderateWidthScale(8),
      paddingVertical: moderateHeightScale(2),
      borderRadius: moderateWidthScale(999),
      backgroundColor: theme.lightGreen07,
      alignItems: "center",
    },
    countPillText: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      fontVariant: ["tabular-nums"],
    },
    addEmployeeButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(6),
      minHeight: moderateHeightScale(40),
      backgroundColor: theme.darkGreen,
      paddingHorizontal: moderateWidthScale(14),
      borderRadius: moderateWidthScale(999),
    },
    addEmployeeButtonText: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontBold,
      color: theme.white,
    },
    // Shared flat card surface
    card: {
      backgroundColor: theme.white,
      borderRadius: moderateWidthScale(16),
      borderWidth: 1,
      borderColor: theme.borderLight,
    },
    // Team list rows (memberCard/divider also used by the Team skeleton)
    memberCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(12),
      paddingVertical: moderateHeightScale(12),
      paddingLeft: moderateWidthScale(14),
      paddingRight: moderateWidthScale(2),
    },
    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: theme.lightGreen015,
    },
    rowDivider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: theme.lightGreen015,
      marginLeft: moderateWidthScale(14) + widthScale(46) + moderateWidthScale(12),
    },
    memberAvatarWrap: {
      width: widthScale(46),
      height: widthScale(46),
    },
    memberAvatar: {
      width: widthScale(46),
      height: widthScale(46),
      borderRadius: widthScale(46) / 2,
      backgroundColor: theme.emptyProfileImage,
    },
    memberInfo: {
      flex: 1,
      gap: moderateHeightScale(2),
    },
    memberNameRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(8),
    },
    memberName: {
      flexShrink: 1,
      fontSize: fontSize.size15,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      textTransform: "capitalize",
    },
    memberEmail: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
    },
    memberRating: {
      marginTop: moderateHeightScale(3),
    },
    statusChip: {
      paddingHorizontal: moderateWidthScale(7),
      paddingVertical: moderateHeightScale(1),
      borderRadius: moderateWidthScale(999),
      backgroundColor: theme.lightGreen07,
    },
    statusChipPending: {
      backgroundColor: theme.orangeBrown01,
    },
    statusChipText: {
      fontSize: fontSize.size11,
      fontFamily: fonts.fontMedium,
      color: theme.lightGreen,
    },
    statusChipTextPending: {
      color: theme.orangeBrownText,
    },
    reelLine: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(4),
      marginTop: moderateHeightScale(2),
    },
    reelLineText: {
      fontSize: fontSize.size11,
      fontFamily: fonts.fontMedium,
      color: theme.lightGreen,
    },
    memberMoreButton: {
      width: moderateWidthScale(44),
      height: moderateWidthScale(44),
      alignItems: "center",
      justifyContent: "center",
    },
    emptyState: {
      alignItems: "center",
      paddingVertical: moderateHeightScale(28),
      paddingHorizontal: moderateWidthScale(24),
      gap: moderateHeightScale(8),
    },
    emptyIcon: {
      width: moderateWidthScale(52),
      height: moderateWidthScale(52),
      borderRadius: moderateWidthScale(26),
      backgroundColor: theme.lightGreen07,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: moderateHeightScale(4),
    },
    emptyStateTitle: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      textAlign: "center",
    },
    emptyStateText: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      textAlign: "center",
      lineHeight: fontSize.size13 * 1.45,
    },
    // Owner "add myself" card
    ownerCtaCard: {
      padding: moderateWidthScale(16),
      gap: moderateHeightScale(14),
    },
    ownerCtaHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(12),
    },
    iconBadge: {
      width: moderateWidthScale(40),
      height: moderateWidthScale(40),
      borderRadius: moderateWidthScale(12),
      backgroundColor: theme.orangeBrown01,
      alignItems: "center",
      justifyContent: "center",
    },
    ownerCtaCopy: {
      flex: 1,
      gap: moderateHeightScale(2),
    },
    ownerCtaTitle: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    ownerCtaSubtitle: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
    },
    outlineButton: {
      height: moderateHeightScale(44),
      borderRadius: moderateWidthScale(12),
      borderWidth: 1.5,
      borderColor: theme.darkGreen,
      alignItems: "center",
      justifyContent: "center",
    },
    outlineButtonText: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    // Owner booking profile card
    ownerProfileRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(12),
      padding: moderateWidthScale(16),
    },
    ownerAvatarWrap: {
      width: widthScale(52),
      height: widthScale(52),
    },
    ownerAvatar: {
      width: widthScale(52),
      height: widthScale(52),
      borderRadius: widthScale(52) / 2,
      backgroundColor: theme.emptyProfileImage,
    },
    ownerInfo: {
      flex: 1,
      gap: moderateHeightScale(4),
    },
    ownerNameRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(8),
    },
    ownerProfileName: {
      flexShrink: 1,
      fontSize: fontSize.size16,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      textTransform: "capitalize",
    },
    ownerBadgePill: {
      backgroundColor: theme.orangeBrown01,
      paddingHorizontal: moderateWidthScale(8),
      paddingVertical: moderateHeightScale(2),
      borderRadius: moderateWidthScale(999),
    },
    ownerBadgeText: {
      fontSize: fontSize.size11,
      fontFamily: fonts.fontBold,
      color: theme.orangeBrownText,
    },
    ownerMeta: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
    },
    acceptRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(12),
      paddingHorizontal: moderateWidthScale(16),
      paddingVertical: moderateHeightScale(14),
      backgroundColor: theme.lightGreen05,
      borderBottomLeftRadius: moderateWidthScale(16),
      borderBottomRightRadius: moderateWidthScale(16),
    },
    acceptCopy: {
      flex: 1,
      gap: moderateHeightScale(2),
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
  /** Reviews of this member's visits */
  average_rating?: number | string | null;
  ratings_count?: number | null;
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
  const [buyPlanModalVisible, setBuyPlanModalVisible] = useState(false);
  const [upgradeModalVisible, setUpgradeModalVisible] = useState(false);
  const [ownerBusy, setOwnerBusy] = useState(false);
  const [removeModalVisible, setRemoveModalVisible] = useState(false);
  const [actionMenuMember, setActionMenuMember] = useState<TeamMember | null>(
    null,
  );

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
        setTeamMembers(response.data);
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
    }, []),
  );

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

  const getMemberStatus = (
    member: TeamMember,
  ): { label: string; tone: "active" | "pending" } => {
    if (member.invitation_token && member.invitation_status !== "accepted") {
      return { label: t("invitationSent"), tone: "pending" };
    }
    // No online/offline any more (client 10-30): joined = active
    return { label: t("active"), tone: "active" };
  };

  const isOwnerMember = (member: TeamMember) =>
    member.is_owner === true ||
    member.is_business_owner === true ||
    (ownerEnabled && userId != null && member.user_id === userId);

  const ownerMember =
    teamMembers.find((member) => isOwnerMember(member)) ?? null;
  const employees = teamMembers.filter((member) => !isOwnerMember(member));
  const ownerName = ownerMember?.name || userName || "";
  const teamStats = employees.reduce(
    (acc, member) => {
      const tone = getMemberStatus(member).tone;
      if (tone === "active") acc.active += 1;
      if (tone === "pending") acc.invited += 1;
      return acc;
    },
    { active: 0, invited: 0 },
  );
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
            <View style={styles.hero}>
              <View>
                <Text style={styles.heroTitle} accessibilityRole="header">
                  {t("manageTeamHeading")}
                </Text>
                <Text style={styles.heroSubtitle}>
                  {t("manageTeamSubtitle")}
                </Text>
              </View>
              <View style={styles.heroStats}>
                {[
                  { label: t("employees"), value: employees.length },
                  { label: t("active"), value: teamStats.active },
                  { label: t("teamStatInvited"), value: teamStats.invited },
                ].map((stat, index) => (
                  <React.Fragment key={stat.label}>
                    {index > 0 ? <View style={styles.heroStatDivider} /> : null}
                    <View
                      style={styles.heroStat}
                      accessible
                      accessibilityLabel={`${stat.value} ${stat.label}`}
                    >
                      <Text style={styles.heroStatValue}>{stat.value}</Text>
                      <Text style={styles.heroStatLabel} numberOfLines={1}>
                        {stat.label}
                      </Text>
                    </View>
                  </React.Fragment>
                ))}
              </View>
            </View>

            {showOwnerCta && !ownerEnabled ? (
              <View style={[styles.card, styles.ownerCtaCard]}>
                <View style={styles.ownerCtaHeader}>
                  <View style={styles.iconBadge}>
                    <Feather
                      name="scissors"
                      size={iconScale(18)}
                      color={theme.orangeBrownText}
                    />
                  </View>
                  <View style={styles.ownerCtaCopy}>
                    <Text style={styles.ownerCtaTitle} numberOfLines={1}>
                      {t("staffEmptyOwnerTitle")}
                    </Text>
                    <Text style={styles.ownerCtaSubtitle} numberOfLines={2}>
                      {t("staffEmptyOwnerSubtitle")}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={handleOwnerEnablePress}
                  disabled={ownerBusy}
                  style={styles.outlineButton}
                  accessibilityRole="button"
                >
                  {ownerBusy ? (
                    <ActivityIndicator size="small" color={theme.darkGreen} />
                  ) : (
                    <Text style={styles.outlineButtonText}>
                      {t("addMyselfAsBarber")}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            ) : null}

            {showOwnerCta && ownerEnabled ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle} accessibilityRole="header">
                  {t("myBookingProfile")}
                </Text>
                <View style={styles.card}>
                  <View style={styles.ownerProfileRow}>
                    <View style={styles.ownerAvatarWrap}>
                      <AppImage uri={ownerImageUri} style={styles.ownerAvatar} />
                    </View>
                    <View style={styles.ownerInfo}>
                      <View style={styles.ownerNameRow}>
                        <Text style={styles.ownerProfileName} numberOfLines={1}>
                          {ownerName}
                        </Text>
                        <View style={styles.ownerBadgePill}>
                          <Text style={styles.ownerBadgeText}>{t("owner")}</Text>
                        </View>
                      </View>
                      {ownerMember?.email ? (
                        <Text style={styles.ownerMeta} numberOfLines={1}>
                          {ownerMember.email}
                        </Text>
                      ) : null}
                    </View>
                  </View>

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

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionTitleRow}>
                  <Text style={styles.sectionTitle} accessibilityRole="header">
                    {t("employees")}
                  </Text>
                  {employees.length > 0 ? (
                    <View style={styles.countPill}>
                      <Text style={styles.countPillText}>
                        {employees.length}
                      </Text>
                    </View>
                  ) : null}
                </View>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={handleAddStaffPress}
                  style={styles.addEmployeeButton}
                  accessibilityRole="button"
                  accessibilityLabel={t("addEmployee")}
                >
                  <Feather name="plus" size={iconScale(16)} color={theme.white} />
                  <Text style={styles.addEmployeeButtonText}>
                    {t("addEmployee")}
                  </Text>
                </TouchableOpacity>
              </View>

              {employees.length === 0 ? (
                <View style={[styles.card, styles.emptyState]}>
                  <View style={styles.emptyIcon}>
                    <Feather
                      name="users"
                      size={iconScale(22)}
                      color={theme.darkGreen}
                    />
                  </View>
                  <Text style={styles.emptyStateTitle}>
                    {t("noTeamMemberYet")}
                  </Text>
                  <Text style={styles.emptyStateText}>
                    {t("noTeamMemberYetHint")}
                  </Text>
                </View>
              ) : (
                <View style={styles.card}>
                  {employees.map((member, index) => {
                    const reelRow = findStaffReelLimit(reelLimits, member.id);
                    const status = getMemberStatus(member);
                    return (
                      <React.Fragment key={member.id}>
                        {index > 0 ? <View style={styles.rowDivider} /> : null}
                        <TouchableOpacity
                          activeOpacity={0.7}
                          onPress={() => handleOpenMember(member)}
                          onLongPress={() => setActionMenuMember(member)}
                          style={styles.memberCard}
                          accessibilityRole="button"
                          accessibilityLabel={`${member.name || member.email || ""}, ${status.label}`}
                        >
                          <View style={styles.memberAvatarWrap}>
                            <AppImage
                              uri={getImageUri(member.user?.profile_image_url)}
                              style={styles.memberAvatar}
                            />
                          </View>
                          <View style={styles.memberInfo}>
                            <View style={styles.memberNameRow}>
                              <Text style={styles.memberName} numberOfLines={1}>
                                {member.name || member.email}
                              </Text>
                              {status.tone !== "active" ? (
                                <View
                                  style={[
                                    styles.statusChip,
                                    status.tone === "pending" &&
                                      styles.statusChipPending,
                                  ]}
                                >
                                  <Text
                                    style={[
                                      styles.statusChipText,
                                      status.tone === "pending" &&
                                        styles.statusChipTextPending,
                                    ]}
                                    numberOfLines={1}
                                  >
                                    {status.label}
                                  </Text>
                                </View>
                              ) : null}
                            </View>
                            {member.email ? (
                              <Text style={styles.memberEmail} numberOfLines={1}>
                                {member.email}
                              </Text>
                            ) : null}
                            <RatingBadge
                              average={member.average_rating}
                              count={member.ratings_count}
                              style={styles.memberRating}
                            />
                            {reelRow ? (
                              <View style={styles.reelLine}>
                                <MaterialIcons
                                  name="movie-filter"
                                  size={iconScale(13)}
                                  color={theme.lightGreen}
                                />
                                <Text style={styles.reelLineText} numberOfLines={1}>
                                  {(reelRow.monthly_reel_limit ?? 0) > 0
                                    ? t("monthlyReelsInline", {
                                        used: reelRow.reels_used_this_month,
                                        limit: reelRow.monthly_reel_limit,
                                      })
                                    : t("monthlyReelsNoneGivenShort")}
                                </Text>
                              </View>
                            ) : null}
                          </View>
                          <TouchableOpacity
                            onPress={() => setActionMenuMember(member)}
                            style={styles.memberMoreButton}
                            accessibilityRole="button"
                            accessibilityLabel={t("manageStaffActions")}
                          >
                            <Feather
                              name="more-vertical"
                              size={iconScale(20)}
                              color={theme.lightGreen}
                            />
                          </TouchableOpacity>
                        </TouchableOpacity>
                      </React.Fragment>
                    );
                  })}
                </View>
              )}
            </View>

            {employees.length > 0 && reelLimits?.staff_reel_limits ? (
              <BusinessReelsSummaryCard
                limits={reelLimits}
                resetLabel={formatReelsResetDate(
                  reelLimits.monthly_reels_reset_on,
                )}
              />
            ) : null}
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
        onClose={() => setActionMenuMember(null)}
        onEdit={handleEditMember}
        onDelete={handleDeleteMember}
      />
    </SafeAreaView>
  );
}
