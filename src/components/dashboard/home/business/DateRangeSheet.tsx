import React, { useEffect, useMemo, useState } from "react";
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import dayjs from "dayjs";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  iconScale,
  moderateHeightScale,
  moderateWidthScale,
} from "@/src/theme/dimensions";
import {
  businessToday,
  formatPeriodRange,
  type DashboardPeriod,
} from "@/src/utils/dashboardPeriod";

const DATE_FORMAT = "YYYY-MM-DD";
const CELL = moderateWidthScale(42);

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.45)",
      justifyContent: "flex-end",
    },
    sheet: {
      backgroundColor: theme.background,
      borderTopLeftRadius: moderateWidthScale(24),
      borderTopRightRadius: moderateWidthScale(24),
      paddingTop: moderateHeightScale(8),
      paddingHorizontal: moderateWidthScale(20),
    },
    grabber: {
      alignSelf: "center",
      width: moderateWidthScale(40),
      height: 4,
      borderRadius: 2,
      backgroundColor: theme.lightGreen2,
      marginBottom: moderateHeightScale(10),
    },
    headerRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: moderateHeightScale(4),
    },
    title: {
      fontSize: fontSize.size18,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    closeButton: {
      width: moderateWidthScale(36),
      height: moderateWidthScale(36),
      borderRadius: moderateWidthScale(18),
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.lightGreen07,
    },
    hint: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      marginBottom: moderateHeightScale(14),
    },
    monthRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: moderateHeightScale(8),
    },
    monthLabel: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    navButton: {
      width: moderateWidthScale(40),
      height: moderateWidthScale(40),
      borderRadius: moderateWidthScale(12),
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.white,
      borderWidth: 1,
      borderColor: theme.borderLight,
    },
    weekRow: {
      flexDirection: "row",
      justifyContent: "space-between",
    },
    weekDay: {
      width: CELL,
      textAlign: "center",
      fontSize: fontSize.size12,
      fontFamily: fonts.fontMedium,
      color: theme.lightGreen5,
      paddingVertical: moderateHeightScale(6),
    },
    gridRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: moderateHeightScale(2),
    },
    cellWrap: {
      width: CELL,
      height: CELL,
      alignItems: "center",
      justifyContent: "center",
    },
    band: {
      ...StyleSheet.absoluteFillObject,
      top: moderateHeightScale(3),
      bottom: moderateHeightScale(3),
      backgroundColor: theme.lightGreen1,
    },
    bandStart: {
      left: CELL / 2,
    },
    bandEnd: {
      right: CELL / 2,
    },
    day: {
      width: CELL - moderateWidthScale(6),
      height: CELL - moderateWidthScale(6),
      borderRadius: (CELL - moderateWidthScale(6)) / 2,
      alignItems: "center",
      justifyContent: "center",
    },
    dayEdge: {
      backgroundColor: theme.darkGreen,
    },
    dayToday: {
      borderWidth: 1,
      borderColor: theme.darkGreen,
    },
    dayText: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
    },
    dayTextEdge: {
      color: theme.white,
      fontFamily: fonts.fontBold,
    },
    footer: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(12),
      marginTop: moderateHeightScale(14),
      paddingTop: moderateHeightScale(14),
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.borderNormal,
    },
    summary: {
      flex: 1,
      fontSize: fontSize.size14,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    applyButton: {
      height: moderateHeightScale(46),
      paddingHorizontal: moderateWidthScale(28),
      borderRadius: moderateWidthScale(12),
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.darkGreen,
    },
    applyButtonDisabled: {
      opacity: 0.4,
    },
    applyText: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontBold,
      color: theme.white,
    },
  });

type Props = {
  visible: boolean;
  period: DashboardPeriod;
  onClose: () => void;
  onApply: (range: { from: string; to: string }) => void;
};

/** Month grid; Monday first, like the This Week tab. */
function buildMonthGrid(month: dayjs.Dayjs): Array<Array<dayjs.Dayjs | null>> {
  const first = month.startOf("month");
  const leading = (first.day() + 6) % 7;
  const days = month.daysInMonth();
  const cells: Array<dayjs.Dayjs | null> = [];
  for (let i = 0; i < leading; i += 1) cells.push(null);
  for (let d = 0; d < days; d += 1) cells.push(first.add(d, "day"));
  while (cells.length % 7 !== 0) cells.push(null);
  const rows: Array<Array<dayjs.Dayjs | null>> = [];
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));
  return rows;
}

