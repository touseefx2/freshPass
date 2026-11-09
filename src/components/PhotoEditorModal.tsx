import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  Modal,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  Platform,
  StatusBar,
} from "react-native";
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
} from "react-native-reanimated";
import * as ImageManipulator from "expo-image-manipulator";
import { Image as RNImage } from "react-native";
import Svg, { Path, Circle as SvgCircle } from "react-native-svg";
import AppImage from "@/src/components/AppImage";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  moderateHeightScale,
  moderateWidthScale,
} from "@/src/theme/dimensions";
import { MaterialIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import Logger from "@/src/services/logger";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

type CropShape = "circle" | "square";

interface PhotoEditorModalProps {
  visible: boolean;
  imageUri: string;
  onDone: (croppedUri: string) => void;
  onCancel: () => void;
  cropShape?: CropShape;
  cropSizeFraction?: number;
}

function getImageSize(uri: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    RNImage.getSize(
      uri,
      (w, h) => resolve({ width: w, height: h }),
      (err) => reject(err),
    );
  });
}

const createStyles = (theme: Theme, insets: { top: number; bottom: number }) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: "#000",
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: moderateWidthScale(16),
      paddingTop:
        Platform.OS === "ios"
          ? insets.top
          : (StatusBar.currentHeight ?? 0) + moderateHeightScale(8),
      paddingBottom: moderateHeightScale(12),
      zIndex: 10,
    },
    headerButton: {
      paddingHorizontal: moderateWidthScale(8),
      paddingVertical: moderateHeightScale(8),
    },
    headerButtonText: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontMedium,
      color: "#fff",
    },
    headerTitle: {
      fontSize: fontSize.size17,
      fontFamily: fonts.fontBold,
      color: "#fff",
    },
    cropArea: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
    },
    footer: {
      paddingHorizontal: moderateWidthScale(20),
      paddingTop: moderateHeightScale(16),
      paddingBottom:
        Platform.OS === "android"
          ? moderateHeightScale(60)
          : Math.max(insets.bottom, moderateHeightScale(20)),
      zIndex: 10,
    },
    useButton: {
      backgroundColor: theme.darkGreen,
      borderRadius: moderateWidthScale(9999),
      paddingVertical: moderateHeightScale(14),
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "row",
      gap: moderateWidthScale(8),
    },
    useButtonText: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontBold,
      color: "#fff",
    },
    hintRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: moderateWidthScale(6),
      paddingVertical: moderateHeightScale(10),
    },
    hintText: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: "rgba(255,255,255,0.7)",
    },
    loadingOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: "rgba(0,0,0,0.6)",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 100,
    },
  });

