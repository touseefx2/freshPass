/**
 * Bring Customers Back — one offer email: status, offer, schedule, results and
 * recipients. Drafts can be edited or deleted; scheduled / sending emails can
 * be cancelled. Opens are never tracked, so they are never shown.
 */
import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
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
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  iconScale,
  moderateHeightScale,
  moderateWidthScale,
} from "@/src/theme/dimensions";
import StackHeader from "@/src/components/StackHeader";
import Logger from "@/src/services/logger";
import { useNotificationContext } from "@/src/contexts/NotificationContext";
import { ClassStateView, StatusChip } from "@/src/components/masterClasses/parts";
import {
  PromotionInfoNote,
  PromotionStatTile,
} from "@/src/components/promotions/ownerParts";
import {
  CAMPAIGN_CREATE_ROUTE,
  CampaignConfirmSheet,
  campaignStatusMeta,
  formatCampaignDateTime,
  formatCampaignMoney,
} from "@/src/components/campaigns/campaignParts";
import {
  cancelCampaign,
  campaignErrorText,
  deleteCampaign,
  fetchCampaign,
  fetchCampaignRecipients,
  isCampaignForbidden,
} from "@/src/services/campaignService";
import type {
  Campaign,
  CampaignRecipient,
  CampaignRecipientStatus,
} from "@/src/types/campaign";

const RECIPIENT_TABS: CampaignRecipientStatus[] = ["sent", "failed", "skipped", "excluded"];

