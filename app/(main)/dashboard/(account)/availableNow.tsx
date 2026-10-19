import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useTranslation } from "react-i18next";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { useAppSelector, useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  moderateHeightScale,
  moderateWidthScale,
} from "@/src/theme/dimensions";
import StackHeader from "@/src/components/StackHeader";
import Button from "@/src/components/button";
import CustomToggle from "@/src/components/customToggle";
import TimePickerModal from "@/src/components/timePickerModal";
import { formatServicePrice } from "@/src/components/availableNow/AvailableNowCard";
import { useNotificationContext } from "@/src/contexts/NotificationContext";
import Logger from "@/src/services/logger";
import {
  getMyAvailableNow,
  saveMyAvailableNow,
} from "@/src/services/availableNowService";
import {
  fetchReelServiceOptions,
  type ReelServiceOption,
} from "@/src/services/reelServicesOptions";
import type {
  AvailableNowMe,
  AvailableNowMode,
  SaveAvailableNowPayload,
} from "@/src/types/availableNow";
import {
  formatSalonOpening,
  getAvailableNowBadge,
  parseSalonTime,
  salonNowMinutes,
} from "@/src/utils/availableNow";

const DURATION_OPTIONS = [30, 60, 90, 120, 180, 240];
const DEFAULT_DURATION = 120;

/** Manual start: now (send nothing), a set salon time (next opening / saved window), or a picked time today */
type StartChoice =
  | { kind: "now" }
  | { kind: "at"; startAt: string; label: string }
  | { kind: "time"; hours: number; minutes: number };

/** Salon clock "15:30" for today, "2026-10-20 09:00" for a later day — what PUT start_at takes. */
function toStartAt(iso: string | null | undefined): string | null {
  const clock = parseSalonTime(iso);
  if (!clock) return null;
  const pad = (n: number) => String(n).padStart(2, "0");
  const w = clock.wall;
  const hm = `${pad(w.getHours())}:${pad(w.getMinutes())}`;
  return clock.dayOffset === 0
    ? hm
    : `${w.getFullYear()}-${pad(w.getMonth() + 1)}-${pad(w.getDate())} ${hm}`;
}

function formatHM(hours: number, minutes: number): string {
  const period = hours >= 12 ? "PM" : "AM";
  const h = hours % 12 === 0 ? 12 : hours % 12;
  return `${h}:${String(minutes).padStart(2, "0")} ${period}`;
}

function formatDuration(minutes: number, t: (k: string, o?: any) => string) {
  if (minutes < 60) return t("anDurationMinutes", { minutes });
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest > 0
    ? t("anDurationHoursMinutes", { hours, minutes: rest })
    : t("anDurationHours", { hours });
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    content: {
      flex: 1,
    },
    contentContainer: {
      paddingHorizontal: moderateWidthScale(20),
      paddingVertical: moderateHeightScale(24),
    },
    titleSection: {
      marginBottom: moderateHeightScale(20),
    },
    title: {
      fontSize: fontSize.size28,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      marginBottom: moderateHeightScale(8),
    },
    helpText: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen5,
      lineHeight: fontSize.size20,
    },
    statusCard: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: moderateWidthScale(12),
      backgroundColor: theme.white,
      borderRadius: moderateWidthScale(12),
      borderWidth: 1,
      borderColor: theme.lightGreen2,
      paddingHorizontal: moderateWidthScale(14),
      paddingVertical: moderateHeightScale(14),
      marginBottom: moderateHeightScale(16),
    },
    statusDot: {
      width: moderateWidthScale(10),
      height: moderateWidthScale(10),
      borderRadius: moderateWidthScale(5),
      marginTop: moderateHeightScale(5),
      backgroundColor: theme.lightGreen2,
    },
    statusDotAvailable: {
      backgroundColor: theme.green,
    },
    statusDotBusy: {
      backgroundColor: theme.orangeBrown,
    },
    statusTextCol: {
      flex: 1,
      gap: moderateHeightScale(4),
    },
    statusTitle: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    statusSub: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen5,
      lineHeight: fontSize.size18,
    },
    switchRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: moderateWidthScale(12),
      backgroundColor: theme.white,
      borderRadius: moderateWidthScale(12),
      borderWidth: 1,
      borderColor: theme.lightGreen2,
      paddingHorizontal: moderateWidthScale(14),
      paddingVertical: moderateHeightScale(14),
    },
    switchTextCol: {
      flex: 1,
      gap: moderateHeightScale(2),
    },
    switchLabel: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    switchHint: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen5,
      lineHeight: fontSize.size16,
    },
    sectionLabel: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      marginTop: moderateHeightScale(24),
      marginBottom: moderateHeightScale(8),
    },
    sectionHint: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen5,
      marginTop: moderateHeightScale(-2),
      marginBottom: moderateHeightScale(10),
      lineHeight: fontSize.size18,
    },
    optionRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: moderateHeightScale(14),
      paddingHorizontal: moderateWidthScale(14),
      borderRadius: moderateWidthScale(12),
      borderWidth: 1,
      borderColor: theme.lightGreen2,
      backgroundColor: theme.white,
      marginBottom: moderateHeightScale(10),
    },
    optionRowSelected: {
      borderColor: theme.buttonBack,
      backgroundColor: theme.lightGreen05,
    },
    radioOuter: {
      width: moderateWidthScale(20),
      height: moderateWidthScale(20),
      borderRadius: moderateWidthScale(10),
      borderWidth: 1.5,
      borderColor: theme.lightGreen2,
      alignItems: "center",
      justifyContent: "center",
      marginRight: moderateWidthScale(12),
    },
    radioOuterSelected: {
      borderColor: theme.buttonBack,
    },
    radioInner: {
      width: moderateWidthScale(10),
      height: moderateWidthScale(10),
      borderRadius: moderateWidthScale(5),
      backgroundColor: theme.buttonBack,
    },
    optionTextCol: {
      flex: 1,
      gap: moderateHeightScale(2),
    },
    optionTitle: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
    },
    optionHint: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen5,
    },
    chipsWrap: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: moderateWidthScale(8),
    },
    chip: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(4),
      paddingHorizontal: moderateWidthScale(14),
      paddingVertical: moderateHeightScale(9),
      borderRadius: moderateWidthScale(20),
      borderWidth: 1,
      borderColor: theme.lightGreen2,
      backgroundColor: theme.white,
    },
    chipSelected: {
      backgroundColor: theme.darkGreen,
      borderColor: theme.darkGreen,
    },
    chipText: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
    },
    chipTextSelected: {
      color: theme.white,
    },
    emptyText: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen5,
    },
    errorText: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.red,
      marginTop: moderateHeightScale(8),
      lineHeight: fontSize.size17,
    },
    footer: {
      paddingHorizontal: moderateWidthScale(20),
      paddingBottom: moderateHeightScale(24),
      paddingTop: moderateHeightScale(16),
    },
    loadingWrap: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
    },
  });

