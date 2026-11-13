/**
 * Bring Customers Back — create / edit an offer email, step by step:
 * Who → Offer → Email → Review (preview, test, send or schedule) → Done.
 * The server picks recipients, checks the limit and sends; nothing is sent
 * by saving a draft.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { WebView } from "react-native-webview";
import dayjs from "dayjs";
import { useAppSelector, useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  iconScale,
  moderateHeightScale,
  moderateWidthScale,
} from "@/src/theme/dimensions";
import Logger from "@/src/services/logger";
import { useNotificationContext } from "@/src/contexts/NotificationContext";
import { isSoloSubscription } from "@/src/state/slices/userSlice";
import { resetToDashboardHome } from "@/src/utils/navigation";
import FlowHeader from "@/src/components/reelFlow/flowHeader";
import FlowFooter from "@/src/components/reelFlow/flowFooter";
import { FlowTitle, SectionLabel } from "@/src/components/reelFlow/flowParts";
import { ClassStateView } from "@/src/components/masterClasses/parts";
import {
  EditorChips,
  EditorFieldError,
  EditorHelper,
  EditorLabel,
  EditorPickerBox,
  EditorRow,
  EditorSegmented,
  EditorTextInput,
} from "@/src/components/masterClasses/editorFields";
import {
  EditorDateSheet,
  EditorOptionSheet,
  EditorTimeSheet,
} from "@/src/components/masterClasses/editorSheets";
import { formatClassTime } from "@/src/utils/masterClassHelpers";
import { PromotionInfoNote } from "@/src/components/promotions/ownerParts";
import {
  CAMPAIGN_DETAIL_ROUTE,
  CampaignConfirmSheet,
  CampaignMultiSelectSheet,
  PillChoice,
  ToggleRow,
  formatCampaignDate,
  formatCampaignDateTime,
  formatCampaignMoney,
} from "@/src/components/campaigns/campaignParts";
import {
  fetchOwnerBookingServices,
  fetchOwnerBookingStaff,
  fetchOwnerBusinessHours,
  type OwnerBookingService,
  type OwnerBookingStaff,
} from "@/src/services/ownerBookingService";
import { fetchMyPromotions } from "@/src/services/promotionService";
import { promotionBookingStartNow } from "@/src/utils/promotionHelpers";
import {
  campaignErrorText,
  createCampaign,
  fetchCampaign,
  fetchCampaignAudience,
  fetchCampaignPreview,
  fetchCampaignTemplates,
  isCampaignForbidden,
  sendCampaign,
  sendCampaignTest,
  updateCampaign,
} from "@/src/services/campaignService";
import type {
  Campaign,
  CampaignAudience,
  CampaignNewOffer,
  CampaignPayload,
  CampaignTemplateKey,
  CampaignTemplates,
} from "@/src/types/campaign";
import type {
  Promotion,
  PromotionAudience,
  PromotionDiscountType,
} from "@/src/types/promotion";

type Step = "who" | "offer" | "email" | "review";
const STEPS: Step[] = ["who", "offer", "email", "review"];
type DaysChoice = 30 | 60 | 90 | "custom";
const AUDIENCE_DEBOUNCE_MS = 450;
const LIST_PREVIEW = 20;

type OfferForm = {
  title: string;
  description: string;
  audience: PromotionAudience;
  discountType: PromotionDiscountType;
  discountValue: string;
  serviceIds: number[];
  bookByDate: string | null;
  bookByTime: string | null;
  visitFrom: string | null;
  visitTo: string | null;
  isPublic: boolean;
};

const EMPTY_OFFER: OfferForm = {
  title: "",
  description: "",
  audience: "returning",
  discountType: "percent",
  discountValue: "",
  serviceIds: [],
  bookByDate: null,
  bookByTime: null,
  visitFrom: null,
  visitTo: null,
  isPublic: false,
};

type Sheet =
  | "services"
  | "staff"
  | "offerServices"
  | "bookByDate"
  | "bookByTime"
  | "visitFrom"
  | "visitTo"
  | "holiday"
  | "scheduleDate"
  | "scheduleTime"
  | null;

type Done = { mode: "sent" | "scheduled"; at: string | null; id: number };

export default function CampaignCreateScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);
  const router = useRouter();
  const { showBanner } = useNotificationContext();
  const params = useLocalSearchParams<{ id?: string }>();
  const editId = params.id ? Number(params.id) : null;
  const isEdit = editId != null && Number.isFinite(editId);

  const user = useAppSelector((s) => s.user);
  const businessStatus = useAppSelector((s) => s.user.businessStatus);
  const businessId = Number(user.business_id ?? businessStatus?.business_id);
  const isSolo = isSoloSubscription(businessStatus);

  // ── Loaded data ────────────────────────────────────────────────────
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const [services, setServices] = useState<OwnerBookingService[]>([]);
  const [staff, setStaff] = useState<OwnerBookingStaff[]>([]);
  const [timeZone, setTimeZone] = useState<string | null>(null);
  const [templates, setTemplates] = useState<CampaignTemplates | null>(null);
  const [offers, setOffers] = useState<Promotion[]>([]);

  // ── Step state ─────────────────────────────────────────────────────
  const [step, setStep] = useState<Step>("who");
  const [campaignId, setCampaignId] = useState<number | null>(isEdit ? editId : null);
  const [savedCampaign, setSavedCampaign] = useState<Campaign | null>(null);
  const [sheet, setSheet] = useState<Sheet>(null);
  const [done, setDone] = useState<Done | null>(null);

  // Who
  const [daysChoice, setDaysChoice] = useState<DaysChoice>(30);
  const [customDays, setCustomDays] = useState("");
  const [excludeUpcoming, setExcludeUpcoming] = useState(true);
  const [serviceIds, setServiceIds] = useState<number[]>([]);
  const [staffIds, setStaffIds] = useState<number[]>([]);
  const [audience, setAudience] = useState<CampaignAudience | null>(null);
  const [audienceLoading, setAudienceLoading] = useState(false);
  const [audienceError, setAudienceError] = useState<string | null>(null);
  const [showList, setShowList] = useState<"eligible" | "excluded" | null>(null);

  // Offer
  const [offerMode, setOfferMode] = useState<"existing" | "new">("existing");
  const [promotionId, setPromotionId] = useState<number | null>(null);
  const [offerForm, setOfferForm] = useState<OfferForm>(EMPTY_OFFER);
  const [offerErrors, setOfferErrors] = useState<Record<string, string>>({});

  // Email
  const [template, setTemplate] = useState<CampaignTemplateKey>("return");
  const [holidayName, setHolidayName] = useState<string>("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [emailErrors, setEmailErrors] = useState<Record<string, string>>({});
  const lastDefaults = useRef<{ subject: string; message: string }>({ subject: "", message: "" });

  // Review
  const [saving, setSaving] = useState(false);
  const [stepError, setStepError] = useState<string | null>(null);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);
  const [sending, setSending] = useState(false);
  const [confirm, setConfirm] = useState<"send" | "schedule" | null>(null);
  const [scheduleDate, setScheduleDate] = useState<string | null>(null);
  const [scheduleTime, setScheduleTime] = useState<string | null>(null);

  const inactivityDays =
    daysChoice === "custom" ? Number(customDays) || 0 : daysChoice;

  // ── Initial load ───────────────────────────────────────────────────
  const applyTemplateDefaults = useCallback(
    (key: CampaignTemplateKey, tpls: CampaignTemplates | null, force: boolean) => {
      const tpl = tpls?.templates.find((x) => x.key === key);
      if (!tpl) return;
      // Replace only text the owner hasn't changed
      setSubject((prev) =>
        force || !prev.trim() || prev === lastDefaults.current.subject ? tpl.subject : prev,
      );
      setMessage((prev) =>
        force || !prev.trim() || prev === lastDefaults.current.message ? tpl.message : prev,
      );
      lastDefaults.current = { subject: tpl.subject, message: tpl.message };
    },
    [],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    setForbidden(false);
    try {
      const [svc, team, hours, tpls, offerList, existing] = await Promise.all([
        fetchOwnerBookingServices(businessId).catch(() => [] as OwnerBookingService[]),
        isSolo
          ? Promise.resolve([] as OwnerBookingStaff[])
          : fetchOwnerBookingStaff(businessId).catch(() => [] as OwnerBookingStaff[]),
        fetchOwnerBusinessHours(businessId).catch(() => null),
        fetchCampaignTemplates(),
        fetchMyPromotions({ per_page: 50 }).catch(() => null),
        isEdit ? fetchCampaign(editId as number) : Promise.resolve(null),
      ]);
      setServices(svc);
      setStaff(team);
      setTimeZone(hours?.timezone ?? null);
      setTemplates(tpls);
      const open = (offerList?.items ?? []).filter((p) => p.status === "active");
      setOffers(open);

      if (existing) {
        setSavedCampaign(existing);
        const d = existing.inactivity_days ?? 30;
        if (d === 30 || d === 60 || d === 90) setDaysChoice(d);
        else {
          setDaysChoice("custom");
          setCustomDays(String(d));
        }
        setExcludeUpcoming(existing.exclude_upcoming);
        setServiceIds(existing.service_ids);
        setStaffIds(existing.staff_ids);
        setOfferMode("existing");
        setPromotionId(existing.promotion_id);
        setTemplate(existing.template);
        setHolidayName(existing.holiday_name ?? "");
        setSubject(existing.subject);
        setMessage(existing.message);
        const tpl = tpls.templates.find((x) => x.key === existing.template);
        lastDefaults.current = { subject: tpl?.subject ?? "", message: tpl?.message ?? "" };
      } else {
        if (!open.length) setOfferMode("new");
        applyTemplateDefaults("return", tpls, true);
      }
    } catch (err) {
      Logger.warn("Campaign create load failed:", err);
      if (isCampaignForbidden(err)) setForbidden(true);
      else setLoadError(campaignErrorText(err, t("bcbLoadError")));
    } finally {
      setLoading(false);
    }
  }, [applyTemplateDefaults, businessId, editId, isEdit, isSolo, t]);

  useEffect(() => {
    load();
  }, [load]);

  // ── Live audience (Who step) ───────────────────────────────────────
  const audienceSeq = useRef(0);
  useEffect(() => {
    if (loading || forbidden || loadError) return;
    if (inactivityDays < 1) {
      setAudience(null);
      return;
    }
    const seq = ++audienceSeq.current;
    setAudienceLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetchCampaignAudience({
          inactivity_days: inactivityDays,
          service_ids: serviceIds,
          staff_ids: staffIds,
          exclude_upcoming: excludeUpcoming,
        });
        if (seq !== audienceSeq.current) return;
        setAudience(res);
        setAudienceError(null);
      } catch (err) {
        if (seq !== audienceSeq.current) return;
        Logger.warn("Campaign audience failed:", err);
        setAudienceError(campaignErrorText(err, t("bcbAudienceError")));
      } finally {
        if (seq === audienceSeq.current) setAudienceLoading(false);
      }
    }, AUDIENCE_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [excludeUpcoming, forbidden, inactivityDays, loadError, loading, serviceIds, staffIds, t]);

  // ── Validation per step ────────────────────────────────────────────
  const validateOffer = (): Record<string, string> => {
    const e: Record<string, string> = {};
    if (offerMode === "existing") {
      if (promotionId == null) e.promotion_id = t("bcbErrPickOffer");
      return e;
    }
    const f = offerForm;
    if (!f.title.trim()) e.title = t("bcbErrOfferTitle");
    if (!f.description.trim()) e.description = t("bcbErrOfferDescription");
    const value = Number(f.discountValue.replace(",", "."));
    if (!f.discountValue.trim() || !Number.isFinite(value) || value <= 0) {
      e.discount_value = t("bcbErrDiscount");
    } else if (f.discountType === "percent" && value > 100) {
      e.discount_value = t("bcbErrPercentMax");
    }
    if (!f.serviceIds.length) e.service_ids = t("bcbErrServices");
    if (!f.bookByDate || !f.bookByTime) e.booking_ends_at = t("bcbErrBookBy");
    if (!f.visitFrom || !f.visitTo) e.visit_starts_on = t("bcbErrVisitDates");
    else if (f.visitTo < f.visitFrom) e.visit_starts_on = t("bcbErrVisitOrder");
    return e;
  };

  const validateEmail = (): Record<string, string> => {
    const e: Record<string, string> = {};
    if (!subject.trim()) e.subject = t("bcbErrSubject");
    if (!message.trim()) e.message = t("bcbErrMessage");
    if (template === "holiday" && !holidayName.trim()) e.holiday_name = t("bcbErrHoliday");
    return e;
  };

  const buildPayload = (): CampaignPayload => {
    const payload: CampaignPayload = {
      template,
      ...(template === "holiday" ? { holiday_name: holidayName.trim() } : {}),
      subject: subject.trim(),
      message: message.trim(),
      inactivity_days: inactivityDays,
      service_ids: serviceIds,
      staff_ids: staffIds,
      exclude_upcoming: excludeUpcoming,
    };
    if (offerMode === "existing" && promotionId != null) {
      payload.promotion_id = promotionId;
    } else if (offerMode === "new") {
      const f = offerForm;
      const startsAt = promotionBookingStartNow(timeZone);
      const offer: CampaignNewOffer = {
        title: f.title.trim(),
        description: f.description.trim(),
        audience: f.audience,
        discount_type: f.discountType,
        discount_value: Number(f.discountValue.replace(",", ".")) || 0,
        service_ids: [...f.serviceIds].sort((a, b) => a - b),
        ...(startsAt ? { booking_starts_at: startsAt } : {}),
        booking_ends_at: `${f.bookByDate} ${f.bookByTime}`,
        visit_starts_on: f.visitFrom as string,
        visit_ends_on: f.visitTo as string,
        is_public: f.isPublic,
      };
      payload.offer = offer;
    }
    return payload;
  };

  const loadPreview = useCallback(async (id: number) => {
    setPreviewLoading(true);
    setPreviewError(null);
    try {
      const html = await fetchCampaignPreview(id);
      setPreviewHtml(html || null);
      if (!html) setPreviewError(t("bcbPreviewEmpty"));
    } catch (err) {
      Logger.warn("Campaign preview failed:", err);
      setPreviewError(campaignErrorText(err, t("bcbPreviewError")));
    } finally {
      setPreviewLoading(false);
    }
  }, [t]);

  /** Save as draft (create or update). Returns the campaign or null. */
  const saveDraft = async (): Promise<Campaign | null> => {
    setSaving(true);
    setStepError(null);
    try {
      const payload = buildPayload();
      const saved =
        campaignId != null
          ? await updateCampaign(campaignId, payload)
          : await createCampaign(payload);
      const id = saved.id || campaignId;
      if (id) setCampaignId(id);
      setSavedCampaign(saved);
      // An offer made here now exists: don't create it again on the next save
      if (offerMode === "new" && saved.promotion_id != null) {
        setOfferMode("existing");
        setPromotionId(saved.promotion_id);
      }
      return { ...saved, id: id ?? saved.id };
    } catch (err) {
      Logger.warn("Campaign save failed:", err);
      setStepError(campaignErrorText(err, t("bcbSaveError")));
      return null;
    } finally {
      setSaving(false);
    }
  };

  // ── Navigation ─────────────────────────────────────────────────────
  const stepIndex = STEPS.indexOf(step);

  const goBack = () => {
    setStepError(null);
    if (stepIndex <= 0) router.back();
    else setStep(STEPS[stepIndex - 1]);
  };

  const goNext = async () => {
    setStepError(null);
    if (step === "who") {
      setStep("offer");
    } else if (step === "offer") {
      const e = validateOffer();
      setOfferErrors(e);
      if (Object.keys(e).length) return;
      setStep("email");
    } else if (step === "email") {
      const e = validateEmail();
      setEmailErrors(e);
      if (Object.keys(e).length) return;
      const saved = await saveDraft();
      if (!saved) return;
      setStep("review");
      if (saved.id) loadPreview(saved.id);
    }
  };

  const saveAndExit = async () => {
    const saved = await saveDraft();
    if (!saved) return;
    showBanner(t("bcbDraftSavedTitle"), t("bcbDraftSavedMessage"), "success", 3000);
    router.back();
  };

  const sendTest = async () => {
    if (campaignId == null || testing) return;
    setTesting(true);
    try {
      // Save the latest text first so the test matches
      const saved = await saveDraft();
      if (!saved) return;
      const msg = await sendCampaignTest(campaignId);
      showBanner(t("bcbTestSentTitle"), msg ?? t("bcbTestSentMessage"), "success", 3500);
    } catch (err) {
      Logger.warn("Campaign test failed:", err);
      showBanner(t("bcbTestFailedTitle"), campaignErrorText(err, t("bcbTestFailed")), "error", 4000);
    } finally {
      setTesting(false);
    }
  };

  const doSend = async (mode: "send" | "schedule") => {
    if (campaignId == null || sending) return;
    const scheduledAt =
      mode === "schedule" && scheduleDate && scheduleTime
        ? `${scheduleDate} ${scheduleTime}`
        : null;
    setSending(true);
    try {
      await sendCampaign(campaignId, scheduledAt);
      setConfirm(null);
      setDone({ mode: scheduledAt ? "scheduled" : "sent", at: scheduledAt, id: campaignId });
    } catch (err) {
      Logger.warn("Campaign send failed:", err);
      setConfirm(null);
      // 422: no offer, offer not open, nobody to send to, over the limit
      setStepError(campaignErrorText(err, t("bcbSendError")));
    } finally {
      setSending(false);
    }
  };

  // ── Derived display values ─────────────────────────────────────────
  const allowance = audience?.allowance ?? null;
  const overLimit = !!allowance && !!audience && audience.eligible > allowance.remaining;
  const selectedOffer = offers.find((p) => p.id === promotionId) ?? null;
  const offerSummary = selectedOffer
    ? {
        title: selectedOffer.title,
        savings: selectedOffer.savings_label,
        audience: selectedOffer.audience_label,
        booking: selectedOffer.booking_label,
        visit: selectedOffer.visit_label,
      }
    : savedCampaign?.offer && savedCampaign.offer.id === promotionId
      ? {
          title: savedCampaign.offer.title,
          savings: savedCampaign.offer.savings_label,
          audience: savedCampaign.offer.audience_label,
          booking: savedCampaign.offer.booking_label,
          visit: savedCampaign.offer.visit_label,
        }
      : null;
  const namesFor = (ids: number[], list: { id: number; name: string }[], all: string) => {
    const names = list.filter((x) => ids.includes(x.id)).map((x) => x.name);
    if (!names.length) return all;
    return names.length <= 2 ? names.join(", ") : t("bcbCountSelected", { count: names.length });
  };
  const recipients = audience?.eligible ?? 0;
  const dateText = (d: string | null) => (d ? dayjs(d).format("MMM D, YYYY") : null);
  const setOffer = <K extends keyof OfferForm>(key: K, value: OfferForm[K]) => {
    setOfferForm((prev) => ({ ...prev, [key]: value }));
    setOfferErrors((prev) => {
      if (!Object.keys(prev).length) return prev;
      const next = { ...prev };
      delete next[key === "bookByDate" || key === "bookByTime" ? "booking_ends_at" : key === "visitFrom" || key === "visitTo" ? "visit_starts_on" : key === "serviceIds" ? "service_ids" : key === "discountValue" || key === "discountType" ? "discount_value" : (key as string)];
      return next;
    });
  };
  const insertToken = (token: string) => {
    setMessage((prev) => `${prev}${prev && !/\s$/.test(prev) ? " " : ""}${token}`);
    setEmailErrors((prev) => ({ ...prev, message: "" }));
  };

  // ── Render ─────────────────────────────────────────────────────────
  const headerTitle = isEdit ? t("bcbEditTitle") : t("bcbCreateTitle");

  if (done) {
    const when = formatCampaignDateTime(done.at);
    return (
      <View style={styles.container}>
        <FlowHeader title={headerTitle} onBack={resetToDashboardHome} backIcon="close" />
        <View style={styles.doneBody}>
          <View style={styles.doneHalo}>
            <View style={styles.doneCircle}>
              <Ionicons
                name={done.mode === "scheduled" ? "time" : "paper-plane"}
                size={iconScale(36)}
                color={theme.white}
              />
            </View>
          </View>
          <Text style={styles.doneTitle} accessibilityRole="header">
            {done.mode === "scheduled" ? t("bcbDoneScheduledTitle") : t("bcbDoneSentTitle")}
          </Text>
          <Text style={styles.doneText}>
            {done.mode === "scheduled"
              ? t("bcbDoneScheduledMessage", { date: when ?? "" })
              : t("bcbDoneSentMessage")}
          </Text>
          <PromotionInfoNote text={t("bcbDoneNote")} style={{ alignSelf: "stretch" }} />
        </View>
        <FlowFooter
          row
          secondary={{ label: t("goToHome"), onPress: resetToDashboardHome, icon: "home" }}
          primary={{
            label: t("bcbViewResults"),
            onPress: () =>
              router.replace({
                pathname: CAMPAIGN_DETAIL_ROUTE,
                params: { id: String(done.id) },
              } as any),
            trailingIcon: "arrow-forward",
          }}
        />
      </View>
    );
  }

  if (loading || loadError || forbidden) {
    return (
      <View style={styles.container}>
        <FlowHeader title={headerTitle} onBack={() => router.back()} backIcon="close" />
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
            message={loadError ?? undefined}
            actionLabel={t("retry")}
            onAction={load}
          />
        )}
      </View>
    );
  }

  const holidayOptions = (templates?.holidays ?? []).map((h) => ({
    value: h.name,
    label: h.name,
    description: formatCampaignDate(h.date) ?? undefined,
  }));
  const templateOptions = (templates?.templates ?? []).length
    ? (templates?.templates ?? []).map((tpl) => ({
        value: tpl.key as string,
        label:
          tpl.key === "return"
            ? t("bcbTemplateReturn")
            : tpl.key === "holiday"
              ? t("bcbTemplateHoliday")
              : tpl.name ?? String(tpl.key),
      }))
    : [
        { value: "return", label: t("bcbTemplateReturn") },
        { value: "holiday", label: t("bcbTemplateHoliday") },
      ];

  const primaryLabel =
    step === "review"
      ? t("bcbSendNowCount", { count: recipients })
      : t("next");

  return (
    <View style={styles.container}>
      <FlowHeader
        title={headerTitle}
        step={{ current: stepIndex + 1, total: STEPS.length }}
        onBack={goBack}
        backDisabled={saving || sending}
        backIcon={stepIndex === 0 ? "close" : "back"}
      />
      <KeyboardAwareScrollView
        bottomOffset={moderateHeightScale(32)}
        keyboardDismissMode="interactive"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {stepError ? (
          <PromotionInfoNote text={stepError} tone="danger" icon="alert-circle-outline" />
        ) : null}

        {/* WHO */}
        {step === "who" ? (
          <>
            <FlowTitle title={t("bcbWhoTitle")} subtitle={t("bcbWhoSub")} />
            <View style={styles.field}>
              <SectionLabel label={t("bcbNoVisitIn")} />
              <PillChoice<DaysChoice>
                options={[
                  { value: 30, label: t("bcbDays", { count: 30 }) },
                  { value: 60, label: t("bcbDays", { count: 60 }) },
                  { value: 90, label: t("bcbDays", { count: 90 }) },
                  { value: "custom", label: t("bcbCustom") },
                ]}
                value={daysChoice}
                onChange={setDaysChoice}
                accessibilityLabel={t("bcbNoVisitIn")}
              />
              {daysChoice === "custom" ? (
                <EditorTextInput
                  value={customDays}
                  onChangeText={(v) => setCustomDays(v.replace(/[^0-9]/g, "").slice(0, 4))}
                  placeholder="45"
                  keyboardType="number-pad"
                  accessibilityLabel={t("bcbCustomDaysA11y")}
                  helper={t("bcbCustomDaysHelp")}
                />
              ) : null}
              {inactivityDays >= 1 ? (
                <Text style={styles.muted}>{t("bcbNoVisitLine", { count: inactivityDays })}</Text>
              ) : null}
            </View>

            <ToggleRow
              label={t("bcbExcludeUpcoming")}
              sub={t("bcbExcludeUpcomingSub")}
              value={excludeUpcoming}
              onChange={setExcludeUpcoming}
            />

            {staff.length > 1 ? (
              <EditorRow
                labels={[{ label: t("bcbFilterServices") }, { label: t("bcbFilterStaff") }]}
              >
                <EditorPickerBox
                  icon="cut-outline"
                  value={namesFor(serviceIds, services, t("bcbAllServices"))}
                  placeholder={t("bcbAllServices")}
                  onPress={() => setSheet("services")}
                />
                <EditorPickerBox
                  icon="people-outline"
                  value={namesFor(staffIds, staff, t("bcbAllStaff"))}
                  placeholder={t("bcbAllStaff")}
                  onPress={() => setSheet("staff")}
                />
              </EditorRow>
            ) : (
              <EditorPickerBox
                label={t("bcbFilterServices")}
                icon="cut-outline"
                value={namesFor(serviceIds, services, t("bcbAllServices"))}
                placeholder={t("bcbAllServices")}
                onPress={() => setSheet("services")}
              />
            )}
            {serviceIds.length || staffIds.length ? (
              <EditorHelper text={t("bcbFilterNote")} />
            ) : null}

            {/* Result */}
            <View style={styles.audienceCard}>
              <View style={styles.audienceTop}>
                <View style={styles.audienceIcon}>
                  <Ionicons name="people" size={iconScale(22)} color={theme.darkGreen} />
                </View>
                <View style={{ flex: 1 }}>
                  {audienceLoading && !audience ? (
                    <ActivityIndicator color={theme.darkGreen} style={{ alignSelf: "flex-start" }} />
                  ) : (
                    <Text style={styles.bigCount} accessibilityLiveRegion="polite">
                      {audience?.eligible ?? 0}
                    </Text>
                  )}
                  <Text style={styles.audienceLabel}>{t("bcbEligibleRecipients")}</Text>
                </View>
                {audienceLoading && audience ? (
                  <ActivityIndicator size="small" color={theme.darkGreen} />
                ) : null}
              </View>
              {audience ? (
                <Text style={styles.muted}>
                  {t("bcbSelectedExcluded", {
                    selected: audience.selected,
                    excluded: audience.excluded,
                  })}
                </Text>
              ) : null}
              <Text style={styles.small}>{t("bcbAudienceBasis")}</Text>
              {audienceError ? <EditorFieldError message={audienceError} /> : null}

              {audience?.exclusions.filter((e) => e.count > 0).length ? (
                <View style={styles.exclusions}>
                  <Text style={styles.exclusionsTitle}>{t("bcbLeftOut")}</Text>
                  {audience.exclusions
                    .filter((e) => e.count > 0)
                    .map((e) => (
                      <View key={e.reason || e.label} style={styles.exclusionRow}>
                        <Text style={styles.exclusionLabel}>{e.label}</Text>
                        <Text style={styles.exclusionCount}>{e.count}</Text>
                      </View>
                    ))}
                </View>
              ) : null}

              {audience && (audience.eligibleCustomers.length || audience.excludedCustomers.length) ? (
                <View style={styles.listToggleRow}>
                  {audience.eligibleCustomers.length ? (
                    <TouchableOpacity
                      onPress={() => setShowList((v) => (v === "eligible" ? null : "eligible"))}
                      style={[styles.listToggle, showList === "eligible" && styles.listToggleOn]}
                      accessibilityRole="button"
                      accessibilityState={{ expanded: showList === "eligible" }}
                    >
                      <Text style={[styles.listToggleText, showList === "eligible" && styles.listToggleTextOn]}>
                        {t("bcbShowEligible")}
                      </Text>
                    </TouchableOpacity>
                  ) : null}
                  {audience.excludedCustomers.length ? (
                    <TouchableOpacity
                      onPress={() => setShowList((v) => (v === "excluded" ? null : "excluded"))}
                      style={[styles.listToggle, showList === "excluded" && styles.listToggleOn]}
                      accessibilityRole="button"
                      accessibilityState={{ expanded: showList === "excluded" }}
                    >
                      <Text style={[styles.listToggleText, showList === "excluded" && styles.listToggleTextOn]}>
                        {t("bcbShowExcluded")}
                      </Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              ) : null}
              {audience && showList ? (
                <View style={styles.peopleList}>
                  {(showList === "eligible" ? audience.eligibleCustomers : audience.excludedCustomers)
                    .slice(0, LIST_PREVIEW)
                    .map((c) => {
                      const sub =
                        showList === "excluded"
                          ? c.reasonLabel ?? c.reason
                          : c.daysSinceVisit != null
                            ? t("bcbDaysAgo", { count: c.daysSinceVisit })
                            : formatCampaignDate(c.lastVisitOn);
                      return (
                        <View key={String(c.id)} style={styles.personRow}>
                          <Text style={styles.personName} numberOfLines={1}>
                            {c.name || c.email || "—"}
                          </Text>
                          {sub ? (
                            <Text style={styles.personSub} numberOfLines={1}>
                              {sub}
                            </Text>
                          ) : null}
                        </View>
                      );
                    })}
                  {(showList === "eligible" ? audience.eligibleCustomers : audience.excludedCustomers).length >
                  LIST_PREVIEW ? (
                    <Text style={styles.small}>
                      {t("bcbAndMore", {
                        count:
                          (showList === "eligible" ? audience.eligibleCustomers : audience.excludedCustomers)
                            .length - LIST_PREVIEW,
                      })}
                    </Text>
                  ) : null}
                </View>
              ) : null}
            </View>

            <PromotionInfoNote text={t("bcbPermissionNote")} />
            {allowance ? (
              <PromotionInfoNote
                text={
                  overLimit
                    ? t("bcbOverLimit", { remaining: allowance.remaining })
                    : t("bcbAllowanceLeft", { count: allowance.remaining })
                }
                tone={overLimit ? "danger" : "info"}
                icon={overLimit ? "alert-circle-outline" : "mail-outline"}
              />
            ) : null}
          </>
        ) : null}

        {/* OFFER */}
        {step === "offer" ? (
          <>
            <FlowTitle title={t("bcbOfferTitle")} subtitle={t("bcbOfferSub")} />
            <EditorSegmented<"existing" | "new">
              options={[
                { value: "existing", label: t("bcbUseExistingOffer") },
                { value: "new", label: t("bcbCreatePrivateOffer") },
              ]}
              value={offerMode}
              onChange={(v) => {
                setOfferMode(v);
                setOfferErrors({});
              }}
              accessibilityLabel={t("bcbOfferTitle")}
            />

            {offerMode === "existing" ? (
              <View style={styles.field}>
                {offers.length || offerSummary ? (
                  <>
                    {offerSummary && !selectedOffer ? (
                      <OfferOption
                        title={offerSummary.title ?? t("bcbOfferNumber", { id: promotionId })}
                        sub={[offerSummary.savings, offerSummary.audience].filter(Boolean).join(" · ")}
                        meta={offerSummary.booking}
                        selected
                        onPress={() => {}}
                        styles={styles}
                        theme={theme}
                      />
                    ) : null}
                    {offers.map((p) => (
                      <OfferOption
                        key={p.id}
                        title={p.title}
                        sub={[p.savings_label, p.audience_label].filter(Boolean).join(" · ")}
                        meta={p.booking_label}
                        selected={p.id === promotionId}
                        onPress={() => {
                          setPromotionId(p.id);
                          setOfferErrors({});
                        }}
                        styles={styles}
                        theme={theme}
                      />
                    ))}
                  </>
                ) : (
                  <PromotionInfoNote text={t("bcbNoOpenOffers")} />
                )}
                <EditorFieldError message={offerErrors.promotion_id} />
              </View>
            ) : (
              <>
                <EditorTextInput
                  label={t("bcbOfferFieldTitle")}
                  required
                  value={offerForm.title}
                  onChangeText={(v) => setOffer("title", v)}
                  placeholder={t("bcbOfferTitlePlaceholder")}
                  maxLength={120}
                  error={offerErrors.title}
                />
                <View style={styles.field}>
                  <EditorLabel label={t("bcbOfferFieldAudience")} required />
                  <EditorChips<PromotionAudience>
                    options={[
                      { value: "returning", label: t("bcbAudienceReturning") },
                      { value: "everyone", label: t("bcbAudienceEveryone") },
                      { value: "new", label: t("bcbAudienceNew") },
                    ]}
                    value={offerForm.audience}
                    onChange={(v) => setOffer("audience", v)}
                    accessibilityLabel={t("bcbOfferFieldAudience")}
                  />
                </View>
                <View style={styles.field}>
                  <EditorLabel label={t("bcbOfferFieldDiscount")} required />
                  <EditorSegmented<PromotionDiscountType>
                    options={[
                      { value: "percent", label: t("bcbDiscountPercent") },
                      { value: "fixed", label: t("bcbDiscountFixed") },
                    ]}
                    value={offerForm.discountType}
                    onChange={(v) => setOffer("discountType", v)}
                    accessibilityLabel={t("bcbOfferFieldDiscount")}
                  />
                  <EditorTextInput
                    value={offerForm.discountValue}
                    onChangeText={(v) => setOffer("discountValue", v.replace(/[^0-9.,]/g, ""))}
                    prefix={offerForm.discountType === "fixed" ? "$" : "%"}
                    placeholder={offerForm.discountType === "fixed" ? "10" : "15"}
                    keyboardType="decimal-pad"
                    accessibilityLabel={t("bcbOfferFieldDiscount")}
                    error={offerErrors.discount_value}
                  />
                </View>
                <EditorPickerBox
                  label={t("bcbOfferFieldServices")}
                  required
                  icon="cut-outline"
                  value={
                    offerForm.serviceIds.length
                      ? namesFor(offerForm.serviceIds, services, "")
                      : null
                  }
                  placeholder={t("bcbPickServices")}
                  onPress={() => setSheet("offerServices")}
                  error={offerErrors.service_ids}
                />
                <View>
                  <EditorRow
                    labels={[
                      { label: t("bcbOfferFieldBookBy"), required: true },
                      { label: t("bcbOfferFieldBookByTime"), required: true },
                    ]}
                  >
                    <EditorPickerBox
                      icon="calendar-outline"
                      value={dateText(offerForm.bookByDate)}
                      placeholder={t("bcbPickDate")}
                      onPress={() => setSheet("bookByDate")}
                      invalid={!!offerErrors.booking_ends_at}
                    />
                    <EditorPickerBox
                      icon="time-outline"
                      value={offerForm.bookByTime ? formatClassTime(offerForm.bookByTime) : null}
                      placeholder={t("bcbPickTime")}
                      onPress={() => setSheet("bookByTime")}
                      invalid={!!offerErrors.booking_ends_at}
                    />
                  </EditorRow>
                  <EditorFieldError message={offerErrors.booking_ends_at} />
                </View>
                <View>
                  <EditorRow
                    labels={[
                      { label: t("bcbOfferFieldVisitFrom"), required: true },
                      { label: t("bcbOfferFieldVisitTo"), required: true },
                    ]}
                  >
                    <EditorPickerBox
                      icon="calendar-outline"
                      value={dateText(offerForm.visitFrom)}
                      placeholder={t("bcbPickDate")}
                      onPress={() => setSheet("visitFrom")}
                      invalid={!!offerErrors.visit_starts_on}
                    />
                    <EditorPickerBox
                      icon="calendar-outline"
                      value={dateText(offerForm.visitTo)}
                      placeholder={t("bcbPickDate")}
                      onPress={() => setSheet("visitTo")}
                      invalid={!!offerErrors.visit_starts_on}
                    />
                  </EditorRow>
                  <EditorFieldError message={offerErrors.visit_starts_on} />
                </View>
                <EditorTextInput
                  label={t("bcbOfferFieldDescription")}
                  required
                  value={offerForm.description}
                  onChangeText={(v) => setOffer("description", v)}
                  placeholder={t("bcbOfferDescriptionPlaceholder")}
                  multiline
                  minLines={3}
                  maxLength={2000}
                  error={offerErrors.description}
                />
                <ToggleRow
                  label={t("bcbShowOnProfile")}
                  sub={offerForm.isPublic ? t("bcbShowOnProfileOn") : t("bcbShowOnProfileOff")}
                  value={offerForm.isPublic}
                  onChange={(v) => setOffer("isPublic", v)}
                />
              </>
            )}
          </>
        ) : null}

        {/* EMAIL */}
        {step === "email" ? (
          <>
            <FlowTitle title={t("bcbEmailTitle")} subtitle={t("bcbEmailSub")} />
            <View style={styles.field}>
              <EditorLabel label={t("bcbTemplate")} />
              <EditorSegmented<string>
                options={templateOptions}
                value={template as string}
                onChange={(v) => {
                  setTemplate(v);
                  applyTemplateDefaults(v, templates, false);
                }}
                accessibilityLabel={t("bcbTemplate")}
              />
            </View>
            {template === "holiday" ? (
              holidayOptions.length ? (
                <EditorPickerBox
                  label={t("bcbHoliday")}
                  required
                  icon="gift-outline"
                  value={holidayName || null}
                  placeholder={t("bcbPickHoliday")}
                  onPress={() => setSheet("holiday")}
                  error={emailErrors.holiday_name}
                />
              ) : (
                <EditorTextInput
                  label={t("bcbHoliday")}
                  required
                  value={holidayName}
                  onChangeText={(v) => {
                    setHolidayName(v);
                    setEmailErrors((p) => ({ ...p, holiday_name: "" }));
                  }}
                  placeholder={t("bcbHolidayPlaceholder")}
                  error={emailErrors.holiday_name}
                />
              )
            ) : null}
            <EditorTextInput
              label={t("bcbSubject")}
              required
              value={subject}
              onChangeText={(v) => {
                setSubject(v);
                setEmailErrors((p) => ({ ...p, subject: "" }));
              }}
              placeholder={t("bcbSubjectPlaceholder")}
              error={emailErrors.subject}
            />
            <EditorTextInput
              label={t("bcbMessage")}
              required
              value={message}
              onChangeText={(v) => {
                setMessage(v);
                setEmailErrors((p) => ({ ...p, message: "" }));
              }}
              placeholder={t("bcbMessagePlaceholder")}
              multiline
              minLines={7}
              error={emailErrors.message}
            />
            {templates?.tokens.length ? (
              <View style={styles.field}>
                <EditorLabel label={t("bcbTokens")} />
                <View style={styles.tokens}>
                  {templates.tokens.map((tk) => (
                    <TouchableOpacity
                      key={tk}
                      onPress={() => insertToken(tk)}
                      style={styles.token}
                      activeOpacity={0.8}
                      accessibilityRole="button"
                      accessibilityLabel={t("bcbInsertToken", { token: tk })}
                    >
                      <Text style={styles.tokenText}>{tk}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <EditorHelper text={t("bcbTokensHelp")} />
              </View>
            ) : null}
            <PromotionInfoNote text={t("bcbFromNote")} icon="mail-outline" />
          </>
        ) : null}

        {/* REVIEW */}
        {step === "review" ? (
          <>
            <FlowTitle title={t("bcbReviewTitle")} subtitle={t("bcbReviewSub")} />
            <View style={styles.summaryCard}>
              <SummaryRow label={t("bcbTo")} value={t("bcbEligibleCount", { count: recipients })} styles={styles} />
              <SummaryRow label={t("bcbSubject")} value={subject} styles={styles} />
              {offerSummary || offerMode === "new" ? (
                <SummaryRow
                  label={t("bcbOffer")}
                  value={
                    offerSummary
                      ? [offerSummary.savings, offerSummary.title].filter(Boolean).join(" · ")
                      : offerForm.title
                  }
                  styles={styles}
                />
              ) : null}
            </View>
            {overLimit && allowance ? (
              <PromotionInfoNote
                text={t("bcbOverLimit", { remaining: allowance.remaining })}
                tone="danger"
                icon="alert-circle-outline"
              />
            ) : null}

            {/* Above the preview: the WebView takes the page's scroll */}
            <TouchableOpacity
              onPress={sendTest}
              disabled={testing || saving}
              style={[styles.testBtn, (testing || saving) && { opacity: 0.6 }]}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityState={{ busy: testing }}
            >
              {testing ? (
                <ActivityIndicator color={theme.darkGreen} />
              ) : (
                <>
                  <Ionicons name="mail-unread-outline" size={iconScale(18)} color={theme.darkGreen} />
                  <Text style={styles.testText}>{t("bcbSendTest")}</Text>
                </>
              )}
            </TouchableOpacity>
            <SectionLabel label={t("bcbPreview")} />
            <View style={styles.previewCard}>
              {previewLoading ? (
                <View style={styles.previewCenter}>
                  <ActivityIndicator color={theme.darkGreen} />
                </View>
              ) : previewHtml ? (
                <WebView
                  originWhitelist={["*"]}
                  source={{ html: previewHtml }}
                  style={styles.webview}
                  nestedScrollEnabled
                  setSupportMultipleWindows={false}
                  // Links in the preview must not navigate inside the app
                  onShouldStartLoadWithRequest={(req) =>
                    req.url === "about:blank" || req.url.startsWith("data:")
                  }
                />
              ) : (
                <View style={styles.previewCenter}>
                  <Text style={styles.muted}>{previewError ?? t("bcbPreviewEmpty")}</Text>
                  {campaignId != null ? (
                    <TouchableOpacity
                      onPress={() => loadPreview(campaignId)}
                      style={styles.smallBtn}
                      accessibilityRole="button"
                    >
                      <Text style={styles.smallBtnText}>{t("retry")}</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              )}
            </View>

            <PromotionInfoNote text={t("bcbFinalCheckNote")} />
          </>
        ) : null}
      </KeyboardAwareScrollView>

      {step === "review" ? (
        <FlowFooter
          secondary={{
            label: t("bcbSchedule"),
            onPress: () => setSheet("scheduleDate"),
            icon: "schedule",
            disabled: saving || sending,
          }}
          primary={{
            label: primaryLabel,
            onPress: () => setConfirm("send"),
            disabled: saving || sending || recipients < 1,
            icon: "send",
          }}
          tertiary={{ label: t("bcbSaveDraftExit"), onPress: saveAndExit, disabled: saving || sending }}
          hint={recipients < 1 ? t("bcbNobodyHint") : null}
        />
      ) : (
        <FlowFooter
          row
          secondary={{
            label: stepIndex === 0 ? t("cancel") : t("back"),
            onPress: goBack,
            disabled: saving,
          }}
          primary={{
            label: primaryLabel,
            onPress: goNext,
            disabled: saving || (step === "who" && inactivityDays < 1),
            loading: saving,
            trailingIcon: "arrow-forward",
          }}
          tertiary={
            step === "email"
              ? { label: t("bcbSaveDraftExit"), onPress: saveAndExit, disabled: saving }
              : null
          }
        />
      )}

      {/* Sheets */}
      <CampaignMultiSelectSheet
        visible={sheet === "services"}
        title={t("bcbFilterServices")}
        subtitle={t("bcbFilterNote")}
        options={services.map((s) => ({ id: s.id, label: s.name, sub: null }))}
        selected={serviceIds}
        emptyText={t("bcbNoServices")}
        onDone={(ids) => {
          setServiceIds(ids);
          setSheet(null);
        }}
        onClose={() => setSheet(null)}
      />
      <CampaignMultiSelectSheet
        visible={sheet === "staff"}
        title={t("bcbFilterStaff")}
        subtitle={t("bcbFilterNote")}
        options={staff.map((s) => ({ id: s.id, label: s.name, sub: null }))}
        selected={staffIds}
        emptyText={t("bcbAllStaff")}
        onDone={(ids) => {
          setStaffIds(ids);
          setSheet(null);
        }}
        onClose={() => setSheet(null)}
      />
      <CampaignMultiSelectSheet
        visible={sheet === "offerServices"}
        title={t("bcbOfferFieldServices")}
        options={services.map((s) => ({
          id: s.id,
          label: s.name,
          sub: s.price ? formatCampaignMoney(s.price) : null,
        }))}
        selected={offerForm.serviceIds}
        emptyText={t("bcbNoServices")}
        onDone={(ids) => {
          setOffer("serviceIds", ids);
          setSheet(null);
        }}
        onClose={() => setSheet(null)}
      />
      <EditorDateSheet
        visible={sheet === "bookByDate"}
        value={offerForm.bookByDate}
        timeZone={timeZone}
        onConfirm={(d) => {
          setOffer("bookByDate", d);
          setSheet(offerForm.bookByTime ? null : "bookByTime");
        }}
        onClose={() => setSheet(null)}
      />
      <EditorTimeSheet
        visible={sheet === "bookByTime"}
        value={offerForm.bookByTime}
        date={offerForm.bookByDate}
        timeZone={timeZone}
        onConfirm={(time) => {
          setOffer("bookByTime", time);
          setSheet(null);
        }}
        onClose={() => setSheet(null)}
      />
      <EditorDateSheet
        visible={sheet === "visitFrom"}
        value={offerForm.visitFrom}
        timeZone={timeZone}
        onConfirm={(d) => {
          setOfferForm((prev) => ({
            ...prev,
            visitFrom: d,
            visitTo: prev.visitTo && prev.visitTo < d ? null : prev.visitTo,
          }));
          setOfferErrors((p) => ({ ...p, visit_starts_on: "" }));
          setSheet(offerForm.visitTo && offerForm.visitTo >= d ? null : "visitTo");
        }}
        onClose={() => setSheet(null)}
      />
      <EditorDateSheet
        visible={sheet === "visitTo"}
        value={offerForm.visitTo}
        timeZone={timeZone}
        minDate={offerForm.visitFrom ?? undefined}
        onConfirm={(d) => {
          setOffer("visitTo", d);
          setSheet(null);
        }}
        onClose={() => setSheet(null)}
      />
      <EditorOptionSheet<string>
        visible={sheet === "holiday"}
        title={t("bcbHoliday")}
        options={holidayOptions}
        selected={holidayName || null}
        onSelect={(v) => {
          setHolidayName(v);
          setEmailErrors((p) => ({ ...p, holiday_name: "" }));
          setSheet(null);
        }}
        onClose={() => setSheet(null)}
      />
      <EditorDateSheet
        visible={sheet === "scheduleDate"}
        value={scheduleDate}
        timeZone={timeZone}
        onConfirm={(d) => {
          setScheduleDate(d);
          setSheet("scheduleTime");
        }}
        onClose={() => setSheet(null)}
      />
      <EditorTimeSheet
        visible={sheet === "scheduleTime"}
        value={scheduleTime}
        date={scheduleDate}
        timeZone={timeZone}
        onConfirm={(time) => {
          setScheduleTime(time);
          setSheet(null);
          setConfirm("schedule");
        }}
        onClose={() => setSheet(null)}
      />

      <CampaignConfirmSheet
        visible={confirm === "send"}
        title={t("bcbConfirmSendTitle", { count: recipients })}
        message={t("bcbConfirmSendMessage")}
        confirmLabel={t("bcbSendNow")}
        loading={sending}
        onConfirm={() => doSend("send")}
        onClose={() => setConfirm(null)}
      />
      <CampaignConfirmSheet
        visible={confirm === "schedule"}
        title={t("bcbConfirmScheduleTitle")}
        message={t("bcbConfirmScheduleMessage", {
          date:
            formatCampaignDateTime(
              scheduleDate && scheduleTime ? `${scheduleDate} ${scheduleTime}` : null,
            ) ?? "",
        })}
        confirmLabel={t("bcbSchedule")}
        loading={sending}
        onConfirm={() => doSend("schedule")}
        onClose={() => setConfirm(null)}
      />
    </View>
  );
}

function OfferOption({
  title,
  sub,
  meta,
  selected,
  onPress,
  styles,
  theme,
}: {
  title: string;
  sub?: string | null;
  meta?: string | null;
  selected: boolean;
  onPress: () => void;
  styles: ReturnType<typeof createStyles>;
  theme: Theme;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={[styles.offerOption, selected && styles.offerOptionOn]}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={[title, sub, meta].filter(Boolean).join(", ")}
    >
      <Ionicons
        name={selected ? "radio-button-on" : "radio-button-off"}
        size={iconScale(22)}
        color={selected ? theme.darkGreen : theme.lightGreen5}
      />
      <View style={{ flex: 1, gap: moderateHeightScale(2) }}>
        <Text style={styles.offerTitle} numberOfLines={2}>
          {title}
        </Text>
        {sub ? <Text style={styles.offerSub}>{sub}</Text> : null}
        {meta ? <Text style={styles.small}>{meta}</Text> : null}
      </View>
    </TouchableOpacity>
  );
}

function SummaryRow({
  label,
  value,
  styles,
}: {
  label: string;
  value: string;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <View style={styles.summaryRow}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue}>{value}</Text>
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background },
    content: {
      paddingHorizontal: moderateWidthScale(16),
      paddingTop: moderateHeightScale(8),
      paddingBottom: moderateHeightScale(32),
      gap: moderateHeightScale(16),
    },
    field: { gap: moderateHeightScale(8) },
    muted: {
      fontSize: fontSize.size14,
      lineHeight: fontSize.size14 * 1.45,
      fontFamily: fonts.fontRegular,
      color: theme.textMuted,
    },
    small: {
      fontSize: fontSize.size12,
      lineHeight: fontSize.size12 * 1.45,
      fontFamily: fonts.fontRegular,
      color: theme.textMuted,
    },
    audienceCard: {
      backgroundColor: theme.white,
      borderRadius: moderateWidthScale(16),
      borderWidth: 1,
      borderColor: theme.lightGreen015,
      padding: moderateWidthScale(16),
      gap: moderateHeightScale(10),
    },
    audienceTop: { flexDirection: "row", alignItems: "center", gap: moderateWidthScale(14) },
    audienceIcon: {
      width: moderateWidthScale(52),
      height: moderateWidthScale(52),
      borderRadius: moderateWidthScale(26),
      backgroundColor: theme.mintTint,
      alignItems: "center",
      justifyContent: "center",
    },
    bigCount: {
      fontSize: fontSize.size32,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    audienceLabel: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
    },
    exclusions: {
      borderTopWidth: 1,
      borderTopColor: theme.lightGreen015,
      paddingTop: moderateHeightScale(10),
      gap: moderateHeightScale(6),
    },
    exclusionsTitle: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    exclusionRow: { flexDirection: "row", justifyContent: "space-between", gap: moderateWidthScale(8) },
    exclusionLabel: {
      flex: 1,
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: theme.textMuted,
    },
    exclusionCount: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    listToggleRow: { flexDirection: "row", gap: moderateWidthScale(8), flexWrap: "wrap" },
    listToggle: {
      minHeight: moderateHeightScale(40),
      paddingHorizontal: moderateWidthScale(14),
      borderRadius: moderateWidthScale(20),
      borderWidth: 1,
      borderColor: theme.lightGreen5,
      alignItems: "center",
      justifyContent: "center",
    },
    listToggleOn: { backgroundColor: theme.darkGreen, borderColor: theme.darkGreen },
    listToggleText: { fontSize: fontSize.size13, fontFamily: fonts.fontMedium, color: theme.darkGreen },
    listToggleTextOn: { color: theme.white },
    peopleList: { gap: moderateHeightScale(8) },
    personRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      gap: moderateWidthScale(8),
      paddingVertical: moderateHeightScale(4),
    },
    personName: {
      flex: 1,
      fontSize: fontSize.size14,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
    },
    personSub: {
      maxWidth: "55%",
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.textMuted,
      textAlign: "right",
    },
    offerOption: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: moderateWidthScale(12),
      backgroundColor: theme.white,
      borderRadius: moderateWidthScale(14),
      borderWidth: 1,
      borderColor: theme.lightGreen015,
      padding: moderateWidthScale(14),
    },
    offerOptionOn: { borderColor: theme.darkGreen, backgroundColor: theme.mintTint },
    offerTitle: { fontSize: fontSize.size15, fontFamily: fonts.fontBold, color: theme.darkGreen },
    offerSub: { fontSize: fontSize.size13, fontFamily: fonts.fontMedium, color: theme.orangeBrownText },
    tokens: { flexDirection: "row", flexWrap: "wrap", gap: moderateWidthScale(8) },
    token: {
      minHeight: moderateHeightScale(36),
      paddingHorizontal: moderateWidthScale(12),
      borderRadius: moderateWidthScale(18),
      backgroundColor: theme.tileGoldCream,
      borderWidth: 1,
      borderColor: theme.goldBorder,
      justifyContent: "center",
    },
    tokenText: { fontSize: fontSize.size13, fontFamily: fonts.fontMedium, color: theme.goldTextDark },
    summaryCard: {
      backgroundColor: theme.white,
      borderRadius: moderateWidthScale(14),
      borderWidth: 1,
      borderColor: theme.lightGreen015,
      paddingHorizontal: moderateWidthScale(14),
      paddingVertical: moderateHeightScale(6),
    },
    summaryRow: {
      flexDirection: "row",
      gap: moderateWidthScale(12),
      paddingVertical: moderateHeightScale(10),
    },
    summaryLabel: {
      width: moderateWidthScale(70),
      fontSize: fontSize.size13,
      fontFamily: fonts.fontMedium,
      color: theme.textMuted,
    },
    summaryValue: { flex: 1, fontSize: fontSize.size14, fontFamily: fonts.fontMedium, color: theme.darkGreen },
    previewCard: {
      height: moderateHeightScale(360),
      borderRadius: moderateWidthScale(16),
      borderWidth: 1,
      borderColor: theme.lightGreen015,
      backgroundColor: theme.white,
      overflow: "hidden",
    },
    webview: { flex: 1, backgroundColor: theme.white },
    previewCenter: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      gap: moderateHeightScale(10),
      padding: moderateWidthScale(16),
    },
    smallBtn: {
      minHeight: moderateHeightScale(40),
      paddingHorizontal: moderateWidthScale(16),
      borderRadius: moderateWidthScale(10),
      borderWidth: 1,
      borderColor: theme.darkGreen,
      justifyContent: "center",
    },
    smallBtnText: { fontSize: fontSize.size14, fontFamily: fonts.fontBold, color: theme.darkGreen },
    testBtn: {
      minHeight: moderateHeightScale(48),
      borderRadius: moderateWidthScale(12),
      borderWidth: 1.5,
      borderColor: theme.darkGreen,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: moderateWidthScale(8),
    },
    testText: { fontSize: fontSize.size15, fontFamily: fonts.fontBold, color: theme.darkGreen },
    doneBody: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: moderateWidthScale(24),
      gap: moderateHeightScale(14),
    },
    doneHalo: {
      width: moderateWidthScale(120),
      height: moderateWidthScale(120),
      borderRadius: moderateWidthScale(60),
      backgroundColor: theme.mintTint,
      alignItems: "center",
      justifyContent: "center",
    },
    doneCircle: {
      width: moderateWidthScale(80),
      height: moderateWidthScale(80),
      borderRadius: moderateWidthScale(40),
      backgroundColor: theme.darkGreen,
      alignItems: "center",
      justifyContent: "center",
    },
    doneTitle: {
      fontSize: fontSize.size24,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      textAlign: "center",
    },
    doneText: {
      fontSize: fontSize.size15,
      lineHeight: fontSize.size15 * 1.5,
      fontFamily: fonts.fontRegular,
      color: theme.textMuted,
      textAlign: "center",
    },
  });
