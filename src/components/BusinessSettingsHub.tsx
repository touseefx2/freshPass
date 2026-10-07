import React, { useMemo, useState } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons, MaterialCommunityIcons, Entypo } from "@expo/vector-icons";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  moderateHeightScale,
  moderateWidthScale,
} from "@/src/theme/dimensions";
import StackHeader from "@/src/components/StackHeader";

type IconVariant = "dark" | "accent" | "cream";

export type BusinessSettingsHubItem = {
  key: string;
  title: string;
  subtitle?: string;
  iconName: string;
  iconFamily?: "material" | "community";
  onPress: () => void;
};

/** Grouped sub-menu used by Business Management (Business Profile, Services & Memberships). */
export default function BusinessSettingsHub({
  title,
  subtitle,
  note,
  items,
}: {
  title: string;
  subtitle?: string;
  /** Optional info line shown under the rows */
  note?: string;
  items: BusinessSettingsHubItem[];
}) {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);
  const variants: IconVariant[] = ["dark", "accent", "cream"];

  return (
    <SafeAreaView edges={["bottom"]} style={styles.container}>
      <StackHeader title="" />
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerBlock}>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>

        <View style={styles.list}>
          {items.map((item, index) => (
            <HubRow
              key={item.key}
              item={item}
              variant={variants[index % 3]}
              theme={theme}
              styles={styles}
            />
          ))}
        </View>

        {note ? (
          <View style={styles.noteBox}>
            <MaterialIcons
              name="info-outline"
              size={moderateWidthScale(18)}
              color={theme.darkGreen}
            />
            <Text style={styles.noteText}>{note}</Text>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function HubRow({
  item,
  variant,
  theme,
  styles,
}: {
  item: BusinessSettingsHubItem;
  variant: IconVariant;
  theme: Theme;
  styles: ReturnType<typeof createStyles>;
}) {
  const [pressed, setPressed] = useState(false);
  const iconSize = moderateWidthScale(30);
  const iconBg =
    variant === "dark"
      ? theme.darkGreen
      : variant === "accent"
        ? theme.selectCard
        : theme.orangeBrown015;
  const iconColor = variant === "cream" ? theme.darkGreen : theme.white;

  return (
    <Pressable
      onPress={item.onPress}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      accessibilityRole="button"
      accessibilityLabel={item.title}
      style={[styles.rowShadow, pressed && styles.rowShadowPressed]}
    >
      <View style={[styles.row, pressed && styles.rowPressed]}>
        <View
          style={[
            styles.iconWrap,
            { backgroundColor: iconBg },
            variant === "cream" && styles.iconWrapCream,
          ]}
        >
          {item.iconFamily === "community" ? (
            <MaterialCommunityIcons
              name={
                item.iconName as React.ComponentProps<
                  typeof MaterialCommunityIcons
                >["name"]
              }
              size={iconSize}
              color={iconColor}
            />
          ) : (
            <MaterialIcons
              name={
                item.iconName as React.ComponentProps<
                  typeof MaterialIcons
                >["name"]
              }
              size={iconSize}
              color={iconColor}
            />
          )}
        </View>

        <View style={styles.rowTextBlock}>
          <Text style={styles.rowTitle} numberOfLines={2}>
            {item.title}
          </Text>
          {item.subtitle ? (
            <Text style={styles.rowSubtitle} numberOfLines={2}>
              {item.subtitle}
            </Text>
          ) : null}
        </View>

        <Entypo
          name="chevron-small-right"
          size={moderateWidthScale(28)}
          color={theme.darkGreen}
        />
      </View>
    </Pressable>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    content: {
      flex: 1,
    },
    contentContainer: {
      paddingTop: moderateHeightScale(20),
      paddingHorizontal: moderateWidthScale(16),
      paddingBottom: moderateHeightScale(32),
    },
    headerBlock: {
      marginBottom: moderateHeightScale(16),
      paddingHorizontal: moderateWidthScale(2),
      gap: moderateHeightScale(4),
    },
    title: {
      fontSize: fontSize.size24,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    subtitle: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen5,
      lineHeight: fontSize.size20,
    },
    list: {
      gap: moderateHeightScale(14),
    },
    rowShadow: {
      borderRadius: moderateWidthScale(18),
      ...Platform.select({
        ios: {
          shadowColor: theme.darkGreen,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.18,
          shadowRadius: moderateWidthScale(8),
        },
        android: {
          elevation: 5,
          shadowColor: theme.darkGreen,
        },
        default: {
          shadowColor: theme.darkGreen,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.18,
          shadowRadius: moderateWidthScale(8),
        },
      }),
    },
    rowShadowPressed: {
      ...Platform.select({
        ios: { shadowOpacity: 0.1, shadowRadius: moderateWidthScale(4) },
        android: { elevation: 2 },
        default: { shadowOpacity: 0.1 },
      }),
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(14),
      minHeight: moderateHeightScale(96),
      paddingHorizontal: moderateWidthScale(16),
      paddingVertical: moderateHeightScale(16),
      borderRadius: moderateWidthScale(18),
      borderWidth: 1,
      borderColor: theme.lightGreen1,
      backgroundColor: theme.background,
    },
    rowPressed: {
      backgroundColor: theme.orangeBrown015,
    },
    iconWrap: {
      width: moderateWidthScale(58),
      height: moderateWidthScale(58),
      borderRadius: moderateWidthScale(15),
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
      overflow: "hidden",
    },
    iconWrapCream: {
      borderWidth: 1,
      borderColor: theme.lightGreen1,
    },
    rowTextBlock: {
      flex: 1,
      gap: moderateHeightScale(3),
    },
    rowTitle: {
      fontSize: fontSize.size17,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    rowSubtitle: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen5,
      lineHeight: fontSize.size17,
    },
    noteBox: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: moderateWidthScale(8),
      marginTop: moderateHeightScale(20),
      paddingHorizontal: moderateWidthScale(14),
      paddingVertical: moderateHeightScale(12),
      borderRadius: moderateWidthScale(12),
      backgroundColor: theme.orangeBrown015,
    },
    noteText: {
      flex: 1,
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: theme.darkGreen,
      lineHeight: fontSize.size18,
    },
  });
