import React, { memo, useMemo, useState } from "react";
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  moderateHeightScale,
  moderateWidthScale,
  widthScale,
} from "@/src/theme/dimensions";
import type { ProductCategory } from "@/src/types/marketplace";

type IconName = keyof typeof MaterialCommunityIcons.glyphMap;

type Props = {
  categories: ProductCategory[];
  /** Category name, or null for All. */
  selected: string | null;
  onSelect: (name: string | null) => void;
  loading?: boolean;
};

const CIRCLE = widthScale(56);
const CHIP_WIDTH = widthScale(76);
const LABEL_HEIGHT = moderateHeightScale(20);
const LABEL_GAP = moderateHeightScale(6);
const CHIP_HEIGHT = CIRCLE + LABEL_GAP + LABEL_HEIGHT;

// Product-style icons with their own colours, like the client sample
// (dark dryer, pink polish, green leaf). Admin manages the names, so
// unknown ones get a neutral shape.
const CATEGORY_ICONS: Record<string, { icon: IconName; color: string }> = {
  "hair styling": { icon: "hair-dryer", color: "#2B2B2B" },
  hair: { icon: "hair-dryer", color: "#2B2B2B" },
  "hair care": { icon: "bottle-tonic", color: "#1E8A80" },
  "beard care": { icon: "mustache", color: "#2B2B2B" },
  beard: { icon: "mustache", color: "#2B2B2B" },
  barber: { icon: "razor-double-edge", color: "#2B2B2B" },
  tools: { icon: "content-cut", color: "#2B2B2B" },
  nails: { icon: "bottle-tonic-plus", color: "#D4637A" },
  nail: { icon: "bottle-tonic-plus", color: "#D4637A" },
  skincare: { icon: "leaf", color: "#3E7B27" },
  "skin care": { icon: "leaf", color: "#3E7B27" },
  makeup: { icon: "lipstick", color: "#C2415D" },
  fragrance: { icon: "spray", color: "#8A5A9E" },
  "lashes & brows": { icon: "eye", color: "#2B2B2B" },
  "lashes and brows": { icon: "eye", color: "#2B2B2B" },
  "wigs & extensions": { icon: "face-woman-shimmer", color: "#8B5A2B" },
  "wigs and extensions": { icon: "face-woman-shimmer", color: "#8B5A2B" },
  other: { icon: "shape", color: "#BC6C25" },
};

export function getCategoryIcon(name: string): IconName {
  return CATEGORY_ICONS[name.trim().toLowerCase()]?.icon ?? "shape";
}

// Categories the app has no icon for (admin adds new ones any time, without
// an image) show their first letter, each in its own colour, so they don't
// all look the same.
const LETTER_COLORS = [
  "#1E8A80",
  "#D4637A",
  "#3E7B27",
  "#8A5A9E",
  "#C2415D",
  "#8B5A2B",
  "#BC6C25",
  "#2F6F9F",
];

type CategoryVisual =
  | { kind: "icon"; icon: IconName; color: string }
  | { kind: "letter"; letter: string; color: string };

function getCategoryVisual(name: string): CategoryVisual {
  const known = CATEGORY_ICONS[name.trim().toLowerCase()];
  if (known) return { kind: "icon", ...known };
  const trimmed = name.trim();
  const letter = (
    trimmed.match(/[A-Za-z0-9]/)?.[0] ??
    trimmed.charAt(0) ??
    "?"
  ).toUpperCase();
  let hash = 0;
  for (const ch of name.trim().toLowerCase()) {
    hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  }
  return {
    kind: "letter",
    letter,
    color: LETTER_COLORS[hash % LETTER_COLORS.length],
  };
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    scroll: {
      alignItems: "flex-start",
      paddingHorizontal: moderateWidthScale(12),
      paddingVertical: moderateHeightScale(4),
      gap: moderateWidthScale(2),
    },
    chip: {
      width: CHIP_WIDTH,
      height: CHIP_HEIGHT,
      alignItems: "center",
    },
    circle: {
      width: CIRCLE,
      height: CIRCLE,
      borderRadius: CIRCLE / 2,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.white,
      shadowColor: theme.darkGreen,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 5,
      elevation: 2,
    },
    // Selected = one filled green pill holding the icon and the label
    activePill: {
      width: CIRCLE + moderateWidthScale(6),
      height: CHIP_HEIGHT,
      borderRadius: (CIRCLE + moderateWidthScale(6)) / 2,
      backgroundColor: theme.marketGreen,
      alignItems: "center",
      justifyContent: "center",
      gap: moderateHeightScale(4),
      paddingHorizontal: moderateWidthScale(4),
    },
    image: {
      width: moderateWidthScale(28),
      height: moderateWidthScale(28),
      borderRadius: moderateWidthScale(14),
    },
    letter: {
      fontSize: fontSize.size22,
      fontFamily: fonts.fontBold,
      includeFontPadding: false,
    },
    letterActive: {
      fontSize: fontSize.size20,
      fontFamily: fonts.fontBold,
      color: theme.white,
      includeFontPadding: false,
    },
    imageActive: {
      width: moderateWidthScale(26),
      height: moderateWidthScale(26),
      borderRadius: moderateWidthScale(13),
    },
    label: {
      marginTop: LABEL_GAP,
      height: LABEL_HEIGHT,
      lineHeight: LABEL_HEIGHT,
      fontSize: fontSize.size13,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      textAlign: "center",
    },
    labelActive: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontBold,
      color: theme.white,
      textAlign: "center",
    },
    placeholderCircle: {
      width: CIRCLE,
      height: CIRCLE,
      borderRadius: CIRCLE / 2,
      backgroundColor: theme.lightGreen07,
    },
    placeholderLabel: {
      marginTop: LABEL_GAP,
      width: CHIP_WIDTH * 0.7,
      height: fontSize.size12,
      borderRadius: 4,
      backgroundColor: theme.lightGreen07,
    },
  });

