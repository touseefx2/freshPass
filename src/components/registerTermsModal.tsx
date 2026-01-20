import React, { useMemo, useState, useCallback } from "react";
import {
  Modal,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  BackHandler,
  StatusBar,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useTheme, useAppDispatch,   } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  moderateHeightScale,
  moderateWidthScale,
} from "@/src/theme/dimensions";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import Button from "@/src/components/button";
import { CrownIcon } from "@/assets/icons";
import { setLocation } from "@/src/state/slices/userSlice";
import * as Location from "expo-location";
import { useNotificationContext } from "@/src/contexts/NotificationContext";

interface AcceptTermsModalProps {
  visible: boolean;
  onClose: () => void;
  onContinue: () => void;
  nonClosable?: boolean;
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
      justifyContent: "center",
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
      fontSize: fontSize.size16,
      fontFamily: fonts.fontMedium,
      color: theme.white,
    },
    content: {
      flex: 1,
      paddingTop: moderateHeightScale(20),
      gap: moderateHeightScale(12),
    },
    iconContainer: {
      width: moderateWidthScale(80),
      height: moderateWidthScale(80),
      borderRadius: moderateWidthScale(80 / 2),
      backgroundColor: theme.orangeBrown,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 4,
      borderColor: theme.darkGreen,
    },
    title: {
      fontSize: fontSize.size24,
      fontFamily: fonts.fontBold,
      color: theme.white,
      marginBottom: 15,
    },
    bodyText: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontMedium,
      color: theme.white,
    },
    bodyText2: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: theme.white,
      lineHeight: moderateHeightScale(22),
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
    loadingText: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontMedium,
      color: theme.white,
      textAlign: "center",
      marginBottom: moderateHeightScale(12),
    },
    errorText: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.white80,
      textAlign: "center",
      marginBottom: moderateHeightScale(12),
    },
  });

export default function RegisterTermsModal({
  visible,
  onClose,
  onContinue,
  nonClosable = false,
}: AcceptTermsModalProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors as Theme), [colors]);
  const theme = colors as Theme;
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();
  const { showBanner } = useNotificationContext();
  const [isAgreed, setIsAgreed] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Handle back button press
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        if (visible && !nonClosable) {
          onClose();
          return true;
        }
        if (visible && nonClosable) {
          // Prevent closing when nonClosable
          return true;
        }
        return false;
      };

      const subscription = BackHandler.addEventListener(
        "hardwareBackPress",
        onBackPress
      );

      return () => subscription.remove();
    }, [visible, onClose, nonClosable])
  );

  const handleContinue = async () => {
    if (!isAgreed) {
      // If checkbox is not checked, set location to null and navigate to home
      dispatch(
        setLocation({
          lat: null,
          long: null,
          locationName: null,
        })
      );
      onContinue();
      return;
    }

    setErrorMessage(null);
    try {
      const servicesEnabled = await Location.hasServicesEnabledAsync();
      if (!servicesEnabled) {
        const errorMsg = "Please turn on your phone location";
        // setErrorMessage(errorMsg);
        showBanner("Location Error", errorMsg, "error");
        return;
      }
      onContinue();
    } catch (error) {
      console.error("Error getting location:", error);
      const errorMsg =
        error instanceof Error
          ? error.message
          : "Unable to get your location. Please make sure location services are enabled and try again.";
      // setErrorMessage(errorMsg);
      showBanner("Location Error", errorMsg, "error");
    }
  };

  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType="none"
      statusBarTranslucent={true}
      onRequestClose={nonClosable ? undefined : onClose}
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
            <Text style={styles.logoText}>Registration complete</Text>
          </View>
          <View style={styles.borderBottomLine} />
        </View>

        <View style={styles.container}>
          <View style={styles.content}>
            <View style={styles.iconContainer}>
              <CrownIcon
                width={moderateWidthScale(47)}
                height={moderateHeightScale(32)}
                color1={theme.white}
                color2={theme.darkGreen}
              />
            </View>

            <Text style={styles.title}>You're all set!</Text>
            <Text style={styles.bodyText}>You've registered successfully.</Text>
            <Text style={styles.bodyText2}>
              Your account is ready. Let's find you a perfect salon – enable
              location to see the best options near you.
            </Text>
          </View>

          <View style={styles.buttonContainer}>
            {errorMessage && (
              <Text style={styles.errorText}>{errorMessage}</Text>
            )}

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
              <Text style={styles.checkboxLabel}>Find salons near me</Text>
            </TouchableOpacity>

            <Button
              title="Lets go!"
              onPress={handleContinue}
              backgroundColor={theme.orangeBrown}
              textColor={theme.darkGreen}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}
