import React, { useMemo } from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import dayjs, { type Dayjs } from "dayjs";
import { useTranslation } from "react-i18next";
import AppImage from "@/src/components/AppImage";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  heightScale,
  moderateHeightScale,
  moderateWidthScale,
  widthScale,
} from "@/src/theme/dimensions";
import { resolveApiImageUrl } from "@/src/utils/media";
import { EveningIcon, MorningIcon, NightIcon } from "@/assets/icons";

/** Rows and chips for the owner's "New appointment" steps. */

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(12),
      paddingHorizontal: moderateWidthScale(14),
      paddingVertical: moderateHeightScale(12),
      minHeight: heightScale(68),
      borderRadius: moderateWidthScale(16),
      borderWidth: 1.5,
      borderColor: theme.borderLight,
      backgroundColor: theme.white,
    },
    rowOn: {
      borderColor: theme.buttonBack,
      backgroundColor: theme.mintTint,
    },
    avatar: {
      width: widthScale(44),
      height: widthScale(44),
      borderRadius: widthScale(22),
      backgroundColor: theme.emptyProfileImage,
      alignItems: "center",
      justifyContent: "center",
    },
    avatarText: {
      fontSize: fontSize.size17,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    text: { flex: 1, minWidth: 0, gap: moderateHeightScale(2) },
    titleRow: {
      flexDirection: "row",
      alignItems: "center",
      flexWrap: "wrap",
      gap: moderateWidthScale(6),
    },
    title: {
      flexShrink: 1,
      fontSize: fontSize.size17,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    sub: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
    },
    tag: {
      paddingHorizontal: moderateWidthScale(8),
      paddingVertical: moderateHeightScale(2),
      borderRadius: moderateWidthScale(8),
      backgroundColor: theme.orangeBrown30,
    },
    tagText: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontBold,
      color: theme.orangeBrownText,
    },
    tagNeutral: { backgroundColor: theme.lightGreen07 },
    tagNeutralText: { color: theme.darkGreen },
    right: {
      alignItems: "flex-end",
      gap: moderateHeightScale(2),
    },
    rightText: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      fontVariant: ["tabular-nums"],
    },
    mark: {
      width: widthScale(26),
      height: widthScale(26),
      borderWidth: 2,
      borderColor: theme.borderMedium,
      alignItems: "center",
      justifyContent: "center",
    },
    markRound: { borderRadius: widthScale(13) },
    markSquare: { borderRadius: moderateWidthScale(7) },
    markOn: {
      borderColor: theme.buttonBack,
      backgroundColor: theme.buttonBack,
    },
    // Time chips
    chips: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: moderateWidthScale(8),
    },
    chip: {
      minWidth: "30%",
      flexGrow: 1,
      minHeight: heightScale(48),
      borderRadius: moderateWidthScale(14),
      borderWidth: 1.5,
      borderColor: theme.borderNormal,
      backgroundColor: theme.white,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: moderateWidthScale(8),
    },
    chipOn: {
      backgroundColor: theme.darkGreen,
      borderColor: theme.darkGreen,
    },
    chipText: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      fontVariant: ["tabular-nums"],
    },
    chipTextOn: { color: theme.white },
    // Field-like row (date / time)
    field: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(12),
      minHeight: heightScale(60),
      paddingHorizontal: moderateWidthScale(16),
      borderRadius: moderateWidthScale(16),
      borderWidth: 1.5,
      borderColor: theme.borderNormal,
      backgroundColor: theme.white,
    },
    fieldError: { borderColor: theme.red },
    fieldText: { flex: 1, minWidth: 0, gap: moderateHeightScale(1) },
    fieldLabel: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontMedium,
      color: theme.lightGreen,
    },
    fieldValue: {
      fontSize: fontSize.size17,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
  });

function useStyles() {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  return { theme, styles };
}

