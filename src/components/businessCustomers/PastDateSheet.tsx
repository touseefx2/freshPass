import React, { useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import dayjs, { type Dayjs } from "dayjs";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import { moderateHeightScale, moderateWidthScale } from "@/src/theme/dimensions";
import { EditorSheet } from "@/src/components/masterClasses/editorSheets";
import FlowButton from "@/src/components/reelFlow/flowButton";
import { useAppSelector } from "@/src/hooks/hooks";
import { fetchOwnerBusinessHours } from "@/src/services/ownerBookingService";
import { salonNow } from "@/src/utils/salonTimezone";

// The server checks "today" on the salon clock. Ahead-of-salon phones (e.g.
// Pakistan vs Detroit) would otherwise offer a day the server calls future.
// Keyed by business so a sign-out / account switch never reuses another salon's zone.
const zoneByBusiness = new Map<number, string | null>();
function useSalonToday(): string | null {
  const user = useAppSelector((state: any) => state.user);
  const businessId = Number(user?.business_id);
  const validId = Number.isFinite(businessId) && businessId > 0;
  const [fetched, setFetched] = useState<{ id: number; zone: string | null } | null>(
    null,
  );
  const zone = !validId
    ? null
    : zoneByBusiness.has(businessId)
      ? (zoneByBusiness.get(businessId) ?? null)
      : fetched?.id === businessId
        ? fetched.zone
        : null;
  useEffect(() => {
    if (!validId || zoneByBusiness.has(businessId)) return;
    let alive = true;
    fetchOwnerBusinessHours(businessId)
      .then((h) => {
        const z = h?.timezone ?? null;
        zoneByBusiness.set(businessId, z);
        if (alive) setFetched({ id: businessId, zone: z });
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [businessId, validId]);
  return zone ? salonNow(null, zone).day : null;
}

/**
 * Month calendar for dates in the past (last visit, consent date, filters).
 * Future days are off; month arrows go back as far as needed.
 */
export default function PastDateSheet({
  visible,
  title,
  value,
  maxDate,
  minDate,
  onConfirm,
  onClose,
}: {
  visible: boolean;
  title: string;
  /** "YYYY-MM-DD" or null */
  value: string | null;
  /** Latest selectable day (default today) */
  maxDate?: string | null;
  minDate?: string | null;
  onConfirm: (date: string) => void;
  onClose: () => void;
}) {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();

  const salonToday = useSalonToday();
  const max = useMemo(() => {
    const cap = dayjs(salonToday ?? undefined);
    const given = maxDate && dayjs(maxDate).isValid() ? dayjs(maxDate) : cap;
    return given.isAfter(cap, "day") ? cap : given;
  }, [maxDate, salonToday]);
  const min = useMemo(
    () => (minDate && dayjs(minDate).isValid() ? dayjs(minDate) : null),
    [minDate],
  );
  const initial = (): Dayjs => {
    const parsed = value ? dayjs(value) : null;
    return parsed && parsed.isValid() ? parsed : max;
  };
  const [selected, setSelected] = useState<Dayjs>(initial);
  const [month, setMonth] = useState<Dayjs>(() => initial().startOf("month"));

  useEffect(() => {
    if (!visible) return;
    const d = initial();
    setSelected(d);
    setMonth(d.startOf("month"));
    // Reset only when the sheet opens
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const days = useMemo(() => {
    const first = month.startOf("month");
    const lead = first.day(); // 0 = Sunday
    const count = month.daysInMonth();
    const cells: (Dayjs | null)[] = [];
    for (let i = 0; i < lead; i += 1) cells.push(null);
    for (let d = 1; d <= count; d += 1) cells.push(first.date(d));
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [month]);

  const canNext = month.add(1, "month").startOf("month").isBefore(max.add(1, "day"));
  const canPrev = !min || month.startOf("month").isAfter(min, "day");
  const weekdayNames = useMemo(
    () => Array.from({ length: 7 }, (_, i) => dayjs().day(i).format("dd")),
    [],
  );

  const disabled = (day: Dayjs) =>
    day.isAfter(max, "day") || (min ? day.isBefore(min, "day") : false);

  return (
    <EditorSheet
      visible={visible}
      title={title}
      onClose={onClose}
      footer={
        <FlowButton
          label={t("done")}
          onPress={() => onConfirm(selected.format("YYYY-MM-DD"))}
        />
      }
    >
      <View style={styles.monthRow}>
        <TouchableOpacity
          style={[styles.arrow, !canPrev && styles.arrowOff]}
          onPress={() => canPrev && setMonth((m) => m.subtract(1, "month"))}
          disabled={!canPrev}
          accessibilityRole="button"
          accessibilityLabel={t("bcuPrevMonth")}
          hitSlop={8}
        >
          <Ionicons name="chevron-back" size={20} color={theme.darkGreen} />
        </TouchableOpacity>
        <Text style={styles.monthText}>{month.format("MMMM YYYY")}</Text>
        <TouchableOpacity
          style={[styles.arrow, !canNext && styles.arrowOff]}
          onPress={() => canNext && setMonth((m) => m.add(1, "month"))}
          disabled={!canNext}
          accessibilityRole="button"
          accessibilityLabel={t("bcuNextMonth")}
          hitSlop={8}
        >
          <Ionicons name="chevron-forward" size={20} color={theme.darkGreen} />
        </TouchableOpacity>
      </View>
      <View style={styles.grid}>
        {weekdayNames.map((name, i) => (
          <Text key={`w${i}`} style={styles.weekday}>
            {name}
          </Text>
        ))}
        {days.map((day, i) =>
          day ? (
            <TouchableOpacity
              key={day.format("YYYY-MM-DD")}
              style={styles.cell}
              onPress={() => setSelected(day)}
              disabled={disabled(day)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityState={{
                selected: day.isSame(selected, "day"),
                disabled: disabled(day),
              }}
              accessibilityLabel={day.format("dddd, MMMM D, YYYY")}
            >
              <View
                style={[
                  styles.dayInner,
                  day.isSame(selected, "day") && styles.daySelected,
                ]}
              >
                <Text
                  style={[
                    styles.dayText,
                    disabled(day) && styles.dayDisabled,
                    day.isSame(selected, "day") && styles.dayTextSelected,
                  ]}
                >
                  {day.date()}
                </Text>
              </View>
            </TouchableOpacity>
          ) : (
            <View key={`e${i}`} style={styles.cell} />
          ),
        )}
      </View>
      <Text style={styles.summary}>{selected.format("dddd, MMMM D, YYYY")}</Text>
    </EditorSheet>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    monthRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: moderateHeightScale(8),
    },
    arrow: {
      width: moderateWidthScale(40),
      height: moderateWidthScale(40),
      borderRadius: moderateWidthScale(20),
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.lightGreen1,
    },
    arrowOff: { opacity: 0.35 },
    monthText: {
      fontFamily: fonts.fontBold,
      fontSize: fontSize.size16,
      color: theme.darkGreen,
    },
    grid: {
      flexDirection: "row",
      flexWrap: "wrap",
    },
    weekday: {
      width: `${100 / 7}%`,
      textAlign: "center",
      fontFamily: fonts.fontMedium,
      fontSize: fontSize.size12,
      color: theme.lightGreen,
      paddingVertical: moderateHeightScale(6),
    },
    cell: {
      width: `${100 / 7}%`,
      height: moderateWidthScale(44),
      alignItems: "center",
      justifyContent: "center",
    },
    dayInner: {
      width: moderateWidthScale(38),
      height: moderateWidthScale(38),
      borderRadius: moderateWidthScale(19),
      alignItems: "center",
      justifyContent: "center",
    },
    daySelected: { backgroundColor: theme.darkGreen },
    dayText: {
      fontFamily: fonts.fontMedium,
      fontSize: fontSize.size14,
      color: theme.darkGreen,
    },
    dayTextSelected: { color: theme.white },
    dayDisabled: { color: theme.lightGreen2 },
    summary: {
      marginTop: moderateHeightScale(10),
      textAlign: "center",
      fontFamily: fonts.fontMedium,
      fontSize: fontSize.size14,
      color: theme.darkGreen,
    },
  });
