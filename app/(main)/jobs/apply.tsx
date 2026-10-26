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
  Keyboard,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import * as DocumentPicker from "expo-document-picker";
import * as Haptics from "expo-haptics";
import Animated, { FadeIn, ReduceMotion } from "react-native-reanimated";
import { useAppSelector, useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  heightScale,
  moderateHeightScale,
  moderateWidthScale,
  widthScale,
} from "@/src/theme/dimensions";
import StackHeader from "@/src/components/StackHeader";
import EmptyState from "@/src/components/emptyState";
import AppImage from "@/src/components/AppImage";
import FlowFooter from "@/src/components/reelFlow/flowFooter";
import FlowButton from "@/src/components/reelFlow/flowButton";
import { resetToDashboardHome } from "@/src/utils/navigation";
import {
  FlowCard,
  InfoNote,
  SectionLabel,
} from "@/src/components/reelFlow/flowParts";
import { FlowTextField } from "@/src/components/reelFlow/detailsFields";
import { useNotificationContext } from "@/src/contexts/NotificationContext";
import { useJobApplyAccess } from "@/src/hooks/useJobApplyAccess";
import {
  applyToJobPost,
  fetchJobPost,
  peekJobPost,
} from "@/src/services/jobService";
import type { JobApplyForm, JobPost, JobResumeFile } from "@/src/types/jobs";
import {
  formatJobPay,
  getJobApplyBlock,
  getJobErrorMessage,
  getJobErrorStatus,
  getJobFieldErrors,
  jobChatParams,
} from "@/src/utils/jobHelpers";

/**
 * Apply for a position: contact details (prefilled from the profile),
 * experience, license, optional portfolio / resume / note. The server sends
 * it to the owner as the first chat message, so success offers "Open chat".
 */

type FieldKey =
  | "fullName"
  | "phone"
  | "email"
  | "yearsExperience"
  | "licenseNumber"
  | "portfolioUrl"
  | "message"
  | "resume";
type Errors = Partial<Record<FieldKey, string>>;

/** Server field → form field */
const SERVER_FIELDS: Record<string, FieldKey> = {
  full_name: "fullName",
  phone: "phone",
  email: "email",
  years_experience: "yearsExperience",
  has_license: "licenseNumber",
  license_number: "licenseNumber",
  portfolio_url: "portfolioUrl",
  message: "message",
  resume: "resume",
};

const MAX_RESUME_BYTES = 10 * 1024 * 1024;
const MAX_YEARS = 60;
const RESUME_TYPES: Record<string, string> = {
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
};
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const URL_RE = /^https?:\/\/[^\s.]+\.[^\s]{2,}/i;

/** Dial code + number, when the profile keeps them apart. */
function profilePhone(
  phone: string | null,
  countryCode: string | null,
): string {
  const raw = (phone ?? "").trim();
  if (!raw || raw.startsWith("+")) return raw;
  const code = (countryCode ?? "").trim();
  if (code.startsWith("+")) return `${code}${raw}`;
  if (/^\d{1,4}$/.test(code)) return `+${code}${raw}`;
  return raw;
}

