import React, { useMemo, useState, useCallback } from "react";
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
import { useRouter, useLocalSearchParams } from "expo-router";
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
import GeneratePostResultModal from "@/src/components/GeneratePostResultModal";
import FullImageModal from "@/src/components/fullImageModal";
import { setActionLoader } from "@/src/state/slices/generalSlice";
import { useNotificationContext } from "@/src/contexts/NotificationContext";
import { AiToolsService } from "@/src/services/aiToolsService";
import Logger from "@/src/services/logger";

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
  const { showBanner } = useNotificationContext();
  const user = useAppSelector((state) => state.user);
  const params = useLocalSearchParams<{ toolType?: string }>();
  const styles = useMemo(() => createStyles(colors as Theme), [colors]);
  const theme = colors as Theme;
  const toolType = params.toolType || "";
  const headerTitle = toolType || "Ai Tools";
  const businessId = user?.business_id ?? "";

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

  // Modal states
  const [imagePickerVisible, setImagePickerVisible] = useState(false);
  const [mediaPickerVisible, setMediaPickerVisible] = useState(false);
  const [audioPickerVisible, setAudioPickerVisible] = useState(false);
  const [resultModalVisible, setResultModalVisible] = useState(false);
  const [fullImageModalVisible, setFullImageModalVisible] = useState(false);

  // API state
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedResult, setGeneratedResult] = useState<any>(null);

  const generateId = () => {
    return `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
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
              "Limit Exceeded",
              "You can select maximum 6 images. Only first 6 will be added.",
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
              "Limit Exceeded",
              "You can select maximum 15 media files. Only first 15 will be added.",
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
      showBanner(
        "Error",
        "Failed to select media. Please try again.",
        "error",
        3000,
      );
    }
  }, [toolType, collageImages, reelMedia]);

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
              "Limit Exceeded",
              "You can select maximum 6 images.",
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
              "Limit Exceeded",
              "You can select maximum 15 media files.",
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
      showBanner(
        "Error",
        "Failed to take photo. Please try again.",
        "error",
        3000,
      );
    }
  }, [toolType, collageImages, reelMedia]);

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
            "Invalid File Type",
            "Please select an audio file in MP3, WAV, or M4A format.",
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
      showBanner(
        "Error",
        "Failed to select audio file. Please try again.",
        "error",
        3000,
      );
    }
  }, []);

  const handleGenerate = async () => {
    // Validation
    if (toolType === "Generate Post") {
      if (!postImage) {
        showBanner(
          "Validation Error",
          "Please select an image.",
          "warning",
          3000,
        );
        return;
      }
    } else if (toolType === "Hair Tryon") {
      if (!hairTryonSelectedType) {
        showBanner(
          "Validation Error",
          "Please select a try-on type (Processing or With prompt and image).",
          "warning",
          3000,
        );
        return;
      }
      if (!hairTryonSourceImage) {
        showBanner(
          "Validation Error",
          "Please select a source image.",
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
          "Validation Error",
          "Please enter a hairstyle description.",
          "warning",
          3000,
        );
        return;
      }
    } else if (toolType === "Generate Collage") {
      if (collageImages.length < 2) {
        showBanner(
          "Validation Error",
          "Please select at least 2 images (maximum 6).",
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
          "Invalid File Type",
          "All images must be in JPEG, PNG, or JPG format.",
          "warning",
          3000,
        );
        return;
      }
    } else if (toolType === "Generate Reel") {
      if (reelMedia.length < 3 || reelMedia.length > 15) {
        showBanner(
          "Validation Error",
          "Please select 3-15 media files (images or videos).",
          "warning",
          3000,
        );
        return;
      }
    }

    // Check if business_id is available (only for social media tools)
    if (toolType !== "Hair Tryon" && !businessId) {
      showBanner(
        "Error",
        "Business ID not found. Please complete your business profile.",
        "error",
        3000,
      );
      return;
    }

    setIsGenerating(true);
    dispatch(setActionLoader(true));

    try {
      let response;

      if (toolType === "Hair Tryon") {
        // Generate Hair Tryon (prompt required only for withPromptAndImage)
        const prompt =
          hairTryonSelectedType === "withPromptAndImage"
            ? hairTryonPrompt.trim()
            : "";
        response = await AiToolsService.generateHairTryon(
          hairTryonSourceImage!,
          prompt,
          true, // generate_all_views = true
        );
      } else if (toolType === "Generate Post") {
        // Generate Post
        response = await AiToolsService.generatePost(
          businessId.toString(),
          postImage!,
        );
      } else if (toolType === "Generate Collage") {
        // Generate Collage
        const imageUris = collageImages.map((img) => img.uri);
        response = await AiToolsService.generateCollage(
          businessId.toString(),
          imageUris,
        );
      } else if (toolType === "Generate Reel") {
        // Generate Reel
        const mediaFiles = reelMedia.map((media) => ({
          uri: media.uri,
          type: media.type,
        }));
        response = await AiToolsService.generateReel(
          businessId.toString(),
          mediaFiles,
          backgroundMusic?.uri,
          backgroundMusic?.name,
        );
      } else {
        throw new Error("Invalid tool type");
      }

      // Save the result
      setGeneratedResult(response);
      setResultModalVisible(true);
    } catch (error: any) {
      Logger.error(`Error generating ${toolType.toLowerCase()}:`, error);

      // Handle no internet error
      if (error.isNoInternet) {
        showBanner(
          "No Internet Connection",
          "Please check your internet connection and try again.",
          "error",
          2000,
        );
        return;
      }

      // Handle other errors
      const errorMessage =
        error.message ||
        `Failed to generate ${toolType.toLowerCase()}. Please try again.`;
      showBanner("Error", errorMessage, "error", 4000);
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
      <Text style={styles.label}>Image</Text>
      <TouchableOpacity
        style={styles.fileInput}
        onPress={openImagePicker}
        activeOpacity={0.7}
      >
        <Text style={styles.fileInputText}>
          {postImage ? "Image Selected" : "Choose File"}
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
        Images (2-6 images) <Text style={styles.required}>*</Text>
      </Text>
      <TouchableOpacity
        style={styles.fileInput}
        onPress={openImagePicker}
        activeOpacity={0.7}
      >
        <Text style={styles.fileInputText}>
          {collageImages.length > 0
            ? `${collageImages.length} image(s) selected`
            : "Choose Files"}
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
          {collageImages.length}/6 images selected
        </Text>
      )}
    </View>
  );

  const renderReelContent = () => (
    <>
      <View style={styles.fieldContainer}>
        <Text style={styles.label}>
          Media Files (3-15 images/videos){" "}
          <Text style={styles.required}>*</Text>
        </Text>
        <TouchableOpacity
          style={styles.fileInput}
          onPress={openMediaPicker}
          activeOpacity={0.7}
        >
          <Text style={styles.fileInputText}>
            {reelMedia.length > 0
              ? `${reelMedia.length} file(s) selected`
              : "Choose Files"}
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
            {reelMedia.length}/15 files selected. The order of media files in
            the generated reel will be the same as the order you upload them.
          </Text>
        )}
      </View>

      <View style={styles.fieldContainer}>
        <Text style={styles.label}>Background Music (MP3, WAV, M4A)</Text>
        <TouchableOpacity
          style={styles.fileInput}
          onPress={openAudioPicker}
          activeOpacity={0.7}
        >
          <Text style={styles.fileInputText}>
            {backgroundMusic ? backgroundMusic.name : "Choose File"}
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
            onPress={() =>
              !isProcessingDisabled && setHairTryonSelectedType("processing")
            }
            activeOpacity={0.8}
            disabled={isProcessingDisabled}
          >
            <View style={styles.hairTryonOptionHeader}>
              <Text style={styles.hairTryonOptionTitle}>Processing</Text>
              <View style={styles.hairTryonOptionBadge}>
                <Text style={styles.hairTryonOptionBadgeText}>~5 min</Text>
              </View>
            </View>
            <Text style={styles.hairTryonOptionDesc}>
              Polling strategy: initial delay 3-5s, poll every 5-10s while
              processing. Jobs expire after 24 hours.
            </Text>
            <Text style={[styles.hairTryonOptionDesc, { marginBottom: 0 }]}>
              • Validate image (JPG/PNG, ≤10MB)
            </Text>
            <Text style={[styles.hairTryonOptionDesc, { marginBottom: 0 }]}>
              • Handle network retries and rate limits
            </Text>
            <Text style={[styles.hairTryonOptionDesc, { marginBottom: 0 }]}>
              • Show progress using step and current_recommendation
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
                Try Hair Try-On
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.hairTryonOptionCard,
              isWithPrompt && styles.hairTryonOptionCardSelected,
              isWithPromptDisabled && styles.hairTryonOptionCardDisabled,
            ]}
            onPress={() =>
              !isWithPromptDisabled &&
              setHairTryonSelectedType("withPromptAndImage")
            }
            activeOpacity={0.8}
            disabled={isWithPromptDisabled}
          >
            <View style={styles.hairTryonOptionHeader}>
              <Text style={styles.hairTryonOptionTitle}>
                With prompt and image
              </Text>
              <View style={styles.hairTryonOptionBadge}>
                <Text style={styles.hairTryonOptionBadgeText}>~5 min</Text>
              </View>
            </View>
            <Text style={styles.hairTryonOptionSubtitle}>
              Describe + upload
            </Text>
            <Text style={styles.hairTryonOptionDesc}>
              Provide a text description and a source photo. Replicate returns
              front, left, right, and back views.
            </Text>
            <Text style={[styles.hairTryonOptionDesc, { marginBottom: 0 }]}>
              • Validate image (JPG/PNG, ≤10MB)
            </Text>
            <Text style={[styles.hairTryonOptionDesc, { marginBottom: 0 }]}>
              • Handle network retries and rate limits
            </Text>
            <Text style={[styles.hairTryonOptionDesc, { marginBottom: 0 }]}>
              • Show progress using step and current_recommendation
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
                With prompt Try-on
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      );
    }

    // Has selection: show selected type name (left) + "Change selection" (right), then form
    const selectedTypeLabel =
      hairTryonSelectedType === "processing"
        ? "Processing"
        : "With prompt and image";
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
              Change selection
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.fieldContainer}>
          <Text style={styles.label}>
            Source Image <Text style={styles.required}>*</Text>
          </Text>
          <TouchableOpacity
            style={styles.fileInput}
            onPress={openImagePicker}
            activeOpacity={0.7}
          >
            <Text style={styles.fileInputText}>
              {hairTryonSourceImage ? "Image Selected" : "Choose File"}
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
              Hairstyle Description <Text style={styles.required}>*</Text>
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
              placeholder="e.g., Short bob haircut with side-swept bangs, blonde highlights."
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
            {generatedResult && (
              <TouchableOpacity
                style={{
                  backgroundColor: theme.orangeBrown30,
                  borderRadius: moderateWidthScale(8),
                  padding: moderateWidthScale(16),
                  marginBottom: moderateHeightScale(16),
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
                onPress={() => setResultModalVisible(true)}
                activeOpacity={0.7}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    flex: 1,
                  }}
                >
                  <MaterialIcons
                    name="visibility"
                    size={moderateWidthScale(20)}
                    color={theme.darkGreen}
                    style={{ marginRight: moderateWidthScale(12) }}
                  />
                  <Text
                    style={{
                      fontSize: fontSize.size14,
                      fontFamily: fonts.fontMedium,
                      color: theme.darkGreen,
                      flex: 1,
                    }}
                  >
                    View Previous Result
                  </Text>
                </View>
                <MaterialIcons
                  name="chevron-right"
                  size={moderateWidthScale(20)}
                  color={theme.darkGreen}
                />
              </TouchableOpacity>
            )}
            <Button
              title={`Generate ${toolType.replace("Generate ", "")}`}
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
        title="Select Photo"
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
          <Text style={styles.optionText}>From Gallery</Text>
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
          <Text style={styles.optionText}>From Camera</Text>
        </TouchableOpacity>
      </ModalizeBottomSheet>

      {/* Media Picker Modal for Reel */}
      <ModalizeBottomSheet
        visible={mediaPickerVisible}
        onClose={() => setMediaPickerVisible(false)}
        title="Select Media"
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
          <Text style={styles.optionText}>From Gallery</Text>
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
          <Text style={styles.optionText}>From Camera</Text>
        </TouchableOpacity>
      </ModalizeBottomSheet>

      {/* Audio Picker Modal */}
      <ModalizeBottomSheet
        visible={audioPickerVisible}
        onClose={() => setAudioPickerVisible(false)}
        title="Select Audio File"
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
          <Text style={styles.optionText}>Choose Audio File</Text>
        </TouchableOpacity>
      </ModalizeBottomSheet>

      {/* Result Modal */}
      <GeneratePostResultModal
        visible={resultModalVisible}
        onClose={() => setResultModalVisible(false)}
        result={generatedResult}
        toolType={toolType}
      />

      {/* Full Image Modal for Hair Tryon Source Image */}
      <FullImageModal
        visible={fullImageModalVisible}
        onClose={() => setFullImageModalVisible(false)}
        imageUri={hairTryonSourceImage || null}
      />
    </SafeAreaView>
  );
}
