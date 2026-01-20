import React, { useMemo, useState, useCallback } from "react";
import {
  Modal,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  BackHandler,
  StatusBar,
  Linking,
  Pressable,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  moderateHeightScale,
  moderateWidthScale,
  widthScale,
  heightScale,
} from "@/src/theme/dimensions";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";
import Button from "@/src/components/button";
import { LeafLogo } from "@/assets/icons";

interface AcceptTermsModalProps {
  visible: boolean;
  onClose: () => void;
  onContinue: () => void;
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    modalOverlay: {
      flex: 1,
      backgroundColor: theme.acceptTermsBackground,
    },

    containerHeader: {
      paddingVertical: moderateHeightScale(12),
    },
    borderBottomLine: {
      height: 0.5,
      width: "100%",
      backgroundColor: theme.white70,
    },
    headerRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(5),
      paddingHorizontal: moderateWidthScale(20),
      paddingBottom: moderateHeightScale(12),
    },
    backButton: {
      width: moderateWidthScale(36),
      height: moderateWidthScale(26),
      alignItems: "flex-start",
      justifyContent: "center",
    },
    container: {
      flex: 1,
      paddingHorizontal: moderateWidthScale(20),
    },
    centerContent: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    logoContainer: {
      flexDirection: "row",
      alignItems: "center",
    },
    logoText: {
      fontSize: fontSize.size18,
      fontFamily: fonts.fontMedium,
      color: theme.white,
      marginLeft: moderateWidthScale(5),
    },

    content: {
      flex: 1,
      paddingTop: moderateHeightScale(20),
      gap: moderateHeightScale(12),
    },
    title: {
      fontSize: fontSize.size26,
      fontFamily: fonts.fontBold,
      color: theme.white,
    },
    bodyText: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: theme.white,
      lineHeight: moderateHeightScale(22),
    },
    linkText: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.orangeBrown,
    },
    checkboxContainer: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(12),
    },
    checkbox: {
      width: moderateWidthScale(45),
      height: moderateWidthScale(45),
      borderRadius: moderateWidthScale(45 / 2),
      backgroundColor: theme.acceptTermsCheckbox,
      alignItems: "center",
      justifyContent: "center",
    },
    checkboxInnerSquare: {
      width: moderateWidthScale(18),
      height: moderateWidthScale(18),
      borderWidth: 1.5,
      borderColor: theme.white,
      borderRadius: moderateWidthScale(2),
      overflow: "hidden",
      alignItems: "center",
      justifyContent: "center",
    },
    checkboxLabel: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontMedium,
      color: theme.white,
      flex: 1,
    },
    buttonContainer: {
      paddingBottom: moderateHeightScale(20),
      gap: moderateHeightScale(22),
    },
  });

export default function AcceptTermsModal({
  visible,
  onClose,
  onContinue,
}: AcceptTermsModalProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors as Theme), [colors]);
  const theme = colors as Theme;
  const insets = useSafeAreaInsets();
  const [isAgreed, setIsAgreed] = useState(false);

  // Handle back button press
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        if (visible) {
          onClose();
          return true;
        }
        return false;
      };

      const subscription = BackHandler.addEventListener(
        "hardwareBackPress",
        onBackPress
      );

      return () => subscription.remove();
    }, [visible, onClose])
  );

  const handleTermsPress = () => {
    // Open Terms of Use link
    Linking.openURL("https://freshpass.com/terms"); // Update with actual URL
  };

  const handlePrivacyPress = () => {
    // Open Privacy Notice link
    Linking.openURL("https://freshpass.com/privacy"); // Update with actual URL
  };

  const handleContinue = () => {
    if (isAgreed) {
      onContinue();
    }
  };

  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType="slide"
      onRequestClose={onClose}
    >
      <StatusBar barStyle={"light-content"} />
      <View
        style={[
          styles.modalOverlay,
          { paddingTop: insets.top, paddingBottom: insets.bottom },
        ]}
      >
        <View style={styles.containerHeader}>
          <View style={styles.headerRow}>
            <Pressable
              onPress={onClose}
              hitSlop={moderateWidthScale(8)}
              style={styles.backButton}
            >
              <Feather
                name="arrow-left"
                size={moderateWidthScale(22)}
                color={theme.white}
              />
            </Pressable>
            <View style={styles.logoContainer}>
              <LeafLogo
                width={widthScale(18)}
                height={heightScale(24)}
                color1={theme.white}
                color2={theme.white}
              />
              <Text style={styles.logoText}>FRESHPASS</Text>
            </View>
          </View>
          <View style={styles.borderBottomLine} />
        </View>

        <View style={styles.container}>
          <View style={styles.content}>
            <Text style={styles.title}>
              Accept FreshPass terms and review privacy notice.
            </Text>

            <Text style={styles.bodyText}>
              By clicking 'I Agree,' I confirm that I have read and accept the{" "}
              <Text style={styles.linkText} onPress={handleTermsPress}>
                Terms of Use
              </Text>{" "}
              and{" "}
              <Text style={styles.linkText} onPress={handlePrivacyPress}>
                Privacy Notice
              </Text>
              , and I am 18 years or older.
            </Text>
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.checkboxContainer}
              onPress={() => setIsAgreed(!isAgreed)}
              activeOpacity={0.7}
            >
              <View style={styles.checkbox}>
                <View style={styles.checkboxInnerSquare}>
                  {isAgreed && (
                    <Feather
                      name="check"
                      size={moderateWidthScale(15)}
                      color={theme.white}
                    />
                  )}
                </View>
              </View>
              <Text style={styles.checkboxLabel}>I Agree</Text>
            </TouchableOpacity>
            <Button
              title="Continue"
              onPress={handleContinue}
              disabled={!isAgreed}
              backgroundColor={theme.darkGreen}
              textColor={theme.white}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}