/** "instagram.com/me" → "https://instagram.com/me" (the server wants a full URL). */
function normalizeUrl(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

function formatBytes(bytes: number | null): string {
  if (bytes == null) return "";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background },
    flex: { flex: 1 },
    loader: { flex: 1, alignItems: "center", justifyContent: "center" },
    content: {
      paddingHorizontal: moderateWidthScale(20),
      paddingTop: moderateHeightScale(16),
      paddingBottom: moderateHeightScale(28),
      gap: moderateHeightScale(22),
    },
    group: { gap: moderateHeightScale(14) },
    jobCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(12),
      padding: moderateWidthScale(14),
    },
    jobLogo: {
      width: widthScale(52),
      height: widthScale(52),
      borderRadius: moderateWidthScale(14),
      backgroundColor: theme.emptyProfileImage,
      overflow: "hidden",
    },
    jobText: { flex: 1, minWidth: 0, gap: moderateHeightScale(2) },
    jobLabel: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontMedium,
      color: theme.lightGreen,
      textTransform: "uppercase",
      letterSpacing: 0.6,
    },
    jobTitle: {
      fontSize: fontSize.size17,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    jobMeta: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
    },
    // ── Years stepper
    stepper: {
      flexDirection: "row",
      alignItems: "center",
      minHeight: heightScale(56),
      borderRadius: moderateWidthScale(16),
      borderWidth: 1.5,
      borderColor: theme.borderNormal,
      backgroundColor: theme.white,
      overflow: "hidden",
    },
    stepperError: { borderColor: theme.red },
    stepperBtn: {
      width: widthScale(60),
      alignSelf: "stretch",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.lightGreen07,
    },
    stepperMid: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: moderateWidthScale(6),
    },
    stepperInput: {
      minWidth: widthScale(40),
      textAlign: "center",
      fontSize: fontSize.size22,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      paddingVertical: moderateHeightScale(10),
      fontVariant: ["tabular-nums"],
    },
    stepperUnit: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontMedium,
      color: theme.lightGreen,
    },
    fieldError: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontMedium,
      color: theme.red,
    },
    // ── Yes / No
    question: {
      fontSize: fontSize.size17,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    choiceRow: {
      flexDirection: "row",
      gap: moderateWidthScale(12),
    },
    choice: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: moderateWidthScale(8),
      minHeight: heightScale(54),
      borderRadius: moderateWidthScale(16),
      borderWidth: 1.5,
      borderColor: theme.borderNormal,
      backgroundColor: theme.white,
    },
    choiceOn: {
      borderColor: theme.darkGreen,
      backgroundColor: theme.tileMint,
    },
    choiceText: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
    },
    choiceTextOn: { fontFamily: fonts.fontBold },
    // ── Resume
    resumePick: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(14),
      minHeight: heightScale(72),
      paddingHorizontal: moderateWidthScale(16),
      paddingVertical: moderateHeightScale(14),
      borderRadius: moderateWidthScale(18),
      borderWidth: 1.5,
      borderStyle: "dashed",
      borderColor: theme.borderMedium,
      backgroundColor: theme.white,
    },
    resumePickError: { borderColor: theme.red },
    resumeFile: {
      borderStyle: "solid",
      borderColor: theme.borderNormal,
    },
    resumeIcon: {
      width: widthScale(44),
      height: widthScale(44),
      borderRadius: moderateWidthScale(12),
      backgroundColor: theme.tileMint,
      alignItems: "center",
      justifyContent: "center",
    },
    resumeText: { flex: 1, minWidth: 0, gap: moderateHeightScale(2) },
    resumeTitle: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    resumeSub: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
    },
    resumeRemove: {
      width: widthScale(44),
      height: widthScale(44),
      borderRadius: widthScale(22),
      backgroundColor: theme.lightGreen07,
      alignItems: "center",
      justifyContent: "center",
    },
    // ── Sent
    sentScroll: { flexGrow: 1 },
    sent: {
      flexGrow: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: moderateWidthScale(28),
      paddingVertical: moderateHeightScale(32),
      gap: moderateHeightScale(14),
    },
    sentHalo: {
      width: widthScale(120),
      height: widthScale(120),
      borderRadius: widthScale(60),
      backgroundColor: theme.tileMint,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: moderateHeightScale(8),
    },
    sentCircle: {
      width: widthScale(78),
      height: widthScale(78),
      borderRadius: widthScale(39),
      backgroundColor: theme.successGreen,
      alignItems: "center",
      justifyContent: "center",
    },
    sentTitle: {
      fontSize: fontSize.size26,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      textAlign: "center",
    },
    sentBody: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      textAlign: "center",
      lineHeight: fontSize.size24,
      maxWidth: widthScale(320),
    },
    sentCard: {
      alignSelf: "stretch",
      marginTop: moderateHeightScale(8),
    },
    sentButtons: {
      alignSelf: "stretch",
      gap: moderateHeightScale(10),
      marginTop: moderateHeightScale(12),
    },
  });

