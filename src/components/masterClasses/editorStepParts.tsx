// Step-specific UI for the 3-step Create / Edit Class editor redesign.
// Step indicator, weekday chips, session summary, review card, deal card.

import React, { useMemo } from "react";
import {
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import dayjs from "dayjs";
import isoWeek from "dayjs/plugin/isoWeek";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  iconScale,
  moderateHeightScale,
  moderateWidthScale,
} from "@/src/theme/dimensions";
import { formatClassPrice } from "@/src/utils/masterClassHelpers";

dayjs.extend(isoWeek);

// ── Types ─────────────────────────────────────────────────────────────

export type EditorStep = 1 | 2 | 3;
export type ClassType = "one_time" | "multi_session";
export type ScheduleType = "weekly" | "specific_dates";
/** ISO weekday: 1 = Mon … 7 = Sun. */
export type Weekday = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export const ALL_WEEKDAYS: Weekday[] = [1, 2, 3, 4, 5, 6, 7];

// ── Lookup tables ─────────────────────────────────────────────────────

const DAY_SHORT: Record<Weekday, string> = {
  1: "Mon",
  2: "Tue",
  3: "Wed",
  4: "Thu",
  5: "Fri",
  6: "Sat",
  7: "Sun",
};

const DAY_PLURAL: Record<Weekday, string> = {
  1: "Mondays",
  2: "Tuesdays",
  3: "Wednesdays",
  4: "Thursdays",
  5: "Fridays",
  6: "Saturdays",
  7: "Sundays",
};

const TZ_MAP: Record<string, string> = {
  "America/New_York": "Eastern Time",
  "America/Chicago": "Central Time",
  "America/Denver": "Mountain Time",
  "America/Los_Angeles": "Pacific Time",
  "America/Anchorage": "Alaska Time",
  "Pacific/Honolulu": "Hawaii Time",
  "America/Phoenix": "Arizona Time",
};

// ── Helper functions ──────────────────────────────────────────────────

/** "Tuesdays & Thursdays" */
export function getWeekdaysText(days: Weekday[]): string {
  const sorted = [...days].sort((a, b) => a - b);
  if (!sorted.length) return "";
  if (sorted.length === 1) return DAY_PLURAL[sorted[0]];
  const last = sorted.pop()!;
  return sorted.map((d) => DAY_PLURAL[d]).join(", ") + " & " + DAY_PLURAL[last];
}

/** "Tue & Thu" */
export function getWeekdaysShort(days: Weekday[]): string {
  const sorted = [...days].sort((a, b) => a - b);
  if (!sorted.length) return "";
  if (sorted.length === 1) return DAY_SHORT[sorted[0]];
  const last = sorted.pop()!;
  return sorted.map((d) => DAY_SHORT[d]).join(", ") + " & " + DAY_SHORT[last];
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
  return TZ_MAP[tz] || tz.replace(/^.*\//, "").replace(/_/g, " ");
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

const STEP_LABELS = ["Schedule", "Enrollment", "Review & Publish"];

export function StepIndicator({
  current,
  onPress,
  style,
}: {
  current: EditorStep;
  onPress?: (step: EditorStep) => void;
  style?: StyleProp<ViewStyle>;
}) {
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
      {STEP_LABELS.map((label, i) => {
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
            accessibilityLabel={`Step ${step}, ${label}`}
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
      accessibilityLabel="Meeting days"
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
            accessibilityLabel={DAY_SHORT[day]}
          >
            <Text style={[s.chipText, on && s.chipTextOn]}>
              {DAY_SHORT[day]}
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
          {sessions} session{sessions !== 1 ? "s" : ""} · {daysText}
          {timeText ? `\n${timeText}` : ""}
        </Text>
      </View>
      {onReview ? (
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={onReview}
          accessibilityRole="link"
          accessibilityLabel="Review session dates"
        >
          <Text style={s.link}>Review session dates</Text>
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
  const { colors } = useTheme();
  const theme = colors as Theme;
  const s = useMemo(() => reviewStyles(theme), [colors]);

  return (
    <View style={[s.card, style]}>
      <Text style={s.title} numberOfLines={2} accessibilityRole="header">
        {title || "Untitled Class"}
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
          accessibilityLabel="Edit details"
          style={s.editLink}
        >
          <Text style={s.editText}>Edit details</Text>
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
        <Text style={s.headerText}>FreshPass Deals placement</Text>
      </View>
      <Text style={s.price}>
        {formatClassPrice(fee)} for {days} days
      </Text>
      <Text style={s.note}>
        Promotion duration is separate from your course schedule.
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
