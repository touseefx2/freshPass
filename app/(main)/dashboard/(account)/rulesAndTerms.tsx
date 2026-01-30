import React, { useMemo } from "react";
import Logger from "@/src/services/logger";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Linking,
  Alert,
} from "react-native";
import { useTheme } from "@/src/hooks/hooks";
import { useTranslation } from "react-i18next";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  moderateHeightScale,
  moderateWidthScale,
} from "@/src/theme/dimensions";
import StackHeader from "@/src/components/StackHeader";

// Links from environment or constants
const TERMS_AND_CONDITIONS_URL = process.env.EXPO_PUBLIC_TERMS_URL || "";
const PRIVACY_POLICY_URL = process.env.EXPO_PUBLIC_PRIVACY_URL || "";

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    content: {
      flex: 1,
      paddingHorizontal: moderateWidthScale(20),
    },
    contentContainer: {
      paddingVertical: moderateHeightScale(24),
    },
    listContainer: {},
    row: {
      paddingVertical: moderateHeightScale(16),
    },
    rowContent: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    rowTitle: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontRegular,
      color: theme.darkGreen,
    },
    rowDivider: {
      height: 1,
      backgroundColor: theme.borderLight,
    },
  });

export default function RulesAndTermsScreen() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);

  const handleOpenLink = async (url: string, title: string) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert(t("error"), `${t("cannotOpen")} ${title}. URL: ${url}`);
      }
    } catch (error) {
      Logger.error("Error opening link:", error);
      Alert.alert(t("error"), `${t("failedToOpen")} ${title}`);
    }
  };

  const rows = [
    {
      key: "terms",
      title: t("termsAndConditions"),
      url: TERMS_AND_CONDITIONS_URL,
    },
    {
      key: "privacy",
      title: t("privacyPolicyLower"),
      url: PRIVACY_POLICY_URL,
    },
  ];

  return (
    <View style={styles.container}>
      <StackHeader title={t("rulesAndTerms")} />
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.listContainer}>
          {rows.map((row, index) => (
            <View key={row.key}>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => handleOpenLink(row.url, row.title)}
                style={styles.row}
              >
                <View style={styles.rowContent}>
                  <Text style={styles.rowTitle}>{row.title}</Text>
                  {/* <MaterialIcons
                    name="keyboard-arrow-right"
                    size={moderateWidthScale(18)}
                    color={theme.darkGreen}
                  /> */}
                </View>
              </TouchableOpacity>
              {index !== rows.length - 1 && <View style={styles.rowDivider} />}
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
