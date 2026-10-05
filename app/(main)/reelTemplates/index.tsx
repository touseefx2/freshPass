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
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { MaterialIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as VideoThumbnails from "expo-video-thumbnails";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import Button from "@/src/components/button";
import ModalizeBottomSheet from "@/src/components/modalizeBottomSheet";
import StackHeader from "@/src/components/StackHeader";
import { useNotificationContext } from "@/src/contexts/NotificationContext";
import { useAppDispatch, useAppSelector, useTheme } from "@/src/hooks/hooks";
import { ApiService } from "@/src/services/api";
import { businessEndpoints } from "@/src/services/endpoints";
import Logger from "@/src/services/logger";
import {
  getMediaLimits,
  getVideo,
  MAX_AUTO_REEL_SOURCE_SECONDS,
  uploadVideo,
} from "@/src/services/mediaLibraryService";
import {
  handleCameraPermission,
  handleMediaLibraryPermission,
} from "@/src/services/mediaPermissionService";
import {
  createAutoReel,
  listAutoReelTemplates,
} from "@/src/services/reelsService";
import { fetchUserStatus } from "@/src/state/thunks/businessThunks";
import { Theme } from "@/src/theme/colors";
import {
  iconScale,
  moderateHeightScale,
  moderateWidthScale,
  widthScale,
} from "@/src/theme/dimensions";
import { fontSize, fonts } from "@/src/theme/fonts";
import type { MediaUploadSourceType } from "@/src/types/media";
import type { AutoReelTemplate } from "@/src/types/reels";

const iosCompatiblePickerOptions =
  Platform.OS === "ios"
    ? {
        preferredAssetRepresentationMode:
          ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
      }
    : {};

const CAPTION_MAX = 2200;

type CategoryOption = { id: number; name: string };
type ServiceOption = { id: number; name: string };

/** Raw video uploaded with purpose=auto_reel_source */
type SourceVideo = {
  id: number;
  name: string | null;
  durationSeconds: number | null;
  thumbnailUri: string | null;
};

/** First 422 message for a field, e.g. errors.reel[0] */
function fieldError(error: any, field: string): string | null {
  const value = error?.data?.errors?.[field];
  if (Array.isArray(value) && typeof value[0] === "string") return value[0];
  return null;
}

function formatDuration(seconds: number | null): string {
  if (seconds == null || !Number.isFinite(seconds)) return "";
  const total = Math.max(0, Math.round(seconds));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

type Styles = ReturnType<typeof createStyles>;

/** Numbered section header; turns into a check once the step is complete */
function StepHeader({
  index,
  title,
  done,
  meta,
  styles,
  theme,
}: {
  index: number;
  title: string;
  done: boolean;
  meta?: string;
  styles: Styles;
  theme: Theme;
}) {
  return (
    <View style={styles.stepHeader} accessibilityRole="header">
      <View style={[styles.stepBadge, done && styles.stepBadgeDone]}>
        {done ? (
          <MaterialIcons
            name="check"
            size={moderateWidthScale(14)}
            color={theme.white}
          />
        ) : (
          <Text style={styles.stepBadgeText}>{index}</Text>
        )}
      </View>
      <Text style={styles.stepTitle}>{title}</Text>
      {meta ? <Text style={styles.stepMeta}>{meta}</Text> : null}
    </View>
  );
}

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
    stepHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(8),
      marginBottom: moderateHeightScale(10),
    },
    stepBadge: {
      width: moderateWidthScale(22),
      height: moderateWidthScale(22),
      borderRadius: moderateWidthScale(11),
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: theme.lightGreen4,
      backgroundColor: theme.white,
    },
    stepBadgeDone: {
      borderColor: theme.buttonBack,
      backgroundColor: theme.buttonBack,
    },
    stepBadgeText: {
      fontSize: fontSize.size11,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    stepTitle: {
      flex: 1,
      fontSize: fontSize.size14,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    stepMeta: {
      fontSize: fontSize.size11,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
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
      maxHeight: moderateHeightScale(280),
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
      gap: moderateWidthScale(10),
      paddingHorizontal: moderateWidthScale(14),
      paddingVertical: moderateHeightScale(12),
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.borderLight,
    },
    dropdownOptionActive: {
      backgroundColor: theme.lightGreen07,
    },
    dropdownOptionThumb: {
      width: moderateWidthScale(36),
      height: moderateWidthScale(36),
      borderRadius: moderateWidthScale(8),
      backgroundColor: theme.lightGreen07,
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
    },
    dropdownOptionTextCol: {
      flex: 1,
      gap: moderateHeightScale(2),
    },
    dropdownOptionText: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: theme.darkGreen,
    },
    dropdownOptionTextActive: {
      fontFamily: fonts.fontBold,
    },
    dropdownOptionDesc: {
      fontSize: fontSize.size11,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
    },
    label: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
      marginBottom: moderateHeightScale(6),
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
    templatePreview: {
      width: "100%",
      height: moderateHeightScale(150),
      borderRadius: moderateWidthScale(12),
      backgroundColor: theme.lightGreen07,
    },
    templateDesc: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      lineHeight: fontSize.size18,
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
    slotProgressTrack: {
      height: moderateHeightScale(4),
      borderRadius: moderateWidthScale(999),
      backgroundColor: theme.lightGreen015,
      overflow: "hidden",
      marginTop: moderateHeightScale(6),
    },
    slotProgressFill: {
      height: "100%",
      borderRadius: moderateWidthScale(999),
      backgroundColor: theme.buttonBack,
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
      marginBottom: moderateHeightScale(14),
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
    chipRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: moderateWidthScale(8),
    },
    chip: {
      paddingHorizontal: moderateWidthScale(12),
      paddingVertical: moderateHeightScale(8),
      borderRadius: moderateWidthScale(18),
      backgroundColor: theme.white,
      borderWidth: 1,
      borderColor: theme.lightGreen015,
    },
    chipActive: {
      backgroundColor: theme.darkGreen,
      borderColor: theme.darkGreen,
    },
    chipText: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
    },
    chipTextActive: {
      color: theme.buttonText,
    },
    footer: {
      paddingHorizontal: moderateWidthScale(20),
      paddingTop: moderateHeightScale(12),
      paddingBottom: moderateHeightScale(12),
      borderTopWidth: 1,
      borderTopColor: theme.borderLight,
      backgroundColor: theme.background,
      gap: moderateHeightScale(8),
    },
    footerHint: {
      fontSize: fontSize.size11,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      textAlign: "center",
      lineHeight: fontSize.size16,
    },
    footerHintRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: moderateWidthScale(4),
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
  });

