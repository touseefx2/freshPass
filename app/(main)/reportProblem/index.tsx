import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  Keyboard,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import * as Haptics from "expo-haptics";
import Animated, { FadeIn, ReduceMotion } from "react-native-reanimated";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  heightScale,
  moderateHeightScale,
  moderateWidthScale,
  widthScale,
} from "@/src/theme/dimensions";
import StackHeader from "@/src/components/StackHeader";
import AppImage from "@/src/components/AppImage";
import FlowFooter from "@/src/components/reelFlow/flowFooter";
import FlowButton from "@/src/components/reelFlow/flowButton";
import {
  FlowCard,
  InfoNote,
  SectionLabel,
} from "@/src/components/reelFlow/flowParts";
import { FlowTextField } from "@/src/components/reelFlow/detailsFields";
import { useNotificationContext } from "@/src/contexts/NotificationContext";
import { handleCameraPermission } from "@/src/services/mediaPermissionService";
import { prepareImageForUpload } from "@/src/utils/prepareImageForUpload";
import { resetToDashboardHome } from "@/src/utils/navigation";
import {
  getJobErrorMessage,
  getJobErrorStatus,
  getJobFieldErrors,
} from "@/src/utils/jobHelpers";
import {
  REPORT_FILE_MAX_BYTES,
  REPORT_MAX_FILES,
  REPORT_NOTE_MAX,
  fetchTargetReportReasons,
  submitTargetReport,
  type ReportAttachment,
  type ReportTargetType,
} from "@/src/services/reportService";
import type { ReportReason } from "@/src/types/reels";

/**
 * Report a business or a staff member (client sample 10-30):
 * 1. pick a reason (server list) → 2. describe + files + two optional
 * questions → Report Submitted. Opened from the business page / staff profile.
 */

type Step = "reason" | "details" | "sent";
type Errors = { reason?: string; note?: string; attachments?: string };

const FILE_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  heic: "image/heic",
  heif: "image/heic",
  pdf: "application/pdf",
};
const ALLOWED_MIME = Array.from(new Set(Object.values(FILE_TYPES)));

