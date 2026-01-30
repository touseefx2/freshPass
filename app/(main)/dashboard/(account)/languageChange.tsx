import React, { useMemo } from "react";
import Logger from "@/src/services/logger";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { useTheme, useAppDispatch, useAppSelector } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  moderateHeightScale,
  moderateWidthScale,
} from "@/src/theme/dimensions";
import StackHeader from "@/src/components/StackHeader";
import { MaterialIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { setLanguage } from "@/src/state/slices/generalSlice";
import { setupRTL } from "@/src/constant/functions";
import * as Updates from "expo-updates";
import { SafeAreaView } from "react-native-safe-area-context";

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
    listContainer: {
      marginTop: moderateHeightScale(8),
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: moderateHeightScale(18),
      paddingHorizontal: moderateWidthScale(4),
    },
    rowLeft: {
      flexDirection: "row",
      alignItems: "center",
      flex: 1,
    },
    languageInfo: {
      marginLeft: moderateWidthScale(16),
      flex: 1,
    },
    rowTitle: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
      marginBottom: moderateHeightScale(4),
    },
    rowSubtitle: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
    },
    languageCode: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      marginTop: moderateHeightScale(2),
    },
    checkIcon: {
      marginRight: moderateWidthScale(8),
    },
    rowDivider: {
      height: 1,
      backgroundColor: theme.borderLight,
      marginLeft: moderateWidthScale(4),
    },
    flagContainer: {
      width: moderateWidthScale(40),
      height: moderateWidthScale(40),
      borderRadius: moderateWidthScale(20),
      backgroundColor: theme.orangeBrown015,
      alignItems: "center",
      justifyContent: "center",
    },
    flagText: {
      fontSize: fontSize.size20,
    },
  });

const languages = [
  {
    code: "en",
    nameKey: "languagesEnName",
    nativeNameKey: "languagesEnNativeName",
    flag: "🇬🇧",
  },
  {
    code: "fr",
    nameKey: "languagesFrName",
    nativeNameKey: "languagesFrNativeName",
    flag: "🇫🇷",
  },
  {
    code: "es",
    nameKey: "languagesEsName",
    nativeNameKey: "languagesEsNativeName",
    flag: "🇪🇸",
  },
];

export default function LanguageChangeScreen() {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);
  const dispatch = useAppDispatch();
  const { t, i18n } = useTranslation();
  const currentLanguage = useAppSelector((state) => state.general.language);

  const changeLang = async (langCode: string) => {
    if (langCode === currentLanguage) return;

    await i18n.changeLanguage(langCode);
    dispatch(setLanguage(langCode));

    // Setup RTL based on language
    const needsReload = setupRTL(langCode);

    // Reload app to apply RTL changes if needed
    if (needsReload) {
      try {
        setTimeout(async () => {
          await Updates.reloadAsync();
        }, 50);
      } catch (error) {
        Logger.warn(
          "Could not reload app. RTL change will apply on next restart:",
          error,
        );
      }
    }
  };

  return (
    <SafeAreaView edges={["bottom"]} style={styles.container}>
      <StackHeader title={t("language")} />
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.listContainer}>
          {languages.map((language, index) => {
            const isSelected = currentLanguage === language.code;
            return (
              <View key={language.code}>
                <TouchableOpacity
                  style={styles.row}
                  onPress={() => changeLang(language.code)}
                  activeOpacity={0.7}
                >
                  <View style={styles.rowLeft}>
                    <View style={styles.flagContainer}>
                      <Text style={styles.flagText}>{language.flag}</Text>
                    </View>
                    <View style={styles.languageInfo}>
                      <Text style={styles.rowTitle}>{t(language.nameKey)}</Text>
                      <Text style={styles.rowSubtitle}>
                        {t(language.nativeNameKey)}
                      </Text>
                      {/* <Text style={styles.languageCode}>{language.code.toUpperCase()}</Text> */}
                    </View>
                  </View>
                  {isSelected && (
                    <MaterialIcons
                      name="check-circle"
                      size={moderateWidthScale(24)}
                      color={theme.buttonBack}
                      style={styles.checkIcon}
                    />
                  )}
                </TouchableOpacity>
                {index !== languages.length - 1 && (
                  <View style={styles.rowDivider} />
                )}
              </View>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
