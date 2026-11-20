import React, { useMemo, useState } from "react";
import Logger from "@/src/services/logger";
import { Modal, StyleSheet, View, Text, TouchableOpacity, Platform } from "react-native";
import { useTheme } from "@/src/hooks/hooks";
import { useTranslation } from "react-i18next";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  moderateHeightScale,
  moderateWidthScale,
  widthScale,
} from "@/src/theme/dimensions";
import * as Location from "expo-location";
import { ensureLocationServicesOn } from "@/src/services/locationPermissionService";
import Button from "@/src/components/button";
import { MapPinIcon } from "@/assets/icons";
import NotificationBanner from "@/src/components/notificationBanner";

interface LocationEnableModalProps {
  visible: boolean;
  onClose: (shouldGetLocation?: boolean) => void;
  screenName?: string;
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.6)",
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: moderateWidthScale(28),
    },
    modalBox: {
      backgroundColor: theme.background,
      borderRadius: moderateWidthScale(18),
      padding: moderateWidthScale(18),
      width: "100%",
      maxWidth: widthScale(340),
      shadowColor: "#000",
      shadowOffset: {
        width: 0,
        height: 4,
      },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 8,
    },

    iconWrapper: {
      marginBottom: moderateHeightScale(14),
    },
    headerRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(10),
    },
    headerText: {
      flex: 1,
    },
    iconContainer: {
      width: moderateWidthScale(42),
      height: moderateWidthScale(42),
      borderRadius: moderateWidthScale(21),
      backgroundColor: theme.orangeBrown30,
      alignItems: "center",
      justifyContent: "center",
    },
    title: {
      fontSize: fontSize.size18,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    subtitle: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontMedium,
      color: theme.lightGreen,
    },
    descriptionContainer: {
      backgroundColor: theme.orangeBrown30,
      borderRadius: moderateWidthScale(12),
      padding: moderateWidthScale(12),
      marginBottom: moderateHeightScale(16),
      gap: moderateHeightScale(8),
    },
    descriptionText: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: theme.text,
      lineHeight: fontSize.size13 * 1.4,
    },
    bulletPoint: {
      flexDirection: "row",
      gap: moderateWidthScale(8),
    },
    bulletDot: {
      width: moderateWidthScale(6),
      height: moderateWidthScale(6),
      borderRadius: moderateWidthScale(3),
      backgroundColor: theme.darkGreen,
      marginTop: fontSize.size13 * 0.7 - moderateWidthScale(3),
    },
    bulletText: {
      flex: 1,
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: theme.text,
      lineHeight: fontSize.size13 * 1.4,
    },
    buttonContainer: {
      gap: moderateHeightScale(10),
    },
    enableButton: {
      height: moderateHeightScale(42),
    },
    skipButton: {
      alignItems: "center",
      justifyContent: "center",
    },
    skipButtonText: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontMedium,
      color: theme.lightGreen,
    },
    loadingText: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontMedium,
      color: theme.text,
      textAlign: "center",
      marginBottom: moderateHeightScale(8),
    },
  });

export default function LocationEnableModal({
  visible,
  onClose,
  screenName,
}: LocationEnableModalProps) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);
  const [modalBanner, setModalBanner] = useState<{
    visible: boolean;
    title: string;
    message: string;
    type: "success" | "error" | "warning" | "info";
  }>({
    visible: false,
    title: "",
    message: "",
    type: "error",
  });

  const handleContinue = async () => {
    setModalBanner({
      visible: false,
      title: "",
      message: "",
      type: "error",
    });
    try {
      const servicesEnabled = await ensureLocationServicesOn();
      if (!servicesEnabled) {
        // iOS can't switch it on for the user — tell them where it lives
        const errorMsg =
          Platform.OS === "ios"
            ? "Please turn on Location Services in Settings → Privacy & Security → Location Services"
            : "Please turn on your phone location";
        setModalBanner({
          visible: true,
          title: "Location Error",
          message: errorMsg,
          type: "error",
        });
        return;
      }

      if (servicesEnabled) {
        onClose(true);
        return;
      }
    } catch (error) {
      Logger.error("Error getting location:", error);
      const errorMsg =
        error instanceof Error
          ? error.message
          : "Unable to get your location. Please make sure location services are enabled and try again.";
      setModalBanner({
        visible: true,
        title: "Location Error",
        message: errorMsg,
        type: "error",
      });
    }
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      statusBarTranslucent={true}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalBox}>
          <View style={styles.iconWrapper}>
            <View style={styles.headerRow}>
              <View style={styles.iconContainer}>
                <MapPinIcon
                  width={moderateWidthScale(17)}
                  height={moderateWidthScale(24)}
                  color={theme.darkGreen}
                />
              </View>
              <View style={styles.headerText}>
                <Text style={styles.title} maxFontSizeMultiplier={1.2}>
                  {t("enableLocation")}
                </Text>
                <Text style={styles.subtitle} maxFontSizeMultiplier={1.2}>
                  {screenName === "setLocation"
                    ? t("getCurrentLocationForMap")
                    : t("turnOnLocationDiscover")}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.descriptionContainer}>
            {screenName === "setLocation" ? (
              <>
                <Text style={styles.descriptionText} maxFontSizeMultiplier={1.2}>
                  To select your location on the map, we need to access your
                  current location. This will help you see your position and
                  choose the right location.
                </Text>
                <View style={styles.bulletPoint}>
                  <View style={styles.bulletDot} />
                  <Text style={styles.bulletText} maxFontSizeMultiplier={1.2}>
                    Get your current location to show on the map
                  </Text>
                </View>
                <View style={styles.bulletPoint}>
                  <View style={styles.bulletDot} />
                  <Text style={styles.bulletText} maxFontSizeMultiplier={1.2}>
                    Easily select and confirm your location
                  </Text>
                </View>
              </>
            ) : (
              <>
                <Text style={styles.descriptionText} maxFontSizeMultiplier={1.2}>
                  Businesses are shown based on your current location
                </Text>
                <View style={styles.bulletPoint}>
                  <View style={styles.bulletDot} />
                  <Text style={styles.bulletText} maxFontSizeMultiplier={1.2}>
                    Find salons and services closest to you
                  </Text>
                </View>
                <View style={styles.bulletPoint}>
                  <View style={styles.bulletDot} />
                  <Text style={styles.bulletText} maxFontSizeMultiplier={1.2}>
                    Without location, businesses will appear randomly
                  </Text>
                </View>
              </>
            )}
          </View>

          <View style={styles.buttonContainer}>
            <Button
              title={t("enableLocation")}
              onPress={handleContinue}
              textColor={theme.white}
              containerStyle={styles.enableButton}
            />

            <TouchableOpacity
              style={styles.skipButton}
              onPress={() => onClose(false)}
              activeOpacity={0.7}
              // Enable button is only 12 above, so keep vertical slop small
              hitSlop={{ top: 6, bottom: 6, left: 16, right: 16 }}
            >
              <Text style={styles.skipButtonText} maxFontSizeMultiplier={1.2}>
                {t("skipForNow")}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
        <NotificationBanner
          visible={modalBanner.visible}
          title={modalBanner.title}
          message={modalBanner.message}
          type={modalBanner.type}
          duration={3000}
          onDismiss={() =>
            setModalBanner((prev) => ({ ...prev, visible: false }))
          }
        />
      </View>
    </Modal>
  );
}
