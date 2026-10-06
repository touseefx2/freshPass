import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { MaterialIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Button from "@/src/components/button";
import HairPipelineProcessingModal, {
  INITIAL_HAIR_PIPELINE_STATE,
  type HairPipelineModalState,
} from "@/src/components/HairPipelineProcessingModal";
import ModalizeBottomSheet from "@/src/components/modalizeBottomSheet";
import StackHeader from "@/src/components/StackHeader";
import { useNotificationContext } from "@/src/contexts/NotificationContext";
import { useAppDispatch, useAppSelector, useTheme } from "@/src/hooks/hooks";
import { ApiService } from "@/src/services/api";
import { businessEndpoints } from "@/src/services/endpoints";
import Logger from "@/src/services/logger";
import {
  getMediaLimits,
  MAX_VIDEO_UPLOAD_SECONDS,
  uploadImage,
  uploadVideo,
  waitForMediaReady,
} from "@/src/services/mediaLibraryService";
import {
  handleCameraPermission,
  handleMediaLibraryPermission,
} from "@/src/services/mediaPermissionService";
import {
  generateReelFromTemplate,
  listReelTemplates,
} from "@/src/services/reelsService";
import { fetchUserStatus } from "@/src/state/thunks/businessThunks";
import { fetchStaffBusinessCategory } from "@/src/services/staffBusinessService";
import {
  formatReelsResetDate,
  monthlyReelsBlockedMessage,
} from "@/src/services/monthlyReelsService";
import { Theme } from "@/src/theme/colors";
import {
  iconScale,
  moderateHeightScale,
  moderateWidthScale,
  widthScale,
} from "@/src/theme/dimensions";
import { fontSize, fonts } from "@/src/theme/fonts";
import type { MediaUploadSourceType, MediaVideo } from "@/src/types/media";
import type {
  ReelTemplate,
  ReelTemplateMediaField,
} from "@/src/types/reels";
import { normalizeReelTemplateMediaFields } from "@/src/types/reels";
import { isLikelyVideoUri } from "@/src/utils/prepareImageForUpload";
import { LinearGradient } from "expo-linear-gradient";

const iosCompatiblePickerOptions =
  Platform.OS === "ios"
    ? {
        preferredAssetRepresentationMode:
          ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
      }
    : {};

/** Still images uploaded as media assets — no duration_seconds on POST /api/media. */

function slotAcceptsImage(field: ReelTemplateMediaField | undefined): boolean {
  return field?.accepted_types?.includes("image") ?? true;
}

function slotAcceptsVideo(field: ReelTemplateMediaField | undefined): boolean {
  return field?.accepted_types?.includes("video") ?? true;
}

function mediaRequirementLabel(
  fields: ReelTemplateMediaField[],
  t: (key: string, options?: Record<string, unknown>) => string,
): string {
  const count = fields.length;
  if (count === 0) return "";
  const hasImage = fields.some((f) => f.accepted_types.includes("image"));
  const hasVideo = fields.some((f) => f.accepted_types.includes("video"));
  if (hasImage && !hasVideo) {
    return count === 1
      ? t("photosNeededImagesOne")
      : t("photosNeededImages", { count });
  }
  if (hasVideo && !hasImage) {
    return count === 1
      ? t("videosNeededOne")
      : t("videosNeeded", { count });
  }
  return count === 1
    ? t("photosNeededOne")
    : t("photosNeeded", { count });
}

function slotTypeHint(
  field: ReelTemplateMediaField,
  t: (key: string) => string,
): string {
  const hasImage = field.accepted_types.includes("image");
  const hasVideo = field.accepted_types.includes("video");
  if (hasImage && !hasVideo) return t("slotAcceptsPhoto");
  if (hasVideo && !hasImage) return t("slotAcceptsVideo");
  return t("slotAcceptsPhotoOrVideo");
}

type CategoryOption = { id: number; name: string };

const TEXT_FIELD_LABELS: Record<string, string> = {
  business_name: "businessNameField",
  tagline: "taglineField",
  deal_text: "dealTextField",
  service_name: "serviceNameField",
  product_name: "productNameField",
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.background,
    },
    flex: { flex: 1 },
    content: {
      paddingTop: moderateHeightScale(14),
      paddingBottom: moderateHeightScale(32),
    },
    loader: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    heroShadow: {
      marginHorizontal: moderateWidthScale(20),
      marginBottom: moderateHeightScale(18),
      borderRadius: moderateWidthScale(18),
      backgroundColor: theme.background,
      shadowColor: theme.darkGreen,
      shadowOffset: { width: 0, height: moderateHeightScale(6) },
      shadowOpacity: 0.22,
      shadowRadius: moderateWidthScale(12),
      elevation: 8,
    },
    heroCard: {
      borderRadius: moderateWidthScale(18),
      overflow: "hidden",
      borderWidth: 1,
      borderColor: theme.lightGreen4,
    },
    heroGradient: {
      paddingHorizontal: moderateWidthScale(18),
      paddingVertical: moderateHeightScale(18),
    },
    heroHighlight: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      height: "45%",
    },
    heroRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(14),
    },
    heroIconWrap: {
      width: moderateWidthScale(52),
      height: moderateWidthScale(52),
      borderRadius: moderateWidthScale(26),
      backgroundColor: theme.white15,
      borderWidth: 1,
      borderColor: theme.white50,
      alignItems: "center",
      justifyContent: "center",
    },
    heroTextCol: {
      flex: 1,
      gap: moderateHeightScale(4),
    },
    heroTitle: {
      fontSize: fontSize.size18,
      fontFamily: fonts.fontBold,
      color: theme.white,
    },
    heroSubtitle: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.white80,
      lineHeight: fontSize.size16,
    },
    quotaBanner: {
      marginHorizontal: moderateWidthScale(20),
      marginBottom: moderateHeightScale(14),
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(8),
      paddingHorizontal: moderateWidthScale(12),
      paddingVertical: moderateHeightScale(10),
      borderRadius: moderateWidthScale(12),
      borderWidth: 1,
      borderColor: theme.borderLight,
      backgroundColor: theme.lightGreen07,
    },
    quotaBannerLow: {
      borderColor: theme.orangeBrown30,
      backgroundColor: theme.orangeBrown015,
    },
    quotaBannerEmpty: {
      borderColor: theme.lightRedBorder,
      backgroundColor: theme.lightRed,
    },
    quotaText: {
      flex: 1,
      fontSize: fontSize.size12,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
      lineHeight: fontSize.size16,
    },
    pickerBlock: {
      paddingHorizontal: moderateWidthScale(20),
      marginBottom: moderateHeightScale(8),
    },
    dropdownShadow: {
      borderRadius: moderateWidthScale(14),
      backgroundColor: theme.background,
      shadowColor: theme.darkGreen,
      shadowOffset: { width: 0, height: moderateHeightScale(3) },
      shadowOpacity: 0.12,
      shadowRadius: moderateWidthScale(8),
      elevation: 4,
      marginBottom: moderateHeightScale(4),
    },
    dropdownShell: {
      borderRadius: moderateWidthScale(14),
      borderWidth: 1,
      borderColor: theme.borderLight,
      backgroundColor: theme.white,
      overflow: "hidden",
    },
    dropdownRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: moderateWidthScale(12),
      paddingVertical: moderateHeightScale(14),
      gap: moderateWidthScale(10),
    },
    dropdownIconWrap: {
      width: moderateWidthScale(34),
      height: moderateWidthScale(34),
      borderRadius: moderateWidthScale(10),
      backgroundColor: theme.lightGreen07,
      alignItems: "center",
      justifyContent: "center",
    },
    dropdownValue: {
      flex: 1,
      fontSize: fontSize.size14,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    dropdownPlaceholder: {
      flex: 1,
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen5,
    },
    dropdownList: {
      borderTopWidth: 1,
      borderTopColor: theme.borderLight,
      maxHeight: moderateHeightScale(220),
    },
    dropdownListState: {
      borderTopWidth: 1,
      borderTopColor: theme.borderLight,
      paddingVertical: moderateHeightScale(20),
      paddingHorizontal: moderateWidthScale(16),
      alignItems: "center",
      justifyContent: "center",
      gap: moderateHeightScale(8),
      minHeight: moderateHeightScale(88),
    },
    dropdownListStateText: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      textAlign: "center",
    },
    dropdownRetryButton: {
      marginTop: moderateHeightScale(4),
      paddingHorizontal: moderateWidthScale(18),
      paddingVertical: moderateHeightScale(10),
      borderRadius: moderateWidthScale(10),
      backgroundColor: theme.buttonBack,
      minWidth: widthScale(120),
      alignItems: "center",
    },
    dropdownRetryText: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontBold,
      color: theme.buttonText,
    },
    dropdownOption: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: moderateWidthScale(14),
      paddingVertical: moderateHeightScale(12),
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.borderLight,
    },
    dropdownOptionActive: {
      backgroundColor: theme.lightGreen07,
    },
    dropdownOptionText: {
      flex: 1,
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: theme.darkGreen,
      paddingRight: moderateWidthScale(8),
    },
    dropdownOptionTextActive: {
      fontFamily: fonts.fontBold,
    },
    label: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
      marginBottom: moderateHeightScale(6),
    },
    sectionTitleSm: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      marginBottom: moderateHeightScale(10),
      textTransform: "uppercase",
      letterSpacing: 0.4,
    },
    section: {
      marginBottom: moderateHeightScale(18),
      paddingHorizontal: moderateWidthScale(20),
    },
    reqShadow: {
      marginHorizontal: moderateWidthScale(20),
      marginTop: moderateHeightScale(18),
      marginBottom: moderateHeightScale(18),
      borderRadius: moderateWidthScale(16),
      backgroundColor: theme.background,
      shadowColor: theme.darkGreen,
      shadowOffset: { width: 0, height: moderateHeightScale(3) },
      shadowOpacity: 0.1,
      shadowRadius: moderateWidthScale(8),
      elevation: 3,
    },
    reqCard: {
      backgroundColor: theme.white,
      borderRadius: moderateWidthScale(16),
      borderWidth: 1,
      borderColor: theme.borderLight,
      paddingHorizontal: moderateWidthScale(14),
      paddingVertical: moderateHeightScale(14),
      gap: moderateHeightScale(10),
      overflow: "hidden",
    },
    reqHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(8),
      marginBottom: moderateHeightScale(2),
    },
    reqIconBadge: {
      width: moderateWidthScale(28),
      height: moderateWidthScale(28),
      borderRadius: moderateWidthScale(8),
      backgroundColor: theme.lightGreen07,
      alignItems: "center",
      justifyContent: "center",
    },
    reqTitle: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    reqChips: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: moderateWidthScale(8),
    },
    reqChip: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(6),
      backgroundColor: theme.lightGreen07,
      borderRadius: moderateWidthScale(20),
      paddingHorizontal: moderateWidthScale(10),
      paddingVertical: moderateHeightScale(6),
      borderWidth: 1,
      borderColor: theme.borderLight,
      maxWidth: "100%",
    },
    reqChipText: {
      fontSize: fontSize.size11,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
      flexShrink: 1,
    },
    emptyState: {
      marginHorizontal: moderateWidthScale(20),
      marginTop: moderateHeightScale(8),
      alignItems: "center",
      paddingVertical: moderateHeightScale(28),
      paddingHorizontal: moderateWidthScale(16),
      borderRadius: moderateWidthScale(16),
      borderWidth: 1,
      borderColor: theme.borderLight,
      backgroundColor: theme.white,
      gap: moderateHeightScale(10),
    },
    emptyStateIcon: {
      width: moderateWidthScale(56),
      height: moderateWidthScale(56),
      borderRadius: moderateWidthScale(28),
      backgroundColor: theme.lightGreen07,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: moderateHeightScale(4),
    },
    emptyStateTitle: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      textAlign: "center",
    },
    emptyStateText: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      textAlign: "center",
      lineHeight: fontSize.size18,
    },
    slotsRow: {
      gap: moderateHeightScale(10),
    },
    slotCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(12),
      borderWidth: 1,
      borderColor: theme.borderLight,
      borderRadius: moderateWidthScale(14),
      paddingHorizontal: moderateWidthScale(12),
      paddingVertical: moderateHeightScale(12),
      backgroundColor: theme.white,
      shadowColor: theme.darkGreen,
      shadowOffset: { width: 0, height: moderateHeightScale(2) },
      shadowOpacity: 0.06,
      shadowRadius: moderateWidthScale(6),
      elevation: 2,
    },
    slotCardEmpty: {
      borderStyle: "dashed",
      borderColor: theme.lightGreen4,
      backgroundColor: theme.lightGreen05,
      shadowOpacity: 0,
      elevation: 0,
    },
    slotThumb: {
      width: widthScale(56),
      height: widthScale(56),
      borderRadius: moderateWidthScale(12),
      backgroundColor: theme.lightGreen07,
    },
    slotThumbPlaceholder: {
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: theme.borderLight,
      borderStyle: "dashed",
    },
    slotTextCol: {
      flex: 1,
      gap: moderateHeightScale(2),
    },
    slotTitle: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    slotSub: {
      fontSize: fontSize.size11,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
    },
    slotChevron: {
      width: moderateWidthScale(28),
      height: moderateWidthScale(28),
      borderRadius: moderateWidthScale(14),
      backgroundColor: theme.lightGreen07,
      alignItems: "center",
      justifyContent: "center",
    },
    input: {
      borderWidth: 1,
      borderColor: theme.borderLight,
      borderRadius: moderateWidthScale(14),
      paddingHorizontal: moderateWidthScale(14),
      paddingVertical: moderateHeightScale(12),
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.darkGreen,
      backgroundColor: theme.white,
      marginBottom: moderateHeightScale(10),
    },
    textArea: {
      minHeight: moderateHeightScale(96),
      textAlignVertical: "top",
      lineHeight: fontSize.size18,
    },
    charCount: {
      alignSelf: "flex-end",
      fontSize: fontSize.size10,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen5,
      marginTop: moderateHeightScale(-6),
      marginBottom: moderateHeightScale(10),
    },
    categoryShell: {
      borderRadius: moderateWidthScale(14),
      borderWidth: 1,
      borderColor: theme.borderLight,
      backgroundColor: theme.white,
      overflow: "hidden",
    },
    categoryRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: moderateWidthScale(14),
      paddingVertical: moderateHeightScale(14),
      gap: moderateWidthScale(8),
    },
    categoryText: {
      flex: 1,
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.darkGreen,
    },
    categoryOption: {
      paddingHorizontal: moderateWidthScale(14),
      paddingVertical: moderateHeightScale(12),
      borderTopWidth: 1,
      borderTopColor: theme.borderLight,
    },
    categoryOptionText: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: theme.darkGreen,
    },
    footer: {
      paddingHorizontal: moderateWidthScale(20),
      paddingTop: moderateHeightScale(12),
      paddingBottom: moderateHeightScale(12),
      borderTopWidth: 1,
      borderTopColor: theme.borderLight,
      backgroundColor: theme.background,
    },
    emptyWrap: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: moderateWidthScale(32),
    },
    emptyTitle: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      textAlign: "center",
      marginBottom: moderateHeightScale(6),
    },
    emptySubtitle: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      textAlign: "center",
    },
    optionItem: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: moderateHeightScale(16),
      borderBottomWidth: 1,
      borderBottomColor: theme.borderLight,
    },
    optionItemLast: {
      borderBottomWidth: 0,
    },
    optionIcon: {
      marginRight: moderateWidthScale(16),
    },
    optionText: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontRegular,
      color: theme.darkGreen,
      flex: 1,
    },
    optionTitle: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontRegular,
      color: theme.darkGreen,
    },
    optionDesc: {
      fontSize: fontSize.size11,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      marginTop: moderateHeightScale(2),
    },
    optionTextCol: {
      flex: 1,
    },
    uploadingOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: theme.borderDark,
      alignItems: "center",
      justifyContent: "center",
      zIndex: 20,
      gap: moderateHeightScale(12),
      paddingHorizontal: moderateWidthScale(24),
    },
    uploadingText: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontMedium,
      color: theme.white,
      textAlign: "center",
    },
  });

