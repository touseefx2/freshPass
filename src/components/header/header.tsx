import { langData, themeData } from "@/src/constant/data";
import { setupRTL } from "@/src/constant/functions";
import { useAppDispatch, useTheme } from "@/src/hooks/hooks";
import {
  setLanguage,
  setTheme,
  setThemeType,
} from "@/src/state/slices/generalSlice";
import { Theme, ThemeName } from "@/src/theme/colors";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Text, View } from "react-native";
import { Dropdown } from "react-native-element-dropdown";
import * as Updates from "expo-updates";
import { createStyles } from "./styles";

export default function Header() {
  const dispatch = useAppDispatch();
  const { colors, theme } = useTheme();
  const { i18n } = useTranslation();
  const styles = useMemo(() => createStyles(colors as Theme), [colors]);

  const renderItem2 = (item: any) => {
    const isSel = item.value === theme;
    return (
      <View style={[styles.item, isSel && styles.selItem]}>
        <Text
          style={[
            styles.itemText,
            { color: isSel ? (colors as Theme).selectedDropDownText : (colors as Theme).text },
          ]}
        >
          {item.label}
        </Text>
      </View>
    );
  };

  const renderItem = (item: any) => {
    const isSel = item.value === i18n.language;
    return (
      <View style={[styles.item, isSel && styles.selItem]}>
        <Text
          style={[
            styles.itemText,
            { color: isSel ? (colors as Theme).selectedDropDownText : (colors as Theme).text },
          ]}
        >
          {item.label}
        </Text>
      </View>
    );
  };

  const changeLang = async (val: string) => {
    await i18n.changeLanguage(val);
    dispatch(setLanguage(val));

    // Setup RTL based on language
    const needsReload = setupRTL(val);

    // Reload app to apply RTL changes if needed
    // This is necessary because I18nManager changes only take effect after app restart
    if (needsReload) {
      try {
        setTimeout(async () => {
          await Updates.reloadAsync();
        }, 50);
      } catch (error) {
        // If reload fails (e.g., in Expo Go), the change will apply on next app restart
        console.warn(
          "Could not reload app. RTL change will apply on next restart:",
          error
        );
      }
    }
  };

  const onSetTheme = async (val: ThemeName) => {
    dispatch(setThemeType("default"));
    dispatch(setTheme(val));
  };

  return (
    <View style={styles.container}>
      <View style={styles.rightSec}>
        <Dropdown
          style={styles.dropdown}
          containerStyle={styles.dropdownListCont}
          activeColor={(colors as Theme).primary}
          showsVerticalScrollIndicator={false}
          dropdownPosition="auto"
          placeholderStyle={styles.placeholderStyle}
          selectedTextStyle={styles.selectedTextStyle}
          data={themeData}
          maxHeight={200}
          labelField="label"
          valueField="value"
          placeholder=""
          value={theme}
          onChange={(item) =>
            item.value === "system"
              ? setThemeType(item.value)
              : onSetTheme(item.value)
          }
          renderLeftIcon={() => (
            <MaterialCommunityIcons
              name="theme-light-dark"
              size={20}
              color={(colors as Theme).icon}
            />
          )}
          renderRightIcon={() => null}
          renderItem={renderItem2}
        />
        <Dropdown
          style={styles.dropdown}
          containerStyle={styles.dropdownListCont}
          showsVerticalScrollIndicator={false}
          activeColor={(colors as Theme).primary}
          dropdownPosition="auto"
          placeholderStyle={styles.placeholderStyle}
          selectedTextStyle={styles.selectedTextStyle}
          data={langData}
          maxHeight={300}
          labelField="label"
          valueField="value"
          placeholder=""
          value={i18n.language}
          onChange={(item) => changeLang(item.value)}
          renderLeftIcon={() => (
            <Ionicons name="language" size={20} color={(colors as Theme).icon} />
          )}
          renderRightIcon={() => null}
          renderItem={renderItem}
        />
      </View>
    </View>
  );
}
