/**
 * Calendar → Post a Deal on a time the salon isn't open: says why in one line
 * and shows that day's hours, so the owner picks a time that works (11-06).
 */
import React, { useMemo } from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useTranslation } from "react-i18next";
import { MaterialIcons } from "@expo/vector-icons";
import dayjs from "dayjs";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  iconScale,
  moderateHeightScale,
  moderateWidthScale,
  widthScale,
} from "@/src/theme/dimensions";
import Button from "@/src/components/button";
import { formatSlotTime, type SlotProblem } from "@/src/utils/dealSlotCheck";

const ICON: Record<SlotProblem["kind"], keyof typeof MaterialIcons.glyphMap> = {
  passed: "history",
  closedDay: "event-busy",
  outsideHours: "schedule",
  staffOff: "person-off",
  staffOutsideHours: "person-off",
  break: "free-breakfast",
  serviceTooLong: "timelapse",
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: moderateWidthScale(24),
    },
    card: {
      width: "100%",
      maxWidth: widthScale(360),
      backgroundColor: theme.white,
      borderRadius: moderateWidthScale(24),
      paddingHorizontal: moderateWidthScale(22),
      paddingTop: moderateHeightScale(26),
      paddingBottom: moderateHeightScale(14),
      alignItems: "center",
      shadowColor: theme.shadow,
      shadowOffset: { width: 0, height: moderateHeightScale(8) },
      shadowOpacity: 0.15,
      shadowRadius: moderateWidthScale(20),
      elevation: 8,
    },
    iconCircle: {
      width: moderateWidthScale(64),
      height: moderateWidthScale(64),
      borderRadius: moderateWidthScale(32),
      backgroundColor: theme.orangeBrown015,
      borderWidth: 1,
      borderColor: theme.orangeBrown30,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: moderateHeightScale(14),
    },
    title: {
      fontSize: fontSize.size20,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      textAlign: "center",
    },
    chip: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(6),
      marginTop: moderateHeightScale(10),
      paddingHorizontal: moderateWidthScale(12),
      paddingVertical: moderateHeightScale(6),
      borderRadius: moderateWidthScale(20),
      backgroundColor: theme.orangeBrown015,
    },
    chipText: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontBold,
      color: theme.orangeBrownText,
    },
    message: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      textAlign: "center",
      lineHeight: fontSize.size22,
      marginTop: moderateHeightScale(12),
    },
    hoursBox: {
      alignSelf: "stretch",
      marginTop: moderateHeightScale(16),
      backgroundColor: theme.background,
      borderRadius: moderateWidthScale(14),
      borderWidth: 1,
      borderColor: theme.lightGreen015,
      paddingHorizontal: moderateWidthScale(14),
      paddingVertical: moderateHeightScale(12),
      gap: moderateHeightScale(8),
    },
    hoursLabel: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontMedium,
      color: theme.lightGreen5,
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    hoursRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(8),
    },
    hoursKey: {
      flex: 1,
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
    },
    hoursValue: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    hoursClosed: {
      color: theme.red,
    },
    hint: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen5,
      textAlign: "center",
      marginTop: moderateHeightScale(14),
    },
    buttons: {
      alignSelf: "stretch",
      marginTop: moderateHeightScale(18),
      gap: moderateHeightScale(2),
    },
    primary: {
      borderRadius: moderateWidthScale(14),
      height: moderateHeightScale(50),
    },
    cancel: {
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: moderateHeightScale(12),
    },
    cancelText: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontMedium,
      color: theme.lightGreen,
    },
  });

type Props = {
  /** null hides the popup */
  block: { date: string; time: string; problem: SlotProblem } | null;
  onClose: () => void;
  onPickAnother: () => void;
};

export default function DealSlotBlockedModal({ block, onClose, onPickAnother }: Props) {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();

  const problem = block?.problem;
  const hoursOf = problem?.hoursOf;
  const day = hoursOf?.day;
  const isClosed = !!day && (day.closed || !day.open || !day.close);

  return (
    <Modal
      transparent
      visible={!!block}
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        {block && problem ? (
          <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
            <View style={styles.iconCircle}>
              <MaterialIcons
                name={ICON[problem.kind]}
                size={iconScale(30)}
                color={theme.selectCard}
              />
            </View>

            <Text style={styles.title}>{problem.title}</Text>

            <View style={styles.chip}>
              <MaterialIcons
                name="event-busy"
                size={iconScale(14)}
                color={theme.orangeBrownText}
              />
              <Text style={styles.chipText}>
                {`${dayjs(block.date).format("ddd, MMM D")} · ${formatSlotTime(block.time)}`}
              </Text>
            </View>

            <Text style={styles.message}>{problem.message}</Text>

            {day ? (
              <View style={styles.hoursBox}>
                <Text style={styles.hoursLabel}>
                  {hoursOf?.who === "staff"
                    ? t("sdBlockStaffHours", {
                        name: hoursOf.name ?? "",
                        day: problem.dayName,
                      })
                    : t("sdBlockSalonHours", { day: problem.dayName })}
                </Text>
                <View style={styles.hoursRow}>
                  <MaterialIcons
                    name="schedule"
                    size={iconScale(16)}
                    color={theme.lightGreen}
                  />
                  <Text style={styles.hoursKey}>{t("sdBlockOpen")}</Text>
                  <Text style={[styles.hoursValue, isClosed && styles.hoursClosed]}>
                    {isClosed
                      ? t("sdBlockClosed")
                      : `${formatSlotTime(day.open!)} – ${formatSlotTime(day.close!)}`}
                  </Text>
                </View>
                {!isClosed &&
                  day.breaks.map((b) => (
                    <View key={`${b.start}-${b.end}`} style={styles.hoursRow}>
                      <MaterialIcons
                        name="free-breakfast"
                        size={iconScale(16)}
                        color={theme.lightGreen}
                      />
                      <Text style={styles.hoursKey}>{t("sdBlockBreak")}</Text>
                      <Text style={styles.hoursValue}>
                        {`${formatSlotTime(b.start)} – ${formatSlotTime(b.end)}`}
                      </Text>
                    </View>
                  ))}
              </View>
            ) : null}

            <Text style={styles.hint}>{t("sdBlockHint")}</Text>

            <View style={styles.buttons}>
              <Button
                title={t("sdPickAnotherTime")}
                onPress={onPickAnother}
                containerStyle={styles.primary}
                backgroundColor={theme.darkGreen}
              />
              <TouchableOpacity
                style={styles.cancel}
                onPress={onClose}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelText}>{t("cancel")}</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        ) : null}
      </Pressable>
    </Modal>
  );
}
