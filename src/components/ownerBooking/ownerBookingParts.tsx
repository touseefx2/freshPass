import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { Feather, MaterialIcons } from "@expo/vector-icons";
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
import { getDefaultAvatarImage } from "@/src/services/remoteConfigService";
import { EveningIcon, MorningIcon, NightIcon } from "@/assets/icons";

/** Rows and chips for the owner's "New appointment" steps. */

/** Same side padding as the flow screens (the date strip bleeds into it). */
const PAGE_PAD = moderateWidthScale(20);
const SLOT_GAP = moderateWidthScale(8);
const SLOT_COLUMNS = 4;
const DATE_CHIP_W = widthScale(54);
const DATE_CHIP_GAP = moderateWidthScale(8);
const STAFF_TILE_GAP = moderateWidthScale(10);
const STAFF_TILE_PAD = moderateWidthScale(6);

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
      gap: SLOT_GAP,
    },
    chip: {
      height: heightScale(44),
      borderRadius: moderateWidthScale(12),
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
      fontSize: fontSize.size14,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      fontVariant: ["tabular-nums"],
    },
    chipTextOn: { color: theme.white },
    chipSkeleton: {
      height: heightScale(44),
      borderRadius: moderateWidthScale(12),
      backgroundColor: theme.lightGreen07,
    },
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

function useSlotWidth() {
  const { width } = useWindowDimensions();
  return Math.floor(
    (width - PAGE_PAD * 2 - SLOT_GAP * (SLOT_COLUMNS - 1)) / SLOT_COLUMNS,
  );
}

/** Four-across time grid, same as the customer "Pick a date & time". */
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
  const slotWidth = useSlotWidth();
  return (
    <View style={styles.chips} accessibilityRole="radiogroup">
      {times.map((time) => {
        const on = time === selected;
        return (
          <TouchableOpacity
            key={time}
            activeOpacity={0.75}
            onPress={() => onSelect(time)}
            style={[styles.chip, { width: slotWidth }, on && styles.chipOn]}
            accessibilityRole="radio"
            accessibilityState={{ selected: on, checked: on }}
          >
            <Text
              style={[styles.chipText, on && styles.chipTextOn]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.85}
            >
              {format(time)}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

/** Grey placeholders while free times load. */
export function TimeChipsSkeleton() {
  const { styles } = useStyles();
  const slotWidth = useSlotWidth();
  return (
    <View style={styles.chips}>
      {Array.from({ length: 8 }, (_, i) => (
        <View key={i} style={[styles.chipSkeleton, { width: slotWidth }]} />
      ))}
    </View>
  );
}

export const SLOT_MINUTE_OPTIONS = [5, 15, 30, 45] as const;
export type SlotMinutes = (typeof SLOT_MINUTE_OPTIONS)[number];
export const DEFAULT_SLOT_MINUTES: SlotMinutes = 30;

const createSlotMenuStyles = (theme: Theme) =>
  StyleSheet.create({
    link: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(2),
      minHeight: heightScale(32),
    },
    linkText: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontMedium,
      color: theme.orangeBrownText,
    },
    // Shadow on the outer view: iOS drops shadows on overflow:hidden views.
    menu: {
      position: "absolute",
      minWidth: widthScale(170),
      borderRadius: moderateWidthScale(14),
      backgroundColor: theme.white,
      shadowColor: theme.darkGreen,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.18,
      shadowRadius: 16,
      elevation: 8,
    },
    menuInner: {
      borderRadius: moderateWidthScale(14),
      borderWidth: 1,
      borderColor: theme.borderNormal,
      overflow: "hidden",
    },
    item: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: moderateWidthScale(12),
      minHeight: heightScale(44),
      paddingHorizontal: moderateWidthScale(16),
    },
    itemBorder: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.borderNormal,
    },
    itemOn: { backgroundColor: theme.upcomingCard },
    itemText: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
      fontVariant: ["tabular-nums"],
    },
    itemTextOn: { fontFamily: fonts.fontBold },
  });

