import React, { useMemo } from "react";
import {
  ImageBackground,
  Modal,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { IMAGES } from "@/src/constant/images";
import { LeafLogo } from "@/assets/icons";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  moderateHeightScale,
  moderateWidthScale,
  widthScale,
} from "@/src/theme/dimensions";
import Button from "@/src/components/button";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface TryOnModalProps {
  visible: boolean;
  onClose: () => void;
  onUnlockPress: () => void;
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    backgroundImage: {
      flex: 1,
    },
    overlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: theme.darkGreen,
      opacity: 0.65,
    },
    content: {
      flex: 1,
      paddingHorizontal: moderateWidthScale(20),
      justifyContent: "flex-end",
      gap: moderateHeightScale(40),
    },
    skipButton: {
      position: "absolute",
      top: 0,
      right: moderateWidthScale(20),
      backgroundColor: "rgba(255, 255, 255, 0.15)",
      paddingHorizontal: moderateWidthScale(16),
      paddingVertical: moderateHeightScale(10),
      borderRadius: moderateWidthScale(12),
      zIndex: 1,
    },
    skipButtonText: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontBold,
      color: theme.white,
    },
    topSection: {
      alignItems: "center",
      paddingTop: moderateHeightScale(48),
    },
    logoContainer: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(6),
      marginBottom: moderateHeightScale(6),
    },
    logoText: {
      fontSize: fontSize.size20,
      fontFamily: fonts.fontMedium,
      color: theme.white,
    },
    title: {
      fontSize: fontSize.size32,
      fontFamily: fonts.fontBold,
      color: theme.white,
      textAlign: "center",
      lineHeight: moderateHeightScale(42),
      marginBottom: moderateHeightScale(15),
    },
    titleHighlight: {
      fontFamily: fonts.fontExtraBold,
    },
    description1: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontMedium,
      color: theme.white,
      textAlign: "center",
      lineHeight: moderateHeightScale(24),
      marginBottom: moderateHeightScale(15),
      paddingHorizontal: moderateWidthScale(8),
    },
    description2: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.white,
      textAlign: "center",
      lineHeight: moderateHeightScale(24),
      paddingHorizontal: moderateWidthScale(8),
    },
    bottomSection: {
      alignItems: "center",
      paddingBottom: moderateHeightScale(40),
    },
    unlockButton: {
      width: "100%",
      maxWidth: widthScale(340),
      marginBottom: moderateHeightScale(16),
    },
    pricingText: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.white,
      textAlign: "center",
    },
  });

export default function TryOnModal({
  visible,
  onClose,
  onUnlockPress,
}: TryOnModalProps) {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);
  const insets = useSafeAreaInsets();

  const handleUnlock = () => {
    onUnlockPress();
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={false}
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.container}>
        <StatusBar barStyle="light-content" translucent />
        <ImageBackground
          source={IMAGES.tryOnBack}
          style={styles.backgroundImage}
          resizeMode="cover"
        >
          <View style={styles.content}>
            <TouchableOpacity
              style={[
                styles.skipButton,
                { top: insets.top + moderateHeightScale(8) },
              ]}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <Text style={styles.skipButtonText}>Skip</Text>
            </TouchableOpacity>

            <View style={styles.topSection}>
              <View style={styles.logoContainer}>
                <LeafLogo
                  width={moderateWidthScale(25)}
                  height={moderateWidthScale(33)}
                  color1={theme.white}
                  color2={theme.white}
                />
                <Text style={styles.logoText}>FRESHPASS</Text>
              </View>

              <Text style={styles.title}>
                Try <Text style={styles.titleHighlight}>AI </Text>Hair{" "}
                <Text style={styles.titleHighlight}>Try-On</Text>
              </Text>

              <Text style={styles.description1}>
                Preview styles instantly. Book with confidence. See your new
                look before you book.
              </Text>

              <Text style={styles.description2}>
                Visualize and choose your perfect hairstyle.
              </Text>
            </View>

            <View style={styles.bottomSection}>
              <Button
                title="Unlock AI Try-On"
                onPress={handleUnlock}
                backgroundColor={theme.orangeBrown}
                textColor={theme.darkGreen}
                containerStyle={styles.unlockButton}
              />
              <Text style={styles.pricingText}>
                Full access: $2.99 per try or with Premium
              </Text>
            </View>
          </View>
        </ImageBackground>
      </View>
    </Modal>
  );
}