function formatBytes(bytes: number | null | undefined): string {
  if (bytes == null) return "";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background },
    flex: { flex: 1 },
    content: {
      paddingHorizontal: moderateWidthScale(20),
      paddingTop: moderateHeightScale(16),
      paddingBottom: moderateHeightScale(28),
      gap: moderateHeightScale(22),
    },
    group: { gap: moderateHeightScale(12) },
    // ── Who is being reported
    targetCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(14),
      padding: moderateWidthScale(14),
    },
    targetImage: {
      width: widthScale(58),
      height: widthScale(58),
      borderRadius: moderateWidthScale(12),
      backgroundColor: theme.emptyProfileImage,
      overflow: "hidden",
    },
    targetText: { flex: 1, minWidth: 0, gap: moderateHeightScale(3) },
    targetName: {
      fontSize: fontSize.size18,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    targetSub: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
    },
    // ── Step caption + question
    stepCaption: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontMedium,
      color: theme.lightGreen,
      textTransform: "uppercase",
      letterSpacing: 0.6,
    },
    question: {
      fontSize: fontSize.size18,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      lineHeight: fontSize.size24,
    },
    required: { color: theme.selectCard },
    // ── Reason rows
    reasonList: { gap: moderateHeightScale(10) },
    reasonRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(12),
      minHeight: heightScale(54),
      paddingHorizontal: moderateWidthScale(14),
      paddingVertical: moderateHeightScale(12),
      borderRadius: moderateWidthScale(14),
      borderWidth: 1.5,
      borderColor: theme.borderNormal,
      backgroundColor: theme.white,
    },
    reasonRowOn: {
      borderColor: theme.darkGreen,
      backgroundColor: theme.tileMint,
    },
    reasonText: {
      flex: 1,
      fontSize: fontSize.size16,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
    },
    reasonTextOn: { fontFamily: fonts.fontBold },
    reasonSkeleton: {
      height: heightScale(54),
      borderRadius: moderateWidthScale(14),
      backgroundColor: theme.lightGreen07,
    },
    // ── Attach tiles
    tileRow: { flexDirection: "row", gap: moderateWidthScale(10) },
    tile: {
      flex: 1,
      minHeight: heightScale(96),
      alignItems: "center",
      justifyContent: "center",
      gap: moderateHeightScale(8),
      paddingHorizontal: moderateWidthScale(6),
      paddingVertical: moderateHeightScale(12),
      borderRadius: moderateWidthScale(14),
      borderWidth: 1.5,
      borderColor: theme.borderNormal,
      backgroundColor: theme.white,
    },
    tileDisabled: { opacity: 0.45 },
    tileIcon: {
      width: widthScale(40),
      height: widthScale(40),
      borderRadius: widthScale(20),
      backgroundColor: theme.tileMint,
      alignItems: "center",
      justifyContent: "center",
    },
    tileLabel: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
      textAlign: "center",
    },
    filesHint: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      lineHeight: fontSize.size18,
    },
    fieldError: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontMedium,
      color: theme.red,
    },
    // ── Picked files
    fileList: { gap: moderateHeightScale(8) },
    fileRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(12),
      padding: moderateWidthScale(10),
      borderRadius: moderateWidthScale(14),
      borderWidth: 1,
      borderColor: theme.borderNormal,
      backgroundColor: theme.white,
    },
    fileThumb: {
      width: widthScale(48),
      height: widthScale(48),
      borderRadius: moderateWidthScale(10),
      backgroundColor: theme.tileMint,
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
    },
    fileText: { flex: 1, minWidth: 0, gap: moderateHeightScale(2) },
    fileName: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
    },
    fileMeta: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
    },
    fileRemove: {
      width: widthScale(44),
      height: widthScale(44),
      borderRadius: widthScale(22),
      backgroundColor: theme.lightGreen07,
      alignItems: "center",
      justifyContent: "center",
    },
    // ── Yes / No
    choiceRow: { flexDirection: "row", gap: moderateWidthScale(12) },
    choice: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(10),
      minHeight: heightScale(52),
      paddingHorizontal: moderateWidthScale(14),
      borderRadius: moderateWidthScale(14),
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
    subQuestion: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
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
      width: widthScale(124),
      height: widthScale(124),
      borderRadius: widthScale(62),
      backgroundColor: theme.tileMint,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: moderateHeightScale(8),
    },
    sentCircle: {
      width: widthScale(84),
      height: widthScale(84),
      borderRadius: widthScale(42),
      backgroundColor: theme.darkGreen,
      alignItems: "center",
      justifyContent: "center",
    },
    sentTitle: {
      fontSize: fontSize.size28,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      textAlign: "center",
    },
    sentLead: {
      fontSize: fontSize.size18,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
      textAlign: "center",
      lineHeight: fontSize.size24,
      maxWidth: widthScale(300),
    },
    sentBody: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      textAlign: "center",
      lineHeight: fontSize.size22,
      maxWidth: widthScale(320),
    },
    sentNote: { alignSelf: "stretch", marginTop: moderateHeightScale(4) },
  });

