import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useAppSelector, useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  moderateHeightScale,
  moderateWidthScale,
} from "@/src/theme/dimensions";
import StackHeader from "@/src/components/StackHeader";
import Button from "@/src/components/button";
import { useNotificationContext } from "@/src/contexts/NotificationContext";
import { ApiService } from "@/src/services/api";
import { businessEndpoints } from "@/src/services/endpoints";
import Logger from "@/src/services/logger";
import {
  createReel,
  getMyReel,
  publishReel,
  unpublishReel,
  updateReel,
} from "@/src/services/reelsService";
import { uploadVideo } from "@/src/services/mediaLibraryService";
import type { MediaUploadSourceType } from "@/src/types/media";
import type { OwnerReel } from "@/src/types/reels";

type CategoryOption = { id: number; name: string };
type ServiceOption = { id: number; name: string; price?: string | number };

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: theme.background },
    content: {
      paddingHorizontal: moderateWidthScale(20),
      paddingVertical: moderateHeightScale(16),
      paddingBottom: moderateHeightScale(40),
    },
    label: {
      marginTop: moderateHeightScale(14),
      marginBottom: moderateHeightScale(6),
      fontSize: fontSize.size13,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
    },
    input: {
      borderWidth: 1,
      borderColor: theme.borderLight,
      borderRadius: moderateWidthScale(10),
      paddingHorizontal: moderateWidthScale(12),
      paddingVertical: moderateHeightScale(12),
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.darkGreen,
      backgroundColor: theme.background,
    },
    textArea: {
      minHeight: moderateHeightScale(100),
      textAlignVertical: "top",
    },
    chipRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: moderateWidthScale(8),
    },
    chip: {
      paddingHorizontal: moderateWidthScale(12),
      paddingVertical: moderateHeightScale(8),
      borderRadius: moderateWidthScale(16),
      borderWidth: 1,
      borderColor: theme.borderLight,
    },
    chipActive: {
      backgroundColor: theme.buttonBack,
      borderColor: theme.buttonBack,
    },
    chipText: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
    },
    chipTextActive: { color: theme.buttonText },
    switchRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginTop: moderateHeightScale(18),
    },
    switchLabel: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
      flex: 1,
      paddingRight: moderateWidthScale(12),
    },
    buttons: {
      marginTop: moderateHeightScale(24),
      gap: moderateHeightScale(12),
    },
    progressText: {
      marginTop: moderateHeightScale(10),
      fontSize: fontSize.size13,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
      textAlign: "center",
    },
    center: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
    },
  });

