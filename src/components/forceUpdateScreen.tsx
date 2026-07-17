import React, { useMemo } from "react";
import {
  ActivityIndicator,
  Linking,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import Button from "@/src/components/button";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  heightScale,
  iconScale,
  moderateHeightScale,
  moderateWidthScale,
  widthScale,
} from "@/src/theme/dimensions";
import Logger from "@/src/services/logger";

type ForceUpdateScreenProps = {
  message: string;
  currentVersion: string;
  minVersion: string;
  storeUrl: string;
  onRecheck: () => void;
  rechecking?: boolean;
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    content: {
      flexGrow: 1,
      justifyContent: "center",
      paddingHorizontal: moderateWidthScale(24),
      paddingVertical: moderateHeightScale(32),
    },
    iconWrap: {
      alignSelf: "center",
      width: widthScale(88),
      height: widthScale(88),
      borderRadius: widthScale(44),
      backgroundColor: theme.orangeBrown30,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: heightScale(20),
    },
    title: {
      fontFamily: fonts.fontBold,
      fontSize: fontSize.size24,
      color: theme.darkGreen,
      textAlign: "center",
      marginBottom: heightScale(12),
    },
    message: {
      fontFamily: fonts.fontRegular,
      fontSize: fontSize.size16,
      color: theme.lightGreen,
      textAlign: "center",
      lineHeight: fontSize.size16 * 1.45,
      marginBottom: heightScale(24),
    },
    versionCard: {
      backgroundColor: theme.lightGreen05,
      borderRadius: moderateWidthScale(12),
      padding: moderateWidthScale(16),
      marginBottom: heightScale(28),
      borderWidth: 1,
      borderColor: theme.borderLight,
    },
    versionLabel: {
      fontFamily: fonts.fontRegular,
      fontSize: fontSize.size13,
      color: theme.lightGreen,
    },
    versionLabelSpaced: {
      marginTop: heightScale(12),
    },
    versionValue: {
      fontFamily: fonts.fontMedium,
      fontSize: fontSize.size18,
      color: theme.darkGreen,
      marginTop: heightScale(4),
    },
    primaryButton: {
      marginBottom: heightScale(12),
    },
    secondaryButton: {
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: moderateHeightScale(12),
      minHeight: moderateHeightScale(44),
    },
    secondaryButtonText: {
      fontFamily: fonts.fontMedium,
      fontSize: fontSize.size15,
      color: theme.buttonBack,
    },
  });

export default function ForceUpdateScreen({
  message,
  currentVersion,
  minVersion,
  storeUrl,
  onRecheck,
  rechecking = false,
}: ForceUpdateScreenProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors as Theme), [colors]);
  const theme = colors as Theme;

  const handleUpdatePress = async () => {
    if (!storeUrl?.trim()) {
      Logger.warn("[ForceUpdateScreen] Store URL is empty");
      return;
    }

    try {
      await Linking.openURL(storeUrl);
    } catch (error) {
      Logger.error("[ForceUpdateScreen] Failed to open store URL:", error);
    }
  };

  const storeLabel =
    Platform.OS === "ios" ? "Open App Store" : "Open Google Play";

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        bounces={false}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.iconWrap}>
          <MaterialIcons
            name="system-update"
            size={iconScale(40)}
            color={theme.darkGreen}
          />
        </View>

        <Text style={styles.title}>Update Required</Text>
        <Text style={styles.message}>{message}</Text>

        <View style={styles.versionCard}>
          <Text style={styles.versionLabel}>Your version</Text>
          <Text style={styles.versionValue}>{currentVersion || "—"}</Text>
          <Text style={[styles.versionLabel, styles.versionLabelSpaced]}>
            Required version
          </Text>
          <Text style={styles.versionValue}>{minVersion || "—"}</Text>
        </View>

        <Button
          title={storeLabel}
          onPress={handleUpdatePress}
          containerStyle={styles.primaryButton}
        />

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={onRecheck}
          disabled={rechecking}
          activeOpacity={0.85}
        >
          {rechecking ? (
            <ActivityIndicator color={theme.buttonBack} />
          ) : (
            <Text style={styles.secondaryButtonText}>I already updated</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
