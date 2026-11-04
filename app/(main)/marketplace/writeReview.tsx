import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useAppDispatch, useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  heightScale,
  moderateHeightScale,
  moderateWidthScale,
  widthScale,
} from "@/src/theme/dimensions";
import AppImage from "@/src/components/AppImage";
import ImagePickerModal from "@/src/components/imagePickerModal";
import FlowHeader from "@/src/components/reelFlow/flowHeader";
import FlowFooter from "@/src/components/reelFlow/flowFooter";
import {
  FlowCard,
  FlowTitle,
  InfoNote,
  SectionLabel,
} from "@/src/components/reelFlow/flowParts";
import { FlowTextField } from "@/src/components/reelFlow/detailsFields";
import { StarRating } from "@/src/components/afterVisit/afterVisitParts";
import MarketplaceEmptyState from "@/src/components/marketplace/MarketplaceEmptyState";
import StarRow from "@/src/components/marketplace/detail/StarRow";
import { useNotificationContext } from "@/src/contexts/NotificationContext";
import { openFullImageModal } from "@/src/state/slices/generalSlice";
import {
  fetchProductReviews,
  submitProductReview,
} from "@/src/services/marketplaceService";
import { isRequestCanceled } from "@/src/services/api";
import Logger from "@/src/services/logger";
import {
  prepareReviewPhoto,
  ReviewFileTooLargeError,
} from "@/src/utils/reviewMedia";
import type { ProductReview } from "@/src/types/marketplace";

type Step = "rate" | "details" | "review";
const STEPS: Step[] = ["rate", "details", "review"];
const COMMENT_MAX = 2000;
const RATING_LABEL_KEYS = [
  "",
  "mpRevRating1",
  "mpRevRating2",
  "mpRevRating3",
  "mpRevRating4",
  "mpRevRating5",
] as const;

type Photo = { uri: string; isLocal: boolean };

const THUMB = widthScale(96);

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    content: {
      paddingHorizontal: moderateWidthScale(20),
      paddingTop: moderateHeightScale(12),
      paddingBottom: moderateHeightScale(24),
      gap: moderateHeightScale(18),
    },
    productRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(12),
      padding: moderateWidthScale(12),
    },
    productThumb: {
      width: widthScale(52),
      height: widthScale(52),
      borderRadius: moderateWidthScale(12),
      overflow: "hidden",
      backgroundColor: theme.surfaceRaised,
    },
    fill: {
      width: "100%",
      height: "100%",
    },
    productName: {
      flex: 1,
      fontSize: fontSize.size16,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    starsBlock: {
      alignItems: "center",
      gap: moderateHeightScale(10),
      paddingVertical: moderateHeightScale(12),
    },
    ratingLabel: {
      minHeight: fontSize.size20 * 1.4,
      fontSize: fontSize.size20,
      fontFamily: fonts.fontBold,
      color: theme.selectCard,
      textAlign: "center",
    },
    photoRow: {
      flexDirection: "row",
      gap: moderateWidthScale(12),
    },
    photoTile: {
      width: THUMB,
      height: THUMB,
      borderRadius: moderateWidthScale(14),
      overflow: "hidden",
      backgroundColor: theme.white,
    },
    addTile: {
      width: THUMB,
      height: THUMB,
      borderRadius: moderateWidthScale(14),
      borderWidth: 1.5,
      borderStyle: "dashed",
      borderColor: theme.borderMedium,
      backgroundColor: theme.white,
      alignItems: "center",
      justifyContent: "center",
      gap: moderateHeightScale(4),
    },
    addTileText: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
    },
    removeBtn: {
      position: "absolute",
      top: moderateWidthScale(4),
      right: moderateWidthScale(4),
      width: widthScale(28),
      height: widthScale(28),
      borderRadius: widthScale(14),
      backgroundColor: theme.white,
      alignItems: "center",
      justifyContent: "center",
    },
    photoHint: {
      flex: 1,
      alignSelf: "center",
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      lineHeight: fontSize.size14 * 1.45,
    },
    errorRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(6),
    },
    errorText: {
      flex: 1,
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.red,
    },
    summaryCard: {
      paddingHorizontal: moderateWidthScale(16),
      paddingVertical: moderateHeightScale(4),
    },
    summaryRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: moderateWidthScale(12),
      paddingVertical: moderateHeightScale(14),
    },
    summaryDivider: {
      height: 1,
      backgroundColor: theme.borderLight,
    },
    summaryBody: {
      flex: 1,
      gap: moderateHeightScale(6),
    },
    summaryLabel: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontMedium,
      color: theme.lightGreen,
    },
    summaryValue: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontRegular,
      color: theme.darkGreen,
      lineHeight: fontSize.size15 * 1.45,
    },
    summaryMuted: {
      color: theme.lightGreen5,
    },
    starsLine: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(8),
    },
    starsLineText: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    changeBtn: {
      minHeight: heightScale(44),
      paddingHorizontal: moderateWidthScale(6),
      justifyContent: "center",
    },
    changeText: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontBold,
      color: theme.selectCard,
    },
    smallThumb: {
      width: widthScale(64),
      height: widthScale(64),
      borderRadius: moderateWidthScale(10),
      overflow: "hidden",
      backgroundColor: theme.surfaceRaised,
    },
    centered: {
      flex: 1,
      justifyContent: "center",
    },
  });

