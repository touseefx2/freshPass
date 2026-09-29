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
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { MaterialIcons } from "@expo/vector-icons";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useVideoPlayer, VideoView } from "expo-video";
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
  getReelTemplate,
} from "@/src/services/reelsService";
import { fetchUserStatus } from "@/src/state/thunks/businessThunks";
import { Theme } from "@/src/theme/colors";
import {
  heightScale,
  moderateHeightScale,
  moderateWidthScale,
  widthScale,
} from "@/src/theme/dimensions";
import { fontSize, fonts } from "@/src/theme/fonts";
import type { MediaVideo } from "@/src/types/media";
import type { ReelTemplate } from "@/src/types/reels";
import { resolveApiImageUrl } from "@/src/utils/media";

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
      paddingTop: moderateHeightScale(8),
      paddingBottom: moderateHeightScale(24),
    },
    loader: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    previewWrap: {
      width: "100%",
      height: heightScale(220),
      borderRadius: moderateWidthScale(16),
      overflow: "hidden",
      backgroundColor: theme.black,
      marginBottom: moderateHeightScale(18),
    },
    previewVideo: {
      width: "100%",
      height: "100%",
    },
    previewPlaceholder: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    section: {
      marginBottom: moderateHeightScale(20),
    },
    sectionTitle: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      marginBottom: moderateHeightScale(8),
    },
    sectionHint: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      marginBottom: moderateHeightScale(10),
    },
    musicCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(10),
      backgroundColor: theme.lightGreen07,
      borderRadius: moderateWidthScale(12),
      paddingHorizontal: moderateWidthScale(12),
      paddingVertical: moderateHeightScale(12),
    },
    musicText: {
      flex: 1,
      fontSize: fontSize.size13,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
    },
    slotsRow: {
      gap: moderateHeightScale(10),
    },
    slotCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(12),
      borderWidth: 1,
      borderColor: theme.lightGreen015,
      borderRadius: moderateWidthScale(12),
      paddingHorizontal: moderateWidthScale(12),
      paddingVertical: moderateHeightScale(10),
      backgroundColor: theme.white,
    },
    slotThumb: {
      width: widthScale(56),
      height: widthScale(56),
      borderRadius: moderateWidthScale(8),
      backgroundColor: theme.lightGreen07,
    },
    slotThumbPlaceholder: {
      alignItems: "center",
      justifyContent: "center",
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
    label: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
      marginBottom: moderateHeightScale(6),
    },
    input: {
      borderWidth: 1,
      borderColor: theme.lightGreen015,
      borderRadius: moderateWidthScale(12),
      paddingHorizontal: moderateWidthScale(14),
      paddingVertical: moderateHeightScale(12),
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.darkGreen,
      backgroundColor: theme.white,
      marginBottom: moderateHeightScale(12),
    },
    textArea: {
      minHeight: moderateHeightScale(96),
      textAlignVertical: "top",
      lineHeight: fontSize.size20,
    },
    charCount: {
      alignSelf: "flex-end",
      fontSize: fontSize.size11,
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
      gap: moderateWidthScale(10),
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
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.darkGreen,
    },
    generateButton: {
      marginTop: moderateHeightScale(8),
      marginBottom: moderateHeightScale(16),
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

function TemplatePreview({ uri }: { uri: string | null }) {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const resolvedUri = resolveApiImageUrl(uri) || "";
  const player = useVideoPlayer(resolvedUri, (p) => {
    p.loop = true;
    p.muted = true;
    if (resolvedUri) p.play();
  });

  useEffect(() => {
    if (!resolvedUri) return;
    try {
      player.replaceAsync(resolvedUri);
      player.play();
    } catch {}
  }, [player, resolvedUri]);

  if (!resolvedUri) {
    return (
      <View style={[styles.previewWrap, styles.previewPlaceholder]}>
        <MaterialIcons
          name="movie"
          size={moderateWidthScale(48)}
          color={theme.lightGreen}
        />
      </View>
    );
  }

  return (
    <View style={styles.previewWrap}>
      <VideoView
        style={styles.previewVideo}
        player={player}
        contentFit="cover"
        nativeControls={false}
      />
    </View>
  );
}

export default function ReelTemplateConfigureScreen() {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { showBanner } = useNotificationContext();
  const dispatch = useAppDispatch();

  const params = useLocalSearchParams<{ id?: string }>();
  const templateId = params.id ? Number(params.id) : null;

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

  const [template, setTemplate] = useState<ReelTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
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

  const [mediaPickerSlot, setMediaPickerSlot] = useState<number | null>(null);
  const [libraryVideos, setLibraryVideos] = useState<MediaVideo[]>([]);
  const [loadingLibrary, setLoadingLibrary] = useState(false);

  useEffect(() => {
    if (!templateId) {
      showBanner(t("error"), t("templateNotFound"), "error", 2500);
      router.back();
      return;
    }
    (async () => {
      setLoading(true);
      try {
        const data = await getReelTemplate(templateId);
        setTemplate(data);
        const count = data.media_count || data.media_fields?.length || 0;
        setSelectedMedia(Array.from({ length: count }, () => null));
        const initialTexts: Record<string, string> = {};
        for (const field of data.text_fields || []) {
          initialTexts[field] =
            field === "business_name" ? businessName : "";
        }
        setTexts(initialTexts);
      } catch (error: any) {
        Logger.error("Failed to load template:", error);
        showBanner(
          t("error"),
          error?.message || t("templateNotFound"),
          "error",
          3000,
        );
        router.back();
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templateId]);

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

  const openMediaPicker = useCallback(async (slotIndex: number) => {
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
  }, [showBanner, t]);

  const pickMedia = useCallback(
    (video: MediaVideo) => {
      if (mediaPickerSlot == null) return;
      setSelectedMedia((prev) => {
        const next = [...prev];
        next[mediaPickerSlot] = video;
        return next;
      });
      setMediaPickerSlot(null);
    },
    [mediaPickerSlot],
  );

  const fieldLabel = useCallback(
    (field: string) => {
      const key = TEXT_FIELD_LABELS[field];
      return key ? t(key) : field.replace(/_/g, " ");
    },
    [t],
  );

  const canGenerate = useMemo(() => {
    if (!template) return false;
    if (!caption.trim()) return false;
    if (!categoryId) return false;
    if (selectedMedia.some((m) => !m)) return false;
    return true;
  }, [caption, categoryId, selectedMedia, template]);

  const handleGenerate = useCallback(async () => {
    if (!template || !canGenerate || submitting || !categoryId) return;

    const mediaIds = selectedMedia
      .map((m) => m?.id)
      .filter((id): id is number => id != null);

    if (mediaIds.length !== template.media_count) {
      showBanner(t("error"), t("selectAllMediaSlots"), "error", 2500);
      return;
    }

    setSubmitting(true);
    try {
      const textsPayload: Record<string, string> = {};
      for (const field of template.text_fields || []) {
        const value = (texts[field] || "").trim();
        if (value) textsPayload[field] = value;
      }

      const result = await generateReelFromTemplate({
        template_id: template.id,
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
    selectedMedia,
    showBanner,
    submitting,
    t,
    template,
    texts,
  ]);

  if (loading || !template) {
    return (
      <View style={styles.safeArea}>
        <StackHeader title={t("configureTemplate")} />
        <View style={styles.loader}>
          <ActivityIndicator color={theme.buttonBack} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.safeArea, { paddingBottom: insets.bottom }]}>
      <StackHeader title={template.name} />
      <KeyboardAwareScrollView
        style={styles.flex}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        bottomOffset={moderateHeightScale(24)}
      >
        <TemplatePreview uri={template.preview_video_url ?? null} />

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t("selectMedia")}</Text>
          <Text style={styles.sectionHint}>
            {template.media_count === 1
              ? t("photosNeededOne")
              : t("photosNeeded", { count: template.media_count })}
          </Text>
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
                  <View style={[styles.slotThumb, styles.slotThumbPlaceholder]}>
                    <MaterialIcons
                      name="add-photo-alternate"
                      size={moderateWidthScale(22)}
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
                  size={moderateWidthScale(22)}
                  color={theme.lightGreen}
                />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {(template.text_fields?.length ?? 0) > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t("customText")}</Text>
            {template.text_fields.map((field) => (
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

        {template.has_music ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t("music")}</Text>
            <View style={styles.musicCard}>
              <MaterialIcons
                name="music-note"
                size={moderateWidthScale(22)}
                color={theme.buttonBack}
              />
              <Text style={styles.musicText} numberOfLines={2}>
                {t("includesMusicNamed", {
                  name: template.music_name || t("includesMusic"),
                })}
              </Text>
            </View>
          </View>
        ) : null}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {t("caption")} <Text style={{ color: theme.selectCard }}>*</Text>
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
            {t("category")} <Text style={{ color: theme.selectCard }}>*</Text>
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

        <Button
          title={t("generateReel")}
          onPress={handleGenerate}
          disabled={!canGenerate || submitting}
          loading={submitting}
          containerStyle={styles.generateButton}
        />
      </KeyboardAwareScrollView>

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
