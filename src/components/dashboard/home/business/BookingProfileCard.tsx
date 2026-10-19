import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
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
import CustomToggle from "@/src/components/customToggle";
import RemoveOwnerAsStaffModal from "@/src/components/removeOwnerAsStaffModal";
import {
  canUseOwnerAsStaff,
  isStripeOnboardingCompleted,
} from "@/src/state/slices/userSlice";
import { setStripeConnectModalVisible } from "@/src/state/slices/generalSlice";
import {
  disableOwnerAsStaff,
  enableOwnerAsStaff,
} from "@/src/services/ownerAsStaffService";
import { useNotificationContext } from "@/src/contexts/NotificationContext";
import Logger from "@/src/services/logger";
import type { StaffData } from "../components/StaffOnDuty";
import { SectionHeader, createCardStyle, resolveImageUri } from "./shared";

const AVATAR = widthScale(60);

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    card: {
      ...createCardStyle(theme),
      borderRadius: moderateWidthScale(18),
      paddingHorizontal: moderateWidthScale(16),
      paddingTop: moderateHeightScale(16),
      paddingBottom: moderateHeightScale(16),
    },
    profileRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(14),
    },
    avatarWrap: {
      width: AVATAR,
      height: AVATAR + moderateHeightScale(8),
    },
    avatar: {
      width: AVATAR,
      height: AVATAR,
      borderRadius: AVATAR / 2,
      backgroundColor: theme.emptyProfileImage,
    },
    statusDot: {
      position: "absolute",
      top: moderateHeightScale(2),
      right: moderateWidthScale(2),
      width: moderateWidthScale(12),
      height: moderateWidthScale(12),
      borderRadius: moderateWidthScale(6),
      borderWidth: 2,
      borderColor: theme.white,
    },
    ownerPill: {
      position: "absolute",
      bottom: 0,
      alignSelf: "center",
      paddingHorizontal: moderateWidthScale(8),
      paddingVertical: moderateHeightScale(1),
      borderRadius: moderateWidthScale(999),
      backgroundColor: theme.selectCard,
      borderWidth: 1.5,
      borderColor: theme.white,
    },
    ownerPillText: {
      fontSize: fontSize.size10,
      fontFamily: fonts.fontBold,
      color: theme.white,
    },
    name: {
      flex: 1,
      fontSize: fontSize.size18,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      textTransform: "capitalize",
    },
    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: theme.borderNormal,
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
    },
    acceptTitle: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    acceptSubtitle: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
    },
  });

type Props = {
  /** The owner's own staff row (Pro, once added as staff) */
  ownerStaff: StaffData | null;
  isSolo: boolean;
  /** Refetch the staff list after the toggle changes */
  onOwnerChanged: () => void;
};

export default function BookingProfileCard({
  ownerStaff,
  isSolo,
  onOwnerChanged,
}: Props) {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);
  const { t } = useTranslation();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { showBanner } = useNotificationContext();
  const user = useAppSelector((state) => state.user);
  const businessStatus = user.businessStatus;
  const [busy, setBusy] = useState(false);
  const [removeVisible, setRemoveVisible] = useState(false);

  // Pro only: owner can take themselves off the booking list (owner-as-staff)
  const showToggle = !isSolo && canUseOwnerAsStaff(businessStatus);
  const ownerEnabled = businessStatus?.owner_as_staff?.enabled === true;
  const name = ownerStaff?.name || user.name || "";
  const imageUri = resolveImageUri(
    ownerStaff?.user?.profile_image_url ?? user.profile_image_url,
  );
  const isActive = isSolo
    ? businessStatus?.active !== false
    : ownerStaff
      ? ownerStaff.active === 1
      : ownerEnabled;

  const openProfile = () => {
    router.push("/(main)/dashboard/(account)/barberProfile" as any);
  };

  const runEnable = async () => {
    setBusy(true);
    try {
      const response = await enableOwnerAsStaff();
      if (response.success) {
        showBanner(
          t("success") || "Success",
          response.message || t("ownerAddedAsStaffSuccess"),
          "success",
          2500,
        );
        onOwnerChanged();
      } else {
        showBanner(t("error"), response.message || t("ownerAsStaffFailed"), "error", 3000);
      }
    } catch (error: any) {
      Logger.error("enableOwnerAsStaff failed:", error);
      showBanner(t("error"), error?.message || t("ownerAsStaffFailed"), "error", 3000);
    } finally {
      setBusy(false);
    }
  };

  const runDisable = async () => {
    setBusy(true);
    try {
      const response = await disableOwnerAsStaff();
      if (response.success) {
        setRemoveVisible(false);
        showBanner(
          t("success") || "Success",
          response.message || t("ownerRemovedAsStaffSuccess"),
          "success",
          2500,
        );
        onOwnerChanged();
      } else {
        showBanner(t("error"), response.message || t("ownerAsStaffFailed"), "error", 3000);
      }
    } catch (error: any) {
      Logger.error("disableOwnerAsStaff failed:", error);
      showBanner(t("error"), error?.message || t("ownerAsStaffFailed"), "error", 3000);
    } finally {
      setBusy(false);
    }
  };

  const handleToggle = (next: boolean) => {
    if (busy) return;
    if (next) {
      if (!isStripeOnboardingCompleted(businessStatus)) {
        dispatch(setStripeConnectModalVisible(true));
        return;
      }
      void runEnable();
      return;
    }
    setRemoveVisible(true);
  };

  return (
    <View>
      <SectionHeader title={t("myBookingProfile")} />
      <View style={styles.card}>
        <TouchableOpacity
          style={styles.profileRow}
          activeOpacity={0.7}
          onPress={openProfile}
          accessibilityRole="button"
          accessibilityLabel={`${name}${isSolo ? "" : `, ${t("owner")}`}`}
        >
          <View style={styles.avatarWrap}>
            <AppImage uri={imageUri} style={styles.avatar} />
            <View
              style={[
                styles.statusDot,
                {
                  backgroundColor: isActive
                    ? theme.toggleActive
                    : theme.lightGreen5,
                },
              ]}
            />
            {!isSolo ? (
              <View style={styles.ownerPill}>
                <Text style={styles.ownerPillText}>{t("owner")}</Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.name} numberOfLines={1}>
            {name}
          </Text>
          <Feather
            name="chevron-right"
            size={iconScale(20)}
            color={theme.darkGreen}
          />
        </TouchableOpacity>

        {showToggle ? (
          <>
            <View style={styles.divider} />
            <View style={styles.acceptRow}>
              <View style={styles.acceptCopy}>
                <Text style={styles.acceptTitle}>{t("acceptAppointments")}</Text>
                <Text style={styles.acceptSubtitle} numberOfLines={2}>
                  {t("acceptAppointmentsSubtitle")}
                </Text>
              </View>
              {busy ? (
                <ActivityIndicator size="small" color={theme.darkGreen} />
              ) : (
                <CustomToggle
                  value={ownerEnabled}
                  onValueChange={handleToggle}
                  activeTrackColor={theme.darkGreen}
                  inactiveTrackColor={theme.lightGreen2}
                />
              )}
            </View>
          </>
        ) : null}
      </View>

      <RemoveOwnerAsStaffModal
        visible={removeVisible}
        loading={busy}
        onClose={() => {
          if (!busy) setRemoveVisible(false);
        }}
        onConfirm={() => {
          void runDisable();
        }}
      />
    </View>
  );
}
