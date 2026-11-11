import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Keyboard,
  LayoutChangeEvent,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  useFocusEffect,
  useLocalSearchParams,
  useNavigation,
  useRouter,
} from "expo-router";
import { usePreventRemove } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { useAppDispatch, useAppSelector, useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  heightScale,
  iconScale,
  moderateHeightScale,
  moderateWidthScale,
} from "@/src/theme/dimensions";
import StackHeader from "@/src/components/StackHeader";
import { useNotificationContext } from "@/src/contexts/NotificationContext";
import { isStripeOnboardingCompleted } from "@/src/state/slices/userSlice";
import { ApiService } from "@/src/services/api";
import { businessEndpoints } from "@/src/services/endpoints";
import Logger from "@/src/services/logger";
import {
  create as createClass,
  getClass,
  parseApiError,
  update as updateClass,
} from "@/src/services/masterClassService";
import type {
  CancellationWindowHours,
  MasterClass,
  MasterClassFormat,
  MasterClassLocationType,
  MasterClassPayload,
} from "@/src/types/masterClass";
import {
  CANCELLATION_WINDOW_OPTIONS,
  CLASS_LIMITS,
  DEFAULT_CANCELLATION_WINDOW,
  DURATION_OPTIONS,
  formatClassDate,
  formatClassPrice,
  formatClassTime,
  formatDuration,
  getClassPrice,
  getClassWhenText,
  getFormatLabel,
  getSeatsEnrolledText,
  isClassDateTimeInFuture,
  isValidMeetingUrl,
} from "@/src/utils/masterClassHelpers";
import {
  ClassStateView,
  ClassSummaryRow,
  MetaRow,
  SectionCard,
  type IoniconName,
} from "@/src/components/masterClasses/parts";
import {
  EditorChips,
  EditorFieldError,
  EditorHelper,
  EditorLabel,
  EditorPickerBox,
  EditorRadioCard,
  EditorReadOnlyRow,
  EditorRow,
  EditorSegmented,
  EditorTextInput,
} from "@/src/components/masterClasses/editorFields";
import {
  EditorDateSheet,
  EditorOptionSheet,
  EditorTimeSheet,
  type EditorSheetOption,
} from "@/src/components/masterClasses/editorSheets";
import {
  EditorAddressSheet,
  type PickedAddress,
} from "@/src/components/masterClasses/editorAddressSheet";
import {
  EditorMediaBox,
  useClassMediaUpload,
} from "@/src/components/masterClasses/editorMedia";
import { useOpenStripeConnect } from "@/src/components/masterClasses/useOpenStripeConnect";
import { openFullImageModal } from "@/src/state/slices/generalSlice";
import ImagePickerModal from "@/src/components/imagePickerModal";
import PhotoEditorModal from "@/src/components/PhotoEditorModal";
import LocalVideoPreviewModal from "@/src/components/localVideoPreviewModal";

/**
 * Create / Edit Class (client sample, Design 3).
 * - New or draft: every field; POST on the first save, then PATCH with only
 *   what changed. Leaving saves a draft (title needed). Publish validates,
 *   saves and opens the $50 publish screen.
 * - Published: only date, time and duration (reschedule, students notified).
 */

const LIST_PATH = "/(main)/masterClasses";
const PUBLISH_PATH = "/(main)/masterClasses/publish";

const MEDIA_CROP_ASPECT =
  (Dimensions.get("window").width - moderateWidthScale(20) * 2) /
  heightScale(190);

type FormState = {
  title: string;
  description: string;
  prerequisites: string;
  /** "YYYY-MM-DD" on the business clock (start date) */
  date: string | null;
  /** "HH:mm" on the business clock */
  time: string | null;
  /** "YYYY-MM-DD" on the business clock (end date) */
  endDate: string | null;
  duration: number | null;
  capacity: string;
  price: string;
  discountedPrice: string;
  format: MasterClassFormat;
  locationType: MasterClassLocationType;
  address: string;
  latitude: number | null;
  longitude: number | null;
  meetingUrl: string;
  cancellationWindow: CancellationWindowHours;
  mediaAssetId: number | null;
};

type FieldKey =
  | "media"
  | "title"
  | "description"
  | "prerequisites"
  | "date"
  | "time"
  | "endDate"
  | "duration"
  | "capacity"
  | "price"
  | "discountedPrice"
  | "format"
  | "address"
  | "meetingUrl"
  | "window";
type Errors = Partial<Record<FieldKey, string>>;

/** Top-to-bottom order, for "scroll to the first error". */
const FIELD_ORDER: FieldKey[] = [
  "media",
  "title",
  "description",
  "prerequisites",
  "date",
  "time",
  "endDate",
  "duration",
  "capacity",
  "price",
  "discountedPrice",
  "format",
  "address",
  "meetingUrl",
  "window",
];

/** Server field (422 `errors` and draft `missing`) → form field. */
const SERVER_FIELDS: Record<string, FieldKey> = {
  title: "title",
  description: "description",
  prerequisites: "prerequisites",
  date: "date",
  time: "time",
  end_date: "endDate",
  starts_at: "date",
  duration_minutes: "duration",
  capacity: "capacity",
  price: "price",
  discounted_price: "discountedPrice",
  cancellation_window_hours: "window",
  format: "format",
  location_type: "address",
  location: "address",
  address: "address",
  latitude: "address",
  longitude: "address",
  meeting_url: "meetingUrl",
  media_asset_id: "media",
  media: "media",
};

const BLANK_FORM: FormState = {
  title: "",
  description: "",
  prerequisites: "",
  date: null,
  time: null,
  endDate: null,
  duration: null,
  capacity: "",
  price: "",
  discountedPrice: "",
  format: "in_person",
  locationType: "business",
  address: "",
  latitude: null,
  longitude: null,
  meetingUrl: "",
  cancellationWindow: DEFAULT_CANCELLATION_WINDOW,
  mediaAssetId: null,
};

// Keeps "12." while typing; one decimal point, two decimals max.
// A pasted "1,250" is thousands (1250); a lone "12,5" is a decimal comma.
const cleanMoney = (v: string) => {
  const normalized = /,\d{3}(\D|$)/.test(v) ? v.replace(/,/g, "") : v.replace(",", ".");
  const digits = normalized.replace(/[^0-9.]/g, "");
  const [whole, ...rest] = digits.split(".");
  return rest.length ? `${whole}.${rest.join("").slice(0, 2)}` : whole;
};
const toMoney = (v: string): number | null => {
  if (!v.trim()) return null;
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : null;
};
const toInt = (v: string): number | null => {
  if (!v.trim()) return null;
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : null;
};
const moneyText = (n: number | null | undefined) =>
  n == null ? "" : Number.isInteger(n) ? String(n) : n.toFixed(2);