/** "30 min slots ⌄" link with its dropdown, placed under the link. */
export function SlotLengthMenu({
  value,
  onChange,
}: {
  value: SlotMinutes;
  onChange: (minutes: SlotMinutes) => void;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createSlotMenuStyles(theme), [theme]);
  const { width: windowWidth } = useWindowDimensions();
  const linkRef = useRef<View>(null);
  const [anchor, setAnchor] = useState<{ top: number; right: number } | null>(
    null,
  );
  const open = () => {
    // measure (page coords), not measureInWindow: the latter is off by the
    // status bar on edge-to-edge Android.
    linkRef.current?.measure((_x, _y, w, h, pageX, pageY) => {
      setAnchor({
        top: pageY + h + moderateHeightScale(4),
        right: Math.max(PAGE_PAD, windowWidth - (pageX + w)),
      });
    });
  };
  const label = t("bkFlowSlotLength", { count: value });
  return (
    <>
      <TouchableOpacity
        ref={linkRef}
        style={styles.link}
        onPress={open}
        activeOpacity={0.6}
        hitSlop={{ top: 8, bottom: 8, left: 12, right: 8 }}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ expanded: anchor != null }}
      >
        <Text style={styles.linkText}>{label}</Text>
        <MaterialIcons
          name={anchor ? "expand-less" : "expand-more"}
          size={moderateWidthScale(18)}
          color={theme.orangeBrownText}
        />
      </TouchableOpacity>
      <Modal
        visible={anchor != null}
        transparent
        animationType="fade"
        onRequestClose={() => setAnchor(null)}
      >
        <Pressable
          style={StyleSheet.absoluteFillObject}
          onPress={() => setAnchor(null)}
          accessibilityLabel={t("close")}
        />
        {anchor ? (
          <View
            style={[styles.menu, { top: anchor.top, right: anchor.right }]}
            accessibilityRole="menu"
          >
            <View style={styles.menuInner}>
              {SLOT_MINUTE_OPTIONS.map((minutes, index) => {
                const on = value === minutes;
                return (
                  <TouchableOpacity
                    key={minutes}
                    activeOpacity={0.7}
                    style={[
                      styles.item,
                      index > 0 && styles.itemBorder,
                      on && styles.itemOn,
                    ]}
                    onPress={() => {
                      setAnchor(null);
                      if (!on) onChange(minutes);
                    }}
                    accessibilityRole="menuitem"
                    accessibilityState={{ selected: on }}
                  >
                    <Text style={[styles.itemText, on && styles.itemTextOn]}>
                      {t("bkFlowSlotLength", { count: minutes })}
                    </Text>
                    {on ? (
                      <MaterialIcons
                        name="check"
                        size={moderateWidthScale(18)}
                        color={theme.selectCard}
                      />
                    ) : null}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        ) : null}
      </Modal>
    </>
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
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: moderateWidthScale(8),
    },
    arrow: {
      width: widthScale(40),
      height: widthScale(40),
      borderRadius: moderateWidthScale(10),
      borderWidth: 1,
      borderColor: theme.borderNormal,
      backgroundColor: theme.white,
      alignItems: "center",
      justifyContent: "center",
    },
    arrowOff: { opacity: 0.35 },
    month: {
      flex: 1,
      textAlign: "center",
      fontSize: fontSize.size16,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    strip: { marginHorizontal: -PAGE_PAD },
    stripContent: {
      paddingHorizontal: PAGE_PAD,
      gap: DATE_CHIP_GAP,
      paddingVertical: moderateHeightScale(2),
    },
    day: {
      width: DATE_CHIP_W,
      paddingVertical: moderateHeightScale(7),
      borderRadius: moderateWidthScale(14),
      borderWidth: 1.5,
      borderColor: theme.borderLight,
      backgroundColor: theme.white,
      alignItems: "center",
      gap: moderateHeightScale(2),
    },
    dayOn: {
      backgroundColor: theme.orangeBrown30,
      borderColor: theme.selectCard,
    },
    dayOff: {
      opacity: 0.35,
      backgroundColor: "transparent",
    },
    dayName: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontMedium,
      color: theme.lightGreen,
    },
    dayNameOn: {
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    dayNum: {
      fontSize: fontSize.size17,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      fontVariant: ["tabular-nums"],
    },
  });

/**
 * Month header (‹ October 2026 ›) over a scrolling row of that month's days,
 * same as the customer "Pick a date & time". Past and closed days can't be
 * picked; another month jumps to its first open day.
 */
export function DateStrip({
  value,
  onChange,
  isDisabled,
  today: todayProp,
}: {
  value: Dayjs;
  onChange: (date: Dayjs) => void;
  /** Closed days (past days are always off) */
  isDisabled?: (date: Dayjs) => boolean;
  /** The salon's today (defaults to the phone's); earlier days are past */
  today?: Dayjs;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createDateStripStyles(theme), [theme]);
  const today = (todayProp ?? dayjs()).startOf("day");
  const todayKey = today.format("YYYY-MM-DD");
  const isOff = (day: Dayjs) =>
    day.isBefore(today, "day") || !!isDisabled?.(day);

  // Month shown in the strip; follows the picked day.
  const [month, setMonth] = useState(() => value.startOf("month"));
  const valueKey = value.format("YYYY-MM-DD");
  useEffect(() => {
    setMonth(value.startOf("month"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valueKey]);
  const isCurrentMonth = month.isSame(today, "month");

  const days = useMemo(() => {
    const start = isCurrentMonth ? dayjs(todayKey) : month;
    const end = month.endOf("month");
    const list: Dayjs[] = [];
    for (let d = start; !d.isAfter(end, "day"); d = d.add(1, "day")) {
      list.push(d);
    }
    return list;
  }, [month, isCurrentMonth, todayKey]);

  const changeMonth = (delta: 1 | -1) => {
    const next = month.add(delta, "month").startOf("month");
    if (next.isBefore(today, "month")) return;
    let day = next.isSame(today, "month") ? today : next;
    while (day.isSame(next, "month")) {
      if (!isOff(day)) {
        onChange(day);
        return;
      }
      day = day.add(1, "day");
    }
    setMonth(next);
  };

  // Keep the picked day in view.
  const stripRef = useRef<ScrollView>(null);
  useEffect(() => {
    const index = days.findIndex((d) => d.isSame(value, "day"));
    if (index < 0) {
      stripRef.current?.scrollTo({ x: 0, animated: false });
      return;
    }
    const timer = setTimeout(() => {
      stripRef.current?.scrollTo({
        x: Math.max(0, index * (DATE_CHIP_W + DATE_CHIP_GAP) - DATE_CHIP_W),
        animated: true,
      });
    }, 80);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valueKey, days]);

  return (
    <>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => changeMonth(-1)}
          disabled={isCurrentMonth}
          style={[styles.arrow, isCurrentMonth && styles.arrowOff]}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={t("bkFlowPrevMonth")}
          accessibilityState={{ disabled: isCurrentMonth }}
        >
          <Feather
            name="chevron-left"
            size={moderateWidthScale(20)}
            color={theme.darkGreen}
          />
        </TouchableOpacity>
        <Text style={styles.month} accessibilityRole="header">
          {month.format("MMMM YYYY")}
        </Text>
        <TouchableOpacity
          onPress={() => changeMonth(1)}
          style={styles.arrow}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={t("bkFlowNextMonth")}
        >
          <Feather
            name="chevron-right"
            size={moderateWidthScale(20)}
            color={theme.darkGreen}
          />
        </TouchableOpacity>
      </View>
      <ScrollView
        ref={stripRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.strip}
        contentContainerStyle={styles.stripContent}
      >
        {days.map((day) => {
          const on = day.isSame(value, "day");
          const off = isOff(day);
          const isToday = day.isSame(today, "day");
          return (
            <TouchableOpacity
              key={day.format("YYYY-MM-DD")}
              onPress={() => onChange(day)}
              disabled={off}
              activeOpacity={0.75}
              style={[styles.day, on && styles.dayOn, off && styles.dayOff]}
              accessibilityRole="button"
              accessibilityLabel={
                off && !day.isBefore(today, "day")
                  ? `${day.format("dddd, MMMM D")}, ${t("bkFlowClosed")}`
                  : day.format("dddd, MMMM D")
              }
              accessibilityState={{ selected: on, disabled: off }}
            >
              <Text
                style={[styles.dayName, on && styles.dayNameOn]}
                numberOfLines={1}
              >
                {isToday ? t("bkFlowToday") : day.format("ddd")}
              </Text>
              <Text style={styles.dayNum}>{day.format("D")}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </>
  );
}

const createStaffTileStyles = (theme: Theme) =>
  StyleSheet.create({
    grid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: STAFF_TILE_GAP,
    },
    tile: {
      padding: STAFF_TILE_PAD,
      paddingBottom: moderateHeightScale(10),
      borderRadius: moderateWidthScale(18),
      borderWidth: 2,
      borderColor: theme.borderLight,
      backgroundColor: theme.white,
      alignItems: "center",
      gap: moderateHeightScale(2),
    },
    tileOn: {
      borderColor: theme.selectCard,
      backgroundColor: theme.upcomingCard,
    },
    photo: {
      width: "100%",
      height: "100%",
      borderRadius: moderateWidthScale(13),
      backgroundColor: theme.emptyProfileImage,
    },
    check: {
      position: "absolute",
      top: moderateWidthScale(6),
      right: moderateWidthScale(6),
      width: widthScale(24),
      height: widthScale(24),
      borderRadius: widthScale(12),
      backgroundColor: theme.selectCard,
      borderWidth: 2,
      borderColor: theme.white,
      alignItems: "center",
      justifyContent: "center",
    },
    badgeWrap: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: -moderateHeightScale(8),
      alignItems: "center",
    },
    badge: {
      paddingHorizontal: moderateWidthScale(8),
      paddingVertical: moderateHeightScale(2),
      borderRadius: moderateWidthScale(10),
      backgroundColor: theme.selectCard,
      borderWidth: 1.5,
      borderColor: theme.white,
    },
    badgeText: {
      fontSize: fontSize.size10,
      fontFamily: fonts.fontBold,
      color: theme.white,
      letterSpacing: 0.3,
    },
    name: {
      marginTop: moderateHeightScale(10),
      maxWidth: "100%",
      fontSize: fontSize.size14,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      textAlign: "center",
      textTransform: "capitalize",
    },
    sub: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      textAlign: "center",
    },
  });

/** Barber grid, 3 per row (photo, name, experience), like customer "Choose staff". */
export function StaffGrid({
  staff,
  selectedId,
  onSelect,
}: {
  staff: {
    id: number;
    name: string;
    isOwner: boolean;
    image: string | null;
    experience: string | null;
  }[];
  selectedId: number | null;
  onSelect: (id: number) => void;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStaffTileStyles(theme), [theme]);
  const { width } = useWindowDimensions();
  const tileWidth = Math.floor((width - PAGE_PAD * 2 - STAFF_TILE_GAP * 2) / 3);
  const photoSize = tileWidth - STAFF_TILE_PAD * 2 - 4; // minus the 2px border
  const fallbackUri = getDefaultAvatarImage();
  return (
    <View style={styles.grid} accessibilityRole="radiogroup">
      {staff.map((member) => {
        const on = member.id === selectedId;
        const uri = resolveApiImageUrl(member.image) || fallbackUri;
        return (
          <TouchableOpacity
            key={member.id}
            activeOpacity={0.8}
            onPress={() => onSelect(member.id)}
            style={[styles.tile, { width: tileWidth }, on && styles.tileOn]}
            accessibilityRole="radio"
            accessibilityLabel={[
              member.name,
              member.isOwner ? t("owner") : null,
              member.experience,
            ]
              .filter(Boolean)
              .join(", ")}
            accessibilityState={{ selected: on, checked: on }}
          >
            <View style={{ width: photoSize, height: photoSize }}>
              <AppImage
                uri={uri}
                style={styles.photo}
                resizeMode="cover"
                fallback={
                  <AppImage uri={fallbackUri} style={styles.photo} resizeMode="cover" />
                }
              />
              {member.isOwner ? (
                <View style={styles.badgeWrap} pointerEvents="none">
                  <View style={styles.badge}>
                    <Text style={styles.badgeText} numberOfLines={1}>
                      {t("owner")}
                    </Text>
                  </View>
                </View>
              ) : null}
              {on ? (
                <View style={styles.check}>
                  <MaterialIcons
                    name="check"
                    size={moderateWidthScale(14)}
                    color={theme.white}
                  />
                </View>
              ) : null}
            </View>
            <Text style={styles.name} numberOfLines={1}>
              {member.name}
            </Text>
            <Text
              style={styles.sub}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.85}
            >
              {member.experience ?? " "}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