export default function PhotoEditorModal({
  visible,
  imageUri,
  onDone,
  onCancel,
  cropShape = "square",
  cropSizeFraction = 0.85,
}: PhotoEditorModalProps) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const theme = colors as Theme;
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(theme, insets), [colors, insets]);

  const [processing, setProcessing] = useState(false);
  const [imageSize, setImageSize] = useState<{
    width: number;
    height: number;
  } | null>(null);
  // Track the crop area container layout for accurate overlay positioning
  const [containerLayout, setContainerLayout] = useState<{
    width: number;
    height: number;
  } | null>(null);

  const CROP_SIZE = SCREEN_WIDTH * cropSizeFraction;

  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  const imageLayout = useMemo(() => {
    if (!imageSize) return { width: CROP_SIZE, height: CROP_SIZE };
    const { width: iw, height: ih } = imageSize;
    const aspectRatio = iw / ih;
    if (aspectRatio >= 1) {
      return { width: CROP_SIZE * aspectRatio, height: CROP_SIZE };
    } else {
      return { width: CROP_SIZE, height: CROP_SIZE / aspectRatio };
    }
  }, [imageSize, CROP_SIZE]);

  const resetGestures = useCallback(() => {
    scale.value = 1;
    savedScale.value = 1;
    translateX.value = 0;
    translateY.value = 0;
    savedTranslateX.value = 0;
    savedTranslateY.value = 0;
  }, [
    scale,
    savedScale,
    translateX,
    translateY,
    savedTranslateX,
    savedTranslateY,
  ]);

  const handleImageLoad = useCallback(async () => {
    if (!imageUri) return;
    try {
      const size = await getImageSize(imageUri);
      setImageSize(size);
    } catch (err) {
      Logger.error("PhotoEditor: failed to get image size", err);
      setImageSize({ width: SCREEN_WIDTH, height: SCREEN_HEIGHT });
    }
    resetGestures();
  }, [imageUri, resetGestures]);

  const clampTranslation = useCallback(
    (tx: number, ty: number, s: number) => {
      "worklet";
      const scaledW = imageLayout.width * s;
      const scaledH = imageLayout.height * s;
      const maxTx = Math.max(0, (scaledW - CROP_SIZE) / 2);
      const maxTy = Math.max(0, (scaledH - CROP_SIZE) / 2);
      return {
        x: Math.min(maxTx, Math.max(-maxTx, tx)),
        y: Math.min(maxTy, Math.max(-maxTy, ty)),
      };
    },
    [imageLayout, CROP_SIZE],
  );

  const pinchGesture = Gesture.Pinch()
    .onUpdate((e) => {
      const newScale = Math.max(1, Math.min(5, savedScale.value * e.scale));
      scale.value = newScale;
      const clamped = clampTranslation(
        translateX.value,
        translateY.value,
        newScale,
      );
      translateX.value = clamped.x;
      translateY.value = clamped.y;
    })
    .onEnd(() => {
      savedScale.value = scale.value;
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    });

  const panGesture = Gesture.Pan()
    .minPointers(1)
    .maxPointers(2)
    .minDistance(0)
    .activeOffsetX([-3, 3])
    .activeOffsetY([-3, 3])
    .onUpdate((e) => {
      const newTx = savedTranslateX.value + e.translationX;
      const newTy = savedTranslateY.value + e.translationY;
      const clamped = clampTranslation(newTx, newTy, scale.value);
      translateX.value = clamped.x;
      translateY.value = clamped.y;
    })
    .onEnd(() => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    });

  const composed = Gesture.Simultaneous(pinchGesture, panGesture);

  const animatedImageStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  const handleCrop = useCallback(async () => {
    if (!imageSize || !imageUri) return;
    setProcessing(true);
    try {
      const { width: iw, height: ih } = imageSize;
      const currentScale = scale.value;
      const currentTx = translateX.value;
      const currentTy = translateY.value;

      const displayW = imageLayout.width * currentScale;
      const displayH = imageLayout.height * currentScale;

      const cropDisplayLeft = displayW / 2 - currentTx - CROP_SIZE / 2;
      const cropDisplayTop = displayH / 2 - currentTy - CROP_SIZE / 2;

      const scaleFactorX = iw / (imageLayout.width * currentScale);
      const scaleFactorY = ih / (imageLayout.height * currentScale);

      const originX = Math.max(0, Math.round(cropDisplayLeft * scaleFactorX));
      const originY = Math.max(0, Math.round(cropDisplayTop * scaleFactorY));
      const cropW = Math.round(CROP_SIZE * scaleFactorX);
      const cropH = Math.round(CROP_SIZE * scaleFactorY);

      const safeW = Math.min(cropW, iw - originX);
      const safeH = Math.min(cropH, ih - originY);

      const actions: ImageManipulator.Action[] = [
        {
          crop: {
            originX,
            originY,
            width: Math.max(1, safeW),
            height: Math.max(1, safeH),
          },
        },
      ];

      const result = await ImageManipulator.manipulateAsync(imageUri, actions, {
        compress: 0.9,
        format: ImageManipulator.SaveFormat.JPEG,
      });

      onDone(result.uri);
    } catch (err) {
      Logger.error("PhotoEditor: crop failed", err);
      onDone(imageUri);
    } finally {
      setProcessing(false);
    }
  }, [
    imageSize,
    imageUri,
    imageLayout,
    scale,
    translateX,
    translateY,
    CROP_SIZE,
    onDone,
  ]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onShow={handleImageLoad}
      statusBarTranslucent
    >
      <GestureHandlerRootView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={onCancel}
            activeOpacity={0.7}
          >
            <Text style={styles.headerButtonText}>{t("cancel")}</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {t("editPhoto") || "Edit Photo"}
          </Text>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={resetGestures}
            activeOpacity={0.7}
          >
            <MaterialIcons
              name="refresh"
              size={moderateWidthScale(22)}
              color="#fff"
            />
          </TouchableOpacity>
        </View>

        {/* Crop area — GestureDetector wraps the whole zone so Android touches always reach the handler */}
        <GestureDetector gesture={composed}>
          <Animated.View
            style={styles.cropArea}
            onLayout={(e) => {
              const { width, height } = e.nativeEvent.layout;
              setContainerLayout({ width, height });
            }}
          >
            <Animated.View
              style={[
                {
                  width: imageLayout.width,
                  height: imageLayout.height,
                },
                animatedImageStyle,
              ]}
            >
              <AppImage
                uri={imageUri}
                style={{ width: "100%", height: "100%" }}
                resizeMode="cover"
              />
            </Animated.View>

            {containerLayout && (
              <CropOverlay
                cropSize={CROP_SIZE}
                cropShape={cropShape}
                containerWidth={containerLayout.width}
                containerHeight={containerLayout.height}
              />
            )}
          </Animated.View>
        </GestureDetector>

        {/* Hint */}
        <View style={styles.hintRow}>
          <MaterialIcons
            name="touch-app"
            size={moderateWidthScale(18)}
            color="rgba(255,255,255,0.7)"
          />
          <Text style={styles.hintText}>
            {t("photoEditorHint") || "Pinch to zoom, drag to reposition"}
          </Text>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.useButton}
            onPress={handleCrop}
            activeOpacity={0.8}
            disabled={processing}
          >
            {processing ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <MaterialIcons
                  name="check"
                  size={moderateWidthScale(20)}
                  color="#fff"
                />
                <Text style={styles.useButtonText}>
                  {t("usePhoto") || "Use Photo"}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {processing && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#fff" />
          </View>
        )}
      </GestureHandlerRootView>
    </Modal>
  );
}

