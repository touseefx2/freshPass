import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  BackHandler,
  Keyboard,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useFocusEffect, useRouter } from "expo-router";
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
import { InfoNote, SectionLabel } from "@/src/components/reelFlow/flowParts";
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
import { IMAGES } from "@/src/constant/images";
import { GIVES_BACK_COLORS } from "@/src/components/givesBack/GivesBackBanner";
import {
  GIVES_BACK_CONTACT_MAX,
  GIVES_BACK_DESCRIPTION_MAX,
  GIVES_BACK_FILE_MAX_BYTES,
  GIVES_BACK_MAX_FILES,
  GIVES_BACK_NAME_MAX,
  GIVES_BACK_RELATIONSHIP_MAX,
  clearGivesBackBannerCache,
  submitFamilyRecommendation,
  type GivesBackFile,
} from "@/src/services/givesBackService";

/**
 * Recommend a Family (FreshPass Gives Back): family name, contact, hardship,
 * relationship + up to 3 proof files (photo / PDF) → thank-you screen.
 * Opened from the unlocked banner on the customer / business home.
 */

type IconName = React.ComponentProps<typeof MaterialIcons>["name"];
type Errors = {
  familyName?: string;
  contactNumber?: string;
  description?: string;
  relationship?: string;
  files?: string;
};

// Backend: jpg, jpeg, png, gif, webp, pdf
const FILE_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
  pdf: "application/pdf",
};
const ALLOWED_MIME = Array.from(new Set(Object.values(FILE_TYPES)));

function formatBytes(bytes: number | null | undefined): string {
  if (bytes == null) return "";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const C = GIVES_BACK_COLORS;

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background },
    flex: { flex: 1 },
    content: {
      paddingHorizontal: moderateWidthScale(20),
      paddingTop: moderateHeightScale(16),
      paddingBottom: moderateHeightScale(28),
      gap: moderateHeightScale(20),
    },
    group: { gap: moderateHeightScale(12) },
    // ── Intro card (same header look as the home banner)
    intro: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(14),
      padding: moderateWidthScale(16),
      borderRadius: moderateWidthScale(18),
      backgroundColor: C.header,
    },
    introIcon: {
      width: moderateWidthScale(56),
      height: moderateWidthScale(47),
    },
    introText: { flex: 1, minWidth: 0, gap: moderateHeightScale(4) },
    introTitle: {
      fontSize: fontSize.size18,
      fontFamily: fonts.fontBold,
      color: C.white,
    },
    introBody: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: C.whiteSoft,
      lineHeight: fontSize.size14 * 1.4,
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
    submitError: {
      marginHorizontal: moderateWidthScale(20),
      marginTop: moderateHeightScale(10),
    },
    // ── Thank you
    thanksScroll: {
      flexGrow: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: moderateWidthScale(24),
      paddingVertical: moderateHeightScale(24),
    },
    halo: {
      width: widthScale(140),
      height: widthScale(140),
      borderRadius: widthScale(70),
      backgroundColor: C.header,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: moderateHeightScale(24),
    },
    haloIcon: {
      width: widthScale(92),
      height: widthScale(77),
    },
    thanksTitle: {
      fontSize: fontSize.size28,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      textAlign: "center",
      marginBottom: moderateHeightScale(12),
    },
    thanksBody: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      textAlign: "center",
      lineHeight: fontSize.size24,
      maxWidth: widthScale(320),
    },
  });

