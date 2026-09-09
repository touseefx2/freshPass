import React, { useMemo, useEffect, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
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
import { Feather } from "@expo/vector-icons";
import { Skeleton } from "@/src/components/skeletons";
import {
  canAddStaffMembers,
  canUseOwnerAsStaff,
  isSoloSubscription,
} from "@/src/state/slices/userSlice";
import {
  setBusinessPlansModalVisible,
  setBusinessPlansModalBusinessOnly,
} from "@/src/state/slices/generalSlice";
import BuyBusinessPlanModal from "@/src/components/BuyBusinessPlanModal";
import UpgradeToBusinessModal from "@/src/components/UpgradeToBusinessModal";
import {
  disableOwnerAsStaff,
  enableOwnerAsStaff,
} from "@/src/services/ownerAsStaffService";
import { useNotificationContext } from "@/src/contexts/NotificationContext";
import Logger from "@/src/services/logger";

const STAFF_CARD_WIDTH = widthScale(128);
const STAFF_CARD_GAP = moderateWidthScale(24);
const STAFF_LIST_PADDING = moderateWidthScale(14);
const STAFF_ITEM_SIZE = STAFF_CARD_WIDTH + STAFF_CARD_GAP;
const STAFF_LIFT = moderateHeightScale(5);

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    outerContainer: {
      marginBottom: moderateHeightScale(18),
      paddingHorizontal: moderateWidthScale(20),
    },
    staffContainer: {
      backgroundColor: theme.lightBeige,
      borderRadius: moderateWidthScale(14),
      borderWidth: 1,
      borderColor: theme.borderLight,
      paddingTop: moderateHeightScale(14),
      paddingBottom: moderateHeightScale(10),
    },
    sectionHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: moderateWidthScale(14),
      marginBottom: moderateHeightScale(12),
      gap: moderateWidthScale(8),
    },
    sectionTitleRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(8),
      flexShrink: 1,
    },
    sectionTitle: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    countBadge: {
      minWidth: moderateWidthScale(22),
      height: moderateWidthScale(22),
      borderRadius: moderateWidthScale(11),
      paddingHorizontal: moderateWidthScale(6),
      backgroundColor: theme.darkGreen,
      alignItems: "center",
      justifyContent: "center",
    },
    countBadgeText: {
      fontSize: fontSize.size11,
      fontFamily: fonts.fontBold,
      color: theme.white,
    },
    sectionRight: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(10),
      flexShrink: 0,
    },
    ownerCtaText: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontMedium,
      color: theme.selectCard,
      textDecorationLine: "underline",
      textDecorationColor: theme.selectCard,
      maxWidth: widthScale(120),
      textAlign: "right",
    },
    addStaffCircle: {
      width: moderateWidthScale(28),
      height: moderateWidthScale(28),
      borderRadius: moderateWidthScale(14),
      backgroundColor: theme.darkGreen,
      alignItems: "center",
      justifyContent: "center",
    },
    staffList: {
      flexDirection: "row",
      gap: STAFF_CARD_GAP,
      paddingHorizontal: STAFF_LIST_PADDING,
      paddingTop: moderateHeightScale(14),
      paddingBottom: moderateHeightScale(16),
    },
    staffCardWrap: {
      width: STAFF_CARD_WIDTH,
    },
    staffCard: {
      width: STAFF_CARD_WIDTH,
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
      width: widthScale(56),
      height: widthScale(56),
      justifyContent: "center",
      alignItems: "center",
      marginBottom: moderateHeightScale(10),
    },
    staffImageClip: {
      width: widthScale(56),
      height: widthScale(56),
      borderRadius: widthScale(56 / 2),
      overflow: "hidden",
    },
    staffImage: {
      width: widthScale(56),
      height: widthScale(56),
      borderRadius: widthScale(56 / 2),
      backgroundColor: theme.emptyProfileImage,
      borderWidth: 1.5,
      borderColor: theme.borderLight,
    },
    staffStatusDot: {
      position: "absolute",
      bottom: 1,
      left: 1,
      width: moderateWidthScale(11),
      height: moderateWidthScale(11),
      borderRadius: moderateWidthScale(11) / 2,
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
      fontSize: fontSize.size13,
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
      fontSize: fontSize.size11,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      textAlign: "center",
      width: "100%",
    },
    emptyStateContainer: {
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: moderateHeightScale(28),
      paddingHorizontal: moderateWidthScale(20),
    },
    emptyStateText: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      textAlign: "center",
    },
    // Kept for Skeleton compatibility
    staffItem: {
      width: STAFF_CARD_WIDTH,
      minHeight: heightScale(140),
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

function getStaffImageUri(staff: StaffData) {
  const profileImage = staff.user?.profile_image_url;
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

type StaffMotionCardProps = {
  staff: StaffData;
  index: number;
  scrollX: SharedValue<number>;
  styles: ReturnType<typeof createStyles>;
  ownerLabel: string;
  onPress: () => void;
};

function StaffMotionCard({
  staff,
  index,
  scrollX,
  styles,
  ownerLabel,
  onPress,
}: StaffMotionCardProps) {
  const isOwner =
    staff.is_owner === true || staff.is_business_owner === true;
  const isActive = staff.active === 1;
  const experience = staff.description?.trim() || null;

  const motionStyle = useAnimatedStyle(() => {
    const inputRange = [
      (index - 1) * STAFF_ITEM_SIZE,
      index * STAFF_ITEM_SIZE,
      (index + 1) * STAFF_ITEM_SIZE,
    ];

    // Simple lift only — same box size, no scale / tilt / flip
    const translateY = interpolate(
      scrollX.value,
      inputRange,
      [STAFF_LIFT, 0, STAFF_LIFT],
      Extrapolation.CLAMP,
    );

    return {
      transform: [{ translateY }],
    };
  });

  return (
    <Animated.View style={[styles.staffCardWrap, motionStyle]}>
      <TouchableOpacity
        activeOpacity={0.7}
        style={[styles.staffCard, styles.shadow]}
        onPress={onPress}
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
          {isOwner ? (
            <View style={styles.ownerPill}>
              <Text style={styles.ownerPillText}>{ownerLabel}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.staffInfo}>
          <Text style={styles.staffName} numberOfLines={1}>
            {staff.name ?? ""}
          </Text>
          {experience ? (
            <Text style={styles.staffExperience} numberOfLines={2}>
              {experience}
            </Text>
          ) : null}
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
  const businessStatus = useAppSelector((state) => state.user.businessStatus);
  const canAddStaff = canAddStaffMembers(businessStatus);
  const isSoloPlan = isSoloSubscription(businessStatus);
  const showOwnerCta = canUseOwnerAsStaff(businessStatus);
  const ownerEnabled = businessStatus?.owner_as_staff?.enabled === true;
  const [buyPlanModalVisible, setBuyPlanModalVisible] = useState(false);
  const [upgradeModalVisible, setUpgradeModalVisible] = useState(false);
  const [ownerBusy, setOwnerBusy] = useState(false);

  const staffScrollX = useSharedValue(0);
  const staffScrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      staffScrollX.value = event.contentOffset.x;
    },
  });

  const staffCount = data?.length ?? 0;

  useEffect(() => {
    callApi();
  }, []);

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

  const handleOwnerCtaPress = () => {
    if (ownerBusy) return;
    if (!ownerEnabled) {
      void runOwnerEnable();
      return;
    }
    Alert.alert(t("removeYourself"), t("removeYourselfConfirm"), [
      { text: t("cancel") || "Cancel", style: "cancel" },
      {
        text: t("removeYourself"),
        style: "destructive",
        onPress: () => {
          void runOwnerDisable();
        },
      },
    ]);
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

  return (
    <View style={styles.outerContainer}>
      <View style={styles.staffContainer}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <Text style={styles.sectionTitle}>{t("staffOnDuty")}</Text>
            {staffCount > 0 ? (
              <View style={styles.countBadge}>
                <Text style={styles.countBadgeText}>{staffCount}</Text>
              </View>
            ) : null}
          </View>
          <View style={styles.sectionRight}>
            {showOwnerCta && (
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={handleOwnerCtaPress}
                disabled={ownerBusy}
              >
                {ownerBusy ? (
                  <ActivityIndicator size="small" color={theme.selectCard} />
                ) : (
                  <Text style={styles.ownerCtaText} numberOfLines={1}>
                    {ownerEnabled
                      ? t("removeYourself")
                      : t("addYourselfAsStaff")}
                  </Text>
                )}
              </TouchableOpacity>
            )}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handleAddStaffPress}
              style={styles.addStaffCircle}
            >
              <Feather name="plus" size={iconScale(15)} color={theme.white85} />
            </TouchableOpacity>
          </View>
        </View>

        {!data ? (
          <Skeleton screenType="StaffOnDuty" styles={styles} />
        ) : data.length === 0 ? (
          <View style={styles.emptyStateContainer}>
            <Text style={styles.emptyStateText}>{t("noStaffOnDuty")}</Text>
          </View>
        ) : (
          <Animated.ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.staffList}
            onScroll={staffScrollHandler}
            scrollEventThrottle={16}
            snapToInterval={STAFF_ITEM_SIZE}
            decelerationRate="fast"
            disableIntervalMomentum
          >
            {data.map((staff, index) => (
              <StaffMotionCard
                key={staff.id}
                staff={staff}
                index={index}
                scrollX={staffScrollX}
                styles={styles}
                ownerLabel={t("owner")}
                onPress={() =>
                  router.push({
                    pathname: "/(main)/staffDetail",
                    params: { id: String(staff.id) },
                  })
                }
              />
            ))}
          </Animated.ScrollView>
        )}
      </View>

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
    </View>
  );
}