function CropOverlay({
  cropSize,
  cropShape,
  containerWidth,
  containerHeight,
}: {
  cropSize: number;
  cropShape: CropShape;
  containerWidth: number;
  containerHeight: number;
}) {
  const cx = containerWidth / 2;
  const cy = containerHeight / 2;
  const r = cropSize / 2;
  const br = cropShape === "circle" ? r : moderateWidthScale(12);

  const outer = `M0,0 L${containerWidth},0 L${containerWidth},${containerHeight} L0,${containerHeight} Z`;

  const inner =
    cropShape === "circle"
      ? `M${cx - r},${cy} A${r},${r} 0 1,0 ${cx + r},${cy} A${r},${r} 0 1,0 ${cx - r},${cy} Z`
      : `M${cx - r + br},${cy - r} L${cx + r - br},${cy - r} A${br},${br} 0 0,1 ${cx + r},${cy - r + br} L${cx + r},${cy + r - br} A${br},${br} 0 0,1 ${cx + r - br},${cy + r} L${cx - r + br},${cy + r} A${br},${br} 0 0,1 ${cx - r},${cy + r - br} L${cx - r},${cy - r + br} A${br},${br} 0 0,1 ${cx - r + br},${cy - r} Z`;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width={containerWidth} height={containerHeight}>
        <Path d={`${outer} ${inner}`} fill="rgba(0,0,0,0.6)" fillRule="evenodd" />
        {cropShape === "circle" ? (
          <SvgCircle
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke="rgba(255,255,255,0.8)"
            strokeWidth="2"
          />
        ) : (
          <Path d={inner} fill="none" stroke="rgba(255,255,255,0.8)" strokeWidth="2" />
        )}
      </Svg>
    </View>
  );
}

/**
 * Hook to manage multi-photo editing queue.
 * After selecting multiple photos, each is edited one-by-one.
 */
export function usePhotoEditorQueue() {
  const [queue, setQueue] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [editedPhotos, setEditedPhotos] = useState<string[]>([]);
  const resolveRef = useRef<((uris: string[]) => void) | null>(null);

  const startEditing = useCallback(
    (uris: string[]): Promise<string[]> => {
      return new Promise((resolve) => {
        resolveRef.current = resolve;
        setQueue(uris);
        setCurrentIndex(0);
        setEditedPhotos([]);
      });
    },
    [],
  );

  const handleDone = useCallback(
    (croppedUri: string) => {
      const newEdited = [...editedPhotos, croppedUri];
      setEditedPhotos(newEdited);

      if (currentIndex + 1 < queue.length) {
        setCurrentIndex(currentIndex + 1);
      } else {
        setQueue([]);
        setCurrentIndex(0);
        resolveRef.current?.(newEdited);
        resolveRef.current = null;
        setEditedPhotos([]);
      }
    },
    [editedPhotos, currentIndex, queue.length],
  );

  const handleSkip = useCallback(() => {
    const original = queue[currentIndex];
    if (original) {
      handleDone(original);
    }
  }, [queue, currentIndex, handleDone]);

  const handleCancel = useCallback(() => {
    const remaining = queue.slice(currentIndex);
    const result = [...editedPhotos, ...remaining];
    setQueue([]);
    setCurrentIndex(0);
    resolveRef.current?.(result);
    resolveRef.current = null;
    setEditedPhotos([]);
  }, [editedPhotos, queue, currentIndex]);

  return {
    isEditing: queue.length > 0,
    currentUri: queue[currentIndex] ?? "",
    currentIndex,
    total: queue.length,
    startEditing,
    handleDone,
    handleSkip,
    handleCancel,
  };
}