export function SelectRow({
  title,
  subtitle,
  image,
  initial,
  tag,
  tagTone = "warm",
  right,
  rightSub,
  selected,
  multiple = false,
  onPress,
  accessibilityHint,
  style,
}: {
  title: string;
  subtitle?: string | null;
  /** Avatar photo; falls back to the initial. Pass null to hide the avatar. */
  image?: string | null;
  initial?: string | null;
  tag?: string | null;
  tagTone?: "warm" | "neutral";
  right?: string | null;
  rightSub?: string | null;
  selected: boolean;
  /** Checkbox (several can be picked) instead of a radio. */
  multiple?: boolean;
  onPress: () => void;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const { theme, styles } = useStyles();
  const uri = resolveApiImageUrl(image);
  const showAvatar = image !== undefined || !!initial;
  const letter = (initial ?? title).trim().charAt(0).toUpperCase() || "?";
  const avatarFallback = (
    <View style={styles.avatar}>
      <Text style={styles.avatarText}>{letter}</Text>
    </View>
  );
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      style={[styles.row, selected && styles.rowOn, style]}
      accessibilityRole={multiple ? "checkbox" : "radio"}
      accessibilityState={{ checked: selected }}
      accessibilityLabel={[title, subtitle, tag, right].filter(Boolean).join(", ")}
      accessibilityHint={accessibilityHint}
    >
      {showAvatar ? (
        uri ? (
          <AppImage
            uri={uri}
            style={styles.avatar}
            resizeMode="cover"
            fallback={avatarFallback}
          />
        ) : (
          avatarFallback
        )
      ) : null}
      <View style={styles.text}>
        <View style={styles.titleRow}>
          <Text style={styles.title} numberOfLines={2}>
            {title}
          </Text>
          {tag ? (
            <View style={[styles.tag, tagTone === "neutral" && styles.tagNeutral]}>
              <Text
                style={[
                  styles.tagText,
                  tagTone === "neutral" && styles.tagNeutralText,
                ]}
              >
                {tag}
              </Text>
            </View>
          ) : null}
        </View>
        {subtitle ? (
          <Text style={styles.sub} numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right ? (
        <View style={styles.right}>
          <Text style={styles.rightText}>{right}</Text>
          {rightSub ? <Text style={styles.sub}>{rightSub}</Text> : null}
        </View>
      ) : null}
      <View
        style={[
          styles.mark,
          multiple ? styles.markSquare : styles.markRound,
          selected && styles.markOn,
        ]}
      >
        {selected ? (
          <MaterialIcons
            name="check"
            size={moderateWidthScale(16)}
            color={theme.white}
          />
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

export function TimeChips({
  times,
  selected,
  format,
  onSelect,
}: {
  times: string[];
  selected: string | null;
  format: (time: string) => string;
  onSelect: (time: string) => void;
}) {
  const { styles } = useStyles();
  return (
    <View style={styles.chips} accessibilityRole="radiogroup">
      {times.map((time) => {
        const on = time === selected;
        return (
          <TouchableOpacity
            key={time}
            activeOpacity={0.8}
            onPress={() => onSelect(time)}
            style={[styles.chip, on && styles.chipOn]}
            accessibilityRole="radio"
            accessibilityState={{ checked: on }}
          >
            <Text style={[styles.chipText, on && styles.chipTextOn]}>
              {format(time)}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export type DayPeriod = "morning" | "afternoon" | "evening" | "night";

export const DAY_PERIODS: DayPeriod[] = ["morning", "afternoon", "evening", "night"];

const PERIOD_LABEL_KEYS: Record<DayPeriod, string> = {
  morning: "bkFlowMorning",
  afternoon: "bkFlowAfternoon",
  evening: "bkFlowEvening",
  night: "bkFlowNight",
};

/** Same split as the customer booking flow; times before 5 AM count as morning. */
export function getDayPeriod(time: string): DayPeriod {
  const hours = Number(time.split(":")[0]) || 0;
  if (hours >= 12 && hours < 17) return "afternoon";
  if (hours >= 17 && hours < 20) return "evening";
  if (hours >= 20) return "night";
  return "morning";
}

const createPeriodStyles = (theme: Theme) =>
  StyleSheet.create({
    tabs: {
      flexDirection: "row",
      borderBottomWidth: 1,
      borderBottomColor: theme.lightGreen2,
    },
    tab: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: moderateWidthScale(5),
      minHeight: heightScale(44),
      paddingHorizontal: moderateWidthScale(2),
    },
    tabOff: { opacity: 0.4 },
    icon: { height: moderateHeightScale(18), justifyContent: "center" },
    text: {
      flexShrink: 1,
      fontSize: fontSize.size13,
      fontFamily: fonts.fontBold,
      color: theme.lightGreen,
    },
    textOn: { color: theme.darkGreen },
    underline: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: -1,
      height: 3,
      borderRadius: 2,
      backgroundColor: theme.orangeBrown,
    },
  });

/** Morning / Afternoon / Evening / Night tabs above the time chips. */
export function PeriodTabs({
  value,
  available,
  onChange,
}: {
  value: DayPeriod | null;
  /** Periods that have free times; the others are dimmed. */
  available: DayPeriod[];
  onChange: (period: DayPeriod) => void;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createPeriodStyles(theme), [theme]);
  const icon = (period: DayPeriod) => {
    switch (period) {
      case "morning":
        return (
          <MorningIcon
            width={moderateWidthScale(20)}
            height={moderateHeightScale(14)}
          />
        );
      case "afternoon":
        return (
          <MaterialIcons
            name="wb-sunny"
            size={moderateWidthScale(18)}
            color={theme.darkGreen}
          />
        );
      case "evening":
        return (
          <EveningIcon
            width={moderateWidthScale(20)}
            height={moderateHeightScale(11)}
          />
        );
      case "night":
        return (
          <NightIcon
            width={moderateWidthScale(16)}
            height={moderateHeightScale(16)}
          />
        );
    }
  };
  return (
    <View style={styles.tabs} accessibilityRole="tablist">
      {DAY_PERIODS.map((period) => {
        const hasTimes = available.includes(period);
        const on = value === period;
        return (
          <TouchableOpacity
            key={period}
            activeOpacity={0.7}
            style={[styles.tab, !hasTimes && styles.tabOff]}
            disabled={!hasTimes}
            onPress={() => onChange(period)}
            accessibilityRole="tab"
            accessibilityState={{ selected: on, disabled: !hasTimes }}
          >
            <View style={styles.icon}>{icon(period)}</View>
            <Text
              style={[styles.text, on && styles.textOn]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.8}
            >
              {t(PERIOD_LABEL_KEYS[period])}
            </Text>
            {on ? <View style={styles.underline} /> : null}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

/** Tappable "field" showing a value (date, time) that opens a picker. */
export function PickerField({
  icon,
  label,
  value,
  onPress,
  error = false,
}: {
  icon: keyof typeof MaterialIcons.glyphMap;
  label: string;
  value: string;
  onPress: () => void;
  error?: boolean;
}) {
  const { theme, styles } = useStyles();
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      style={[styles.field, error && styles.fieldError]}
      accessibilityRole="button"
      accessibilityLabel={`${label}, ${value}`}
    >
      <MaterialIcons
        name={icon}
        size={moderateWidthScale(22)}
        color={theme.buttonBack}
      />
      <View style={styles.fieldText}>
        <Text style={styles.fieldLabel}>{label}</Text>
        <Text style={styles.fieldValue}>{value}</Text>
      </View>
      <MaterialIcons
        name="expand-more"
        size={moderateWidthScale(26)}
        color={theme.darkGreen}
      />
    </TouchableOpacity>
  );
}

const createDateStripStyles = (theme: Theme) =>
  StyleSheet.create({
    wrap: { gap: moderateHeightScale(10) },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    arrow: {
      width: widthScale(44),
      height: widthScale(44),
      borderRadius: widthScale(22),
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.white,
      borderWidth: 1,
      borderColor: theme.borderLight,
    },
    arrowOff: { opacity: 0.35 },
    month: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    days: {
      flexDirection: "row",
      gap: moderateWidthScale(6),
    },
    day: {
      flex: 1,
      minHeight: heightScale(62),
      borderRadius: moderateWidthScale(14),
      borderWidth: 1.5,
      borderColor: theme.borderNormal,
      backgroundColor: theme.white,
      alignItems: "center",
      justifyContent: "center",
      gap: moderateHeightScale(2),
    },
    dayOn: {
      backgroundColor: theme.darkGreen,
      borderColor: theme.darkGreen,
    },
    dayOff: { opacity: 0.35 },
    dayName: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontMedium,
      color: theme.lightGreen,
    },
    dayNum: {
      fontSize: fontSize.size18,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      fontVariant: ["tabular-nums"],
    },
    dayTextOn: { color: theme.white },
  });

/** One week of days (Mon–Sun) with arrows; past days can't be picked. */
export function DateStrip({
  value,
  onChange,
}: {
  value: Dayjs;
  onChange: (date: Dayjs) => void;
}) {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createDateStripStyles(theme), [theme]);
  const today = dayjs().startOf("day");
  const [weekStart, setWeekStart] = React.useState(() => {
    const d = value.startOf("day");
    return d.subtract((d.day() + 6) % 7, "day");
  });
  const days = Array.from({ length: 7 }, (_, i) => weekStart.add(i, "day"));
  const canGoBack = weekStart.isAfter(today, "day");
  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <TouchableOpacity
          style={[styles.arrow, !canGoBack && styles.arrowOff]}
          disabled={!canGoBack}
          onPress={() => setWeekStart((w) => w.subtract(7, "day"))}
          accessibilityRole="button"
          accessibilityLabel="Previous week"
        >
          <MaterialIcons
            name="chevron-left"
            size={moderateWidthScale(26)}
            color={theme.darkGreen}
          />
        </TouchableOpacity>
        <Text style={styles.month}>
          {`${days[0].format("MMM D")} – ${days[6].format("MMM D, YYYY")}`}
        </Text>
        <TouchableOpacity
          style={styles.arrow}
          onPress={() => setWeekStart((w) => w.add(7, "day"))}
          accessibilityRole="button"
          accessibilityLabel="Next week"
        >
          <MaterialIcons
            name="chevron-right"
            size={moderateWidthScale(26)}
            color={theme.darkGreen}
          />
        </TouchableOpacity>
      </View>
      <View style={styles.days} accessibilityRole="radiogroup">
        {days.map((day) => {
          const on = day.isSame(value, "day");
          const past = day.isBefore(today, "day");
          return (
            <TouchableOpacity
              key={day.format("YYYY-MM-DD")}
              style={[styles.day, on && styles.dayOn, past && styles.dayOff]}
              disabled={past}
              onPress={() => onChange(day)}
              accessibilityRole="radio"
              accessibilityState={{ checked: on, disabled: past }}
              accessibilityLabel={day.format("dddd, MMMM D")}
            >
              <Text style={[styles.dayName, on && styles.dayTextOn]}>
                {day.format("ddd")}
              </Text>
              <Text style={[styles.dayNum, on && styles.dayTextOn]}>
                {day.format("D")}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}
