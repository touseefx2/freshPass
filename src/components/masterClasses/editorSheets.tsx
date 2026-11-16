// Bottom sheets for the class editor: option list (type / duration),
// date (month strip, past days off) and time (period tabs + chips).

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import dayjs, { type Dayjs } from "dayjs";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  heightScale,
  iconScale,
  moderateHeightScale,
  moderateWidthScale,
  widthScale,
} from "@/src/theme/dimensions";
import {
  DateStrip,
  DAY_PERIODS,
  getDayPeriod,
  PeriodTabs,
  TimeChips,
  type DayPeriod,
} from "@/src/components/ownerBooking/ownerBookingParts";
import type { IoniconName } from "@/src/components/masterClasses/parts";
import {
  DURATION_OPTIONS,
  formatClassTime,
  formatDuration,
} from "@/src/utils/masterClassHelpers";
import { endTimeText, getTimezoneLabel } from "@/src/components/masterClasses/editorStepParts";
import { salonNow } from "@/src/utils/salonTimezone";

const useSheetStyles = () => {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);
  return { theme, styles };
};

// ── Base sheet ──────────────────────────────────────────────────────

export function EditorSheet({
  visible,
  title,
  subtitle,
  onClose,
  children,
  footer,
  scroll = false,
}: {
  visible: boolean;
  title: string;
  subtitle?: string | null;
  onClose: () => void;
  children: React.ReactNode;
  /** Pinned under the content (e.g. a Done button). */
  footer?: React.ReactNode;
  /** Long content scrolls inside the sheet. */
  scroll?: boolean;
}) {
  const { t } = useTranslation();
  const { theme, styles } = useSheetStyles();
  // useSafeAreaInsets, not SafeAreaView: inside a Modal the latter reads 0 on first open
  const insets = useSafeAreaInsets();
  const bottomPad = insets.bottom + moderateHeightScale(12);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel={t("close")}
        />
        <View style={[styles.sheet, { paddingBottom: bottomPad }]}>
          <View style={styles.handle} />
          <View style={styles.head}>
            <View style={styles.headText}>
              <Text style={styles.title} accessibilityRole="header">
                {title}
              </Text>
              {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={styles.close}
              activeOpacity={0.7}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={t("close")}
            >
              <Ionicons name="close" size={iconScale(20)} color={theme.darkGreen} />
            </TouchableOpacity>
          </View>
          {scroll ? (
            <ScrollView
              style={styles.scroll}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {children}
            </ScrollView>
          ) : (
            <View style={styles.body}>{children}</View>
          )}
          {footer ? <View style={styles.footer}>{footer}</View> : null}
        </View>
      </View>
    </Modal>
  );
}

function SheetPrimaryButton({
  label,
  onPress,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  const { styles } = useSheetStyles();
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      disabled={disabled}
      style={[styles.primary, disabled && styles.primaryDisabled]}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      accessibilityLabel={label}
    >
      <Text style={styles.primaryText}>{label}</Text>
    </TouchableOpacity>
  );
}

// ── Option list (class type / duration) ─────────────────────────────

export type EditorSheetOption<T> = {
  value: T;
  label: string;
  description?: string;
  icon?: IoniconName;
};

