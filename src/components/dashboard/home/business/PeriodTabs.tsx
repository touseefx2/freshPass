import React, { useMemo } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Feather } from "@expo/vector-icons";
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
  formatPeriodRange,
  type DashboardPeriod,
  type DashboardPeriodKey,
} from "@/src/utils/dashboardPeriod";

const TAB_HEIGHT = moderateHeightScale(42);

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(8),
    },
    tab: {
      flex: 1,
      height: TAB_HEIGHT,
      borderRadius: moderateWidthScale(12),
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.lightGreen07,
      paddingHorizontal: moderateWidthScale(6),
    },
    tabSelected: {
      backgroundColor: theme.darkGreen,
    },
    tabText: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
    },
    tabTextSelected: {
      fontFamily: fonts.fontBold,
      color: theme.white,
    },
    calendarButton: {
      width: TAB_HEIGHT + moderateWidthScale(4),
      height: TAB_HEIGHT,
      borderRadius: moderateWidthScale(12),
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.white,
      borderWidth: 1,
      borderColor: theme.borderNormal,
    },
    calendarButtonActive: {
      backgroundColor: theme.darkGreen,
      borderColor: theme.darkGreen,
    },
    rangeChip: {
      flexDirection: "row",
      alignItems: "center",
      alignSelf: "flex-start",
      gap: moderateWidthScale(6),
      marginTop: moderateHeightScale(10),
      paddingLeft: moderateWidthScale(12),
      paddingRight: moderateWidthScale(6),
      height: moderateHeightScale(32),
      borderRadius: moderateWidthScale(999),
      backgroundColor: theme.darkGreen,
    },
    rangeChipText: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontMedium,
      color: theme.white,
    },
    rangeChipClear: {
      width: moderateWidthScale(22),
      height: moderateWidthScale(22),
      borderRadius: moderateWidthScale(11),
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.white15,
    },
  });

const TABS: Array<{ key: Exclude<DashboardPeriodKey, "custom">; label: string }> = [
  { key: "today", label: "bhToday" },
  { key: "week", label: "bhThisWeek" },
  { key: "month", label: "bhThisMonth" },
];

type Props = {
  period: DashboardPeriod;
  onSelect: (key: Exclude<DashboardPeriodKey, "custom">) => void;
  /** Shown at the end of the row when set (home). Transactions puts it in its title row. */
  onCalendarPress?: () => void;
};

export function CalendarRangeButton({
  active,
  onPress,
}: {
  active: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);
  const { t } = useTranslation();
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      style={[styles.calendarButton, active && styles.calendarButtonActive]}
      accessibilityRole="button"
      accessibilityLabel={t("bhPickDates")}
      accessibilityState={{ selected: active }}
    >
      <Feather
        name="calendar"
        size={iconScale(20)}
        color={active ? theme.white : theme.darkGreen}
      />
    </TouchableOpacity>
  );
}

export default function PeriodTabs({ period, onSelect, onCalendarPress }: Props) {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);
  const { t } = useTranslation();
  const isCustom = period.key === "custom";

  return (
    <View>
      <View style={styles.row} accessibilityRole="tablist">
        {TABS.map((tab) => {
          const selected = period.key === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              activeOpacity={0.75}
              onPress={() => onSelect(tab.key)}
              style={[styles.tab, selected && styles.tabSelected]}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
            >
              <Text
                style={[styles.tabText, selected && styles.tabTextSelected]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.85}
              >
                {t(tab.label)}
              </Text>
            </TouchableOpacity>
          );
        })}
        {onCalendarPress ? (
          <CalendarRangeButton active={isCustom} onPress={onCalendarPress} />
        ) : null}
      </View>

      {isCustom ? (
        <View style={styles.rangeChip}>
          <Feather name="calendar" size={iconScale(13)} color={theme.white} />
          <Text style={styles.rangeChipText} numberOfLines={1}>
            {formatPeriodRange(period)}
          </Text>
          <TouchableOpacity
            onPress={() => onSelect("today")}
            style={styles.rangeChipClear}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityRole="button"
            accessibilityLabel={t("bhClearRange")}
          >
            <Feather name="x" size={iconScale(13)} color={theme.white} />
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );
}