export default function CampaignDetailScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);
  const router = useRouter();
  const { showBanner } = useNotificationContext();
  const params = useLocalSearchParams<{ id?: string }>();
  const id = Number(params.id);

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const [confirm, setConfirm] = useState<"cancel" | "delete" | null>(null);
  const [busy, setBusy] = useState(false);

  const [tab, setTab] = useState<CampaignRecipientStatus>("sent");
  const [recipients, setRecipients] = useState<CampaignRecipient[]>([]);
  const [recipientsPage, setRecipientsPage] = useState(1);
  const [recipientsLast, setRecipientsLast] = useState(1);
  const [recipientsLoading, setRecipientsLoading] = useState(false);
  const [recipientsError, setRecipientsError] = useState<string | null>(null);
  const loadedOnce = useRef(false);

  const loadRecipients = useCallback(
    async (status: CampaignRecipientStatus, page = 1) => {
      if (!Number.isFinite(id)) return;
      setRecipientsLoading(true);
      setRecipientsError(null);
      try {
        const res = await fetchCampaignRecipients(id, status, page);
        setRecipients((prev) => (page === 1 ? res.items : [...prev, ...res.items]));
        setRecipientsPage(res.meta.current_page);
        setRecipientsLast(res.meta.last_page);
      } catch (err) {
        Logger.warn("Campaign recipients failed:", err);
        setRecipientsError(campaignErrorText(err, t("bcbRecipientsError")));
      } finally {
        setRecipientsLoading(false);
      }
    },
    [id, t],
  );

  const load = useCallback(
    async (mode: "initial" | "refresh" | "quiet") => {
      if (!Number.isFinite(id)) {
        setError(t("bcbNotFound"));
        setLoading(false);
        return;
      }
      if (mode === "refresh") setRefreshing(true);
      else if (mode === "initial") setLoading(true);
      try {
        const c = await fetchCampaign(id);
        setCampaign(c);
        setError(null);
        loadedOnce.current = true;
        if (c.status !== "draft") loadRecipients(tab, 1);
      } catch (err) {
        Logger.warn("Campaign detail failed:", err);
        if (isCampaignForbidden(err)) setForbidden(true);
        else if (!loadedOnce.current) setError(campaignErrorText(err, t("bcbLoadError")));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    // tab is read once per load on purpose; switching tabs loads on its own
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [id, loadRecipients, t],
  );

  useFocusEffect(
    useCallback(() => {
      load(loadedOnce.current ? "quiet" : "initial");
    }, [load]),
  );

  const switchTab = (next: CampaignRecipientStatus) => {
    if (next === tab) return;
    setTab(next);
    setRecipients([]);
    loadRecipients(next, 1);
  };

  const runConfirm = async () => {
    if (!campaign || busy) return;
    setBusy(true);
    try {
      if (confirm === "cancel") {
        await cancelCampaign(campaign.id);
        showBanner(t("bcbCancelledTitle"), t("bcbCancelledMessage"), "success", 3000);
        setConfirm(null);
        load("quiet");
      } else if (confirm === "delete") {
        await deleteCampaign(campaign.id);
        setConfirm(null);
        router.back();
      }
    } catch (err) {
      Logger.warn("Campaign action failed:", err);
      setConfirm(null);
      showBanner(t("bcbActionFailedTitle"), campaignErrorText(err, t("bcbActionFailed")), "error", 4000);
    } finally {
      setBusy(false);
    }
  };

  if (loading || error || forbidden || !campaign) {
    return (
      <View style={styles.container}>
        <StackHeader title={t("bcbDetailTitle")} />
        {loading ? (
          <ClassStateView loading message={t("bcbLoading")} />
        ) : forbidden ? (
          <ClassStateView
            icon="lock-closed-outline"
            title={t("bcbOwnerOnlyTitle")}
            message={t("bcbOwnerOnlyMessage")}
          />
        ) : (
          <ClassStateView
            icon="cloud-offline-outline"
            title={t("bcbLoadErrorTitle")}
            message={error ?? t("bcbNotFound")}
            actionLabel={t("retry")}
            onAction={() => load("initial")}
          />
        )}
      </View>
    );
  }

  const status = campaignStatusMeta(campaign.status, t);
  const isDraft = campaign.status === "draft";
  const canEdit = isDraft || campaign.status === "scheduled";
  const canCancel = campaign.status === "scheduled" || campaign.status === "sending";
  const r = campaign.results;
  const offerLine = [campaign.offer?.savings_label, campaign.offer?.title]
    .filter(Boolean)
    .join(" · ");
  const tabLabel = (s: CampaignRecipientStatus) =>
    s === "sent"
      ? t("bcbTabSent")
      : s === "failed"
        ? t("bcbTabFailed")
        : s === "skipped"
          ? t("bcbTabSkipped")
          : t("bcbTabExcluded");

  return (
    <View style={styles.container}>
      <StackHeader title={t("bcbDetailTitle")} />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => load("refresh")}
            tintColor={theme.darkGreen}
            colors={[theme.darkGreen]}
          />
        }
      >
        {/* Summary */}
        <View style={styles.card}>
          <View style={styles.cardTop}>
            <View style={styles.icon}>
              <Ionicons
                name={campaign.template === "holiday" ? "gift-outline" : "paper-plane-outline"}
                size={iconScale(20)}
                color={theme.orangeBrown}
              />
            </View>
            <StatusChip label={status.label} tone={status.tone} hideIcon />
          </View>
          <Text style={styles.subject} accessibilityRole="header">
            {campaign.subject || t("bcbUntitled")}
          </Text>
          {campaign.template === "holiday" && campaign.holiday_name ? (
            <Text style={styles.meta}>{t("bcbHolidayLine", { name: campaign.holiday_name })}</Text>
          ) : null}
          {campaign.inactivity_days ? (
            <Text style={styles.meta}>{t("bcbInactiveDays", { count: campaign.inactivity_days })}</Text>
          ) : null}
          {campaign.status === "scheduled" && campaign.scheduled_at ? (
            <Text style={styles.metaStrong}>
              {t("bcbScheduledFor", { date: formatCampaignDateTime(campaign.scheduled_at) ?? "" })}
            </Text>
          ) : null}
          {campaign.sent_at ? (
            <Text style={styles.meta}>
              {t("bcbSentOn", { date: formatCampaignDateTime(campaign.sent_at) ?? "" })}
            </Text>
          ) : null}
        </View>

        {/* Offer */}
        {campaign.offer || campaign.promotion_id ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>{t("bcbOffer")}</Text>
            <Text style={styles.offerLine}>
              {offerLine || t("bcbOfferNumber", { id: campaign.promotion_id })}
            </Text>
            {campaign.offer?.audience_label ? (
              <Text style={styles.meta}>{campaign.offer.audience_label}</Text>
            ) : null}
            {campaign.offer?.booking_label ? (
              <Text style={styles.meta}>{campaign.offer.booking_label}</Text>
            ) : null}
            {campaign.offer?.visit_label ? (
              <Text style={styles.meta}>{campaign.offer.visit_label}</Text>
            ) : null}
            {campaign.offer?.is_public === false ? (
              <Text style={styles.meta}>{t("bcbPrivateOfferLine")}</Text>
            ) : null}
          </View>
        ) : null}

        {/* Actions */}
        {canEdit || canCancel || isDraft ? (
          <View style={styles.actions}>
            {canEdit ? (
              <ActionButton
                label={isDraft ? t("bcbContinueEditing") : t("bcbEdit")}
                icon="create-outline"
                onPress={() =>
                  router.push({
                    pathname: CAMPAIGN_CREATE_ROUTE,
                    params: { id: String(campaign.id) },
                  } as any)
                }
                primary
                styles={styles}
                theme={theme}
              />
            ) : null}
            {canCancel ? (
              <ActionButton
                label={t("bcbCancelSending")}
                icon="close-circle-outline"
                onPress={() => setConfirm("cancel")}
                danger
                styles={styles}
                theme={theme}
              />
            ) : null}
            {isDraft ? (
              <ActionButton
                label={t("bcbDelete")}
                icon="trash-outline"
                onPress={() => setConfirm("delete")}
                danger
                styles={styles}
                theme={theme}
              />
            ) : null}
          </View>
        ) : null}

        {/* Results */}
        {!isDraft && r ? (
          <>
            <Text style={styles.sectionHeading}>{t("bcbResults")}</Text>
            <View style={styles.tiles}>
              <PromotionStatTile label={t("bcbResSelected")} value={String(r.selected)} icon="people-outline" />
              <PromotionStatTile label={t("bcbResEligible")} value={String(r.eligible)} icon="checkmark-circle-outline" />
              <PromotionStatTile label={t("bcbResExcluded")} value={String(r.excluded)} icon="remove-circle-outline" />
              <PromotionStatTile label={t("bcbResSent")} value={String(r.sent)} icon="paper-plane-outline" />
              <PromotionStatTile label={t("bcbResDelivered")} value={String(r.delivered)} icon="mail-open-outline" />
              <PromotionStatTile label={t("bcbResClicked")} value={String(r.clicked)} icon="hand-left-outline" />
              <PromotionStatTile label={t("bcbResFailed")} value={String(r.failed)} icon="alert-circle-outline" />
              <PromotionStatTile label={t("bcbResSkipped")} value={String(r.skipped)} icon="play-skip-forward-outline" />
              <PromotionStatTile label={t("bcbResUnsubscribed")} value={String(r.unsubscribed)} icon="mail-unread-outline" />
              <PromotionStatTile label={t("bcbResBookings")} value={String(r.bookings)} icon="calendar-outline" />
              <PromotionStatTile label={t("bcbResReturns")} value={String(r.completedReturns)} icon="repeat-outline" />
              <PromotionStatTile label={t("bcbResDiscount")} value={formatCampaignMoney(r.discountTotal)} icon="pricetag-outline" />
              <PromotionStatTile label={t("bcbResRevenue")} value={formatCampaignMoney(r.revenue)} icon="cash-outline" />
            </View>
            <PromotionInfoNote text={t("bcbResultsNote")} />
          </>
        ) : null}

        {/* Recipients */}
        {!isDraft ? (
          <>
            <Text style={styles.sectionHeading}>{t("bcbRecipients")}</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.tabs}
            >
              {RECIPIENT_TABS.map((s) => {
                const on = s === tab;
                return (
                  <TouchableOpacity
                    key={s}
                    onPress={() => switchTab(s)}
                    style={[styles.tab, on && styles.tabOn]}
                    activeOpacity={0.85}
                    accessibilityRole="tab"
                    accessibilityState={{ selected: on }}
                  >
                    <Text style={[styles.tabText, on && styles.tabTextOn]}>{tabLabel(s)}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <View style={styles.recipientList}>
              {recipients.map((p) => (
                <RecipientRow key={String(p.id)} person={p} tab={tab} styles={styles} />
              ))}
              {recipientsLoading ? (
                <ActivityIndicator color={theme.darkGreen} style={{ marginVertical: moderateHeightScale(12) }} />
              ) : recipientsError ? (
                <Text style={styles.errorText}>{recipientsError}</Text>
              ) : !recipients.length ? (
                <Text style={styles.empty}>{t("bcbNoRecipients")}</Text>
              ) : recipientsPage < recipientsLast ? (
                <TouchableOpacity
                  onPress={() => loadRecipients(tab, recipientsPage + 1)}
                  style={styles.moreBtn}
                  accessibilityRole="button"
                >
                  <Text style={styles.moreText}>{t("bcbLoadMore")}</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </>
        ) : (
          <PromotionInfoNote text={t("bcbDraftNote")} />
        )}
      </ScrollView>

      <CampaignConfirmSheet
        visible={confirm === "cancel"}
        title={t("bcbConfirmCancelTitle")}
        message={t("bcbConfirmCancelMessage")}
        confirmLabel={t("bcbCancelSending")}
        danger
        loading={busy}
        onConfirm={runConfirm}
        onClose={() => setConfirm(null)}
      />
      <CampaignConfirmSheet
        visible={confirm === "delete"}
        title={t("bcbConfirmDeleteTitle")}
        message={t("bcbConfirmDeleteMessage")}
        confirmLabel={t("bcbDelete")}
        danger
        loading={busy}
        onConfirm={runConfirm}
        onClose={() => setConfirm(null)}
      />
    </View>
  );
}

function ActionButton({
  label,
  icon,
  onPress,
  primary,
  danger,
  styles,
  theme,
}: {
  label: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  onPress: () => void;
  primary?: boolean;
  danger?: boolean;
  styles: ReturnType<typeof createStyles>;
  theme: Theme;
}) {
  const fg = primary ? theme.white : danger ? theme.red : theme.darkGreen;
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={[styles.actionBtn, primary && styles.actionPrimary, danger && styles.actionDanger]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Ionicons name={icon} size={iconScale(18)} color={fg} />
      <Text style={[styles.actionText, { color: fg }]}>{label}</Text>
    </TouchableOpacity>
  );
}

function RecipientRow({
  person,
  tab,
  styles,
}: {
  person: CampaignRecipient;
  tab: CampaignRecipientStatus;
  styles: ReturnType<typeof createStyles>;
}) {
  const { t } = useTranslation();
  const lines: string[] = [];
  if (person.reasonLabel || person.reason) lines.push(person.reasonLabel ?? person.reason ?? "");
  if (person.sentAt) lines.push(t("bcbSentOn", { date: formatCampaignDateTime(person.sentAt) ?? "" }));
  if (person.clickedAt) lines.push(t("bcbClickedOn", { date: formatCampaignDateTime(person.clickedAt) ?? "" }));
  if (person.unsubscribedAt)
    lines.push(t("bcbUnsubscribedOn", { date: formatCampaignDateTime(person.unsubscribedAt) ?? "" }));
  if (tab === "failed" && person.error) lines.push(person.error);
  return (
    <View style={styles.recipient} accessible accessibilityLabel={[person.name, person.email, ...lines].filter(Boolean).join(", ")}>
      <Text style={styles.recipientName} numberOfLines={1}>
        {person.name || person.email || "—"}
      </Text>
      {person.email && person.name ? (
        <Text style={styles.recipientEmail} numberOfLines={1}>
          {person.email}
        </Text>
      ) : null}
      {lines.map((l, i) => (
        <Text key={i} style={styles.recipientMeta}>
          {l}
        </Text>
      ))}
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background },
    content: {
      paddingHorizontal: moderateWidthScale(16),
      paddingTop: moderateHeightScale(16),
      paddingBottom: moderateHeightScale(40),
      gap: moderateHeightScale(14),
    },
    card: {
      backgroundColor: theme.white,
      borderRadius: moderateWidthScale(16),
      borderWidth: 1,
      borderColor: theme.lightGreen015,
      padding: moderateWidthScale(16),
      gap: moderateHeightScale(6),
    },
    cardTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    icon: {
      width: moderateWidthScale(40),
      height: moderateWidthScale(40),
      borderRadius: moderateWidthScale(20),
      backgroundColor: theme.tileGoldCream,
      alignItems: "center",
      justifyContent: "center",
    },
    subject: {
      marginTop: moderateHeightScale(4),
      fontSize: fontSize.size18,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    meta: { fontSize: fontSize.size13, fontFamily: fonts.fontRegular, color: theme.textMuted },
    metaStrong: { fontSize: fontSize.size14, fontFamily: fonts.fontBold, color: theme.orangeBrownText },
    sectionTitle: { fontSize: fontSize.size13, fontFamily: fonts.fontMedium, color: theme.textMuted },
    offerLine: { fontSize: fontSize.size16, fontFamily: fonts.fontBold, color: theme.darkGreen },
    actions: { gap: moderateHeightScale(10) },
    actionBtn: {
      minHeight: moderateHeightScale(48),
      borderRadius: moderateWidthScale(12),
      borderWidth: 1.5,
      borderColor: theme.darkGreen,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: moderateWidthScale(8),
    },
    actionPrimary: { backgroundColor: theme.darkGreen },
    actionDanger: { borderColor: theme.red },
    actionText: { fontSize: fontSize.size15, fontFamily: fonts.fontBold },
    sectionHeading: {
      marginTop: moderateHeightScale(6),
      fontSize: fontSize.size17,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    tiles: { flexDirection: "row", flexWrap: "wrap", gap: moderateWidthScale(8) },
    tabs: { gap: moderateWidthScale(8) },
    tab: {
      minHeight: moderateHeightScale(40),
      paddingHorizontal: moderateWidthScale(16),
      borderRadius: moderateWidthScale(20),
      borderWidth: 1,
      borderColor: theme.lightGreen5,
      justifyContent: "center",
    },
    tabOn: { backgroundColor: theme.darkGreen, borderColor: theme.darkGreen },
    tabText: { fontSize: fontSize.size14, fontFamily: fonts.fontMedium, color: theme.darkGreen },
    tabTextOn: { color: theme.white },
    recipientList: { gap: moderateHeightScale(8) },
    recipient: {
      backgroundColor: theme.white,
      borderRadius: moderateWidthScale(12),
      borderWidth: 1,
      borderColor: theme.lightGreen015,
      paddingHorizontal: moderateWidthScale(14),
      paddingVertical: moderateHeightScale(10),
      gap: moderateHeightScale(2),
    },
    recipientName: { fontSize: fontSize.size15, fontFamily: fonts.fontBold, color: theme.darkGreen },
    recipientEmail: { fontSize: fontSize.size13, fontFamily: fonts.fontRegular, color: theme.textMuted },
    recipientMeta: { fontSize: fontSize.size12, fontFamily: fonts.fontRegular, color: theme.textMuted },
    empty: {
      textAlign: "center",
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.textMuted,
      paddingVertical: moderateHeightScale(16),
    },
    errorText: {
      textAlign: "center",
      fontSize: fontSize.size14,
      fontFamily: fonts.fontMedium,
      color: theme.red,
      paddingVertical: moderateHeightScale(12),
    },
    moreBtn: {
      alignSelf: "center",
      minHeight: moderateHeightScale(40),
      paddingHorizontal: moderateWidthScale(16),
      justifyContent: "center",
    },
    moreText: { fontSize: fontSize.size14, fontFamily: fonts.fontBold, color: theme.darkGreen },
  });
