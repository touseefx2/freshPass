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
  BackHandler,
  Keyboard,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import {
  useFocusEffect,
  useLocalSearchParams,
  useNavigation,
  useRouter,
} from "expo-router";
import { useTranslation } from "react-i18next";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import Animated, {
  FadeInLeft,
  FadeInRight,
  ReduceMotion,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import dayjs, { type Dayjs } from "dayjs";
import { useAppSelector, useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  heightScale,
  moderateHeightScale,
  moderateWidthScale,
  widthScale,
} from "@/src/theme/dimensions";
import FlowHeader from "@/src/components/reelFlow/flowHeader";
import FlowFooter from "@/src/components/reelFlow/flowFooter";
import EmptyState from "@/src/components/emptyState";
import StackHeader from "@/src/components/StackHeader";
import {
  FlowCard,
  FlowTitle,
  InfoNote,
  SectionLabel,
} from "@/src/components/reelFlow/flowParts";
import {
  FlowTextField,
  SelectField,
  ToggleRow,
} from "@/src/components/reelFlow/detailsFields";
import { ClosingDatePicker } from "@/src/components/jobs/closingDatePicker";
import { useNotificationContext } from "@/src/contexts/NotificationContext";
import { ApiService } from "@/src/services/api";
import { businessEndpoints } from "@/src/services/endpoints";
import {
  createJobPost,
  fetchMyJobPost,
  updateJobPost,
} from "@/src/services/jobService";
import type {
  JobEmploymentType,
  JobExperienceLevel,
  JobPayPeriod,
  JobPost,
  JobPostPayload,
  JobSchedule,
} from "@/src/types/jobs";
import {
  JOB_DATE_FORMAT,
  JOB_DEFAULT_DAYS_AHEAD,
  JOB_EMPLOYMENT_LABEL_KEYS,
  JOB_EMPLOYMENT_TYPES,
  JOB_EXPERIENCE_LABEL_KEYS,
  JOB_EXPERIENCE_LEVELS,
  JOB_MAX_DAYS_AHEAD,
  JOB_PAY_PERIODS,
  JOB_PAY_PERIOD_LABEL_KEYS,
  JOB_SCHEDULE_LABEL_KEYS,
  formatJobDate,
  formatJobPay,
  getJobErrorMessage,
  getJobErrorStatus,
  getJobFieldErrors,
  isJobDatePast,
} from "@/src/utils/jobHelpers";

/**
 * Post / edit a job step by step, in the reel-flow look:
 * The role → Who you need → Pay & location → Review (closing date + Post).
 * Edit opens on Review; "Edit" on a row jumps to that step and back.
 */

type Step = 0 | 1 | 2 | 3;
const TOTAL_STEPS = 4;
const REVIEW: Step = 3;
const DETAIL_PATH =
  "/(main)/dashboard/(account)/(businessProfileSettings)/jobPostDetail";

type Draft = {
  title: string;
  categoryId: number | null;
  categoryName: string;
  schedule: JobSchedule;
  employmentType: JobEmploymentType | null;
  experienceLevel: JobExperienceLevel | null;
  licenseRequired: boolean;
  licenseDetails: string;
  description: string;
  useSalonAddress: boolean;
  location: string;
  payMin: string;
  payMax: string;
  payPeriod: JobPayPeriod;
  compensationNote: string;
  expiresAt: Dayjs | null;
};

type FieldKey =
  | "title"
  | "category"
  | "experience"
  | "licenseDetails"
  | "description"
  | "location"
  | "payMin"
  | "payMax"
  | "compensationNote"
  | "expiresAt";
type Errors = Partial<Record<FieldKey, string>>;

/** Server field → step + form field */
const SERVER_FIELDS: Record<string, { key: FieldKey; step: Step }> = {
  title: { key: "title", step: 0 },
  category_id: { key: "category", step: 0 },
  schedule: { key: "title", step: 0 },
  employment_type: { key: "title", step: 0 },
  experience_level: { key: "experience", step: 1 },
  license_details: { key: "licenseDetails", step: 1 },
  description: { key: "description", step: 1 },
  location: { key: "location", step: 2 },
  pay_min: { key: "payMin", step: 2 },
  pay_max: { key: "payMax", step: 2 },
  pay_period: { key: "payMax", step: 2 },
  compensation_note: { key: "compensationNote", step: 2 },
  expires_at: { key: "expiresAt", step: REVIEW },
};

const TITLE_IDEAS = [
  "jobIdeaBarber",
  "jobIdeaSeniorBarber",
  "jobIdeaStylist",
  "jobIdeaNailTech",
  "jobIdeaEsthetician",
  "jobIdeaReceptionist",
  "jobIdeaApprentice",
] as const;

const EXPERIENCE_HINT_KEYS: Record<JobExperienceLevel, string> = {
  entry_level: "jobExperienceEntryHint",
  "1_plus_years": "jobExperience1PlusHint",
  "3_plus_years": "jobExperience3PlusHint",
  "5_plus_years": "jobExperience5PlusHint",
};

// Keeps "12." while typing; one decimal point, two decimals max.
const cleanMoney = (v: string) => {
  const digits = v.replace(",", ".").replace(/[^0-9.]/g, "");
  const [whole, ...rest] = digits.split(".");
  return rest.length ? `${whole}.${rest.join("").slice(0, 2)}` : whole;
};
const toMoney = (v: string): number | null => {
  if (!v.trim()) return null;
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : null;
};

/** Body for POST / PUT from a draft (no closing date). */
function payloadFromDraft(d: Draft): JobPostPayload {
  const payMin = toMoney(d.payMin);
  const payMax = toMoney(d.payMax);
  return {
    title: d.title.trim(),
    category_id: d.categoryId ?? undefined,
    schedule: d.schedule,
    employment_type: d.employmentType,
    experience_level: d.experienceLevel ?? undefined,
    license_required: d.licenseRequired,
    license_details: d.licenseRequired ? d.licenseDetails.trim() || null : null,
    description: d.description.trim(),
    // null → the salon address
    location: d.useSalonAddress ? null : d.location.trim() || null,
    pay_min: payMin,
    pay_max: payMax,
    pay_period: payMin != null || payMax != null ? d.payPeriod : null,
    compensation_note: d.compensationNote.trim() || null,
  };
}

function draftFromPost(post: JobPost): Draft {
  return {
    title: post.title,
    categoryId: post.category?.id ?? post.categoryId,
    categoryName: post.category?.name ?? "",
    schedule: post.schedule,
    employmentType: post.employmentType,
    experienceLevel: post.experienceLevel,
    licenseRequired: post.licenseRequired,
    licenseDetails: post.licenseDetails ?? "",
    description: post.description,
    useSalonAddress: !post.location,
    location: post.location ?? "",
    payMin: post.payMin != null ? String(post.payMin) : "",
    payMax: post.payMax != null ? String(post.payMax) : "",
    payPeriod: post.payPeriod ?? "hour",
    compensationNote: post.compensationNote ?? "",
    // A passed date can't be sent back; the owner picks a new one or leaves it
    expiresAt:
      post.expiresAt && !isJobDatePast(post.expiresAt)
        ? dayjs(post.expiresAt)
        : null,
  };
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: theme.background },
    flex: { flex: 1 },
    loader: { flex: 1, alignItems: "center", justifyContent: "center" },
    content: {
      paddingHorizontal: moderateWidthScale(20),
      paddingTop: moderateHeightScale(12),
      paddingBottom: moderateHeightScale(28),
    },
    stepBody: { gap: moderateHeightScale(22) },
    section: { gap: moderateHeightScale(10) },
    // ── Title ideas
    ideas: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: moderateWidthScale(8),
    },
    idea: {
      minHeight: heightScale(40),
      paddingHorizontal: moderateWidthScale(14),
      borderRadius: heightScale(20),
      backgroundColor: theme.lightGreen07,
      alignItems: "center",
      justifyContent: "center",
    },
    ideaText: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
    },
    // ── Big option tiles (schedule)
    tiles: { flexDirection: "row", gap: moderateWidthScale(12) },
    tile: {
      flex: 1,
      minHeight: heightScale(96),
      padding: moderateWidthScale(14),
      borderRadius: moderateWidthScale(18),
      borderWidth: 2,
      borderColor: theme.borderLight,
      backgroundColor: theme.white,
      gap: moderateHeightScale(8),
    },
    tileOn: {
      borderColor: theme.darkGreen,
      backgroundColor: theme.tileMint,
    },
    tileHead: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    tileTitle: {
      fontSize: fontSize.size17,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    tileSub: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
    },
    // ── Chips
    chips: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: moderateWidthScale(8),
    },
    chip: {
      minHeight: heightScale(44),
      paddingHorizontal: moderateWidthScale(16),
      borderRadius: heightScale(22),
      borderWidth: 1.5,
      borderColor: theme.borderNormal,
      backgroundColor: theme.white,
      alignItems: "center",
      justifyContent: "center",
    },
    chipOn: {
      backgroundColor: theme.darkGreen,
      borderColor: theme.darkGreen,
    },
    chipText: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
    },
    chipTextOn: { color: theme.white, fontFamily: fonts.fontBold },
    capitalize: { textTransform: "capitalize" },
    // ── Radio list (experience)
    radioList: { overflow: "hidden" },
    radioRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(12),
      minHeight: heightScale(60),
      paddingHorizontal: moderateWidthScale(16),
      paddingVertical: moderateHeightScale(10),
    },
    radioRowBorder: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.borderLight,
    },
    radioRowOn: { backgroundColor: theme.tileMint },
    radioText: { flex: 1, minWidth: 0, gap: moderateHeightScale(1) },
    radioTitle: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    radioSub: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
    },
    radioListError: { borderColor: theme.red },
    fieldError: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontMedium,
      color: theme.red,
    },
    // ── Pay
    row2: { flexDirection: "row", gap: moderateWidthScale(12) },
    half: { flex: 1 },
    preview: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(10),
      padding: moderateWidthScale(14),
      borderRadius: moderateWidthScale(16),
      backgroundColor: theme.upcomingCard,
      borderWidth: 1,
      borderColor: theme.orangeBrown30,
    },
    previewText: { flex: 1, minWidth: 0, gap: moderateHeightScale(2) },
    previewLabel: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontMedium,
      color: theme.orangeBrownText,
      textTransform: "uppercase",
      letterSpacing: 0.6,
    },
    previewValue: {
      fontSize: fontSize.size17,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    // ── Review
    reviewCard: { overflow: "hidden" },
    reviewHero: {
      padding: moderateWidthScale(16),
      gap: moderateHeightScale(4),
      flexDirection: "row",
      alignItems: "center",
    },
    reviewHeroIcon: {
      width: widthScale(52),
      height: widthScale(52),
      borderRadius: moderateWidthScale(16),
      backgroundColor: theme.tileMint,
      alignItems: "center",
      justifyContent: "center",
      marginRight: moderateWidthScale(12),
    },
    reviewHeroText: { flex: 1, minWidth: 0, gap: moderateHeightScale(2) },
    reviewName: {
      fontSize: fontSize.size19,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    reviewMeta: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
    },
    reviewRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: moderateWidthScale(12),
      paddingHorizontal: moderateWidthScale(16),
      paddingVertical: moderateHeightScale(14),
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.borderLight,
    },
    reviewRowText: { flex: 1, minWidth: 0, gap: moderateHeightScale(3) },
    reviewLabel: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontMedium,
      color: theme.lightGreen,
      textTransform: "uppercase",
      letterSpacing: 0.6,
    },
    reviewValue: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
      lineHeight: fontSize.size22,
    },
    reviewEdit: {
      minHeight: heightScale(36),
      minWidth: widthScale(56),
      paddingHorizontal: moderateWidthScale(12),
      borderRadius: heightScale(18),
      backgroundColor: theme.lightGreen07,
      alignItems: "center",
      justifyContent: "center",
    },
    reviewEditText: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
  });

