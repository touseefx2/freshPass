import React, { useMemo, useState } from "react";
import { StyleSheet, Text, View, ScrollView } from "react-native";
import { useTheme } from "@/src/hooks/hooks";
import { useTranslation } from "react-i18next";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  moderateHeightScale,
  moderateWidthScale,
} from "@/src/theme/dimensions";
import StackHeader from "@/src/components/StackHeader";
import CustomToggle from "@/src/components/customToggle";

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
      //   marginTop: moderateHeightScale(24),
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: moderateHeightScale(16),
    },
    rowTitle: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontRegular,
      color: theme.darkGreen,
      flex: 1,
    },
    rowDivider: {
      height: 1,
      backgroundColor: theme.borderLight,
    },
  });

export default function NotificationSettingsScreen() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);

  const [showNotifications, setShowNotifications] = useState(true);
  const [notificationSound, setNotificationSound] = useState(true);
  const [showOnLockScreen, setShowOnLockScreen] = useState(false);

  const settings = [
    {
      key: "showNotifications",
      title: t("showNotifications"),
      value: showNotifications,
      onValueChange: setShowNotifications,
    },
    {
      key: "notificationSound",
      title: t("notificationSound"),
      value: notificationSound,
      onValueChange: setNotificationSound,
    },
    {
      key: "showOnLockScreen",
      title: t("showOnLockScreen"),
      value: showOnLockScreen,
      onValueChange: setShowOnLockScreen,
    },
  ];

  return (
    <View style={styles.container}>
      <StackHeader title={t("notificationSettings")} />
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.listContainer}>
          {settings.map((setting, index) => (
            <View key={setting.key}>
              <View style={styles.row}>
                <Text style={styles.rowTitle}>{setting.title}</Text>
                <CustomToggle
                  value={setting.value}
                  onValueChange={setting.onValueChange}
                />
              </View>
              {index !== settings.length - 1 && (
                <View style={styles.rowDivider} />
              )}
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
