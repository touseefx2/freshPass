// Master class card for the customer "FreshPass Deals" row (guide 13.3).
// Same footprint as the business Deals card (310 × 132, dark green, radius 12)
// so the mixed row stays even.

import React, { useMemo } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
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
import {
  HIRING_CORNER_OVERHANG,
  HIRING_FRAME_WIDTH,
} from "@/src/components/jobs/jobBadges";
import type { MasterClass } from "@/src/types/masterClass";
import {
  formatClassDateTime,
  formatClassPrice,
  getClassPrice,
  getClassTypeLabel,
  getInstructorName,
} from "@/src/utils/masterClassHelpers";
import { ClassMediaThumb, ClassTypePill, PriceTag } from "./parts";

/** Text inside a fixed-height card: cap OS font scaling so nothing clips. */
const MAX_FONT_SCALE = 1.2;

type ClassDealCardProps = {
  masterClass: MasterClass;
  /** Defaults to opening the customer class detail. */
  onPress?: (masterClass: MasterClass) => void;
};

function ClassDealCard({ masterClass, onPress }: ClassDealCardProps) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);
  const router = useRouter();

  const label = getClassTypeLabel(masterClass);
  const instructor = getInstructorName(masterClass);
  const when = formatClassDateTime(masterClass.date, masterClass.time);
  const { current, original } = getClassPrice(masterClass);
  const priceText = formatClassPrice(current);

  const a11yLabel = [
    label,
    masterClass.title,
    instructor ? t("mcByInstructor", { name: instructor }) : "",
    when,
    priceText,
    original != null ? formatClassPrice(original) : "",
  ]
    .filter(Boolean)
    .join(", ");

  const handlePress = () => {
    if (onPress) {
      onPress(masterClass);
      return;
    }
    router.push({
      pathname: "/(main)/classes/detail",
      params: { id: String(masterClass.id) },
    } as any);
  };

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={handlePress}
      style={styles.card}
      accessibilityRole="button"
      accessibilityLabel={a11yLabel}
      accessibilityHint={t("mcViewClass")}
    >
      <View style={styles.cornerBadge}>
        <Ionicons
          name="school"
          size={moderateWidthScale(15)}
          color={theme.darkGreen}
        />
      </View>

      <ClassMediaThumb
        media={masterClass.media}
        width={widthScale(110)}
        height={heightScale(110)}
        radius={moderateWidthScale(6)}
        playSize={iconScale(13)}
        onDark
        style={styles.media}
      />

      <View style={styles.content}>
        <ClassTypePill
          label={label}
          variant="orange"
          showIcon
          style={styles.typePill}
        />

        <View style={styles.middle}>
          <Text
            style={styles.title}
            numberOfLines={2}
            maxFontSizeMultiplier={MAX_FONT_SCALE}
          >
            {masterClass.title}
          </Text>
          {!!instructor && (
            <Text
              style={styles.instructor}
              numberOfLines={1}
              maxFontSizeMultiplier={MAX_FONT_SCALE}
            >
              {t("mcByInstructor", { name: instructor })}
            </Text>
          )}
          {!!when && (
            <View style={styles.whenRow}>
              <Ionicons
                name="calendar-outline"
                size={iconScale(12)}
                color={theme.orangeBrown}
              />
              <Text
                style={styles.whenText}
                numberOfLines={1}
                maxFontSizeMultiplier={MAX_FONT_SCALE}
              >
                {when}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.bottomRow}>
          <PriceTag
            amount={current}
            original={original}
            size="sm"
            inverted
            color={theme.goldenBuy}
            style={styles.price}
          />
          <View style={styles.viewPill}>
            <Text
              style={styles.viewPillText}
              numberOfLines={1}
              maxFontSizeMultiplier={MAX_FONT_SCALE}
            >
              {t("mcViewClass")}
            </Text>
            <Ionicons
              name="chevron-forward"
              size={iconScale(11)}
              color={theme.darkGreen}
            />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default React.memo(ClassDealCard);

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    // Mirrors ShowBusiness `verifiedSalonCardNew` (incl. the transparent
    // hiring frame) so both cards share the exact same footprint.
    card: {
      backgroundColor: theme.darkGreen,
      borderRadius: moderateWidthScale(12),
      borderWidth: HIRING_FRAME_WIDTH,
      borderColor: theme.orangeBrown,
      paddingHorizontal: moderateWidthScale(10) - HIRING_FRAME_WIDTH,
      paddingVertical: moderateHeightScale(10) - HIRING_FRAME_WIDTH,
      height: heightScale(132),
      width: widthScale(310),
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(12),
    },
    cornerBadge: {
      position: "absolute",
      zIndex: 2,
      elevation: 2,
      top: -HIRING_CORNER_OVERHANG,
      right: -moderateWidthScale(4),
      width: HIRING_CORNER_OVERHANG * 2,
      height: HIRING_CORNER_OVERHANG * 2,
      borderRadius: HIRING_CORNER_OVERHANG,
      backgroundColor: theme.orangeBrown,
      alignItems: "center",
      justifyContent: "center",
    },
    media: {
      backgroundColor: theme.emptyProfileImage,
      borderWidth: 1,
      borderColor: theme.borderLight,
    },
    content: {
      flex: 1,
      height: heightScale(110),
      justifyContent: "space-between",
    },
    typePill: {
      paddingVertical: moderateHeightScale(3),
    },
    middle: {
      flexShrink: 1,
      gap: moderateHeightScale(2),
    },
    title: {
      fontSize: fontSize.size14,
      lineHeight: fontSize.size14 * 1.22,
      fontFamily: fonts.fontBold,
      color: theme.white,
      includeFontPadding: false,
    },
    instructor: {
      fontSize: fontSize.size11,
      fontFamily: fonts.fontMedium,
      color: theme.white80,
      includeFontPadding: false,
    },
    whenRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(5),
    },
    whenText: {
      flexShrink: 1,
      fontSize: fontSize.size11,
      fontFamily: fonts.fontRegular,
      color: theme.white80,
      includeFontPadding: false,
    },
    bottomRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: moderateWidthScale(6),
    },
    price: {
      flexShrink: 1,
    },
    viewPill: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(2),
      backgroundColor: theme.background,
      paddingLeft: moderateWidthScale(10),
      paddingRight: moderateWidthScale(7),
      paddingVertical: moderateHeightScale(4),
      borderRadius: moderateWidthScale(999),
    },
    viewPillText: {
      fontSize: fontSize.size11,
      fontFamily: fonts.fontSemiBold,
      color: theme.darkGreen,
      includeFontPadding: false,
    },
  });
