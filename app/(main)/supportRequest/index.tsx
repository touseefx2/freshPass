import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
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
import * as ImagePicker from "expo-image-picker";
import * as Haptics from "expo-haptics";
import Animated, { FadeIn, ReduceMotion } from "react-native-reanimated";
import { LeafLogo } from "@/assets/icons";
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
import AppImage from "@/src/components/AppImage";
import FlowButton from "@/src/components/reelFlow/flowButton";
import FlowFooter from "@/src/components/reelFlow/flowFooter";
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
  SUPPORT_MAX_PHOTOS,
  SUPPORT_MESSAGE_MAX,
  fetchSupportTopics,
  submitSupportRequest,
  type SupportAttachment,
  type SupportTopic,
} from "@/src/services/supportService";

/**
 * FreshPass Support (client 11-06): topic + message + optional photos →
 * thank-you screen. Opened from Appointment Details, which passes the
 * appointment so support knows which visit the request is about.
 */

type IconName = React.ComponentProps<typeof MaterialIcons>["name"];
type Errors = {
  appointment?: string;
  topic?: string;
  message?: string;
  attachments?: string;
};

const TOPIC_ICONS: Record<string, IconName> = {
  payment: "credit-card",
  appointment: "event",
  barber_salon: "content-cut",
  app_problem: "smartphone",
  other: "more-horiz",
};
const TOPIC_SKELETON_WIDTHS = [104, 128, 132, 124, 84];

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background },
    flex: { flex: 1 },
    content: {
      paddingHorizontal: moderateWidthScale(20),
      paddingTop: moderateHeightScale(20),
      paddingBottom: moderateHeightScale(28),
      gap: moderateHeightScale(24),
    },
    group: { gap: moderateHeightScale(12) },
    intro: { gap: moderateHeightScale(6) },
    heading: {
      fontSize: fontSize.size24,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    introText: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      lineHeight: fontSize.size22,
    },
    // ── Appointment the request is about
    appointmentCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(12),
      padding: moderateWidthScale(14),
    },
    appointmentIcon: {
      width: widthScale(44),
      height: widthScale(44),
      borderRadius: widthScale(22),
      backgroundColor: theme.tileMint,
      alignItems: "center",
      justifyContent: "center",
    },
    appointmentText: { flex: 1, minWidth: 0, gap: moderateHeightScale(2) },
    appointmentCaption: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontMedium,
      color: theme.lightGreen,
    },
    appointmentName: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    appointmentMeta: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
    },
    // ── Topic pills
    pills: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: moderateWidthScale(8),
    },
    pill: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(6),
      minHeight: heightScale(44),
      paddingHorizontal: moderateWidthScale(14),
      borderRadius: heightScale(22),
      borderWidth: 1,
      borderColor: theme.borderNormal,
      backgroundColor: theme.white,
    },
    pillOn: {
      borderColor: theme.darkGreen,
      backgroundColor: theme.darkGreen,
    },
    pillText: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
    },
    pillTextOn: { color: theme.white },
    pillSkeleton: {
      height: heightScale(44),
      borderRadius: heightScale(22),
      backgroundColor: theme.lightGreen07,
    },
    // ── Photos
    addRow: { flexDirection: "row", gap: moderateWidthScale(10) },
    addButton: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: moderateWidthScale(8),
      minHeight: heightScale(48),
      borderRadius: moderateWidthScale(14),
      borderWidth: 1,
      borderColor: theme.borderNormal,
      backgroundColor: theme.white,
    },
    addButtonDisabled: { opacity: 0.45 },
    addLabel: {
      flexShrink: 1,
      fontSize: fontSize.size14,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
    },
    thumbs: { flexDirection: "row", gap: moderateWidthScale(10) },
    thumb: {
      width: widthScale(76),
      height: widthScale(76),
      borderRadius: moderateWidthScale(12),
      backgroundColor: theme.tileMint,
    },
    thumbImage: {
      width: "100%",
      height: "100%",
      borderRadius: moderateWidthScale(12),
    },
    thumbRemove: {
      position: "absolute",
      top: -moderateWidthScale(6),
      right: -moderateWidthScale(6),
      width: widthScale(24),
      height: widthScale(24),
      borderRadius: widthScale(12),
      backgroundColor: theme.darkGreen,
      alignItems: "center",
      justifyContent: "center",
    },
    photosHint: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
    },
    fieldError: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontMedium,
      color: theme.red,
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
    brand: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(8),
      marginBottom: moderateHeightScale(28),
    },
    brandName: {
      fontSize: fontSize.size22,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    brandAccent: { color: theme.selectCard },
    halo: {
      width: widthScale(116),
      height: widthScale(116),
      borderRadius: widthScale(58),
      backgroundColor: theme.tileMint,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: moderateHeightScale(24),
    },
    check: {
      width: widthScale(80),
      height: widthScale(80),
      borderRadius: widthScale(40),
      backgroundColor: theme.darkGreen,
      alignItems: "center",
      justifyContent: "center",
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
      marginBottom: moderateHeightScale(24),
    },
    timeCard: {
      alignSelf: "stretch",
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: moderateWidthScale(14),
      paddingHorizontal: moderateWidthScale(20),
      paddingVertical: moderateHeightScale(16),
      borderRadius: moderateWidthScale(18),
      backgroundColor: theme.tileMint,
    },
    timeDivider: {
      width: 1,
      alignSelf: "stretch",
      backgroundColor: theme.darkGreen,
      opacity: 0.25,
    },
    timeText: { flexShrink: 1 },
    timeLine1: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontRegular,
      color: theme.darkGreen,
    },
    timeLine2: {
      fontSize: fontSize.size18,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
  });

