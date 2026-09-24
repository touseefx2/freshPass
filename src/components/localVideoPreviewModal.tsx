import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useVideoPlayer, VideoView } from "expo-video";
import { MaterialIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  moderateHeightScale,
  moderateWidthScale,
  widthScale,
} from "@/src/theme/dimensions";

type LocalVideoPreviewModalProps = {
  visible: boolean;
  uri: string | null;
  onClose: () => void;
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: theme.black,
    },
    videoWrap: {
      flex: 1,
      justifyContent: "center",
      backgroundColor: theme.black,
    },
    video: {
      width: "100%",
      height: "100%",
    },
    loader: {
      ...StyleSheet.absoluteFillObject,
      alignItems: "center",
      justifyContent: "center",
      zIndex: 2,
    },
    loaderText: {
      marginTop: moderateHeightScale(10),
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.white,
    },
    closeButton: {
      position: "absolute",
      top: moderateHeightScale(12),
      right: moderateWidthScale(16),
      zIndex: 10,
      width: widthScale(40),
      height: widthScale(40),
      borderRadius: widthScale(20),
      backgroundColor: theme.lightGreen4,
      alignItems: "center",
      justifyContent: "center",
    },
    playOverlay: {
      ...StyleSheet.absoluteFillObject,
      alignItems: "center",
      justifyContent: "center",
      zIndex: 3,
    },
    playCircle: {
      width: widthScale(64),
      height: widthScale(64),
      borderRadius: widthScale(32),
      backgroundColor: theme.lightGreen4,
      alignItems: "center",
      justifyContent: "center",
    },
  });

function PreviewPlayer({
  uri,
  onClose,
}: {
  uri: string;
  onClose: () => void;
}) {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();
  const [isReady, setIsReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);

  const player = useVideoPlayer(uri, (p) => {
    p.loop = true;
    p.play();
  });

  useEffect(() => {
    const sub = player.addListener("statusChange", ({ status }) => {
      if (status === "readyToPlay") {
        setIsReady(true);
      }
    });
    return () => sub.remove();
  }, [player]);

  const togglePlay = () => {
    if (player.playing) {
      player.pause();
      setIsPlaying(false);
    } else {
      player.play();
      setIsPlaying(true);
    }
  };

  return (
    <SafeAreaView style={styles.overlay} edges={["top", "bottom"]}>
      <View style={styles.videoWrap}>
        <VideoView
          player={player}
          style={styles.video}
          contentFit="contain"
          nativeControls={false}
          onFirstFrameRender={() => {
            if (!isReady) setIsReady(true);
          }}
        />
        {!isReady && (
          <View style={styles.loader}>
            <ActivityIndicator size="large" color={theme.white} />
            <Text style={styles.loaderText}>{t("loading")}</Text>
          </View>
        )}
        {isReady && !isPlaying && (
          <TouchableOpacity
            style={styles.playOverlay}
            onPress={togglePlay}
            activeOpacity={0.9}
          >
            <View style={styles.playCircle}>
              <MaterialIcons
                name="play-arrow"
                size={moderateWidthScale(36)}
                color={theme.white}
              />
            </View>
          </TouchableOpacity>
        )}
        {isReady && isPlaying && (
          <TouchableOpacity
            style={styles.playOverlay}
            onPress={togglePlay}
            activeOpacity={1}
          />
        )}
      </View>
      <TouchableOpacity
        style={styles.closeButton}
        onPress={onClose}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel={t("close")}
      >
        <MaterialIcons
          name="close"
          size={moderateWidthScale(22)}
          color={theme.white}
        />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

export default function LocalVideoPreviewModal({
  visible,
  uri,
  onClose,
}: LocalVideoPreviewModalProps) {
  if (!visible || !uri) return null;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <PreviewPlayer uri={uri} onClose={onClose} />
    </Modal>
  );
}