function Chip({
  label,
  icon,
  iconColor,
  letter,
  imageUrl,
  active,
  onPress,
  styles,
  theme,
}: {
  label: string;
  icon: IconName;
  iconColor: string;
  /** Shown instead of the icon when the app has no icon for this name. */
  letter?: string;
  /** Admin-uploaded image; falls back to the icon when missing or broken. */
  imageUrl?: string | null;
  active: boolean;
  onPress: () => void;
  styles: ReturnType<typeof createStyles>;
  theme: Theme;
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const showImage = !!imageUrl && !imageFailed;
  return (
    <TouchableOpacity
      activeOpacity={0.75}
      onPress={onPress}
      style={styles.chip}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
    >
      {active ? (
        <View style={styles.activePill}>
          {showImage ? (
            <Image
              source={{ uri: imageUrl! }}
              style={styles.imageActive}
              resizeMode="cover"
              onError={() => setImageFailed(true)}
            />
          ) : letter ? (
            <Text style={styles.letterActive}>{letter}</Text>
          ) : (
            <MaterialCommunityIcons
              name={icon}
              size={moderateWidthScale(26)}
              color={theme.white}
            />
          )}
          <Text style={styles.labelActive} numberOfLines={1}>
            {label}
          </Text>
        </View>
      ) : (
        <>
          <View style={styles.circle}>
            {showImage ? (
              <Image
                source={{ uri: imageUrl! }}
                style={styles.image}
                resizeMode="cover"
                onError={() => setImageFailed(true)}
              />
            ) : letter ? (
              <Text style={[styles.letter, { color: iconColor }]}>
                {letter}
              </Text>
            ) : (
              <MaterialCommunityIcons
                name={icon}
                size={moderateWidthScale(28)}
                color={iconColor}
              />
            )}
          </View>
          <Text style={styles.label} numberOfLines={1}>
            {label}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
}

/** Round icon chips: All + every product category (client 11-05: no edge arrow). */
function CategoryChips({ categories, selected, onSelect, loading }: Props) {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);
  const { t } = useTranslation();

  // A chosen category stays visible even if a refresh no longer lists it
  const list = useMemo(() => {
    if (!selected || categories.some((c) => c.name === selected)) {
      return categories;
    }
    return [{ id: -1, name: selected, image_url: null }, ...categories];
  }, [categories, selected]);

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.scroll}
      keyboardShouldPersistTaps="handled"
    >
      <Chip
        label={t("all")}
        icon="view-grid-outline"
        iconColor={theme.darkGreen}
        active={selected == null}
        onPress={() => onSelect(null)}
        styles={styles}
        theme={theme}
      />
      {list.map((category) => {
        const visual = getCategoryVisual(category.name);
        return (
          <Chip
            key={`${category.id}-${category.name}`}
            label={category.name}
            icon={visual.kind === "icon" ? visual.icon : "shape"}
            letter={visual.kind === "letter" ? visual.letter : undefined}
            iconColor={visual.color}
            imageUrl={category.image_url}
            active={selected === category.name}
            onPress={() =>
              onSelect(selected === category.name ? null : category.name)
            }
            styles={styles}
            theme={theme}
          />
        );
      })}
      {loading && list.length === 0
        ? [0, 1, 2, 3].map((i) => (
            <View
              key={`placeholder-${i}`}
              style={styles.chip}
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
            >
              <View style={styles.placeholderCircle} />
              <View style={styles.placeholderLabel} />
            </View>
          ))
        : null}
    </ScrollView>
  );
}

export default memo(CategoryChips);