function formatMusicName(name: string | null): string {
  if (!name?.trim()) return "";
  return name.replace(/\.(mp3|wav|m4a|aac)$/i, "").replace(/-/g, " ");
}

export default function ReelTemplatesScreen() {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { showBanner } = useNotificationContext();
  const dispatch = useAppDispatch();

  const businessName = useAppSelector(
    (s) => s.user.business_name || s.user.businessStatus?.business_name || "",
  );
  const businessStatus = useAppSelector((s) => s.user.businessStatus);
  const userRole = useAppSelector((s) => s.user.userRole);
  const userBusinessId = useAppSelector(
    (s) => s.user.business_id ?? s.user.businessStatus?.business_id ?? null,
  );
  const completeProfileCategory = useAppSelector(
    (s) => s.completeProfile.businessCategory,
  );
  const selectBsnsCategory = useAppSelector((s) => s.user.selectBsnsCategory);
  // Staff: their owner's business category (they have no business status of their own)
  const [staffBusinessCategory, setStaffBusinessCategory] = useState<{
    id: number;
    name: string;
  } | null>(null);

  const resolvedBusinessCategory = useMemo(() => {
    if (businessStatus?.business_category?.id != null) {
      return businessStatus.business_category;
    }
    if (userRole === "staff") return staffBusinessCategory;
    if (completeProfileCategory?.id != null) {
      return completeProfileCategory;
    }
    const fromSelect = selectBsnsCategory?.[0];
    if (fromSelect?.id != null) return fromSelect;
    return null;
  }, [
    businessStatus?.business_category,
    userRole,
    staffBusinessCategory,
    completeProfileCategory,
    selectBsnsCategory,
  ]);

  const [templates, setTemplates] = useState<ReelTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [templatesError, setTemplatesError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const [texts, setTexts] = useState<Record<string, string>>({});
  const [selectedMedia, setSelectedMedia] = useState<(MediaVideo | null)[]>(
    [],
  );
  const [caption, setCaption] = useState("");
  const [categoryId, setCategoryId] = useState<number | null>(
    resolvedBusinessCategory?.id ?? null,
  );
  const [categoryName, setCategoryName] = useState(
    resolvedBusinessCategory?.name ?? "",
  );
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const userPickedCategoryRef = useRef(false);
  const [submitting, setSubmitting] = useState(false);
  // Monthly reels (12 per business, shared with staff) — template reels count too
  const [reelsRemaining, setReelsRemaining] = useState<number | null>(null);
  const [quotaBlockedMessage, setQuotaBlockedMessage] = useState<string | null>(
    null,
  );
  const [quotaResetLabel, setQuotaResetLabel] = useState<string | null>(null);

  const [mediaPickerSlot, setMediaPickerSlot] = useState<number | null>(null);
  const [sourcePickerVisible, setSourcePickerVisible] = useState(false);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [pipelineModal, setPipelineModal] = useState<HairPipelineModalState>(
    INITIAL_HAIR_PIPELINE_STATE,
  );

  const selected = useMemo(
    () => templates.find((item) => item.id === selectedId) ?? null,
    [selectedId, templates],
  );

  const mediaFields = useMemo(
    () => normalizeReelTemplateMediaFields(selected?.media_fields),
    [selected?.media_fields],
  );

  const activeSlotField = useMemo(
    () =>
      mediaPickerSlot != null ? mediaFields[mediaPickerSlot] : undefined,
    [mediaFields, mediaPickerSlot],
  );

  const applyTemplate = useCallback(
    (template: ReelTemplate) => {
      setSelectedId(template.id);
      setDropdownOpen(false);
      const fields = normalizeReelTemplateMediaFields(template.media_fields);
      const count =
        template.media_count || fields.length || 0;
      setSelectedMedia(Array.from({ length: count }, () => null));
      const initialTexts: Record<string, string> = {};
      for (const field of template.text_fields || []) {
        initialTexts[field] = field === "business_name" ? businessName : "";
      }
      setTexts(initialTexts);
    },
    [businessName],
  );

  const loadTemplates = useCallback(async () => {
    setLoadingTemplates(true);
    setTemplatesError(null);
    try {
      const data = await listReelTemplates();
      const active = data.filter((item) => item.is_active !== false);
      setTemplates(active);
      if (active.length === 1) {
        applyTemplate(active[0]);
      }
    } catch (error: any) {
      Logger.error("Failed to load reel templates:", error);
      setTemplates([]);
      setTemplatesError(
        error?.message || t("failedToLoadTemplates"),
      );
    } finally {
      setLoadingTemplates(false);
    }
  }, [applyTemplate, t]);

  /** Returns the blocked message, "" when the user can post, null if it couldn't load. */
  const loadReelLimits = useCallback(async (): Promise<string | null> => {
    try {
      const limits = await getMediaLimits({ force: true });
      const blocked = monthlyReelsBlockedMessage(limits, t);
      if (typeof limits.reels_remaining_this_month === "number") {
        setReelsRemaining(limits.reels_remaining_this_month);
      }
      setQuotaBlockedMessage(blocked);
      setQuotaResetLabel(formatReelsResetDate(limits.monthly_reels_reset_on));
      return blocked ?? "";
    } catch (error) {
      Logger.error("Failed to load media limits for template reel:", error);
      return null;
    }
  }, [t]);

  useEffect(() => {
    void loadReelLimits();
  }, [loadReelLimits]);

  useEffect(() => {
    if (userRole !== "staff") return;
    fetchStaffBusinessCategory(userBusinessId)
      .then(setStaffBusinessCategory)
      .catch((error) => {
        Logger.error("Failed to load staff business category:", error);
      });
  }, [userRole, userBusinessId]);

  useEffect(() => {
    void loadTemplates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (resolvedBusinessCategory?.id != null) return;
    void dispatch(fetchUserStatus({ showError: false }));
  }, [dispatch, resolvedBusinessCategory?.id]);

  useEffect(() => {
    if (userPickedCategoryRef.current) return;
    if (!resolvedBusinessCategory?.id) return;
    setCategoryId(resolvedBusinessCategory.id);
    setCategoryName(resolvedBusinessCategory.name ?? "");
  }, [resolvedBusinessCategory]);

  const fieldLabel = useCallback(
    (field: string) => {
      const key = TEXT_FIELD_LABELS[field];
      return key ? t(key) : field.replace(/_/g, " ");
    },
    [t],
  );

  const loadCategories = useCallback(async () => {
    if (categories.length > 0) return categories;
    setLoadingCategories(true);
    try {
      const catRes = await ApiService.get<{
        success: boolean;
        data?: CategoryOption[] | { data?: CategoryOption[] };
      }>(businessEndpoints.categories);
      const catData = Array.isArray(catRes?.data)
        ? catRes.data
        : Array.isArray((catRes?.data as any)?.data)
          ? (catRes.data as any).data
          : [];
      setCategories(catData);
      return catData;
    } catch (error) {
      Logger.error("Failed to load categories:", error);
      return [];
    } finally {
      setLoadingCategories(false);
    }
  }, [categories]);

  const openCategoryPicker = useCallback(async () => {
    setShowCategoryPicker((prev) => !prev);
    if (!showCategoryPicker) await loadCategories();
  }, [loadCategories, showCategoryPicker]);

  const openSourcePicker = useCallback((slotIndex: number) => {
    setMediaPickerSlot(slotIndex);
    setSourcePickerVisible(true);
  }, []);

  const dismissSourcePicker = useCallback(() => {
    setSourcePickerVisible(false);
    setMediaPickerSlot(null);
  }, []);


  const assignMediaToSlot = useCallback(
    (video: MediaVideo, slotIndex: number) => {
      const alreadyUsed = selectedMedia.some(
        (m, idx) => m?.id === video.id && idx !== slotIndex,
      );
      if (alreadyUsed) {
        showBanner(t("error"), t("mediaAlreadySelected"), "error", 2500);
        return false;
      }
      setSelectedMedia((prev) => {
        const next = [...prev];
        next[slotIndex] = video;
        return next;
      });
      return true;
    },
    [selectedMedia, showBanner, t],
  );



  const uploadPickedAsset = useCallback(
    async (
      asset: ImagePicker.ImagePickerAsset,
      sourceType: MediaUploadSourceType,
      slotField: ReelTemplateMediaField | undefined,
    ) => {
      if (mediaPickerSlot == null || !asset.uri) return;

      const slotIndex = mediaPickerSlot;
      setSourcePickerVisible(false);
      setMediaPickerSlot(null);

      const mime = (asset as { mimeType?: string }).mimeType ?? "";
      const isVideo =
        asset.type === "video" ||
        mime.startsWith("video/") ||
        isLikelyVideoUri(asset.uri);

      const acceptsImage = slotAcceptsImage(slotField);
      const acceptsVideo = slotAcceptsVideo(slotField);

      if (isVideo && !acceptsVideo) {
        showBanner(t("error"), t("slotRequiresPhoto"), "error", 3500);
        return;
      }
      if (!isVideo && !acceptsImage) {
        showBanner(t("error"), t("slotRequiresVideo"), "error", 3500);
        return;
      }

      const durationRaw =
        typeof asset.duration === "number" && asset.duration > 0
          ? asset.duration
          : 0;
      // expo-image-picker reports video duration in seconds
      const durationSeconds = isVideo
        ? Math.max(1, Math.ceil(durationRaw))
        : 0;

      if (isVideo && durationSeconds > MAX_VIDEO_UPLOAD_SECONDS) {
        showBanner(
          t("error"),
          t("videoTooLong", { max_seconds: MAX_VIDEO_UPLOAD_SECONDS }),
          "error",
          3000,
        );
        return;
      }

      setUploadingMedia(true);
      try {
        const uploaded = isVideo
          ? await uploadVideo({
              uri: asset.uri,
              mimeType: mime || "video/mp4",
              fileName: asset.fileName || "video.mp4",
              sourceType,
              durationSeconds: Math.min(
                MAX_VIDEO_UPLOAD_SECONDS,
                durationSeconds,
              ),
              width: asset.width,
              height: asset.height,
            })
          : await uploadImage({
              uri: asset.uri,
              mimeType: mime || "image/jpeg",
              fileName: asset.fileName || "photo.jpg",
              sourceType,
              width: asset.width,
              height: asset.height,
            });
        // Images are ready immediately; videos may still need polling
        const ready =
          uploaded.status === "ready"
            ? uploaded
            : await waitForMediaReady(uploaded.id);
        assignMediaToSlot(ready, slotIndex);
      } catch (error: any) {
        Logger.error("Failed to upload media for template slot:", error);
        showBanner(
          t("error"),
          error?.message || t("failedToUploadVideo"),
          "error",
          3500,
        );
      } finally {
        setUploadingMedia(false);
      }
    },
    [assignMediaToSlot, mediaPickerSlot, showBanner, t],
  );

  const handleSelectFromGallery = useCallback(async () => {
    const slotField = activeSlotField;
    setSourcePickerVisible(false);
    const hasPermission = await handleMediaLibraryPermission();
    if (!hasPermission) {
      setMediaPickerSlot(null);
      return;
    }

    const acceptsImage = slotAcceptsImage(slotField);
    const acceptsVideo = slotAcceptsVideo(slotField);
    const mediaTypes: ("images" | "videos")[] =
      acceptsImage && acceptsVideo
        ? ["images", "videos"]
        : acceptsImage
          ? ["images"]
          : ["videos"];

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes,
        allowsMultipleSelection: false,
        quality: 0.8,
        allowsEditing: false,
        ...iosCompatiblePickerOptions,
      });
      if (!result.canceled && result.assets?.[0]) {
        await uploadPickedAsset(result.assets[0], "device", slotField);
      } else {
        setMediaPickerSlot(null);
      }
    } catch (error) {
      Logger.error("Error selecting media from gallery:", error);
      showBanner(t("error"), t("failedToSelectMedia"), "error", 3000);
      setMediaPickerSlot(null);
    }
  }, [activeSlotField, showBanner, t, uploadPickedAsset]);

  const handleSelectFromCamera = useCallback(async () => {
    const slotField = activeSlotField;
    setSourcePickerVisible(false);
    const hasPermission = await handleCameraPermission();
    if (!hasPermission) {
      setMediaPickerSlot(null);
      return;
    }

    const acceptsImage = slotAcceptsImage(slotField);
    const acceptsVideo = slotAcceptsVideo(slotField);
    // Prefer photo when slot allows images; otherwise record video
    const mediaTypes =
      acceptsImage
        ? ImagePicker.MediaTypeOptions.Images
        : ImagePicker.MediaTypeOptions.Videos;

    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes,
        quality: 0.8,
        allowsEditing: false,
        ...(acceptsVideo && !acceptsImage
          ? { videoMaxDuration: MAX_VIDEO_UPLOAD_SECONDS }
          : {}),
        ...iosCompatiblePickerOptions,
      });
      if (!result.canceled && result.assets?.[0]) {
        await uploadPickedAsset(result.assets[0], "camera", slotField);
      } else {
        setMediaPickerSlot(null);
      }
    } catch (error) {
      Logger.error("Error taking photo for template slot:", error);
      showBanner(t("error"), t("failedToTakePhoto"), "error", 3000);
      setMediaPickerSlot(null);
    }
  }, [activeSlotField, showBanner, t, uploadPickedAsset]);

  const noReelsLeft = reelsRemaining != null && reelsRemaining <= 0;
  const fewReelsLeft =
    reelsRemaining != null && reelsRemaining > 0 && reelsRemaining <= 2;

  const canGenerate = useMemo(() => {
    if (!selected) return false;
    if (noReelsLeft) return false;
    if (!caption.trim()) return false;
    if (!categoryId) return false;
    if (selectedMedia.length === 0 || selectedMedia.some((m) => !m)) {
      return false;
    }
    return true;
  }, [caption, categoryId, noReelsLeft, selected, selectedMedia]);

  const handleGenerate = useCallback(async () => {
    if (!selected || !canGenerate || submitting || !categoryId) return;

    const mediaIds = selectedMedia
      .map((m) => m?.id)
      .filter((id): id is number => id != null);

    if (mediaIds.length !== mediaFields.length) {
      showBanner(t("error"), t("selectAllMediaSlots"), "error", 2500);
      return;
    }

    setSubmitting(true);
    try {
      // Fresh monthly limit check before starting (server still answers 422 on `reel`)
      const blocked = await loadReelLimits();
      if (blocked) {
        showBanner(t("monthlyReelsLimitTitle"), blocked, "error", 5000);
        return;
      }

      const textsPayload: Record<string, string> = {};
      for (const field of selected.text_fields || []) {
        const value = (texts[field] || "").trim();
        if (value) textsPayload[field] = value;
      }

      const result = await generateReelFromTemplate({
        template_id: selected.id,
        media_asset_ids: mediaIds,
        texts: textsPayload,
        category_id: categoryId,
        caption: caption.trim(),
        music_asset_id: null,
      });

      // Same success popup as Generate Post / Collage — notify when ready.
      setPipelineModal({
        visible: true,
        jobId: String(result.reel_id),
        jobType: "Generate Reel",
        estimatedMinutes: 2,
        progress: 0,
        imageUri: null,
        complete: false,
      });
    } catch (error: any) {
      Logger.error("Failed to start reel generation:", error);
      const fieldError = (field: string): string | null => {
        const value = error?.data?.errors?.[field];
        return Array.isArray(value) && typeof value[0] === "string"
          ? value[0]
          : null;
      };
      const reelLimitError = fieldError("reel");
      if (reelLimitError) void loadReelLimits();
      const message =
        reelLimitError ||
        fieldError("template_id") ||
        fieldError("media_asset_ids") ||
        fieldError("category_id") ||
        fieldError("caption") ||
        error?.message ||
        t("failedToStartGeneration");
      showBanner(t("error"), message, "error", 4000);
    } finally {
      setSubmitting(false);
    }
  }, [
    canGenerate,
    caption,
    categoryId,
    loadReelLimits,
    mediaFields.length,
    selected,
    selectedMedia,
    showBanner,
    submitting,
    t,
    texts,
  ]);

  const closePipelineModal = useCallback(() => {
    setPipelineModal(INITIAL_HAIR_PIPELINE_STATE);
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(main)/aiTools/toolList" as any);
    }
  }, [router]);

  const mediaLabel =
    selected == null ? "" : mediaRequirementLabel(mediaFields, t);

  const musicLabel = selected
    ? formatMusicName(selected.music_name) || t("includesMusic")
    : "";

  return (
    <View style={[styles.safeArea, { paddingBottom: insets.bottom }]}>
      <StackHeader title={t("reelTemplates")} />

      <KeyboardAwareScrollView
        style={styles.flex}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        bottomOffset={moderateHeightScale(80)}
      >
        <View style={styles.heroShadow}>
          <View style={styles.heroCard}>
            <LinearGradient
              colors={[
                theme.darkGreenLight,
                theme.buttonBack,
                theme.darkGreen,
              ]}
              locations={[0, 0.45, 1]}
              start={{ x: 0.15, y: 0 }}
              end={{ x: 0.85, y: 1 }}
              style={styles.heroGradient}
            >
              <LinearGradient
                colors={[theme.white15, "transparent"]}
                start={{ x: 0.5, y: 0 }}
                end={{ x: 0.5, y: 1 }}
                style={styles.heroHighlight}
                pointerEvents="none"
              />
              <View style={styles.heroRow}>
                <View style={styles.heroIconWrap}>
                  <MaterialIcons
                    name="movie-filter"
                    size={moderateWidthScale(26)}
                    color={theme.white}
                  />
                </View>
                <View style={styles.heroTextCol}>
                  <Text style={styles.heroTitle}>{t("reelTemplatesIntroTitle")}</Text>
                  <Text style={styles.heroSubtitle}>
                    {t("reelTemplatesIntroSubtitle")}
                  </Text>
                </View>
              </View>
            </LinearGradient>
          </View>
        </View>

        {reelsRemaining != null ? (
          <View
            style={[
              styles.quotaBanner,
              fewReelsLeft && styles.quotaBannerLow,
              noReelsLeft && styles.quotaBannerEmpty,
            ]}
            accessibilityRole={noReelsLeft ? "alert" : undefined}
          >
            <MaterialIcons
              name={
                noReelsLeft ? "block" : fewReelsLeft ? "warning-amber" : "info-outline"
              }
              size={moderateWidthScale(18)}
              color={
                noReelsLeft
                  ? theme.red
                  : fewReelsLeft
                    ? theme.orangeBrown
                    : theme.buttonBack
              }
            />
            <Text style={styles.quotaText}>
              {noReelsLeft
                ? quotaBlockedMessage || t("autoReelNoReelsLeft")
                : [
                    t("autoReelReelsLeft", { count: reelsRemaining }),
                    quotaResetLabel
                      ? t("monthlyReelsResets", { date: quotaResetLabel })
                      : null,
                  ]
                    .filter(Boolean)
                    .join(" ")}
            </Text>
          </View>
        ) : null}

        <View style={styles.pickerBlock}>
          <Text style={styles.label}>{t("selectTemplate")}</Text>
          <View style={styles.dropdownShadow}>
            <View style={styles.dropdownShell}>
              <TouchableOpacity
                style={styles.dropdownRow}
                onPress={() => setDropdownOpen((open) => !open)}
                activeOpacity={0.85}
              >
                <View style={styles.dropdownIconWrap}>
                  <MaterialIcons
                    name="movie-creation"
                    size={moderateWidthScale(18)}
                    color={theme.buttonBack}
                  />
                </View>
                <Text
                  style={
                    selected ? styles.dropdownValue : styles.dropdownPlaceholder
                  }
                  numberOfLines={1}
                >
                  {selected?.name || t("selectTemplatePlaceholder")}
                </Text>
                <MaterialIcons
                  name={dropdownOpen ? "expand-less" : "expand-more"}
                  size={moderateWidthScale(22)}
                  color={theme.lightGreen}
                />
              </TouchableOpacity>

              {dropdownOpen ? (
                loadingTemplates ? (
                  <View style={styles.dropdownListState}>
                    <ActivityIndicator color={theme.buttonBack} />
                    <Text style={styles.dropdownListStateText}>
                      {t("loadingTemplates")}
                    </Text>
                  </View>
                ) : templatesError ? (
                  <View style={styles.dropdownListState}>
                    <MaterialIcons
                      name="error-outline"
                      size={moderateWidthScale(22)}
                      color={theme.red}
                    />
                    <Text style={styles.dropdownListStateText}>
                      {templatesError}
                    </Text>
                    <TouchableOpacity
                      style={styles.dropdownRetryButton}
                      onPress={() => void loadTemplates()}
                      activeOpacity={0.85}
                    >
                      <Text style={styles.dropdownRetryText}>{t("retry")}</Text>
                    </TouchableOpacity>
                  </View>
                ) : templates.length === 0 ? (
                  <View style={styles.dropdownListState}>
                    <Text style={styles.dropdownListStateText}>
                      {t("noTemplatesYet")}
                    </Text>
                    <Text style={styles.dropdownListStateText}>
                      {t("noTemplatesSubtitle")}
                    </Text>
                  </View>
                ) : (
                  <FlatList
                    data={templates}
                    keyExtractor={(item) => String(item.id)}
                    style={styles.dropdownList}
                    nestedScrollEnabled
                    keyboardShouldPersistTaps="handled"
                    renderItem={({ item }) => {
                      const active = item.id === selectedId;
                      return (
                        <TouchableOpacity
                          style={[
                            styles.dropdownOption,
                            active && styles.dropdownOptionActive,
                          ]}
                          onPress={() => applyTemplate(item)}
                          activeOpacity={0.85}
                        >
                          <Text
                            style={[
                              styles.dropdownOptionText,
                              active && styles.dropdownOptionTextActive,
                            ]}
                            numberOfLines={2}
                          >
                            {item.name}
                          </Text>
                          {active ? (
                            <MaterialIcons
                              name="check"
                              size={moderateWidthScale(18)}
                              color={theme.buttonBack}
                            />
                          ) : null}
                        </TouchableOpacity>
                      );
                    }}
                  />
                )
              ) : null}
            </View>
          </View>
        </View>

        {selected ? (
          <>
            <View style={styles.reqShadow}>
              <View style={styles.reqCard}>
                <View style={styles.reqHeader}>
                  <View style={styles.reqIconBadge}>
                    <MaterialIcons
                      name="checklist"
                      size={moderateWidthScale(16)}
                      color={theme.buttonBack}
                    />
                  </View>
                  <Text style={styles.reqTitle}>{t("templateRequirements")}</Text>
                </View>
                <View style={styles.reqChips}>
                  <View style={styles.reqChip}>
                    <MaterialIcons
                      name="photo-library"
                      size={moderateWidthScale(14)}
                      color={theme.buttonBack}
                    />
                    <Text style={styles.reqChipText}>{mediaLabel}</Text>
                  </View>
                  {(selected.text_fields?.length ?? 0) > 0 ? (
                    <View style={styles.reqChip}>
                      <MaterialIcons
                        name="text-fields"
                        size={moderateWidthScale(14)}
                        color={theme.buttonBack}
                      />
                      <Text style={styles.reqChipText} numberOfLines={2}>
                        {selected.text_fields.map(fieldLabel).join(" · ")}
                      </Text>
                    </View>
                  ) : null}
                  {selected.has_music ? (
                    <View style={styles.reqChip}>
                      <MaterialIcons
                        name="music-note"
                        size={moderateWidthScale(14)}
                        color={theme.buttonBack}
                      />
                      <Text style={styles.reqChipText} numberOfLines={1}>
                        {musicLabel}
                      </Text>
                    </View>
                  ) : null}
                </View>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitleSm}>{t("selectMedia")}</Text>
              <View style={styles.slotsRow}>
                {selectedMedia.map((media, index) => {
                  const field = mediaFields[index];
                  const filled = !!(media?.thumbnail_url || media?.playback_url || media?.url);
                  const thumbUri =
                    media?.thumbnail_url ||
                    media?.playback_url ||
                    media?.url ||
                    null;
                  return (
                    <TouchableOpacity
                      key={field?.key ?? `slot-${index}`}
                      style={[
                        styles.slotCard,
                        !filled && styles.slotCardEmpty,
                      ]}
                      onPress={() => openSourcePicker(index)}
                      activeOpacity={0.85}
                    >
                      {filled && thumbUri ? (
                        <Image
                          source={{ uri: thumbUri }}
                          style={styles.slotThumb}
                        />
                      ) : (
                        <View
                          style={[styles.slotThumb, styles.slotThumbPlaceholder]}
                        >
                          <MaterialIcons
                            name={
                              slotAcceptsImage(field) && !slotAcceptsVideo(field)
                                ? "add-photo-alternate"
                                : !slotAcceptsImage(field) &&
                                    slotAcceptsVideo(field)
                                  ? "videocam"
                                  : "add-photo-alternate"
                            }
                            size={moderateWidthScale(22)}
                            color={theme.buttonBack}
                          />
                        </View>
                      )}
                      <View style={styles.slotTextCol}>
                        <Text style={styles.slotTitle}>
                          {field?.label || t("mediaSlot", { number: index + 1 })}
                        </Text>
                        <Text style={styles.slotSub} numberOfLines={1}>
                          {media
                            ? media.original_name || t("mediaSelected")
                            : field
                              ? slotTypeHint(field, t)
                              : t("tapToSelectMedia")}
                        </Text>
                      </View>
                      <View style={styles.slotChevron}>
                        <MaterialIcons
                          name="chevron-right"
                          size={moderateWidthScale(18)}
                          color={theme.darkGreen}
                        />
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {(selected.text_fields?.length ?? 0) > 0 ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitleSm}>{t("customText")}</Text>
                {selected.text_fields.map((field) => (
                  <View key={field}>
                    <Text style={styles.label}>{fieldLabel(field)}</Text>
                    <TextInput
                      style={styles.input}
                      value={texts[field] || ""}
                      onChangeText={(value) =>
                        setTexts((prev) => ({ ...prev, [field]: value }))
                      }
                      placeholder={fieldLabel(field)}
                      placeholderTextColor={theme.lightGreen5}
                    />
                  </View>
                ))}
              </View>
            ) : null}

            <View style={styles.section}>
              <Text style={styles.sectionTitleSm}>
                {t("caption")}{" "}
                <Text style={{ color: theme.selectCard }}>*</Text>
              </Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={caption}
                onChangeText={(v) => setCaption(v.slice(0, 2200))}
                placeholder={t("captionPlaceholder")}
                placeholderTextColor={theme.lightGreen5}
                multiline
                maxLength={2200}
              />
              <Text style={styles.charCount}>{caption.length}/2200</Text>

              <Text style={styles.label}>
                {t("category")}{" "}
                <Text style={{ color: theme.selectCard }}>*</Text>
              </Text>
              <View style={styles.categoryShell}>
                <TouchableOpacity
                  style={styles.categoryRow}
                  onPress={openCategoryPicker}
                  activeOpacity={0.85}
                >
                  <Text style={styles.categoryText}>
                    {categoryName || t("selectCategory")}
                  </Text>
                  {loadingCategories ? (
                    <ActivityIndicator size="small" color={theme.buttonBack} />
                  ) : (
                    <MaterialIcons
                      name={
                        showCategoryPicker ? "expand-less" : "expand-more"
                      }
                      size={moderateWidthScale(22)}
                      color={theme.lightGreen}
                    />
                  )}
                </TouchableOpacity>
                {showCategoryPicker
                  ? categories.map((cat) => (
                      <TouchableOpacity
                        key={cat.id}
                        style={styles.categoryOption}
                        onPress={() => {
                          userPickedCategoryRef.current = true;
                          setCategoryId(cat.id);
                          setCategoryName(cat.name);
                          setShowCategoryPicker(false);
                        }}
                      >
                        <Text style={styles.categoryOptionText}>{cat.name}</Text>
                      </TouchableOpacity>
                    ))
                  : null}
              </View>
            </View>
          </>
        ) : (
          <View style={styles.emptyState}>
            <View style={styles.emptyStateIcon}>
              <MaterialIcons
                name="arrow-drop-down-circle"
                size={moderateWidthScale(26)}
                color={theme.buttonBack}
              />
            </View>
            <Text style={styles.emptyStateTitle}>{t("selectTemplateHintTitle")}</Text>
            <Text style={styles.emptyStateText}>{t("selectTemplateHint")}</Text>
          </View>
        )}
      </KeyboardAwareScrollView>

      {selected ? (
        <View style={styles.footer}>
          <Button
            title={t("generateReel")}
            onPress={handleGenerate}
            disabled={!canGenerate || submitting}
            loading={submitting}
          />
        </View>
      ) : null}

      <ModalizeBottomSheet
        visible={sourcePickerVisible}
        onClose={dismissSourcePicker}
        title={
          activeSlotField?.label || t("selectMedia")
        }
      >
        <TouchableOpacity
          style={styles.optionItem}
          onPress={handleSelectFromGallery}
          activeOpacity={0.7}
        >
          <MaterialIcons
            name="photo-library"
            size={iconScale(24)}
            color={theme.darkGreen}
            style={styles.optionIcon}
          />
          <View style={styles.optionTextCol}>
            <Text style={styles.optionTitle}>{t("fromGallery")}</Text>
            <Text style={styles.optionDesc}>
              {activeSlotField
                ? slotTypeHint(activeSlotField, t)
                : t("tapToSelectMedia")}
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.optionItem, styles.optionItemLast]}
          onPress={handleSelectFromCamera}
          activeOpacity={0.7}
        >
          <MaterialIcons
            name={
              slotAcceptsImage(activeSlotField) ? "camera-alt" : "videocam"
            }
            size={iconScale(24)}
            color={theme.darkGreen}
            style={styles.optionIcon}
          />
          <Text style={styles.optionText}>
            {slotAcceptsImage(activeSlotField)
              ? t("fromCamera")
              : t("recordVideo")}
          </Text>
        </TouchableOpacity>

      </ModalizeBottomSheet>


      {uploadingMedia ? (
        <View style={styles.uploadingOverlay} pointerEvents="auto">
          <ActivityIndicator size="large" color={theme.white} />
          <Text style={styles.uploadingText}>{t("uploadingVideo")}</Text>
        </View>
      ) : null}

      <HairPipelineProcessingModal
        state={pipelineModal}
        onClose={closePipelineModal}
      />
    </View>
  );
}
