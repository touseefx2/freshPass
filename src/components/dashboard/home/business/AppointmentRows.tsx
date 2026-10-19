import React, { useMemo } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useRouter } from "expo-router";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  iconScale,
  moderateHeightScale,
  moderateWidthScale,
  widthScale,
} from "@/src/theme/dimensions";
import AppImage from "@/src/components/AppImage";
import {
  StatusChip,
  appointmentAction,
  appointmentMoment,
  appointmentServiceLabel,
  createCardStyle,
  customerAvatarUri,
  type HomeAppointment,
} from "./shared";

const CUSTOMER_AVATAR = widthScale(38);
const STAFF_AVATAR = widthScale(44);

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    card: {
      ...createCardStyle(theme),
      overflow: "hidden",
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: moderateWidthScale(12),
      paddingVertical: moderateHeightScale(12),
      gap: moderateWidthScale(10),
    },
    rowDivider: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.borderNormal,
    },
    timeCol: {
      width: moderateWidthScale(68),
      gap: moderateHeightScale(4),
    },
    dateText: {
      fontSize: fontSize.size10,
      fontFamily: fonts.fontMedium,
      color: theme.lightGreen6,
      textTransform: "uppercase",
    },
    timeText: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      fontVariant: ["tabular-nums"],
    },
    customerAvatar: {
      width: CUSTOMER_AVATAR,
      height: CUSTOMER_AVATAR,
      borderRadius: CUSTOMER_AVATAR / 2,
      backgroundColor: theme.emptyProfileImage,
    },
    middle: {
      flex: 1,
      minWidth: 0,
    },
    name: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    sub: {
      marginTop: moderateHeightScale(1),
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
    },
    staffLine: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(4),
      marginTop: moderateHeightScale(3),
    },
    staffText: {
      flexShrink: 1,
      fontSize: fontSize.size12,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
    },
    actionPill: {
      minWidth: moderateWidthScale(54),
      height: moderateHeightScale(32),
      paddingHorizontal: moderateWidthScale(10),
      borderRadius: moderateWidthScale(10),
      alignItems: "center",
      justifyContent: "center",
    },
    actionView: {
      backgroundColor: theme.tileMint,
    },
    actionAccent: {
      backgroundColor: theme.tilePeach,
    },
    actionText: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontBold,
    },
    staffAvatar: {
      width: STAFF_AVATAR,
      height: STAFF_AVATAR,
      borderRadius: STAFF_AVATAR / 2,
      backgroundColor: theme.emptyProfileImage,
    },
    staffNameCol: {
      width: moderateWidthScale(76),
    },
    staffName: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      textTransform: "capitalize",
    },
    vDivider: {
      width: StyleSheet.hairlineWidth,
      alignSelf: "stretch",
      backgroundColor: theme.borderNormal,
    },
    smallMuted: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen6,
      fontVariant: ["tabular-nums"],
    },
    customerName: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
    },
    empty: {
      alignItems: "center",
      gap: moderateHeightScale(6),
      paddingVertical: moderateHeightScale(22),
      paddingHorizontal: moderateWidthScale(16),
    },
    emptyText: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontMedium,
      color: theme.lightGreen,
      textAlign: "center",
    },
    skeletonRow: {
      height: moderateHeightScale(64),
    },
    skeletonBar: {
      height: moderateHeightScale(12),
      borderRadius: moderateWidthScale(6),
      backgroundColor: theme.lightGreen07,
    },
  });

function useStyles() {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);
  return { theme, styles };
}

export function ListEmpty({ icon, text }: { icon: keyof typeof MaterialCommunityIcons.glyphMap; text: string }) {
  const { theme, styles } = useStyles();
  return (
    <View style={styles.empty}>
      <MaterialCommunityIcons name={icon} size={iconScale(28)} color={theme.lightGreen4} />
      <Text style={styles.emptyText}>{text}</Text>
    </View>
  );
}

export function ListSkeleton({ rows = 3 }: { rows?: number }) {
  const { theme, styles } = useStyles();
  return (
    <View style={styles.card}>
      {Array.from({ length: rows }).map((_, i) => (
        <View
          key={i}
          style={[styles.row, styles.skeletonRow, i > 0 && styles.rowDivider]}
        >
          <View style={[styles.customerAvatar, { backgroundColor: theme.lightGreen07 }]} />
          <View style={[styles.middle, { gap: moderateHeightScale(8) }]}>
            <View style={[styles.skeletonBar, { width: "55%" }]} />
            <View style={[styles.skeletonBar, { width: "35%" }]} />
          </View>
          <View style={[styles.skeletonBar, { width: moderateWidthScale(54) }]} />
        </View>
      ))}
    </View>
  );
}

/* ── Home: Today's / This Week's appointments ─────────────────────────── */

