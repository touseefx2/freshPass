import React, { useCallback, useMemo, useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useAppDispatch, useAppSelector, useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  iconScale,
  moderateHeightScale,
  moderateWidthScale,
  widthScale,
} from "@/src/theme/dimensions";
import AppImage from "@/src/components/AppImage";
import BuyBusinessPlanModal from "@/src/components/BuyBusinessPlanModal";
import StaffActionMenuModal from "@/src/components/staffActionMenuModal";
import {
  canAddStaffMembers,
} from "@/src/state/slices/userSlice";
import {
  setActionLoader,
  setBusinessPlansModalVisible,
} from "@/src/state/slices/generalSlice";
import { useNotificationContext } from "@/src/contexts/NotificationContext";
import { ApiService } from "@/src/services/api";
import { staffEndpoints } from "@/src/services/endpoints";
import Logger from "@/src/services/logger";
import type { StaffData } from "../components/StaffOnDuty";
import {
  SectionHeader,
  formatAmountCompact,
  formatAmountShort,
  resolveImageUri,
} from "./shared";

// ~3½ cards on a phone so the strip shows it scrolls (client sample)
const CARD_WIDTH = widthScale(104);
const AVATAR = Math.round(CARD_WIDTH * 0.6);
// Full circle with equal room above and below it
const PANEL_HEIGHT = AVATAR + Math.round(CARD_WIDTH * 0.16);
const BODY_HEIGHT = moderateHeightScale(76);
const CARD_HEIGHT = PANEL_HEIGHT + BODY_HEIGHT;

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    list: {
      gap: moderateWidthScale(10),
      paddingHorizontal: moderateWidthScale(20),
      // Room for the card shadow
      paddingTop: moderateHeightScale(2),
      paddingBottom: moderateHeightScale(8),
    },
    cardShadow: {
      borderRadius: moderateWidthScale(14),
      shadowColor: theme.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 6,
      elevation: 1,
    },
    card: {
      width: CARD_WIDTH,
      height: CARD_HEIGHT,
      backgroundColor: theme.surfaceRaised,
      borderRadius: moderateWidthScale(14),
      borderWidth: 1,
      borderColor: theme.borderLight,
      overflow: "hidden",
    },
    panel: {
      height: PANEL_HEIGHT,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.staffPhotoPanel,
    },
    avatar: {
      width: AVATAR,
      height: AVATAR,
      borderRadius: AVATAR / 2,
      backgroundColor: theme.staffAvatarDisc,
    },
    body: {
      height: BODY_HEIGHT,
      justifyContent: "center",
      paddingHorizontal: moderateWidthScale(10),
    },
    name: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      textTransform: "capitalize",
    },
    appts: {
      marginTop: moderateHeightScale(2),
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen6,
    },
    revenue: {
      marginTop: moderateHeightScale(2),
      fontSize: fontSize.size16,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      fontVariant: ["tabular-nums"],
    },
    addCard: {
      width: CARD_WIDTH,
      height: CARD_HEIGHT,
      borderRadius: moderateWidthScale(14),
      borderWidth: 1.5,
      borderStyle: "dashed",
      borderColor: theme.borderDark,
      alignItems: "center",
      justifyContent: "center",
      gap: moderateHeightScale(8),
    },
    addCircle: {
      width: moderateWidthScale(40),
      height: moderateWidthScale(40),
      borderRadius: moderateWidthScale(20),
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.darkGreen,
    },
    addText: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    emptyCard: {
      marginHorizontal: moderateWidthScale(20),
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(12),
      backgroundColor: theme.white,
      borderRadius: moderateWidthScale(16),
      borderWidth: 1,
      borderColor: theme.borderLight,
      padding: moderateWidthScale(14),
    },
    emptyIcon: {
      width: moderateWidthScale(44),
      height: moderateWidthScale(44),
      borderRadius: moderateWidthScale(12),
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.tileMint,
    },
    emptyCopy: {
      flex: 1,
      gap: moderateHeightScale(2),
    },
    emptyTitle: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    emptySubtitle: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
    },
    emptyButton: {
      height: moderateHeightScale(38),
      paddingHorizontal: moderateWidthScale(14),
      borderRadius: moderateWidthScale(10),
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.darkGreen,
    },
    emptyButtonText: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontBold,
      color: theme.white,
    },
    skeletonCard: {
      width: CARD_WIDTH,
      height: CARD_HEIGHT,
      borderRadius: moderateWidthScale(14),
      backgroundColor: theme.lightGreen07,
    },
  });

export type StaffPeriodStats = { appointments: number; revenue: number | null };

type Props = {
  /** Employees only (owner excluded); null while loading */
  staff: StaffData[] | null;
  statsFor: (staff: StaffData) => StaffPeriodStats;
  /** Refetch the staff list after a delete */
  onStaffChanged: () => void;
};

