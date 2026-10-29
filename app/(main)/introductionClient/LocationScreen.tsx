import React, { useMemo, useState } from "react";
import Logger from "@/src/services/logger";
import { StyleSheet, Text, View, Platform, Image } from "react-native";
import { useTheme } from "@/src/hooks/hooks";
import { useTranslation } from "react-i18next";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  moderateHeightScale,
  moderateWidthScale,
} from "@/src/theme/dimensions";
import { LeafLogo } from "@/assets/icons";
import { IMAGES } from "@/src/constant/images";
import Button from "@/src/components/button";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { requestLocationPermission } from "@/src/services/locationPermissionService";

interface LocationScreenProps {
  onNext: () => void;
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    content: {
      flex: 1,
      paddingHorizontal: moderateWidthScale(20),
      paddingTop: moderateHeightScale(20),
      paddingBottom: moderateHeightScale(30),
    },
    logoContainer: {
      marginBottom: moderateHeightScale(5),
    },
    titleContainer: {
      alignItems: "flex-start",
      marginBottom: moderateHeightScale(20),
    },
    titleText: {
      fontSize: fontSize.size28,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      marginBottom: moderateHeightScale(10),
    },
    subtitle: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
    },
    illustrationContainer: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      marginVertical: moderateHeightScale(20),
    },
    imageContainer: {
      width: "100%",
      alignItems: "center",
      justifyContent: "center",
    },
    locationImage: {
      width: moderateWidthScale(300),
      height: moderateHeightScale(300),
      resizeMode: "contain",
    },
    buttonContainer: {
      marginBottom: moderateHeightScale(30),
      marginHorizontal: moderateWidthScale(20),
    },
  });

export default function LocationScreen({ onNext }: LocationScreenProps) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => createStyles(colors as Theme), [colors]);
  const insets = useSafeAreaInsets();
  const [errorMessage] = useState<string | null>(null);
  const [asking, setAsking] = useState(false);

  // Location is optional: ask if we can, but always move on
  const handleContinue = async () => {
    if (asking) return;
    setAsking(true);
    try {
      // Skips the dialog by itself when services are off or already denied
      await requestLocationPermission();
    } catch (error) {
      Logger.error("Location permission request failed:", error);
    } finally {
      setAsking(false);
      onNext();
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View
        style={[
          styles.content,
          {
            paddingBottom:
              Platform.OS === "android" && insets.bottom > 30
                ? moderateHeightScale(30) + insets.bottom
                : moderateHeightScale(30),
          },
        ]}
      >
        <View style={styles.logoContainer}>
          <LeafLogo />
        </View>

        <View style={styles.titleContainer}>
          <Text style={styles.titleText}>{t("seeWhatsNearYou")}</Text>
          <Text style={styles.subtitle}>{t("turnOnLocationFindLocal")}</Text>
        </View>

        <View style={styles.illustrationContainer}>
          <View style={styles.imageContainer}>
            <Image source={IMAGES.location} style={styles.locationImage} />
          </View>
        </View>

        {errorMessage && (
          <Text
            style={{
              color: (colors as Theme).lightGreen,
              fontSize: fontSize.size14,
              fontFamily: fonts.fontRegular,
              textAlign: "center",
              marginBottom: moderateHeightScale(10),
            }}
          >
            {errorMessage}
          </Text>
        )}
      </View>

      <View style={styles.buttonContainer}>
        <Button title={t("continue")} onPress={handleContinue} />
      </View>
    </SafeAreaView>
  );
}