export default function ReportProblemScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { showBanner } = useNotificationContext();
  const params = useLocalSearchParams<{
    type?: string;
    id?: string;
    name?: string;
    subtitle?: string;
    image?: string;
  }>();
  const type: ReportTargetType = params.type === "staff" ? "staff" : "business";
  const targetId = params.id ?? "";

  const [step, setStep] = useState<Step>("reason");
  const [reasons, setReasons] = useState<ReportReason[] | null>(null);
  const [reasonsError, setReasonsError] = useState(false);
  const [reason, setReason] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [attachments, setAttachments] = useState<ReportAttachment[]>([]);
  const [visited, setVisited] = useState<boolean | null>(null);
  const [mayContact, setMayContact] = useState<boolean | null>(null);
  const [errors, setErrors] = useState<Errors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [picking, setPicking] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [already, setAlready] = useState(false);

  const loadReasons = useCallback(() => {
    setReasons(null);
    setReasonsError(false);
    fetchTargetReportReasons(type)
      .then((list) => {
        setReasons(list);
        if (!list.length) setReasonsError(true);
      })
      .catch(() => setReasonsError(true));
  }, [type]);

  useEffect(() => {
    loadReasons();
  }, [loadReasons]);

  // Android back on step 2 returns to step 1 instead of leaving
  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener("hardwareBackPress", () => {
        if (step === "details" && !submitting) {
          setStep("reason");
          return true;
        }
        return submitting;
      });
      return () => sub.remove();
    }, [step, submitting]),
  );

  const handleBack = () => {
    if (submitting) return;
    if (step === "details") setStep("reason");
    else router.back();
  };

  const slotsLeft = REPORT_MAX_FILES - attachments.length;

  const addFiles = (files: ReportAttachment[]) => {
    if (!files.length) return;
    setAttachments((prev) => [...prev, ...files].slice(0, REPORT_MAX_FILES));
    setErrors((prev) => ({ ...prev, attachments: undefined }));
    setSubmitError(null);
  };

  /** Camera and gallery photos go up as JPEG (HEIC → JPEG, ≤ 1920 px). */
  const preparePhotos = async (uris: string[]) => {
    const prepared: ReportAttachment[] = [];
    for (const uri of uris) {
      const file = await prepareImageForUpload(uri, "report");
      prepared.push({ ...file, size: null });
    }
    return prepared;
  };

  const pickPhotos = async (source: "camera" | "library") => {
    Keyboard.dismiss();
    if (slotsLeft <= 0 || picking) return;
    if (source === "camera" && !(await handleCameraPermission())) return;
    setPicking(true);
    try {
      const options: ImagePicker.ImagePickerOptions = {
        mediaTypes: ["images"],
        quality: 1,
        ...(source === "library"
          ? { allowsMultipleSelection: true, selectionLimit: slotsLeft }
          : {}),
      };
      const result =
        source === "camera"
          ? await ImagePicker.launchCameraAsync(options)
          : await ImagePicker.launchImageLibraryAsync(options);
      if (result.canceled) return;
      const uris = (result.assets ?? [])
        .map((asset) => asset.uri)
        .filter(Boolean)
        .slice(0, slotsLeft);
      addFiles(await preparePhotos(uris));
    } catch {
      showBanner(t("error"), t("reportFilePickFailed"), "error");
    } finally {
      setPicking(false);
    }
  };

  const pickDocuments = async () => {
    Keyboard.dismiss();
    if (slotsLeft <= 0 || picking) return;
    setPicking(true);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ALLOWED_MIME,
        copyToCacheDirectory: true,
        multiple: true,
      });
      if (result.canceled || !result.assets?.length) return;
      const files: ReportAttachment[] = [];
      let rejected: string | null = null;
      for (const asset of result.assets.slice(0, slotsLeft)) {
        const ext = (asset.name?.split(".").pop() ?? "").toLowerCase();
        const mime = FILE_TYPES[ext] ?? asset.mimeType ?? "";
        if (!ALLOWED_MIME.includes(mime)) {
          rejected = t("reportFileWrongType");
          continue;
        }
        if (asset.size != null && asset.size > REPORT_FILE_MAX_BYTES) {
          rejected = t("reportFileTooLarge");
          continue;
        }
        files.push({
          uri: asset.uri,
          name: asset.name || `report.${ext || "pdf"}`,
          type: mime,
          size: asset.size ?? null,
        });
      }
      addFiles(files);
      if (rejected) setErrors((prev) => ({ ...prev, attachments: rejected! }));
    } catch {
      showBanner(t("error"), t("reportFilePickFailed"), "error");
    } finally {
      setPicking(false);
    }
  };

  const removeFile = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
    setErrors((prev) => ({ ...prev, attachments: undefined }));
  };

  const submit = async () => {
    Keyboard.dismiss();
    if (submitting || !reason || !targetId) return;
    if (!note.trim()) {
      setErrors({ note: t("reportDescribeRequired") });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    setErrors({});
    setProgress(attachments.length ? 0 : null);
    try {
      const result = await submitTargetReport(
        {
          type,
          id: targetId,
          reason,
          note,
          visited,
          mayContact,
          attachments,
        },
        attachments.length ? setProgress : undefined,
      );
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setAlready(result.already);
      setStep("sent");
    } catch (err: any) {
      if (err?.isNoInternet) return;
      const status = getJobErrorStatus(err);
      const fieldErrors = getJobFieldErrors(err);
      const message = getJobErrorMessage(err, t("reportSubmitFailed"));
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      // Gone / left the business, or reporting yourself: nothing to fix here
      if (status === 404 || fieldErrors.id) {
        Alert.alert(t("reportUnavailableTitle"), fieldErrors.id ?? message, [
          { text: t("ok"), onPress: () => router.back() },
        ]);
        return;
      }
      if (status === 401) {
        setSubmitError(t("reportSignInNeeded"));
        return;
      }
      if (status === 429) {
        setSubmitError(t("reportTooMany"));
        return;
      }
      const attachmentError = Object.entries(fieldErrors).find(([key]) =>
        key.startsWith("attachments"),
      )?.[1];
      const mapped: Errors = {
        note: fieldErrors.note,
        attachments: attachmentError,
      };
      if (fieldErrors.reason) {
        setErrors({ reason: fieldErrors.reason });
        setStep("reason");
        return;
      }
      if (mapped.note || mapped.attachments) setErrors(mapped);
      else setSubmitError(message);
    } finally {
      setSubmitting(false);
      setProgress(null);
    }
  };

  const title = t("reportProblemTitle");

  const targetCard = (
    <FlowCard style={styles.targetCard}>
      <AppImage
        uri={params.image || undefined}
        style={styles.targetImage}
        resizeMode="cover"
        iconSize={moderateWidthScale(22)}
      />
      <View style={styles.targetText}>
        <Text style={styles.targetName} numberOfLines={1}>
          {params.name || t(type === "staff" ? "staff" : "business")}
        </Text>
        {params.subtitle ? (
          <Text style={styles.targetSub} numberOfLines={1}>
            {params.subtitle}
          </Text>
        ) : null}
      </View>
    </FlowCard>
  );

  const renderYesNo = (
    question: string,
    value: boolean | null,
    onChange: (next: boolean | null) => void,
  ) => (
    <View style={styles.group}>
      <Text style={styles.subQuestion}>{question}</Text>
      <View style={styles.choiceRow} accessibilityRole="radiogroup">
        {[true, false].map((option) => {
          const on = value === option;
          return (
            <TouchableOpacity
              key={String(option)}
              style={[styles.choice, on && styles.choiceOn]}
              // Optional question: tapping the picked answer clears it
              onPress={() => onChange(on ? null : option)}
              disabled={submitting}
              activeOpacity={0.8}
              accessibilityRole="radio"
              accessibilityState={{ checked: on }}
              accessibilityLabel={`${question} ${option ? t("yes") : t("no")}`}
            >
              <MaterialIcons
                name={on ? "radio-button-checked" : "radio-button-unchecked"}
                size={moderateWidthScale(22)}
                color={on ? theme.darkGreen : theme.lightGreen5}
              />
              <Text style={[styles.choiceText, on && styles.choiceTextOn]}>
                {option ? t("yes") : t("no")}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );

  // ── Report Submitted ────────────────────────────────────────────────
  if (step === "sent") {
    return (
      <View style={styles.container}>
        <StackHeader title="" />
        <ScrollView contentContainerStyle={styles.sentScroll}>
          <Animated.View
            style={styles.sent}
            entering={FadeIn.duration(260).reduceMotion(ReduceMotion.System)}
          >
            <View style={styles.sentHalo}>
              <View style={styles.sentCircle}>
                <MaterialIcons
                  name="check"
                  size={moderateWidthScale(48)}
                  color={theme.white}
                />
              </View>
            </View>
            <Text
              style={styles.sentTitle}
              accessibilityRole="header"
              accessibilityLiveRegion="polite"
            >
              {t("reportSubmittedTitle")}
            </Text>
            <Text style={styles.sentLead}>{t("reportSubmittedThanks")}</Text>
            <Text style={styles.sentBody}>{t("reportSubmittedBody")}</Text>
            {already ? (
              <InfoNote
                style={styles.sentNote}
                icon="history"
                text={t("reportAlreadyNote")}
              />
            ) : null}
          </Animated.View>
        </ScrollView>
        <FlowFooter
          primary={{
            label:
              type === "staff"
                ? t("reportBackToProfile")
                : t("reportBackToBusiness"),
            onPress: () => router.back(),
          }}
          secondary={{
            label: t("goToHome"),
            icon: "home",
            onPress: resetToDashboardHome,
          }}
        />
      </View>
    );
  }

  // ── Step 1: reason ──────────────────────────────────────────────────
  if (step === "reason") {
    return (
      <View style={styles.container}>
        <StackHeader title={title} onBack={handleBack} />
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {targetCard}
          <View style={styles.group}>
            <Text style={styles.stepCaption}>
              {t("reportStepOf", { step: 1, total: 2 })}
            </Text>
            <Text style={styles.question} accessibilityRole="header">
              {t("reportReasonQuestion")}
              <Text style={styles.required}> *</Text>
            </Text>
          </View>

          {reasonsError ? (
            <View style={styles.group}>
              <InfoNote
                tone="error"
                icon="error-outline"
                text={t("reportReasonsLoadFailed")}
              />
              <FlowButton
                label={t("tryAgain")}
                variant="outline"
                icon="refresh"
                onPress={loadReasons}
              />
            </View>
          ) : reasons == null ? (
            <View style={styles.reasonList} accessibilityLabel={t("loading")}>
              {Array.from({ length: 6 }).map((_, i) => (
                <View key={i} style={styles.reasonSkeleton} />
              ))}
            </View>
          ) : (
            <View style={styles.reasonList} accessibilityRole="radiogroup">
              {reasons.map((item) => {
                const on = reason === item.value;
                return (
                  <TouchableOpacity
                    key={item.value}
                    style={[styles.reasonRow, on && styles.reasonRowOn]}
                    onPress={() => {
                      void Haptics.selectionAsync();
                      setReason(item.value);
                      setErrors((prev) => ({ ...prev, reason: undefined }));
                    }}
                    activeOpacity={0.8}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: on }}
                  >
                    <MaterialIcons
                      name={
                        on ? "radio-button-checked" : "radio-button-unchecked"
                      }
                      size={moderateWidthScale(24)}
                      color={on ? theme.darkGreen : theme.lightGreen5}
                    />
                    <Text style={[styles.reasonText, on && styles.reasonTextOn]}>
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
          {errors.reason ? (
            <Text style={styles.fieldError} accessibilityLiveRegion="polite">
              {errors.reason}
            </Text>
          ) : null}
        </ScrollView>
        <FlowFooter
          primary={{
            label: t("next"),
            trailingIcon: "arrow-forward",
            onPress: () => setStep("details"),
            disabled: !reason,
          }}
        />
      </View>
    );
  }

  // ── Step 2: details ─────────────────────────────────────────────────
  const tiles: {
    key: string;
    label: string;
    icon: React.ComponentProps<typeof MaterialIcons>["name"];
    onPress: () => void;
  }[] = [
    {
      key: "camera",
      label: t("reportTakePhoto"),
      icon: "photo-camera",
      onPress: () => void pickPhotos("camera"),
    },
    {
      key: "library",
      label: t("reportChooseGallery"),
      icon: "photo-library",
      onPress: () => void pickPhotos("library"),
    },
    {
      key: "file",
      label: t("reportAttachFile"),
      icon: "attach-file",
      onPress: () => void pickDocuments(),
    },
  ];
  const tilesDisabled = slotsLeft <= 0 || picking || submitting;

  return (
    <View style={styles.container}>
      <StackHeader title={title} onBack={handleBack} />
      <KeyboardAwareScrollView
        style={styles.flex}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        showsVerticalScrollIndicator={false}
        bottomOffset={moderateHeightScale(32)}
      >
        {targetCard}

        <View style={styles.group}>
          <Text style={styles.stepCaption}>
            {t("reportStepOf", { step: 2, total: 2 })}
          </Text>
          <FlowTextField
            label={t("reportDescribe")}
            required
            value={note}
            onChangeText={(v) => {
              setNote(v);
              setSubmitError(null);
              if (errors.note) setErrors((prev) => ({ ...prev, note: undefined }));
            }}
            multiline
            maxCount={REPORT_NOTE_MAX}
            placeholder={t("reportDescribePlaceholder")}
            error={errors.note}
            editable={!submitting}
          />
        </View>

        <View style={styles.group}>
          <SectionLabel
            label={t("reportAddPhotos")}
            meta={
              attachments.length
                ? `${attachments.length}/${REPORT_MAX_FILES}`
                : t("optional")
            }
          />
          <View style={styles.tileRow}>
            {tiles.map((tile) => (
              <TouchableOpacity
                key={tile.key}
                style={[styles.tile, tilesDisabled && styles.tileDisabled]}
                onPress={tile.onPress}
                disabled={tilesDisabled}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel={tile.label}
                accessibilityState={{ disabled: tilesDisabled }}
              >
                <View style={styles.tileIcon}>
                  <MaterialIcons
                    name={tile.icon}
                    size={moderateWidthScale(22)}
                    color={theme.darkGreen}
                  />
                </View>
                <Text style={styles.tileLabel} numberOfLines={2}>
                  {tile.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {picking ? (
            <ActivityIndicator color={theme.darkGreen} />
          ) : null}
          {errors.attachments ? (
            <Text style={styles.fieldError} accessibilityLiveRegion="polite">
              {errors.attachments}
            </Text>
          ) : (
            <Text style={styles.filesHint}>
              {slotsLeft <= 0
                ? t("reportFilesLimit", { count: REPORT_MAX_FILES })
                : t("reportFilesHint", { count: REPORT_MAX_FILES })}
            </Text>
          )}

          {attachments.length ? (
            <View style={styles.fileList}>
              {attachments.map((file, index) => {
                const isImage = file.type.startsWith("image/");
                return (
                  <View key={`${file.uri}-${index}`} style={styles.fileRow}>
                    <View style={styles.fileThumb}>
                      {isImage ? (
                        <AppImage
                          uri={file.uri}
                          style={StyleSheet.absoluteFill}
                          resizeMode="cover"
                        />
                      ) : (
                        <MaterialIcons
                          name="picture-as-pdf"
                          size={moderateWidthScale(24)}
                          color={theme.darkGreen}
                        />
                      )}
                    </View>
                    <View style={styles.fileText}>
                      <Text style={styles.fileName} numberOfLines={1}>
                        {file.name}
                      </Text>
                      <Text style={styles.fileMeta}>
                        {[isImage ? t("reportPhoto") : "PDF", formatBytes(file.size)]
                          .filter(Boolean)
                          .join(" · ")}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={styles.fileRemove}
                      onPress={() => removeFile(index)}
                      disabled={submitting}
                      accessibilityRole="button"
                      accessibilityLabel={`${t("reportRemoveFile")} ${file.name}`}
                    >
                      <MaterialIcons
                        name="close"
                        size={moderateWidthScale(20)}
                        color={theme.darkGreen}
                      />
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          ) : null}
        </View>

        {renderYesNo(
          type === "staff"
            ? t("reportVisitedQuestionStaff")
            : t("reportVisitedQuestion"),
          visited,
          setVisited,
        )}
        {renderYesNo(t("reportContactQuestion"), mayContact, setMayContact)}

        {submitError ? (
          <InfoNote tone="error" icon="error-outline" text={submitError} />
        ) : null}
      </KeyboardAwareScrollView>

      {/* Plain View: the button stays behind the keyboard (app keyboard rule) */}
      <View>
        <FlowFooter
          primary={{
            label: t("reportSubmit"),
            onPress: () => void submit(),
            loading: submitting,
            disabled: submitting || picking || !note.trim(),
          }}
          progress={
            progress != null
              ? {
                  label: t("reportUploading", { percent: progress }),
                  percent: progress,
                }
              : null
          }
        />
      </View>
    </View>
  );
}
