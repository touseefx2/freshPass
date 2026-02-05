import React, { useMemo } from "react";
import {
  View,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Dimensions,
  StatusBar,
} from "react-native";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import {
  moderateHeightScale,
  moderateWidthScale,
  widthScale,
  heightScale,
} from "@/src/theme/dimensions";
import { CloseIcon } from "@/assets/icons";
import { SafeAreaView } from "react-native-safe-area-context";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

interface FullImageModalProps {
  visible: boolean;
  onClose: () => void;
  imageUri: string | null;
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    imageModal: {
      flex: 1,
      backgroundColor: theme.black || "#000000",
      justifyContent: "center",
      alignItems: "center",
    },
    modalCloseButton: {
      position: "absolute",
      top: moderateHeightScale(50),
      right: moderateWidthScale(20),
      zIndex: 10,
      width: widthScale(40),
      height: widthScale(40),
      borderRadius: widthScale(40 / 2),
      backgroundColor: "rgba(255, 255, 255, 0.2)",
      alignItems: "center",
      justifyContent: "center",
    },
    modalImage: {
      width: SCREEN_WIDTH,
      height: SCREEN_HEIGHT,
    },
  });

export default function FullImageModal({
  visible,
  onClose,
  imageUri,
}: FullImageModalProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors as Theme), [colors]);
  const theme = colors as Theme;
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent={true}
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.imageModal}>
        <StatusBar barStyle="light-content" />
        <Pressable style={styles.modalCloseButton} onPress={onClose}>
          <CloseIcon
            width={widthScale(24)}
            height={heightScale(24)}
            color={theme.white}
          />
        </Pressable>
        {imageUri && (
          <Image
            source={{ uri: imageUri }}
            style={styles.modalImage}
            resizeMode="contain"
          />
        )}
      </SafeAreaView>
    </Modal>
  );
}
