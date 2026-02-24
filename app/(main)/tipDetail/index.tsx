import React, { useMemo } from "react";
import {
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  View,
  Text,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams } from "expo-router";
import { useDispatch } from "react-redux";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  heightScale,
  moderateHeightScale,
  moderateWidthScale,
} from "@/src/theme/dimensions";
import { openFullImageModal } from "@/src/state/slices/generalSlice";
import StackHeader from "@/src/components/StackHeader";

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    scrollContent: {
      paddingBottom: moderateHeightScale(40),
    },
    imageContainer: {
      width: "100%",
      height: heightScale(220),
      backgroundColor: theme.emptyProfileImage,
    },
    image: {
      width: "100%",
      height: "100%",
      resizeMode: "cover",
    },
    content: {
      paddingHorizontal: moderateWidthScale(20),
      paddingTop: moderateHeightScale(20),
    },
    section: {
      marginBottom: moderateHeightScale(20),
    },
    label: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontMedium,
      color: theme.text,
      marginBottom: moderateHeightScale(6),
    },
    value: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontRegular,
      color: theme.text,
      lineHeight: fontSize.size16 * 1.4,
    },
  });

export default function TipDetail() {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);
  const dispatch = useDispatch();
  const params = useLocalSearchParams<{
    title?: string;
    image?: string;
    action?: string;
    benefit?: string;
    standard?: string;
  }>();

  const title = params.title ?? "Pro Tip";
  const image = params.image ?? "";
  const action = params.action ?? "";
  const benefit = params.benefit ?? "";
  const standard = params.standard ?? "";

  return (
    <SafeAreaView edges={["bottom"]} style={styles.container}>
      <StackHeader title={title} />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {image && (
          <TouchableOpacity
            style={styles.imageContainer}
            onPress={() => dispatch(openFullImageModal({ images: [image] }))}
            activeOpacity={0.95}
          >
            <Image source={{ uri: image }} style={styles.image} />
          </TouchableOpacity>
        )}
        <View style={styles.content}>
          {action ? (
            <View style={styles.section}>
              <Text style={styles.label}>Action</Text>
              <Text style={styles.value}>{action}</Text>
            </View>
          ) : null}
          {benefit ? (
            <View style={styles.section}>
              <Text style={styles.label}>Benefit</Text>
              <Text style={styles.value}>{benefit}</Text>
            </View>
          ) : null}
          {standard ? (
            <View style={styles.section}>
              <Text style={styles.label}>Standard</Text>
              <Text style={styles.value}>{standard}</Text>
            </View>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
