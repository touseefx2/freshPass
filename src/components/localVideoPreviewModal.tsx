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
import { useSafeAreaInsets } from "react-native-safe-area-context";
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
  const insets = useSafeAreaInsets();
  const [isReady, setIsReady] = useState(false);

  // Same player as chat / AI results: expo-video with native controls.
  const player = useVideoPlayer(uri, (p) => {
    p.loop = false;
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

  return (
    <View style={styles.overlay}>
      <View
        style={[
          styles.videoWrap,
          // Keep the video (and its native controls) below the close button.
          {
            paddingTop: insets.top + widthScale(40) + moderateHeightScale(24),
            paddingBottom: insets.bottom,
          },
        ]}
      >
        <VideoView
          player={player}
          style={styles.video}
          contentFit="contain"
          nativeControls={true}
          onFirstFrameRender={() => {
            if (!isReady) setIsReady(true);
          }}
        />
        {!isReady && (
          <View style={styles.loader} pointerEvents="none">
            <ActivityIndicator size="large" color={theme.white} />
            <Text style={styles.loaderText}>{t("loading")}</Text>
          </View>
        )}
      </View>
      <TouchableOpacity
        style={[
          styles.closeButton,
          { top: insets.top + moderateHeightScale(12) },
        ]}
        onPress={onClose}
        activeOpacity={0.8}
        hitSlop={12}
        accessibilityRole="button"
        accessibilityLabel={t("close")}
      >
        <MaterialIcons
          name="close"
          size={moderateWidthScale(22)}
          color={theme.white}
        />
      </TouchableOpacity>
    </View>
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
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <PreviewPlayer uri={uri} onClose={onClose} />
    </Modal>
  );
}