export default function DateRangeSheet({
  visible,
  period,
  onClose,
  onApply,
}: Props) {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  const [start, setStart] = useState<string | null>(null);
  const [end, setEnd] = useState<string | null>(null);
  const [month, setMonth] = useState(() => businessToday().startOf("month"));

  useEffect(() => {
    if (!visible) return;
    // Reopen on the range in use
    setStart(period.from);
    setEnd(period.to);
    setMonth(dayjs(period.to, DATE_FORMAT).startOf("month"));
  }, [visible, period.from, period.to]);

  const today = businessToday().format(DATE_FORMAT);
  const rows = useMemo(() => buildMonthGrid(month), [month]);
  const weekDays = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) =>
        dayjs().day((i + 1) % 7).format("dd"),
      ),
    [],
  );

  const handleDayPress = (day: string) => {
    if (!start || end) {
      setStart(day);
      setEnd(null);
      return;
    }
    if (day < start) {
      setEnd(start);
      setStart(day);
      return;
    }
    setEnd(day);
  };

  const rangeFrom = start;
  const rangeTo = end ?? start;
  const summary =
    rangeFrom && rangeTo
      ? formatPeriodRange({ key: "custom", from: rangeFrom, to: rangeTo })
      : "";

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <TouchableWithoutFeedback onPress={onClose} accessible={false}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback accessible={false}>
            <View
              style={[
                styles.sheet,
                { paddingBottom: Math.max(insets.bottom, moderateHeightScale(16)) },
              ]}
            >
              <View style={styles.grabber} />
              <View style={styles.headerRow}>
                <Text style={styles.title} accessibilityRole="header">
                  {t("bhSelectDates")}
                </Text>
                <TouchableOpacity
                  onPress={onClose}
                  style={styles.closeButton}
                  accessibilityRole="button"
                  accessibilityLabel={t("close")}
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                >
                  <Feather name="x" size={iconScale(18)} color={theme.darkGreen} />
                </TouchableOpacity>
              </View>
              <Text style={styles.hint}>{t("bhRangeHint")}</Text>

              <View style={styles.monthRow}>
                <TouchableOpacity
                  style={styles.navButton}
                  onPress={() => setMonth((m) => m.subtract(1, "month"))}
                  accessibilityRole="button"
                  accessibilityLabel={month.subtract(1, "month").format("MMMM YYYY")}
                >
                  <Feather
                    name="chevron-left"
                    size={iconScale(18)}
                    color={theme.darkGreen}
                  />
                </TouchableOpacity>
                <Text style={styles.monthLabel}>{month.format("MMMM YYYY")}</Text>
                <TouchableOpacity
                  style={styles.navButton}
                  onPress={() => setMonth((m) => m.add(1, "month"))}
                  accessibilityRole="button"
                  accessibilityLabel={month.add(1, "month").format("MMMM YYYY")}
                >
                  <Feather
                    name="chevron-right"
                    size={iconScale(18)}
                    color={theme.darkGreen}
                  />
                </TouchableOpacity>
              </View>

              <View style={styles.weekRow}>
                {weekDays.map((label, i) => (
                  <Text key={`${label}-${i}`} style={styles.weekDay}>
                    {label}
                  </Text>
                ))}
              </View>

              {rows.map((row, rowIndex) => (
                <View key={rowIndex} style={styles.gridRow}>
                  {row.map((cell, cellIndex) => {
                    if (!cell) {
                      return (
                        <View key={`e-${cellIndex}`} style={styles.cellWrap} />
                      );
                    }
                    const key = cell.format(DATE_FORMAT);
                    const isStart = key === rangeFrom;
                    const isEnd = key === rangeTo;
                    const isEdge = isStart || isEnd;
                    const inRange =
                      !!rangeFrom &&
                      !!rangeTo &&
                      rangeFrom !== rangeTo &&
                      key >= rangeFrom &&
                      key <= rangeTo;
                    return (
                      <TouchableOpacity
                        key={key}
                        style={styles.cellWrap}
                        activeOpacity={0.7}
                        onPress={() => handleDayPress(key)}
                        accessibilityRole="button"
                        accessibilityLabel={cell.format("dddd, MMMM D, YYYY")}
                        accessibilityState={{ selected: isEdge || inRange }}
                      >
                        {inRange ? (
                          <View
                            style={[
                              styles.band,
                              isStart && styles.bandStart,
                              isEnd && styles.bandEnd,
                            ]}
                          />
                        ) : null}
                        <View
                          style={[
                            styles.day,
                            key === today && !isEdge && styles.dayToday,
                            isEdge && styles.dayEdge,
                          ]}
                        >
                          <Text
                            style={[styles.dayText, isEdge && styles.dayTextEdge]}
                          >
                            {cell.format("D")}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ))}

              <View style={styles.footer}>
                <Text style={styles.summary} numberOfLines={1}>
                  {summary}
                </Text>
                <TouchableOpacity
                  activeOpacity={0.8}
                  disabled={!rangeFrom}
                  onPress={() => {
                    if (rangeFrom && rangeTo) {
                      onApply({ from: rangeFrom, to: rangeTo });
                    }
                  }}
                  style={[styles.applyButton, !rangeFrom && styles.applyButtonDisabled]}
                  accessibilityRole="button"
                  accessibilityState={{ disabled: !rangeFrom }}
                >
                  <Text style={styles.applyText}>{t("bhApply")}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}