export function EditorOptionSheet<T extends string | number>({
  visible,
  title,
  subtitle,
  options,
  selected,
  onSelect,
  onClose,
}: {
  visible: boolean;
  title: string;
  subtitle?: string | null;
  options: EditorSheetOption<T>[];
  selected: T | null;
  onSelect: (value: T) => void;
  onClose: () => void;
}) {
  const { theme, styles } = useSheetStyles();
  return (
    <EditorSheet
      visible={visible}
      title={title}
      subtitle={subtitle}
      onClose={onClose}
      scroll={options.length > 6}
    >
      <View style={styles.options} accessibilityRole="radiogroup">
        {options.map((option, index) => {
          const on = option.value === selected;
          return (
            <TouchableOpacity
              key={String(option.value)}
              activeOpacity={0.7}
              onPress={() => onSelect(option.value)}
              style={[
                styles.option,
                index > 0 && styles.optionBorder,
                on && styles.optionOn,
              ]}
              accessibilityRole="radio"
              accessibilityState={{ selected: on, checked: on }}
              accessibilityLabel={
                option.description
                  ? `${option.label}, ${option.description}`
                  : option.label
              }
            >
              {option.icon ? (
                <View style={[styles.optionIcon, on && styles.optionIconOn]}>
                  <Ionicons
                    name={option.icon}
                    size={iconScale(18)}
                    color={on ? theme.white : theme.darkGreen}
                  />
                </View>
              ) : null}
              <View style={styles.optionBody}>
                <Text style={[styles.optionText, on && styles.optionTextOn]}>
                  {option.label}
                </Text>
                {option.description ? (
                  <Text style={styles.optionSub}>{option.description}</Text>
                ) : null}
              </View>
              {on ? (
                <Ionicons
                  name="checkmark-circle"
                  size={iconScale(22)}
                  color={theme.darkGreen}
                />
              ) : (
                <View style={styles.optionDot} />
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </EditorSheet>
  );
}

// ── Date ────────────────────────────────────────────────────────────

const DATE_KEY = "YYYY-MM-DD";

export function EditorDateSheet({
  visible,
  value,
  timeZone,
  minDate,
  onConfirm,
  onClose,
}: {
  visible: boolean;
  /** "YYYY-MM-DD" (business clock) or null. */
  value: string | null;
  /** Class's zone: "today" follows the salon clock (phone clock when unknown). */
  timeZone?: string | null;
  /** "YYYY-MM-DD" — earliest selectable date (e.g. start date for end date picker). */
  minDate?: string;
  onConfirm: (date: string) => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const { theme, styles } = useSheetStyles();
  const salonToday = (): Dayjs => salonNow(null, timeZone).today;
  const initial = (): Dayjs => {
    const today = salonToday();
    const floor = minDate ? dayjs(minDate) : today;
    const earliest = floor.isValid() && floor.isAfter(today, "day") ? floor : today;
    const parsed = value ? dayjs(value) : null;
    return parsed && parsed.isValid() && !parsed.isBefore(earliest, "day")
      ? parsed
      : earliest;
  };
  const [date, setDate] = useState<Dayjs>(initial);

  useEffect(() => {
    if (visible) setDate(initial());
    // Reset only when the sheet opens
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  return (
    <EditorSheet
      visible={visible}
      title={t("mcSelectDate")}
      onClose={onClose}
      footer={
        <SheetPrimaryButton
          label={t("done")}
          onPress={() => onConfirm(date.format(DATE_KEY))}
        />
      }
    >
      <View style={styles.dateBody}>
        <DateStrip
          value={date}
          onChange={setDate}
          today={salonToday()}
          isDisabled={minDate ? (day) => {
            const m = dayjs(minDate);
            return m.isValid() && day.isBefore(m, "day");
          } : undefined}
        />
        <View style={styles.summary} accessibilityLiveRegion="polite">
          <Ionicons
            name="calendar"
            size={iconScale(18)}
            color={theme.successGreen}
          />
          <Text style={styles.summaryText}>
            {date.format("dddd, MMMM D, YYYY")}
          </Text>
        </View>
      </View>
    </EditorSheet>
  );
}

// ── Time ────────────────────────────────────────────────────────────

/** The whole day in 15-minute steps; the period tabs split it up. */
const BASE_TIMES: string[] = (() => {
  const out: string[] = [];
  for (let h = 0; h < 24; h += 1) {
    for (let m = 0; m < 60; m += 15) {
      out.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    }
  }
  return out;
})();

/** Times before this show under "Early hours" in the morning tab. */
const EARLY_CUTOFF = "05:00";

export function EditorTimeSheet({
  visible,
  value,
  date,
  timeZone,
  onConfirm,
  onClose,
}: {
  visible: boolean;
  /** "HH:mm" or null. */
  value: string | null;
  /** Chosen date; when it is today, times already passed are hidden. */
  date: string | null;
  /** Class's zone: "today" / "passed" follow the salon clock (phone when unknown). */
  timeZone?: string | null;
  onConfirm: (time: string) => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const { styles } = useSheetStyles();
  const [time, setTime] = useState<string | null>(value);
  const [period, setPeriod] = useState<DayPeriod | null>(null);

  const times = useMemo(() => {
    const list = [...BASE_TIMES];
    // Keep an off-grid saved time (e.g. 10:10) selectable
    if (value && !list.includes(value)) {
      list.push(value);
      list.sort();
    }
    if (date) {
      const now = salonNow(null, timeZone);
      const day = date.slice(0, 10);
      if (day === now.day) {
        // A little lead time so the pick is still ahead when saved
        return list.filter((slot) => {
          const [h, m] = slot.split(":").map(Number);
          return h * 60 + m > now.minutes + 15;
        });
      }
    }
    return list;
    // `visible`: re-read the clock each time the sheet opens
  }, [date, value, timeZone, visible]);

  const available = useMemo(
    () => DAY_PERIODS.filter((p) => times.some((slot) => getDayPeriod(slot) === p)),
    [times],
  );

  useEffect(() => {
    if (!visible) return;
    setTime(value);
    const start = value ? getDayPeriod(value) : null;
    setPeriod(
      start && available.includes(start)
        ? start
        : available.includes("morning")
          ? "morning"
          : (available[0] ?? null),
    );
    // Reset only when the sheet opens
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const shown = period ? times.filter((slot) => getDayPeriod(slot) === period) : [];
  // Morning lists 5 AM on first; the rare early starts sit under their own label
  const early = period === "morning" ? shown.filter((slot) => slot < EARLY_CUTOFF) : [];
  const regular = early.length ? shown.filter((slot) => slot >= EARLY_CUTOFF) : shown;

  return (
    <EditorSheet
      visible={visible}
      title={t("mcSelectTime")}
      onClose={onClose}
      footer={
        <SheetPrimaryButton
          label={time ? `${t("done")} · ${formatClassTime(time)}` : t("done")}
          disabled={!time}
          onPress={() => time && onConfirm(time)}
        />
      }
    >
      {available.length ? (
        <View style={styles.timeBody}>
          <PeriodTabs value={period} available={available} onChange={setPeriod} />
          <ScrollView
            keyboardShouldPersistTaps="handled"
            style={styles.timeScroll}
            contentContainerStyle={styles.timeScrollContent}
            showsVerticalScrollIndicator={false}
          >
            {regular.length ? (
              <TimeChips
                times={regular}
                selected={time}
                format={formatClassTime}
                onSelect={setTime}
              />
            ) : null}
            {early.length ? (
              <>
                <Text
                  style={[styles.earlyLabel, !regular.length && styles.earlyLabelFirst]}
                  accessibilityRole="header"
                >
                  {t("mcEarlyHours")}
                </Text>
                <TimeChips
                  times={early}
                  selected={time}
                  format={formatClassTime}
                  onSelect={setTime}
                />
              </>
            ) : null}
          </ScrollView>
        </View>
      ) : (
        <Text style={styles.emptyText}>{t("mcNoTimesLeftToday")}</Text>
      )}
    </EditorSheet>
  );
}

// ── Wheel Time Picker ──────────────────────────────────────────────

const WHEEL_ITEM_H = moderateHeightScale(52);
const WHEEL_VISIBLE = 5;
const WHEEL_PAD = WHEEL_ITEM_H * 2;

const HOURS = Array.from({ length: 12 }, (_, i) => i + 1);
const MINUTES = [0, 15, 30, 45];
const AMPM = ["AM", "PM"];

const padTwo = (n: number) => String(n).padStart(2, "0");

function parseHHmm(value: string | null): {
  hourIdx: number;
  minuteIdx: number;
  ampmIdx: number;
} {
  if (!value) return { hourIdx: 8, minuteIdx: 0, ampmIdx: 0 };
  const [hStr, mStr] = value.split(":");
  const h24 = parseInt(hStr, 10) || 0;
  const m = parseInt(mStr, 10) || 0;
  const h12 = h24 % 12 || 12;
  const ampmIdx = h24 >= 12 ? 1 : 0;
  let minuteIdx = MINUTES.indexOf(m);
  if (minuteIdx < 0) {
    minuteIdx = MINUTES.reduce(
      (best, v, i) => (Math.abs(v - m) < Math.abs(MINUTES[best] - m) ? i : best),
      0,
    );
  }
  return { hourIdx: h12 - 1, minuteIdx, ampmIdx };
}

function toHHmm(hourIdx: number, minuteIdx: number, ampmIdx: number): string {
  const h12 = HOURS[hourIdx] ?? 9;
  const m = MINUTES[minuteIdx] ?? 0;
  const h24 = ampmIdx === 0 ? (h12 === 12 ? 0 : h12) : h12 === 12 ? 12 : h12 + 12;
  return `${padTwo(h24)}:${padTwo(m)}`;
}

function WheelColumn({
  items,
  selectedIdx,
  onSelect,
}: {
  items: readonly string[];
  selectedIdx: number;
  onSelect: (idx: number) => void;
}) {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const ws = useMemo(() => createWheelStyles(theme), [colors]);
  const scrollRef = useRef<ScrollView>(null);
  const ignoreNext = useRef(false);

  // Position on mount only — the `key` prop on the columns container
  // remounts this component when the sheet opens, so [] deps is correct.
  useEffect(() => {
    const t = setTimeout(() => {
      scrollRef.current?.scrollTo({ y: selectedIdx * WHEEL_ITEM_H, animated: false });
    }, 50);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleScrollEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (ignoreNext.current) { ignoreNext.current = false; return; }
      const y = e.nativeEvent.contentOffset.y;
      const idx = Math.round(y / WHEEL_ITEM_H);
      const clamped = Math.max(0, Math.min(items.length - 1, idx));
      onSelect(clamped);
      const target = clamped * WHEEL_ITEM_H;
      if (Math.abs(y - target) > 2) {
        ignoreNext.current = true;
        scrollRef.current?.scrollTo({ y: target, animated: true });
      }
    },
    [items.length, onSelect],
  );

  const tapItem = useCallback(
    (i: number) => {
      ignoreNext.current = true;
      onSelect(i);
      scrollRef.current?.scrollTo({ y: i * WHEEL_ITEM_H, animated: true });
    },
    [onSelect],
  );

  return (
    <View style={ws.column}>
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        snapToInterval={WHEEL_ITEM_H}
        decelerationRate={0.993}
        onMomentumScrollEnd={handleScrollEnd}
        onScrollEndDrag={handleScrollEnd}
        contentContainerStyle={{ paddingVertical: WHEEL_PAD }}
        nestedScrollEnabled
        keyboardShouldPersistTaps="always"
      >
        {items.map((item, i) => {
          const dist = Math.abs(i - selectedIdx);
          const opacity = dist === 0 ? 1 : dist === 1 ? 0.55 : dist === 2 ? 0.25 : 0.12;
          const isCenter = dist === 0;
          return (
            <TouchableOpacity
              key={`${item}-${i}`}
              style={ws.item}
              activeOpacity={0.7}
              onPress={() => tapItem(i)}
            >
              <Text style={[isCenter ? ws.itemTextCenter : ws.itemText, { opacity }]}>
                {item}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

export function WheelTimePickerSheet({
  visible,
  value,
  onConfirm,
  onClose,
}: {
  visible: boolean;
  value: string | null;
  onConfirm: (time: string) => void;
  onClose: () => void;
}) {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const ws = useMemo(() => createWheelStyles(theme), [colors]);

  const initial = parseHHmm(value);
  const [hourIdx, setHourIdx] = useState(initial.hourIdx);
  const [minuteIdx, setMinuteIdx] = useState(initial.minuteIdx);
  const [ampmIdx, setAmpmIdx] = useState(initial.ampmIdx);
  const [key, setKey] = useState(0);

  useEffect(() => {
    if (visible) {
      const p = parseHHmm(value);
      setHourIdx(p.hourIdx);
      setMinuteIdx(p.minuteIdx);
      setAmpmIdx(p.ampmIdx);
      setKey((k) => k + 1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const hourItems = useMemo(() => HOURS.map((h) => padTwo(h)), []);
  const minuteItems = useMemo(() => MINUTES.map((m) => padTwo(m)), []);
  const ampmItems = useMemo(() => [...AMPM], []);

  const result = toHHmm(hourIdx, minuteIdx, ampmIdx);

  return (
    <EditorSheet
      visible={visible}
      title="Select Time"
      onClose={onClose}
      footer={
        <SheetPrimaryButton
          label={`Done · ${formatClassTime(result)}`}
          onPress={() => onConfirm(result)}
        />
      }
    >
      <View style={ws.headers}>
        <Text style={ws.headerText}>Hour</Text>
        <Text style={ws.headerText}>Minute</Text>
        <Text style={ws.headerText}>AM/PM</Text>
      </View>
      <View style={ws.pickerArea}>
        <View style={ws.highlightBand} pointerEvents="none">
          <View style={ws.highlightInner} />
        </View>
        <View style={ws.colonWrap}>
          <Text style={ws.colon}>:</Text>
        </View>
        <View style={ws.columns} key={key}>
          <WheelColumn
            items={hourItems}
            selectedIdx={hourIdx}
            onSelect={setHourIdx}
          />
          <WheelColumn
            items={minuteItems}
            selectedIdx={minuteIdx}
            onSelect={setMinuteIdx}
          />
          <WheelColumn
            items={ampmItems}
            selectedIdx={ampmIdx}
            onSelect={setAmpmIdx}
          />
        </View>
      </View>
    </EditorSheet>
  );
}

// ── Edit Session Sheet ─────────────────────────────────────────────

export function EditSessionSheet({
  visible,
  date,
  time,
  duration,
  timeZone,
  onSave,
  onRemove,
  onClose,
  onPickTime,
  onPickDuration,
}: {
  visible: boolean;
  date: string;
  time: string | null;
  duration: number | null;
  timeZone?: string | null;
  onSave: (time: string | null, duration: number | null) => void;
  onRemove: () => void;
  onClose: () => void;
  onPickTime: () => void;
  onPickDuration: () => void;
}) {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const es = useMemo(() => createEditSessionStyles(theme), [colors]);

  const dateLabel = date ? dayjs(date).format("ddd, MMM D, YYYY") : "";
  const endLabel = endTimeText(time, duration);
  const tzLabel = getTimezoneLabel(timeZone);
  const helperText =
    endLabel && tzLabel
      ? `Ends at ${endLabel} • ${tzLabel}`
      : endLabel
        ? `Ends at ${endLabel}`
        : tzLabel || "";

  return (
    <EditorSheet
      visible={visible}
      title="Edit session"
      onClose={onClose}
      scroll
      footer={
        <View style={es.footer}>
          <SheetPrimaryButton
            label="Save Changes"
            onPress={() => onSave(time, duration)}
          />
          <TouchableOpacity
            onPress={onRemove}
            style={es.removeBtn}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Remove session"
          >
            <Text style={es.removeText}>Remove session</Text>
          </TouchableOpacity>
        </View>
      }
    >
      <View style={es.body}>
        <View style={es.field}>
          <Text style={es.label}>
            Date<Text style={es.required}> *</Text>
          </Text>
          <View style={es.readOnlyBox}>
            <Ionicons
              name="calendar-outline"
              size={iconScale(18)}
              color={theme.darkGreen}
            />
            <Text style={es.readOnlyText}>{dateLabel}</Text>
          </View>
        </View>

        <View style={es.row}>
          <View style={es.rowCol}>
            <Text style={es.label}>
              Start time<Text style={es.required}> *</Text>
            </Text>
            <TouchableOpacity
              style={es.pickerBox}
              activeOpacity={0.75}
              onPress={onPickTime}
              accessibilityRole="button"
              accessibilityLabel="Start time"
            >
              <Ionicons
                name="time-outline"
                size={iconScale(18)}
                color={time ? theme.darkGreen : theme.lightGreen}
              />
              <Text
                style={[es.pickerText, !time && es.placeholder]}
                numberOfLines={1}
              >
                {time ? formatClassTime(time) : "Select"}
              </Text>
            </TouchableOpacity>
          </View>
          <View style={es.rowCol}>
            <Text style={es.label}>
              Session duration<Text style={es.required}> *</Text>
            </Text>
            <TouchableOpacity
              style={es.pickerBox}
              activeOpacity={0.75}
              onPress={onPickDuration}
              accessibilityRole="button"
              accessibilityLabel="Session duration"
            >
              <Text
                style={[es.pickerText, !duration && es.placeholder]}
                numberOfLines={1}
              >
                {duration ? formatDuration(duration) : "Select"}
              </Text>
              <Ionicons
                name="chevron-down"
                size={iconScale(18)}
                color={theme.darkGreen}
              />
            </TouchableOpacity>
          </View>
        </View>

        {helperText ? (
          <Text style={es.helperText}>{helperText}</Text>
        ) : null}

        <View style={es.notice}>
          <Ionicons
            name="information-circle-outline"
            size={iconScale(18)}
            color={theme.goldTextDark}
          />
          <Text style={es.noticeText}>
            Changes apply only to this session.
          </Text>
        </View>
      </View>
    </EditorSheet>
  );
}

// ── Wheel styles ───────────────────────────────────────────────────

const createWheelStyles = (theme: Theme) =>
  StyleSheet.create({
    headers: {
      flexDirection: "row",
      justifyContent: "space-around",
      marginBottom: moderateHeightScale(4),
    },
    headerText: {
      flex: 1,
      textAlign: "center",
      fontSize: fontSize.size14,
      fontFamily: fonts.fontMedium,
      color: theme.lightGreen,
    },
    pickerArea: {
      height: WHEEL_ITEM_H * WHEEL_VISIBLE,
      overflow: "hidden",
    },
    highlightBand: {
      position: "absolute",
      left: 0,
      right: 0,
      top: WHEEL_ITEM_H * 2,
      height: WHEEL_ITEM_H,
      justifyContent: "center",
      zIndex: 0,
    },
    highlightInner: {
      flex: 1,
      backgroundColor: theme.tileMint,
      borderTopWidth: 1.5,
      borderBottomWidth: 1.5,
      borderColor: theme.goldBorder,
      borderRadius: moderateWidthScale(12),
      marginHorizontal: moderateWidthScale(8),
    },
    colonWrap: {
      position: "absolute",
      left: 0,
      width: "66.66%",
      top: WHEEL_ITEM_H * 2,
      height: WHEEL_ITEM_H,
      justifyContent: "center",
      alignItems: "center",
      zIndex: 2,
      pointerEvents: "none",
    },
    colon: {
      fontSize: fontSize.size28 ?? 28,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    columns: {
      flexDirection: "row",
      flex: 1,
      zIndex: 1,
    },
    column: {
      flex: 1,
    },
    item: {
      height: WHEEL_ITEM_H,
      alignItems: "center",
      justifyContent: "center",
    },
    itemText: {
      fontSize: fontSize.size20,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
    },
    itemTextCenter: {
      fontSize: fontSize.size28 ?? 28,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
  });

// ── Edit session styles ────────────────────────────────────────────

const createEditSessionStyles = (theme: Theme) =>
  StyleSheet.create({
    body: {
      gap: moderateHeightScale(16),
    },
    field: {
      gap: moderateHeightScale(7),
    },
    label: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    required: {
      color: theme.red ?? "#c00",
      fontFamily: fonts.fontBold,
    },
    readOnlyBox: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(10),
      minHeight: heightScale(48),
      borderRadius: moderateWidthScale(10),
      borderWidth: 1,
      borderColor: theme.borderNormal,
      backgroundColor: theme.tileMint,
      paddingHorizontal: moderateWidthScale(12),
    },
    readOnlyText: {
      flex: 1,
      fontSize: fontSize.size15,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
    },
    row: {
      flexDirection: "row",
      gap: moderateWidthScale(12),
    },
    rowCol: {
      flex: 1,
      gap: moderateHeightScale(7),
    },
    pickerBox: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(8),
      minHeight: heightScale(48),
      borderRadius: moderateWidthScale(10),
      borderWidth: 1,
      borderColor: theme.borderNormal,
      backgroundColor: theme.white,
      paddingHorizontal: moderateWidthScale(12),
    },
    pickerText: {
      flex: 1,
      fontSize: fontSize.size15,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
    },
    placeholder: {
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen5,
    },
    helperText: {
      fontSize: fontSize.size13,
      lineHeight: fontSize.size13 * 1.4,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
    },
    notice: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: moderateWidthScale(10),
      padding: moderateWidthScale(12),
      borderRadius: moderateWidthScale(12),
      borderWidth: 1,
      borderColor: theme.goldBorder,
      backgroundColor: theme.noticeCream,
    },
    noticeText: {
      flex: 1,
      fontSize: fontSize.size14,
      lineHeight: fontSize.size14 * 1.4,
      fontFamily: fonts.fontMedium,
      color: theme.goldTextDark,
    },
    footer: {
      gap: moderateHeightScale(12),
    },
    removeBtn: {
      alignItems: "center",
      paddingVertical: moderateHeightScale(10),
    },
    removeText: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontBold,
      color: theme.red ?? "#c00",
    },
  });

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      justifyContent: "flex-end",
      backgroundColor: theme.lightGreen5,
    },
    sheet: {
      maxHeight: "88%",
      backgroundColor: theme.background,
      borderTopLeftRadius: moderateWidthScale(24),
      borderTopRightRadius: moderateWidthScale(24),
      paddingHorizontal: moderateWidthScale(20),
      paddingTop: moderateHeightScale(10),
    },
    handle: {
      alignSelf: "center",
      width: widthScale(44),
      height: heightScale(5),
      borderRadius: heightScale(3),
      backgroundColor: theme.lightGreen2,
      marginBottom: moderateHeightScale(12),
    },
    head: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: moderateWidthScale(12),
      marginBottom: moderateHeightScale(14),
    },
    headText: {
      flex: 1,
      gap: moderateHeightScale(4),
    },
    title: {
      fontSize: fontSize.size20,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    subtitle: {
      fontSize: fontSize.size14,
      lineHeight: fontSize.size14 * 1.4,
      fontFamily: fonts.fontRegular,
      color: theme.textMuted,
    },
    close: {
      width: widthScale(40),
      height: widthScale(40),
      borderRadius: widthScale(20),
      backgroundColor: theme.lightGreen07,
      alignItems: "center",
      justifyContent: "center",
    },
    body: {},
    scroll: {
      flexGrow: 0,
    },
    scrollContent: {
      paddingBottom: moderateHeightScale(4),
    },
    footer: {
      paddingTop: moderateHeightScale(14),
    },
    primary: {
      minHeight: heightScale(52),
      borderRadius: moderateWidthScale(14),
      backgroundColor: theme.darkGreen,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: moderateWidthScale(16),
    },
    primaryDisabled: {
      opacity: 0.45,
    },
    primaryText: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontBold,
      color: theme.white,
    },
    // Options
    options: {
      borderRadius: moderateWidthScale(14),
      borderWidth: 1,
      borderColor: theme.borderLight,
      backgroundColor: theme.white,
      overflow: "hidden",
    },
    option: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(12),
      minHeight: heightScale(54),
      paddingHorizontal: moderateWidthScale(14),
      paddingVertical: moderateHeightScale(10),
    },
    optionBorder: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.borderNormal,
    },
    optionOn: {
      backgroundColor: theme.tileMint,
    },
    optionIcon: {
      width: moderateWidthScale(36),
      height: moderateWidthScale(36),
      borderRadius: moderateWidthScale(18),
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.lightGreen07,
    },
    optionIconOn: {
      backgroundColor: theme.darkGreen,
    },
    optionBody: {
      flex: 1,
      minWidth: 0,
      gap: moderateHeightScale(2),
    },
    optionText: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
    },
    optionTextOn: {
      fontFamily: fonts.fontBold,
    },
    optionSub: {
      fontSize: fontSize.size13,
      lineHeight: fontSize.size13 * 1.35,
      fontFamily: fonts.fontRegular,
      color: theme.textMuted,
    },
    optionDot: {
      width: iconScale(20),
      height: iconScale(20),
      borderRadius: iconScale(10),
      borderWidth: 1.5,
      borderColor: theme.lightGreen4,
      marginRight: iconScale(1),
    },
    // Date
    dateBody: {
      gap: moderateHeightScale(14),
    },
    summary: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(10),
      padding: moderateWidthScale(14),
      borderRadius: moderateWidthScale(14),
      backgroundColor: theme.tileMint,
    },
    summaryText: {
      flex: 1,
      fontSize: fontSize.size15,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    // Time
    timeBody: {
      gap: moderateHeightScale(14),
    },
    timeScroll: {
      maxHeight: heightScale(260),
    },
    timeScrollContent: {
      paddingBottom: moderateHeightScale(4),
    },
    earlyLabel: {
      marginTop: moderateHeightScale(16),
      marginBottom: moderateHeightScale(8),
      fontSize: fontSize.size13,
      fontFamily: fonts.fontBold,
      color: theme.lightGreen,
    },
    earlyLabelFirst: {
      marginTop: 0,
    },
    emptyText: {
      fontSize: fontSize.size15,
      lineHeight: fontSize.size15 * 1.4,
      fontFamily: fonts.fontRegular,
      color: theme.textMuted,
      textAlign: "center",
      paddingVertical: moderateHeightScale(24),
    },
  });
