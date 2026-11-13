/**
 * Owner offer detail: summary, results and actions (edit, pause / resume /
 * publish, delete). Suspended offers can't be edited or turned back on.
 */
import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  iconScale,
  moderateHeightScale,
  moderateWidthScale,
} from "@/src/theme/dimensions";
import StackHeader from "@/src/components/StackHeader";
import AppImage from "@/src/components/AppImage";
import Logger from "@/src/services/logger";
import {
  ClassStateView,
  MetaRow,
  SectionCard,
  StatusChip,
} from "@/src/components/masterClasses/parts";
import {
  PromotionInfoNote,
  PromotionStatTile,
} from "@/src/components/promotions/ownerParts";
import {
  deletePromotion,
  fetchMyPromotion,
  promotionErrorText,
  setPromotionStatus,
} from "@/src/services/promotionService";
import type { Promotion } from "@/src/types/promotion";
import {
  formatPromotionMoney,
  promotionStatusMeta,
} from "@/src/utils/promotionHelpers";

const EDITOR_ROUTE = "/(main)/promotions/editor";

type Busy = "pause" | "resume" | "publish" | "delete" | null;

export default function PromotionDetailScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id?: string; created?: string }>();
  const id = Number(params.id);

  const [promotion, setPromotion] = useState<Promotion | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState<Busy>(null);
  const loadedOnce = useRef(false);

  const load = useCallback(
    async (mode: "initial" | "refresh" | "quiet") => {
      if (!Number.isFinite(id)) {
        setError(t("proLoadError"));
        setLoading(false);
        return;
      }
      if (mode === "refresh") setRefreshing(true);
      else if (mode === "initial") setLoading(true);
      try {
        const p = await fetchMyPromotion(id);
        setPromotion(p);
        setError(null);
        loadedOnce.current = true;
      } catch (err) {
        Logger.warn("Offer detail failed:", err);
        if (!loadedOnce.current) setError(promotionErrorText(err, t("proLoadError")));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [id, t],
  );

  // Back from the editor: show the saved values
  useFocusEffect(
    useCallback(() => {
      load(loadedOnce.current ? "quiet" : "initial");
    }, [load]),
  );

  const runStatus = async (action: "pause" | "resume" | "publish") => {
    if (busy) return;
    setBusy(action);
    setActionError(null);
    try {
      const updated = await setPromotionStatus(id, action);
      if (updated?.id) setPromotion((prev) => ({ ...(prev ?? updated), ...updated, results: updated.results ?? prev?.results ?? null }));
      // Results / counts may change too
      load("quiet");
    } catch (err) {
      Logger.warn(`Offer ${action} failed:`, err);
      setActionError(promotionErrorText(err, t("proActionError")));
    } finally {
      setBusy(null);
    }
  };

  const confirmDelete = () => {
    Alert.alert(t("proDeleteTitle"), t("proDeleteMessage"), [
      { text: t("cancel"), style: "cancel" },
      {
        text: t("proDelete"),
        style: "destructive",
        onPress: async () => {
          setBusy("delete");
          setActionError(null);
          try {
            await deletePromotion(id);
            router.back();
          } catch (err) {
            Logger.warn("Offer delete failed:", err);
            setActionError(promotionErrorText(err, t("proActionError")));
            setBusy(null);
          }
        },
      },
    ]);
  };

  if (loading || error || !promotion) {
    return (
      <View style={styles.container}>
        <StackHeader title={t("proDetailTitle")} />
        {loading ? (
          <ClassStateView loading message={t("proLoading")} />
        ) : (
          <ClassStateView
            icon="cloud-offline-outline"
            title={t("proLoadErrorTitle")}
            message={error ?? undefined}
            actionLabel={t("retry")}
            onAction={() => load("initial")}
          />
        )}
      </View>
    );
  }

  const p = promotion;
  const status = promotionStatusMeta(p.status, t);
  const suspended = p.status === "suspended";
  const results = p.results;
  const createdNote =
    params.created === "active"
      ? t("proCreatedLive")
      : params.created === "draft"
        ? t("proCreatedDraft")
        : null;
  const staffText = p.staff.length
    ? p.staff.map((s) => s.name).join(", ")
    : t("proEveryStaff");

  return (
    <View style={styles.container}>
      <StackHeader title={t("proDetailTitle")} />
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + moderateHeightScale(32) },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => load("refresh")}
            tintColor={theme.darkGreen}
            colors={[theme.darkGreen]}
          />
        }
      >
        {suspended ? (
          <PromotionInfoNote
            tone="danger"
            icon="ban-outline"
            text={`${t("proSuspendedTitle")}\n${p.suspended_reason ?? t("proSuspendedFallback")}`}
          />
        ) : createdNote ? (
          <PromotionInfoNote icon="checkmark-circle-outline" text={createdNote} />
        ) : null}
        {actionError ? (
          <PromotionInfoNote tone="danger" icon="alert-circle-outline" text={actionError} />
        ) : null}

        {/* Summary */}
        <View style={styles.hero}>
          {p.image_url ? <AppImage uri={p.image_url} style={styles.heroImage} /> : null}
          <View style={styles.heroTop}>
            <StatusChip label={status.label} tone={status.tone} hideIcon />
            {p.audience_label ? (
              <View style={styles.audiencePill}>
                <Text style={styles.audienceText}>{p.audience_label}</Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.heroTitle} accessibilityRole="header">
            {p.title}
          </Text>
          {p.savings_label ? (
            <Text style={styles.heroSavings}>{p.savings_label}</Text>
          ) : null}
          {p.description ? <Text style={styles.heroDesc}>{p.description}</Text> : null}
        </View>

        {/* Results */}
        <SectionCard title={t("proResults")} icon="stats-chart-outline">
          <View style={styles.statsGrid}>
            <PromotionStatTile icon="eye-outline" label={t("proResViews")} value={String(results?.views ?? p.views_count)} />
            <PromotionStatTile icon="hand-left-outline" label={t("proResBookingStarts")} value={String(results?.booking_starts ?? 0)} />
            <PromotionStatTile icon="calendar-outline" label={t("proResConfirmed")} value={String(results?.confirmed_bookings ?? 0)} />
            <PromotionStatTile icon="checkmark-done-outline" label={t("proResCompleted")} value={String(results?.completed_visits ?? 0)} />
            <PromotionStatTile icon="pricetag-outline" label={t("proResDiscount")} value={formatPromotionMoney(results?.discount_total)} />
            <PromotionStatTile icon="cash-outline" label={t("proResRevenue")} value={formatPromotionMoney(results?.revenue)} />
          </View>
          <Text style={styles.statsFoot}>{t("proResRevenueHelp")}</Text>
        </SectionCard>

        {/* Offer details */}
        <SectionCard title={t("proDetails")} icon="document-text-outline">
          <View style={styles.rows}>
            <MetaRow icon="calendar-outline" text={p.booking_label ?? ""} numberOfLines={2} />
            <MetaRow icon="calendar-number-outline" text={p.visit_label ?? ""} numberOfLines={2} />
            <MetaRow icon="people-outline" text={`${t("proFieldStaff")}: ${staffText}`} numberOfLines={3} />
            {p.restrictions.map((line, i) => (
              <MetaRow key={`r${i}`} icon="information-circle-outline" text={line} numberOfLines={3} />
            ))}
            <MetaRow
              icon="ticket-outline"
              text={[
                t("proCountReserved", { count: p.reserved_count }),
                t("proCountUsed", { count: p.used_count }),
              ].join(" · ")}
            />
          </View>
        </SectionCard>

        {p.services.length ? (
          <SectionCard title={t("proFieldServices")} icon="cut-outline">
            <View style={styles.rows}>
              {p.services.map((s) => {
                const discounted = s.final_price < s.original_price;
                return (
                  <View key={s.id} style={styles.serviceRow}>
                    <Text style={styles.serviceName} numberOfLines={2}>
                      {s.name}
                    </Text>
                    {discounted ? (
                      <Text style={styles.serviceOld}>{formatPromotionMoney(s.original_price)}</Text>
                    ) : null}
                    <Text style={styles.servicePrice}>
                      {formatPromotionMoney(discounted ? s.final_price : s.original_price)}
                    </Text>
                  </View>
                );
              })}
            </View>
          </SectionCard>
        ) : null}

        {/* Actions */}
        {!suspended ? (
          <View style={styles.actions}>
            {p.status === "draft" ? (
              <ActionButton
                primary
                icon="rocket-outline"
                label={t("proPublishNow")}
                loading={busy === "publish"}
                disabled={!!busy}
                onPress={() => runStatus("publish")}
                styles={styles}
                theme={theme}
              />
            ) : null}
            <ActionButton
              icon="create-outline"
              label={t("proEdit")}
              disabled={!!busy}
              onPress={() =>
                router.push({ pathname: EDITOR_ROUTE, params: { id: String(p.id) } } as any)
              }
              styles={styles}
              theme={theme}
            />
            {p.status === "active" ? (
              <ActionButton
                icon="pause-circle-outline"
                label={t("proPause")}
                loading={busy === "pause"}
                disabled={!!busy}
                onPress={() => runStatus("pause")}
                styles={styles}
                theme={theme}
              />
            ) : null}
            {p.status === "paused" ? (
              <ActionButton
                primary
                icon="play-circle-outline"
                label={t("proResume")}
                loading={busy === "resume"}
                disabled={!!busy}
                onPress={() => runStatus("resume")}
                styles={styles}
                theme={theme}
              />
            ) : null}
            <Text style={styles.actionsNote}>{t("proEditKeepsBookings")}</Text>
          </View>
        ) : null}

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={confirmDelete}
          disabled={!!busy}
          style={styles.deleteBtn}
          accessibilityRole="button"
          accessibilityState={{ disabled: !!busy, busy: busy === "delete" }}
        >
          {busy === "delete" ? (
            <ActivityIndicator color={theme.red} />
          ) : (
            <>
              <Ionicons name="trash-outline" size={iconScale(18)} color={theme.red} />
              <Text style={styles.deleteText}>{t("proDelete")}</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

type Styles = ReturnType<typeof createStyles>;

function ActionButton({
  label,
  icon,
  primary = false,
  loading = false,
  disabled = false,
  onPress,
  styles,
  theme,
}: {
  label: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  primary?: boolean;
  loading?: boolean;
  disabled?: boolean;
  onPress: () => void;
  styles: Styles;
  theme: Theme;
}) {
  const fg = primary ? theme.white : theme.darkGreen;
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.actionBtn,
        primary ? styles.actionPrimary : styles.actionSecondary,
        disabled && !loading && styles.disabled,
      ]}
      accessibilityRole="button"
      accessibilityState={{ disabled, busy: loading }}
      accessibilityLabel={label}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <>
          <Ionicons name={icon} size={iconScale(18)} color={fg} />
          <Text style={[styles.actionText, { color: fg }]}>{label}</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background },
    content: {
      paddingHorizontal: moderateWidthScale(16),
      paddingTop: moderateHeightScale(16),
      gap: moderateHeightScale(14),
    },
    hero: {
      backgroundColor: theme.white,
      borderRadius: moderateWidthScale(16),
      borderWidth: 1,
      borderColor: theme.goldBorder,
      padding: moderateWidthScale(16),
      gap: moderateHeightScale(8),
    },
    heroImage: {
      width: "100%",
      height: moderateHeightScale(150),
      borderRadius: moderateWidthScale(12),
      backgroundColor: theme.lightGreen07,
    },
    heroTop: {
      flexDirection: "row",
      flexWrap: "wrap",
      alignItems: "center",
      gap: moderateWidthScale(8),
    },
    audiencePill: {
      backgroundColor: theme.tileGoldCream,
      borderRadius: moderateWidthScale(20),
      paddingHorizontal: moderateWidthScale(10),
      paddingVertical: moderateHeightScale(3),
    },
    audienceText: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontSemiBold,
      color: theme.goldTextDark,
    },
    heroTitle: {
      fontSize: fontSize.size20,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    heroSavings: {
      fontSize: fontSize.size28,
      fontFamily: fonts.fontExtraBold,
      color: theme.darkGreen,
    },
    heroDesc: {
      fontSize: fontSize.size14,
      lineHeight: fontSize.size14 * 1.5,
      fontFamily: fonts.fontRegular,
      color: theme.textMuted,
    },
    statsGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: moderateWidthScale(8),
    },
    statsFoot: {
      marginTop: moderateHeightScale(8),
      fontSize: fontSize.size12,
      lineHeight: fontSize.size12 * 1.45,
      fontFamily: fonts.fontRegular,
      color: theme.textMuted,
    },
    rows: { gap: moderateHeightScale(10) },
    serviceRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(8),
    },
    serviceName: {
      flex: 1,
      fontSize: fontSize.size14,
      fontFamily: fonts.fontSemiBold,
      color: theme.darkGreen,
    },
    serviceOld: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: theme.textMuted,
      textDecorationLine: "line-through",
    },
    servicePrice: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    actions: { gap: moderateHeightScale(10) },
    actionBtn: {
      minHeight: moderateHeightScale(50),
      borderRadius: moderateWidthScale(12),
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: moderateWidthScale(8),
      paddingHorizontal: moderateWidthScale(16),
    },
    actionPrimary: { backgroundColor: theme.darkGreen },
    actionSecondary: {
      backgroundColor: theme.white,
      borderWidth: 1.5,
      borderColor: theme.darkGreen,
    },
    actionText: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontBold,
    },
    actionsNote: {
      fontSize: fontSize.size12,
      lineHeight: fontSize.size12 * 1.45,
      fontFamily: fonts.fontRegular,
      color: theme.textMuted,
      textAlign: "center",
    },
    disabled: { opacity: 0.5 },
    deleteBtn: {
      marginTop: moderateHeightScale(6),
      minHeight: moderateHeightScale(48),
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: moderateWidthScale(6),
    },
    deleteText: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontBold,
      color: theme.red,
    },
  });
