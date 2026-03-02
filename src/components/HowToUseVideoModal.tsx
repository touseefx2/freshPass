import React, {
  useMemo,
  useRef,
  useState,
  useCallback,
  useEffect,
} from "react";
import {
  View,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
} from "react-native";
import { Video, ResizeMode, AVPlaybackStatus } from "expo-av";
import { MaterialIcons } from "@expo/vector-icons";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  moderateHeightScale,
  moderateWidthScale,
  widthScale,
  heightScale,
} from "@/src/theme/dimensions";
import { useTranslation } from "react-i18next";
import { SafeAreaView } from "react-native-safe-area-context";
import { CloseIcon } from "@/assets/icons";

const SEEK_STEP_MS = 10000;

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: theme.black,
    },
    videoWrapper: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: theme.black,
    },
    video: {
      width: "100%",
      height: "100%",
    },
    loaderContainer: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 10,
    },
    loaderText: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.white,
      marginTop: moderateHeightScale(8),
    },
    closeButton: {
      position: "absolute",
      top: moderateHeightScale(54),
      right: moderateWidthScale(16),
      zIndex: 10,
      width: widthScale(40),
      height: widthScale(40),
      borderRadius: widthScale(20),
      backgroundColor: theme.orangeBrown,
      alignItems: "center",
      justifyContent: "center",
    },
    playOverlay: {
      ...StyleSheet.absoluteFillObject,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: "transparent",
    },
    playButtonCircle: {
      width: widthScale(56),
      height: widthScale(56),
      borderRadius: widthScale(28),
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      justifyContent: "center",
      alignItems: "center",
    },
    controlsRow: {
      position: "absolute",
      bottom: moderateHeightScale(100),
      left: moderateWidthScale(20),
      right: moderateWidthScale(20),
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 10,
      gap: moderateWidthScale(24),
    },
    controlButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: moderateHeightScale(10),
      paddingHorizontal: moderateWidthScale(16),
      borderRadius: moderateWidthScale(8),
      backgroundColor: theme.orangeBrown,
    },
    controlButtonText: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontMedium,
      color: theme.white,
      marginLeft: moderateWidthScale(6),
    },
    timeText: {
      position: "absolute",
      bottom: moderateHeightScale(56),
      left: 0,
      right: 0,
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.orangeBrown,
      textAlign: "center",
      zIndex: 10,
    },
  });

const VIDEO_URI = "https://getfreshpass.com/videos/hair-tryon.MP4";

interface HowToUseVideoModalProps {
  visible: boolean;
  onClose: () => void;
}

function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function HowToUseVideoModal({
  visible,
  onClose,
}: HowToUseVideoModalProps) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [theme]);

  const videoRef = useRef<Video>(null);
  const [isVideoReady, setIsVideoReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackStatus, setPlaybackStatus] = useState<AVPlaybackStatus | null>(
    null,
  );

  const resetOnClose = useCallback(() => {
    setIsVideoReady(false);
    setIsPlaying(false);
    setPlaybackStatus(null);
    videoRef.current?.setPositionAsync(0);
    videoRef.current?.pauseAsync();
  }, []);

  useEffect(() => {
    if (!visible) {
      resetOnClose();
    }
  }, [visible, resetOnClose]);

  const handlePlaybackStatusUpdate = useCallback((status: AVPlaybackStatus) => {
    setPlaybackStatus(status);
    if (status.isLoaded) {
      const ready =
        !status.isBuffering &&
        status.durationMillis != null &&
        status.durationMillis > 0;
      if (ready) setIsVideoReady(true);
      setIsPlaying(status.isPlaying);
      if (status.didJustFinish) {
        setIsPlaying(false);
        videoRef.current?.setPositionAsync(0);
      }
    }
  }, []);

  const handlePlayPause = useCallback(async () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      await videoRef.current.pauseAsync();
      setIsPlaying(false);
    } else {
      const status = playbackStatus;
      if (
        status?.isLoaded &&
        status.positionMillis != null &&
        status.durationMillis != null &&
        status.positionMillis >= status.durationMillis - 100
      ) {
        await videoRef.current.setPositionAsync(0);
      }
      await videoRef.current.playAsync();
      setIsPlaying(true);
    }
  }, [isPlaying, playbackStatus]);

  const handleSeek = useCallback(
    async (deltaMs: number) => {
      if (!videoRef.current || !playbackStatus?.isLoaded) return;
      const pos = playbackStatus.positionMillis ?? 0;
      const dur = playbackStatus.durationMillis ?? 0;
      const newPos = Math.max(0, Math.min(dur, pos + deltaMs));
      await videoRef.current.setPositionAsync(newPos);
    },
    [playbackStatus],
  );

  const positionMs = playbackStatus?.isLoaded
    ? (playbackStatus.positionMillis ?? 0)
    : 0;
  const durationMs = playbackStatus?.isLoaded
    ? (playbackStatus.durationMillis ?? 0)
    : 0;

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <StatusBar barStyle="dark-content" />
      <SafeAreaView style={styles.overlay} edges={["top", "bottom"]}>
        <View style={styles.videoWrapper}>
          <Video
            ref={videoRef}
            source={{ uri: VIDEO_URI }}
            style={styles.video}
            resizeMode={ResizeMode.COVER}
            isLooping={false}
            shouldPlay={false}
            useNativeControls={false}
            onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
          />
          {!isVideoReady ? (
            <TouchableOpacity
              style={styles.playOverlay}
              onPress={handlePlayPause}
              activeOpacity={1}
            >
              <View style={styles.playButtonCircle}>
                <MaterialIcons
                  name={isPlaying ? "pause" : "play-arrow"}
                  size={widthScale(32)}
                  color={theme.white}
                />
              </View>
            </TouchableOpacity>
          ) : null}
        </View>

        <Pressable style={styles.closeButton} onPress={onClose}>
          <CloseIcon
            width={widthScale(24)}
            height={heightScale(24)}
            color={theme.white}
          />
        </Pressable>

        {isVideoReady && (
          <>
            <View style={styles.controlsRow}>
              <TouchableOpacity
                style={styles.controlButton}
                onPress={() => handleSeek(-SEEK_STEP_MS)}
                activeOpacity={0.7}
              >
                <MaterialIcons
                  name="replay-10"
                  size={moderateWidthScale(22)}
                  color={theme.white}
                />
                <Text style={styles.controlButtonText}>10s</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.controlButton}
                onPress={handlePlayPause}
                activeOpacity={0.7}
              >
                <MaterialIcons
                  name={isPlaying ? "pause" : "play-arrow"}
                  size={moderateWidthScale(24)}
                  color={theme.white}
                />
                <Text style={styles.controlButtonText}>
                  {isPlaying ? "Pause" : "Play"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.controlButton}
                onPress={() => handleSeek(SEEK_STEP_MS)}
                activeOpacity={0.7}
              >
                <MaterialIcons
                  name="forward-10"
                  size={moderateWidthScale(22)}
                  color={theme.white}
                />
                <Text style={styles.controlButtonText}>10s</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.timeText}>
              {formatTime(positionMs)} / {formatTime(durationMs)}
            </Text>
          </>
        )}

        {!isVideoReady && (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="small" color={theme.white} />
            <Text style={styles.loaderText}>{t("loading")}</Text>
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
}