export default function JobPostEditorScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const navigation = useNavigation();
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { showBanner } = useNotificationContext();
  const params = useLocalSearchParams<{ id?: string }>();
  const editId = params.id ?? null;
  const isEdit = !!editId;
  const businessCategory = useAppSelector(
    (s) => s.user.businessStatus?.business_category ?? null,
  );

  const blankDraft = useMemo<Draft>(
    () => ({
      title: "",
      categoryId: businessCategory?.id ?? null,
      categoryName: businessCategory?.name ?? "",
      schedule: "full_time",
      employmentType: null,
      experienceLevel: null,
      licenseRequired: false,
      licenseDetails: "",
      description: "",
      useSalonAddress: true,
      location: "",
      payMin: "",
      payMax: "",
      payPeriod: "hour",
      compensationNote: "",
      expiresAt: dayjs().startOf("day").add(JOB_DEFAULT_DAYS_AHEAD, "day"),
    }),
    // Defaults are taken once
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const [original, setOriginal] = useState<JobPost | null>(null);
  const [initial, setInitial] = useState<Draft>(blankDraft);
  const [draft, setDraft] = useState<Draft>(blankDraft);
  const [loading, setLoading] = useState(isEdit);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [step, setStep] = useState<Step>(isEdit ? REVIEW : 0);
  const [direction, setDirection] = useState<1 | -1>(1);
  // Opened from Review's "Edit": the primary button goes back to Review.
  const [fromReview, setFromReview] = useState(isEdit);
  const [errors, setErrors] = useState<Errors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [categories, setCategories] = useState<{ id: number; name: string }[]>(
    [],
  );
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [categoryOpen, setCategoryOpen] = useState(false);

  const payMaxRef = useRef<TextInput>(null);

  // ── Load (edit) ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!editId) return;
    let cancelled = false;
    fetchMyJobPost(editId)
      .then((post) => {
        if (cancelled) return;
        const next = draftFromPost(post);
        setOriginal(post);
        setInitial(next);
        setDraft(next);
      })
      .catch((err) => {
        if (cancelled) return;
        setLoadError(
          getJobErrorStatus(err) === 404
            ? t("jobPostGoneSubtitle")
            : getJobErrorMessage(err, t("somethingWentWrong")),
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [editId, t]);

  const loadCategories = useCallback(async () => {
    if (categories.length > 0) return;
    setCategoriesLoading(true);
    try {
      const response = await ApiService.get<{
        success: boolean;
        data?:
          | { id: number; name: string }[]
          | { data?: { id: number; name: string }[] };
      }>(businessEndpoints.categories);
      const list = Array.isArray(response?.data)
        ? response.data
        : Array.isArray((response?.data as any)?.data)
          ? (response.data as any).data
          : [];
      setCategories(list);
    } catch {
      // The field stays on the business's category
    } finally {
      setCategoriesLoading(false);
    }
  }, [categories.length]);

  // ── Derived ─────────────────────────────────────────────────────────
  const payMin = toMoney(draft.payMin);
  const payMax = toMoney(draft.payMax);
  const hasPay = payMin != null || payMax != null;
  const payPreview = formatJobPay(
    { payMin, payMax, payPeriod: hasPay ? draft.payPeriod : null },
    t,
  );

  const dirty = useMemo(
    () =>
      JSON.stringify({
        ...draft,
        expiresAt: draft.expiresAt?.format(JOB_DATE_FORMAT),
      }) !==
      JSON.stringify({
        ...initial,
        expiresAt: initial.expiresAt?.format(JOB_DATE_FORMAT),
      }),
    [draft, initial],
  );

  const update = <K extends keyof Draft>(key: K, value: Draft[K]) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
    setSubmitError(null);
  };
  const clearError = (key: FieldKey) =>
    setErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev));

  const validateStep = (s: Step): Errors => {
    const e: Errors = {};
    if (s === 0 || s === REVIEW) {
      if (!draft.title.trim()) e.title = t("jobErrorTitleRequired");
      if (draft.categoryId == null) e.category = t("jobErrorCategoryRequired");
    }
    if (s === 1 || s === REVIEW) {
      if (!draft.experienceLevel)
        e.experience = t("jobErrorExperienceRequired");
      if (!draft.description.trim())
        e.description = t("jobErrorDescriptionRequired");
    }
    if (s === 2 || s === REVIEW) {
      if (payMin != null && payMin < 0) e.payMin = t("jobErrorPayNegative");
      if (payMax != null && payMax < 0) e.payMax = t("jobErrorPayNegative");
      if (payMin != null && payMax != null && payMax < payMin) {
        e.payMax = t("jobErrorPayRange");
      }
      if (!draft.useSalonAddress && !draft.location.trim()) {
        e.location = t("jobErrorLocationRequired");
      }
    }
    if (s === REVIEW) {
      // New posts need a date; an edit may leave a passed date alone
      if (!draft.expiresAt && !isEdit) e.expiresAt = t("jobErrorDateRequired");
      if (
        draft.expiresAt &&
        (draft.expiresAt.isBefore(dayjs(), "day") ||
          draft.expiresAt.isAfter(
            dayjs().add(JOB_MAX_DAYS_AHEAD, "day"),
            "day",
          ))
      ) {
        e.expiresAt = t("jobErrorDateRange");
      }
    }
    return e;
  };

  const firstStepWithError = (e: Errors): Step => {
    if (e.title || e.category) return 0;
    if (e.experience || e.description || e.licenseDetails) return 1;
    if (e.payMin || e.payMax || e.location || e.compensationNote) return 2;
    return REVIEW;
  };

  // ── Navigation between steps ────────────────────────────────────────
  const goTo = useCallback((next: Step, dir: 1 | -1) => {
    Keyboard.dismiss();
    setCategoryOpen(false);
    setDirection(dir);
    setStep(next);
  }, []);

  const goNext = () => {
    const e = validateStep(step);
    setErrors(e);
    if (Object.keys(e).length) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }
    if (fromReview) {
      setFromReview(isEdit);
      goTo(REVIEW, 1);
      return;
    }
    goTo(Math.min(step + 1, REVIEW) as Step, 1);
  };

  const editSection = (s: Step) => {
    setFromReview(true);
    goTo(s, -1);
  };

  const allowLeaveRef = useRef(false);

  /** One step back; false when there is nothing left to go back to. */
  const stepBack = useCallback((): boolean => {
    if (submitting) return true;
    if (step === REVIEW) {
      if (isEdit) return false;
      goTo(2, -1);
      return true;
    }
    if (fromReview) {
      setFromReview(isEdit);
      goTo(REVIEW, 1);
      return true;
    }
    if (step === 0) return false;
    goTo((step - 1) as Step, -1);
    return true;
  }, [fromReview, goTo, isEdit, step, submitting]);

  const confirmLeave = useCallback(
    (onLeave: () => void) => {
      if (!dirty) {
        onLeave();
        return;
      }
      Alert.alert(
        isEdit ? t("jobDiscardEditsTitle") : t("jobDiscardTitle"),
        isEdit ? t("flowDiscardEditsMessage") : t("jobDiscardMessage"),
        [
          { text: t("flowKeepEditing"), style: "cancel" },
          { text: t("flowDiscard"), style: "destructive", onPress: onLeave },
        ],
      );
    },
    [dirty, isEdit, t],
  );

  const leave = useCallback(() => {
    allowLeaveRef.current = true;
    router.back();
  }, [router]);

  const onHeaderBack = useCallback(() => {
    if (stepBack()) return;
    confirmLeave(leave);
  }, [confirmLeave, leave, stepBack]);

  // Swipe-back / Android back: step back first, then confirm unsaved changes.
  const guardRef = useRef({ stepBack, confirmLeave });
  guardRef.current = { stepBack, confirmLeave };
  useEffect(() => {
    const unsubscribe = navigation.addListener("beforeRemove", (event: any) => {
      if (allowLeaveRef.current) return;
      const type = event?.data?.action?.type;
      if (type !== "GO_BACK" && type !== "POP") return;
      event.preventDefault();
      if (guardRef.current.stepBack()) return;
      guardRef.current.confirmLeave(() => {
        allowLeaveRef.current = true;
        navigation.dispatch(event.data.action);
      });
    });
    return unsubscribe;
  }, [navigation]);

  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener("hardwareBackPress", () => {
        onHeaderBack();
        return true;
      });
      return () => sub.remove();
    }, [onHeaderBack]),
  );

  // ── Save ────────────────────────────────────────────────────────────
  const buildPayload = (): JobPostPayload => {
    const payload = payloadFromDraft(draft);
    const newDate = draft.expiresAt?.format(JOB_DATE_FORMAT);
    if (!isEdit) {
      if (newDate) payload.expires_at = newDate;
      return payload;
    }
    // Edit: PUT changes only the fields sent, so send only what the owner
    // changed. The server stores the salon address in `location`, so an
    // untouched location must not go back as a custom address; a passed
    // date must never be sent back either.
    const before = payloadFromDraft(initial);
    const changed: JobPostPayload = {};
    (Object.keys(payload) as (keyof JobPostPayload)[]).forEach((key) => {
      if (JSON.stringify(payload[key]) !== JSON.stringify(before[key])) {
        (changed as Record<string, unknown>)[key] = payload[key];
      }
    });
    if (newDate && newDate !== initial.expiresAt?.format(JOB_DATE_FORMAT)) {
      changed.expires_at = newDate;
    }
    return changed;
  };

  const submit = async () => {
    Keyboard.dismiss();
    if (submitting) return;
    const e = validateStep(REVIEW);
    if (Object.keys(e).length) {
      setErrors(e);
      const target = firstStepWithError(e);
      if (target !== REVIEW) {
        setFromReview(true);
        goTo(target, -1);
      }
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    allowLeaveRef.current = true;
    try {
      if (isEdit && editId) {
        const changes = buildPayload();
        // Nothing changed: nothing to send
        if (Object.keys(changes).length > 0) {
          await updateJobPost(editId, changes);
          showBanner(t("jobSavedTitle"), t("jobSavedBody"), "success");
        }
        router.back();
      } else {
        const post = await createJobPost(buildPayload());
        void Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Success,
        );
        showBanner(t("jobPostedTitle"), t("jobPostedBody"), "success", 3500);
        router.replace({
          pathname: DETAIL_PATH as any,
          params: { id: String(post.id) },
        });
      }
    } catch (err: any) {
      allowLeaveRef.current = false;
      if (err?.isNoInternet) return;
      const fieldErrors = getJobFieldErrors(err);
      const mapped: Errors = {};
      let target: Step | null = null;
      Object.entries(fieldErrors).forEach(([field, message]) => {
        const hit = SERVER_FIELDS[field];
        if (!hit) return;
        mapped[hit.key] = message;
        if (target == null || hit.step < target) target = hit.step;
      });
      if (Object.keys(mapped).length) {
        setErrors(mapped);
        if (target != null && target !== REVIEW) {
          setFromReview(true);
          goTo(target, -1);
        }
      }
      setSubmitError(getJobErrorMessage(err, t("jobSaveFailed")));
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setSubmitting(false);
    }
  };

  // ── Steps ───────────────────────────────────────────────────────────

  const renderRole = () => (
    <>
      <FlowTitle
        title={t("jobFlowRoleTitle")}
        subtitle={t("jobFlowRoleSubtitle")}
      />
      <View style={styles.section}>
        <FlowTextField
          label={t("jobTitleLabel")}
          required
          value={draft.title}
          onChangeText={(v) => {
            update("title", v);
            clearError("title");
          }}
          maxCount={120}
          autoCapitalize="words"
          placeholder={t("jobTitlePlaceholder")}
          error={errors.title}
        />
        {!draft.title.trim() ? (
          <View style={styles.ideas}>
            {TITLE_IDEAS.map((key) => (
              <TouchableOpacity
                key={key}
                style={styles.idea}
                activeOpacity={0.75}
                onPress={() => {
                  update("title", t(key));
                  clearError("title");
                }}
                accessibilityRole="button"
                accessibilityHint={t("jobTitleIdeaHint")}
              >
                <Text style={styles.ideaText}>{t(key)}</Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : null}
      </View>

      <View style={styles.section}>
        <SelectField
          label={t("jobCategory")}
          required
          value={draft.categoryName || null}
          placeholder={t("jobCategoryPlaceholder")}
          open={categoryOpen}
          loading={categoriesLoading}
          options={categories}
          selectedId={draft.categoryId}
          onToggle={() => {
            Keyboard.dismiss();
            setCategoryOpen((v) => !v);
            void loadCategories();
          }}
          onSelect={(option) => {
            setDraft((prev) => ({
              ...prev,
              categoryId: option.id,
              categoryName: option.name,
            }));
            clearError("category");
            setCategoryOpen(false);
          }}
          helper={t("jobCategoryHelper")}
        />
        {errors.category ? (
          <Text style={styles.fieldError}>{errors.category}</Text>
        ) : null}
      </View>

      <View style={styles.section}>
        <SectionLabel label={t("jobSchedule")} required />
        <View style={styles.tiles}>
          {(
            [
              ["full_time", "schedule", "jobScheduleFullTimeHint"],
              ["part_time", "timelapse", "jobSchedulePartTimeHint"],
            ] as const
          ).map(([value, icon, hint]) => {
            const on = draft.schedule === value;
            return (
              <TouchableOpacity
                key={value}
                style={[styles.tile, on && styles.tileOn]}
                onPress={() => update("schedule", value)}
                activeOpacity={0.85}
                accessibilityRole="radio"
                accessibilityState={{ checked: on }}
              >
                <View style={styles.tileHead}>
                  <MaterialIcons
                    name={icon}
                    size={moderateWidthScale(26)}
                    color={on ? theme.darkGreen : theme.buttonBack}
                  />
                  <MaterialIcons
                    name={
                      on ? "radio-button-checked" : "radio-button-unchecked"
                    }
                    size={moderateWidthScale(22)}
                    color={on ? theme.darkGreen : theme.lightGreen5}
                  />
                </View>
                <Text style={styles.tileTitle}>
                  {t(JOB_SCHEDULE_LABEL_KEYS[value])}
                </Text>
                <Text style={styles.tileSub}>{t(hint)}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <View style={styles.section}>
        <SectionLabel label={t("jobEmploymentType")} meta={t("optional")} />
        <View style={styles.chips}>
          {(
            [null, ...JOB_EMPLOYMENT_TYPES] as (JobEmploymentType | null)[]
          ).map((value) => {
            const on = draft.employmentType === value;
            return (
              <TouchableOpacity
                key={value ?? "none"}
                style={[styles.chip, on && styles.chipOn]}
                onPress={() => update("employmentType", value)}
                activeOpacity={0.8}
                accessibilityRole="radio"
                accessibilityState={{ checked: on }}
              >
                <Text style={[styles.chipText, on && styles.chipTextOn]}>
                  {value
                    ? t(JOB_EMPLOYMENT_LABEL_KEYS[value])
                    : t("jobNotSpecified")}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </>
  );

  const renderNeeds = () => (
    <>
      <FlowTitle
        title={t("jobFlowNeedsTitle")}
        subtitle={t("jobFlowNeedsSubtitle")}
      />
      <View style={styles.section}>
        <SectionLabel label={t("jobExperience")} required />
        <FlowCard
          style={[
            styles.radioList,
            !!errors.experience && styles.radioListError,
          ]}
        >
          {JOB_EXPERIENCE_LEVELS.map((level, index) => {
            const on = draft.experienceLevel === level;
            return (
              <TouchableOpacity
                key={level}
                style={[
                  styles.radioRow,
                  index > 0 && styles.radioRowBorder,
                  on && styles.radioRowOn,
                ]}
                onPress={() => {
                  update("experienceLevel", level);
                  clearError("experience");
                }}
                activeOpacity={0.8}
                accessibilityRole="radio"
                accessibilityState={{ checked: on }}
              >
                <MaterialIcons
                  name={on ? "radio-button-checked" : "radio-button-unchecked"}
                  size={moderateWidthScale(24)}
                  color={on ? theme.darkGreen : theme.lightGreen5}
                />
                <View style={styles.radioText}>
                  <Text style={styles.radioTitle}>
                    {t(JOB_EXPERIENCE_LABEL_KEYS[level])}
                  </Text>
                  <Text style={styles.radioSub}>
                    {t(EXPERIENCE_HINT_KEYS[level])}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </FlowCard>
        {errors.experience ? (
          <Text style={styles.fieldError}>{errors.experience}</Text>
        ) : null}
      </View>

      <View style={styles.section}>
        <ToggleRow
          title={t("jobLicenseRequiredToggle")}
          subtitle={t("jobLicenseRequiredToggleHint")}
          value={draft.licenseRequired}
          onValueChange={(v) => {
            update("licenseRequired", v);
            clearError("licenseDetails");
          }}
        />
        {draft.licenseRequired ? (
          <FlowTextField
            label={t("jobLicenseDetails")}
            value={draft.licenseDetails}
            onChangeText={(v) => {
              update("licenseDetails", v);
              clearError("licenseDetails");
            }}
            maxCount={255}
            placeholder={t("jobLicenseDetailsPlaceholder")}
            helper={t("optional")}
            error={errors.licenseDetails}
          />
        ) : null}
      </View>

      <FlowTextField
        label={t("jobDescription")}
        required
        value={draft.description}
        onChangeText={(v) => {
          update("description", v);
          clearError("description");
        }}
        multiline
        maxCount={5000}
        placeholder={t("jobDescriptionPlaceholder")}
        helper={t("jobDescriptionHelper")}
        error={errors.description}
      />
    </>
  );

  const renderPay = () => (
    <>
      <FlowTitle
        title={t("jobFlowPayTitle")}
        subtitle={t("jobFlowPaySubtitle")}
      />
      <View style={styles.section}>
        <View style={styles.row2}>
          <FlowTextField
            containerStyle={styles.half}
            label={t("jobPayMin")}
            prefix="$"
            value={draft.payMin}
            onChangeText={(v) => {
              update("payMin", cleanMoney(v));
              clearError("payMin");
              clearError("payMax");
            }}
            keyboardType="decimal-pad"
            placeholder="18"
            returnKeyType="next"
            onSubmitEditing={() => payMaxRef.current?.focus()}
            error={errors.payMin}
          />
          <FlowTextField
            ref={payMaxRef}
            containerStyle={styles.half}
            label={t("jobPayMax")}
            prefix="$"
            value={draft.payMax}
            onChangeText={(v) => {
              update("payMax", cleanMoney(v));
              clearError("payMax");
            }}
            keyboardType="decimal-pad"
            placeholder="25"
            error={errors.payMax}
          />
        </View>
        <SectionLabel label={t("jobPayPer")} />
        <View style={styles.chips}>
          {JOB_PAY_PERIODS.map((period) => {
            const on = draft.payPeriod === period;
            return (
              <TouchableOpacity
                key={period}
                style={[styles.chip, on && styles.chipOn]}
                onPress={() => update("payPeriod", period)}
                activeOpacity={0.8}
                accessibilityRole="radio"
                accessibilityState={{ checked: on }}
              >
                <Text
                  style={[
                    styles.chipText,
                    styles.capitalize,
                    on && styles.chipTextOn,
                  ]}
                >
                  {t(JOB_PAY_PERIOD_LABEL_KEYS[period])}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <View style={styles.preview} accessibilityLiveRegion="polite">
          <MaterialIcons
            name="payments"
            size={moderateWidthScale(22)}
            color={theme.selectCard}
          />
          <View style={styles.previewText}>
            <Text style={styles.previewLabel}>{t("jobPayShowsAs")}</Text>
            <Text style={styles.previewValue}>
              {payPreview ?? t("jobPayNotListed")}
            </Text>
          </View>
        </View>
      </View>

      <FlowTextField
        label={t("jobCompensationNote")}
        value={draft.compensationNote}
        onChangeText={(v) => {
          update("compensationNote", v);
          clearError("compensationNote");
        }}
        maxCount={255}
        placeholder={t("jobCompensationPlaceholder")}
        helper={t("optional")}
        error={errors.compensationNote}
      />

      <View style={styles.section}>
        <ToggleRow
          title={t("jobUseSalonAddress")}
          subtitle={t("jobUseSalonAddressHint")}
          value={draft.useSalonAddress}
          onValueChange={(v) => {
            update("useSalonAddress", v);
            clearError("location");
          }}
        />
        {!draft.useSalonAddress ? (
          <FlowTextField
            label={t("jobLocation")}
            required
            value={draft.location}
            onChangeText={(v) => {
              update("location", v);
              clearError("location");
            }}
            maxCount={255}
            placeholder={t("jobLocationPlaceholder")}
            error={errors.location}
          />
        ) : null}
      </View>
    </>
  );

  const reviewRow = (label: string, value: string, target: Step, lines = 3) => (
    <View key={label} style={styles.reviewRow}>
      <View style={styles.reviewRowText}>
        <Text style={styles.reviewLabel}>{label}</Text>
        <Text style={styles.reviewValue} numberOfLines={lines}>
          {value}
        </Text>
      </View>
      <TouchableOpacity
        style={styles.reviewEdit}
        onPress={() => editSection(target)}
        hitSlop={6}
        disabled={submitting}
        accessibilityRole="button"
        accessibilityLabel={`${t("edit")} ${label}`}
      >
        <Text style={styles.reviewEditText}>{t("edit")}</Text>
      </TouchableOpacity>
    </View>
  );

  const renderReview = () => {
    const typeLine = [
      t(JOB_SCHEDULE_LABEL_KEYS[draft.schedule]),
      draft.employmentType
        ? t(JOB_EMPLOYMENT_LABEL_KEYS[draft.employmentType])
        : null,
    ]
      .filter(Boolean)
      .join(" · ");
    const needsLine = [
      draft.experienceLevel
        ? t(JOB_EXPERIENCE_LABEL_KEYS[draft.experienceLevel])
        : null,
      draft.licenseRequired
        ? draft.licenseDetails.trim()
          ? t("jobLicenseRequiredWith", {
              details: draft.licenseDetails.trim(),
            })
          : t("jobLicenseRequired")
        : t("jobNoLicenseNeeded"),
    ]
      .filter(Boolean)
      .join("\n");
    const payLine = [
      payPreview ?? t("jobPayNotListed"),
      draft.compensationNote.trim() || null,
    ]
      .filter(Boolean)
      .join("\n");
    const expiredBefore =
      isEdit && original?.expiresAt && isJobDatePast(original.expiresAt);
    return (
      <>
        <FlowTitle
          title={isEdit ? t("jobEditTitle") : t("jobFlowReviewTitle")}
          subtitle={
            isEdit ? t("jobFlowReviewSubtitleEdit") : t("jobFlowReviewSubtitle")
          }
        />
        <FlowCard style={styles.reviewCard}>
          <TouchableOpacity
            style={styles.reviewHero}
            activeOpacity={0.85}
            onPress={() => editSection(0)}
            disabled={submitting}
            accessibilityRole="button"
            accessibilityHint={t("edit")}
          >
            <View style={styles.reviewHeroIcon}>
              <MaterialIcons
                name="work-outline"
                size={moderateWidthScale(26)}
                color={theme.successGreen}
              />
            </View>
            <View style={styles.reviewHeroText}>
              <Text style={styles.reviewName} numberOfLines={2}>
                {draft.title.trim() || t("jobUntitled")}
              </Text>
              <Text style={styles.reviewMeta} numberOfLines={1}>
                {[draft.categoryName, typeLine].filter(Boolean).join(" · ")}
              </Text>
            </View>
            <MaterialIcons
              name="edit"
              size={moderateWidthScale(20)}
              color={theme.lightGreen}
            />
          </TouchableOpacity>
          {reviewRow(t("jobReviewNeeds"), needsLine, 1)}
          {reviewRow(
            t("jobDescription"),
            draft.description.trim() || t("jobNoDescription"),
            1,
            4,
          )}
          {reviewRow(t("jobPay"), payLine, 2)}
          {reviewRow(
            t("jobLocation"),
            draft.useSalonAddress
              ? t("jobAtSalonAddress")
              : draft.location.trim() || t("jobAtSalonAddress"),
            2,
          )}
        </FlowCard>

        <View style={styles.section}>
          <SectionLabel
            label={t("jobClosingDate")}
            required={!isEdit}
            meta={
              expiredBefore
                ? t("jobExpiredOn", {
                    date: formatJobDate(original?.expiresAt),
                  })
                : null
            }
          />
          {expiredBefore && !draft.expiresAt ? (
            <InfoNote
              tone="warm"
              icon="schedule"
              text={t("jobEditExpiredNote")}
            />
          ) : null}
          <ClosingDatePicker
            value={draft.expiresAt}
            onChange={(date) => {
              update("expiresAt", date);
              clearError("expiresAt");
            }}
          />
          {errors.expiresAt ? (
            <Text style={styles.fieldError}>{errors.expiresAt}</Text>
          ) : null}
        </View>

        {!isEdit ? (
          <InfoNote
            icon="campaign"
            title={t("jobGoesLiveTitle")}
            text={t("jobGoesLiveBody")}
          />
        ) : null}

        {submitError ? (
          <InfoNote tone="error" icon="error-outline" text={submitError} />
        ) : null}
      </>
    );
  };

  // ── Screen ──────────────────────────────────────────────────────────

  if (loading || loadError || (isEdit && original?.status === "removed")) {
    return (
      <View style={styles.root}>
        <StackHeader title={t("jobEditTitle")} />
        {loading ? (
          <View style={styles.loader}>
            <ActivityIndicator size="large" color={theme.darkGreen} />
          </View>
        ) : (
          <EmptyState
            icon={loadError ? "error-outline" : "block"}
            title={loadError ? t("jobPostsLoadFailed") : t("jobRemovedTitle")}
            subtitle={loadError ?? t("jobRemovedCantEdit")}
            actionTitle={t("goBack")}
            onActionPress={() => router.back()}
          />
        )}
      </View>
    );
  }

  const nextLabel =
    fromReview && step !== REVIEW
      ? t("productFlowBackToReview")
      : step === 0
        ? t("jobFlowNextNeeds")
        : step === 1
          ? t("jobFlowNextPay")
          : t("jobFlowNextReview");

  type FooterAction = React.ComponentProps<typeof FlowFooter>["primary"];
  const footerPrimary: FooterAction =
    step === REVIEW
      ? {
          label: isEdit ? t("saveChanges") : t("jobPostJob"),
          icon: isEdit ? "check" : "campaign",
          onPress: () => void submit(),
          loading: submitting,
          disabled: submitting,
        }
      : {
          label: nextLabel,
          icon: fromReview ? "check" : undefined,
          trailingIcon: fromReview ? undefined : "chevron-right",
          onPress: goNext,
        };

  const Entering = direction === 1 ? FadeInRight : FadeInLeft;

  return (
    <View style={styles.root}>
      <FlowHeader
        title={isEdit ? t("jobEditTitle") : t("jobPostAJob")}
        step={{ current: step + 1, total: TOTAL_STEPS }}
        onBack={onHeaderBack}
        backDisabled={submitting}
        backIcon={step === 0 || (isEdit && step === REVIEW) ? "close" : "back"}
      />
      <KeyboardAwareScrollView
        key={step}
        style={styles.flex}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        showsVerticalScrollIndicator={false}
        bottomOffset={moderateHeightScale(32)}
      >
        <Animated.View
          style={styles.stepBody}
          entering={Entering.duration(240).reduceMotion(ReduceMotion.System)}
        >
          {step === 0
            ? renderRole()
            : step === 1
              ? renderNeeds()
              : step === 2
                ? renderPay()
                : renderReview()}
        </Animated.View>
      </KeyboardAwareScrollView>

      {/* Plain View: the button stays behind the keyboard (app keyboard rule) */}
      <View>
        <FlowFooter primary={footerPrimary} />
      </View>
    </View>
  );
}
