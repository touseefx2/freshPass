/**
 * Create / edit a Profile Promotion (owner). Fields follow the backend guide
 * (profile-promotions-app-guide.md §1); the look follows the client sample
 * "Create Promotion" in the app theme. Edit sends only what changed.
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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import dayjs from "dayjs";
import { useAppSelector, useTheme } from "@/src/hooks/hooks";
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
import { isSoloSubscription } from "@/src/state/slices/userSlice";
import {
  fetchOwnerBookingServices,
  fetchOwnerBookingStaff,
  fetchOwnerBusinessHours,
  type OwnerBookingService,
  type OwnerBookingStaff,
} from "@/src/services/ownerBookingService";
import { listMyReels } from "@/src/services/reelsService";
import type { OwnerReel } from "@/src/types/reels";
import {
  createPromotion,
  fetchMyPromotion,
  promotionErrorText,
  promotionFieldErrors,
  updatePromotion,
} from "@/src/services/promotionService";
import type {
  Promotion,
  PromotionAudience,
  PromotionDiscountType,
  PromotionPayload,
} from "@/src/types/promotion";
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
  EditorSheet,
  EditorTimeSheet,
} from "@/src/components/masterClasses/editorSheets";
import {
  WeekdayChips,
  type Weekday,
} from "@/src/components/masterClasses/editorStepParts";
import { formatClassTime } from "@/src/utils/masterClassHelpers";
import {
  apiToIsoWeekday,
  formatPromotionMoney,
  isoToApiWeekday,
  promotionBookingStartNow,
  splitServerDateTime,
  toHHmm,
} from "@/src/utils/promotionHelpers";
import { PromotionInfoNote } from "@/src/components/promotions/ownerParts";

const DETAIL_ROUTE = "/(main)/promotions/detail";
const TITLE_MAX = 120;
const DESCRIPTION_MAX = 2000;
const IMAGE_MAX_BYTES = 5 * 1024 * 1024;

type Form = {
  title: string;
  description: string;
  audience: PromotionAudience;
  discountType: PromotionDiscountType;
  discountValue: string;
  serviceIds: number[];
  staffIds: number[];
  bookByDate: string | null;
  bookByTime: string | null;
  visitFrom: string | null;
  visitTo: string | null;
  weekdays: Weekday[];
  timeFrom: string | null;
  timeTo: string | null;
  maxUses: string;
  reelId: number | null;
  /** New local photo to upload */
  image: { uri: string; type?: string; name?: string } | null;
  /** Photo already on the server */
  imageUrl: string | null;
  removeImage: boolean;
};

type Errors = Partial<Record<string, string>>;

type Sheet =
  | "services"
  | "staff"
  | "bookByDate"
  | "bookByTime"
  | "visitFrom"
  | "visitTo"
  | "timeFrom"
  | "timeTo"
  | "reel"
  | null;

const EMPTY_FORM: Form = {
  title: "",
  description: "",
  audience: "new",
  discountType: "percent",
  discountValue: "",
  serviceIds: [],
  staffIds: [],
  bookByDate: null,
  bookByTime: null,
  visitFrom: null,
  visitTo: null,
  weekdays: [],
  timeFrom: null,
  timeTo: null,
  maxUses: "",
  reelId: null,
  image: null,
  imageUrl: null,
  removeImage: false,
};

function formFromPromotion(p: Promotion): Form {
  const bookBy = splitServerDateTime(p.booking_ends_at);
  return {
    title: p.title,
    description: p.description ?? "",
    audience: p.audience,
    discountType: p.discount_type,
    discountValue: p.discount_value ? String(p.discount_value) : "",
    serviceIds: p.services.map((s) => s.id),
    staffIds: p.staff.map((s) => s.id),
    bookByDate: bookBy.date,
    bookByTime: bookBy.time,
    visitFrom: splitServerDateTime(p.visit_starts_on).date,
    visitTo: splitServerDateTime(p.visit_ends_on).date,
    weekdays: p.weekdays.map(apiToIsoWeekday) as Weekday[],
    timeFrom: toHHmm(p.time_from),
    timeTo: toHHmm(p.time_to),
    maxUses: p.max_redemptions != null ? String(p.max_redemptions) : "",
    reelId: p.reel_id,
    image: null,
    imageUrl: p.image_url,
    removeImage: false,
  };
}

/** Everything except the image, in API field names. */
function payloadFromForm(f: Form): PromotionPayload {
  return {
    title: f.title.trim(),
    description: f.description.trim(),
    audience: f.audience,
    discount_type: f.discountType,
    discount_value: Number(f.discountValue.replace(",", ".")) || 0,
    service_ids: [...f.serviceIds].sort((a, b) => a - b),
    staff_ids: [...f.staffIds].sort((a, b) => a - b),
    booking_ends_at:
      f.bookByDate && f.bookByTime ? `${f.bookByDate} ${f.bookByTime}` : undefined,
    visit_starts_on: f.visitFrom ?? undefined,
    visit_ends_on: f.visitTo ?? undefined,
    weekdays: f.weekdays.map(isoToApiWeekday).sort((a, b) => a - b),
    time_from: f.timeFrom && f.timeTo ? f.timeFrom : null,
    time_to: f.timeFrom && f.timeTo ? f.timeTo : null,
    max_redemptions: f.maxUses.trim() ? Number(f.maxUses) || null : null,
    reel_id: f.reelId,
  };
}

