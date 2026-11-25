// Step-specific UI for the 3-step Create / Edit Class editor redesign.
// Step indicator, weekday chips, session summary, review card, deal card.

import React, { useMemo, useState } from "react";
import {
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import dayjs from "dayjs";
import isoWeek from "dayjs/plugin/isoWeek";
import i18n from "i18next";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  iconScale,
  moderateHeightScale,
  moderateWidthScale,
} from "@/src/theme/dimensions";
import {
  formatClassPrice,
  formatClassTime,
} from "@/src/utils/masterClassHelpers";
import { salonNow } from "@/src/utils/salonTimezone";

dayjs.extend(isoWeek);

// ── Types ─────────────────────────────────────────────────────────────

export type EditorStep = 1 | 2 | 3;
export type ClassType = "one_time" | "multi_session";
export type ScheduleType = "weekly" | "specific_dates";
/** ISO weekday: 1 = Mon … 7 = Sun. */
export type Weekday = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export const ALL_WEEKDAYS: Weekday[] = [1, 2, 3, 4, 5, 6, 7];

// ── Lookup tables ─────────────────────────────────────────────────────

const tr = (key: string, options?: Record<string, unknown>): string =>
  i18n.isInitialized ? String(i18n.t(key, options as any)) : key;

/** i18n keys for short weekday names. */
const DAY_SHORT: Record<Weekday, string> = {
  1: "mcStepDayMon",
  2: "mcStepDayTue",
  3: "mcStepDayWed",
  4: "mcStepDayThu",
  5: "mcStepDayFri",
  6: "mcStepDaySat",
  7: "mcStepDaySun",
};

/** i18n keys for plural weekday names. */
const DAY_PLURAL: Record<Weekday, string> = {
  1: "mcStepDaysMon",
  2: "mcStepDaysTue",
  3: "mcStepDaysWed",
  4: "mcStepDaysThu",
  5: "mcStepDaysFri",
  6: "mcStepDaysSat",
  7: "mcStepDaysSun",
};

/** i18n keys for known US time zones. */
const TZ_MAP: Record<string, string> = {
  "America/New_York": "mcStepTzEastern",
  "America/Chicago": "mcStepTzCentral",
  "America/Denver": "mcStepTzMountain",
  "America/Los_Angeles": "mcStepTzPacific",
  "America/Anchorage": "mcStepTzAlaska",
  "Pacific/Honolulu": "mcStepTzHawaii",
  "America/Phoenix": "mcStepTzArizona",
};

// ── Helper functions ──────────────────────────────────────────────────

/** "Tuesdays & Thursdays" */
export function getWeekdaysText(days: Weekday[]): string {
  const sorted = [...days].sort((a, b) => a - b);
  if (!sorted.length) return "";
  if (sorted.length === 1) return tr(DAY_PLURAL[sorted[0]]);
  const last = sorted.pop()!;
  return sorted.map((d) => tr(DAY_PLURAL[d])).join(", ") + " & " + tr(DAY_PLURAL[last]);
}

/** "Tue & Thu" */
export function getWeekdaysShort(days: Weekday[]): string {
  const sorted = [...days].sort((a, b) => a - b);
  if (!sorted.length) return "";
  if (sorted.length === 1) return tr(DAY_SHORT[sorted[0]]);
  const last = sorted.pop()!;
  return sorted.map((d) => tr(DAY_SHORT[d])).join(", ") + " & " + tr(DAY_SHORT[last]);
}

/** Count how many sessions fall on `meetingDays` between start and end (inclusive). */
export function calculateWeeklySessions(
  startDate: string | null,
  endDate: string | null,
  meetingDays: Weekday[],
): number {
  if (!startDate || !endDate || !meetingDays.length) return 0;
  const start = dayjs(startDate);
  const end = dayjs(endDate);
  if (!start.isValid() || !end.isValid() || end.isBefore(start)) return 0;
  let count = 0;
  let cur = start;
  while (!cur.isAfter(end, "day")) {
    if (meetingDays.includes(cur.isoWeekday() as Weekday)) count++;
    cur = cur.add(1, "day");
  }
  return count;
}