export default function ReelTemplatesScreen() {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { showBanner } = useNotificationContext();
  const dispatch = useAppDispatch();

  // Set when coming back from a failed auto reel ("Try another template")
  const params = useLocalSearchParams<{ sourceMediaAssetId?: string }>();

  const businessStatus = useAppSelector((s) => s.user.businessStatus);
  const completeProfileCategory = useAppSelector(
    (s) => s.completeProfile.businessCategory,
  );
  const selectBsnsCategory = useAppSelector((s) => s.user.selectBsnsCategory);

  const resolvedBusinessCategory = useMemo(() => {
    if (businessStatus?.business_category?.id != null) {
      return businessStatus.business_category;
    }
    if (completeProfileCategory?.id != null) {
      return completeProfileCategory;
    }
    const fromSelect = selectBsnsCategory?.[0];
    if (fromSelect?.id != null) return fromSelect;
    return null;
  }, [
    businessStatus?.business_category,
    completeProfileCategory,
    selectBsnsCategory,
  ]);

  const [templates, setTemplates] = useState<AutoReelTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [templatesError, setTemplatesError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const [sourceVideo, setSourceVideo] = useState<SourceVideo | null>(null);
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
  const [services, setServices] = useState<ServiceOption[]>([]);
  const [serviceId, setServiceId] = useState<number | null>(null);
  const [reelsRemaining, setReelsRemaining] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [sourcePickerVisible, setSourcePickerVisible] = useState(false);
  const [uploadPercent, setUploadPercent] = useState<number | null>(null);

  const selected = useMemo(
    () => templates.find((item) => item.id === selectedId) ?? null,
    [selectedId, templates],
  );

  const applyTemplate = useCallback((template: AutoReelTemplate) => {
    setSelectedId(template.id);
    setDropdownOpen(false);
  }, []);

  const loadTemplates = useCallback(async () => {
    setLoadingTemplates(true);
    setTemplatesError(null);
    try {
      const data = await listAutoReelTemplates();
      setTemplates(data);
      setSelectedId((prev) => {
        if (prev != null && data.some((item) => item.id === prev)) return prev;
        return data.length === 1 ? data[0].id : null;
      });
    } catch (error: any) {
      Logger.error("Failed to load auto reel templates:", error);
      setTemplates([]);
      setTemplatesError(error?.message || t("failedToLoadTemplates"));
    } finally {
      setLoadingTemplates(false);
    }
  }, [t]);

  useEffect(() => {
    void loadTemplates();
  }, [loadTemplates]);

  // Monthly limit is shared with staff — warn before starting
  useEffect(() => {
    getMediaLimits({ force: true })
      .then((limits) => {
        if (typeof limits.reels_remaining_this_month === "number") {
          setReelsRemaining(limits.reels_remaining_this_month);
        }
      })
      .catch((error) => {
        Logger.error("Failed to load media limits for auto reel:", error);
      });
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const svcRes = await ApiService.get<{
          success: boolean;
          data?: ServiceOption[] | { data?: ServiceOption[] };
        }>(businessEndpoints.services);
        const svcData = Array.isArray(svcRes?.data)
          ? svcRes.data
          : Array.isArray((svcRes?.data as any)?.data)
            ? (svcRes.data as any).data
            : [];
        setServices(svcData);
      } catch (error) {
        Logger.error("Failed to load auto reel services:", error);
      }
    })();
  }, []);

  // Reuse the already-uploaded raw video when retrying with another template
  useEffect(() => {
    const id = params.sourceMediaAssetId
      ? Number(params.sourceMediaAssetId)
      : null;
    if (!id) return;
    setSourceVideo({ id, name: null, durationSeconds: null, thumbnailUri: null });
    getVideo(id)
      .then((video) => {
        setSourceVideo((prev) =>
          prev?.id === id
            ? {
                id,
                name: video.original_name,
                durationSeconds: video.duration_seconds,
                thumbnailUri: video.thumbnail_url,
              }
            : prev,
        );
      })
      .catch(() => {});
  }, [params.sourceMediaAssetId]);

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

  const uploadPickedVideo = useCallback(
    async (asset: ImagePicker.ImagePickerAsset, sourceType: MediaUploadSourceType) => {
      if (!asset.uri) return;

      // expo-image-picker reports video duration in milliseconds
      const durationMs =
        typeof asset.duration === "number" && asset.duration > 0
          ? asset.duration
          : 0;
      const durationSeconds = Math.max(1, Math.ceil(durationMs / 1000));

      if (durationSeconds > MAX_AUTO_REEL_SOURCE_SECONDS) {
        showBanner(t("error"), t("autoReelVideoTooLong"), "error", 3500);
        return;
      }

      let localThumb: string | null = null;
      try {
        const thumb = await VideoThumbnails.getThumbnailAsync(asset.uri, {
          time: 0,
          quality: 0.6,
        });
        localThumb = thumb.uri;
      } catch {
        // Thumbnail is cosmetic only
      }

      setUploadPercent(0);
      try {
        const mime = (asset as { mimeType?: string }).mimeType ?? "";
        const uploaded = await uploadVideo(
          {
            uri: asset.uri,
            mimeType: mime || "video/mp4",
            fileName: asset.fileName || "video.mp4",
            sourceType,
            durationSeconds,
            width: asset.width,
            height: asset.height,
            purpose: "auto_reel_source",
          },
          (percent) => setUploadPercent(percent),
        );
        setSourceVideo({
          id: uploaded.id,
          name: uploaded.original_name || asset.fileName || null,
          durationSeconds: uploaded.duration_seconds ?? durationSeconds,
          thumbnailUri: localThumb || uploaded.thumbnail_url,
        });
      } catch (error: any) {
        Logger.error("Failed to upload auto reel source video:", error);
        showBanner(
          t("error"),
          error?.message || t("failedToUploadVideo"),
          "error",
          3500,
        );
      } finally {
        setUploadPercent(null);
      }
    },
    [showBanner, t],
  );

  const handleSelectFromGallery = useCallback(async () => {
    setSourcePickerVisible(false);
    const hasPermission = await handleMediaLibraryPermission();
    if (!hasPermission) return;
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["videos"],
        allowsMultipleSelection: false,
        quality: 1,
        allowsEditing: false,
        ...iosCompatiblePickerOptions,
      });
      if (!result.canceled && result.assets?.[0]) {
        await uploadPickedVideo(result.assets[0], "device");
      }
    } catch (error) {
      Logger.error("Error selecting auto reel video from gallery:", error);
      showBanner(t("error"), t("failedToSelectMedia"), "error", 3000);
    }
  }, [showBanner, t, uploadPickedVideo]);

  const handleRecordVideo = useCallback(async () => {
    setSourcePickerVisible(false);
    const hasPermission = await handleCameraPermission();
    if (!hasPermission) return;
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ["videos"],
        quality: 1,
        allowsEditing: false,
        videoMaxDuration: MAX_AUTO_REEL_SOURCE_SECONDS,
        ...iosCompatiblePickerOptions,
      });
      if (!result.canceled && result.assets?.[0]) {
        await uploadPickedVideo(result.assets[0], "camera");
      }
    } catch (error) {
      Logger.error("Error recording auto reel video:", error);
      showBanner(t("error"), t("failedToSelectMedia"), "error", 3000);
    }
  }, [showBanner, t, uploadPickedVideo]);

  const noReelsLeft = reelsRemaining != null && reelsRemaining <= 0;
  const fewReelsLeft =
    reelsRemaining != null && reelsRemaining > 0 && reelsRemaining <= 2;

  const canGenerate =
    !!selected && !!sourceVideo && !!categoryId && !noReelsLeft;

  const handleGenerate = useCallback(async () => {
    if (!selected || !sourceVideo || !categoryId || submitting) return;

    setSubmitting(true);
    try {
      const trimmedCaption = caption.trim();
      const autoReel = await createAutoReel({
        media_asset_id: sourceVideo.id,
        template_id: selected.id,
        category_id: categoryId,
        ...(serviceId ? { service_id: serviceId } : {}),
        ...(trimmedCaption ? { caption: trimmedCaption } : {}),
      });
      router.replace({
        pathname: "/(main)/autoReel" as any,
        params: { autoReelId: String(autoReel.id) },
      });
    } catch (error: any) {
      Logger.error("Failed to start auto reel:", error);
      const mediaError = fieldError(error, "media_asset_id");
      const templateError = fieldError(error, "template_id");
      if (mediaError) {
        // Video is gone / not an auto reel source — ask for a fresh upload
        setSourceVideo(null);
      }
      if (templateError) {
        // Admin may have turned it off — refresh the list
        void loadTemplates();
      }
      const message =
        fieldError(error, "reel") ||
        fieldError(error, "auto_reel") ||
        mediaError ||
        templateError ||
        fieldError(error, "category_id") ||
        fieldError(error, "service_id") ||
        fieldError(error, "caption") ||
        error?.message ||
        t("failedToStartGeneration");
      showBanner(t("error"), message, "error", 4000);
    } finally {
      setSubmitting(false);
    }
  }, [
    caption,
    categoryId,
    loadTemplates,
    router,
    selected,
    serviceId,
    showBanner,
    sourceVideo,
    submitting,
    t,
  ]);

  const isHaircut = selected?.kind === "haircut";

  // Tell the barber what is still missing instead of a silent disabled button
  const missingHint = !selected
    ? null
    : uploadPercent != null
      ? t("autoReelWaitForUpload")
      : !sourceVideo
        ? t("autoReelNeedVideo")
        : !categoryId
          ? t("autoReelNeedCategory")
          : null;

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
                  <Text style={styles.heroTitle}>{t("autoReelIntroTitle")}</Text>
                  <Text style={styles.heroSubtitle}>
                    {t("autoReelIntroSubtitle")}
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
                noReelsLeft
                  ? "block"
                  : fewReelsLeft
                    ? "warning-amber"
                    : "info-outline"
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
                ? t("autoReelNoReelsLeft")
                : t("autoReelReelsLeft", { count: reelsRemaining })}
            </Text>
          </View>
        ) : null}

        <View style={styles.pickerBlock}>
          <StepHeader
            index={1}
            title={t("selectTemplate")}
            done={!!selected}
            styles={styles}
            theme={theme}
          />
          <View style={styles.dropdownShadow}>
            <View style={styles.dropdownShell}>
              <TouchableOpacity
                style={styles.dropdownRow}
                onPress={() => setDropdownOpen((open) => !open)}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel={
                  selected
                    ? `${t("selectTemplate")}: ${selected.name}`
                    : t("selectTemplatePlaceholder")
                }
                accessibilityState={{ expanded: dropdownOpen }}
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
                          accessibilityRole="button"
                          accessibilityLabel={item.name}
                          accessibilityHint={item.description ?? undefined}
                          accessibilityState={{ selected: active }}
                        >
                          <View style={styles.dropdownOptionThumb}>
                            {item.preview_image_url ? (
                              <Image
                                source={{ uri: item.preview_image_url }}
                                style={{ width: "100%", height: "100%" }}
                              />
                            ) : (
                              <MaterialIcons
                                name={
                                  item.kind === "haircut"
                                    ? "content-cut"
                                    : "auto-awesome"
                                }
                                size={moderateWidthScale(18)}
                                color={theme.buttonBack}
                              />
                            )}
                          </View>
                          <View style={styles.dropdownOptionTextCol}>
                            <Text
                              style={[
                                styles.dropdownOptionText,
                                active && styles.dropdownOptionTextActive,
                              ]}
                              numberOfLines={1}
                            >
                              {item.name}
                            </Text>
                            {item.description ? (
                              <Text
                                style={styles.dropdownOptionDesc}
                                numberOfLines={2}
                              >
                                {item.description}
                              </Text>
                            ) : null}
                          </View>
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
                {selected.preview_image_url ? (
                  <Image
                    source={{ uri: selected.preview_image_url }}
                    style={styles.templatePreview}
                    resizeMode="cover"
                  />
                ) : null}
                {selected.description ? (
                  <Text style={styles.templateDesc}>
                    {selected.description}
                  </Text>
                ) : null}
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
                      name="videocam"
                      size={moderateWidthScale(14)}
                      color={theme.buttonBack}
                    />
                    <Text style={styles.reqChipText}>
                      {t("autoReelReqVideo")}
                    </Text>
                  </View>
                  <View style={styles.reqChip}>
                    <MaterialIcons
                      name="timer"
                      size={moderateWidthScale(14)}
                      color={theme.buttonBack}
                    />
                    <Text style={styles.reqChipText}>
                      {t("autoReelReqLength")}
                    </Text>
                  </View>
                  <View style={styles.reqChip}>
                    <MaterialIcons
                      name="graphic-eq"
                      size={moderateWidthScale(14)}
                      color={theme.buttonBack}
                    />
                    <Text style={styles.reqChipText}>
                      {t("autoReelReqAudio")}
                    </Text>
                  </View>
                  <View style={styles.reqChip}>
                    <MaterialIcons
                      name="toll"
                      size={moderateWidthScale(14)}
                      color={theme.buttonBack}
                    />
                    <Text style={styles.reqChipText}>
                      {t("autoReelReqNoCredits")}
                    </Text>
                  </View>
                </View>
                {isHaircut ? (
                  <Text style={styles.templateDesc}>
                    {t("autoReelHaircutHint")}
                  </Text>
                ) : null}
              </View>
            </View>

            <View style={styles.section}>
              <StepHeader
                index={2}
                title={t("autoReelRawVideo")}
                done={!!sourceVideo && uploadPercent == null}
                meta={t("autoReelMaxThreeMin")}
                styles={styles}
                theme={theme}
              />
              <TouchableOpacity
                style={[
                  styles.slotCard,
                  !sourceVideo && uploadPercent == null && styles.slotCardEmpty,
                ]}
                onPress={() => setSourcePickerVisible(true)}
                activeOpacity={0.85}
                disabled={uploadPercent != null}
                accessibilityRole="button"
                accessibilityLabel={
                  sourceVideo
                    ? t("autoReelChangeVideo")
                    : t("autoReelPickVideo")
                }
                accessibilityHint={t("autoReelPickVideoHint")}
                accessibilityState={{ disabled: uploadPercent != null }}
              >
                {uploadPercent == null && sourceVideo?.thumbnailUri ? (
                  <Image
                    source={{ uri: sourceVideo.thumbnailUri }}
                    style={styles.slotThumb}
                  />
                ) : (
                  <View style={[styles.slotThumb, styles.slotThumbPlaceholder]}>
                    {uploadPercent != null ? (
                      <ActivityIndicator size="small" color={theme.buttonBack} />
                    ) : (
                      <MaterialIcons
                        name={sourceVideo ? "check-circle" : "video-call"}
                        size={moderateWidthScale(22)}
                        color={theme.buttonBack}
                      />
                    )}
                  </View>
                )}
                <View style={styles.slotTextCol}>
                  {uploadPercent != null ? (
                    <View accessibilityLiveRegion="polite">
                      <Text style={styles.slotTitle} numberOfLines={1}>
                        {t("autoReelUploading", { percent: uploadPercent })}
                      </Text>
                      <View style={styles.slotProgressTrack}>
                        <View
                          style={[
                            styles.slotProgressFill,
                            { width: `${uploadPercent}%` },
                          ]}
                        />
                      </View>
                    </View>
                  ) : (
                    <>
                      <Text style={styles.slotTitle} numberOfLines={1}>
                        {sourceVideo
                          ? sourceVideo.name || t("autoReelVideoAdded")
                          : t("autoReelPickVideo")}
                      </Text>
                      <Text style={styles.slotSub} numberOfLines={1}>
                        {sourceVideo
                          ? [
                              formatDuration(sourceVideo.durationSeconds),
                              t("autoReelChangeVideo"),
                            ]
                              .filter(Boolean)
                              .join(" · ")
                          : t("autoReelPickVideoHint")}
                      </Text>
                    </>
                  )}
                </View>
                {uploadPercent == null ? (
                  <View style={styles.slotChevron}>
                    <MaterialIcons
                      name={sourceVideo ? "swap-horiz" : "add"}
                      size={moderateWidthScale(18)}
                      color={theme.darkGreen}
                    />
                  </View>
                ) : null}
              </TouchableOpacity>
            </View>

            <View style={styles.section}>
              <StepHeader
                index={3}
                title={t("autoReelStepDetails")}
                done={!!categoryId}
                styles={styles}
                theme={theme}
              />
              <Text style={styles.label}>
                {t("category")}{" "}
                <Text style={{ color: theme.selectCard }}>*</Text>
              </Text>
              <View style={styles.categoryShell}>
                <TouchableOpacity
                  style={styles.categoryRow}
                  onPress={openCategoryPicker}
                  activeOpacity={0.85}
                  accessibilityRole="button"
                  accessibilityLabel={`${t("category")}: ${
                    categoryName || t("selectCategory")
                  }`}
                  accessibilityState={{ expanded: showCategoryPicker }}
                >
                  <Text style={styles.categoryText}>
                    {categoryName || t("selectCategory")}
                  </Text>
                  {loadingCategories ? (
                    <ActivityIndicator size="small" color={theme.buttonBack} />
                  ) : (
                    <MaterialIcons
                      name={showCategoryPicker ? "expand-less" : "expand-more"}
                      size={moderateWidthScale(22)}
                      color={theme.lightGreen}
                    />
                  )}
                </TouchableOpacity>
                {showCategoryPicker
                  ? categories.map((cat) => (
                      <TouchableOpacity
                        key={cat.id}
                        accessibilityRole="button"
                        accessibilityState={{ selected: cat.id === categoryId }}
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

              {services.length > 0 ? (
                <>
                  <Text style={styles.label}>{t("serviceOptional")}</Text>
                  <View
                    style={[
                      styles.chipRow,
                      { marginBottom: moderateHeightScale(14) },
                    ]}
                  >
                    <TouchableOpacity
                      style={[
                        styles.chip,
                        serviceId == null && styles.chipActive,
                      ]}
                      onPress={() => setServiceId(null)}
                      activeOpacity={0.75}
                      accessibilityRole="button"
                      accessibilityState={{ selected: serviceId == null }}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          serviceId == null && styles.chipTextActive,
                        ]}
                      >
                        {t("none")}
                      </Text>
                    </TouchableOpacity>
                    {services.map((svc) => (
                      <TouchableOpacity
                        key={svc.id}
                        style={[
                          styles.chip,
                          serviceId === svc.id && styles.chipActive,
                        ]}
                        onPress={() => setServiceId(svc.id)}
                        activeOpacity={0.75}
                        accessibilityRole="button"
                        accessibilityState={{ selected: serviceId === svc.id }}
                      >
                        <Text
                          style={[
                            styles.chipText,
                            serviceId === svc.id && styles.chipTextActive,
                          ]}
                        >
                          {svc.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              ) : null}

              <Text style={styles.label}>{t("autoReelCaptionOptional")}</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={caption}
                onChangeText={(v) => setCaption(v.slice(0, CAPTION_MAX))}
                placeholder={t("captionPlaceholder")}
                placeholderTextColor={theme.lightGreen5}
                multiline
                maxLength={CAPTION_MAX}
              />
              <Text style={styles.charCount}>
                {caption.length}/{CAPTION_MAX}
              </Text>
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
            title={t("autoReelMakeReel")}
            onPress={handleGenerate}
            disabled={!canGenerate || submitting || uploadPercent != null}
            loading={submitting}
          />
          {missingHint ? (
            <View style={styles.footerHintRow}>
              <MaterialIcons
                name="info-outline"
                size={moderateWidthScale(13)}
                color={theme.lightGreen}
              />
              <Text style={styles.footerHint}>{missingHint}</Text>
            </View>
          ) : (
            <Text style={styles.footerHint}>{t("autoReelTimeHint")}</Text>
          )}
        </View>
      ) : null}

      <ModalizeBottomSheet
        visible={sourcePickerVisible}
        onClose={() => setSourcePickerVisible(false)}
        title={t("autoReelRawVideo")}
      >
        <TouchableOpacity
          style={styles.optionItem}
          onPress={handleSelectFromGallery}
          activeOpacity={0.7}
        >
          <MaterialIcons
            name="video-library"
            size={iconScale(24)}
            color={theme.darkGreen}
            style={styles.optionIcon}
          />
          <View style={styles.optionTextCol}>
            <Text style={styles.optionTitle}>{t("fromGallery")}</Text>
            <Text style={styles.optionDesc}>{t("autoReelPickVideoHint")}</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.optionItem, styles.optionItemLast]}
          onPress={handleRecordVideo}
          activeOpacity={0.7}
        >
          <MaterialIcons
            name="videocam"
            size={iconScale(24)}
            color={theme.darkGreen}
            style={styles.optionIcon}
          />
          <View style={styles.optionTextCol}>
            <Text style={styles.optionTitle}>{t("recordVideo")}</Text>
            <Text style={styles.optionDesc}>{t("autoReelPickVideoHint")}</Text>
          </View>
        </TouchableOpacity>
      </ModalizeBottomSheet>

    </View>
  );
}
