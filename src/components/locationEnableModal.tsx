import React, { useMemo, useState } from "react";
import Logger from "@/src/services/logger";
import { Modal, StyleSheet, View, Text, TouchableOpacity } from "react-native";
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
      paddingHorizontal: moderateWidthScale(20),
    },
    modalBox: {
      backgroundColor: theme.background,
      borderRadius: moderateWidthScale(20),
      padding: moderateWidthScale(24),
      width: "100%",
      maxWidth: widthScale(380),
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
      alignItems: "center",
      marginBottom: moderateHeightScale(24),
      paddingHorizontal: moderateWidthScale(20),
    },
    iconContainer: {
      width: moderateWidthScale(50),
      height: moderateWidthScale(50),
      borderRadius: moderateWidthScale(50 / 2),
      backgroundColor: theme.orangeBrown30,
      alignItems: "center",
      justifyContent: "center",
    },
    title: {
      fontSize: fontSize.size21,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    subtitle: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontMedium,
      color: theme.lightGreen,
    },
    descriptionContainer: {
      backgroundColor: theme.orangeBrown30,
      borderRadius: moderateWidthScale(12),
      padding: moderateWidthScale(16),
      marginBottom: moderateHeightScale(24),
      gap: moderateHeightScale(12),
    },
    descriptionText: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.text,
      lineHeight: moderateHeightScale(20),
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
      marginTop: moderateHeightScale(7),
    },
    bulletText: {
      flex: 1,
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.text,
      lineHeight: moderateHeightScale(20),
    },
    buttonContainer: {
      gap: moderateHeightScale(12),
    },
    skipButton: {
      alignItems: "center",
      justifyContent: "center",
    },
    skipButtonText: {
      fontSize: fontSize.size15,
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
      const servicesEnabled = await Location.hasServicesEnabledAsync();
      if (!servicesEnabled) {
        const errorMsg = "Please turn on your phone location";
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
            <View
              style={{
                flexDirection: "row",
                gap: moderateWidthScale(10),
              }}
            >
              <View style={styles.iconContainer}>
                <MapPinIcon
                  width={moderateWidthScale(20)}
                  height={moderateHeightScale(30)}
                  color={theme.darkGreen}
                />
              </View>
              <View>
                <Text style={styles.title}>{t("enableLocation")}</Text>
                <Text style={styles.subtitle}>
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
                <Text style={styles.descriptionText}>
                  To select your location on the map, we need to access your
                  current location. This will help you see your position and
                  choose the right location.
                </Text>
                <View style={styles.bulletPoint}>
                  <View style={styles.bulletDot} />
                  <Text style={styles.bulletText}>
                    Get your current location to show on the map
                  </Text>
                </View>
                <View style={styles.bulletPoint}>
                  <View style={styles.bulletDot} />
                  <Text style={styles.bulletText}>
                    Easily select and confirm your location
                  </Text>
                </View>
              </>
            ) : (
              <>
                <Text style={styles.descriptionText}>
                  Businesses are shown based on your current location
                </Text>
                <View style={styles.bulletPoint}>
                  <View style={styles.bulletDot} />
                  <Text style={styles.bulletText}>
                    Find salons and services closest to you
                  </Text>
                </View>
                <View style={styles.bulletPoint}>
                  <View style={styles.bulletDot} />
                  <Text style={styles.bulletText}>
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
            />

            <TouchableOpacity
              style={styles.skipButton}
              onPress={() => onClose(false)}
              activeOpacity={0.7}
            >
              <Text style={styles.skipButtonText}>{t("skipForNow")}</Text>
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