/** "America/New_York" → "Eastern Time"; unknown → strip prefix + spaces. */
export function getTimezoneLabel(tz: string | null | undefined): string {
  if (!tz) return "";
  return (TZ_MAP[tz] ? tr(TZ_MAP[tz]) : "") || tz.replace(/^.*\//, "").replace(/_/g, " ");
}

/** Given start "HH:mm" + duration in minutes → end time like "7:00 PM". */
export function endTimeText(
  time: string | null,
  duration: number | null,
): string {
  if (!time || !duration) return "";
  const d = dayjs(`2000-01-01T${time.slice(0, 5)}`);
  if (!d.isValid()) return "";
  return d.add(duration, "minute").format("h:mm A");
}

// ── Step Indicator ────────────────────────────────────────────────────

/** i18n keys for the step labels. */
const STEP_LABELS = ["jobSchedule", "mcStepEnrollment", "mcStepReviewPublish"];

export function StepIndicator({
  current,
  onPress,
  style,
}: {
  current: EditorStep;
  onPress?: (step: EditorStep) => void;
  style?: StyleProp<ViewStyle>;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const theme = colors as Theme;
  const s = useMemo(() => indicatorStyles(theme), [colors]);

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={style}
      contentContainerStyle={s.row}
      keyboardShouldPersistTaps="handled"
    >
      {STEP_LABELS.map((labelKey, i) => {
        const label = t(labelKey);
        const step = (i + 1) as EditorStep;
        const active = step === current;
        const past = step < current;
        const future = step > current;
        return (
          <TouchableOpacity
            key={step}
            activeOpacity={0.75}
            onPress={() => onPress?.(step)}
            disabled={!onPress || future}
            style={[
              s.pill,
              active && s.pillActive,
              past && s.pillPast,
            ]}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={t("mcStepA11y", { step, label })}
          >
            {past ? (
              <Ionicons
                name="checkmark"
                size={iconScale(14)}
                color={theme.darkGreen}
                style={s.pillCheck}
              />
            ) : null}
            <Text
              style={[
                s.pillText,
                active && s.pillTextActive,
                past && s.pillTextPast,
              ]}
              numberOfLines={1}
            >
              {past ? label : `${step}. ${label}`}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const indicatorStyles = (theme: Theme) =>
  StyleSheet.create({
    row: {
      flexDirection: "row",
      gap: moderateWidthScale(8),
      paddingHorizontal: moderateWidthScale(20),
      paddingVertical: moderateHeightScale(12),
    },
    pill: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: moderateWidthScale(14),
      paddingVertical: moderateHeightScale(8),
      borderRadius: moderateWidthScale(20),
      borderWidth: 1.5,
      borderColor: theme.borderNormal,
      backgroundColor: theme.white,
    },
    pillActive: {
      backgroundColor: theme.darkGreen,
      borderColor: theme.darkGreen,
    },
    pillPast: {
      backgroundColor: theme.tileMint,
      borderColor: theme.darkGreen,
    },
    pillCheck: {
      marginRight: moderateWidthScale(4),
    },
    pillText: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontMedium,
      color: theme.lightGreen,
    },
    pillTextActive: {
      color: theme.white,
      fontFamily: fonts.fontBold,
    },
    pillTextPast: {
      color: theme.darkGreen,
      fontFamily: fonts.fontMedium,
    },
  });

// ── Weekday Chips ─────────────────────────────────────────────────────

export function WeekdayChips({
  selected,
  onChange,
  style,
}: {
  selected: Weekday[];
  onChange: (days: Weekday[]) => void;
  style?: StyleProp<ViewStyle>;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const theme = colors as Theme;
  const s = useMemo(() => dayStyles(theme), [colors]);

  const toggle = (day: Weekday) => {
    onChange(
      selected.includes(day)
        ? selected.filter((d) => d !== day)
        : [...selected, day],
    );
  };

  return (
    <View
      style={[s.row, style]}
      accessibilityRole="radiogroup"
      accessibilityLabel={t("mcStepMeetingDays")}
    >
      {ALL_WEEKDAYS.map((day) => {
        const on = selected.includes(day);
        return (
          <TouchableOpacity
            key={day}
            activeOpacity={0.7}
            onPress={() => toggle(day)}
            style={[s.chip, on && s.chipOn]}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: on }}
            accessibilityLabel={t(DAY_SHORT[day])}
          >
            <Text style={[s.chipText, on && s.chipTextOn]}>
              {t(DAY_SHORT[day])}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const dayStyles = (theme: Theme) =>
  StyleSheet.create({
    row: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: moderateWidthScale(8),
    },
    chip: {
      minWidth: moderateWidthScale(46),
      paddingHorizontal: moderateWidthScale(12),
      paddingVertical: moderateHeightScale(10),
      borderRadius: moderateWidthScale(10),
      borderWidth: 1,
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
      fontSize: fontSize.size14,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
    },
    chipTextOn: {
      color: theme.white,
      fontFamily: fonts.fontBold,
    },
  });

// ── Session Summary Card ──────────────────────────────────────────────

export function SessionSummaryCard({
  sessions,
  daysText,
  timeText,
  onReview,
  style,
}: {
  sessions: number;
  daysText: string;
  timeText: string;
  onReview?: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const theme = colors as Theme;
  const s = useMemo(() => sessionStyles(theme), [colors]);

  if (sessions <= 0) return null;

  return (
    <View style={[s.card, style]}>
      <View style={s.row}>
        <Ionicons
          name="calendar"
          size={iconScale(18)}
          color={theme.darkGreen}
        />
        <Text style={s.text}>
          {t("mcStepSessionsSummary", { count: sessions, days: daysText })}
          {timeText ? `\n${timeText}` : ""}
        </Text>
      </View>
      {onReview ? (
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={onReview}
          accessibilityRole="link"
          accessibilityLabel={t("mcStepReviewSessionDates")}
        >
          <Text style={s.link}>{t("mcStepReviewSessionDates")}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const sessionStyles = (theme: Theme) =>
  StyleSheet.create({
    card: {
      padding: moderateWidthScale(14),
      borderRadius: moderateWidthScale(12),
      borderWidth: 1,
      borderColor: theme.borderLight,
      backgroundColor: theme.surfaceRaised,
      gap: moderateHeightScale(8),
    },
    row: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: moderateWidthScale(10),
    },
    text: {
      flex: 1,
      fontSize: fontSize.size14,
      lineHeight: fontSize.size14 * 1.5,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
    },
    link: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreenLight,
      textDecorationLine: "underline",
      marginLeft: moderateWidthScale(28),
    },
  });

// ── Review Course Card ────────────────────────────────────────────────

type ReviewMeta = {
  icon: string;
  text: string;
};

export function ReviewCourseCard({
  title,
  meta,
  onEdit,
  style,
}: {
  title: string;
  meta: ReviewMeta[];
  onEdit?: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const theme = colors as Theme;
  const s = useMemo(() => reviewStyles(theme), [colors]);

  return (
    <View style={[s.card, style]}>
      <Text style={s.title} numberOfLines={2} accessibilityRole="header">
        {title || t("mcStepUntitledClass")}
      </Text>
      {meta.map((row, i) => (
        <View key={i} style={s.metaRow}>
          <Ionicons
            name={row.icon as any}
            size={iconScale(16)}
            color={theme.darkGreenLight}
            style={s.metaIcon}
          />
          <Text style={s.metaText} numberOfLines={2}>
            {row.text}
          </Text>
        </View>
      ))}
      {onEdit ? (
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={onEdit}
          accessibilityRole="link"
          accessibilityLabel={t("autoReelEditDetails")}
          style={s.editLink}
        >
          <Text style={s.editText}>{t("autoReelEditDetails")}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const reviewStyles = (theme: Theme) =>
  StyleSheet.create({
    card: {
      padding: moderateWidthScale(16),
      borderRadius: moderateWidthScale(14),
      borderWidth: 1.5,
      borderColor: theme.borderNormal,
      backgroundColor: theme.surfaceRaised,
      gap: moderateHeightScale(8),
    },
    title: {
      fontSize: fontSize.size20,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      marginBottom: moderateHeightScale(4),
    },
    metaRow: {
      flexDirection: "row",
      alignItems: "center",
      minHeight: moderateHeightScale(24),
    },
    metaIcon: {
      marginRight: moderateWidthScale(10),
      width: iconScale(16),
    },
    metaText: {
      flex: 1,
      fontSize: fontSize.size14,
      lineHeight: fontSize.size14 * 1.4,
      fontFamily: fonts.fontRegular,
      color: theme.darkGreen,
    },
    editLink: {
      marginTop: moderateHeightScale(4),
    },
    editText: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreenLight,
      textDecorationLine: "underline",
    },
  });

// ── Deal Placement Card ───────────────────────────────────────────────

export function DealPlacementCard({
  fee,
  days,
  style,
}: {
  fee: number;
  days: number;
  style?: StyleProp<ViewStyle>;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const theme = colors as Theme;
  const s = useMemo(() => dealStyles(theme), [colors]);

  return (
    <View style={[s.card, style]}>
      <View style={s.header}>
        <Ionicons
          name="pricetag"
          size={iconScale(18)}
          color={theme.orangeBrown}
        />
        <Text style={s.headerText}>{t("mcStepDealsPlacement")}</Text>
      </View>
      <Text style={s.price}>
        {t("mcStepDealPrice", { price: formatClassPrice(fee), count: days })}
      </Text>
      <Text style={s.note}>
        {t("mcStepPromotionSeparate")}
      </Text>
    </View>
  );
}

const dealStyles = (theme: Theme) =>
  StyleSheet.create({
    card: {
      padding: moderateWidthScale(16),
      borderRadius: moderateWidthScale(14),
      borderWidth: 1.5,
      borderColor: theme.goldBorder,
      backgroundColor: theme.noticeCream,
      gap: moderateHeightScale(6),
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(8),
    },
    headerText: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    price: {
      fontSize: fontSize.size22,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    note: {
      fontSize: fontSize.size13,
      lineHeight: fontSize.size13 * 1.4,
      fontFamily: fonts.fontRegular,
      color: theme.textMuted,
    },
  });

// ── Multi-Date Calendar ──────────────────────────────────────────────

const DATE_KEY = "YYYY-MM-DD";
const WEEKDAY_LABELS_MON = ALL_WEEKDAYS.map((d) => DAY_SHORT[d]);

export function MultiDateCalendar({
  selected,
  onChange,
  minDate,
  maxDate,
  timeZone,
  style,
}: {
  selected: string[];
  onChange: (dates: string[]) => void;
  minDate?: string;
  maxDate?: string;
  timeZone?: string | null;
  style?: StyleProp<ViewStyle>;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const theme = colors as Theme;
  const s = useMemo(() => calendarStyles(theme), [colors]);

  const today = useMemo(() => {
    const n = salonNow(null, timeZone);
    return n.day;
  }, [timeZone]);

  const min = useMemo(
    () => (minDate && dayjs(minDate).isValid() ? dayjs(minDate) : null),
    [minDate],
  );
  const max = useMemo(
    () => (maxDate && dayjs(maxDate).isValid() ? dayjs(maxDate) : null),
    [maxDate],
  );

  const initialMonth = () => {
    if (selected.length) return dayjs(selected[0]).startOf("month");
    if (min) return min.startOf("month");
    return dayjs(today).startOf("month");
  };
  const [month, setMonth] = useState(() => initialMonth());

  const selectedSet = useMemo(() => new Set(selected), [selected]);

  const days = useMemo(() => {
    const first = month.startOf("month");
    // Monday-first: isoWeekday() 1=Mon … 7=Sun
    const lead = first.isoWeekday() - 1;
    const count = month.daysInMonth();
    const cells: (dayjs.Dayjs | null)[] = [];
    for (let i = 0; i < lead; i += 1) cells.push(null);
    for (let d = 1; d <= count; d += 1) cells.push(first.date(d));
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [month]);

  const isDisabled = (day: dayjs.Dayjs) => {
    if (day.format(DATE_KEY) < today) return true;
    if (min && day.isBefore(min, "day")) return true;
    if (max && day.isAfter(max, "day")) return true;
    return false;
  };

  const toggle = (day: dayjs.Dayjs) => {
    const key = day.format(DATE_KEY);
    if (selectedSet.has(key)) {
      onChange(selected.filter((d) => d !== key));
    } else {
      onChange([...selected, key].sort());
    }
  };

  const canPrev = !min || !month.subtract(1, "month").endOf("month").isBefore(min, "day");
  const canNext = !max || !month.add(1, "month").startOf("month").isAfter(max, "day");

  return (
    <View style={[s.wrapper, style]}>
      <View style={s.monthRow}>
        <TouchableOpacity
          style={[s.arrow, !canPrev && s.arrowOff]}
          onPress={() => canPrev && setMonth((m) => m.subtract(1, "month"))}
          disabled={!canPrev}
          activeOpacity={0.7}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={t("bkFlowPrevMonth")}
        >
          <Ionicons name="chevron-back" size={iconScale(20)} color={theme.darkGreen} />
        </TouchableOpacity>
        <Text style={s.monthText}>{month.format("MMMM YYYY")}</Text>
        <TouchableOpacity
          style={[s.arrow, !canNext && s.arrowOff]}
          onPress={() => canNext && setMonth((m) => m.add(1, "month"))}
          disabled={!canNext}
          activeOpacity={0.7}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={t("bkFlowNextMonth")}
        >
          <Ionicons name="chevron-forward" size={iconScale(20)} color={theme.darkGreen} />
        </TouchableOpacity>
      </View>

      <View style={s.grid}>
        {WEEKDAY_LABELS_MON.map((name) => (
          <Text key={name} style={s.weekday}>
            {t(name)}
          </Text>
        ))}
        {days.map((day, i) =>
          day ? (
            <TouchableOpacity
              key={day.format(DATE_KEY)}
              style={s.cell}
              onPress={() => toggle(day)}
              disabled={isDisabled(day)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityState={{
                selected: selectedSet.has(day.format(DATE_KEY)),
                disabled: isDisabled(day),
              }}
              accessibilityLabel={day.format("dddd, MMMM D, YYYY")}
            >
              <View
                style={[
                  s.dayInner,
                  selectedSet.has(day.format(DATE_KEY)) && s.daySelected,
                  day.format(DATE_KEY) === today &&
                    !selectedSet.has(day.format(DATE_KEY)) &&
                    s.dayToday,
                ]}
              >
                <Text
                  style={[
                    s.dayText,
                    isDisabled(day) && s.dayDisabled,
                    selectedSet.has(day.format(DATE_KEY)) && s.dayTextSelected,
                  ]}
                >
                  {day.date()}
                </Text>
              </View>
            </TouchableOpacity>
          ) : (
            <View key={`e${i}`} style={s.cell} />
          ),
        )}
      </View>
    </View>
  );
}

const calendarStyles = (theme: Theme) =>
  StyleSheet.create({
    wrapper: {
      borderRadius: moderateWidthScale(14),
      borderWidth: 1,
      borderColor: theme.borderNormal,
      backgroundColor: theme.white,
      padding: moderateWidthScale(14),
    },
    monthRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: moderateHeightScale(10),
      paddingHorizontal: moderateWidthScale(4),
    },
    arrow: {
      width: moderateWidthScale(36),
      height: moderateWidthScale(36),
      borderRadius: moderateWidthScale(18),
      alignItems: "center",
      justifyContent: "center",
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
      width: `${100 / 7}%` as any,
      textAlign: "center",
      fontFamily: fonts.fontMedium,
      fontSize: fontSize.size12,
      color: theme.lightGreen,
      paddingVertical: moderateHeightScale(6),
    },
    cell: {
      width: `${100 / 7}%` as any,
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
    daySelected: {
      backgroundColor: theme.darkGreen,
    },
    dayToday: {
      borderWidth: 1.5,
      borderColor: theme.darkGreen,
    },
    dayText: {
      fontFamily: fonts.fontMedium,
      fontSize: fontSize.size14,
      color: theme.darkGreen,
    },
    dayTextSelected: {
      color: theme.white,
      fontFamily: fonts.fontBold,
    },
    dayDisabled: {
      color: theme.lightGreen2,
    },
  });

// ── Selected Date Chips ──────────────────────────────────────────────

export function SelectedDateChips({
  dates,
  onRemove,
  style,
}: {
  dates: string[];
  onRemove: (date: string) => void;
  style?: StyleProp<ViewStyle>;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const theme = colors as Theme;
  const s = useMemo(() => chipStyles(theme), [colors]);

  if (!dates.length) return null;

  return (
    <View style={[s.wrapper, style]}>
      <Text style={s.countText}>
        {t("mcDatesSelected", { count: dates.length })}
      </Text>
      <View style={s.chipsWrap}>
        {dates.map((date) => (
          <TouchableOpacity
            key={date}
            style={s.chip}
            activeOpacity={0.7}
            onPress={() => onRemove(date)}
            accessibilityRole="button"
            accessibilityLabel={t("mcStepRemoveDateA11y", { date: dayjs(date).format("MMM D") })}
          >
            <Text style={s.chipText}>{dayjs(date).format("MMM D")}</Text>
            <Ionicons
              name="close-circle"
              size={iconScale(16)}
              color={theme.lightGreen}
              style={s.chipX}
            />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const chipStyles = (theme: Theme) =>
  StyleSheet.create({
    wrapper: {
      gap: moderateHeightScale(8),
    },
    countText: {
      fontFamily: fonts.fontBold,
      fontSize: fontSize.size14,
      color: theme.successGreen,
    },
    chipsWrap: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: moderateWidthScale(8),
    },
    chip: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: moderateWidthScale(10),
      paddingVertical: moderateHeightScale(6),
      borderRadius: moderateWidthScale(20),
      borderWidth: 1,
      borderColor: theme.borderNormal,
      backgroundColor: theme.white,
    },
    chipText: {
      fontFamily: fonts.fontMedium,
      fontSize: fontSize.size13,
      color: theme.darkGreen,
    },
    chipX: {
      marginLeft: moderateWidthScale(4),
    },
  });

// ── Session Times List ───────────────────────────────────────────────

export function SessionTimesList({
  dates,
  globalTime,
  globalDuration,
  overrides,
  onEdit,
  onAddRemoveDates,
  style,
}: {
  dates: string[];
  globalTime: string | null;
  globalDuration: number | null;
  overrides: Record<string, { time: string | null; duration: number | null }>;
  onEdit?: (date: string) => void;
  onAddRemoveDates?: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const theme = colors as Theme;
  const s = useMemo(() => sessionListStyles(theme), [colors]);

  const timeRange = (time: string | null, duration: number | null): string => {
    if (!time) return "";
    const start = formatClassTime(time);
    const end = endTimeText(time, duration);
    return end ? `${start}–${end}` : start;
  };

  return (
    <View style={[s.wrapper, style]}>
      <Text style={s.heading}>{t("mcYourSessions")}</Text>
      <View style={s.list}>
        {dates.map((date) => {
          const over = overrides[date];
          const time = over?.time ?? globalTime;
          const duration = over?.duration ?? globalDuration;
          const Row = onEdit ? TouchableOpacity : View;
          const rowProps = onEdit
            ? {
                activeOpacity: 0.7,
                onPress: () => onEdit(date),
                accessibilityRole: "button" as const,
                accessibilityLabel: t("mcStepEditSessionA11y", { date: dayjs(date).format("ddd, MMM D") }),
              }
            : {};
          return (
            <Row
              key={date}
              style={s.row}
              {...rowProps}
            >
              <Ionicons
                name="calendar-outline"
                size={iconScale(18)}
                color={theme.darkGreen}
              />
              <Text style={s.dateText}>{dayjs(date).format("ddd, MMM D")}</Text>
              <Text style={s.timeText}>{timeRange(time, duration)}</Text>
              {onEdit ? (
                <MaterialCommunityIcons
                  name="pencil"
                  size={iconScale(20)}
                  color={theme.darkGreen}
                  style={s.editIcon}
                />
              ) : null}
            </Row>
          );
        })}
      </View>
      {onAddRemoveDates ? (
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={onAddRemoveDates}
          style={s.addRemove}
          accessibilityRole="link"
          accessibilityLabel={t("mcStepAddRemoveDatesA11y")}
        >
          <Text style={s.addRemoveText}>{t("mcAddOrRemoveDates")}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const sessionListStyles = (theme: Theme) =>
  StyleSheet.create({
    wrapper: {
      gap: moderateHeightScale(10),
    },
    heading: {
      fontFamily: fonts.fontBold,
      fontSize: fontSize.size17,
      color: theme.darkGreen,
    },
    list: {
      gap: moderateHeightScale(8),
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: moderateWidthScale(14),
      paddingVertical: moderateHeightScale(13),
      borderRadius: moderateWidthScale(28),
      backgroundColor: theme.white,
      borderWidth: 1,
      borderColor: theme.borderLight,
    },
    dateText: {
      flex: 1,
      fontFamily: fonts.fontMedium,
      fontSize: fontSize.size14,
      color: theme.darkGreen,
      marginLeft: moderateWidthScale(10),
    },
    timeText: {
      fontFamily: fonts.fontRegular,
      fontSize: fontSize.size14,
      color: theme.darkGreen,
    },
    editIcon: {
      marginLeft: moderateWidthScale(8),
    },
    addRemove: {
      alignSelf: "center",
      paddingTop: moderateHeightScale(2),
    },
    addRemoveText: {
      fontFamily: fonts.fontMedium,
      fontSize: fontSize.size14,
      color: theme.darkGreenLight,
      textDecorationLine: "underline",
    },
  });