/**
 * Write / edit a product review, one step at a time:
 * 1 stars → 2 comment + photo (optional) → 3 check and post.
 * Posting again replaces the customer's review (one per product).
 */
export default function MarketplaceWriteReviewScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { showBanner } = useNotificationContext();
  const params = useLocalSearchParams<{
    productId?: string;
    productName?: string;
    imageUrl?: string;
  }>();
  const productId = params.productId;
  const productName = params.productName || "";
  const imageUrl = params.imageUrl || null;

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [eligible, setEligible] = useState(true);
  const [existing, setExisting] = useState<ProductReview | null>(null);

  const [step, setStep] = useState<Step>("rate");
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [photo, setPhoto] = useState<Photo | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const commentRef = useRef<TextInput>(null);

  const isEdit = !!existing;
  const stepIndex = STEPS.indexOf(step);

  // ── Load the customer's review (prefill) and whether they may review
  const load = useCallback(async () => {
    if (!productId) {
      setLoading(false);
      setLoadError(true);
      return;
    }
    setLoading(true);
    try {
      const page = await fetchProductReviews(productId, { perPage: 1 });
      const mine = page.myReview;
      setExisting(mine);
      setEligible(page.canReview || !!mine);
      if (mine) {
        setRating(mine.rating);
        setComment(mine.comment ?? "");
        setPhoto(mine.photoUrl ? { uri: mine.photoUrl, isLocal: false } : null);
      }
      setLoadError(false);
    } catch (err) {
      if (isRequestCanceled(err)) return;
      Logger.error("Review prefill failed:", err);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    void load();
  }, [load]);

  // ── Navigation between steps
  const goBack = useCallback(() => {
    if (submitting) return;
    Keyboard.dismiss();
    if (stepIndex > 0) setStep(STEPS[stepIndex - 1]);
    else router.back();
  }, [router, stepIndex, submitting]);

  // Android back goes one step back
  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (submitting || stepIndex > 0) {
        goBack();
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [goBack, stepIndex, submitting]);

  const goNext = useCallback(() => {
    Keyboard.dismiss();
    if (stepIndex < STEPS.length - 1) setStep(STEPS[stepIndex + 1]);
  }, [stepIndex]);

  // ── Submit
  const submit = useCallback(async () => {
    if (!productId || submitting || rating < 1) return;
    setSubmitting(true);
    try {
      let file: { uri: string; name: string; type: string } | null = null;
      if (photo?.isLocal) {
        setPreparing(true);
        try {
          file = await prepareReviewPhoto(photo.uri);
        } catch (error) {
          if (error instanceof ReviewFileTooLargeError) {
            setPhoto(null);
            setPhotoError(t("rvPhotoTooLarge"));
            setStep("details");
            return;
          }
          throw error;
        } finally {
          setPreparing(false);
        }
      }
      const trimmed = comment.trim();
      await submitProductReview(productId, {
        rating,
        // Editing: an emptied comment is cleared; a new review just leaves it out
        comment: trimmed !== "" ? trimmed : isEdit ? "" : null,
        photo: file,
        removePhoto: !file && !photo && !!existing?.photoUrl,
      });
      showBanner(
        isEdit ? t("mpRevUpdated") : t("mpRevPosted"),
        t("mpRevThanks"),
        "success",
      );
      router.back();
    } catch (err: any) {
      if (isRequestCanceled(err)) return;
      const errors = err?.data?.errors;
      const fieldMessage =
        errors && typeof errors === "object"
          ? (Object.values(errors) as unknown[])
              .map((v) => (Array.isArray(v) ? v[0] : v))
              .find((v): v is string => typeof v === "string" && v !== "")
          : null;
      showBanner(
        t("mpRevSubmitFailed"),
        fieldMessage || err?.data?.message || err?.message || t("somethingWentWrong"),
        "error",
      );
    } finally {
      setSubmitting(false);
    }
  }, [comment, existing, isEdit, photo, productId, rating, router, showBanner, submitting, t]);

  // ── Pieces
  const productRow =
    productName || imageUrl ? (
      <FlowCard style={styles.productRow}>
        <View style={styles.productThumb}>
          {imageUrl ? (
            <AppImage uri={imageUrl} style={styles.fill} contentFit="cover" />
          ) : null}
        </View>
        <Text style={styles.productName} numberOfLines={2}>
          {productName}
        </Text>
      </FlowCard>
    ) : null;

  const ratingLabel = rating > 0 ? t(RATING_LABEL_KEYS[rating]) : "";

  const viewPhoto = (uri: string) =>
    dispatch(openFullImageModal({ images: [uri], initialIndex: 0 }));

  const renderRate = () => (
    <ScrollView
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {productRow}
      <FlowTitle
        title={t("mpRevStepRateTitle")}
        subtitle={t("mpRevPickStars")}
      />
      <View style={styles.starsBlock}>
        <StarRating value={rating} onChange={setRating} />
        <Text style={styles.ratingLabel} accessibilityLiveRegion="polite">
          {ratingLabel}
        </Text>
      </View>
    </ScrollView>
  );

  const renderDetails = () => (
    <KeyboardAwareScrollView
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="interactive"
      bottomOffset={moderateHeightScale(32)}
    >
      <FlowTitle
        title={t("mpRevStepMoreTitle")}
        subtitle={t("mpRevStepMoreSubtitle")}
      />
      <FlowTextField
        ref={commentRef}
        label={t("mpRevCommentLabel")}
        placeholder={t("mpRevCommentPlaceholder")}
        value={comment}
        onChangeText={setComment}
        maxCount={COMMENT_MAX}
        multiline
        textAlignVertical="top"
        autoCapitalize="sentences"
        editable={!submitting}
      />
      <View style={{ gap: moderateHeightScale(10) }}>
        <SectionLabel label={t("rvPhoto")} meta={t("optional")} />
        <View style={styles.photoRow}>
          {photo ? (
            <View style={styles.photoTile}>
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => viewPhoto(photo.uri)}
                style={styles.fill}
                accessibilityRole="imagebutton"
                accessibilityLabel={t("rvViewPhoto")}
              >
                <AppImage uri={photo.uri} style={styles.fill} contentFit="cover" />
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => {
                  setPhoto(null);
                  setPhotoError(null);
                }}
                style={styles.removeBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="button"
                accessibilityLabel={t("rvRemovePhoto")}
              >
                <MaterialIcons
                  name="close"
                  size={moderateWidthScale(18)}
                  color={theme.red}
                />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              activeOpacity={0.75}
              onPress={() => setPickerOpen(true)}
              style={[styles.addTile, photoError ? { borderColor: theme.red } : null]}
              accessibilityRole="button"
              accessibilityLabel={t("rvAddPhoto")}
            >
              <MaterialIcons
                name="add-a-photo"
                size={moderateWidthScale(26)}
                color={theme.buttonBack}
              />
              <Text style={styles.addTileText}>{t("rvAddPhoto")}</Text>
            </TouchableOpacity>
          )}
          <Text style={styles.photoHint}>{t("mpRevPhotoHint")}</Text>
        </View>
        {photoError ? (
          <View style={styles.errorRow} accessibilityRole="alert">
            <MaterialIcons
              name="error-outline"
              size={moderateWidthScale(16)}
              color={theme.red}
            />
            <Text style={styles.errorText}>{photoError}</Text>
          </View>
        ) : null}
      </View>
    </KeyboardAwareScrollView>
  );

  const changeButton = (target: Step, label: string) => (
    <TouchableOpacity
      activeOpacity={0.6}
      onPress={() => setStep(target)}
      disabled={submitting}
      style={styles.changeBtn}
      accessibilityRole="button"
      accessibilityLabel={`${t("change")} ${label}`}
    >
      <Text style={styles.changeText}>{t("change")}</Text>
    </TouchableOpacity>
  );

  const renderReview = () => {
    const trimmed = comment.trim();
    return (
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <FlowTitle
          title={t("mpRevStepReviewTitle")}
          subtitle={t("mpRevStepReviewSubtitle")}
        />
        {productRow}
        <FlowCard style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryBody}>
              <Text style={styles.summaryLabel}>{t("mpRevYourRating")}</Text>
              <View
                style={styles.starsLine}
                accessible
                accessibilityLabel={`${t("avStarsLabel", { count: rating })}, ${ratingLabel}`}
              >
                <StarRow value={rating} size={moderateWidthScale(20)} />
                <Text style={styles.starsLineText}>{ratingLabel}</Text>
              </View>
            </View>
            {changeButton("rate", t("mpRevYourRating"))}
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryRow}>
            <View style={styles.summaryBody}>
              <Text style={styles.summaryLabel}>{t("mpRevCommentLabel")}</Text>
              <Text
                style={[styles.summaryValue, !trimmed && styles.summaryMuted]}
              >
                {trimmed || t("mpRevNoComment")}
              </Text>
            </View>
            {changeButton("details", t("mpRevCommentLabel"))}
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryRow}>
            <View style={styles.summaryBody}>
              <Text style={styles.summaryLabel}>{t("rvPhoto")}</Text>
              {photo ? (
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => viewPhoto(photo.uri)}
                  style={styles.smallThumb}
                  accessibilityRole="imagebutton"
                  accessibilityLabel={t("rvViewPhoto")}
                >
                  <AppImage uri={photo.uri} style={styles.fill} contentFit="cover" />
                </TouchableOpacity>
              ) : (
                <Text style={[styles.summaryValue, styles.summaryMuted]}>
                  {t("mpRevNoPhoto")}
                </Text>
              )}
            </View>
            {changeButton("details", t("rvPhoto"))}
          </View>
        </FlowCard>
        <InfoNote icon="verified" text={t("mpRevPublicNote")} />
      </ScrollView>
    );
  };

  // ── Screen
  const header = (
    <FlowHeader
      title={isEdit ? t("mpRevEditTitle") : t("writeAReview")}
      step={!loading && eligible && !loadError ? { current: stepIndex + 1, total: STEPS.length } : null}
      onBack={goBack}
      backDisabled={submitting}
      backIcon={stepIndex === 0 ? "close" : "back"}
    />
  );

  if (loading) {
    return (
      <View style={styles.container}>
        {header}
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={theme.darkGreen} />
        </View>
      </View>
    );
  }

  if (loadError || !eligible) {
    return (
      <View style={styles.container}>
        {header}
        <View style={styles.centered}>
          {loadError ? (
            <MarketplaceEmptyState
              icon="wifi-off"
              title={t("somethingWentWrong")}
              actionLabel={t("retry")}
              onAction={() => void load()}
            />
          ) : (
            <MarketplaceEmptyState
              icon="star-off-outline"
              title={t("mpRevNotYetTitle")}
              message={t("mpRevNotYetMessage")}
              actionLabel={t("back")}
              onAction={() => router.back()}
            />
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {header}
      <View style={{ flex: 1 }}>
        {step === "rate"
          ? renderRate()
          : step === "details"
            ? renderDetails()
            : renderReview()}
      </View>
      {step === "review" ? (
        <FlowFooter
          primary={{
            label: isEdit ? t("mpRevUpdate") : t("mpRevSubmit"),
            onPress: () => void submit(),
            loading: submitting,
            disabled: submitting || rating < 1,
            icon: "send",
          }}
          progress={preparing ? { label: t("rvPreparingPhoto"), percent: null } : null}
        />
      ) : (
        <FlowFooter
          primary={{
            label: t("next"),
            onPress: goNext,
            disabled: step === "rate" && rating < 1,
            trailingIcon: "chevron-right",
          }}
          hint={step === "rate" && rating < 1 ? t("mpRevPickStars") : null}
        />
      )}

      <ImagePickerModal
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        title={t("rvAddPhoto")}
        quality={1}
        onImageSelected={(uri) => {
          setPhotoError(null);
          setPhoto({ uri, isLocal: true });
        }}
      />
    </View>
  );
}
