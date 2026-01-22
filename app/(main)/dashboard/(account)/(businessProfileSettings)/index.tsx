import React, { useMemo } from "react";
import Logger from "@/src/services/logger";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  moderateHeightScale,
  moderateWidthScale,
} from "@/src/theme/dimensions";
import StackHeader from "@/src/components/StackHeader";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

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
      paddingVertical: moderateHeightScale(16),
    },
    rowContent: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    rowTitle: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
    },
    rowDivider: {
      height: 1,
      backgroundColor: theme.borderLight,
    },
  });

export default function BusinessProfileSettingsScreen() {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);
  const router = useRouter();

  const handleRowPress = (key: string) => {
    if (key === "businessProfile") {
      router.push("./businessProfile");
    } else if (key === "description") {
      router.push("./description");
    } else if (key === "services") {
      router.push("./services");
    } else if (key === "socialMedia") {
      router.push("./socialMedia");
    } else if (key === "availability") {
      router.push("./setupAvailability");
    } else if (key === "subscriptions") {
      router.push("./subscriptions");
    } else if (key === "team") {
      router.push("./team");
    } else if (key === "portfolio") {
      router.push("./portfolio");
    } else if (key === "businessLocation") {
      router.push("./location");
    } else {
      // TODO: Navigate to respective screens
      Logger.log("Business profile setting pressed:", key);
    }
  };

  const settings = [
    { key: "businessProfile", title: "Business profile" },
    { key: "businessLocation", title: "Your business location" },
    { key: "description", title: "Description" },
    { key: "availability", title: "Set availability" },
    { key: "services", title: "Manage services list" },
    { key: "subscriptions", title: "Manage subscription list" },
    { key: "team", title: "Manage team" },
    { key: "socialMedia", title: "Your social media" },
    { key: "portfolio", title: "Manage portfolio photos" },
    // { key: "verification", title: "Manage salon verification" },
  ];

  return (
    <View style={styles.container}>
      <StackHeader title="Business profile settings" />
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.listContainer}>
          {settings.map((setting, index) => (
            <View key={setting.key}>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => handleRowPress(setting.key)}
                style={styles.row}
              >
                <View style={styles.rowContent}>
                  <Text style={styles.rowTitle}>{setting.title}</Text>
                  <MaterialIcons
                    name="keyboard-arrow-right"
                    size={moderateWidthScale(18)}
                    color={theme.darkGreen}
                  />
                </View>
              </TouchableOpacity>
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