export default function PublishReelScreen() {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();
  const router = useRouter();
  const { showBanner } = useNotificationContext();
  const businessStatus = useAppSelector((s) => s.user.businessStatus);

  const params = useLocalSearchParams<{
    mediaAssetId?: string;
    reelId?: string;
    videoUri?: string;
    mimeType?: string;
    fileName?: string;
    sourceType?: string;
  }>();
  const mediaAssetIdParam = params.mediaAssetId
    ? Number(params.mediaAssetId)
    : null;
  const localVideoUri = params.videoUri
    ? decodeURIComponent(params.videoUri)
    : "";
  const localMimeType = params.mimeType || "video/mp4";
  const localFileName = params.fileName || "video.mp4";
  const localSourceType: MediaUploadSourceType =
    params.sourceType === "camera" ? "camera" : "device";
  const reelId = params.reelId ? Number(params.reelId) : null;
  const isEdit = !!reelId;
  const fromEditor = !!localVideoUri && !mediaAssetIdParam;

  const [loading, setLoading] = useState(isEdit);
  const [savingDraft, setSavingDraft] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [unpublishing, setUnpublishing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const isSubmitting = savingDraft || publishing || unpublishing;
  const [resolvedMediaAssetId, setResolvedMediaAssetId] = useState<
    number | null
  >(mediaAssetIdParam);
  const [caption, setCaption] = useState("");
  const [lookTag, setLookTag] = useState("");
  const [promotionText, setPromotionText] = useState("");
  const [productTag, setProductTag] = useState("");
  const [availableNow, setAvailableNow] = useState(false);
  const [categoryId, setCategoryId] = useState<number | null>(
    businessStatus?.business_category?.id ?? null,
  );
  const [serviceId, setServiceId] = useState<number | null>(null);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [services, setServices] = useState<ServiceOption[]>([]);
  const [existing, setExisting] = useState<OwnerReel | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [catRes, svcRes] = await Promise.all([
          ApiService.get<{
            success: boolean;
            data?: CategoryOption[] | { data?: CategoryOption[] };
          }>(businessEndpoints.categories),
          ApiService.get<{
            success: boolean;
            data?: ServiceOption[] | { data?: ServiceOption[] };
          }>(businessEndpoints.services),
        ]);

        const catData = Array.isArray(catRes?.data)
          ? catRes.data
          : Array.isArray((catRes?.data as any)?.data)
            ? (catRes.data as any).data
            : [];
        setCategories(catData);

        const svcData = Array.isArray(svcRes?.data)
          ? svcRes.data
          : Array.isArray((svcRes?.data as any)?.data)
            ? (svcRes.data as any).data
            : [];
        setServices(svcData);

        if (!categoryId && catData[0]?.id) {
          setCategoryId(catData[0].id);
        }
      } catch (error) {
        Logger.error("Failed to load publish reel options:", error);
      }
    })();
  }, []);

  useEffect(() => {
    if (!reelId) return;
    (async () => {
      setLoading(true);
      try {
        const reel = await getMyReel(reelId);
        setExisting(reel);
        setCaption(reel.caption || "");
        setLookTag(reel.look_tag || "");
        setPromotionText(reel.promotion_text || "");
        setProductTag(reel.product_tag || "");
        setAvailableNow(!!reel.available_now);
        setCategoryId(reel.category?.id ?? null);
        setServiceId(reel.service?.id ?? null);
      } catch (error: any) {
        showBanner(
          t("error"),
          error?.message || t("failedToLoadReel"),
          "error",
          3000,
        );
        router.back();
      } finally {
        setLoading(false);
      }
    })();
  }, [reelId]);

  const validate = useCallback(() => {
    if (!caption.trim()) {
      showBanner(t("error"), t("captionRequired"), "error", 2500);
      return false;
    }
    if (!categoryId) {
      showBanner(t("error"), t("categoryRequired"), "error", 2500);
      return false;
    }
    if (!isEdit && !resolvedMediaAssetId && !localVideoUri) {
      showBanner(t("error"), t("videoRequired"), "error", 2500);
      return false;
    }
    return true;
  }, [
    caption,
    categoryId,
    isEdit,
    localVideoUri,
    resolvedMediaAssetId,
    showBanner,
    t,
  ]);

  const ensureMediaAssetId = useCallback(async (): Promise<number> => {
    if (resolvedMediaAssetId) return resolvedMediaAssetId;
    if (!localVideoUri) {
      throw new Error(t("videoRequired"));
    }
    setUploadProgress(0);
    const uploaded = await uploadVideo(
      {
        uri: localVideoUri,
        mimeType: localMimeType,
        fileName: localFileName,
        sourceType: localSourceType,
      },
      setUploadProgress,
    );
    setResolvedMediaAssetId(uploaded.id);
    return uploaded.id;
  }, [
    localFileName,
    localMimeType,
    localSourceType,
    localVideoUri,
    resolvedMediaAssetId,
    t,
  ]);

  const leaveAfterSuccess = useCallback(() => {
    if (fromEditor) {
      if (typeof router.dismiss === "function") {
        try {
          router.dismiss(2);
          return;
        } catch {}
      }
      router.back();
      setTimeout(() => {
        if (router.canGoBack()) router.back();
      }, 50);
      return;
    }
    router.back();
  }, [fromEditor, router]);

  const buildCreatePayload = (publish: boolean, mediaId: number) => ({
    media_asset_id: mediaId,
    category_id: categoryId!,
    caption: caption.trim(),
    ...(serviceId ? { service_id: serviceId } : {}),
    ...(lookTag.trim() ? { look_tag: lookTag.trim() } : {}),
    ...(promotionText.trim() ? { promotion_text: promotionText.trim() } : {}),
    ...(productTag.trim() ? { product_tag: productTag.trim() } : {}),
    available_now: availableNow,
    ...(publish ? { publish: true } : {}),
  });

  const handleSaveDraft = async () => {
    if (!validate() || isSubmitting) return;
    setSavingDraft(true);
    setUploadProgress(0);
    try {
      if (isEdit && reelId) {
        await updateReel(reelId, {
          caption: caption.trim(),
          category_id: categoryId!,
          service_id: serviceId,
          look_tag: lookTag.trim() || null,
          promotion_text: promotionText.trim() || null,
          product_tag: productTag.trim() || null,
          available_now: availableNow,
        });
        showBanner(t("success"), t("reelSaved"), "success", 2500);
      } else {
        const mediaId = await ensureMediaAssetId();
        await createReel(buildCreatePayload(false, mediaId));
        showBanner(t("success"), t("reelSavedAsDraft"), "success", 2500);
      }
      leaveAfterSuccess();
    } catch (error: any) {
      const msg =
        error?.response?.data?.errors?.caption?.[0] ||
        error?.response?.data?.errors?.media_asset_id?.[0] ||
        error?.response?.data?.errors?.category_id?.[0] ||
        error?.response?.data?.message ||
        error?.message ||
        t("failedToSaveReel");
      showBanner(t("error"), msg, "error", 3500);
    } finally {
      setSavingDraft(false);
      setUploadProgress(0);
    }
  };

  const handlePublish = async () => {
    if (!validate() || isSubmitting) return;
    setPublishing(true);
    setUploadProgress(0);
    try {
      if (isEdit && reelId) {
        await updateReel(reelId, {
          caption: caption.trim(),
          category_id: categoryId!,
          service_id: serviceId,
          look_tag: lookTag.trim() || null,
          promotion_text: promotionText.trim() || null,
          product_tag: productTag.trim() || null,
          available_now: availableNow,
        });
        if (existing?.status !== "published") {
          await publishReel(reelId);
        }
        showBanner(t("success"), t("reelPublished"), "success", 2500);
      } else {
        const mediaId = await ensureMediaAssetId();
        await createReel(buildCreatePayload(true, mediaId));
        showBanner(t("success"), t("reelPublished"), "success", 2500);
      }
      leaveAfterSuccess();
    } catch (error: any) {
      const msg =
        error?.response?.data?.errors?.media_asset_id?.[0] ||
        error?.response?.data?.errors?.reel?.[0] ||
        error?.response?.data?.message ||
        error?.message ||
        t("failedToPublishReel");
      showBanner(t("error"), msg, "error", 3500);
    } finally {
      setPublishing(false);
      setUploadProgress(0);
    }
  };

  const handleUnpublish = async () => {
    if (!reelId || isSubmitting) return;
    setUnpublishing(true);
    try {
      await unpublishReel(reelId);
      showBanner(t("success"), t("reelUnpublished"), "success", 2500);
      router.back();
    } catch (error: any) {
      showBanner(
        t("error"),
        error?.message || t("failedToUpdateReel"),
        "error",
        3000,
      );
    } finally {
      setUnpublishing(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.safeArea}>
        <StackHeader title={isEdit ? t("editReel") : t("publishReel")} />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.darkGreen} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.safeArea}>
      <StackHeader title={isEdit ? t("editReel") : t("publishReel")} />
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.label}>{t("caption")} *</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={caption}
          onChangeText={setCaption}
          placeholder={t("captionPlaceholder")}
          placeholderTextColor={theme.lightGreen}
          multiline
          maxLength={2200}
        />

        <Text style={styles.label}>{t("category")} *</Text>
        <View style={styles.chipRow}>
          {categories.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              style={[styles.chip, categoryId === cat.id && styles.chipActive]}
              onPress={() => setCategoryId(cat.id)}
            >
              <Text
                style={[
                  styles.chipText,
                  categoryId === cat.id && styles.chipTextActive,
                ]}
              >
                {cat.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>{t("serviceOptional")}</Text>
        <View style={styles.chipRow}>
          <TouchableOpacity
            style={[styles.chip, serviceId == null && styles.chipActive]}
            onPress={() => setServiceId(null)}
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
              style={[styles.chip, serviceId === svc.id && styles.chipActive]}
              onPress={() => setServiceId(svc.id)}
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

        <Text style={styles.label}>{t("lookTag")}</Text>
        <TextInput
          style={styles.input}
          value={lookTag}
          onChangeText={setLookTag}
          placeholder={t("lookTagPlaceholder")}
          placeholderTextColor={theme.lightGreen}
          maxLength={100}
        />

        <Text style={styles.label}>{t("promotionText")}</Text>
        <TextInput
          style={styles.input}
          value={promotionText}
          onChangeText={setPromotionText}
          placeholder={t("promotionTextPlaceholder")}
          placeholderTextColor={theme.lightGreen}
          maxLength={255}
        />

        <Text style={styles.label}>{t("productTag")}</Text>
        <TextInput
          style={styles.input}
          value={productTag}
          onChangeText={setProductTag}
          placeholder={t("productTagPlaceholder")}
          placeholderTextColor={theme.lightGreen}
          maxLength={255}
        />

        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>{t("availableNow")}</Text>
          <Switch
            value={availableNow}
            onValueChange={setAvailableNow}
            trackColor={{
              false: theme.lightGreen2,
              true: theme.orangeBrown,
            }}
            thumbColor={theme.white}
          />
        </View>

        <View style={styles.buttons}>
          {isSubmitting && fromEditor && uploadProgress > 0 ? (
            <Text style={styles.progressText}>
              {`${t("uploadingVideo")} ${uploadProgress}%`}
            </Text>
          ) : null}
          <Button
            title={isEdit ? t("saveChanges") : t("saveDraft")}
            onPress={handleSaveDraft}
            loading={savingDraft}
            disabled={isSubmitting}
          />
          <Button
            title={t("publish")}
            onPress={handlePublish}
            loading={publishing}
            disabled={isSubmitting || existing?.status === "removed"}
          />
          {isEdit && existing?.status === "published" && (
            <Button
              title={t("unpublish")}
              onPress={handleUnpublish}
              loading={unpublishing}
              disabled={isSubmitting}
              backgroundColor={theme.lightGreen4}
              textColor={theme.white}
            />
          )}
        </View>
      </ScrollView>
    </View>
  );
}