function validate(
  f: Form,
  services: OwnerBookingService[],
  t: (key: string, o?: any) => string,
): Errors {
  const e: Errors = {};
  if (!f.title.trim()) e.title = t("proErrTitle");
  else if (f.title.trim().length > TITLE_MAX) e.title = t("proErrTooLong", { max: TITLE_MAX });
  if (!f.description.trim()) e.description = t("proErrDescription");
  else if (f.description.trim().length > DESCRIPTION_MAX)
    e.description = t("proErrTooLong", { max: DESCRIPTION_MAX });
  if (!f.serviceIds.length) e.service_ids = t("proErrServices");

  const value = Number(f.discountValue.replace(",", "."));
  if (!f.discountValue.trim() || !Number.isFinite(value) || value <= 0) {
    e.discount_value = t("proErrDiscount");
  } else if (f.discountType === "percent" && value > 100) {
    e.discount_value = t("proErrPercentMax");
  } else if (f.discountType === "fixed" && f.serviceIds.length) {
    const prices = services
      .filter((s) => f.serviceIds.includes(s.id))
      .map((s) => s.price)
      .filter((p) => p > 0);
    const cheapest = prices.length ? Math.min(...prices) : null;
    if (cheapest != null && value > cheapest) {
      e.discount_value = t("proErrFixedMax", { price: formatPromotionMoney(cheapest) });
    }
  }

  if (!f.bookByDate || !f.bookByTime) e.booking_ends_at = t("proErrBookBy");
  if (!f.visitFrom || !f.visitTo) e.visit_starts_on = t("proErrVisitDates");
  else if (f.visitTo < f.visitFrom) e.visit_starts_on = t("proErrVisitOrder");

  if (!!f.timeFrom !== !!f.timeTo) e.time_from = t("proErrHoursBoth");
  else if (f.timeFrom && f.timeTo && f.timeTo <= f.timeFrom) e.time_from = t("proErrHoursOrder");

  if (f.maxUses.trim()) {
    const n = Number(f.maxUses);
    if (!Number.isInteger(n) || n < 1) e.max_redemptions = t("proErrMaxUses");
  }
  return e;
}

/** Server field → where the message shows on this form. */
function mapServerErrors(fields: Record<string, string>): Errors {
  const e: Errors = {};
  Object.entries(fields).forEach(([key, msg]) => {
    const target =
      key === "booking_starts_at"
        ? "booking_ends_at"
        : key === "visit_ends_on"
          ? "visit_starts_on"
          : key === "time_to"
            ? "time_from"
            : key === "discount_type"
              ? "discount_value"
              : key === "remove_image"
                ? "image"
                : key;
    if (!e[target]) e[target] = msg;
  });
  return e;
}

/** Order on screen, so the first error can be scrolled to. */
const ERROR_ORDER = [
  "title",
  "audience",
  "discount_value",
  "service_ids",
  "booking_ends_at",
  "visit_starts_on",
  "description",
  "staff_ids",
  "weekdays",
  "time_from",
  "max_redemptions",
  "image",
  "reel_id",
];
const MORE_FIELDS = new Set(["staff_ids", "weekdays", "time_from", "max_redemptions", "image", "reel_id"]);

