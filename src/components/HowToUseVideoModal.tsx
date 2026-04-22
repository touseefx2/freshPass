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
} from "react-native";
import { useVideoPlayer, VideoView } from "expo-video";
import { MaterialIcons } from "@expo/vector-icons";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  moderateHeightScale,
  moderateWidthScale,
  widthScale,
  heightScale,
  iconScale,
} from "@/src/theme/dimensions";
import { useTranslation } from "react-i18next";
import { SafeAreaView } from "react-native-safe-area-context";
import { CloseIcon } from "@/assets/icons";

const SEEK_STEP_SEC = 10;
const VIDEO_URI = "https://getfreshpass.com/videos/hair-tryon.MP4";

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
      ...StyleSheet.absoluteFillObject,
      alignItems: "center",
      justifyContent: "center",
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
      backgroundColor: theme.black,
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
      color: theme.acceptTermsCheckbox,
      textAlign: "center",
      zIndex: 10,
    },
  });

interface HowToUseVideoModalProps {
  visible: boolean;
  onClose: () => void;
}

function formatTime(seconds: number): string {
  const totalSeconds = Math.floor(seconds);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function VideoModalContent({ onClose }: { onClose: () => void }) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [theme]);

  const hasAutoPlayedRef = useRef(false);
  const [isVideoReady, setIsVideoReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const player = useVideoPlayer(VIDEO_URI, (p) => {
    p.loop = false;
    p.timeUpdateEventInterval = 0.5;
  });

  useEffect(() => {
    const statusSub = player.addListener("statusChange", ({ status }) => {
      if (status === "readyToPlay") {
        setIsVideoReady(true);
        setDuration(player.duration);
        if (!hasAutoPlayedRef.current) {
          hasAutoPlayedRef.current = true;
          player.play();
        }
      }
    });
    const playingSub = player.addListener(
      "playingChange",
      ({ isPlaying: playing }) => {
        setIsPlaying(playing);
      },
    );
    const timeSub = player.addListener("timeUpdate", (payload) => {
      setCurrentTime(payload.currentTime);
      if (duration <= 0 && player.duration > 0) setDuration(player.duration);
    });
    const endSub = player.addListener("playToEnd", () => {
      player.pause();
      player.currentTime = 0;
      setIsPlaying(false);
    });
    return () => {
      statusSub.remove();
      playingSub.remove();
      timeSub.remove();
      endSub.remove();
    };
  }, [player]);

  const handlePlayPause = useCallback(() => {
    if (isPlaying) {
      player.pause();
    } else {
      if (duration > 0 && currentTime >= duration - 0.1) {
        player.replay();
      }
      player.play();
    }
  }, [isPlaying, player, currentTime, duration]);

  const handleSeek = useCallback(
    (deltaSec: number) => {
      player.seekBy(deltaSec);
    },
    [player],
  );

  const displayDuration = duration > 0 ? duration : player.duration;
  const displayCurrentTime = duration > 0 ? currentTime : player.currentTime;

  return (
    <>
      <View style={styles.videoWrapper}>
        <VideoView
          player={player}
          style={styles.video}
          contentFit="cover"
          nativeControls={true}
          onFirstFrameRender={() => {
            if (!isVideoReady) {
              setIsVideoReady(true);
              setDuration(player.duration);
              if (!hasAutoPlayedRef.current) {
                hasAutoPlayedRef.current = true;
                player.play();
              }
            }
          }}
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
                size={iconScale(32)}
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
              onPress={() => handleSeek(-SEEK_STEP_SEC)}
              activeOpacity={0.7}
            >
              <MaterialIcons
                name="replay-10"
                size={iconScale(22)}
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
                size={iconScale(24)}
                color={theme.white}
              />
              <Text style={styles.controlButtonText}>
                {isPlaying ? "Pause" : "Play"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.controlButton}
              onPress={() => handleSeek(SEEK_STEP_SEC)}
              activeOpacity={0.7}
            >
              <MaterialIcons
                name="forward-10"
                size={iconScale(22)}
                color={theme.white}
              />
              <Text style={styles.controlButtonText}>10s</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.timeText}>
            {formatTime(displayCurrentTime)} / {formatTime(displayDuration)}
          </Text>
        </>
      )}

      {!isVideoReady && (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="small" color={theme.white} />
          <Text style={styles.loaderText}>{t("loading")}</Text>
        </View>
      )}
    </>
  );
}

export default function HowToUseVideoModal({
  visible,
  onClose,
}: HowToUseVideoModalProps) {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [theme]);

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent={true}
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.overlay} edges={["top", "bottom"]}>
        <VideoModalContent onClose={onClose} />
      </SafeAreaView>
    </Modal>
  );
}