/** Owner / staff controls for their own Available Now at their business. */
export default function AvailableNowSettingsScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { showBanner } = useNotificationContext();
  const user = useAppSelector((state) => state.user);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState<AvailableNowMe | null>(null);
  const [services, setServices] = useState<ReelServiceOption[]>([]);
  const [servicesLoading, setServicesLoading] = useState(true);

  const [enabled, setEnabled] = useState(false);
  const [mode, setMode] = useState<AvailableNowMode>("calendar");
  const [serviceId, setServiceId] = useState<number | null>(null);
  const [start, setStart] = useState<StartChoice>({ kind: "now" });
  const [duration, setDuration] = useState(DEFAULT_DURATION);
  const [startError, setStartError] = useState<string | null>(null);
  const [timePickerVisible, setTimePickerVisible] = useState(false);

  const status = data?.status ?? null;
  const timeZone = status?.timezone ?? null;
  const nextOpeningAt =
    status?.status === "unavailable" ? status.next_opening_at : null;
  const nextOpeningStartAt = toStartAt(nextOpeningAt);
  const nextOpeningLabel = formatSalonOpening(nextOpeningAt, t);

  const applyResponse = useCallback((res: AvailableNowMe) => {
    setData(res);
    const s = res.settings;
    setEnabled(!!s.enabled);
    setMode(s.mode === "manual" ? "manual" : "calendar");
    setServiceId(s.service_id ?? null);
    if (s.mode === "manual" && s.manual_starts_at && s.manual_ends_at) {
      const from = parseSalonTime(s.manual_starts_at);
      const to = parseSalonTime(s.manual_ends_at);
      if (from && to) {
        const length = Math.round((to.epochMs - from.epochMs) / 60_000);
        if (length >= 15) setDuration(length);
        const startAt = toStartAt(s.manual_starts_at);
        const label = formatSalonOpening(s.manual_starts_at, t);
        setStart(
          from.epochMs > Date.now() && startAt && label
            ? { kind: "at", startAt, label }
            : { kind: "now" },
        );
      }
    }
  }, [t]);

  const load = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      try {
        applyResponse(await getMyAvailableNow());
      } catch (error: any) {
        Logger.error("Failed to load Available Now settings:", error);
        showBanner(
          t("error"),
          error?.message || t("anLoadError"),
          "error",
          3000,
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [applyResponse, showBanner, t],
  );

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    let active = true;
    fetchReelServiceOptions({
      userRole: user.userRole,
      businessId: user.business_id ? Number(user.business_id) : null,
    })
      .then((list) => {
        if (active) setServices(list);
      })
      .catch((error) => {
        Logger.error("Failed to load services for Available Now:", error);
      })
      .finally(() => {
        if (active) setServicesLoading(false);
      });
    return () => {
      active = false;
    };
  }, [user.business_id, user.userRole]);

  const selectMode = (next: AvailableNowMode) => {
    setMode(next);
    setStartError(null);
    // Manual starts at the calendar's next opening when there is one
    if (
      next === "manual" &&
      start.kind === "now" &&
      nextOpeningStartAt &&
      nextOpeningLabel
    ) {
      setStart({
        kind: "at",
        startAt: nextOpeningStartAt,
        label: nextOpeningLabel,
      });
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setStartError(null);
    const payload: SaveAvailableNowPayload = {
      enabled,
      mode,
      service_id: serviceId,
    };
    if (mode === "manual") {
      payload.duration_minutes = duration;
      if (start.kind === "at") payload.start_at = start.startAt;
      if (start.kind === "time") {
        payload.start_at = `${String(start.hours).padStart(2, "0")}:${String(
          start.minutes,
        ).padStart(2, "0")}`;
      }
    }
    try {
      const res = await saveMyAvailableNow(payload);
      applyResponse(res);
      showBanner(t("success"), t("anSaved"), "success", 2500);
    } catch (error: any) {
      Logger.error("Failed to save Available Now settings:", error);
      // Busy calendar: the backend's message names the next opening — show it as is
      const fieldError =
        error?.data?.errors?.start_at?.[0] ||
        error?.data?.errors?.duration_minutes?.[0] ||
        error?.data?.errors?.service_id?.[0] ||
        null;
      if (fieldError) setStartError(String(fieldError));
      showBanner(
        t("error"),
        fieldError || error?.message || t("anSaveError"),
        "error",
        4000,
      );
    } finally {
      setSaving(false);
    }
  };

  const badge = getAvailableNowBadge(status, t);
  // The next opening goes in the line below, so busy reads "Not available" here
  const statusTitle = !data?.settings.enabled
    ? t("anStatusOff")
    : badge?.available
      ? badge.label
      : t("anBadgeNotAvailable");
  const statusSub = (() => {
    if (!status || status.status === "off") return t("anCalendarHint");
    if (status.status === "available") return t("anFreeNowOnCalendar");
    const opening = formatSalonOpening(status.next_opening_at, t);
    return opening
      ? t("anYourNextOpening", { time: opening })
      : t("anNoOpeningWeek");
  })();
  const dotStyle = !data?.settings.enabled
    ? null
    : status?.status === "available"
      ? styles.statusDotAvailable
      : styles.statusDotBusy;

  const nowMinutes = salonNowMinutes(timeZone);
  const isTimeAvailable = useCallback(
    (hours: number, minutes: number) =>
      nowMinutes == null || hours * 60 + minutes > nowMinutes,
    [nowMinutes],
  );

  const durationOptions = DURATION_OPTIONS.includes(duration)
    ? DURATION_OPTIONS
    : [...DURATION_OPTIONS, duration].sort((a, b) => a - b);

  const renderChip = (
    key: string,
    label: string,
    selected: boolean,
    onPress: () => void,
    icon?: React.ComponentProps<typeof MaterialIcons>["name"],
  ) => (
    <TouchableOpacity
      key={key}
      style={[styles.chip, selected && styles.chipSelected]}
      onPress={onPress}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityState={{ selected }}
    >
      {icon ? (
        <MaterialIcons
          name={icon}
          size={moderateWidthScale(14)}
          color={selected ? theme.white : theme.darkGreen}
        />
      ) : null}
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  const renderModeOption = (
    value: AvailableNowMode,
    title: string,
    hint: string,
  ) => {
    const selected = mode === value;
    return (
      <TouchableOpacity
        style={[styles.optionRow, selected && styles.optionRowSelected]}
        onPress={() => selectMode(value)}
        activeOpacity={0.8}
        accessibilityRole="radio"
        accessibilityState={{ selected }}
      >
        <View
          style={[styles.radioOuter, selected && styles.radioOuterSelected]}
        >
          {selected ? <View style={styles.radioInner} /> : null}
        </View>
        <View style={styles.optionTextCol}>
          <Text style={styles.optionTitle}>{title}</Text>
          <Text style={styles.optionHint}>{hint}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const pickedTime =
    start.kind === "time" ? formatHM(start.hours, start.minutes) : null;

  return (
    <SafeAreaView edges={["bottom"]} style={styles.container}>
      <StackHeader title={t("availableNow")} />
      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={theme.darkGreen} />
        </View>
      ) : (
        <>
          <ScrollView
            style={styles.content}
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => load(true)}
                tintColor={theme.darkGreen}
              />
            }
          >
            <View style={styles.titleSection}>
              <Text style={styles.title}>{t("availableNow")}</Text>
              <Text style={styles.helpText}>{t("anSettingsHelp")}</Text>
            </View>

            <View style={styles.statusCard}>
              <View style={[styles.statusDot, dotStyle]} />
              <View style={styles.statusTextCol}>
                <Text style={styles.statusTitle}>{statusTitle}</Text>
                <Text style={styles.statusSub}>{statusSub}</Text>
              </View>
            </View>

            <View style={styles.switchRow}>
              <View style={styles.switchTextCol}>
                <Text style={styles.switchLabel}>{t("anShowMe")}</Text>
                <Text style={styles.switchHint}>{t("anShowMeHint")}</Text>
              </View>
              <CustomToggle value={enabled} onValueChange={setEnabled} />
            </View>

            {enabled ? (
              <>
                <Text style={styles.sectionLabel}>{t("anHowTitle")}</Text>
                {renderModeOption(
                  "calendar",
                  t("anModeCalendar"),
                  t("anModeCalendarHint"),
                )}
                {renderModeOption(
                  "manual",
                  t("anModeManual"),
                  t("anModeManualHint"),
                )}

                {mode === "manual" ? (
                  <>
                    <Text style={styles.sectionLabel}>{t("anStartTitle")}</Text>
                    <View style={styles.chipsWrap}>
                      {renderChip("now", t("anStartNow"), start.kind === "now", () => {
                        setStart({ kind: "now" });
                        setStartError(null);
                      })}
                      {nextOpeningStartAt && nextOpeningLabel
                        ? renderChip(
                            "next",
                            t("anStartNextOpening", { time: nextOpeningLabel }),
                            start.kind === "at" &&
                              start.startAt === nextOpeningStartAt,
                            () => {
                              setStart({
                                kind: "at",
                                startAt: nextOpeningStartAt,
                                label: nextOpeningLabel,
                              });
                              setStartError(null);
                            },
                          )
                        : null}
                      {/* Saved window that starts later than the next opening */}
                      {start.kind === "at" &&
                      start.startAt !== nextOpeningStartAt
                        ? renderChip("saved", start.label, true, () => undefined)
                        : null}
                      {renderChip(
                        "time",
                        pickedTime ?? t("anStartPick"),
                        start.kind === "time",
                        () => setTimePickerVisible(true),
                        "schedule",
                      )}
                    </View>
                    {startError ? (
                      <Text style={styles.errorText}>{startError}</Text>
                    ) : null}

                    <Text style={styles.sectionLabel}>
                      {t("anLengthTitle")}
                    </Text>
                    <View style={styles.chipsWrap}>
                      {durationOptions.map((minutes) =>
                        renderChip(
                          String(minutes),
                          formatDuration(minutes, t),
                          duration === minutes,
                          () => {
                            setDuration(minutes);
                            setStartError(null);
                          },
                        ),
                      )}
                    </View>
                  </>
                ) : null}

                <Text style={styles.sectionLabel}>{t("anServiceTitle")}</Text>
                <Text style={styles.sectionHint}>{t("anServiceHint")}</Text>
                {servicesLoading ? (
                  <ActivityIndicator
                    color={theme.darkGreen}
                    style={{ alignSelf: "flex-start" }}
                  />
                ) : (
                  <View style={styles.chipsWrap}>
                    {renderChip(
                      "none",
                      t("anServiceNone"),
                      serviceId == null,
                      () => setServiceId(null),
                    )}
                    {services.map((svc) =>
                      renderChip(
                        String(svc.id),
                        [svc.name, formatServicePrice(svc.price)]
                          .filter(Boolean)
                          .join(" · "),
                        serviceId === svc.id,
                        () => setServiceId(svc.id),
                      ),
                    )}
                    {services.length === 0 ? (
                      <Text style={styles.emptyText}>{t("anNoServices")}</Text>
                    ) : null}
                  </View>
                )}
              </>
            ) : null}
          </ScrollView>

          <View style={styles.footer}>
            <Button
              title={t("save")}
              onPress={handleSave}
              disabled={saving}
              loading={saving}
            />
          </View>
        </>
      )}

      <TimePickerModal
        visible={timePickerVisible}
        currentHours={start.kind === "time" ? start.hours : 12}
        currentMinutes={start.kind === "time" ? start.minutes : 0}
        isOptionAvailable={isTimeAvailable}
        onSelect={(hours, minutes) => {
          setStart({ kind: "time", hours, minutes });
          setStartError(null);
          setTimePickerVisible(false);
        }}
        onClose={() => setTimePickerVisible(false)}
      />
    </SafeAreaView>
  );
}