function formFromClass(cls: MasterClass): FormState {
  const window = CANCELLATION_WINDOW_OPTIONS.includes(
    cls.cancellation_window_hours as CancellationWindowHours,
  )
    ? (cls.cancellation_window_hours as CancellationWindowHours)
    : DEFAULT_CANCELLATION_WINDOW;
  const custom = cls.location_type === "custom";
  return {
    title: cls.title ?? "",
    description: cls.description ?? "",
    prerequisites: cls.prerequisites ?? "",
    date: cls.date ? cls.date.slice(0, 10) : null,
    time: cls.time ? cls.time.slice(0, 5) : null,
    endDate: cls.end_date ? cls.end_date.slice(0, 10) : null,
    duration: cls.duration_minutes,
    capacity: cls.capacity != null ? String(cls.capacity) : "",
    price: moneyText(cls.price),
    discountedPrice: moneyText(cls.discounted_price),
    format: cls.format ?? "in_person",
    locationType: cls.location_type ?? "business",
    address: custom ? (cls.location?.address ?? "") : "",
    latitude: custom ? (cls.location?.latitude ?? null) : null,
    longitude: custom ? (cls.location?.longitude ?? null) : null,
    meetingUrl: cls.meeting_url ?? "",
    cancellationWindow: window,
    mediaAssetId: cls.media?.id ?? null,
  };
}

/**
 * What the server holds, without the form's defaults: a draft saved with no
 * format / location / window still gets the defaults the pro sees sent.
 */
function serverBaseline(cls: MasterClass): FormState {
  return {
    ...formFromClass(cls),
    format: cls.format as MasterClassFormat,
    locationType: cls.location_type as MasterClassLocationType,
    cancellationWindow: cls.cancellation_window_hours as CancellationWindowHours,
  };
}

/** Everything the form holds as an API body (null = cleared optional field). */
function payloadFromForm(f: FormState): MasterClassPayload {
  const p: MasterClassPayload = {
    title: f.title.trim(),
    description: f.description.trim() || null,
    prerequisites: f.prerequisites.trim() || null,
    discounted_price: toMoney(f.discountedPrice),
    cancellation_window_hours: f.cancellationWindow,
    format: f.format,
    media_asset_id: f.mediaAssetId,
    duration_minutes: f.duration || null,
    capacity: toInt(f.capacity),
    price: toMoney(f.price),
    end_date: f.endDate || null,
  };
  // Date and time travel together: both or neither
  const hasWhen = !!(f.date && f.time);
  p.date = hasWhen ? f.date : null;
  p.time = hasWhen ? f.time : null;
  if (f.format === "in_person") {
    p.location_type = f.locationType;
    if (f.locationType === "custom") {
      p.address = f.address.trim() || null;
      p.latitude = f.latitude;
      p.longitude = f.longitude;
    }
  } else {
    p.meeting_url = f.meetingUrl.trim() || null;
  }
  return p;
}

/** First save: only what the pro filled. */
function createBody(f: FormState): MasterClassPayload {
  const out: Record<string, unknown> = {};
  Object.entries(payloadFromForm(f)).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== "") out[key] = value;
  });
  return out as MasterClassPayload;
}

/** Later saves: only fields that changed; date and time always travel together. */
function changedBody(next: FormState, prev: FormState): MasterClassPayload {
  const a = payloadFromForm(next) as Record<string, unknown>;
  const b = payloadFromForm(prev) as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  Object.keys(a).forEach((key) => {
    if (JSON.stringify(a[key]) !== JSON.stringify(b[key])) out[key] = a[key];
  });
  if ("date" in out || "time" in out) {
    out.date = a.date;
    out.time = a.time;
  }
  if ("date" in out || "end_date" in out) {
    out.end_date = a.end_date;
  }
  // A switch to "custom" needs its address even when the text didn't change
  if (out.location_type === "custom" && a.address != null) {
    out.address = a.address;
    out.latitude = a.latitude;
    out.longitude = a.longitude;
  }
  return out as MasterClassPayload;
}

function rescheduleBody(next: FormState, prev: FormState): MasterClassPayload {
  const out: MasterClassPayload = {};
  if (
    next.date &&
    next.time &&
    (next.date !== prev.date || next.time !== prev.time)
  ) {
    out.date = next.date;
    out.time = next.time;
    out.end_date = next.endDate || null;
  }
  if (next.endDate !== prev.endDate) {
    out.end_date = next.endDate || null;
  }
  if (next.duration && next.duration !== prev.duration) {
    out.duration_minutes = next.duration;
  }
  return out;
}

const samePayload = (a: FormState, b: FormState) =>
  JSON.stringify(payloadFromForm(a)) === JSON.stringify(payloadFromForm(b));

type Kind = "draft" | "publish" | "reschedule";

function validate(
  f: FormState,
  kind: Kind,
  t: (key: string, options?: Record<string, unknown>) => string,
  /** Class's zone (business clock); null before the first save. */
  timeZone?: string | null,
): Errors {
  const e: Errors = {};
  const price = toMoney(f.price);
  const discount = toMoney(f.discountedPrice);
  const capacity = toInt(f.capacity);

  if (kind !== "reschedule") {
    const title = f.title.trim();
    if (!title) e.title = t("mcErrorTitleRequired");
    else if (title.length > CLASS_LIMITS.titleMax) e.title = t("mcErrorTitleTooLong");
    if (f.price.trim() && (price == null || price < CLASS_LIMITS.priceMin)) {
      e.price = t("mcErrorPriceRequired");
    }
    if (discount != null && price != null && discount >= price) {
      e.discountedPrice = t("mcErrorDiscountTooHigh");
    }
    if (
      f.capacity.trim() &&
      (capacity == null ||
        capacity < CLASS_LIMITS.capacityMin ||
        capacity > CLASS_LIMITS.capacityMax)
    ) {
      e.capacity = t("mcErrorSeatsRequired");
    }
    if (f.format === "online" && f.meetingUrl.trim() && !isValidMeetingUrl(f.meetingUrl)) {
      e.meetingUrl = t("mcErrorMeetingUrl");
    }
  }

  if (kind === "publish") {
    if (!f.description.trim()) e.description = t("mcErrorDescriptionRequired");
    if (price == null) e.price = t("mcErrorPriceRequired");
    if (capacity == null) e.capacity = t("mcErrorSeatsRequired");
    if (f.format === "online" && !isValidMeetingUrl(f.meetingUrl)) {
      e.meetingUrl = t("mcErrorMeetingUrl");
    }
    if (
      f.format === "in_person" &&
      f.locationType === "custom" &&
      (!f.address.trim() || f.latitude == null || f.longitude == null)
    ) {
      e.address = t("mcErrorAddressRequired");
    }
  }

  if (kind === "publish" || kind === "reschedule") {
    if (!f.date) e.date = t("mcErrorDateRequired");
    if (!f.time) e.time = t("mcErrorTimeRequired");
    if (f.date && f.time && !isClassDateTimeInFuture(f.date, f.time, timeZone)) {
      e.date = t("mcErrorFutureDateTime");
    }
    if (!f.duration) e.duration = t("mcErrorDurationRequired");
    if (kind === "publish" && !f.endDate) e.endDate = t("mcErrorEndDateRequired");
    if (f.endDate && f.date && f.endDate < f.date) {
      e.endDate = t("mcErrorEndDateBeforeStart");
    }
  }
  return e;
}

const hasErrors = (e: Errors) => Object.keys(e).length > 0;

type Busy = null | "publish" | "draft" | "autosave" | "reschedule";
type SheetName = null | "duration" | "date" | "time" | "endDate" | "address";