export default function PromotionEditorScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id?: string }>();
  const editId = params.id ? Number(params.id) : null;
  const isEdit = editId != null && Number.isFinite(editId);

  const user = useAppSelector((s) => s.user);
  const businessStatus = useAppSelector((s) => s.user.businessStatus);
  const businessId = Number(user.business_id ?? businessStatus?.business_id);
  const isSolo = isSoloSubscription(businessStatus);

  const [form, setForm] = useState<Form>(EMPTY_FORM);
  const initialRef = useRef<Form>(EMPTY_FORM);
  const [services, setServices] = useState<OwnerBookingService[]>([]);
  const [staff, setStaff] = useState<OwnerBookingStaff[]>([]);
  const [timeZone, setTimeZone] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState<"draft" | "active" | "edit" | null>(null);
  const [showMore, setShowMore] = useState(false);
  const [sheet, setSheet] = useState<Sheet>(null);
  const [reels, setReels] = useState<OwnerReel[] | null>(null);
  const [reelsLoading, setReelsLoading] = useState(false);
  const scrollRef = useRef<any>(null);
  const fieldY = useRef<Record<string, number>>({});

  const set = useCallback(<K extends keyof Form>(key: K, value: Form[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  const clearError = useCallback((...keys: string[]) => {
    setErrors((prev) => {
      if (!keys.some((k) => prev[k])) return prev;
      const next = { ...prev };
      keys.forEach((k) => delete next[k]);
      return next;
    });
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [svc, team, hours, existing] = await Promise.all([
        fetchOwnerBookingServices(businessId),
        isSolo ? Promise.resolve([] as OwnerBookingStaff[]) : fetchOwnerBookingStaff(businessId).catch(() => []),
        fetchOwnerBusinessHours(businessId).catch(() => null),
        isEdit ? fetchMyPromotion(editId as number) : Promise.resolve(null),
      ]);
      setServices(svc);
      setStaff(team);
      setTimeZone(hours?.timezone ?? null);
      if (existing) {
        const f = formFromPromotion(existing);
        initialRef.current = f;
        setForm(f);
        setShowMore(
          f.staffIds.length > 0 ||
            f.weekdays.length > 0 ||
            !!f.timeFrom ||
            !!f.maxUses ||
            !!f.imageUrl ||
            f.reelId != null,
        );
      }
    } catch (err) {
      Logger.warn("Offer editor load failed:", err);
      setLoadError(promotionErrorText(err, t("proLoadError")));
    } finally {
      setLoading(false);
    }
  }, [businessId, editId, isEdit, isSolo, t]);

  useEffect(() => {
    load();
  }, [load]);

  const openReels = useCallback(async () => {
    setSheet("reel");
    if (reels || reelsLoading) return;
    setReelsLoading(true);
    try {
      const { reels: rows } = await listMyReels(1, "published", 30);
      setReels(rows);
    } catch (err) {
      Logger.warn("Offer reels load failed:", err);
      setReels([]);
    } finally {
      setReelsLoading(false);
    }
  }, [reels, reelsLoading]);

  const pickImage = useCallback(async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsMultipleSelection: false,
        allowsEditing: false,
        quality: 0.8,
      });
      const asset = result.canceled ? undefined : result.assets?.[0];
      if (!asset?.uri) return;
      if (asset.fileSize != null && asset.fileSize > IMAGE_MAX_BYTES) {
        setErrors((prev) => ({ ...prev, image: t("proErrImageSize") }));
        return;
      }
      clearError("image");
      setForm((prev) => ({
        ...prev,
        image: {
          uri: asset.uri,
          type: asset.mimeType ?? "image/jpeg",
          name: asset.fileName ?? undefined,
        },
        removeImage: false,
      }));
    } catch (err) {
      Logger.warn("Offer image pick failed:", err);
      setErrors((prev) => ({ ...prev, image: t("proErrImagePick") }));
    }
  }, [clearError, t]);

  const removeImage = () =>
    setForm((prev) => ({
      ...prev,
      image: null,
      removeImage: !!prev.imageUrl,
      imageUrl: null,
    }));

  const scrollToFirst = (e: Errors) => {
    const first = ERROR_ORDER.find((k) => e[k]);
    if (!first) return;
    if (MORE_FIELDS.has(first)) setShowMore(true);
    const y = fieldY.current[first];
    if (y != null) {
      // Wait a frame so "More options" can open first
      setTimeout(() => scrollRef.current?.scrollTo?.({ y: Math.max(0, y - 16), animated: true }), 60);
    }
  };

  const save = async (mode: "draft" | "active" | "edit") => {
    if (saving) return;
    setFormError(null);
    const e = validate(form, services, t);
    setErrors(e);
    if (Object.keys(e).length) {
      scrollToFirst(e);
      return;
    }
    setSaving(mode);
    try {
      const full = payloadFromForm(form);
      if (mode === "edit" && isEdit) {
        // Only what changed
        const before = payloadFromForm(initialRef.current) as Record<string, unknown>;
        const changes: Record<string, unknown> = {};
        Object.entries(full).forEach(([key, value]) => {
          if (JSON.stringify(value) !== JSON.stringify(before[key])) changes[key] = value;
        });
        const payload: PromotionPayload = {
          ...(changes as PromotionPayload),
          ...(form.image ? { image: form.image } : {}),
          ...(form.removeImage && !form.image ? { remove_image: true } : {}),
        };
        if (Object.keys(payload).length) {
          await updatePromotion(editId as number, payload);
        }
        router.back();
      } else {
        const startsAt = promotionBookingStartNow(timeZone);
        const created = await createPromotion({
          ...full,
          ...(startsAt ? { booking_starts_at: startsAt } : {}),
          // Leave out "every staff" / "every day" / no hours on create
          staff_ids: full.staff_ids?.length ? full.staff_ids : undefined,
          weekdays: full.weekdays?.length ? full.weekdays : undefined,
          time_from: full.time_from ?? undefined,
          time_to: full.time_to ?? undefined,
          max_redemptions: full.max_redemptions ?? undefined,
          reel_id: full.reel_id ?? undefined,
          ...(form.image ? { image: form.image } : {}),
          status: mode === "draft" ? "draft" : "active",
        });
        if (created.id) {
          router.replace({
            pathname: DETAIL_ROUTE,
            params: { id: String(created.id), created: mode },
          } as any);
        } else {
          router.back();
        }
      }
    } catch (err: any) {
      Logger.warn("Offer save failed:", err);
      const fieldErrors = mapServerErrors(promotionFieldErrors(err));
      if (Object.keys(fieldErrors).length) {
        setErrors(fieldErrors);
        scrollToFirst(fieldErrors);
        // A field the form doesn't show (e.g. business plan): show it on top
        if (!ERROR_ORDER.some((k) => fieldErrors[k])) {
          setFormError(promotionErrorText(err, t("proSaveError")));
        }
      } else {
        setFormError(promotionErrorText(err, t("proSaveError")));
      }
    } finally {
      setSaving(null);
    }
  };

  const track = (key: string) => (ev: { nativeEvent: { layout: { y: number } } }) => {
    fieldY.current[key] = ev.nativeEvent.layout.y;
  };

  // ── Display values ──────────────────────────────────────────────────
  const selectedServices = services.filter((s) => form.serviceIds.includes(s.id));
  const servicesText = selectedServices.length
    ? selectedServices.length <= 2
      ? selectedServices.map((s) => s.name).join(", ")
      : t("proServicesCount", { count: selectedServices.length })
    : null;
  const selectedStaff = staff.filter((s) => form.staffIds.includes(s.id));
  const staffText = selectedStaff.length
    ? selectedStaff.map((s) => s.name).join(", ")
    : t("proEveryStaff");
  const dateText = (d: string | null) => (d ? dayjs(d).format("MMM D, YYYY") : null);
  const selectedReel = form.reelId != null ? reels?.find((r) => r.id === form.reelId) : null;
  const reelText =
    form.reelId == null
      ? null
      : selectedReel?.caption?.trim() || t("proReelNumber", { id: form.reelId });
  const imageUri = form.image?.uri ?? form.imageUrl;
  const showStaffPicker = !isSolo && staff.length > 1;
  const audienceHelp =
    form.audience === "new"
      ? t("proAudienceNewHelp")
      : form.audience === "returning"
        ? t("proAudienceReturningHelp")
        : t("proAudienceEveryoneHelp");

  if (loading || loadError) {
    return (
      <View style={styles.container}>
        <StackHeader title={isEdit ? t("proEditTitle") : t("proCreateTitle")} />
        {loading ? (
          <ClassStateView loading message={t("proLoading")} />
        ) : (
          <ClassStateView
            icon="cloud-offline-outline"
            title={t("proLoadErrorTitle")}
            message={loadError ?? undefined}
            actionLabel={t("retry")}
            onAction={load}
          />
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StackHeader title={isEdit ? t("proEditTitle") : t("proCreateTitle")} />
      <KeyboardAwareScrollView
        ref={scrollRef}
        bottomOffset={moderateHeightScale(32)}
        keyboardDismissMode="interactive"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + moderateHeightScale(32) },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {formError ? (
          <PromotionInfoNote text={formError} tone="danger" icon="alert-circle-outline" />
        ) : null}

        <View onLayout={track("title")}>
          <EditorTextInput
            label={t("proFieldTitle")}
            required
            value={form.title}
            onChangeText={(v) => {
              set("title", v);
              clearError("title");
            }}
            placeholder={t("proFieldTitlePlaceholder")}
            counterMax={TITLE_MAX}
            maxLength={TITLE_MAX + 20}
            error={errors.title}
            returnKeyType="next"
          />
        </View>

        <View onLayout={track("audience")} style={styles.field}>
          <EditorLabel label={t("proFieldAudience")} required />
          <EditorChips<PromotionAudience>
            options={[
              { value: "new", label: t("proAudienceNew") },
              { value: "returning", label: t("proAudienceReturning") },
              { value: "everyone", label: t("proAudienceEveryone") },
            ]}
            value={form.audience}
            onChange={(v) => {
              set("audience", v);
              clearError("audience");
            }}
            accessibilityLabel={t("proFieldAudience")}
          />
          <EditorFieldError message={errors.audience} />
          {!errors.audience ? <EditorHelper text={audienceHelp} /> : null}
        </View>

        <View onLayout={track("discount_value")} style={styles.field}>
          <EditorLabel label={t("proFieldDiscount")} required />
          <EditorSegmented<PromotionDiscountType>
            options={[
              { value: "percent", label: t("proDiscountPercent") },
              { value: "fixed", label: t("proDiscountFixed") },
            ]}
            value={form.discountType}
            onChange={(v) => {
              set("discountType", v);
              clearError("discount_value");
            }}
            accessibilityLabel={t("proFieldDiscount")}
          />
          <EditorTextInput
            value={form.discountValue}
            onChangeText={(v) => {
              set("discountValue", v.replace(/[^0-9.,]/g, ""));
              clearError("discount_value");
            }}
            prefix={form.discountType === "fixed" ? "$" : "%"}
            placeholder={form.discountType === "fixed" ? "10" : "15"}
            keyboardType="decimal-pad"
            accessibilityLabel={
              form.discountType === "fixed" ? t("proDiscountFixedA11y") : t("proDiscountPercentA11y")
            }
            error={errors.discount_value}
            helper={form.discountType === "fixed" ? t("proDiscountFixedHelp") : null}
            style={styles.discountInput}
          />
        </View>

        <View onLayout={track("service_ids")}>
          <EditorPickerBox
            label={t("proFieldServices")}
            required
            icon="cut-outline"
            value={servicesText}
            placeholder={t("proPickServices")}
            onPress={() => setSheet("services")}
            error={errors.service_ids}
          />
        </View>

        <View onLayout={track("booking_ends_at")}>
          <EditorRow
            labels={[
              { label: t("proFieldBookBy"), required: true },
              { label: t("proFieldBookByTime"), required: true },
            ]}
          >
            <EditorPickerBox
              icon="calendar-outline"
              value={dateText(form.bookByDate)}
              placeholder={t("proPickDate")}
              onPress={() => setSheet("bookByDate")}
              invalid={!!errors.booking_ends_at}
            />
            <EditorPickerBox
              icon="time-outline"
              value={form.bookByTime ? formatClassTime(form.bookByTime) : null}
              placeholder={t("proPickTime")}
              onPress={() => setSheet("bookByTime")}
              invalid={!!errors.booking_ends_at}
            />
          </EditorRow>
          <EditorFieldError message={errors.booking_ends_at} />
          {!errors.booking_ends_at ? <EditorHelper text={t("proBookByHelp")} /> : null}
        </View>

        <View onLayout={track("visit_starts_on")}>
          <EditorRow
            labels={[
              { label: t("proFieldVisitFrom"), required: true },
              { label: t("proFieldVisitTo"), required: true },
            ]}
          >
            <EditorPickerBox
              icon="calendar-outline"
              value={dateText(form.visitFrom)}
              placeholder={t("proPickDate")}
              onPress={() => setSheet("visitFrom")}
              invalid={!!errors.visit_starts_on}
            />
            <EditorPickerBox
              icon="calendar-outline"
              value={dateText(form.visitTo)}
              placeholder={t("proPickDate")}
              onPress={() => setSheet("visitTo")}
              invalid={!!errors.visit_starts_on}
            />
          </EditorRow>
          <EditorFieldError message={errors.visit_starts_on} />
          {!errors.visit_starts_on ? <EditorHelper text={t("proVisitHelp")} /> : null}
        </View>

        <View onLayout={track("description")}>
          <EditorTextInput
            label={t("proFieldDescription")}
            required
            value={form.description}
            onChangeText={(v) => {
              set("description", v);
              clearError("description");
            }}
            placeholder={t("proFieldDescriptionPlaceholder")}
            counterMax={DESCRIPTION_MAX}
            multiline
            minLines={4}
            error={errors.description}
          />
        </View>

        {/* Optional rules */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => setShowMore((v) => !v)}
          style={styles.moreToggle}
          accessibilityRole="button"
          accessibilityState={{ expanded: showMore }}
          accessibilityLabel={t("proMoreOptions")}
        >
          <View style={styles.moreText}>
            <Text style={styles.moreTitle}>{t("proMoreOptions")}</Text>
            <Text style={styles.moreSub}>{t("proMoreOptionsSub")}</Text>
          </View>
          <Ionicons
            name={showMore ? "chevron-up" : "chevron-down"}
            size={iconScale(20)}
            color={theme.darkGreen}
          />
        </TouchableOpacity>

        {showMore ? (
          <View style={styles.moreBody}>
            {showStaffPicker ? (
              <View onLayout={track("staff_ids")}>
                <EditorPickerBox
                  label={t("proFieldStaff")}
                  icon="people-outline"
                  value={staffText}
                  placeholder={t("proEveryStaff")}
                  onPress={() => setSheet("staff")}
                  error={errors.staff_ids}
                  helper={t("proStaffHelp")}
                />
              </View>
            ) : null}

            <View onLayout={track("weekdays")} style={styles.field}>
              <EditorLabel label={t("proFieldDays")} />
              <WeekdayChips
                selected={form.weekdays}
                onChange={(days) => {
                  set("weekdays", days);
                  clearError("weekdays");
                }}
              />
              <EditorFieldError message={errors.weekdays} />
              {!errors.weekdays ? <EditorHelper text={t("proDaysHelp")} /> : null}
            </View>

            <View onLayout={track("time_from")}>
              <EditorRow
                labels={[{ label: t("proFieldTimeFrom") }, { label: t("proFieldTimeTo") }]}
              >
                <EditorPickerBox
                  icon="time-outline"
                  value={form.timeFrom ? formatClassTime(form.timeFrom) : null}
                  placeholder={t("proAnyTime")}
                  onPress={() => setSheet("timeFrom")}
                  invalid={!!errors.time_from}
                />
                <EditorPickerBox
                  icon="time-outline"
                  value={form.timeTo ? formatClassTime(form.timeTo) : null}
                  placeholder={t("proAnyTime")}
                  onPress={() => setSheet("timeTo")}
                  invalid={!!errors.time_from}
                />
              </EditorRow>
              <EditorFieldError message={errors.time_from} />
              {!errors.time_from ? <EditorHelper text={t("proHoursHelp")} /> : null}
              {form.timeFrom || form.timeTo ? (
                <TouchableOpacity
                  onPress={() => {
                    setForm((prev) => ({ ...prev, timeFrom: null, timeTo: null }));
                    clearError("time_from");
                  }}
                  hitSlop={10}
                  style={styles.linkBtn}
                  accessibilityRole="button"
                >
                  <Text style={styles.linkText}>{t("proClearHours")}</Text>
                </TouchableOpacity>
              ) : null}
            </View>

            <View onLayout={track("max_redemptions")}>
              <EditorTextInput
                label={t("proFieldMaxUses")}
                value={form.maxUses}
                onChangeText={(v) => {
                  set("maxUses", v.replace(/[^0-9]/g, ""));
                  clearError("max_redemptions");
                }}
                placeholder={t("proMaxUsesPlaceholder")}
                keyboardType="number-pad"
                error={errors.max_redemptions}
                helper={t("proMaxUsesHelp")}
              />
            </View>

            <View onLayout={track("image")} style={styles.field}>
              <EditorLabel label={t("proFieldImage")} />
              {imageUri ? (
                <View style={styles.imageRow}>
                  <AppImage uri={imageUri} style={styles.imagePreview} />
                  <View style={styles.imageActions}>
                    <TouchableOpacity
                      onPress={pickImage}
                      style={styles.smallBtn}
                      activeOpacity={0.8}
                      accessibilityRole="button"
                    >
                      <Ionicons name="image-outline" size={iconScale(16)} color={theme.darkGreen} />
                      <Text style={styles.smallBtnText}>{t("proChangeImage")}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={removeImage}
                      style={styles.smallBtn}
                      activeOpacity={0.8}
                      accessibilityRole="button"
                    >
                      <Ionicons name="trash-outline" size={iconScale(16)} color={theme.red} />
                      <Text style={[styles.smallBtnText, { color: theme.red }]}>
                        {t("proRemoveImage")}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <TouchableOpacity
                  onPress={pickImage}
                  activeOpacity={0.8}
                  style={styles.imageAdd}
                  accessibilityRole="button"
                  accessibilityLabel={t("proAddImage")}
                >
                  <Ionicons name="image-outline" size={iconScale(22)} color={theme.darkGreen} />
                  <Text style={styles.imageAddText}>{t("proAddImage")}</Text>
                  <Text style={styles.imageAddSub}>{t("proImageHelp")}</Text>
                </TouchableOpacity>
              )}
              <EditorFieldError message={errors.image} />
            </View>

            <View onLayout={track("reel_id")}>
              <EditorPickerBox
                label={t("proFieldReel")}
                icon="film-outline"
                value={reelText}
                placeholder={t("proNoReel")}
                onPress={openReels}
                error={errors.reel_id}
                helper={t("proReelHelp")}
              />
            </View>
          </View>
        ) : null}

        <View style={styles.footer}>
          {isEdit ? (
            <PrimaryButton
              label={t("proSaveChanges")}
              loading={saving === "edit"}
              disabled={!!saving}
              onPress={() => save("edit")}
              styles={styles}
              theme={theme}
            />
          ) : (
            <>
              <PrimaryButton
                label={t("proPublish")}
                icon="pricetag"
                loading={saving === "active"}
                disabled={!!saving}
                onPress={() => save("active")}
                styles={styles}
                theme={theme}
              />
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => save("draft")}
                disabled={!!saving}
                style={[styles.secondaryBtn, !!saving && styles.disabled]}
                accessibilityRole="button"
                accessibilityState={{ disabled: !!saving, busy: saving === "draft" }}
              >
                {saving === "draft" ? (
                  <ActivityIndicator color={theme.darkGreen} />
                ) : (
                  <Text style={styles.secondaryText}>{t("proSaveDraft")}</Text>
                )}
              </TouchableOpacity>
            </>
          )}
        </View>
      </KeyboardAwareScrollView>

      {/* Services (multi-select) */}
      <MultiSelectSheet
        visible={sheet === "services"}
        title={t("proFieldServices")}
        subtitle={t("proServicesSheetSub")}
        options={services.map((s) => ({
          id: s.id,
          label: s.name,
          sub: s.price ? formatPromotionMoney(s.price) : null,
        }))}
        selected={form.serviceIds}
        emptyText={t("proNoServices")}
        onDone={(ids) => {
          set("serviceIds", ids);
          clearError("service_ids", "discount_value");
          setSheet(null);
        }}
        onClose={() => setSheet(null)}
      />

      {/* Staff (empty = everyone) */}
      <MultiSelectSheet
        visible={sheet === "staff"}
        title={t("proFieldStaff")}
        subtitle={t("proStaffHelp")}
        options={staff.map((s) => ({ id: s.id, label: s.name, sub: null }))}
        selected={form.staffIds}
        emptyText={t("proEveryStaff")}
        onDone={(ids) => {
          set("staffIds", ids);
          clearError("staff_ids");
          setSheet(null);
        }}
        onClose={() => setSheet(null)}
      />

      <EditorDateSheet
        visible={sheet === "bookByDate"}
        value={form.bookByDate}
        timeZone={timeZone}
        onConfirm={(d) => {
          set("bookByDate", d);
          clearError("booking_ends_at");
          setSheet(form.bookByTime ? null : "bookByTime");
        }}
        onClose={() => setSheet(null)}
      />
      <EditorTimeSheet
        visible={sheet === "bookByTime"}
        value={form.bookByTime}
        date={form.bookByDate}
        timeZone={timeZone}
        onConfirm={(time) => {
          set("bookByTime", time);
          clearError("booking_ends_at");
          setSheet(null);
        }}
        onClose={() => setSheet(null)}
      />
      <EditorDateSheet
        visible={sheet === "visitFrom"}
        value={form.visitFrom}
        timeZone={timeZone}
        onConfirm={(d) => {
          setForm((prev) => ({
            ...prev,
            visitFrom: d,
            visitTo: prev.visitTo && prev.visitTo < d ? null : prev.visitTo,
          }));
          clearError("visit_starts_on");
          setSheet(form.visitTo && form.visitTo >= d ? null : "visitTo");
        }}
        onClose={() => setSheet(null)}
      />
      <EditorDateSheet
        visible={sheet === "visitTo"}
        value={form.visitTo}
        timeZone={timeZone}
        minDate={form.visitFrom ?? undefined}
        onConfirm={(d) => {
          set("visitTo", d);
          clearError("visit_starts_on");
          setSheet(null);
        }}
        onClose={() => setSheet(null)}
      />
      <EditorTimeSheet
        visible={sheet === "timeFrom"}
        value={form.timeFrom}
        date={null}
        timeZone={timeZone}
        onConfirm={(time) => {
          set("timeFrom", time);
          clearError("time_from");
          setSheet(form.timeTo ? null : "timeTo");
        }}
        onClose={() => setSheet(null)}
      />
      <EditorTimeSheet
        visible={sheet === "timeTo"}
        value={form.timeTo}
        date={null}
        timeZone={timeZone}
        onConfirm={(time) => {
          set("timeTo", time);
          clearError("time_from");
          setSheet(null);
        }}
        onClose={() => setSheet(null)}
      />

      {/* Reel (optional, one of the owner's published reels) */}
      <EditorSheet
        visible={sheet === "reel"}
        title={t("proFieldReel")}
        subtitle={t("proReelHelp")}
        onClose={() => setSheet(null)}
        scroll
      >
        {reelsLoading ? (
          <ActivityIndicator color={theme.darkGreen} style={styles.sheetLoader} />
        ) : (
          <View style={styles.optionList}>
            <OptionRow
              label={t("proNoReel")}
              selected={form.reelId == null}
              onPress={() => {
                set("reelId", null);
                clearError("reel_id");
                setSheet(null);
              }}
              styles={styles}
              theme={theme}
              radio
            />
            {(reels ?? []).map((r) => (
              <OptionRow
                key={r.id}
                label={r.caption?.trim() || t("proReelNumber", { id: r.id })}
                thumb={(r.video as any)?.thumbnail_url ?? null}
                selected={form.reelId === r.id}
                onPress={() => {
                  set("reelId", r.id);
                  clearError("reel_id");
                  setSheet(null);
                }}
                styles={styles}
                theme={theme}
                radio
              />
            ))}
            {reels && !reels.length ? (
              <Text style={styles.sheetEmpty}>{t("proNoReels")}</Text>
            ) : null}
          </View>
        )}
      </EditorSheet>
    </View>
  );
}

