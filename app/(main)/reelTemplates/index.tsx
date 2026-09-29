import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { MaterialIcons } from "@expo/vector-icons";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Button from "@/src/components/button";
import StackHeader from "@/src/components/StackHeader";
import { useNotificationContext } from "@/src/contexts/NotificationContext";
import { useAppDispatch, useAppSelector, useTheme } from "@/src/hooks/hooks";
import { ApiService } from "@/src/services/api";
import { businessEndpoints } from "@/src/services/endpoints";
import Logger from "@/src/services/logger";
import { listVideos } from "@/src/services/mediaLibraryService";
import {
  generateReelFromTemplate,
  listReelTemplates,
} from "@/src/services/reelsService";
import { fetchUserStatus } from "@/src/state/thunks/businessThunks";
import { Theme } from "@/src/theme/colors";
import {
  moderateHeightScale,
  moderateWidthScale,
  widthScale,
} from "@/src/theme/dimensions";
import { fontSize, fonts } from "@/src/theme/fonts";
import type { MediaVideo } from "@/src/types/media";
import type { ReelTemplate } from "@/src/types/reels";

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
      paddingHorizontal: moderateWidthScale(20),
      paddingTop: moderateHeightScale(12),
      paddingBottom: moderateHeightScale(28),
    },
    loader: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    label: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
      marginBottom: moderateHeightScale(6),
    },
    dropdownShell: {
      borderRadius: moderateWidthScale(12),
      borderWidth: 1,
      borderColor: theme.lightGreen015,
      backgroundColor: theme.white,
      overflow: "hidden",
      marginBottom: moderateHeightScale(12),
    },
    dropdownRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: moderateWidthScale(12),
      paddingVertical: moderateHeightScale(12),
      gap: moderateWidthScale(8),
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
      borderTopColor: theme.lightGreen015,
      maxHeight: moderateHeightScale(220),
    },
    dropdownOption: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: moderateWidthScale(12),
      paddingVertical: moderateHeightScale(11),
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.lightGreen015,
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
    /** Compact requirements strip */
    reqCard: {
      backgroundColor: theme.white,
      borderRadius: moderateWidthScale(12),
      borderWidth: 1,
      borderColor: theme.borderLight,
      paddingHorizontal: moderateWidthScale(12),
      paddingVertical: moderateHeightScale(10),
      marginBottom: moderateHeightScale(16),
      gap: moderateHeightScale(6),
    },
    reqTitle: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      marginBottom: moderateHeightScale(2),
    },
    reqLine: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(6),
    },
    reqText: {
      flex: 1,
      fontSize: fontSize.size11,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
    },
    reqHint: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      textAlign: "center",
      marginTop: moderateHeightScale(12),
    },
    section: {
      marginBottom: moderateHeightScale(16),
    },
    sectionTitle: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      marginBottom: moderateHeightScale(6),
    },
    slotsRow: {
      gap: moderateHeightScale(8),
    },
    slotCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(10),
      borderWidth: 1,
      borderColor: theme.lightGreen015,
      borderRadius: moderateWidthScale(10),
      paddingHorizontal: moderateWidthScale(10),
      paddingVertical: moderateHeightScale(8),
      backgroundColor: theme.white,
    },
    slotThumb: {
      width: widthScale(44),
      height: widthScale(44),
      borderRadius: moderateWidthScale(8),
      backgroundColor: theme.lightGreen07,
    },
    slotThumbPlaceholder: {
      alignItems: "center",
      justifyContent: "center",
    },
    slotTextCol: {
      flex: 1,
      gap: moderateHeightScale(1),
    },
    slotTitle: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    slotSub: {
      fontSize: fontSize.size10,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
    },
    input: {
      borderWidth: 1,
      borderColor: theme.lightGreen015,
      borderRadius: moderateWidthScale(12),
      paddingHorizontal: moderateWidthScale(12),
      paddingVertical: moderateHeightScale(10),
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.darkGreen,
      backgroundColor: theme.white,
      marginBottom: moderateHeightScale(10),
    },
    textArea: {
      minHeight: moderateHeightScale(80),
      textAlignVertical: "top",
      lineHeight: fontSize.size18,
    },
    charCount: {
      alignSelf: "flex-end",
      fontSize: fontSize.size10,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen5,
      marginTop: moderateHeightScale(-6),
      marginBottom: moderateHeightScale(8),
    },
    categoryShell: {
      borderRadius: moderateWidthScale(12),
      borderWidth: 1,
      borderColor: theme.lightGreen015,
      backgroundColor: theme.white,
      overflow: "hidden",
    },
    categoryRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: moderateWidthScale(12),
      paddingVertical: moderateHeightScale(12),
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
      paddingVertical: moderateHeightScale(11),
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
      paddingTop: moderateHeightScale(10),
      paddingBottom: moderateHeightScale(10),
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
    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.45)",
      justifyContent: "flex-end",
    },
    modalSheet: {
      maxHeight: "75%",
      backgroundColor: theme.white,
      borderTopLeftRadius: moderateWidthScale(20),
      borderTopRightRadius: moderateWidthScale(20),
      paddingBottom: moderateHeightScale(20),
    },
    modalHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: moderateWidthScale(16),
      paddingVertical: moderateHeightScale(14),
      borderBottomWidth: 1,
      borderBottomColor: theme.borderLight,
    },
    modalTitle: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    mediaGrid: {
      paddingHorizontal: moderateWidthScale(12),
      paddingTop: moderateHeightScale(12),
      gap: moderateWidthScale(8),
    },
    mediaCell: {
      width: "31%",
      aspectRatio: 9 / 16,
      borderRadius: moderateWidthScale(10),
      overflow: "hidden",
      backgroundColor: theme.lightGreen07,
    },
    mediaCellImage: {
      width: "100%",
      height: "100%",
    },
    mediaEmpty: {
      padding: moderateWidthScale(24),
      alignItems: "center",
    },
    mediaEmptyText: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
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

  const [templates, setTemplates] = useState<ReelTemplate[]>([]);
  const [loading, setLoading] = useState(true);
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

  const [mediaPickerSlot, setMediaPickerSlot] = useState<number | null>(null);
  const [libraryVideos, setLibraryVideos] = useState<MediaVideo[]>([]);
  const [loadingLibrary, setLoadingLibrary] = useState(false);

  const selected = useMemo(
    () => templates.find((item) => item.id === selectedId) ?? null,
    [selectedId, templates],
  );

  const applyTemplate = useCallback(
    (template: ReelTemplate) => {
      setSelectedId(template.id);
      setDropdownOpen(false);
      const count = template.media_count || template.media_fields?.length || 0;
      setSelectedMedia(Array.from({ length: count }, () => null));
      const initialTexts: Record<string, string> = {};
      for (const field of template.text_fields || []) {
        initialTexts[field] = field === "business_name" ? businessName : "";
      }
      setTexts(initialTexts);
    },
    [businessName],
  );

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const data = await listReelTemplates();
        const active = data.filter((item) => item.is_active !== false);
        setTemplates(active);
        if (active.length === 1) {
          applyTemplate(active[0]);
        }
      } catch (error: any) {
        Logger.error("Failed to load reel templates:", error);
        showBanner(
          t("error"),
          error?.message || t("failedToLoadTemplates"),
          "error",
          3000,
        );
      } finally {
        setLoading(false);
      }
    })();
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

  const openMediaPicker = useCallback(
    async (slotIndex: number) => {
      setMediaPickerSlot(slotIndex);
      setLoadingLibrary(true);
      try {
        const { videos } = await listVideos(1, 60, "ready");
        setLibraryVideos(videos.filter((v) => v.status === "ready"));
      } catch (error) {
        Logger.error("Failed to load media library:", error);
        showBanner(t("error"), t("failedToLoadVideos"), "error", 3000);
        setMediaPickerSlot(null);
      } finally {
        setLoadingLibrary(false);
      }
    },
    [showBanner, t],
  );

  const pickMedia = useCallback(
    (video: MediaVideo) => {
      if (mediaPickerSlot == null) return;
      const alreadyUsed = selectedMedia.some(
        (m, idx) => m?.id === video.id && idx !== mediaPickerSlot,
      );
      if (alreadyUsed) {
        showBanner(t("error"), t("mediaAlreadySelected"), "error", 2500);
        return;
      }
      setSelectedMedia((prev) => {
        const next = [...prev];
        next[mediaPickerSlot] = video;
        return next;
      });
      setMediaPickerSlot(null);
    },
    [mediaPickerSlot, selectedMedia, showBanner, t],
  );

  const canGenerate = useMemo(() => {
    if (!selected) return false;
    if (!caption.trim()) return false;
    if (!categoryId) return false;
    if (selectedMedia.length === 0 || selectedMedia.some((m) => !m)) {
      return false;
    }
    return true;
  }, [caption, categoryId, selected, selectedMedia]);

  const handleGenerate = useCallback(async () => {
    if (!selected || !canGenerate || submitting || !categoryId) return;

    const mediaIds = selectedMedia
      .map((m) => m?.id)
      .filter((id): id is number => id != null);

    if (mediaIds.length !== selected.media_count) {
      showBanner(t("error"), t("selectAllMediaSlots"), "error", 2500);
      return;
    }

    setSubmitting(true);
    try {
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

      router.replace({
        pathname: "/(main)/reelGeneration" as any,
        params: { reelId: String(result.reel_id) },
      });
    } catch (error: any) {
      Logger.error("Failed to start reel generation:", error);
      const message =
        error?.response?.data?.message ||
        error?.message ||
        t("failedToStartGeneration");
      showBanner(t("error"), message, "error", 3500);
    } finally {
      setSubmitting(false);
    }
  }, [
    canGenerate,
    caption,
    categoryId,
    router,
    selected,
    selectedMedia,
    showBanner,
    submitting,
    t,
    texts,
  ]);

  if (loading) {
    return (
      <View style={styles.safeArea}>
        <StackHeader title={t("reelTemplates")} />
        <View style={styles.loader}>
          <ActivityIndicator color={theme.buttonBack} />
        </View>
      </View>
    );
  }

  if (templates.length === 0) {
    return (
      <View style={styles.safeArea}>
        <StackHeader title={t("reelTemplates")} />
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyTitle}>{t("noTemplatesYet")}</Text>
          <Text style={styles.emptySubtitle}>{t("noTemplatesSubtitle")}</Text>
        </View>
      </View>
    );
  }

  const mediaLabel =
    selected == null
      ? ""
      : selected.media_count === 1
        ? t("photosNeededOne")
        : t("photosNeeded", { count: selected.media_count });

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
        <Text style={styles.label}>{t("selectTemplate")}</Text>
        <View style={styles.dropdownShell}>
          <TouchableOpacity
            style={styles.dropdownRow}
            onPress={() => setDropdownOpen((open) => !open)}
            activeOpacity={0.85}
          >
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
          ) : null}
        </View>

        {selected ? (
          <>
            <View style={styles.reqCard}>
              <Text style={styles.reqTitle}>{t("templateRequirements")}</Text>
              <View style={styles.reqLine}>
                <MaterialIcons
                  name="photo-library"
                  size={moderateWidthScale(14)}
                  color={theme.buttonBack}
                />
                <Text style={styles.reqText}>{mediaLabel}</Text>
              </View>
              {(selected.text_fields?.length ?? 0) > 0 ? (
                <View style={styles.reqLine}>
                  <MaterialIcons
                    name="text-fields"
                    size={moderateWidthScale(14)}
                    color={theme.buttonBack}
                  />
                  <Text style={styles.reqText} numberOfLines={2}>
                    {selected.text_fields.map(fieldLabel).join(" · ")}
                  </Text>
                </View>
              ) : null}
              {selected.has_music ? (
                <View style={styles.reqLine}>
                  <MaterialIcons
                    name="music-note"
                    size={moderateWidthScale(14)}
                    color={theme.buttonBack}
                  />
                  <Text style={styles.reqText} numberOfLines={1}>
                    {musicLabel}
                  </Text>
                </View>
              ) : null}
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t("selectMedia")}</Text>
              <View style={styles.slotsRow}>
                {selectedMedia.map((media, index) => (
                  <TouchableOpacity
                    key={`slot-${index}`}
                    style={styles.slotCard}
                    onPress={() => openMediaPicker(index)}
                    activeOpacity={0.85}
                  >
                    {media?.thumbnail_url || media?.playback_url ? (
                      <Image
                        source={{
                          uri: media.thumbnail_url || media.playback_url,
                        }}
                        style={styles.slotThumb}
                      />
                    ) : (
                      <View
                        style={[styles.slotThumb, styles.slotThumbPlaceholder]}
                      >
                        <MaterialIcons
                          name="add-photo-alternate"
                          size={moderateWidthScale(20)}
                          color={theme.lightGreen}
                        />
                      </View>
                    )}
                    <View style={styles.slotTextCol}>
                      <Text style={styles.slotTitle}>
                        {t("mediaSlot", { number: index + 1 })}
                      </Text>
                      <Text style={styles.slotSub} numberOfLines={1}>
                        {media
                          ? media.original_name || t("mediaSelected")
                          : t("tapToSelectMedia")}
                      </Text>
                    </View>
                    <MaterialIcons
                      name="chevron-right"
                      size={moderateWidthScale(20)}
                      color={theme.lightGreen}
                    />
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {(selected.text_fields?.length ?? 0) > 0 ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>{t("customText")}</Text>
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
              <Text style={styles.sectionTitle}>
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
          <Text style={styles.reqHint}>{t("selectTemplateHint")}</Text>
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

      <Modal
        visible={mediaPickerSlot != null}
        animationType="slide"
        transparent
        onRequestClose={() => setMediaPickerSlot(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t("selectFromLibrary")}</Text>
              <TouchableOpacity onPress={() => setMediaPickerSlot(null)}>
                <MaterialIcons
                  name="close"
                  size={moderateWidthScale(24)}
                  color={theme.darkGreen}
                />
              </TouchableOpacity>
            </View>
            {loadingLibrary ? (
              <View style={styles.loader}>
                <ActivityIndicator color={theme.buttonBack} />
              </View>
            ) : libraryVideos.length === 0 ? (
              <View style={styles.mediaEmpty}>
                <Text style={styles.mediaEmptyText}>
                  {t("noReadyMediaInLibrary")}
                </Text>
              </View>
            ) : (
              <FlatList
                data={libraryVideos}
                keyExtractor={(item) => String(item.id)}
                numColumns={3}
                contentContainerStyle={styles.mediaGrid}
                columnWrapperStyle={{ gap: moderateWidthScale(8) }}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.mediaCell}
                    onPress={() => pickMedia(item)}
                    activeOpacity={0.85}
                  >
                    {item.thumbnail_url ? (
                      <Image
                        source={{ uri: item.thumbnail_url }}
                        style={styles.mediaCellImage}
                      />
                    ) : (
                      <View
                        style={[
                          styles.mediaCellImage,
                          styles.slotThumbPlaceholder,
                        ]}
                      >
                        <MaterialIcons
                          name="videocam"
                          size={moderateWidthScale(24)}
                          color={theme.lightGreen}
                        />
                      </View>
                    )}
                  </TouchableOpacity>
                )}
              />
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}
