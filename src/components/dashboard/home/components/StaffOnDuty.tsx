import React, { useMemo, useEffect, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { useTheme, useAppDispatch, useAppSelector } from "@/src/hooks/hooks";
import { useTranslation } from "react-i18next";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  moderateHeightScale,
  moderateWidthScale,
  widthScale,
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

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    staffContainer: {
      marginBottom: moderateHeightScale(18),
      backgroundColor: theme.lightGreen1,
      minHeight: moderateHeightScale(140),
      gap: moderateHeightScale(12),
      paddingVertical: 15,
    },
    sectionHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: moderateWidthScale(15),
      width: "100%",
    },
    sectionTitle: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    sectionRight: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(10),
    },
    ownerCtaText: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
      maxWidth: widthScale(160),
      textAlign: "right",
    },
    staffScrollView: { flex: 1 },
    staffScrollContent: {
      paddingHorizontal: moderateWidthScale(20),
    },
    staffItemFirst: {
      marginLeft: 0,
    },
    staffItem: {
      alignItems: "center",
      marginRight: moderateWidthScale(20),
      gap: moderateHeightScale(5),
    },
    staffAvatar: {
      width: widthScale(52),
      height: widthScale(52),
      borderRadius: widthScale(52 / 2),
      borderWidth: 1,
      borderColor: theme.borderLight,
      position: "relative",
    },
    staffAvatarImage: {
      flex: 1,
      borderRadius: widthScale(52 / 2),
      overflow: "hidden",
    },
    statusDot: {
      position: "absolute",
      right: 3,
      bottom: 2,
      width: widthScale(9),
      height: widthScale(9),
      borderRadius: widthScale(9 / 2),
      zIndex: 9999,
    },
    staffName: {
      fontSize: fontSize.size11,
      fontFamily: fonts.fontRegular,
      color: theme.darkGreen,
      textAlign: "center",
    },
    ownerTag: {
      fontSize: fontSize.size10,
      fontFamily: fonts.fontMedium,
      color: theme.primary,
      textAlign: "center",
    },
    emptyStateContainer: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    emptyStateText: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      textAlign: "center",
      paddingHorizontal: moderateWidthScale(20),
    },
    addStaffCircle: {
      width: moderateWidthScale(22),
      height: moderateWidthScale(22),
      borderRadius: moderateWidthScale(22 / 2),
      backgroundColor: theme.darkGreen,
      alignItems: "center",
      justifyContent: "center",
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

  const isOwnerStaff = (staff: StaffData) =>
    staff.is_owner === true || staff.is_business_owner === true;

  return (
    <View style={styles.staffContainer}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{t("staffOnDuty")}</Text>
        <View style={styles.sectionRight}>
          {showOwnerCta && (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handleOwnerCtaPress}
              disabled={ownerBusy}
            >
              {ownerBusy ? (
                <ActivityIndicator size="small" color={theme.darkGreen} />
              ) : (
                <Text style={styles.ownerCtaText} numberOfLines={2}>
                  {ownerEnabled ? t("removeYourself") : t("addYourselfAsStaff")}
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
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.staffScrollView}
          contentContainerStyle={styles.staffScrollContent}
        >
          {data.map((staff, index) => (
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() =>
                router.push({
                  pathname: "/(main)/staffDetail",
                  params: { id: String(staff.id) },
                })
              }
              key={staff.id}
              style={[styles.staffItem, index === 0 && styles.staffItemFirst]}
            >
              <View style={styles.staffAvatar}>
                <Image
                  source={{
                    uri: staff.user?.profile_image_url
                      ? staff.user.profile_image_url.startsWith("http://") ||
                        staff.user.profile_image_url.startsWith("https://")
                        ? staff.user.profile_image_url
                        : process.env.EXPO_PUBLIC_API_BASE_URL +
                          staff.user.profile_image_url
                      : (process.env.EXPO_PUBLIC_DEFAULT_AVATAR_IMAGE ?? ""),
                  }}
                  style={styles.staffAvatarImage}
                />
                <View
                  style={[
                    styles.statusDot,
                    {
                      backgroundColor:
                        staff.active === 1
                          ? theme.toggleActive
                          : theme.lightGreen5,
                    },
                  ]}
                />
              </View>
              <Text numberOfLines={1} style={styles.staffName}>
                {staff?.name ?? ""}
              </Text>
              {isOwnerStaff(staff) ? (
                <Text style={styles.ownerTag}>{t("owner")}</Text>
              ) : null}
            </TouchableOpacity>
          ))}
        </ScrollView>
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
    </View>
  );
}