export function PeriodAppointmentsCard({
  appointments,
  showStaff,
  showDate,
  emptyText,
  onWillNavigate,
}: {
  /** null while loading */
  appointments: HomeAppointment[] | null;
  showStaff: boolean;
  /** Multi-day periods show the day above the time */
  showDate: boolean;
  emptyText: string;
  /** The home refetches when the user comes back from an action */
  onWillNavigate?: () => void;
}) {
  const { theme, styles } = useStyles();
  const { t } = useTranslation();
  const router = useRouter();

  if (appointments == null) return <ListSkeleton rows={3} />;

  if (appointments.length === 0) {
    return (
      <View style={styles.card}>
        <ListEmpty icon="calendar-blank-outline" text={emptyText} />
      </View>
    );
  }

  const openDetails = (id: number) => {
    onWillNavigate?.();
    router.push({
      pathname: "/(main)/bookingDetailsById",
      params: { bookingId: String(id) },
    });
  };

  const runAction = (appt: HomeAppointment) => {
    const action = appointmentAction(appt);
    onWillNavigate?.();
    if (action === "confirm") {
      router.push({
        pathname: "/(main)/appointmentOutcome" as any,
        params: { bookingId: String(appt.id), step: "payment" },
      });
      return;
    }
    if (action === "update") {
      router.push({
        pathname: "/(main)/appointmentOutcome" as any,
        params: { bookingId: String(appt.id) },
      });
      return;
    }
    openDetails(appt.id);
  };

  return (
    <View style={styles.card}>
      {appointments.map((appt, index) => {
        const moment = appointmentMoment(appt);
        const action = appointmentAction(appt);
        const actionLabel =
          action === "confirm"
            ? t("bhActionConfirm")
            : action === "update"
              ? t("bhActionUpdate")
              : t("bhActionView");
        const service = appointmentServiceLabel(appt, t);
        return (
          <TouchableOpacity
            key={appt.id}
            activeOpacity={0.7}
            onPress={() => openDetails(appt.id)}
            style={[styles.row, index > 0 && styles.rowDivider]}
            accessibilityRole="button"
            accessibilityLabel={[
              moment.format(showDate ? "ddd MMM D, h:mm A" : "h:mm A"),
              appt.user,
              service,
              showStaff && appt.staffName ? appt.staffName : null,
            ]
              .filter(Boolean)
              .join(", ")}
          >
            <View style={styles.timeCol}>
              {showDate ? (
                <Text style={styles.dateText} numberOfLines={1}>
                  {moment.format("ddd, MMM D")}
                </Text>
              ) : null}
              <Text style={styles.timeText} numberOfLines={1}>
                {moment.format("h:mm A")}
              </Text>
              <StatusChip status={appt.status} t={t} />
            </View>

            <AppImage uri={customerAvatarUri(appt)} style={styles.customerAvatar} />

            <View style={styles.middle}>
              <Text style={styles.name} numberOfLines={1}>
                {appt.user || t("customer")}
              </Text>
              <Text style={styles.sub} numberOfLines={1}>
                {service}
              </Text>
              {showStaff && appt.staffName ? (
                <View style={styles.staffLine}>
                  <MaterialCommunityIcons
                    name="card-account-details-outline"
                    size={iconScale(13)}
                    color={theme.lightGreen6}
                  />
                  <Text style={styles.staffText} numberOfLines={1}>
                    {appt.staffName}
                  </Text>
                </View>
              ) : null}
            </View>

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => runAction(appt)}
              style={[
                styles.actionPill,
                action === "view" ? styles.actionView : styles.actionAccent,
              ]}
              hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
              accessibilityRole="button"
              accessibilityLabel={`${actionLabel}, ${appt.user ?? ""}`}
            >
              <Text
                style={[
                  styles.actionText,
                  {
                    color:
                      action === "view"
                        ? theme.successGreen
                        : theme.orangeBrownText,
                  },
                ]}
                numberOfLines={1}
              >
                {actionLabel}
              </Text>
            </TouchableOpacity>
            <Feather
              name="chevron-right"
              size={iconScale(16)}
              color={theme.lightGreen5}
            />
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

/* ── Transactions: Current staff appointments (Pro) ───────────────────── */

export function StaffAppointmentsCard({
  appointments,
  staffImageFor,
  showDate,
  emptyText,
}: {
  appointments: HomeAppointment[] | null;
  staffImageFor: (appt: HomeAppointment) => string;
  showDate: boolean;
  emptyText: string;
}) {
  const { theme, styles } = useStyles();
  const { t } = useTranslation();
  const router = useRouter();

  if (appointments == null) return <ListSkeleton rows={3} />;

  if (appointments.length === 0) {
    return (
      <View style={styles.card}>
        <ListEmpty icon="account-clock-outline" text={emptyText} />
      </View>
    );
  }

  return (
    <View style={styles.card}>
      {appointments.map((appt, index) => {
        const moment = appointmentMoment(appt);
        const service = appointmentServiceLabel(appt, t);
        const time = moment.format(showDate ? "MMM D, h:mm A" : "h:mm A");
        return (
          <TouchableOpacity
            key={appt.id}
            activeOpacity={0.7}
            onPress={() =>
              router.push({
                pathname: "/(main)/bookingDetailsById",
                params: { bookingId: String(appt.id) },
              })
            }
            style={[styles.row, index > 0 && styles.rowDivider]}
            accessibilityRole="button"
            accessibilityLabel={[appt.staffName, time, appt.user, service]
              .filter(Boolean)
              .join(", ")}
          >
            <AppImage uri={staffImageFor(appt)} style={styles.staffAvatar} />
            <View style={styles.staffNameCol}>
              <Text style={styles.staffName} numberOfLines={2}>
                {appt.staffName || "—"}
              </Text>
            </View>
            <View style={styles.vDivider} />
            <View style={styles.middle}>
              <Text style={styles.smallMuted} numberOfLines={1}>
                {time}
              </Text>
              <Text style={styles.customerName} numberOfLines={1}>
                {appt.user || t("customer")}
              </Text>
              <Text style={styles.smallMuted} numberOfLines={1}>
                {service}
              </Text>
            </View>
            <StatusChip status={appt.status} t={t} style={{ alignSelf: "center" }} />
            <Feather
              name="chevron-right"
              size={iconScale(16)}
              color={theme.lightGreen5}
            />
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