export default function SupportRequestScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { showBanner } = useNotificationContext();
  const email = useAppSelector((s) => s.user.email);
  const params = useLocalSearchParams<{
    appointmentId?: string;
    businessName?: string;
    appointmentMeta?: string;
  }>();

  const [topics, setTopics] = useState<SupportTopic[] | null>(null);
  const [topicsFailed, setTopicsFailed] = useState(false);
  const [topic, setTopic] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [photos, setPhotos] = useState<SupportAttachment[]>([]);
  const [errors, setErrors] = useState<Errors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [sent, setSent] = useState(false);

  const loadTopics = useCallback(() => {
    setTopics(null);
    setTopicsFailed(false);
    fetchSupportTopics()
      .then((list) => {
        setTopics(list);
        if (!list.length) setTopicsFailed(true);
      })
      .catch(() => setTopicsFailed(true));
  }, []);

  useEffect(() => {
    loadTopics();
  }, [loadTopics]);

  // No leaving while the request is on its way
  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener(
        "hardwareBackPress",
        () => submitting,
      );
      return () => sub.remove();
    }, [submitting]),
  );

  const slotsLeft = SUPPORT_MAX_PHOTOS - photos.length;

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
      const prepared: SupportAttachment[] = [];
      for (const uri of uris) {
        prepared.push(await prepareImageForUpload(uri, "support"));
      }
      setPhotos((prev) => [...prev, ...prepared].slice(0, SUPPORT_MAX_PHOTOS));
      setErrors((prev) => ({ ...prev, attachments: undefined }));
      setSubmitError(null);
    } catch {
      showBanner(t("error"), t("reportFilePickFailed"), "error");
    } finally {
      setPicking(false);
    }
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
    setErrors((prev) => ({ ...prev, attachments: undefined }));
    setSubmitError(null);
  };

  const submit = async () => {
    Keyboard.dismiss();
    // A failed topic list must not stop someone from asking for help
    if (submitting || (!topic && !topicsFailed)) return;
    if (!message.trim()) {
      setErrors({ message: t("supportMessageRequired") });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    setErrors({});
    setProgress(photos.length ? 0 : null);
    try {
      await submitSupportRequest(
        {
          appointmentId: params.appointmentId,
          topic,
          message,
          attachments: photos,
        },
        photos.length ? setProgress : undefined,
      );
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setSent(true);
    } catch (err: any) {
      if (err?.isNoInternet) return;
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      if (getJobErrorStatus(err) === 429) {
        setSubmitError(t("supportTooMany"));
        return;
      }
      const fieldErrors = getJobFieldErrors(err);
      const attachmentError = Object.entries(fieldErrors).find(([key]) =>
        key.startsWith("attachments"),
      )?.[1];
      const mapped: Errors = {
        appointment: fieldErrors.appointment_id,
        topic: fieldErrors.topic,
        message: fieldErrors.message,
        attachments: attachmentError,
      };
      if (Object.values(mapped).some(Boolean)) {
        setErrors(mapped);
        // The field itself may be scrolled out of view
        setSubmitError(t("supportCheckDetails"));
        // The list changed on the server: show the current one to pick from
        if (mapped.topic) {
          setTopic(null);
          loadTopics();
        }
        return;
      }
      setSubmitError(
        getJobErrorStatus(err) === 422
          ? getJobErrorMessage(err, t("supportSubmitFailed"))
          : t("supportSubmitFailed"),
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
        <StackHeader title={t("supportTitle")} />
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.thanksScroll}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View
            entering={FadeIn.duration(260).reduceMotion(ReduceMotion.System)}
            style={{ alignItems: "center", alignSelf: "stretch" }}
          >
            <View
              style={styles.brand}
              accessibilityRole="image"
              accessibilityLabel="FreshPass"
            >
              <LeafLogo
                width={moderateWidthScale(34)}
                height={moderateWidthScale(34)}
              />
              <Text style={styles.brandName}>
                Fresh<Text style={styles.brandAccent}>Pass</Text>
              </Text>
            </View>
            <View style={styles.halo}>
              <View style={styles.check}>
                <MaterialIcons
                  name="check"
                  size={moderateWidthScale(46)}
                  color={theme.white}
                />
              </View>
            </View>
            <Text
              style={styles.thanksTitle}
              accessibilityRole="header"
              accessibilityLiveRegion="polite"
            >
              {t("supportThanksTitle")}
            </Text>
            <Text style={styles.thanksBody}>{t("supportThanksBody")}</Text>
            <View style={styles.timeCard} accessible>
              <MaterialIcons
                name="event-available"
                size={moderateWidthScale(30)}
                color={theme.darkGreen}
              />
              <View style={styles.timeDivider} />
              <View style={styles.timeText}>
                <Text style={styles.timeLine1}>
                  {t("supportResponseTimeLine1")}
                </Text>
                <Text style={styles.timeLine2}>
                  {t("supportResponseTimeLine2")}
                </Text>
              </View>
            </View>
          </Animated.View>
        </ScrollView>
        <FlowFooter
          primary={{
            label: t("supportBackToApp"),
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

  // ── Form ────────────────────────────────────────────────────────────
  const addDisabled = slotsLeft <= 0 || picking || submitting;
  const addButtons: {
    key: "camera" | "library";
    label: string;
    icon: IconName;
  }[] = [
    { key: "camera", label: t("reportTakePhoto"), icon: "photo-camera" },
    { key: "library", label: t("reportChooseGallery"), icon: "photo-library" },
  ];
  const ready = (!!topic || topicsFailed) && !!message.trim();

  return (
    <View style={styles.container}>
      <StackHeader
        title={t("supportTitle")}
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
          <Text style={styles.heading} accessibilityRole="header">
            {t("supportHeading")}
          </Text>
          <Text style={styles.introText}>{t("supportIntro")}</Text>
        </View>

        {params.appointmentId && params.businessName ? (
          <FlowCard style={styles.appointmentCard}>
            <View style={styles.appointmentIcon}>
              <MaterialIcons
                name="event"
                size={moderateWidthScale(22)}
                color={theme.darkGreen}
              />
            </View>
            <View style={styles.appointmentText}>
              <Text style={styles.appointmentCaption}>
                {t("supportAboutAppointment")}
              </Text>
              <Text style={styles.appointmentName} numberOfLines={1}>
                {params.businessName}
              </Text>
              {params.appointmentMeta ? (
                <Text style={styles.appointmentMeta} numberOfLines={2}>
                  {params.appointmentMeta}
                </Text>
              ) : null}
            </View>
          </FlowCard>
        ) : null}
        {errors.appointment ? (
          <Text style={styles.fieldError} accessibilityLiveRegion="polite">
            {errors.appointment}
          </Text>
        ) : null}

        <View style={styles.group}>
          <SectionLabel
            label={t("supportTopicLabel")}
            required={!topicsFailed}
          />
          {topicsFailed ? (
            <>
              <InfoNote
                tone="warm"
                icon="error-outline"
                text={t("supportTopicsLoadFailed")}
              />
              <FlowButton
                label={t("tryAgain")}
                variant="outline"
                icon="refresh"
                onPress={loadTopics}
                disabled={submitting}
              />
            </>
          ) : topics == null ? (
            <View style={styles.pills} accessibilityLabel={t("loading")}>
              {TOPIC_SKELETON_WIDTHS.map((width) => (
                <View
                  key={width}
                  style={[
                    styles.pillSkeleton,
                    { width: moderateWidthScale(width) },
                  ]}
                />
              ))}
            </View>
          ) : (
            <View style={styles.pills} accessibilityRole="radiogroup">
              {topics.map((item) => {
                const on = topic === item.value;
                return (
                  <TouchableOpacity
                    key={item.value}
                    style={[styles.pill, on && styles.pillOn]}
                    onPress={() => {
                      void Haptics.selectionAsync();
                      setTopic(item.value);
                      setSubmitError(null);
                      setErrors((prev) => ({ ...prev, topic: undefined }));
                    }}
                    disabled={submitting}
                    activeOpacity={0.8}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: on }}
                  >
                    <MaterialIcons
                      name={TOPIC_ICONS[item.value] ?? "help-outline"}
                      size={moderateWidthScale(18)}
                      color={on ? theme.white : theme.darkGreen}
                    />
                    <Text style={[styles.pillText, on && styles.pillTextOn]}>
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
          {errors.topic ? (
            <Text style={styles.fieldError} accessibilityLiveRegion="polite">
              {errors.topic}
            </Text>
          ) : null}
        </View>

        <FlowTextField
          label={t("supportMessageLabel")}
          required
          value={message}
          onChangeText={(v) => {
            setMessage(v);
            setSubmitError(null);
            if (errors.message) {
              setErrors((prev) => ({ ...prev, message: undefined }));
            }
          }}
          multiline
          maxCount={SUPPORT_MESSAGE_MAX}
          placeholder={t("supportMessagePlaceholder")}
          error={errors.message}
          editable={!submitting}
        />

        <View style={styles.group}>
          <SectionLabel
            label={t("supportPhotosLabel")}
            meta={
              photos.length
                ? `${photos.length}/${SUPPORT_MAX_PHOTOS}`
                : t("optional")
            }
          />
          {photos.length ? (
            <View style={styles.thumbs}>
              {photos.map((photo, index) => (
                <View key={`${photo.uri}-${index}`} style={styles.thumb}>
                  <AppImage
                    uri={photo.uri}
                    style={styles.thumbImage}
                    resizeMode="cover"
                  />
                  <TouchableOpacity
                    style={styles.thumbRemove}
                    onPress={() => removePhoto(index)}
                    disabled={submitting}
                    hitSlop={10}
                    accessibilityRole="button"
                    accessibilityLabel={t("supportRemovePhoto", {
                      number: index + 1,
                    })}
                  >
                    <MaterialIcons
                      name="close"
                      size={moderateWidthScale(15)}
                      color={theme.white}
                    />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          ) : null}
          {slotsLeft > 0 ? (
            <View style={styles.addRow}>
              {addButtons.map((button) => (
                <TouchableOpacity
                  key={button.key}
                  style={[
                    styles.addButton,
                    addDisabled && styles.addButtonDisabled,
                  ]}
                  onPress={() => void pickPhotos(button.key)}
                  disabled={addDisabled}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  accessibilityState={{ disabled: addDisabled }}
                >
                  <MaterialIcons
                    name={button.icon}
                    size={moderateWidthScale(20)}
                    color={theme.darkGreen}
                  />
                  <Text style={styles.addLabel} numberOfLines={1}>
                    {button.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <Text style={styles.photosHint}>
              {t("supportPhotosFull", { count: SUPPORT_MAX_PHOTOS })}
            </Text>
          )}
          {picking ? <ActivityIndicator color={theme.darkGreen} /> : null}
          {errors.attachments ? (
            <Text style={styles.fieldError} accessibilityLiveRegion="polite">
              {errors.attachments}
            </Text>
          ) : null}
        </View>

        {email ? (
          <InfoNote
            icon="mail-outline"
            text={t("supportReplyTo", { email })}
          />
        ) : null}
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
            label: t("supportSend"),
            onPress: () => void submit(),
            loading: submitting,
            disabled: submitting || picking || !ready,
          }}
          hint={
            ready
              ? null
              : topicsFailed
                ? t("supportSendHintNoTopic")
                : t("supportSendHint")
          }
          progress={
            progress != null
              ? {
                  label: t("supportSending", { percent: progress }),
                  percent: progress,
                }
              : null
          }
        />
      </View>
    </View>
  );
}