export default function JobApplyScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { showBanner } = useNotificationContext();
  const params = useLocalSearchParams<{ id?: string }>();
  const jobId = params.id ?? "";
  const user = useAppSelector((state) => state.user);

  const [post, setPost] = useState<JobPost | null>(() =>
    jobId ? peekJobPost(jobId) : null,
  );
  const [loading, setLoading] = useState(!post);
  const [closed, setClosed] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [form, setForm] = useState<JobApplyForm>(() => ({
    fullName: user.name ?? "",
    phone: profilePhone(user.phone, user.country_code),
    email: user.email ?? "",
    yearsExperience: 0,
    hasLicense: false,
    licenseNumber: "",
    portfolioUrl: "",
    message: "",
    resume: null,
  }));
  // Years stay as text while typing (an empty field must survive)
  const [yearsText, setYearsText] = useState("0");
  const [errors, setErrors] = useState<Errors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [sent, setSent] = useState(false);

  const phoneRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);

  const { access, canSwitch, switchToCustomerMode } = useJobApplyAccess(post);

  useEffect(() => {
    if (!jobId) {
      setClosed(true);
      setLoading(false);
      return;
    }
    let cancelled = false;
    fetchJobPost(jobId)
      .then((next) => {
        if (!cancelled) setPost(next);
      })
      .catch((err) => {
        if (cancelled) return;
        if (getJobErrorStatus(err) === 404) setClosed(true);
        else setLoadError(getJobErrorMessage(err, t("somethingWentWrong")));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [jobId, t]);

  const businessName = post?.business?.title || t("jobThisBusiness");
  const ownerId = post?.business?.ownerId ?? null;

  const update = <K extends keyof JobApplyForm>(
    key: K,
    value: JobApplyForm[K],
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setSubmitError(null);
  };
  const clearError = (key: FieldKey) =>
    setErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev));

  const years = parseInt(yearsText || "0", 10) || 0;
  const bumpYears = (delta: number) => {
    void Haptics.selectionAsync();
    setYearsText(String(Math.min(MAX_YEARS, Math.max(0, years + delta))));
    clearError("yearsExperience");
  };

  const pickResume = async () => {
    Keyboard.dismiss();
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: Array.from(new Set(Object.values(RESUME_TYPES))),
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];
      const ext = (asset.name?.split(".").pop() ?? "").toLowerCase();
      const mimeType = RESUME_TYPES[ext] ?? asset.mimeType ?? "";
      if (!Object.values(RESUME_TYPES).includes(mimeType)) {
        setErrors((prev) => ({ ...prev, resume: t("jobResumeWrongType") }));
        return;
      }
      if (asset.size != null && asset.size > MAX_RESUME_BYTES) {
        setErrors((prev) => ({ ...prev, resume: t("jobResumeTooLarge") }));
        return;
      }
      const file: JobResumeFile = {
        uri: asset.uri,
        name: asset.name || `resume.${ext || "pdf"}`,
        mimeType,
        size: asset.size ?? null,
      };
      update("resume", file);
      clearError("resume");
    } catch {
      showBanner(t("error"), t("jobResumePickFailed"), "error");
    }
  };

  const validate = (): Errors => {
    const e: Errors = {};
    if (!form.fullName.trim()) e.fullName = t("jobErrorNameRequired");
    if (!form.phone.trim()) e.phone = t("jobErrorPhoneRequired");
    if (!form.email.trim()) e.email = t("jobErrorEmailRequired");
    else if (!EMAIL_RE.test(form.email.trim()))
      e.email = t("jobErrorEmailInvalid");
    if (years < 0 || years > MAX_YEARS) e.yearsExperience = t("jobErrorYears");
    const url = normalizeUrl(form.portfolioUrl);
    if (url && !URL_RE.test(url)) e.portfolioUrl = t("jobErrorPortfolio");
    return e;
  };

  const openChat = useCallback(() => {
    if (!ownerId) return;
    // Replace the form so Back from the chat lands on the job (now "Applied")
    router.replace({
      pathname: "/(main)/chatBox",
      params: jobChatParams({
        id: ownerId,
        name: businessName,
        image: post?.business?.logoUrl,
      }),
    });
  }, [businessName, ownerId, post?.business?.logoUrl, router]);

  const handleBlock = (message: string) => {
    const block = getJobApplyBlock(message);
    if (block === "already_applied") {
      Alert.alert(t("jobAppliedTitle"), message, [
        { text: t("ok"), onPress: () => router.back() },
      ]);
      return true;
    }
    if (block === "business_mode") {
      Alert.alert(t("jobSwitchTitle"), message, [
        { text: t("cancel"), style: "cancel" },
        ...(canSwitch
          ? [
              {
                text: t("jobSwitchAction"),
                onPress: () => void switchToCustomerMode(),
              },
            ]
          : []),
      ]);
      return true;
    }
    if (block === "own_business") {
      Alert.alert(t("jobOwnBusinessTitle"), message, [
        { text: t("ok"), onPress: () => router.back() },
      ]);
      return true;
    }
    return false;
  };

  const submit = async () => {
    Keyboard.dismiss();
    if (submitting || !post) return;
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length) {
      setSubmitError(t("jobFixErrors"));
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    setProgress(form.resume ? 0 : null);
    try {
      await applyToJobPost(
        post.id,
        {
          ...form,
          yearsExperience: years,
          portfolioUrl: normalizeUrl(form.portfolioUrl),
        },
        form.resume ? setProgress : undefined,
      );
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setSent(true);
    } catch (err: any) {
      if (err?.isNoInternet) return;
      const status = getJobErrorStatus(err);
      if (status === 404) {
        setClosed(true);
        return;
      }
      if (status === 429) {
        setSubmitError(t("jobTooManyTries"));
        return;
      }
      const fieldErrors = getJobFieldErrors(err);
      if (fieldErrors.job_post && handleBlock(fieldErrors.job_post)) return;
      const mapped: Errors = {};
      Object.entries(fieldErrors).forEach(([field, message]) => {
        const key = SERVER_FIELDS[field];
        if (key) mapped[key] = message;
      });
      if (Object.keys(mapped).length) {
        setErrors(mapped);
        setSubmitError(t("jobFixErrors"));
      } else {
        setSubmitError(getJobErrorMessage(err, t("jobApplyFailed")));
      }
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setSubmitting(false);
      setProgress(null);
    }
  };

  // ── States ──────────────────────────────────────────────────────────

  if (loading) {
    return (
      <View style={styles.container}>
        <StackHeader title={t("jobApplyTitle")} />
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={theme.darkGreen} />
        </View>
      </View>
    );
  }

  if (closed || !post) {
    return (
      <View style={styles.container}>
        <StackHeader title={t("jobApplyTitle")} />
        {closed ? (
          <EmptyState
            icon="work-off"
            title={t("jobNoLongerOpenTitle")}
            subtitle={t("jobNoLongerOpenSubtitle")}
            actionTitle={t("goBack")}
            onActionPress={() => router.back()}
          />
        ) : (
          <EmptyState
            icon="error-outline"
            title={t("jobLoadFailed")}
            subtitle={loadError ?? undefined}
            actionTitle={t("goBack")}
            onActionPress={() => router.back()}
          />
        )}
      </View>
    );
  }

  const jobSummary = (
    <FlowCard style={styles.jobCard}>
      <AppImage
        uri={post.business?.logoUrl}
        style={styles.jobLogo}
        resizeMode="cover"
        iconSize={moderateWidthScale(20)}
      />
      <View style={styles.jobText}>
        <Text style={styles.jobLabel}>{t("jobApplyingFor")}</Text>
        <Text style={styles.jobTitle} numberOfLines={2}>
          {post.title}
        </Text>
        <Text style={styles.jobMeta} numberOfLines={1}>
          {[businessName, formatJobPay(post, t)].filter(Boolean).join(" · ")}
        </Text>
      </View>
    </FlowCard>
  );

  if (sent) {
    return (
      <View style={styles.container}>
        <StackHeader title={t("jobApplyTitle")} />
        <ScrollView contentContainerStyle={styles.sentScroll}>
          <Animated.View
            style={styles.sent}
            entering={FadeIn.duration(260).reduceMotion(ReduceMotion.System)}
          >
            <View style={styles.sentHalo}>
              <View style={styles.sentCircle}>
                <MaterialIcons
                  name="check"
                  size={moderateWidthScale(44)}
                  color={theme.white}
                />
              </View>
            </View>
            <Text
              style={styles.sentTitle}
              accessibilityRole="header"
              accessibilityLiveRegion="polite"
            >
              {t("jobSentTitle")}
            </Text>
            <Text style={styles.sentBody}>
              {t("jobSentBody", { name: businessName })}
            </Text>
            <View style={styles.sentCard}>{jobSummary}</View>
            <View style={styles.sentButtons}>
              {ownerId ? (
                <FlowButton
                  label={t("jobOpenChat")}
                  icon="chat-bubble-outline"
                  onPress={openChat}
                />
              ) : null}
              <FlowButton
                label={t("done")}
                variant="outline"
                onPress={() => router.back()}
              />
              <FlowButton
                label={t("goToHome")}
                variant="light"
                icon="home"
                onPress={resetToDashboardHome}
              />
            </View>
          </Animated.View>
        </ScrollView>
      </View>
    );
  }

  // Signed out / own business / business mode / already applied: the job
  // screen explains it; here just say why and offer the way back.
  if (access !== "can_apply") {
    return (
      <View style={styles.container}>
        <StackHeader title={t("jobApplyTitle")} />
        <EmptyState
          icon={access === "applied" ? "check-circle-outline" : "info-outline"}
          title={
            access === "applied"
              ? t("jobAppliedTitle")
              : access === "own_business"
                ? t("jobOwnBusinessTitle")
                : access === "business_mode"
                  ? t("jobSwitchTitle")
                  : t("jobSignInToApply")
          }
          subtitle={
            access === "applied"
              ? t("jobAppliedBody", { name: businessName })
              : access === "own_business"
                ? t("jobOwnBusinessBody")
                : access === "business_mode"
                  ? t("jobSwitchHint")
                  : t("jobSignInHint")
          }
          actionTitle={t("goBack")}
          onActionPress={() => router.back()}
        />
      </View>
    );
  }

  const licenseOptions: { value: boolean; label: string }[] = [
    { value: true, label: t("yes") },
    { value: false, label: t("no") },
  ];

  return (
    <View style={styles.container}>
      <StackHeader title={t("jobApplyTitle")} />
      <KeyboardAwareScrollView
        style={styles.flex}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        showsVerticalScrollIndicator={false}
        bottomOffset={moderateHeightScale(32)}
      >
        {jobSummary}

        {/* Contact */}
        <View style={styles.group}>
          <SectionLabel
            label={t("jobYourDetails")}
            meta={t("jobFromProfile")}
          />
          <FlowTextField
            label={t("jobFullName")}
            required
            value={form.fullName}
            onChangeText={(v) => {
              update("fullName", v);
              clearError("fullName");
            }}
            maxLength={120}
            autoCapitalize="words"
            autoComplete="name"
            textContentType="name"
            returnKeyType="next"
            onSubmitEditing={() => phoneRef.current?.focus()}
            error={errors.fullName}
            editable={!submitting}
          />
          <FlowTextField
            ref={phoneRef}
            label={t("jobPhone")}
            required
            value={form.phone}
            onChangeText={(v) => {
              update("phone", v);
              clearError("phone");
            }}
            maxLength={30}
            keyboardType="phone-pad"
            autoComplete="tel"
            textContentType="telephoneNumber"
            placeholder="+1 512 555 0123"
            error={errors.phone}
            editable={!submitting}
          />
          <FlowTextField
            ref={emailRef}
            label={t("jobEmail")}
            required
            value={form.email}
            onChangeText={(v) => {
              update("email", v);
              clearError("email");
            }}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            textContentType="emailAddress"
            error={errors.email}
            editable={!submitting}
          />
        </View>

        {/* Experience + license */}
        <View style={styles.group}>
          <SectionLabel label={t("jobExperience")} required />
          <View
            style={[
              styles.stepper,
              !!errors.yearsExperience && styles.stepperError,
            ]}
          >
            <TouchableOpacity
              style={styles.stepperBtn}
              onPress={() => bumpYears(-1)}
              disabled={years <= 0 || submitting}
              accessibilityRole="button"
              accessibilityLabel={t("jobYearsLess")}
            >
              <MaterialIcons
                name="remove"
                size={moderateWidthScale(26)}
                color={years <= 0 ? theme.lightGreen5 : theme.darkGreen}
              />
            </TouchableOpacity>
            <View style={styles.stepperMid}>
              <TextInput
                style={styles.stepperInput}
                value={yearsText}
                onChangeText={(v) => {
                  const digits = v.replace(/\D/g, "").slice(0, 2);
                  setYearsText(digits);
                  clearError("yearsExperience");
                }}
                onBlur={() => {
                  if (!yearsText) setYearsText("0");
                  else if (years > MAX_YEARS) setYearsText(String(MAX_YEARS));
                }}
                keyboardType="number-pad"
                selectTextOnFocus
                editable={!submitting}
                accessibilityLabel={t("jobYearsA11y")}
              />
              <Text style={styles.stepperUnit}>
                {t("jobYearsUnit", { count: years })}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.stepperBtn}
              onPress={() => bumpYears(1)}
              disabled={years >= MAX_YEARS || submitting}
              accessibilityRole="button"
              accessibilityLabel={t("jobYearsMore")}
            >
              <MaterialIcons
                name="add"
                size={moderateWidthScale(26)}
                color={years >= MAX_YEARS ? theme.lightGreen5 : theme.darkGreen}
              />
            </TouchableOpacity>
          </View>
          {errors.yearsExperience ? (
            <Text style={styles.fieldError}>{errors.yearsExperience}</Text>
          ) : null}
        </View>

        <View style={styles.group}>
          {post.licenseRequired ? (
            <InfoNote
              tone="warm"
              icon="verified"
              title={t("jobLicenseRequired")}
              text={post.licenseDetails || t("jobLicenseRequiredNote")}
            />
          ) : null}
          <Text style={styles.question}>
            {t("jobHaveLicense")}
            <Text style={{ color: theme.selectCard }}> *</Text>
          </Text>
          <View style={styles.choiceRow} accessibilityRole="radiogroup">
            {licenseOptions.map((option) => {
              const on = form.hasLicense === option.value;
              return (
                <TouchableOpacity
                  key={option.label}
                  style={[styles.choice, on && styles.choiceOn]}
                  onPress={() => {
                    update("hasLicense", option.value);
                    clearError("licenseNumber");
                  }}
                  disabled={submitting}
                  activeOpacity={0.8}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: on }}
                >
                  <MaterialIcons
                    name={
                      on ? "radio-button-checked" : "radio-button-unchecked"
                    }
                    size={moderateWidthScale(22)}
                    color={on ? theme.darkGreen : theme.lightGreen5}
                  />
                  <Text style={[styles.choiceText, on && styles.choiceTextOn]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          {form.hasLicense ? (
            <FlowTextField
              label={t("jobLicenseNumber")}
              value={form.licenseNumber}
              onChangeText={(v) => {
                update("licenseNumber", v);
                clearError("licenseNumber");
              }}
              maxLength={100}
              autoCapitalize="characters"
              autoCorrect={false}
              placeholder="TX-998"
              helper={t("optional")}
              error={errors.licenseNumber}
              editable={!submitting}
            />
          ) : null}
        </View>

        {/* Optional extras */}
        <View style={styles.group}>
          <SectionLabel label={t("jobShowYourWork")} meta={t("optional")} />
          <FlowTextField
            label={t("jobPortfolio")}
            value={form.portfolioUrl}
            onChangeText={(v) => {
              update("portfolioUrl", v);
              clearError("portfolioUrl");
            }}
            keyboardType="url"
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="instagram.com/yourwork"
            helper={t("jobPortfolioHelper")}
            error={errors.portfolioUrl}
            editable={!submitting}
          />

          {form.resume ? (
            <View style={[styles.resumePick, styles.resumeFile]}>
              <View style={styles.resumeIcon}>
                <MaterialIcons
                  name={
                    form.resume.mimeType.startsWith("image/")
                      ? "image"
                      : "description"
                  }
                  size={moderateWidthScale(24)}
                  color={theme.successGreen}
                />
              </View>
              <View style={styles.resumeText}>
                <Text style={styles.resumeTitle} numberOfLines={1}>
                  {form.resume.name}
                </Text>
                <Text style={styles.resumeSub}>
                  {[formatBytes(form.resume.size), t("jobResumeAttached")]
                    .filter(Boolean)
                    .join(" · ")}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.resumeRemove}
                onPress={() => update("resume", null)}
                disabled={submitting}
                accessibilityRole="button"
                accessibilityLabel={t("jobResumeRemove")}
              >
                <MaterialIcons
                  name="close"
                  size={moderateWidthScale(22)}
                  color={theme.darkGreen}
                />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={[
                styles.resumePick,
                !!errors.resume && styles.resumePickError,
              ]}
              onPress={() => void pickResume()}
              disabled={submitting}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel={t("jobResumeAdd")}
              accessibilityHint={t("jobResumeTypes")}
            >
              <View style={styles.resumeIcon}>
                <MaterialIcons
                  name="upload-file"
                  size={moderateWidthScale(24)}
                  color={theme.successGreen}
                />
              </View>
              <View style={styles.resumeText}>
                <Text style={styles.resumeTitle}>{t("jobResumeAdd")}</Text>
                <Text style={styles.resumeSub}>{t("jobResumeTypes")}</Text>
              </View>
              <MaterialIcons
                name="add"
                size={moderateWidthScale(24)}
                color={theme.darkGreen}
              />
            </TouchableOpacity>
          )}
          {errors.resume ? (
            <Text style={styles.fieldError}>{errors.resume}</Text>
          ) : null}

          <FlowTextField
            label={t("jobNoteTo", { name: businessName })}
            value={form.message}
            onChangeText={(v) => {
              update("message", v);
              clearError("message");
            }}
            multiline
            maxCount={2000}
            placeholder={t("jobNotePlaceholder")}
            error={errors.message}
            editable={!submitting}
          />
        </View>

        {submitError ? (
          <InfoNote tone="error" icon="error-outline" text={submitError} />
        ) : null}
      </KeyboardAwareScrollView>

      {/* Plain View: the button stays behind the keyboard (app keyboard rule) */}
      <View>
        <FlowFooter
          primary={{
            label: t("jobSendApplication"),
            icon: "send",
            onPress: () => void submit(),
            loading: submitting,
            disabled: submitting,
          }}
          progress={
            progress != null
              ? {
                  label: t("jobUploadingResume", { percent: progress }),
                  percent: progress,
                }
              : null
          }
          hint={t("jobSendHint", { name: businessName })}
        />
      </View>
    </View>
  );
}