// ── Small local pieces ──────────────────────────────────────────────

type Styles = ReturnType<typeof createStyles>;

function PrimaryButton({
  label,
  icon,
  loading,
  disabled,
  onPress,
  styles,
  theme,
}: {
  label: string;
  icon?: React.ComponentProps<typeof Ionicons>["name"];
  loading: boolean;
  disabled: boolean;
  onPress: () => void;
  styles: Styles;
  theme: Theme;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      disabled={disabled}
      style={[styles.primaryBtn, disabled && !loading && styles.disabled]}
      accessibilityRole="button"
      accessibilityState={{ disabled, busy: loading }}
      accessibilityLabel={label}
    >
      {loading ? (
        <ActivityIndicator color={theme.white} />
      ) : (
        <>
          {icon ? <Ionicons name={icon} size={iconScale(18)} color={theme.white} /> : null}
          <Text style={styles.primaryText}>{label}</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

function OptionRow({
  label,
  sub,
  thumb,
  selected,
  onPress,
  styles,
  theme,
  radio = false,
}: {
  label: string;
  sub?: string | null;
  thumb?: string | null;
  selected: boolean;
  onPress: () => void;
  styles: Styles;
  theme: Theme;
  radio?: boolean;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.75}
      onPress={onPress}
      style={[styles.optionRow, selected && styles.optionRowOn]}
      accessibilityRole={radio ? "radio" : "checkbox"}
      accessibilityState={{ checked: selected, selected }}
      accessibilityLabel={sub ? `${label}, ${sub}` : label}
    >
      {thumb ? <AppImage uri={thumb} style={styles.optionThumb} /> : null}
      <View style={styles.optionText}>
        <Text style={styles.optionLabel} numberOfLines={2}>
          {label}
        </Text>
        {sub ? <Text style={styles.optionSub}>{sub}</Text> : null}
      </View>
      <Ionicons
        name={
          radio
            ? selected
              ? "radio-button-on"
              : "radio-button-off"
            : selected
              ? "checkbox"
              : "square-outline"
        }
        size={iconScale(22)}
        color={selected ? theme.darkGreen : theme.lightGreen4}
      />
    </TouchableOpacity>
  );
}

function MultiSelectSheet({
  visible,
  title,
  subtitle,
  options,
  selected,
  emptyText,
  onDone,
  onClose,
}: {
  visible: boolean;
  title: string;
  subtitle?: string | null;
  options: { id: number; label: string; sub: string | null }[];
  selected: number[];
  emptyText: string;
  onDone: (ids: number[]) => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);
  const [picked, setPicked] = useState<number[]>(selected);

  useEffect(() => {
    if (visible) setPicked(selected);
    // Reset only when the sheet opens
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const toggle = (id: number) =>
    setPicked((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  return (
    <EditorSheet
      visible={visible}
      title={title}
      subtitle={subtitle}
      onClose={onClose}
      scroll
      footer={
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => onDone(picked)}
          style={styles.primaryBtn}
          accessibilityRole="button"
        >
          <Text style={styles.primaryText}>
            {picked.length ? `${t("done")} · ${picked.length}` : t("done")}
          </Text>
        </TouchableOpacity>
      }
    >
      {options.length ? (
        <View style={styles.optionList}>
          {options.map((o) => (
            <OptionRow
              key={o.id}
              label={o.label}
              sub={o.sub}
              selected={picked.includes(o.id)}
              onPress={() => toggle(o.id)}
              styles={styles}
              theme={theme}
            />
          ))}
        </View>
      ) : (
        <Text style={styles.sheetEmpty}>{emptyText}</Text>
      )}
    </EditorSheet>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background },
    content: {
      paddingHorizontal: moderateWidthScale(16),
      paddingTop: moderateHeightScale(16),
      gap: moderateHeightScale(16),
    },
    field: { gap: moderateHeightScale(8) },
    discountInput: { marginTop: moderateHeightScale(2) },
    moreToggle: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(10),
      backgroundColor: theme.white,
      borderWidth: 1,
      borderColor: theme.lightGreen015,
      borderRadius: moderateWidthScale(12),
      paddingHorizontal: moderateWidthScale(14),
      paddingVertical: moderateHeightScale(12),
      minHeight: moderateHeightScale(52),
    },
    moreText: { flex: 1, gap: moderateHeightScale(2) },
    moreTitle: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    moreSub: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.textMuted,
    },
    moreBody: { gap: moderateHeightScale(16) },
    linkBtn: { alignSelf: "flex-start", marginTop: moderateHeightScale(6) },
    linkText: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontSemiBold,
      color: theme.darkGreen,
      textDecorationLine: "underline",
    },
    imageRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(12),
    },
    imagePreview: {
      width: moderateWidthScale(96),
      height: moderateWidthScale(96),
      borderRadius: moderateWidthScale(12),
      backgroundColor: theme.lightGreen07,
    },
    imageActions: { flex: 1, gap: moderateHeightScale(8) },
    smallBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(6),
      alignSelf: "flex-start",
      minHeight: moderateHeightScale(40),
      paddingHorizontal: moderateWidthScale(12),
      borderRadius: moderateWidthScale(10),
      borderWidth: 1,
      borderColor: theme.borderNormal,
      backgroundColor: theme.white,
    },
    smallBtnText: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontSemiBold,
      color: theme.darkGreen,
    },
    imageAdd: {
      alignItems: "center",
      justifyContent: "center",
      gap: moderateHeightScale(4),
      paddingVertical: moderateHeightScale(18),
      borderRadius: moderateWidthScale(12),
      borderWidth: 1,
      borderStyle: "dashed",
      borderColor: theme.borderMedium,
      backgroundColor: theme.white,
    },
    imageAddText: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontSemiBold,
      color: theme.darkGreen,
    },
    imageAddSub: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.textMuted,
    },
    footer: {
      gap: moderateHeightScale(10),
      marginTop: moderateHeightScale(8),
    },
    primaryBtn: {
      minHeight: moderateHeightScale(52),
      borderRadius: moderateWidthScale(12),
      backgroundColor: theme.darkGreen,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: moderateWidthScale(8),
      paddingHorizontal: moderateWidthScale(16),
    },
    primaryText: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontBold,
      color: theme.white,
    },
    secondaryBtn: {
      minHeight: moderateHeightScale(52),
      borderRadius: moderateWidthScale(12),
      borderWidth: 1.5,
      borderColor: theme.darkGreen,
      backgroundColor: theme.white,
      alignItems: "center",
      justifyContent: "center",
    },
    secondaryText: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    disabled: { opacity: 0.5 },
    optionList: { gap: moderateHeightScale(8) },
    optionRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(12),
      minHeight: moderateHeightScale(52),
      paddingHorizontal: moderateWidthScale(14),
      paddingVertical: moderateHeightScale(10),
      borderRadius: moderateWidthScale(12),
      borderWidth: 1,
      borderColor: theme.borderLight,
      backgroundColor: theme.white,
    },
    optionRowOn: {
      borderColor: theme.darkGreen,
      backgroundColor: theme.lightGreen07,
    },
    optionThumb: {
      width: moderateWidthScale(40),
      height: moderateWidthScale(52),
      borderRadius: moderateWidthScale(8),
      backgroundColor: theme.lightGreen07,
    },
    optionText: { flex: 1, gap: moderateHeightScale(2) },
    optionLabel: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontSemiBold,
      color: theme.darkGreen,
    },
    optionSub: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: theme.textMuted,
    },
    sheetLoader: { marginVertical: moderateHeightScale(24) },
    sheetEmpty: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.textMuted,
      textAlign: "center",
      paddingVertical: moderateHeightScale(20),
    },
  });
