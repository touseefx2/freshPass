import React, {
  useCallback,
  useMemo,
  useRef,
  useState,
  useEffect,
} from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Platform,
  TextInput,
  Keyboard,
  Dimensions,
} from "react-native";
import { useTranslation } from "react-i18next";
import { useRouter, useLocalSearchParams, useFocusEffect } from "expo-router";
import { useAppDispatch, useAppSelector, useTheme } from "@/src/hooks/hooks";
import AppImage from "@/src/components/AppImage";
import { Theme } from "@/src/theme/colors";
import { moderateHeightScale, moderateWidthScale } from "@/src/theme/dimensions";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { createStyles } from "./styles";
import StackHeader from "@/src/components/StackHeader";
import Button from "@/src/components/button";
import ReelMediaTile, {
  type ReelMediaItem,
} from "@/src/components/reelMediaTile";
import LocalVideoPreviewModal from "@/src/components/localVideoPreviewModal";
import { MaterialCommunityIcons, MaterialIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import {
  handleMediaLibraryPermission,
  handleCameraPermission,
} from "@/src/services/mediaPermissionService";
import ModalizeBottomSheet from "@/src/components/modalizeBottomSheet";
import { SafeAreaView } from "react-native-safe-area-context";
import HairPipelineProcessingModal, {
  type HairPipelineModalState,
  INITIAL_HAIR_PIPELINE_STATE,
} from "@/src/components/HairPipelineProcessingModal";
import {
  setActionLoader,
  openFullImageModal,
  setAiHairTryOnConsentAccepted,
  setAiService,
  setTryOnPurchaseSuccessSource,
} from "@/src/state/slices/generalSlice";
import type { AdditionalServiceItem } from "@/src/state/slices/generalSlice";
import AiHairTryOnConsentModal from "@/src/components/aiHairTryOnConsentModal";
import TryOnCategoryPicker, {
  type TryOnCategory,
  type TryOnGender,
} from "@/src/components/tryOnCategoryPicker";
import { useNotificationContext } from "@/src/contexts/NotificationContext";
import { AiToolsService } from "@/src/services/aiToolsService";
import Logger from "@/src/services/logger";
import { ApiService } from "@/src/services/api";
import { businessEndpoints, userEndpoints } from "@/src/services/endpoints";
import { setUserDetails } from "@/src/state/slices/userSlice";
import { REEL_LIMIT_FALLBACK } from "@/src/utils/reelLimits";
import { extractLocalVideoThumbnail } from "@/src/utils/videoThumbnailCache";

const SCREEN_WIDTH = Dimensions.get("window").width;

interface MediaFile {
  id: string;
  uri: string;
  type: "image" | "video";
  thumbnailUri?: string;
  durationMs?: number;
}

interface AudioFile {
  id: string;
  uri: string;
  name: string;
}

export type HairTryonType = "processing" | "withPromptAndImage";

export default function Tools() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { colors } = useTheme();
  const { t, i18n } = useTranslation();
  const { showBanner } = useNotificationContext();
  const user = useAppSelector((state) => state.user);
  const aiQuota = useAppSelector((state) => state.user.ai_quota);
  const aiService = useAppSelector((state) => state.general.aiService);
  const aiHairTryOnConsentAccepted = useAppSelector(
    (state) => state.general.aiHairTryOnConsentAccepted,
  );
  const params = useLocalSearchParams<{ toolType?: string }>();
  const styles = useMemo(() => createStyles(colors as Theme), [colors]);
  const theme = colors as Theme;
  const toolType = params.toolType || "";
  const headerTitle =
    toolType === "Hair Tryon" ? t("aiTryOnTitle") : toolType || t("aiTools");
  const businessId = user?.business_id ?? "";
  const userId = Number(user?.id);

  useFocusEffect(
    useCallback(() => {
      fetchQuota();
      if (user.isGuest || user.userRole === "customer") {
        void fetchCustomerAiServices();
      }
    }, [user.isGuest, user.userRole]),
  );

  const fetchQuota = async () => {
    try {
      const response = await ApiService.get<{
        success: boolean;
        data?: { ai_quota?: number };
      }>(userEndpoints.details);
      if (response?.success && response.data?.ai_quota !== undefined) {
        dispatch(setUserDetails({ ai_quota: response.data.ai_quota }));
      }
    } catch {}
  };

  const fetchCustomerAiServices = async () => {
    try {
      const response = await ApiService.get<{
        success: boolean;
        message: string;
        data: AdditionalServiceItem[];
      }>(businessEndpoints.additionalServices("customer"));
      if (response.success && response.data) {
        dispatch(setAiService(response.data));
      }
    } catch (error) {
      Logger.error("Fetch customer additional services error:", error);
    }
  };

  const hairTryOnService =
    aiService?.find((s) => s.name === "AI Hair Try-On") ??
    aiService?.find((s) => /hair\s*try/i.test(s.name ?? "")) ??
    null;
  const isCustomerOrGuest = user.isGuest || user.userRole === "customer";

  // State for Post (single image)
  const [postImage, setPostImage] = useState<string | null>(null);

  // State for Collage (2-6 images)
  const [collageImages, setCollageImages] = useState<MediaFile[]>([]);

  // State for Reel (3–ai_max_images media files + optional audio)
  const [reelMedia, setReelMedia] = useState<MediaFile[]>([]);
  const [backgroundMusic, setBackgroundMusic] = useState<AudioFile | null>(
    null,
  );
  const [previewVideoUri, setPreviewVideoUri] = useState<string | null>(null);

  const reelAiMaxItems = REEL_LIMIT_FALLBACK.ai_max_images;
  const reelTileWidth = useMemo(
    () =>
      (SCREEN_WIDTH - moderateWidthScale(40) - moderateWidthScale(20)) / 3,
    [],
  );

  // State for Hair Tryon (source image + prompt)
  const [hairTryonSourceImage, setHairTryonSourceImage] = useState<
    string | null
  >(null);
  const [hairTryonPrompt, setHairTryonPrompt] = useState<string>("");
  const [hairTryonSelectedType, setHairTryonSelectedType] =
    useState<HairTryonType | null>(null);

  // Try-on category (+ Men / Women for hair categories), sent with both flows
  const [tryOnCategories, setTryOnCategories] = useState<TryOnCategory[]>([]);
  const [tryOnCategoriesLoading, setTryOnCategoriesLoading] = useState(false);
  const [tryOnCategoriesFailed, setTryOnCategoriesFailed] = useState(false);
  const [tryOnCategorySlug, setTryOnCategorySlug] = useState<string | null>(
    null,
  );
  const [tryOnGender, setTryOnGender] = useState<TryOnGender | null>(null);
  const selectedTryOnCategory =
    tryOnCategories.find((c) => c.slug === tryOnCategorySlug) ?? null;
  // No list (load failed) → old behaviour: no category sent
  const tryOnChoiceReady =
    tryOnCategories.length === 0 ||
    (!!selectedTryOnCategory &&
      (!selectedTryOnCategory.asksGender || !!tryOnGender));

  const fetchTryOnCategories = useCallback(async () => {
    setTryOnCategoriesLoading(true);
    setTryOnCategoriesFailed(false);
    try {
      const response = await ApiService.get<{
        success: boolean;
        data?: TryOnCategory[];
      }>(businessEndpoints.tryOnCategories(i18n.language));
      const list = Array.isArray(response?.data) ? response.data : [];
      setTryOnCategories(list);
      setTryOnCategorySlug((prev) =>
        prev && list.some((c) => c.slug === prev) ? prev : null,
      );
      if (list.length === 0) setTryOnCategoriesFailed(true);
    } catch (error) {
      Logger.error("Fetch try-on categories error:", error);
      setTryOnCategoriesFailed(true);
    } finally {
      setTryOnCategoriesLoading(false);
    }
  }, [i18n.language]);

  useEffect(() => {
    if (toolType === "Hair Tryon") void fetchTryOnCategories();
  }, [toolType, fetchTryOnCategories]);

  const handleSelectTryOnCategory = useCallback(
    (slug: string) => {
      if (slug !== tryOnCategorySlug) setTryOnGender(null);
      setTryOnCategorySlug(slug);
    },
    [tryOnCategorySlug],
  );

  // Processing = 3 credits, With Prompt = 1 credit. Show unlock when quota < required.
  const hairTryonCreditsRequired =
    hairTryonSelectedType === "processing"
      ? 3
      : hairTryonSelectedType === "withPromptAndImage"
        ? 1
        : 3;
  const needsTryOnPurchase =
    toolType === "Hair Tryon" &&
    isCustomerOrGuest &&
    (aiQuota == null || aiQuota < hairTryonCreditsRequired);

  // Modal states
  const [imagePickerVisible, setImagePickerVisible] = useState(false);
  const [mediaPickerVisible, setMediaPickerVisible] = useState(false);

  // Hair pipeline processing modal state (single object)
  const [hairPipelineState, setHairPipelineState] =
    useState<HairPipelineModalState>(INITIAL_HAIR_PIPELINE_STATE);
  const hairPipelineStartTimeRef = useRef<number | null>(null);
  const hairPipelineIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null,
  );

  // API state
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiConsentModalVisible, setAiConsentModalVisible] = useState(false);

  const showCreditBanner =
    // !!hairTryOnService &&
    aiQuota >= 0 && toolType === "Hair Tryon";
  // Generate stays disabled until every required field is filled
  const hairTryonFormReady =
    !!hairTryonSelectedType &&
    tryOnChoiceReady &&
    !!hairTryonSourceImage &&
    (hairTryonSelectedType !== "withPromptAndImage" ||
      !!hairTryonPrompt.trim());

  Logger.log("------>aiQuota", aiQuota);
  Logger.log("------>toolType", toolType);
  Logger.log("------>hairTryOnService", hairTryOnService);

  const creditBannerMessage = aiQuota
    ? t("tryOnCreditsRemaining", { count: aiQuota })
    : t("tryOnNoCredits");

  // Has selection: show selected type name + "Change" (top right), then form
  const selectedTypeLabel =
    hairTryonSelectedType === "processing"
      ? t("tryOnModeRecommendations")
      : t("tryOnModeCustom");

  const generateId = () => {
    return `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

  // Hair pipeline: progress bar over estimated time
  useEffect(() => {
    if (!hairPipelineState.visible || hairPipelineState.complete) return;
    const totalMs = hairPipelineState.estimatedMinutes * 60 * 1000;
    const start = hairPipelineStartTimeRef.current ?? Date.now();
    hairPipelineStartTimeRef.current = start;

    const tick = () => {
      const elapsed = Date.now() - start;
      const pct = Math.min(100, (elapsed / totalMs) * 100);
      setHairPipelineState((prev) => ({ ...prev, progress: pct }));
      if (pct >= 100) {
        setHairPipelineState((prev) => ({ ...prev, complete: true }));
        if (hairPipelineIntervalRef.current) {
          clearInterval(hairPipelineIntervalRef.current);
          hairPipelineIntervalRef.current = null;
        }
      }
    };

    tick();
    hairPipelineIntervalRef.current = setInterval(tick, 500);
    return () => {
      if (hairPipelineIntervalRef.current) {
        clearInterval(hairPipelineIntervalRef.current);
        hairPipelineIntervalRef.current = null;
      }
    };
  }, [
    hairPipelineState.visible,
    hairPipelineState.estimatedMinutes,
    hairPipelineState.complete,
  ]);

  const closeHairPipelineModal = useCallback(() => {
    if (hairPipelineIntervalRef.current) {
      clearInterval(hairPipelineIntervalRef.current);
      hairPipelineIntervalRef.current = null;
    }
    setHairPipelineState(INITIAL_HAIR_PIPELINE_STATE);
    hairPipelineStartTimeRef.current = null;
    fetchQuota();
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(main)/aiTools/toolList" as any);
    }
  }, [router]);

  const isVideoAsset = (asset: ImagePicker.ImagePickerAsset): boolean => {
    if (asset.type === "video") return true;
    const mime = (asset as { mimeType?: string }).mimeType ?? "";
    if (mime.startsWith("video/")) return true;
    const uri = asset.uri?.toLowerCase() ?? "";
    return /\.(mp4|mov|m4v|webm|avi|mkv)(\?|$)/i.test(uri);
  };

  const mapAssetToMediaFile = (
    asset: ImagePicker.ImagePickerAsset,
  ): MediaFile => {
    const isVideo = isVideoAsset(asset);
    const durationMs =
      typeof asset.duration === "number" && asset.duration > 0
        ? asset.duration
        : undefined;
    const pickerThumb = (asset as { thumbnailUri?: string }).thumbnailUri;
    return {
      id: generateId(),
      uri: asset.uri,
      type: isVideo ? "video" : "image",
      // Never use the video file URI as an Image source
      thumbnailUri:
        isVideo && pickerThumb && pickerThumb !== asset.uri
          ? pickerThumb
          : undefined,
      durationMs,
    };
  };

  const appendReelMedia = useCallback(
    async (incoming: MediaFile[]) => {
      if (incoming.length === 0) return;

      setReelMedia((prev) => {
        const remaining = reelAiMaxItems - prev.length;
        if (remaining <= 0) return prev;
        return [...prev, ...incoming.slice(0, remaining)];
      });

      // Extract real still frames for videos (picker URI is not displayable in Image)
      for (const item of incoming) {
        if (item.type !== "video" || item.thumbnailUri) continue;
        const thumb = await extractLocalVideoThumbnail(item.uri);
        if (!thumb) continue;
        setReelMedia((prev) =>
          prev.map((m) =>
            m.id === item.id ? { ...m, thumbnailUri: thumb } : m,
          ),
        );
      }
    },
    [reelAiMaxItems],
  );

  const handleSelectFromGallery = useCallback(async () => {
    setImagePickerVisible(false);
    setMediaPickerVisible(false);
    const hasPermission = await handleMediaLibraryPermission();
    if (!hasPermission) {
      return;
    }

    try {
      const isReel = toolType === "Generate Reel";
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: isReel ? ["images", "videos"] : "images",
        allowsMultipleSelection:
          toolType === "Generate Collage" || toolType === "Generate Reel",
        quality: 0.8,
        allowsEditing: false,
        ...(Platform.OS === "ios" && {
          preferredAssetRepresentationMode:
            ImagePicker.UIImagePickerPreferredAssetRepresentationMode
              .Compatible,
        }),
      });

      if (!result.canceled && result.assets) {
        if (toolType === "Generate Post") {
          if (result.assets[0]) {
            setPostImage(result.assets[0].uri);
          }
        } else if (toolType === "Hair Tryon") {
          if (result.assets[0]) {
            setHairTryonSourceImage(result.assets[0].uri);
          }
        } else if (toolType === "Generate Collage") {
          const newImages: MediaFile[] = result.assets
            .filter((asset) => asset.uri)
            .map((asset) => ({
              id: generateId(),
              uri: asset.uri,
              type: "image" as const,
            }));

          const totalImages = collageImages.length + newImages.length;
          if (totalImages > 6) {
            showBanner(
              t("limitExceeded"),
              t("collageLimitMessage"),
              "warning",
              3000,
            );
            const remaining = 6 - collageImages.length;
            setCollageImages([
              ...collageImages,
              ...newImages.slice(0, remaining),
            ]);
          } else {
            setCollageImages([...collageImages, ...newImages]);
          }
        } else if (toolType === "Generate Reel") {
          const newMedia = result.assets
            .filter((asset) => asset.uri)
            .map(mapAssetToMediaFile);

          if (reelMedia.length + newMedia.length > reelAiMaxItems) {
            showBanner(
              t("limitExceeded"),
              t("reelLimitMessageDynamic", { max: reelAiMaxItems }),
              "warning",
              3000,
            );
          }
          await appendReelMedia(newMedia);
        }
      }
    } catch (error) {
      Logger.error("Error selecting media:", error);
      showBanner(t("error"), t("failedToSelectMedia"), "error", 3000);
    }
  }, [
    toolType,
    collageImages,
    reelMedia.length,
    reelAiMaxItems,
    appendReelMedia,
    showBanner,
    t,
  ]);

  const handleTakePhoto = useCallback(async () => {
    setImagePickerVisible(false);
    setMediaPickerVisible(false);
    const hasPermission = await handleCameraPermission();
    if (!hasPermission) {
      return;
    }

    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ["images"],
        quality: 0.8,
        allowsEditing: false,
        ...(Platform.OS === "ios" && {
          preferredAssetRepresentationMode:
            ImagePicker.UIImagePickerPreferredAssetRepresentationMode
              .Compatible,
        }),
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];
        if (toolType === "Generate Post") {
          setPostImage(asset.uri);
        } else if (toolType === "Hair Tryon") {
          setHairTryonSourceImage(asset.uri);
        } else if (toolType === "Generate Collage") {
          if (collageImages.length >= 6) {
            showBanner(
              t("limitExceeded"),
              t("collageMax6Images"),
              "warning",
              3000,
            );
            return;
          }
          setCollageImages([
            ...collageImages,
            {
              id: generateId(),
              uri: asset.uri,
              type: "image",
            },
          ]);
        } else if (toolType === "Generate Reel") {
          if (reelMedia.length >= reelAiMaxItems) {
            showBanner(
              t("limitExceeded"),
              t("reelMaxFilesDynamic", { max: reelAiMaxItems }),
              "warning",
              3000,
            );
            return;
          }
          await appendReelMedia([mapAssetToMediaFile(asset)]);
        }
      }
    } catch (error) {
      Logger.error("Error taking photo:", error);
      showBanner(t("error"), t("failedToTakePhoto"), "error", 3000);
    }
  }, [
    toolType,
    collageImages,
    reelMedia.length,
    reelAiMaxItems,
    appendReelMedia,
    showBanner,
    t,
  ]);

  const handleRecordVideo = useCallback(async () => {
    setMediaPickerVisible(false);
    const hasPermission = await handleCameraPermission();
    if (!hasPermission) {
      return;
    }

    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ["videos"],
        quality: 1,
        videoMaxDuration: 60,
        ...(Platform.OS === "ios" && {
          preferredAssetRepresentationMode:
            ImagePicker.UIImagePickerPreferredAssetRepresentationMode
              .Compatible,
        }),
      });

      if (!result.canceled && result.assets?.[0]) {
        if (reelMedia.length >= reelAiMaxItems) {
          showBanner(
            t("limitExceeded"),
            t("reelMaxFilesDynamic", { max: reelAiMaxItems }),
            "warning",
            3000,
          );
          return;
        }
        await appendReelMedia([mapAssetToMediaFile(result.assets[0])]);
      }
    } catch (error) {
      Logger.error("Error recording video:", error);
      showBanner(t("error"), t("failedToRecordVideo"), "error", 3000);
    }
  }, [reelMedia.length, reelAiMaxItems, appendReelMedia, showBanner, t]);

  const handleReelMediaPress = useCallback(
    (media: ReelMediaItem) => {
      if (media.type === "video") {
        setPreviewVideoUri(media.uri);
        return;
      }
      dispatch(openFullImageModal({ images: [media.uri] }));
    },
    [dispatch],
  );

  const handleReelThumbnailReady = useCallback(
    (id: string, thumbnailUri: string) => {
      setReelMedia((prev) =>
        prev.map((m) => (m.id === id ? { ...m, thumbnailUri } : m)),
      );
    },
    [],
  );
  const handleDeleteImage = useCallback(
    (id: string) => {
      if (toolType === "Generate Collage") {
        setCollageImages((prev) => prev.filter((img) => img.id !== id));
      } else if (toolType === "Generate Reel") {
        setReelMedia((prev) => prev.filter((media) => media.id !== id));
      }
    },
    [toolType],
  );

  const handleDeletePostImage = useCallback(() => {
    setPostImage(null);
  }, []);

  const handleDeleteHairTryonImage = useCallback(() => {
    setHairTryonSourceImage(null);
  }, []);

  const handleDeleteAudio = useCallback(() => {
    setBackgroundMusic(null);
  }, []);

  const handleSelectAudio = useCallback(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["audio/mpeg", "audio/wav", "audio/mp4", "audio/x-m4a"],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const audioFile = result.assets[0];
        const fileName = audioFile.name || "audio_file";
        const fileExtension = fileName.split(".").pop()?.toLowerCase();

        // Validate file extension
        const allowedExtensions = ["mp3", "wav", "m4a"];
        if (fileExtension && !allowedExtensions.includes(fileExtension)) {
          showBanner(
            t("invalidFileType"),
            t("invalidAudioFileType"),
            "warning",
            3000,
          );
          return;
        }

        setBackgroundMusic({
          id: generateId(),
          uri: audioFile.uri,
          name: fileName,
        });
      }
    } catch (error) {
      Logger.error("Error selecting audio file:", error);
      showBanner(t("error"), t("failedToSelectAudio"), "error", 3000);
    }
  }, [t, showBanner]);

  const openTryOnPurchase = useCallback(() => {
    dispatch(setTryOnPurchaseSuccessSource("tools"));
    router.push({
      pathname: "/(main)/tryOnPurchase",
      params: {
        ...(hairTryOnService ? { serviceId: String(hairTryOnService.id) } : {}),
        screen: "tools",
      },
    });
  }, [dispatch, hairTryOnService, router]);

  // Not enough credits for the chosen style → buy first, then fill the form
  const handleSelectHairTryonType = useCallback(
    (type: HairTryonType) => {
      setHairTryonSelectedType(type);
      const required = type === "withPromptAndImage" ? 1 : 3;
      if (isCustomerOrGuest && (aiQuota == null || aiQuota < required)) {
        openTryOnPurchase();
      }
    },
    [aiQuota, isCustomerOrGuest, openTryOnPurchase],
  );

  const executeHairTryonGeneration = useCallback(async () => {
    if (needsTryOnPurchase) {
      openTryOnPurchase();
      return;
    }

    if (!userId || !Number.isFinite(userId)) {
      showBanner(t("error"), t("pleaseSignInToContinue"), "error", 3000);
      return;
    }

    const tryOnChoice = selectedTryOnCategory
      ? {
          category: selectedTryOnCategory.slug,
          gender: selectedTryOnCategory.asksGender ? tryOnGender : null,
        }
      : undefined;

    setIsGenerating(true);
    dispatch(setActionLoader(true));

    try {
      if (hairTryonSelectedType === "processing") {
        const pipelineResponse = await AiToolsService.startHairPipeline(
          hairTryonSourceImage!,
          userId,
          tryOnChoice,
        );
        hairPipelineStartTimeRef.current = Date.now();
        setHairPipelineState({
          visible: true,
          jobId: pipelineResponse.job_id,
          jobType: "Hair Tryon",
          estimatedMinutes: pipelineResponse.estimated_time_minutes ?? 5,
          progress: 0,
          imageUri: hairTryonSourceImage,
          complete: false,
        });
        return;
      }

      const prompt = hairTryonPrompt.trim();
      const pipelineResponse = await AiToolsService.generateHairTryon(
        hairTryonSourceImage!,
        prompt,
        true,
        userId,
        tryOnChoice,
      );
      if (pipelineResponse?.job_id) {
        hairPipelineStartTimeRef.current = Date.now();
        setHairPipelineState({
          visible: true,
          jobId: pipelineResponse.job_id,
          jobType: "Hair Tryon",
          estimatedMinutes: pipelineResponse.estimated_time_minutes ?? 5,
          progress: 0,
          imageUri: hairTryonSourceImage,
          complete: false,
        });
      }
    } catch (error: any) {
      Logger.error("Error generating hair try-on:", error);

      if (error.isNoInternet) {
        showBanner(
          t("noInternetConnection"),
          t("pleaseCheckInternetConnection"),
          "error",
          2000,
        );
        return;
      }

      // 422 naming category/gender = choice not accepted (app-side bug): don't
      // show the raw detail; refresh the list and ask to pick again. Other
      // 422s (bad image etc.) fall through to the backend message.
      const detail = error.data?.detail;
      const rejectsChoice =
        typeof detail === "string"
          ? /\b(category|gender)\b/i.test(detail)
          : Array.isArray(detail) &&
            detail.some(
              (d: any) =>
                Array.isArray(d?.loc) &&
                (d.loc.includes("category") || d.loc.includes("gender")),
            );
      if (error.status === 422 && tryOnChoice && rejectsChoice) {
        Logger.error("Try-on choice rejected (422):", error.data);
        setTryOnCategorySlug(null);
        setTryOnGender(null);
        void fetchTryOnCategories();
        showBanner(t("error"), t("tryOnChoiceInvalid"), "error", 4000);
        return;
      }

      const errorMessage = error.message || t("failedToGenerate");
      showBanner(t("error"), errorMessage, "error", 4000);
    } finally {
      setIsGenerating(false);
      dispatch(setActionLoader(false));
    }
  }, [
    dispatch,
    fetchTryOnCategories,
    selectedTryOnCategory,
    tryOnGender,
    hairTryonPrompt,
    hairTryonSelectedType,
    hairTryonSourceImage,
    showBanner,
    t,
    userId,
    needsTryOnPurchase,
    openTryOnPurchase,
  ]);

  const handleAiConsentAgree = useCallback(() => {
    dispatch(setAiHairTryOnConsentAccepted(true));
    setAiConsentModalVisible(false);
    if (needsTryOnPurchase) {
      openTryOnPurchase();
      return;
    }
    executeHairTryonGeneration();
  }, [
    dispatch,
    executeHairTryonGeneration,
    needsTryOnPurchase,
    openTryOnPurchase,
  ]);

  const handleAiConsentDecline = useCallback(() => {
    setAiConsentModalVisible(false);
  }, []);

  const handleAiConsentAppStoreConfigMissing = useCallback(() => {
    showBanner(t("error"), t("appStoreConfigNotSet"), "error", 4000);
  }, [showBanner, t]);

  const handleGenerate = async () => {
    // Validation
    if (toolType === "Generate Post") {
      if (!postImage) {
        showBanner(
          t("validationError"),
          t("pleaseSelectImage"),
          "warning",
          3000,
        );
        return;
      }
    } else if (toolType === "Hair Tryon") {
      if (!hairTryonSelectedType) {
        showBanner(
          t("validationError"),
          t("pleaseSelectTryonType"),
          "warning",
          3000,
        );
        return;
      }
      if (tryOnCategories.length > 0 && !selectedTryOnCategory) {
        showBanner(t("validationError"), t("tryOnPickCategory"), "warning", 3000);
        return;
      }
      if (selectedTryOnCategory?.asksGender && !tryOnGender) {
        showBanner(t("validationError"), t("tryOnPickGender"), "warning", 3000);
        return;
      }
      if (!hairTryonSourceImage) {
        showBanner(
          t("validationError"),
          t("pleaseSelectSourceImage"),
          "warning",
          3000,
        );
        return;
      }
      if (
        hairTryonSelectedType === "withPromptAndImage" &&
        !hairTryonPrompt.trim()
      ) {
        showBanner(
          t("validationError"),
          t("pleaseEnterHairstyleDescription"),
          "warning",
          3000,
        );
        return;
      }
      if (!aiHairTryOnConsentAccepted) {
        setAiConsentModalVisible(true);
        return;
      }
      if (needsTryOnPurchase) {
        openTryOnPurchase();
        return;
      }

      await executeHairTryonGeneration();
      return;
    } else if (toolType === "Generate Collage") {
      if (collageImages.length < 2) {
        showBanner(
          t("validationError"),
          t("pleaseSelectAtLeast2Images"),
          "warning",
          3000,
        );
        return;
      }
      // File types are normalized to JPEG at upload time (prepareImageForUpload)
    } else if (toolType === "Generate Reel") {
      if (reelMedia.length < 3 || reelMedia.length > reelAiMaxItems) {
        showBanner(
          t("validationError"),
          t("pleaseSelect3ToMaxMedia", { max: reelAiMaxItems }),
          "warning",
          3000,
        );
        return;
      }
    }

    // Check if business_id is available (only for social media tools)
    if (toolType !== "Hair Tryon" && !businessId) {
      showBanner(t("error"), t("businessIdNotFound"), "error", 3000);
      return;
    }

    if (!userId || !Number.isFinite(userId)) {
      showBanner(t("error"), t("pleaseSignInToContinue"), "error", 3000);
      return;
    }

    setIsGenerating(true);
    dispatch(setActionLoader(true));

    try {
      if (toolType === "Generate Post") {
        const postResponse = await AiToolsService.generatePost(
          businessId.toString(),
          postImage!,
          userId,
        );
        if (postResponse?.job_id) {
          const estimatedMinutes = postResponse.estimated_time_seconds
            ? Math.max(1, Math.ceil(postResponse.estimated_time_seconds / 60))
            : 5;
          hairPipelineStartTimeRef.current = Date.now();
          setHairPipelineState({
            visible: true,
            jobId: postResponse.job_id,
            jobType: "Generate Post",
            estimatedMinutes,
            progress: 0,
            imageUri: postImage,
            complete: false,
          });
          return;
        }
      } else if (toolType === "Generate Collage") {
        const imageUris = collageImages.map((img) => img.uri);
        const collageResponse = await AiToolsService.generateCollage(
          businessId.toString(),
          imageUris,
          userId,
        );
        if (collageResponse?.job_id) {
          const estimatedMinutes = collageResponse.estimated_time_seconds
            ? Math.max(
                1,
                Math.ceil(collageResponse.estimated_time_seconds / 60),
              )
            : 5;
          hairPipelineStartTimeRef.current = Date.now();
          setHairPipelineState({
            visible: true,
            jobId: collageResponse.job_id,
            jobType: "Generate Collage",
            estimatedMinutes,
            progress: 0,
            imageUri: imageUris[0] ?? null,
            complete: false,
          });
          return;
        }
      } else if (toolType === "Generate Reel") {
        const mediaFiles = reelMedia.map((media) => ({
          uri: media.uri,
          type: media.type,
        }));
        const reelResponse = await AiToolsService.generateReel(
          businessId.toString(),
          mediaFiles,
          userId,
          backgroundMusic?.uri,
          backgroundMusic?.name,
        );
        if (reelResponse?.job_id) {
          const estimatedMinutes = reelResponse.estimated_time_seconds
            ? Math.max(1, Math.ceil(reelResponse.estimated_time_seconds / 60))
            : 5;
          hairPipelineStartTimeRef.current = Date.now();
          setHairPipelineState({
            visible: true,
            jobId: reelResponse.job_id,
            jobType: "Generate Reel",
            estimatedMinutes,
            progress: 0,
            imageUri: mediaFiles[0]?.uri ?? null,
            complete: false,
          });
          return;
        }
      } else {
        throw new Error("Invalid tool type");
      }
    } catch (error: any) {
      Logger.error(`Error generating ${toolType.toLowerCase()}:`, error);

      // Handle no internet error
      if (error.isNoInternet) {
        showBanner(
          t("noInternetConnection"),
          t("pleaseCheckInternetConnection"),
          "error",
          2000,
        );
        return;
      }

      // Handle other errors
      const errorMessage = error.message || t("failedToGenerate");
      showBanner(t("error"), errorMessage, "error", 4000);
    } finally {
      setIsGenerating(false);
      dispatch(setActionLoader(false));
    }
  };

  const openImagePicker = useCallback(() => {
    Keyboard.dismiss();
    setImagePickerVisible(true);
  }, []);

  const openMediaPicker = useCallback(() => {
    Keyboard.dismiss();
    setMediaPickerVisible(true);
  }, []);

  const openAudioPicker = useCallback(() => {
    Keyboard.dismiss();
    void handleSelectAudio();
  }, [handleSelectAudio]);

  const renderPostContent = () => (
    <View style={styles.fieldContainer}>
      <Text style={styles.label}>{t("image")}</Text>
      <TouchableOpacity
        style={styles.fileInput}
        onPress={openImagePicker}
        activeOpacity={0.7}
      >
        <Text style={styles.fileInputText}>
          {postImage ? t("imageSelected") : t("chooseFile")}
        </Text>
        <MaterialIcons
          name="arrow-drop-down"
          size={moderateWidthScale(24)}
          color={theme.text}
        />
      </TouchableOpacity>
      {postImage && (
        <View style={styles.imagePreviewContainer}>
          <AppImage uri={postImage} style={styles.imagePreview} />
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={handleDeletePostImage}
            activeOpacity={0.7}
          >
            <MaterialIcons
              name="delete"
              size={moderateWidthScale(20)}
              color={theme.white}
            />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  const renderCollageContent = () => (
    <View style={styles.fieldContainer}>
      <Text style={styles.label}>
        {t("images2To6")} <Text style={styles.required}>*</Text>
      </Text>
      <TouchableOpacity
        style={styles.fileInput}
        onPress={openImagePicker}
        activeOpacity={0.7}
      >
        <Text style={styles.fileInputText}>
          {collageImages.length > 0
            ? t("imagesSelectedCount", { count: collageImages.length })
            : t("chooseFiles")}
        </Text>
        <MaterialIcons
          name="arrow-drop-down"
          size={moderateWidthScale(24)}
          color={theme.text}
        />
      </TouchableOpacity>
      {collageImages.length > 0 && (
        <View style={styles.mediaGrid}>
          {collageImages.map((image) => (
            <View key={image.id} style={styles.mediaItem}>
              <AppImage
                uri={image.uri}
                style={styles.mediaThumbnail}
              />
              <TouchableOpacity
                style={styles.deleteButtonSmall}
                onPress={() => handleDeleteImage(image.id)}
                activeOpacity={0.7}
              >
                <MaterialIcons
                  name="close"
                  size={moderateWidthScale(16)}
                  color={theme.white}
                />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}
      {collageImages.length > 0 && (
        <Text style={styles.hintText}>
          {t("collageImagesCountHint", { count: collageImages.length })}
        </Text>
      )}
    </View>
  );

  const renderReelContent = () => {
    const reelImages = reelMedia
      .map((media, index) => ({ media, index }))
      .filter(({ media }) => media.type === "image");
    const reelVideos = reelMedia
      .map((media, index) => ({ media, index }))
      .filter(({ media }) => media.type === "video");

    return (
    <>
      <View style={styles.fieldContainer}>
        <View style={styles.labelRow}>
          <Text style={styles.labelInRow}>
            {t("mediaFiles3ToMax", { max: reelAiMaxItems })}{" "}
            <Text style={styles.required}>*</Text>
          </Text>
        </View>
        <TouchableOpacity
          style={[
            styles.mediaPickerCard,
            reelMedia.length > 0 && styles.mediaPickerCardFilled,
          ]}
          onPress={openMediaPicker}
          activeOpacity={0.75}
          disabled={reelMedia.length >= reelAiMaxItems}
        >
          <View style={styles.mediaPickerIconCircle}>
            <MaterialIcons
              name={reelMedia.length > 0 ? "add" : "perm-media"}
              size={moderateWidthScale(22)}
              color={theme.white}
            />
          </View>
          <View style={styles.mediaPickerTextCol}>
            <Text style={styles.mediaPickerTitle}>
              {reelMedia.length > 0
                ? t("addMoreMedia")
                : t("addPhotosOrVideos")}
            </Text>
            <Text style={styles.mediaPickerSubtitle}>
              {reelMedia.length > 0
                ? t("filesSelectedCount", { count: reelMedia.length })
                : t("reelMediaPickerHint")}
            </Text>
          </View>
          <MaterialIcons
            name="chevron-right"
            size={moderateWidthScale(24)}
            color={theme.lightGreen}
          />
        </TouchableOpacity>
        {reelImages.length > 0 && (
          <View style={styles.mediaSection}>
            <View style={styles.mediaSectionHeader}>
              <MaterialIcons
                name="photo-library"
                size={moderateWidthScale(16)}
                color={theme.darkGreen}
              />
              <Text style={styles.mediaSectionTitle}>{t("photos")}</Text>
              <Text style={styles.mediaSectionCount}>{reelImages.length}</Text>
            </View>
            <View style={styles.mediaGrid}>
              {reelImages.map(({ media, index }) => (
                <ReelMediaTile
                  key={media.id}
                  media={media}
                  index={index}
                  width={reelTileWidth}
                  onPress={handleReelMediaPress}
                  onRemove={handleDeleteImage}
                  onThumbnailReady={handleReelThumbnailReady}
                />
              ))}
            </View>
          </View>
        )}
        {reelVideos.length > 0 && (
          <View style={styles.mediaSection}>
            <View style={styles.mediaSectionHeader}>
              <MaterialIcons
                name="videocam"
                size={moderateWidthScale(16)}
                color={theme.darkGreen}
              />
              <Text style={styles.mediaSectionTitle}>{t("videos")}</Text>
              <Text style={styles.mediaSectionCount}>{reelVideos.length}</Text>
            </View>
            <View style={styles.mediaGrid}>
              {reelVideos.map(({ media, index }) => (
                <ReelMediaTile
                  key={media.id}
                  media={media}
                  index={index}
                  width={reelTileWidth}
                  onPress={handleReelMediaPress}
                  onRemove={handleDeleteImage}
                  onThumbnailReady={handleReelThumbnailReady}
                />
              ))}
            </View>
          </View>
        )}
        {reelMedia.length > 0 && (
          <Text style={styles.hintText}>
            {t("reelFilesCountHint", { count: reelMedia.length })}{" "}
            {t("reelMediaOrderHint")}
          </Text>
        )}
      </View>

      <View style={styles.fieldContainer}>
        <View style={styles.labelRow}>
          <Text style={styles.labelInRow}>{t("backgroundMusicLabel")}</Text>
          <View style={styles.optionalBadge}>
            <Text style={styles.optionalBadgeText}>{t("optional")}</Text>
          </View>
        </View>
        {backgroundMusic ? (
          <View style={styles.musicCard}>
            <View style={styles.musicIconCircle}>
              <MaterialIcons
                name="music-note"
                size={moderateWidthScale(22)}
                color={theme.white}
              />
            </View>
            <View style={styles.musicTextCol}>
              <Text style={styles.musicTitle} numberOfLines={1}>
                {backgroundMusic.name}
              </Text>
              <Text style={styles.musicSubtitle}>{t("musicSelectedHint")}</Text>
            </View>
            <TouchableOpacity
              style={styles.musicActionBtn}
              onPress={openAudioPicker}
              activeOpacity={0.7}
            >
              <Text style={styles.musicActionText}>{t("changeMusic")}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.musicRemoveBtn}
              onPress={handleDeleteAudio}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={t("remove")}
            >
              <MaterialIcons
                name="close"
                size={moderateWidthScale(16)}
                color={theme.red}
              />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.musicCard, styles.musicCardEmpty]}
            onPress={openAudioPicker}
            activeOpacity={0.75}
          >
            <View style={styles.musicIconCircle}>
              <MaterialIcons
                name="library-music"
                size={moderateWidthScale(22)}
                color={theme.white}
              />
            </View>
            <View style={styles.musicTextCol}>
              <Text style={styles.musicTitle}>{t("addBackgroundMusic")}</Text>
              <Text style={styles.musicSubtitle}>
                {t("backgroundMusicFormats")}
              </Text>
            </View>
            <MaterialIcons
              name="add"
              size={moderateWidthScale(24)}
              color={theme.darkGreen}
            />
          </TouchableOpacity>
        )}
      </View>
    </>
    );
  };

  // Credits left + separate Buy Credits button
  const renderCreditsPill = () => (
    <View style={styles.hairTryonCreditsRow}>
      <View style={styles.hairTryonCreditsPill}>
        <MaterialCommunityIcons
          name="database"
          size={moderateWidthScale(16)}
          color={theme.darkGreen}
        />
        <Text style={styles.hairTryonCreditsText}>
          {creditBannerMessage}
        </Text>
      </View>
      {isCustomerOrGuest && (
        <TouchableOpacity
          style={styles.hairTryonBuyCreditsButton}
          onPress={openTryOnPurchase}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={t("tryOnBuyCredits")}
        >
          <Text style={styles.hairTryonBuyCreditsText}>
            {t("tryOnBuyCredits")}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderHairTryonContent = () => {
    const isProcessing = hairTryonSelectedType === "processing";
    const isWithPrompt = hairTryonSelectedType === "withPromptAndImage";
    const isProcessingDisabled = hairTryonSelectedType === "withPromptAndImage";
    const isWithPromptDisabled = hairTryonSelectedType === "processing";
    const hasSelection = hairTryonSelectedType !== null;

    // No selection: show only the two option cards
    if (!hasSelection) {
      return (
        <View style={styles.hairTryonOptionsContainer}>
          {showCreditBanner && (
            <View style={[styles.hairTryonTopRow, { marginTop: 0 }]}>
              {renderCreditsPill()}
            </View>
          )}
          <TouchableOpacity
            style={[
              styles.hairTryonOptionCard,
              isProcessing && styles.hairTryonOptionCardSelected,
              isProcessingDisabled && styles.hairTryonOptionCardDisabled,
            ]}
            onPress={() => {
              if (!isProcessingDisabled) {
                handleSelectHairTryonType("processing");
              }
            }}
            activeOpacity={0.8}
            disabled={isProcessingDisabled}
          >
            <View style={styles.hairTryonOptionHeader}>
              <Text style={styles.hairTryonOptionTitle}>{t("processing")}</Text>
              <View style={styles.hairTryonOptionBadge}>
                <Text style={styles.hairTryonOptionBadgeText}>
                  {t("hairTryonCreditsThree")}
                </Text>
              </View>
            </View>
            <Text style={styles.hairTryonOptionDesc}>
              {t("hairTryonPipelineDesc")}
            </Text>
            <Text style={[styles.hairTryonOptionDesc, { marginBottom: 0 }]}>
              • {t("hairTryonImageRequirement")}
            </Text>
            <View style={[styles.hairTryonOptionButton, styles.hairTryonOptionButtonActive]}>
              <Text style={[styles.hairTryonOptionButtonText, styles.hairTryonOptionButtonTextActive]}>
                {t("tryHairTryOn")}
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.hairTryonOptionCard,
              isWithPrompt && styles.hairTryonOptionCardSelected,
              isWithPromptDisabled && styles.hairTryonOptionCardDisabled,
            ]}
            onPress={() => {
              if (!isWithPromptDisabled) {
                handleSelectHairTryonType("withPromptAndImage");
              }
            }}
            activeOpacity={0.8}
            disabled={isWithPromptDisabled}
          >
            <View style={styles.hairTryonOptionHeader}>
              <Text style={styles.hairTryonOptionTitle}>
                {t("withPromptAndImage")}
              </Text>
              <View style={styles.hairTryonOptionBadge}>
                <Text style={styles.hairTryonOptionBadgeText}>
                  {t("hairTryonCreditsOne")}
                </Text>
              </View>
            </View>
            <Text style={styles.hairTryonOptionDesc}>
              {t("hairTryonPromptDesc")}
            </Text>
            <Text style={[styles.hairTryonOptionDesc, { marginBottom: 0 }]}>
              • {t("hairTryonImageRequirement")}
            </Text>
            <View style={[styles.hairTryonOptionButton, styles.hairTryonOptionButtonActive]}>
              <Text style={[styles.hairTryonOptionButtonText, styles.hairTryonOptionButtonTextActive]}>
                {t("withPromptTryon")}
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <>
        {showCreditBanner && (
          <View style={styles.hairTryonTopRow}>
            {renderCreditsPill()}
          </View>
        )}
        <View style={styles.hairTryonTopRow}>
          <View style={styles.hairTryonModeRow}>
            <Text style={styles.hairTryonSelectedTypeLabel} numberOfLines={1}>
              {selectedTypeLabel}
            </Text>
            <View style={styles.hairTryonModeDivider} />
            <TouchableOpacity
              onPress={() => setHairTryonSelectedType(null)}
              activeOpacity={0.7}
              hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
              accessibilityRole="button"
            >
              <Text style={styles.hairTryonChangeSelectionText}>
                {t("tryOnChange")}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <TryOnCategoryPicker
          categories={tryOnCategories}
          loading={tryOnCategoriesLoading}
          loadFailed={tryOnCategoriesFailed}
          onRetry={() => void fetchTryOnCategories()}
          selectedSlug={tryOnCategorySlug}
          onSelectCategory={handleSelectTryOnCategory}
          gender={tryOnGender}
          onSelectGender={setTryOnGender}
        />

        <View style={styles.fieldContainer}>
          <Text style={styles.hairTryonLabel}>
            {t("tryOnYourPhoto")} <Text style={styles.required}>*</Text>
          </Text>
          <TouchableOpacity
            style={styles.hairTryonPhotoCard}
            onPress={openImagePicker}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={
              hairTryonSourceImage
                ? t("tryOnPhotoChangeHint")
                : t("tryOnUploadPhoto")
            }
          >
            {hairTryonSourceImage ? (
              <TouchableOpacity
                onPress={() =>
                  dispatch(
                    openFullImageModal({ images: [hairTryonSourceImage] }),
                  )
                }
                activeOpacity={0.9}
              >
                <AppImage
                  uri={hairTryonSourceImage}
                  style={styles.hairTryonPhotoThumb}
                />
              </TouchableOpacity>
            ) : (
              <View style={styles.hairTryonPhotoIcon}>
                <MaterialIcons
                  name="add-photo-alternate"
                  size={moderateWidthScale(26)}
                  color={theme.darkGreen}
                />
              </View>
            )}
            <View style={styles.hairTryonPhotoTextCol}>
              <Text style={styles.hairTryonPhotoTitle}>
                {hairTryonSourceImage
                  ? t("tryOnPhotoAdded")
                  : t("tryOnUploadPhoto")}
              </Text>
              <Text style={styles.hairTryonPhotoSubtitle}>
                {hairTryonSourceImage
                  ? t("tryOnPhotoChangeHint")
                  : t("tryOnUploadPhotoHint")}
              </Text>
            </View>
            {hairTryonSourceImage ? (
              <TouchableOpacity
                style={styles.hairTryonPhotoRemove}
                onPress={handleDeleteHairTryonImage}
                activeOpacity={0.7}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="button"
                accessibilityLabel={t("tryOnRemovePhoto")}
              >
                <MaterialIcons
                  name="delete-outline"
                  size={moderateWidthScale(20)}
                  color={theme.red}
                />
              </TouchableOpacity>
            ) : (
              <MaterialIcons
                name="chevron-right"
                size={moderateWidthScale(26)}
                color={theme.darkGreen}
              />
            )}
          </TouchableOpacity>
        </View>

        {hairTryonSelectedType === "withPromptAndImage" && (
          <View style={styles.fieldContainer}>
            <Text style={styles.hairTryonLabel}>
              {t("tryOnDescribeLook")} <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.hairTryonPromptInput}
              placeholder={t("tryOnDescribePlaceholder")}
              placeholderTextColor={theme.lightGreen4}
              value={hairTryonPrompt}
              onChangeText={setHairTryonPrompt}
              multiline
              textAlignVertical="top"
              accessibilityLabel={t("tryOnDescribeLook")}
            />
          </View>
        )}
      </>
    );
  };

  return (
    <SafeAreaView edges={["bottom"]} style={styles.safeArea}>
      <StackHeader
        title={headerTitle}
        rightIcon={
          toolType === "Hair Tryon" ? (
            <MaterialCommunityIcons
              name="star-four-points-outline"
              size={moderateWidthScale(24)}
              color={theme.orangeBrown}
            />
          ) : undefined
        }
      />

      <View style={styles.contentContainer}>
        <KeyboardAwareScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          contentInsetAdjustmentBehavior="automatic"
          bottomOffset={moderateHeightScale(32)}
        >
          {toolType === "Generate Post" && renderPostContent()}
          {toolType === "Generate Collage" && renderCollageContent()}
          {toolType === "Generate Reel" && renderReelContent()}
          {toolType === "Hair Tryon" && renderHairTryonContent()}
        </KeyboardAwareScrollView>
      </View>

      <View
        style={[
          styles.buttonContainer,
          toolType === "Hair Tryon" &&
            hairTryonSelectedType &&
            styles.hairTryonButtonContainer,
        ]}
      >
        {/* For Hair Tryon: show button area only after user selects a type */}
        {!(toolType === "Hair Tryon" && !hairTryonSelectedType) && (
          <>
            <Button
              title={
                toolType === "Generate Post"
                  ? t("generatePost")
                  : toolType === "Generate Collage"
                    ? t("generateCollage")
                    : toolType === "Generate Reel"
                      ? t("generateReel")
                      : toolType === "Hair Tryon"
                        ? t("tryOnGenerate")
                        : `Generate ${toolType.replace("Generate ", "")}`
              }
              onPress={handleGenerate}
              disabled={
                isGenerating ||
                (toolType === "Hair Tryon" ? !hairTryonFormReady : false) ||
                (toolType === "Generate Reel" &&
                  (reelMedia.length < 3 ||
                    reelMedia.length > reelAiMaxItems))
              }
            />
            {toolType === "Hair Tryon" && !hairTryonFormReady && (
              <Text style={styles.hairTryonHelperText}>
                {hairTryonSelectedType === "withPromptAndImage"
                  ? t("tryOnHelperCustom")
                  : t("tryOnHelperPhoto")}
              </Text>
            )}
          </>
        )}
      </View>

      {/* Image Picker Modal for Post and Collage */}
      <ModalizeBottomSheet
        visible={imagePickerVisible}
        onClose={() => setImagePickerVisible(false)}
        title={t("selectPhoto")}
      >
        <TouchableOpacity
          style={styles.optionItem}
          onPress={handleSelectFromGallery}
          activeOpacity={0.7}
        >
          <MaterialIcons
            name="photo-library"
            size={moderateWidthScale(24)}
            color={theme.darkGreen}
            style={styles.optionIcon}
          />
          <Text style={styles.optionText}>{t("fromGallery")}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.optionItem}
          onPress={handleTakePhoto}
          activeOpacity={0.7}
        >
          <MaterialIcons
            name="camera-alt"
            size={moderateWidthScale(24)}
            color={theme.darkGreen}
            style={styles.optionIcon}
          />
          <Text style={styles.optionText}>{t("fromCamera")}</Text>
        </TouchableOpacity>
      </ModalizeBottomSheet>

      {/* Media Picker Modal for Reel */}
      <ModalizeBottomSheet
        visible={mediaPickerVisible}
        onClose={() => setMediaPickerVisible(false)}
        title={t("selectMedia")}
      >
        <TouchableOpacity
          style={styles.sheetOptionCard}
          onPress={handleSelectFromGallery}
          activeOpacity={0.7}
        >
          <View style={styles.sheetOptionIcon}>
            <MaterialIcons
              name="photo-library"
              size={moderateWidthScale(22)}
              color={theme.darkGreen}
            />
          </View>
          <View style={styles.sheetOptionTextCol}>
            <Text style={styles.sheetOptionTitle}>{t("fromGallery")}</Text>
            <Text style={styles.sheetOptionDesc}>
              {t("reelGalleryOptionDesc")}
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.sheetOptionCard}
          onPress={handleTakePhoto}
          activeOpacity={0.7}
        >
          <View style={styles.sheetOptionIcon}>
            <MaterialIcons
              name="photo-camera"
              size={moderateWidthScale(22)}
              color={theme.darkGreen}
            />
          </View>
          <View style={styles.sheetOptionTextCol}>
            <Text style={styles.sheetOptionTitle}>{t("takePhoto")}</Text>
            <Text style={styles.sheetOptionDesc}>
              {t("takePhotoDescription")}
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.sheetOptionCard, { borderBottomWidth: 0 }]}
          onPress={handleRecordVideo}
          activeOpacity={0.7}
        >
          <View style={styles.sheetOptionIcon}>
            <MaterialIcons
              name="videocam"
              size={moderateWidthScale(22)}
              color={theme.darkGreen}
            />
          </View>
          <View style={styles.sheetOptionTextCol}>
            <Text style={styles.sheetOptionTitle}>{t("recordVideoOption")}</Text>
            <Text style={styles.sheetOptionDesc}>
              {t("recordVideoDescriptionShort")}
            </Text>
          </View>
        </TouchableOpacity>
      </ModalizeBottomSheet>

      <LocalVideoPreviewModal
        visible={!!previewVideoUri}
        uri={previewVideoUri}
        onClose={() => setPreviewVideoUri(null)}
      />

      <HairPipelineProcessingModal
        state={hairPipelineState}
        onClose={closeHairPipelineModal}
      />

      <AiHairTryOnConsentModal
        visible={aiConsentModalVisible}
        onAgree={handleAiConsentAgree}
        onDecline={handleAiConsentDecline}
        onAppStoreConfigMissing={handleAiConsentAppStoreConfigMissing}
      />
    </SafeAreaView>
  );
}