export default function RecommendFamilyScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { showBanner } = useNotificationContext();

  const [familyName, setFamilyName] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [description, setDescription] = useState("");
  const [relationship, setRelationship] = useState("");
  const [files, setFiles] = useState<GivesBackFile[]>([]);
  const [errors, setErrors] = useState<Errors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [sent, setSent] = useState(false);

  const contactRef = useRef<TextInput>(null);
  const descriptionRef = useRef<TextInput>(null);
  const relationshipRef = useRef<TextInput>(null);

  // No leaving while the recommendation is on its way
  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener(
        "hardwareBackPress",
        () => submitting,
      );
      return () => sub.remove();
    }, [submitting]),
  );

  const slotsLeft = GIVES_BACK_MAX_FILES - files.length;

  const clearError = (key: keyof Errors) => {
    setSubmitError(null);
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const addFiles = (added: GivesBackFile[]) => {
    if (!added.length) return;
    setFiles((prev) => [...prev, ...added].slice(0, GIVES_BACK_MAX_FILES));
    setErrors((prev) => ({ ...prev, files: undefined }));
    setSubmitError(null);
  };

  /** Camera / gallery photos go up as JPEG (HEIC → JPEG, ≤ 1920 px). */
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
      const prepared: GivesBackFile[] = [];
      for (const uri of uris) {
        const file = await prepareImageForUpload(uri, "proof");
        prepared.push({ ...file, size: null });
      }
      addFiles(prepared);
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
      const picked: GivesBackFile[] = [];
      let rejected: string | null = null;
      for (const asset of result.assets.slice(0, slotsLeft)) {
        const ext = (asset.name?.split(".").pop() ?? "").toLowerCase();
        const mime = FILE_TYPES[ext] ?? asset.mimeType ?? "";
        if (!ALLOWED_MIME.includes(mime)) {
          rejected = t("givesBackFileWrongType");
          continue;
        }
        if (asset.size != null && asset.size > GIVES_BACK_FILE_MAX_BYTES) {
          rejected = t("reportFileTooLarge");
          continue;
        }
        picked.push({
          uri: asset.uri,
          name: asset.name || `proof.${ext || "pdf"}`,
          type: mime,
          size: asset.size ?? null,
        });
      }
      addFiles(picked);
      if (rejected) setErrors((prev) => ({ ...prev, files: rejected! }));
    } catch {
      showBanner(t("error"), t("reportFilePickFailed"), "error");
    } finally {
      setPicking(false);
    }
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setErrors((prev) => ({ ...prev, files: undefined }));
  };

  const submit = async () => {
    Keyboard.dismiss();
    if (submitting) return;
    const missing: Errors = {};
    if (!familyName.trim()) missing.familyName = t("givesBackFamilyNameRequired");
    if (!contactNumber.trim())
      missing.contactNumber = t("givesBackContactRequired");
    if (!description.trim())
      missing.description = t("givesBackDescriptionRequired");
    if (Object.keys(missing).length) {
      setErrors(missing);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    setErrors({});
    setProgress(files.length ? 0 : null);
    try {
      await submitFamilyRecommendation(
        { familyName, contactNumber, description, relationship, files },
        files.length ? setProgress : undefined,
      );
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setSent(true);
    } catch (err: any) {
      if (err?.isNoInternet) return;
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      const fieldErrors = getJobFieldErrors(err);
      const fileError = Object.entries(fieldErrors).find(([key]) =>
        key.startsWith("proof_files"),
      )?.[1];
      const mapped: Errors = {
        familyName: fieldErrors.family_name,
        contactNumber: fieldErrors.contact_number,
        description: fieldErrors.description,
        relationship: fieldErrors.relationship,
        files: fileError,
      };
      if (Object.values(mapped).some(Boolean)) {
        setErrors(mapped);
        // The field itself may be scrolled out of view
        setSubmitError(t("supportCheckDetails"));
        return;
      }
      // Goal not reached / feature turned off: the banner must re-check
      if (fieldErrors.general) clearGivesBackBannerCache();
      setSubmitError(
        getJobErrorStatus(err) === 422
          ? getJobErrorMessage(err, t("givesBackSubmitFailed"))
          : t("givesBackSubmitFailed"),
      );
    } finally {
      setSubmitting(false);
      setProgress(null);
    }
  };

  // ── Thank you ───────────────────────────────────────────────────────
  if (sent) {
    return (
      <View style={styles.container}>
        <StackHeader title={t("givesBackTitle")} />
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.thanksScroll}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View
            entering={FadeIn.duration(260).reduceMotion(ReduceMotion.System)}
            style={{ alignItems: "center", alignSelf: "stretch" }}
          >
            <View style={styles.halo}>
              <Image
                source={IMAGES.givesBackIcon}
                style={styles.haloIcon}
                contentFit="contain"
                accessible={false}
              />
            </View>
            <Text
              style={styles.thanksTitle}
              accessibilityRole="header"
              accessibilityLiveRegion="polite"
            >
              {t("givesBackThanksTitle")}
            </Text>
            <Text style={styles.thanksBody}>{t("givesBackThanksBody")}</Text>
          </Animated.View>
        </ScrollView>
        <FlowFooter
          primary={{
            label: t("givesBackMyRecommendations"),
            onPress: () =>
              router.replace("/(main)/givesBack/myRecommendations" as any),
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

  // ── Form ────────────────────────────────────────────────────────────
  const tiles: {
    key: string;
    label: string;
    icon: IconName;
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
  const ready =
    !!familyName.trim() && !!contactNumber.trim() && !!description.trim();

  return (
    <View style={styles.container}>
      <StackHeader
        title={t("givesBackRecommend")}
        onBack={() => {
          if (!submitting) router.back();
        }}
      />
      <KeyboardAwareScrollView
        style={styles.flex}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        showsVerticalScrollIndicator={false}
        bottomOffset={moderateHeightScale(32)}
      >
        <View style={styles.intro}>
          <Image
            source={IMAGES.givesBackIcon}
            style={styles.introIcon}
            contentFit="contain"
            accessible={false}
          />
          <View style={styles.introText}>
            <Text style={styles.introTitle} accessibilityRole="header">
              {t("givesBackTitle")}
            </Text>
            <Text style={styles.introBody}>{t("givesBackFormIntro")}</Text>
          </View>
        </View>

        <FlowTextField
          label={t("givesBackFamilyName")}
          required
          value={familyName}
          onChangeText={(v) => {
            setFamilyName(v);
            clearError("familyName");
          }}
          maxLength={GIVES_BACK_NAME_MAX}
          placeholder={t("givesBackFamilyNamePlaceholder")}
          error={errors.familyName}
          editable={!submitting}
          autoCapitalize="words"
          returnKeyType="next"
          submitBehavior="submit"
          onSubmitEditing={() => contactRef.current?.focus()}
        />

        <FlowTextField
          ref={contactRef}
          label={t("givesBackContactNumber")}
          required
          value={contactNumber}
          onChangeText={(v) => {
            setContactNumber(v);
            clearError("contactNumber");
          }}
          maxLength={GIVES_BACK_CONTACT_MAX}
          placeholder={t("givesBackContactPlaceholder")}
          error={errors.contactNumber}
          editable={!submitting}
          keyboardType="phone-pad"
          textContentType="telephoneNumber"
          autoComplete="tel"
        />

        <FlowTextField
          ref={descriptionRef}
          label={t("givesBackDescription")}
          required
          value={description}
          onChangeText={(v) => {
            setDescription(v);
            clearError("description");
          }}
          multiline
          maxCount={GIVES_BACK_DESCRIPTION_MAX}
          placeholder={t("givesBackDescriptionPlaceholder")}
          error={errors.description}
          editable={!submitting}
        />

        <FlowTextField
          ref={relationshipRef}
          label={t("givesBackRelationship")}
          value={relationship}
          onChangeText={(v) => {
            setRelationship(v);
            clearError("relationship");
          }}
          maxLength={GIVES_BACK_RELATIONSHIP_MAX}
          placeholder={t("givesBackRelationshipPlaceholder")}
          helper={t("optional")}
          error={errors.relationship}
          editable={!submitting}
          autoCapitalize="sentences"
        />

        <View style={styles.group}>
          <SectionLabel
            label={t("givesBackProof")}
            meta={
              files.length
                ? `${files.length}/${GIVES_BACK_MAX_FILES}`
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
          {picking ? <ActivityIndicator color={theme.darkGreen} /> : null}
          {errors.files ? (
            <Text style={styles.fieldError} accessibilityLiveRegion="polite">
              {errors.files}
            </Text>
          ) : (
            <Text style={styles.filesHint}>
              {slotsLeft <= 0
                ? t("reportFilesLimit", { count: GIVES_BACK_MAX_FILES })
                : t("givesBackProofHint", { count: GIVES_BACK_MAX_FILES })}
            </Text>
          )}

          {files.length ? (
            <View style={styles.fileList}>
              {files.map((file, index) => {
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
                        {[
                          isImage ? t("reportPhoto") : "PDF",
                          formatBytes(file.size),
                        ]
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
      </KeyboardAwareScrollView>

      {/* Plain View: the button stays behind the keyboard (app keyboard rule) */}
      <View>
        {/* Next to the button: the end of the form may be scrolled out of view */}
        {submitError ? (
          <InfoNote
            style={styles.submitError}
            tone="error"
            icon="error-outline"
            text={submitError}
          />
        ) : null}
        <FlowFooter
          primary={{
            label: t("givesBackSubmit"),
            onPress: () => void submit(),
            loading: submitting,
            disabled: submitting || picking || !ready,
          }}
          hint={ready ? null : t("givesBackSubmitHint")}
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