export default function StaffOverview({ staff, statsFor, onStaffChanged }: Props) {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);
  const { t } = useTranslation();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { showBanner } = useNotificationContext();
  const businessStatus = useAppSelector((state) => state.user.businessStatus);
  const [buyPlanVisible, setBuyPlanVisible] = useState(false);
  const [menuStaff, setMenuStaff] = useState<StaffData | null>(null);

  const openTeam = () => {
    router.push("/(main)/dashboard/(account)/(businessProfileSettings)/team" as any);
  };

  const handleAddStaff = () => {
    if (!canAddStaffMembers(businessStatus)) {
      setBuyPlanVisible(true);
      return;
    }
    router.push("/(main)/addStaff");
  };

  const handleEdit = useCallback(() => {
    if (!menuStaff) return;
    const member = menuStaff;
    setMenuStaff(null);
    router.push({
      pathname: "/(main)/addStaff",
      params: {
        id: String(member.id),
        name: member.name || "",
        email: member.email || "",
        description: member.description || "",
        profile_image_url: member.user?.profile_image_url
          ? resolveImageUri(member.user.profile_image_url)
          : "",
        working_hours: JSON.stringify(member.user?.working_hours ?? []),
        is_owner: "0",
        monthly_reel_limit:
          member.monthly_reel_limit != null ? String(member.monthly_reel_limit) : "",
        ...(member.invitation_token
          ? { invitation_token: member.invitation_token }
          : {}),
      },
    });
  }, [menuStaff, router]);

  const handleDelete = useCallback(() => {
    if (!menuStaff) return;
    const { id, name } = menuStaff;
    setMenuStaff(null);
    // Let the action sheet close before the system alert opens
    setTimeout(() => {
      Alert.alert(
        t("deleteStaff") || "Delete staff",
        t("deleteStaffConfirm") || `Are you sure you want to delete "${name}"?`,
        [
          { text: t("cancel") || "Cancel", style: "cancel" },
          {
            text: t("delete") || "Delete",
            style: "destructive",
            onPress: () => {
              void (async () => {
                dispatch(setActionLoader(true));
                try {
                  await ApiService.delete(staffEndpoints.delete(id));
                  showBanner(
                    t("success") || "Success",
                    t("staffDeletedSuccess") || "Staff deleted successfully",
                    "success",
                    3000,
                  );
                  onStaffChanged();
                } catch (err: any) {
                  Logger.error("deleteStaff from home failed:", err);
                  showBanner(
                    t("error") || "Error",
                    err?.data?.message || err?.message || t("error"),
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
    }, 250);
  }, [menuStaff, dispatch, onStaffChanged, showBanner, t]);

  const renderBody = () => {
    if (staff == null) {
      return (
        <ScrollView
          horizontal
          scrollEnabled={false}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.list}
        >
          {[0, 1, 2].map((i) => (
            <View key={i} style={styles.skeletonCard} />
          ))}
        </ScrollView>
      );
    }

    if (staff.length === 0) {
      return (
        <View style={styles.emptyCard}>
          <View style={styles.emptyIcon}>
            <Feather name="users" size={iconScale(20)} color={theme.buttonBack} />
          </View>
          <View style={styles.emptyCopy}>
            <Text style={styles.emptyTitle}>{t("bhNoStaffTitle")}</Text>
            <Text style={styles.emptySubtitle} numberOfLines={2}>
              {t("bhNoStaffSubtitle")}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.emptyButton}
            activeOpacity={0.8}
            onPress={handleAddStaff}
            accessibilityRole="button"
          >
            <Text style={styles.emptyButtonText}>{t("bhAddStaff")}</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.list}
      >
        {staff.map((member) => {
          const stats = statsFor(member);
          return (
            <View key={member.id} style={styles.cardShadow}>
              <TouchableOpacity
                style={styles.card}
                activeOpacity={0.75}
                onPress={() =>
                  router.push({
                    pathname: "/(main)/staffDetail",
                    params: { id: String(member.id) },
                  })
                }
                onLongPress={() => setMenuStaff(member)}
                delayLongPress={350}
                accessibilityRole="button"
                accessibilityLabel={[
                  member.name,
                  t("bhApptsCount", { count: stats.appointments }),
                  stats.revenue != null ? formatAmountCompact(stats.revenue) : null,
                ]
                  .filter(Boolean)
                  .join(", ")}
                accessibilityHint={t("bhStaffCardHint")}
              >
                <View style={styles.panel}>
                  <AppImage
                    uri={resolveImageUri(member.user?.profile_image_url)}
                    style={styles.avatar}
                    resizeMode="cover"
                  />
                </View>
                <View style={styles.body}>
                  <Text style={styles.name} numberOfLines={1}>
                    {member.name ?? ""}
                  </Text>
                  <Text style={styles.appts} numberOfLines={1}>
                    {t("bhApptsCount", { count: stats.appointments })}
                  </Text>
                  <Text style={styles.revenue} numberOfLines={1}>
                    {stats.revenue == null ? "–" : formatAmountShort(stats.revenue)}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          );
        })}
        <TouchableOpacity
          style={styles.addCard}
          activeOpacity={0.7}
          onPress={handleAddStaff}
          accessibilityRole="button"
          accessibilityLabel={t("bhAddStaff")}
        >
          <View style={styles.addCircle}>
            <Feather name="plus" size={iconScale(20)} color={theme.white} />
          </View>
          <Text style={styles.addText}>{t("bhAddStaff")}</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  };

  return (
    <View>
      <SectionHeader
        title={t("bhStaffOverview")}
        actionLabel={t("seeAll")}
        onAction={openTeam}
        style={{ paddingHorizontal: moderateWidthScale(20) }}
      />
      {renderBody()}

      <BuyBusinessPlanModal
        visible={buyPlanVisible}
        onClose={() => setBuyPlanVisible(false)}
        onViewPlans={() => {
          setBuyPlanVisible(false);
          dispatch(setBusinessPlansModalVisible(true));
        }}
      />
      <StaffActionMenuModal
        visible={menuStaff != null}
        staffName={menuStaff?.name}
        imageUri={
          menuStaff ? resolveImageUri(menuStaff.user?.profile_image_url) : undefined
        }
        onClose={() => setMenuStaff(null)}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />
    </View>
  );
}
