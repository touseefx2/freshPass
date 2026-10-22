import React, { useEffect, useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import dayjs, { type Dayjs } from "dayjs";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  heightScale,
  moderateHeightScale,
  moderateWidthScale,
  widthScale,
} from "@/src/theme/dimensions";
import { DateStrip } from "@/src/components/ownerBooking/ownerBookingParts";
import FlowButton from "@/src/components/reelFlow/flowButton";
import { InfoNote } from "@/src/components/reelFlow/flowParts";
import { flowFooterBottomPad } from "@/src/components/reelFlow/flowFooter";
import { JOB_MAX_DAYS_AHEAD } from "@/src/utils/jobHelpers";

/**
 * Closing date for a job post: quick picks (2 weeks … 90 days) over the
 * month strip used in the booking flows. Today up to one year ahead.
 */

const QUICK_DAYS = [14, 30, 60, 90] as const;

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    wrap: { gap: moderateHeightScale(14) },
    chips: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: moderateWidthScale(8),
    },
    chip: {
      minHeight: heightScale(44),
      paddingHorizontal: moderateWidthScale(16),
      borderRadius: heightScale(22),
      borderWidth: 1.5,
      borderColor: theme.borderNormal,
      backgroundColor: theme.white,
      alignItems: "center",
      justifyContent: "center",
    },
    chipOn: {
      backgroundColor: theme.darkGreen,
      borderColor: theme.darkGreen,
    },
    chipText: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
    },
    chipTextOn: {
      color: theme.white,
      fontFamily: fonts.fontBold,
    },
    summary: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(10),
      padding: moderateWidthScale(14),
      borderRadius: moderateWidthScale(16),
      backgroundColor: theme.tileMint,
    },
    summaryText: {
      flex: 1,
      fontSize: fontSize.size15,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
      lineHeight: fontSize.size21,
    },
    summaryStrong: { fontFamily: fonts.fontBold },
    // ── Sheet
    overlay: {
      flex: 1,
      justifyContent: "flex-end",
      backgroundColor: "rgba(24, 33, 14, 0.55)",
    },
    sheet: {
      backgroundColor: theme.background,
      borderTopLeftRadius: moderateWidthScale(26),
      borderTopRightRadius: moderateWidthScale(26),
      paddingHorizontal: moderateWidthScale(20),
      paddingTop: moderateHeightScale(10),
      gap: moderateHeightScale(16),
    },
    handle: {
      alignSelf: "center",
      width: widthScale(44),
      height: heightScale(5),
      borderRadius: heightScale(3),
      backgroundColor: theme.lightGreen2,
    },
    sheetHead: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: moderateWidthScale(12),
    },
    sheetTitleWrap: { flex: 1, gap: moderateHeightScale(4) },
    sheetTitle: {
      fontSize: fontSize.size20,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    sheetSub: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      lineHeight: fontSize.size20,
    },
    close: {
      width: widthScale(40),
      height: widthScale(40),
      borderRadius: widthScale(20),
      backgroundColor: theme.lightGreen07,
      alignItems: "center",
      justifyContent: "center",
    },
  });

function useClosingStyles() {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  return { theme, styles };
}

export function ClosingDatePicker({
  value,
  onChange,
}: {
  value: Dayjs | null;
  onChange: (date: Dayjs) => void;
}) {
  const { t } = useTranslation();
  const { theme, styles } = useClosingStyles();
  const today = dayjs().startOf("day");
  const lastDay = today.add(JOB_MAX_DAYS_AHEAD, "day");

  return (
    <View style={styles.wrap}>
      <View style={styles.chips}>
        {QUICK_DAYS.map((days) => {
          const date = today.add(days, "day");
          const on = !!value && value.isSame(date, "day");
          const label =
            days === 14 ? t("jobIn2Weeks") : t("jobInDays", { count: days });
          return (
            <TouchableOpacity
              key={days}
              style={[styles.chip, on && styles.chipOn]}
              onPress={() => onChange(date)}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              accessibilityLabel={`${label}, ${date.format("dddd, MMMM D")}`}
            >
              <Text style={[styles.chipText, on && styles.chipTextOn]}>
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* The strip always marks a day; until one is picked, only the quick picks show */}
      {value ? (
        <DateStrip
          value={value}
          onChange={onChange}
          isDisabled={(day) => day.isAfter(lastDay, "day")}
        />
      ) : null}

      {value ? (
        <View style={styles.summary} accessibilityLiveRegion="polite">
          <MaterialIcons
            name="event-available"
            size={moderateWidthScale(22)}
            color={theme.successGreen}
          />
          <Text style={styles.summaryText}>
            {t("jobClosesOnLead")}{" "}
            <Text style={styles.summaryStrong}>
              {value.format("ddd, MMM D, YYYY")}
            </Text>
            {"\n"}
            {t("jobClosesOnHint")}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

/** Bottom sheet for Extend / Reopen with a new closing date. */
export function ClosingDateSheet({
  visible,
  title,
  subtitle,
  confirmLabel,
  initialDate,
  saving = false,
  error,
  onConfirm,
  onClose,
}: {
  visible: boolean;
  title: string;
  subtitle?: string | null;
  confirmLabel: string;
  initialDate: Dayjs | null;
  saving?: boolean;
  error?: string | null;
  onConfirm: (date: Dayjs) => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const { theme, styles } = useClosingStyles();
  // useSafeAreaInsets, not SafeAreaView: inside a Modal the latter reads 0 on first open
  const insets = useSafeAreaInsets();
  const [date, setDate] = useState<Dayjs | null>(initialDate);

  useEffect(() => {
    if (visible) setDate(initialDate);
    // Reset only when the sheet opens
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={() => !saving && onClose()}
    >
      <Pressable style={styles.overlay} onPress={() => !saving && onClose()}>
        <Pressable
          style={[
            styles.sheet,
            { paddingBottom: flowFooterBottomPad(insets.bottom) },
          ]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={styles.handle} />
          <View style={styles.sheetHead}>
            <View style={styles.sheetTitleWrap}>
              <Text style={styles.sheetTitle} accessibilityRole="header">
                {title}
              </Text>
              {subtitle ? (
                <Text style={styles.sheetSub}>{subtitle}</Text>
              ) : null}
            </View>
            <TouchableOpacity
              style={styles.close}
              onPress={onClose}
              disabled={saving}
              hitSlop={6}
              accessibilityRole="button"
              accessibilityLabel={t("close")}
            >
              <MaterialIcons
                name="close"
                size={moderateWidthScale(22)}
                color={theme.darkGreen}
              />
            </TouchableOpacity>
          </View>

          <ClosingDatePicker value={date} onChange={setDate} />

          {error ? (
            <InfoNote tone="error" icon="error-outline" text={error} />
          ) : null}

          <FlowButton
            label={confirmLabel}
            icon="event-available"
            onPress={() => date && onConfirm(date)}
            disabled={!date}
            loading={saving}
          />
        </Pressable>
      </Pressable>
    </Modal>
  );
}
