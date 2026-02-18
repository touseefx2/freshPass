import React, {
  useCallback,
  useMemo,
  useRef,
  useState,
  useEffect,
} from "react";
import {
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  Image,
  KeyboardAvoidingView,
  Platform,
  TextInput,
  Keyboard,
} from "react-native";
import { useTranslation } from "react-i18next";
import { useRouter, useLocalSearchParams, useFocusEffect } from "expo-router";
import { useAppDispatch, useAppSelector, useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import {
  moderateWidthScale,
  moderateHeightScale,
} from "@/src/theme/dimensions";
import { fontSize, fonts } from "@/src/theme/fonts";
import { createStyles } from "./styles";
import StackHeader from "@/src/components/StackHeader";
import Button from "@/src/components/button";
import { MaterialIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import {
  handleMediaLibraryPermission,
  handleCameraPermission,
} from "@/src/services/mediaPermissionService";
import ModalizeBottomSheet from "@/src/components/modalizeBottomSheet";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import FullImageModal from "@/src/components/fullImageModal";
import HairPipelineProcessingModal, {
  type HairPipelineModalState,
  INITIAL_HAIR_PIPELINE_STATE,
} from "@/src/components/HairPipelineProcessingModal";
import { setActionLoader } from "@/src/state/slices/generalSlice";
import { useNotificationContext } from "@/src/contexts/NotificationContext";
import { AiToolsService } from "@/src/services/aiToolsService";
import Logger from "@/src/services/logger";
import { useStripe } from "@stripe/stripe-react-native";
import { fetchAiToolsPaymentSheetParams } from "@/src/services/stripeService";
import { ApiService } from "@/src/services/api";
import { userEndpoints } from "@/src/services/endpoints";
import { setUserDetails } from "@/src/state/slices/userSlice";
import UnlockAIFeaturesModal from "@/src/components/UnlockAIFeaturesModal";

interface MediaFile {
  id: string;
  uri: string;
  type: "image" | "video";
  thumbnailUri?: string; // For video thumbnails
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
  const { t } = useTranslation();
  const { showBanner } = useNotificationContext();
  const user = useAppSelector((state) => state.user);
  const aiQuota = useAppSelector((state) => state.user.ai_quota);
  const aiService = useAppSelector((state) => state.general.aiService);
  const params = useLocalSearchParams<{ toolType?: string }>();
  const styles = useMemo(() => createStyles(colors as Theme), [colors]);
  const theme = colors as Theme;
  const toolType = params.toolType || "";
  const headerTitle = toolType || t("aiTools");
  const businessId = user?.business_id ?? "";
  const userId = Number(user?.id) ?? 0;

  useFocusEffect(
    useCallback(() => {
      fetchQuota();
    }, []),
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

  const hairTryOnService =
    aiService?.find((s) => s.name === "AI Hair Try-On") ?? null;
  const isCustomerOrGuest = user.isGuest || user.userRole === "customer";

  // console.log("------> hairTryOnService", hairTryOnService);
  // console.log("------> aiQuota", aiQuota);

  const { initPaymentSheet, presentPaymentSheet } = useStripe();

  // State for Post (single image)
  const [postImage, setPostImage] = useState<string | null>(null);

  // State for Collage (2-6 images)
  const [collageImages, setCollageImages] = useState<MediaFile[]>([]);

  // State for Reel (3-15 media files + optional audio)
  const [reelMedia, setReelMedia] = useState<MediaFile[]>([]);
  const [backgroundMusic, setBackgroundMusic] = useState<AudioFile | null>(
    null,
  );

  // State for Hair Tryon (source image + prompt)
  const [hairTryonSourceImage, setHairTryonSourceImage] = useState<
    string | null
  >(null);
  const [hairTryonPrompt, setHairTryonPrompt] = useState<string>("");
  const [hairTryonSelectedType, setHairTryonSelectedType] =
    useState<HairTryonType | null>(null);

  // Processing = 3 credits, With Prompt = 1 credit. Show unlock when quota < required.
  const hairTryonCreditsRequired =
    hairTryonSelectedType === "processing"
      ? 3
      : hairTryonSelectedType === "withPromptAndImage"
        ? 1
        : 3;
  const showUnlockModal =
    toolType === "Hair Tryon" &&
    isCustomerOrGuest &&
    !!hairTryOnService &&
    (aiQuota == null || aiQuota < hairTryonCreditsRequired);

  // Modal states
  const [imagePickerVisible, setImagePickerVisible] = useState(false);
  const [mediaPickerVisible, setMediaPickerVisible] = useState(false);
  const [audioPickerVisible, setAudioPickerVisible] = useState(false);
  const [fullImageModalVisible, setFullImageModalVisible] = useState(false);

  // Hair pipeline processing modal state (single object)
  const [hairPipelineState, setHairPipelineState] =
    useState<HairPipelineModalState>(INITIAL_HAIR_PIPELINE_STATE);
  const hairPipelineStartTimeRef = useRef<number | null>(null);
  const hairPipelineIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null,
  );

  // console.log("hairPipelineState: ", hairPipelineState);

  // API state
  const [isGenerating, setIsGenerating] = useState(false);

  const showCreditBanner =
    !!hairTryOnService && aiQuota >= 0 && toolType === "Hair Tryon";

  const creditBannerMessage =
    aiQuota === 0
      ? "You have no credits."
      : `You have ${aiQuota} credit remaining`;

  // Has selection: show selected type name (left) + "Change selection" (right), then form
  const selectedTypeLabel =
    hairTryonSelectedType === "processing"
      ? t("processing")
      : t("withPromptAndImage");

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
  }, []);

  const handleHairPipelineSeeStatus = () => {
    router.push("/aiRequests");
    closeHairPipelineModal();
  };

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
        mediaTypes: isReel
          ? ImagePicker.MediaTypeOptions.All
          : ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection:
          toolType === "Generate Collage" || toolType === "Generate Reel",
        quality: 0.8,
        allowsEditing: false,
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
          const newMedia: MediaFile[] = result.assets
            .filter((asset) => asset.uri)
            .map((asset) => {
              const isVideo = asset.type === "video";
              return {
                id: generateId(),
                uri: asset.uri,
                type: isVideo ? "video" : "image",
                thumbnailUri: isVideo
                  ? (asset as any).thumbnailUri || asset.uri
                  : undefined,
              };
            });

          const totalMedia = reelMedia.length + newMedia.length;
          if (totalMedia > 15) {
            showBanner(
              t("limitExceeded"),
              t("reelLimitMessage"),
              "warning",
              3000,
            );
            const remaining = 15 - reelMedia.length;
            setReelMedia([...reelMedia, ...newMedia.slice(0, remaining)]);
          } else {
            setReelMedia([...reelMedia, ...newMedia]);
          }
        }
      }
    } catch (error) {
      Logger.error("Error selecting media:", error);
      showBanner(t("error"), t("failedToSelectMedia"), "error", 3000);
    }
  }, [toolType, collageImages, reelMedia, t]);

  const handleTakePhoto = useCallback(async () => {
    setImagePickerVisible(false);
    setMediaPickerVisible(false);
    const hasPermission = await handleCameraPermission();
    if (!hasPermission) {
      return;
    }

    try {
      const isReel = toolType === "Generate Reel";
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: isReel
          ? ImagePicker.MediaTypeOptions.All
          : ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
        allowsEditing: false,
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
          if (reelMedia.length >= 15) {
            showBanner(
              t("limitExceeded"),
              t("reelMax15Files"),
              "warning",
              3000,
            );
            return;
          }
          const isVideo = asset.type === "video";
          setReelMedia([
            ...reelMedia,
            {
              id: generateId(),
              uri: asset.uri,
              type: isVideo ? "video" : "image",
              thumbnailUri: isVideo
                ? (asset as any).thumbnailUri || asset.uri
                : undefined,
            },
          ]);
        }
      }
    } catch (error) {
      Logger.error("Error taking photo:", error);
      showBanner(t("error"), t("failedToTakePhoto"), "error", 3000);
    }
  }, [toolType, collageImages, reelMedia, t]);

  const handleDeleteImage = useCallback(
    (id: string) => {
      if (toolType === "Generate Collage") {
        setCollageImages(collageImages.filter((img) => img.id !== id));
      } else if (toolType === "Generate Reel") {
        setReelMedia(reelMedia.filter((media) => media.id !== id));
      }
    },
    [toolType, collageImages, reelMedia],
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
    setAudioPickerVisible(false);
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
  }, [t]);

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
      if (showUnlockModal && hairTryOnService) {
        router.push({
          pathname: "/(main)/tryOnPurchase",
          params: { serviceId: String(hairTryOnService.id), screen: "tools" },
        });
        return;
      }
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
      // Validate file types for collage images
      const allowedExtensions = ["jpg", "jpeg", "png"];
      const invalidImages = collageImages.filter((img) => {
        const fileExtension = img.uri.split(".").pop()?.toLowerCase() || "";
        return !allowedExtensions.includes(fileExtension);
      });
      if (invalidImages.length > 0) {
        showBanner(
          t("invalidFileType"),
          t("allImagesMustBeJpeg"),
          "warning",
          3000,
        );
        return;
      }
    } else if (toolType === "Generate Reel") {
      if (reelMedia.length < 3 || reelMedia.length > 15) {
        showBanner(
          t("validationError"),
          t("pleaseSelect3To15Media"),
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

    setIsGenerating(true);
    dispatch(setActionLoader(true));

    try {
      // let response;
      if (toolType === "Hair Tryon") {
        if (hairTryonSelectedType === "processing") {
          console.log("--------> userId: ", userId);
          // Hair pipeline: start background job and show processing modal
          const pipelineResponse = await AiToolsService.startHairPipeline(
            hairTryonSourceImage!,
            userId,
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
        // With prompt and image: start Replicate job, same modal as processing
        const prompt = hairTryonPrompt.trim();
        const pipelineResponse = await AiToolsService.generateHairTryon(
          hairTryonSourceImage!,
          prompt,
          true,
          userId,
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
          return;
        }
      } else if (toolType === "Generate Post") {
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
    setMediaPickerVisible(true);
  }, []);

  const openAudioPicker = useCallback(() => {
    setAudioPickerVisible(true);
  }, []);

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
          <Image source={{ uri: postImage }} style={styles.imagePreview} />
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
              <Image
                source={{ uri: image.uri }}
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

  const renderReelContent = () => (
    <>
      <View style={styles.fieldContainer}>
        <Text style={styles.label}>
          {t("mediaFiles3To15")} <Text style={styles.required}>*</Text>
        </Text>
        <TouchableOpacity
          style={styles.fileInput}
          onPress={openMediaPicker}
          activeOpacity={0.7}
        >
          <Text style={styles.fileInputText}>
            {reelMedia.length > 0
              ? t("filesSelectedCount", { count: reelMedia.length })
              : t("chooseFiles")}
          </Text>
          <MaterialIcons
            name="arrow-drop-down"
            size={moderateWidthScale(24)}
            color={theme.text}
          />
        </TouchableOpacity>
        {reelMedia.length > 0 && (
          <View style={styles.mediaGrid}>
            {reelMedia.map((media) => (
              <View key={media.id} style={styles.mediaItem}>
                {media.type === "image" ? (
                  <Image
                    source={{ uri: media.uri }}
                    style={styles.mediaThumbnail}
                  />
                ) : (
                  <View style={styles.videoThumbnailContainer}>
                    {media.thumbnailUri ? (
                      <Image
                        source={{ uri: media.thumbnailUri }}
                        style={styles.mediaThumbnail}
                      />
                    ) : (
                      <View style={styles.videoThumbnail}>
                        <MaterialIcons
                          name="videocam"
                          size={moderateWidthScale(24)}
                          color={theme.white}
                        />
                      </View>
                    )}
                    <View style={styles.videoPlayIcon}>
                      <MaterialIcons
                        name="videocam"
                        size={moderateWidthScale(32)}
                        color={theme.white}
                      />
                    </View>
                  </View>
                )}
                <TouchableOpacity
                  style={styles.deleteButtonSmall}
                  onPress={() => handleDeleteImage(media.id)}
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
        {reelMedia.length > 0 && (
          <Text style={styles.hintText}>
            {t("reelFilesCountHint", { count: reelMedia.length })}{" "}
            {t("reelMediaOrderHint")}
          </Text>
        )}
      </View>

      <View style={styles.fieldContainer}>
        <Text style={styles.label}>{t("backgroundMusicLabel")}</Text>
        <TouchableOpacity
          style={styles.fileInput}
          onPress={openAudioPicker}
          activeOpacity={0.7}
        >
          <Text style={styles.fileInputText}>
            {backgroundMusic ? backgroundMusic.name : t("chooseFile")}
          </Text>
          <MaterialIcons
            name="arrow-drop-down"
            size={moderateWidthScale(24)}
            color={theme.text}
          />
        </TouchableOpacity>
        {backgroundMusic && (
          <View style={styles.audioFileContainer}>
            <MaterialIcons
              name="audiotrack"
              size={moderateWidthScale(20)}
              color={theme.darkGreen}
            />
            <Text style={styles.audioFileName} numberOfLines={1}>
              {backgroundMusic.name}
            </Text>
            <TouchableOpacity
              style={styles.deleteButtonSmall}
              onPress={handleDeleteAudio}
              activeOpacity={0.7}
            >
              <MaterialIcons
                name="close"
                size={moderateWidthScale(16)}
                color={theme.white}
              />
            </TouchableOpacity>
          </View>
        )}
      </View>
    </>
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
          <TouchableOpacity
            style={[
              styles.hairTryonOptionCard,
              isProcessing && styles.hairTryonOptionCardSelected,
              isProcessingDisabled && styles.hairTryonOptionCardDisabled,
            ]}
            onPress={() => {
              if (!isProcessingDisabled) {
                setHairTryonSelectedType("processing");
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
            <View
              style={[
                styles.hairTryonOptionButton,
                isProcessing
                  ? styles.hairTryonOptionButtonActive
                  : styles.hairTryonOptionButtonInactive,
              ]}
            >
              <Text
                style={[
                  styles.hairTryonOptionButtonText,
                  isProcessing
                    ? styles.hairTryonOptionButtonTextActive
                    : styles.hairTryonOptionButtonTextInactive,
                ]}
              >
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
                setHairTryonSelectedType("withPromptAndImage");
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
            <View
              style={[
                styles.hairTryonOptionButton,
                isWithPrompt
                  ? styles.hairTryonOptionButtonActive
                  : styles.hairTryonOptionButtonInactive,
              ]}
            >
              <Text
                style={[
                  styles.hairTryonOptionButtonText,
                  isWithPrompt
                    ? styles.hairTryonOptionButtonTextActive
                    : styles.hairTryonOptionButtonTextInactive,
                ]}
              >
                {t("withPromptTryon")}
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <>
        <View style={styles.hairTryonChangeSelectionRow}>
          <Text style={styles.hairTryonSelectedTypeLabel}>
            {selectedTypeLabel}
          </Text>
          <TouchableOpacity
            onPress={() => setHairTryonSelectedType(null)}
            activeOpacity={0.7}
          >
            <Text style={styles.hairTryonChangeSelectionText}>
              {t("changeSelection")}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.fieldContainer}>
          <Text style={styles.label}>
            {t("sourceImage")} <Text style={styles.required}>*</Text>
          </Text>
          <TouchableOpacity
            style={styles.fileInput}
            onPress={openImagePicker}
            activeOpacity={0.7}
          >
            <Text style={styles.fileInputText}>
              {hairTryonSourceImage ? t("imageSelected") : t("chooseFile")}
            </Text>
            <MaterialIcons
              name="arrow-drop-down"
              size={moderateWidthScale(24)}
              color={theme.text}
            />
          </TouchableOpacity>
        </View>

        {hairTryonSelectedType === "withPromptAndImage" && (
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>
              {t("hairstyleDescription")} <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={[
                styles.textArea,
                {
                  backgroundColor: theme.background,
                  borderColor: theme.borderLine,
                  color: theme.text,
                },
              ]}
              placeholder={t("hairstylePlaceholder")}
              placeholderTextColor={theme.lightGreen4}
              value={hairTryonPrompt}
              onChangeText={setHairTryonPrompt}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
            />
          </View>
        )}

        {hairTryonSourceImage && (
          <View style={styles.imagePreviewContainer}>
            <TouchableOpacity
              onPress={() => setFullImageModalVisible(true)}
              activeOpacity={0.9}
              style={{ width: "100%", height: "100%" }}
            >
              <Image
                source={{ uri: hairTryonSourceImage }}
                style={styles.imagePreview}
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={handleDeleteHairTryonImage}
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
      </>
    );
  };

  return (
    <SafeAreaView edges={["bottom"]} style={styles.safeArea}>
      <StackHeader title={headerTitle} />

      {showCreditBanner && hairTryonSelectedType && (
        <View style={styles.creditBanner}>
          <Text style={styles.creditBannerText}>{creditBannerMessage}</Text>
        </View>
      )}

      <KeyboardAvoidingView
        style={styles.contentContainer}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentInsetAdjustmentBehavior="automatic"
        >
          {toolType === "Generate Post" && renderPostContent()}
          {toolType === "Generate Collage" && renderCollageContent()}
          {toolType === "Generate Reel" && renderReelContent()}
          {toolType === "Hair Tryon" && renderHairTryonContent()}
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={styles.buttonContainer}>
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
                        ? t("generateHairTryon")
                        : `Generate ${toolType.replace("Generate ", "")}`
              }
              onPress={handleGenerate}
              disabled={
                isGenerating ||
                (toolType === "Hair Tryon" ? !hairTryonSelectedType : false)
              }
            />
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

      {/* Audio Picker Modal */}
      <ModalizeBottomSheet
        visible={audioPickerVisible}
        onClose={() => setAudioPickerVisible(false)}
        title={t("selectAudioFile")}
      >
        <TouchableOpacity
          style={styles.optionItem}
          onPress={handleSelectAudio}
          activeOpacity={0.7}
        >
          <MaterialIcons
            name="audiotrack"
            size={moderateWidthScale(24)}
            color={theme.darkGreen}
            style={styles.optionIcon}
          />
          <Text style={styles.optionText}>{t("chooseAudioFile")}</Text>
        </TouchableOpacity>
      </ModalizeBottomSheet>

      {/* Full Image Modal for Hair Tryon Source Image */}
      <FullImageModal
        visible={fullImageModalVisible}
        onClose={() => setFullImageModalVisible(false)}
        imageUri={hairTryonSourceImage || null}
      />

      <HairPipelineProcessingModal
        state={hairPipelineState}
        onClose={closeHairPipelineModal}
        onSeeStatus={handleHairPipelineSeeStatus}
      />
    </SafeAreaView>
  );
}