export default function MasterClassEditorScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const navigation = useNavigation();
  const dispatch = useAppDispatch();
  const openStripe = useOpenStripeConnect();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);
  const { showBanner } = useNotificationContext();
  // showBanner is a new function on every provider render; keep it out of deps
  const showBannerRef = useRef(showBanner);
  showBannerRef.current = showBanner;
  const params = useLocalSearchParams<{ id?: string }>();
  const paramId = params.id && Number(params.id) > 0 ? Number(params.id) : null;
  const businessStatus = useAppSelector((s) => s.user.businessStatus);
  const stripeReady = isStripeOnboardingCompleted(businessStatus);

  const [serverClass, setServerClass] = useState<MasterClass | null>(null);
  const classIdRef = useRef<number | null>(paramId);
  const [loading, setLoading] = useState(!!paramId);
  const [loadError, setLoadError] = useState<{
    status: number | null;
    message: string;
  } | null>(null);
  const [form, setForm] = useState<FormState>(BLANK_FORM);
  const [savedForm, setSavedForm] = useState<FormState>(BLANK_FORM);
  const formRef = useRef(form);
  formRef.current = form;
  /** Last known server values; PATCH bodies are diffed against this. */
  const baselineRef = useRef<FormState>(BLANK_FORM);
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [stripeError, setStripeError] = useState<string | null>(null);
  const [busy, setBusy] = useState<Busy>(null);
  const busyRef = useRef<Busy>(null);
  busyRef.current = busy;
  const [sheet, setSheet] = useState<SheetName>(null);
  const sheetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (sheetTimer.current) clearTimeout(sheetTimer.current);
    },
    [],
  );
  const [mediaPreview, setMediaPreview] = useState<{
    uri: string | null;
    isVideo: boolean;
    videoUrl: string | null;
  } | null>(null);
  const [showPickerModal, setShowPickerModal] = useState(false);
  const [videoPreviewUri, setVideoPreviewUri] = useState<string | null>(null);
  const [editorUri, setEditorUri] = useState("");
  const [editorVisible, setEditorVisible] = useState(false);
  const [businessAddress, setBusinessAddress] = useState<string | null>(null);
  const businessAddressRequested = useRef(false);
  const allowLeaveRef = useRef(false);

  const scrollRef = useRef<React.ElementRef<typeof KeyboardAwareScrollView>>(null);
  const fieldY = useRef<Partial<Record<FieldKey, number>>>({});
  const descriptionRef = useRef<TextInput>(null);

  const mode: "create" | "edit" | "reschedule" | "locked" = !serverClass
    ? "create"
    : serverClass.status === "draft"
      ? "edit"
      : serverClass.status === "published"
        ? "reschedule"
        : "locked";
  const modeRef = useRef(mode);
  modeRef.current = mode;
  const reschedule = mode === "reschedule";

  const dirty = useMemo(
    () =>
      reschedule
        ? Object.keys(rescheduleBody(form, savedForm)).length > 0
        : !samePayload(form, savedForm),
    [form, savedForm, reschedule],
  );
  const dirtyRef = useRef(dirty);
  dirtyRef.current = dirty;

  // ── Load ────────────────────────────────────────────────────────────
  const applyServerClass = useCallback((cls: MasterClass) => {
    const next = formFromClass(cls);
    classIdRef.current = cls.id;
    baselineRef.current = serverBaseline(cls);
    setServerClass(cls);
    setForm(next);
    setSavedForm(next);
    setMediaPreview(null);
    if (cls.location_type === "business" && cls.location?.address) {
      setBusinessAddress(cls.location.address);
    }
  }, []);

  const load = useCallback(async () => {
    if (!paramId) return;
    setLoading(true);
    setLoadError(null);
    try {
      applyServerClass(await getClass(paramId));
    } catch (err) {
      const parsed = parseApiError(err, t("mcLoadError"));
      setLoadError({ status: parsed.status, message: parsed.message });
    } finally {
      setLoading(false);
    }
  }, [applyServerClass, paramId, t]);

  useEffect(() => {
    void load();
  }, [load]);

  // Back from the publish screen: pick up a class that went live meanwhile.
  const focusedOnce = useRef(false);
  useFocusEffect(
    useCallback(() => {
      if (!focusedOnce.current) {
        focusedOnce.current = true;
        return;
      }
      const id = classIdRef.current;
      if (!id || dirtyRef.current || busyRef.current) return;
      let cancelled = false;
      getClass(id)
        .then((cls) => {
          if (!cancelled && !dirtyRef.current) applyServerClass(cls);
        })
        .catch(() => undefined);
      return () => {
        cancelled = true;
      };
    }, [applyServerClass]),
  );

  // Business address shown under "Business address" (best effort).
  const needsBusinessAddress =
    !reschedule && form.format === "in_person" && form.locationType === "business";
  useEffect(() => {
    if (!needsBusinessAddress || businessAddress || businessAddressRequested.current) {
      return;
    }
    businessAddressRequested.current = true;
    ApiService.get<any>(businessEndpoints.moduleData("business-location"))
      .then((res) => {
        const d = res?.data ?? {};
        const text =
          d.complete_address ||
          [d.street_address, d.city, d.state, d.zip_code].filter(Boolean).join(", ");
        if (text) setBusinessAddress(String(text));
      })
      .catch((err) => Logger.warn("Business address for class failed:", err));
  }, [businessAddress, needsBusinessAddress]);

  // ── Field helpers ───────────────────────────────────────────────────
  const clearError = useCallback((key: FieldKey | FieldKey[]) => {
    const keys = Array.isArray(key) ? key : [key];
    setErrors((prev) => {
      if (!keys.some((k) => prev[k])) return prev;
      const next = { ...prev };
      keys.forEach((k) => delete next[k]);
      return next;
    });
  }, []);

  const setField = useCallback(
    <K extends keyof FormState>(
      key: K,
      value: FormState[K],
      errorKey?: FieldKey | FieldKey[],
    ) => {
      setForm((prev) => ({ ...prev, [key]: value }));
      if (errorKey) clearError(errorKey);
      setFormError(null);
    },
    [clearError],
  );

  const recordY = (keys: FieldKey[]) => (e: LayoutChangeEvent) => {
    const y = e.nativeEvent.layout.y;
    keys.forEach((k) => {
      fieldY.current[k] = y;
    });
  };

  const scrollToFirst = useCallback((errs: Errors) => {
    const first = FIELD_ORDER.find((k) => errs[k]);
    if (!first) return;
    const y = fieldY.current[first];
    if (y == null) return;
    scrollRef.current?.scrollTo({ y: Math.max(0, y - moderateHeightScale(16)), animated: true });
  }, []);

  const warn = () =>
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

  // ── Media ───────────────────────────────────────────────────────────
  const media = useClassMediaUpload((uploaded) => {
    setField("mediaAssetId", uploaded.id, "media");
    setMediaPreview({ uri: uploaded.previewUri, isVideo: uploaded.isVideo, videoUrl: uploaded.videoUrl });
  });
  // Read by the leave handler, which must see the upload as it is right now
  const mediaUploadingRef = useRef(media.uploading);
  mediaUploadingRef.current = media.uploading;
  const cancelMediaRef = useRef(media.cancel);
  cancelMediaRef.current = media.cancel;

  /** Gallery pick: images → crop editor, videos → direct upload via pick(). */
  const handleGalleryPick = useCallback(() => {
    media.clearError();
    void media.pick((imageUri) => {
      setEditorUri(imageUri);
      setEditorVisible(true);
    });
  }, [media]);

  const handleEditorDone = useCallback(
    (croppedUri: string) => {
      setEditorVisible(false);
      setEditorUri("");
      media.clearError();
      void media.uploadImageUri(croppedUri);
    },
    [media],
  );

  const handleEditorCancel = useCallback(() => {
    setEditorVisible(false);
    setEditorUri("");
  }, []);

  // ── Save ────────────────────────────────────────────────────────────
  /** POST the first time, PATCH changes after. Returns the saved class. */
  const saveForm = useCallback(
    async (f: FormState): Promise<MasterClass> => {
      const id = classIdRef.current;
      let saved: MasterClass;
      if (id == null) {
        saved = await createClass(createBody(f));
        classIdRef.current = saved.id;
      } else {
        const body = changedBody(f, baselineRef.current);
        if (!Object.keys(body).length && serverClass) return serverClass;
        saved = await updateClass(id, body);
      }
      baselineRef.current = f;
      setServerClass(saved);
      setSavedForm(f);
      setStripeError(null);
      return saved;
    },
    [serverClass],
  );

  /** 422 → messages under fields; `stripe` → the Connect card. */
  const applyServerErrors = useCallback(
    (err: unknown) => {
      const parsed = parseApiError(err, t("mcSomethingWrong"));
      const mapped: Errors = {};
      let stripe: string | null = null;
      Object.entries(parsed.fieldErrors).forEach(([field, message]) => {
        if (field === "stripe") {
          stripe = message;
          return;
        }
        const key = SERVER_FIELDS[field];
        if (key && !mapped[key]) mapped[key] = message;
      });
      if (stripe) {
        setStripeError(stripe);
        scrollRef.current?.scrollTo({ y: 0, animated: true });
      } else if (hasErrors(mapped)) {
        setErrors((prev) => ({ ...prev, ...mapped }));
        scrollToFirst(mapped);
      }
      const message =
        parsed.status === 403
          ? t("mcOwnerOnly")
          : stripe
            ? null
            : hasErrors(mapped)
              ? t("mcErrorFixFields")
              : parsed.message;
      setFormError(message);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return { ...parsed, message: stripe ?? parsed.message };
    },
    [scrollToFirst, t],
  );

  const leave = useCallback(() => {
    allowLeaveRef.current = true;
    if (router.canGoBack()) router.back();
    else router.replace(LIST_PATH as any);
  }, [router]);

  const onPublish = async () => {
    Keyboard.dismiss();
    if (busyRef.current) return;
    if (media.uploading) {
      setFormError(t("mcWaitForUpload"));
      warn();
      return;
    }
    const e = validate(form, "publish", t, serverClass?.timezone);
    if (hasErrors(e)) {
      setErrors(e);
      setFormError(t("mcErrorFixFields"));
      scrollToFirst(e);
      warn();
      return;
    }
    setErrors({});
    setFormError(null);
    setBusy("publish");
    try {
      const saved = await saveForm(form);
      const missing = saved.missing ?? {};
      const mapped: Errors = {};
      Object.entries(missing).forEach(([field, message]) => {
        const key = SERVER_FIELDS[field];
        if (key && !mapped[key]) mapped[key] = message;
      });
      if (Object.keys(missing).length) {
        // Only Stripe left (e.g. Connect revoked): show the Connect card
        if (missing.stripe) {
          setStripeError(missing.stripe);
          scrollRef.current?.scrollTo({ y: 0, animated: true });
        }
        setErrors(mapped);
        setFormError(
          hasErrors(mapped)
            ? t("mcMissingToPublishTitle")
            : Object.values(missing)[0] ?? t("mcMissingToPublishTitle"),
        );
        scrollToFirst(mapped);
        warn();
        return;
      }
      router.push({
        pathname: PUBLISH_PATH as any,
        params: { id: String(saved.id) },
      });
    } catch (err) {
      applyServerErrors(err);
    } finally {
      setBusy(null);
    }
  };

  const onSaveDraft = async () => {
    Keyboard.dismiss();
    if (busyRef.current) return;
    if (media.uploading) {
      setFormError(t("mcWaitForUpload"));
      warn();
      return;
    }
    const e = validate(form, "draft", t);
    if (hasErrors(e)) {
      setErrors(e);
      setFormError(t("mcErrorFixFields"));
      scrollToFirst(e);
      warn();
      return;
    }
    setFormError(null);
    setBusy("draft");
    try {
      await saveForm(form);
      showBannerRef.current(t("mcDraftSaved"), t("mcDraftSavedText"), "success", 3000);
      leave();
    } catch (err) {
      applyServerErrors(err);
    } finally {
      setBusy(null);
    }
  };

  const doReschedule = async () => {
    const id = classIdRef.current;
    if (!id) return;
    const body = rescheduleBody(form, savedForm);
    if (!Object.keys(body).length) {
      leave();
      return;
    }
    setBusy("reschedule");
    setFormError(null);
    try {
      const saved = await updateClass(id, body);
      const next = formFromClass(saved);
      baselineRef.current = serverBaseline(saved);
      setServerClass(saved);
      setSavedForm(next);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showBannerRef.current(t("mcClassSaved"), t("mcNewTimeSaved"), "success", 3500);
      leave();
    } catch (err) {
      applyServerErrors(err);
    } finally {
      setBusy(null);
    }
  };

  const onSaveNewTime = () => {
    Keyboard.dismiss();
    if (busyRef.current) return;
    const e = validate(form, "reschedule", t, serverClass?.timezone);
    if (hasErrors(e)) {
      setErrors(e);
      setFormError(t("mcErrorFixFields"));
      scrollToFirst(e);
      warn();
      return;
    }
    Alert.alert(t("mcRescheduleConfirmTitle"), t("mcRescheduleConfirmText"), [
      { text: t("cancel"), style: "cancel" },
      { text: t("mcSaveNewTime"), onPress: () => void doReschedule() },
    ]);
  };

  // ── Leaving: save the draft on the way out ──────────────────────────
  const attemptLeave = useCallback(
    function attemptLeave(proceed: () => void, skipUploadCheck = false): void {
      const current = formRef.current;
      const keepEditing = { text: t("flowKeepEditing"), style: "cancel" as const };
      const discard = (label: string) => ({
        text: label,
        style: "destructive" as const,
        onPress: proceed,
      });

      if (modeRef.current === "reschedule" || modeRef.current === "locked") {
        Alert.alert(t("mcDiscardNewTimeTitle"), t("mcDiscardNewTimeText"), [
          keepEditing,
          discard(t("flowDiscard")),
        ]);
        return;
      }
      // Saving now would drop the picked media (the upload stops on unmount)
      if (mediaUploadingRef.current && !skipUploadCheck) {
        Alert.alert(t("mcLeaveUploadingTitle"), t("mcLeaveUploadingText"), [
          keepEditing,
          {
            text: t("mcLeaveWithoutMedia"),
            style: "destructive",
            onPress: () => {
              cancelMediaRef.current();
              // Nothing else changed: just go, no "Draft saved"
              if (!dirtyRef.current) proceed();
              else attemptLeave(proceed, true);
            },
          },
        ]);
        return;
      }
      if (!current.title.trim()) {
        Alert.alert(t("mcLeaveNoTitleTitle"), t("mcLeaveNoTitleText"), [
          keepEditing,
          discard(t("flowDiscard")),
        ]);
        return;
      }
      const e = validate(current, "draft", t);
      if (hasErrors(e)) {
        setErrors(e);
        const first = FIELD_ORDER.find((k) => e[k]);
        Alert.alert(t("mcAutosaveFailedTitle"), (first && e[first]) || t("mcErrorFixFields"), [
          keepEditing,
          discard(t("mcLeaveWithoutSaving")),
        ]);
        return;
      }
      setBusy("autosave");
      saveForm(current)
        .then(() => {
          showBannerRef.current(t("mcDraftSaved"), t("mcDraftSavedText"), "success", 3000);
          proceed();
        })
        .catch((err) => {
          const parsed = applyServerErrors(err);
          Alert.alert(t("mcAutosaveFailedTitle"), parsed.message, [
            keepEditing,
            discard(t("mcLeaveWithoutSaving")),
          ]);
        })
        .finally(() => setBusy(null));
    },
    [applyServerErrors, saveForm, t],
  );

  usePreventRemove(dirty || busy !== null || media.uploading, ({ data }) => {
    const action = data.action;
    if (allowLeaveRef.current) {
      navigation.dispatch(action);
      return;
    }
    if (busyRef.current) return;
    const go = () => {
      allowLeaveRef.current = true;
      navigation.dispatch(action);
    };
    const type = action.type;
    if (type === "GO_BACK" || type === "POP" || type === "REPLACE") {
      attemptLeave(go);
      return;
    }
    // Sent away (notification tap, Go Home): keep a valid draft quietly.
    const current = formRef.current;
    if (
      (modeRef.current === "create" || modeRef.current === "edit") &&
      current.title.trim() &&
      !hasErrors(validate(current, "draft", t))
    ) {
      void saveForm(current).catch((err) =>
        Logger.warn("Class draft save on leave failed:", err),
      );
    }
    go();
  });

  // ── Derived display ─────────────────────────────────────────────────
  const durationOptions: EditorSheetOption<number>[] = useMemo(() => {
    const list = [...DURATION_OPTIONS];
    if (form.duration && !list.includes(form.duration)) {
      list.push(form.duration);
      list.sort((a, b) => a - b);
    }
    return list.map((m) => ({ value: m, label: formatDuration(m) }));
  }, [form.duration]);

  const windowOptions = CANCELLATION_WINDOW_OPTIONS.map((h) => ({
    value: h,
    label: t("mcCancellationWindowOption", { hours: h }),
  }));

  const formatOptions: { value: MasterClassFormat; label: string; icon: IoniconName }[] = [
    { value: "in_person", label: t("mcFormatInPerson"), icon: "storefront-outline" },
    { value: "online", label: t("mcFormatOnline"), icon: "videocam-outline" },
  ];

  const savedMedia =
    serverClass?.media && serverClass.media.id === form.mediaAssetId
      ? serverClass.media
      : null;
  const pending = media.pendingPreview;
  const fee = serverClass?.listing?.fee ?? 50;
  const days = serverClass?.listing?.days ?? 30;
  const showStripeCard =
    !reschedule &&
    (!!stripeError || (!classIdRef.current && !!businessStatus && !stripeReady));
  const footerPad = insets.bottom + moderateHeightScale(24);

  const heading = reschedule
    ? t("mcRescheduleClass")
    : paramId
      ? t("mcEditClass")
      : t("mcCreateClass");

  // ── Render ──────────────────────────────────────────────────────────
  const header = <StackHeader title="" centerLogo />;

  if (loading) {
    return (
      <View style={styles.root}>
        {header}
        <ClassStateView loading style={styles.state} />
      </View>
    );
  }

  if (loadError) {
    const forbidden = loadError.status === 403;
    const missing = loadError.status === 404;
    return (
      <View style={styles.root}>
        {header}
        <ClassStateView
          style={styles.state}
          icon={forbidden ? "lock-closed-outline" : missing ? "search-outline" : "cloud-offline-outline"}
          title={
            forbidden
              ? t("mcOwnerOnly")
              : missing
                ? t("mcClassUnavailable")
                : t("mcSomethingWrong")
          }
          message={forbidden || missing ? undefined : loadError.message}
          actionLabel={forbidden || missing ? t("mcGoToMyClasses") : t("retry")}
          actionIcon={forbidden || missing ? undefined : "refresh"}
          onAction={forbidden || missing ? leave : () => void load()}
        />
      </View>
    );
  }

  if (mode === "locked" && serverClass) {
    const lockedText =
      serverClass.status === "cancelled"
        ? t("mcCancelledText")
        : serverClass.status === "suspended"
          ? t("mcSuspendedText")
          : t("mcRemovedText");
    return (
      <View style={styles.root}>
        {header}
        <ClassStateView
          style={styles.state}
          icon="lock-closed-outline"
          title={t("mcEditNotAllowed")}
          message={lockedText}
          actionLabel={t("mcGoToMyClasses")}
          onAction={leave}
        />
      </View>
    );
  }

  const dateTimeError = errors.date || errors.time;

  const dateTimeRow = (
    <View onLayout={recordY(["date", "time"])}>
      <EditorRow
        labels={[
          { label: t("mcFieldStartDate"), required: true },
          { label: t("mcFieldStartTime"), required: true },
        ]}
      >
        <EditorPickerBox
          icon="calendar-outline"
          value={form.date ? formatClassDate(form.date) : null}
          placeholder={t("mcSelectDate")}
          onPress={() => {
            Keyboard.dismiss();
            setSheet("date");
          }}
          invalid={!!errors.date}
          trailingIcon={null}
        />
        <EditorPickerBox
          icon="time-outline"
          value={form.time ? formatClassTime(form.time) : null}
          placeholder={t("mcSelectTime")}
          onPress={() => {
            Keyboard.dismiss();
            setSheet("time");
          }}
          invalid={!!errors.time}
          trailingIcon={null}
        />
      </EditorRow>
      {dateTimeError ? (
        <View style={styles.rowError}>
          <EditorFieldError message={dateTimeError} />
        </View>
      ) : null}
    </View>
  );

  const endDateRow = (
    <View style={styles.section} onLayout={recordY(["endDate"])}>
      <EditorPickerBox
        label={t("mcFieldEndDate")}
        required={!reschedule}
        icon="calendar-outline"
        value={form.endDate ? formatClassDate(form.endDate) : null}
        placeholder={t("mcSelectEndDate")}
        onPress={() => {
          Keyboard.dismiss();
          setSheet("endDate");
        }}
        error={errors.endDate}
      />
    </View>
  );

  const durationPicker = (
    <EditorPickerBox
      icon={reschedule ? "hourglass-outline" : undefined}
      value={form.duration ? formatDuration(form.duration) : null}
      placeholder={t("mcSelectDuration")}
      onPress={() => {
        Keyboard.dismiss();
        setSheet("duration");
      }}
      error={errors.duration}
    />
  );

  return (
    <View style={styles.root}>
      {header}
      <KeyboardAwareScrollView
        ref={scrollRef}
        style={styles.flex}
        contentContainerStyle={[styles.content, { paddingBottom: footerPad }]}
        bottomOffset={moderateHeightScale(32)}
        keyboardDismissMode="interactive"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.titleBlock}>
          <Text style={styles.heading} accessibilityRole="header">
            {heading}
          </Text>
          {!reschedule ? (
            <Text style={styles.requiredHint}>
              <Text style={styles.requiredStar}>* </Text>
              {t("mcRequiredHint").replace(/^\*\s*/, "")}
            </Text>
          ) : null}
        </View>

        {showStripeCard ? (
          <View style={styles.stripeCard} accessibilityLiveRegion="polite">
            <View style={styles.stripeHead}>
              <View style={styles.stripeIcon}>
                <Ionicons name="card-outline" size={iconScale(20)} color={theme.white} />
              </View>
              <View style={styles.stripeBody}>
                <Text style={styles.stripeTitle}>{t("mcConnectStripeTitle")}</Text>
                <Text style={styles.stripeText}>
                  {stripeError || t("mcConnectStripeText")}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={openStripe}
              style={styles.stripeButton}
              accessibilityRole="button"
              accessibilityLabel={t("mcConnectStripe")}
            >
              <Text style={styles.stripeButtonText}>{t("mcConnectStripe")}</Text>
              <Ionicons name="arrow-forward" size={iconScale(16)} color={theme.white} />
            </TouchableOpacity>
          </View>
        ) : null}

        {reschedule && serverClass ? (
          <>
            <View style={styles.lockNotice}>
              <Ionicons
                name="lock-closed-outline"
                size={iconScale(18)}
                color={theme.goldTextDark}
              />
              <Text style={styles.lockText}>{t("mcLockedAfterPublish")}</Text>
            </View>

            <SectionCard>
              <ClassSummaryRow masterClass={serverClass} thumbSize={moderateWidthScale(72)}>
                <MetaRow
                  icon="calendar-outline"
                  text={getClassWhenText(serverClass)}
                />
                <MetaRow icon="people-outline" text={getSeatsEnrolledText(serverClass)} />
              </ClassSummaryRow>
            </SectionCard>

            {dateTimeRow}
            {endDateRow}

            <View style={styles.section} onLayout={recordY(["duration"])}>
              <EditorLabel label={t("mcFieldClassDuration")} required />
              {durationPicker}
            </View>

            <SectionCard title={t("mcClassDetails")} icon="document-text-outline">
              <EditorReadOnlyRow
                icon="pricetag-outline"
                label={t("mcPrice")}
                value={(() => {
                  const p = getClassPrice(serverClass);
                  const main = formatClassPrice(p.current);
                  return p.original != null
                    ? `${main} (${formatClassPrice(p.original)})`
                    : main;
                })()}
              />
              <EditorReadOnlyRow
                icon="people-outline"
                label={t("mcSeats")}
                value={serverClass.capacity != null ? String(serverClass.capacity) : null}
              />
              <EditorReadOnlyRow
                icon={serverClass.format === "online" ? "videocam-outline" : "location-outline"}
                label={t("mcFormat")}
                value={
                  serverClass.format === "online"
                    ? getFormatLabel("online")
                    : [getFormatLabel("in_person"), serverClass.location?.address]
                        .filter(Boolean)
                        .join(" · ")
                }
              />
              <EditorReadOnlyRow
                icon="shield-checkmark-outline"
                label={t("mcCancellationPolicy")}
                value={
                  serverClass.cancellation_terms ||
                  (serverClass.cancellation_window_hours
                    ? t("mcCancellationWindowHelper", {
                        hours: serverClass.cancellation_window_hours,
                      })
                    : null)
                }
                numberOfLines={4}
              />
              <EditorReadOnlyRow
                icon="reader-outline"
                label={t("mcFieldDescription")}
                value={serverClass.description}
                numberOfLines={4}
                last
              />
            </SectionCard>

            <View style={styles.infoNote}>
              <Ionicons
                name="notifications-outline"
                size={iconScale(17)}
                color={theme.darkGreen}
              />
              <Text style={styles.infoText}>{t("mcRescheduleConfirmText")}</Text>
            </View>

            {formError ? (
              <View style={styles.formError} accessibilityLiveRegion="polite">
                <EditorFieldError message={formError} />
              </View>
            ) : null}

            <View style={styles.actions}>
              <PrimaryButton
                label={t("mcSaveNewTime")}
                icon="time-outline"
                loading={busy === "reschedule"}
                disabled={!dirty || busy !== null}
                onPress={onSaveNewTime}
                styles={styles}
                theme={theme}
              />
            </View>
          </>
        ) : (
          <>
            <View style={styles.section} onLayout={recordY(["media"])}>
              <EditorMediaBox
                previewUri={pending ? pending.uri : (mediaPreview?.uri ?? null)}
                isVideo={
                  pending
                    ? pending.isVideo
                    : (mediaPreview?.isVideo ?? savedMedia?.type === "video")
                }
                media={pending ? null : savedMedia}
                hasMedia={form.mediaAssetId != null}
                uploading={media.uploading}
                percent={media.percent}
                error={media.error || errors.media}
                onPick={() => {
                  Keyboard.dismiss();
                  media.clearError();
                  setShowPickerModal(true);
                }}
                onRemove={() => {
                  setField("mediaAssetId", null, "media");
                  setMediaPreview(null);
                  media.clearError();
                }}
                onCancelUpload={media.cancel}
                onPreviewPress={() => {
                  const isVideo = pending
                    ? pending.isVideo
                    : (mediaPreview?.isVideo ?? savedMedia?.type === "video");
                  if (isVideo) {
                    const videoUrl =
                      mediaPreview?.videoUrl ?? savedMedia?.url;
                    if (videoUrl) setVideoPreviewUri(videoUrl);
                  } else {
                    const uri =
                      pending?.uri ?? mediaPreview?.uri ?? savedMedia?.url ?? savedMedia?.thumbnail_url;
                    if (uri) dispatch(openFullImageModal({ images: [uri] }));
                  }
                }}
              />
            </View>

            <View style={styles.section} onLayout={recordY(["title"])}>
              <EditorTextInput
                label={t("mcFieldTitle")}
                required
                value={form.title}
                onChangeText={(v) => setField("title", v, "title")}
                placeholder={t("mcFieldTitlePlaceholder")}
                maxLength={CLASS_LIMITS.titleMax}
                counterMax={CLASS_LIMITS.titleMax}
                autoCapitalize="words"
                returnKeyType="next"
                onSubmitEditing={() => descriptionRef.current?.focus()}
                error={errors.title}
              />
            </View>

            <View style={styles.section} onLayout={recordY(["description"])}>
              <EditorTextInput
                ref={descriptionRef}
                label={t("mcFieldDescription")}
                required
                value={form.description}
                onChangeText={(v) => setField("description", v, "description")}
                placeholder={t("mcFieldDescriptionPlaceholder")}
                multiline
                minLines={4}
                autoCapitalize="sentences"
                error={errors.description}
              />
            </View>

            <View style={styles.section} onLayout={recordY(["prerequisites"])}>
              <EditorTextInput
                label={t("mcFieldPrerequisites")}
                value={form.prerequisites}
                onChangeText={(v) => setField("prerequisites", v, "prerequisites")}
                placeholder={t("mcFieldPrerequisitesPlaceholder")}
                multiline
                minLines={3}
                autoCapitalize="sentences"
                error={errors.prerequisites}
              />
            </View>

            {dateTimeRow}
            {endDateRow}

            <View onLayout={recordY(["duration", "capacity"])}>
              <EditorRow
                labels={[
                  { label: t("mcFieldClassDuration"), required: true },
                  { label: t("mcFieldSeats"), required: true },
                ]}
              >
                {durationPicker}
                <EditorTextInput
                  value={form.capacity}
                  onChangeText={(v) =>
                    setField("capacity", v.replace(/[^0-9]/g, "").slice(0, 4), "capacity")
                  }
                  placeholder={t("mcFieldSeatsPlaceholder")}
                  keyboardType="number-pad"
                  maxLength={4}
                  accessibilityLabel={`${t("mcFieldSeats")}, required`}
                  error={errors.capacity}
                />
              </EditorRow>
            </View>

            <View onLayout={recordY(["price", "discountedPrice"])}>
              <EditorRow
                labels={[
                  { label: t("mcFieldPrice"), required: true },
                  { label: t("mcFieldDiscountedPrice") },
                ]}
              >
                <EditorTextInput
                  prefix="$"
                  value={form.price}
                  onChangeText={(v) =>
                    setField("price", cleanMoney(v), ["price", "discountedPrice"])
                  }
                  placeholder={t("mcFieldPricePlaceholder")}
                  keyboardType="decimal-pad"
                  accessibilityLabel={`${t("mcFieldPrice")}, required`}
                  error={errors.price}
                />
                <EditorTextInput
                  prefix="$"
                  value={form.discountedPrice}
                  onChangeText={(v) =>
                    setField("discountedPrice", cleanMoney(v), "discountedPrice")
                  }
                  placeholder={t("mcFieldPricePlaceholder")}
                  keyboardType="decimal-pad"
                  accessibilityLabel={t("mcFieldDiscountedPrice")}
                  error={errors.discountedPrice}
                />
              </EditorRow>
            </View>

            <View style={styles.section} onLayout={recordY(["format"])}>
              <EditorLabel label={t("mcFieldFormat")} required />
              <EditorSegmented
                options={formatOptions}
                value={form.format}
                accessibilityLabel={t("mcFieldFormat")}
                onChange={(v) => {
                  Keyboard.dismiss();
                  setField("format", v, ["format", "address", "meetingUrl"]);
                }}
              />
              <EditorFieldError message={errors.format} />
            </View>

            {form.format === "in_person" ? (
              <View style={styles.section} onLayout={recordY(["address"])}>
                <EditorLabel label={t("mcFieldLocation")} required />
                <View style={styles.radioList} accessibilityRole="radiogroup">
                  <EditorRadioCard
                    title={t("mcLocationBusiness")}
                    subtitle={businessAddress}
                    icon="storefront-outline"
                    selected={form.locationType === "business"}
                    onPress={() => setField("locationType", "business", "address")}
                  />
                  <EditorRadioCard
                    title={t("mcLocationCustom")}
                    icon="navigate-outline"
                    selected={form.locationType === "custom"}
                    onPress={() => {
                      setField("locationType", "custom");
                      if (!form.address.trim()) setSheet("address");
                    }}
                  />
                </View>
                {form.locationType === "custom" ? (
                  <EditorPickerBox
                    label={t("mcFieldAddress")}
                    required
                    icon="location-outline"
                    value={form.address || null}
                    placeholder={t("mcFieldAddressPlaceholder")}
                    onPress={() => {
                      Keyboard.dismiss();
                      setSheet("address");
                    }}
                    trailingIcon="search"
                    numberOfLines={2}
                    error={errors.address}
                  />
                ) : (
                  <EditorFieldError message={errors.address} />
                )}
              </View>
            ) : (
              <View style={styles.section} onLayout={recordY(["meetingUrl"])}>
                <EditorTextInput
                  label={t("mcFieldMeetingUrl")}
                  required
                  value={form.meetingUrl}
                  onChangeText={(v) => setField("meetingUrl", v.trim(), "meetingUrl")}
                  placeholder={t("mcFieldMeetingUrlPlaceholder")}
                  keyboardType="url"
                  autoCapitalize="none"
                  autoCorrect={false}
                  textContentType="URL"
                  helper={t("mcMeetingUrlHelper")}
                  error={errors.meetingUrl}
                />
              </View>
            )}

            <View style={styles.section} onLayout={recordY(["window"])}>
              <EditorLabel label={t("mcFieldCancellationWindow")} required />
              <EditorChips
                options={windowOptions}
                value={form.cancellationWindow}
                accessibilityLabel={t("mcFieldCancellationWindow")}
                onChange={(v) => setField("cancellationWindow", v, "window")}
              />
              <EditorFieldError message={errors.window} />
              {!errors.window ? (
                <EditorHelper
                  icon="information-circle-outline"
                  text={t("mcCancellationWindowHelper", {
                    hours: form.cancellationWindow,
                  })}
                />
              ) : null}
            </View>

            {formError ? (
              <View style={styles.formError} accessibilityLiveRegion="polite">
                <EditorFieldError message={formError} />
              </View>
            ) : null}

            <View style={styles.actions}>
              <PrimaryButton
                label={t("mcPublishClass")}
                loading={busy === "publish"}
                disabled={busy !== null}
                onPress={() => void onPublish()}
                styles={styles}
                theme={theme}
              />
              <Text style={styles.feeHint}>
                {t("mcPublishFeeHint", { fee: formatClassPrice(fee), days })}
              </Text>
              <TouchableOpacity
                activeOpacity={0.75}
                onPress={() => void onSaveDraft()}
                disabled={busy !== null}
                style={[styles.secondary, busy !== null && styles.disabled]}
                accessibilityRole="button"
                accessibilityState={{ disabled: busy !== null, busy: busy === "draft" }}
                accessibilityLabel={t("mcSaveAsDraft")}
              >
                {busy === "draft" ? (
                  <ActivityIndicator color={theme.darkGreen} />
                ) : (
                  <>
                    <Ionicons
                      name="document-outline"
                      size={iconScale(18)}
                      color={theme.darkGreen}
                    />
                    <Text style={styles.secondaryText}>{t("mcSaveAsDraft")}</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </>
        )}
      </KeyboardAwareScrollView>

      {busy === "autosave" ? (
        <View style={styles.savingOverlay} accessibilityLiveRegion="polite">
          <View style={styles.savingCard}>
            <ActivityIndicator color={theme.darkGreen} />
            <Text style={styles.savingText}>{t("saving")}</Text>
          </View>
        </View>
      ) : null}

      <EditorOptionSheet
        visible={sheet === "duration"}
        title={t("mcFieldClassDuration")}
        options={durationOptions}
        selected={form.duration}
        onSelect={(v) => {
          setField("duration", v, "duration");
          setSheet(null);
        }}
        onClose={() => setSheet(null)}
      />
      <EditorDateSheet
        visible={sheet === "date"}
        value={form.date}
        timeZone={serverClass?.timezone}
        onConfirm={(date) => {
          const keepTime =
            !!form.time && isClassDateTimeInFuture(date, form.time, serverClass?.timezone);
          setForm((prev) => {
            const endDate =
              !prev.endDate || prev.endDate < date ? date : prev.endDate;
            return { ...prev, date, time: keepTime ? prev.time : null, endDate };
          });
          clearError(["date", "time", "endDate"]);
          setFormError(null);
          setSheet(null);
          if (!keepTime) {
            if (sheetTimer.current) clearTimeout(sheetTimer.current);
            sheetTimer.current = setTimeout(() => setSheet("time"), 450);
          }
        }}
        onClose={() => setSheet(null)}
      />
      <EditorDateSheet
        visible={sheet === "endDate"}
        value={form.endDate}
        timeZone={serverClass?.timezone}
        minDate={form.date ?? undefined}
        onConfirm={(endDate) => {
          setField("endDate", endDate, "endDate");
          setSheet(null);
        }}
        onClose={() => setSheet(null)}
      />
      <EditorTimeSheet
        visible={sheet === "time"}
        value={form.time}
        date={form.date}
        timeZone={serverClass?.timezone}
        onConfirm={(time) => {
          setField("time", time, ["date", "time"]);
          setSheet(null);
        }}
        onClose={() => setSheet(null)}
      />
      <EditorAddressSheet
        visible={sheet === "address"}
        initialQuery={form.address}
        onSelect={(picked: PickedAddress) => {
          setForm((prev) => ({
            ...prev,
            locationType: "custom",
            address: picked.address,
            latitude: picked.latitude,
            longitude: picked.longitude,
          }));
          clearError("address");
          setFormError(null);
          setSheet(null);
        }}
        onClose={() => setSheet(null)}
      />
      <ImagePickerModal
        visible={showPickerModal}
        onClose={() => setShowPickerModal(false)}
        onImageSelected={(uri) => {
          setEditorUri(uri);
          setEditorVisible(true);
        }}
        onGalleryPress={handleGalleryPick}
        title={t("mcAddMedia")}
      />
      <PhotoEditorModal
        visible={editorVisible}
        imageUri={editorUri}
        onDone={handleEditorDone}
        onCancel={handleEditorCancel}
        cropShape="square"
        cropAspectRatio={MEDIA_CROP_ASPECT}
      />
      <LocalVideoPreviewModal
        visible={!!videoPreviewUri}
        uri={videoPreviewUri}
        onClose={() => setVideoPreviewUri(null)}
      />
    </View>
  );
}

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
  icon?: IoniconName;
  loading: boolean;
  disabled: boolean;
  onPress: () => void;
  styles: ReturnType<typeof createStyles>;
  theme: Theme;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      disabled={disabled}
      style={[styles.primary, disabled && !loading && styles.disabled]}
      accessibilityRole="button"
      accessibilityState={{ disabled, busy: loading }}
      accessibilityLabel={label}
    >
      {loading ? (
        <ActivityIndicator color={theme.white} />
      ) : (
        <>
          {icon ? <Ionicons name={icon} size={iconScale(19)} color={theme.white} /> : null}
          <Text style={styles.primaryText}>{label}</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: theme.background,
    },
    flex: {
      flex: 1,
    },
    state: {
      flex: 1,
    },
    content: {
      paddingHorizontal: moderateWidthScale(20),
      paddingTop: moderateHeightScale(16),
      gap: moderateHeightScale(20),
    },
    titleBlock: {
      alignItems: "center",
      gap: moderateHeightScale(4),
    },
    heading: {
      fontSize: fontSize.size22,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      textAlign: "center",
    },
    requiredHint: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      textAlign: "center",
    },
    requiredStar: {
      color: theme.red,
      fontFamily: fonts.fontBold,
    },
    section: {
      gap: moderateHeightScale(8),
    },
    rowError: {
      marginTop: moderateHeightScale(7),
    },
    radioList: {
      gap: moderateHeightScale(8),
    },
    // Stripe card
    stripeCard: {
      gap: moderateHeightScale(12),
      padding: moderateWidthScale(14),
      borderRadius: moderateWidthScale(14),
      borderWidth: 1.5,
      borderColor: theme.orangeBrown,
      backgroundColor: theme.noticeCream,
    },
    stripeHead: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: moderateWidthScale(12),
    },
    stripeIcon: {
      width: moderateWidthScale(38),
      height: moderateWidthScale(38),
      borderRadius: moderateWidthScale(19),
      backgroundColor: theme.darkGreen,
      alignItems: "center",
      justifyContent: "center",
    },
    stripeBody: {
      flex: 1,
      gap: moderateHeightScale(3),
    },
    stripeTitle: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    stripeText: {
      fontSize: fontSize.size13,
      lineHeight: fontSize.size13 * 1.4,
      fontFamily: fonts.fontRegular,
      color: theme.textMuted,
    },
    stripeButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: moderateWidthScale(6),
      minHeight: heightScale(44),
      borderRadius: moderateWidthScale(12),
      backgroundColor: theme.darkGreen,
    },
    stripeButtonText: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontBold,
      color: theme.white,
    },
    // Reschedule
    lockNotice: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: moderateWidthScale(10),
      padding: moderateWidthScale(12),
      borderRadius: moderateWidthScale(12),
      borderWidth: 1,
      borderColor: theme.goldBorder,
      backgroundColor: theme.noticeCream,
    },
    lockText: {
      flex: 1,
      fontSize: fontSize.size14,
      lineHeight: fontSize.size14 * 1.4,
      fontFamily: fonts.fontMedium,
      color: theme.goldTextDark,
    },
    infoNote: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: moderateWidthScale(10),
      padding: moderateWidthScale(12),
      borderRadius: moderateWidthScale(12),
      backgroundColor: theme.tileMint,
    },
    infoText: {
      flex: 1,
      fontSize: fontSize.size14,
      lineHeight: fontSize.size14 * 1.4,
      fontFamily: fonts.fontRegular,
      color: theme.darkGreen,
    },
    // Footer
    formError: {
      padding: moderateWidthScale(12),
      borderRadius: moderateWidthScale(12),
      backgroundColor: theme.lightRed,
    },
    actions: {
      gap: moderateHeightScale(10),
      marginTop: moderateHeightScale(4),
    },
    primary: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: moderateWidthScale(8),
      minHeight: heightScale(54),
      borderRadius: moderateWidthScale(14),
      backgroundColor: theme.darkGreen,
      paddingHorizontal: moderateWidthScale(16),
      shadowColor: theme.shadow,
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.15,
      shadowRadius: 6,
      elevation: 3,
    },
    primaryText: {
      fontSize: fontSize.size17,
      fontFamily: fonts.fontBold,
      color: theme.white,
    },
    disabled: {
      opacity: 0.5,
    },
    feeHint: {
      fontSize: fontSize.size12,
      lineHeight: fontSize.size12 * 1.4,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      textAlign: "center",
    },
    secondary: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: moderateWidthScale(8),
      minHeight: heightScale(50),
      borderRadius: moderateWidthScale(14),
      borderWidth: 1.5,
      borderColor: theme.darkGreen,
      backgroundColor: "transparent",
    },
    secondaryText: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    // Autosave
    savingOverlay: {
      ...StyleSheet.absoluteFillObject,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.lightGreen2,
    },
    savingCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(10),
      paddingHorizontal: moderateWidthScale(20),
      paddingVertical: moderateHeightScale(14),
      borderRadius: moderateWidthScale(14),
      backgroundColor: theme.surfaceRaised,
    },
    savingText: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
  });
