import React, { useMemo } from "react";
import {
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
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

type MaintenanceModeScreenProps = {
  message: string;
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
      marginBottom: heightScale(28),
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

export default function MaintenanceModeScreen({
  message,
  onRecheck,
  rechecking = false,
}: MaintenanceModeScreenProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors as Theme), [colors]);
  const theme = colors as Theme;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        bounces={false}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.iconWrap}>
          <MaterialIcons
            name="build"
            size={iconScale(40)}
            color={theme.darkGreen}
          />
        </View>

        <Text style={styles.title}>Under Maintenance</Text>
        <Text style={styles.message}>{message}</Text>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={onRecheck}
          disabled={rechecking}
          activeOpacity={0.85}
        >
          {rechecking ? (
            <ActivityIndicator color={theme.buttonBack} />
          ) : (
            <Text style={styles.secondaryButtonText}>Try again</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
