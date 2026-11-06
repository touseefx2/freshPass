// Pro "Classes & Training" list card (Design 2): media on the left, type
// pill + title + date + seats on the right, listing chip in a footer row.

import React, { memo, useEffect, useMemo, useRef } from "react";
import {
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  iconScale,
  moderateHeightScale,
  moderateWidthScale,
} from "@/src/theme/dimensions";
import type { MasterClass } from "@/src/types/masterClass";
import {
  getClassTypeLabel,
  getClassWhenText,
  getListingBadge,
  getMissingCount,
  getSeatsEnrolledText,
} from "@/src/utils/masterClassHelpers";
import {
  ClassMediaThumb,
  ClassTypePill,
  MetaRow,
  StatusChip,
} from "@/src/components/masterClasses/parts";

const THUMB = moderateWidthScale(88);
const MENU_HIT = 44;

type ProListCardProps = {
  masterClass: MasterClass;
  onPress: (cls: MasterClass) => void;
  onMenu: (cls: MasterClass) => void;
  onRenew: (cls: MasterClass) => void;
};

function ProListCardBase({
  masterClass: cls,
  onPress,
  onMenu,
  onRenew,
}: ProListCardProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);

  const isDraft = cls.status === "draft";
  const badge = getListingBadge(cls);
  const when = getClassWhenText(cls);
  const seats = cls.capacity ? getSeatsEnrolledText(cls) : "";
  const missing = isDraft ? getMissingCount(cls) : 0;
  const canRenew = cls.status === "published" && !!cls.listing?.can_renew;
  const typeLabel = getClassTypeLabel(cls);
  const title = cls.title || t("mcStatusDraft");

  const a11yLabel = [
    typeLabel,
    title,
    when,
    seats,
    badge.label,
    missing > 0 ? t("mcStepsLeftToPublish", { count: missing }) : "",
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <View style={styles.card}>
      <TouchableOpacity
        activeOpacity={0.75}
        onPress={() => onPress(cls)}
        style={styles.main}
        accessibilityRole="button"
        accessibilityLabel={a11yLabel}
        accessibilityHint={t("mcViewClass")}
      >
        <ClassMediaThumb media={cls.media} size={THUMB} />
        <View style={styles.body}>
          <ClassTypePill label={cls.label} type={cls.type} />
          <Text style={styles.title} numberOfLines={2}>
            {title}
          </Text>
          <MetaRow
            icon="calendar-outline"
            text={when}
            color={cls.date ? undefined : theme.lightGreen5}
          />
          {seats ? <MetaRow icon="people-outline" text={seats} /> : null}
        </View>
      </TouchableOpacity>

      <View style={styles.footer}>
        <View style={styles.footerLeft}>
          <StatusChip meta={badge} />
          {missing > 0 ? (
            <View style={styles.missingRow}>
              <Ionicons
                name="list-outline"
                size={iconScale(13)}
                color={theme.orangeBrownText}
              />
              <Text style={styles.missingText} numberOfLines={1}>
                {t("mcStepsLeftToPublish", { count: missing })}
              </Text>
            </View>
          ) : null}
        </View>
        {canRenew ? (
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => onRenew(cls)}
            style={styles.renewButton}
            hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
            accessibilityRole="button"
            accessibilityLabel={`${t("mcRenewListing")}, ${title}`}
          >
            <Ionicons
              name="refresh"
              size={iconScale(15)}
              color={theme.orangeBrownText}
            />
            <Text style={styles.renewText}>{t("mcRenew")}</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Over the card so the main tap target stays one accessible element */}
      <TouchableOpacity
        activeOpacity={0.6}
        onPress={() => onMenu(cls)}
        style={styles.menuButton}
        accessibilityRole="button"
        accessibilityLabel={`${t("mcMoreActions")}, ${title}`}
      >
        <Ionicons
          name="ellipsis-vertical"
          size={iconScale(18)}
          color={theme.darkGreen}
        />
      </TouchableOpacity>
    </View>
  );
}

export const ProListCard = memo(ProListCardBase);
export default ProListCard;

// ── Loading placeholder (same footprint, no layout jump) ────────────

export function ProListCardSkeleton() {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);
  const pulse = useRef(new Animated.Value(0.55)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0.55,
          duration: 700,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return (
    <View
      style={styles.card}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Animated.View style={[styles.main, { opacity: pulse }]}>
        <View style={[styles.skelBlock, styles.skelThumb]} />
        <View style={styles.body}>
          <View style={[styles.skelBlock, styles.skelPill]} />
          <View style={[styles.skelBlock, styles.skelLineLong]} />
          <View style={[styles.skelBlock, styles.skelLineShort]} />
          <View style={[styles.skelBlock, styles.skelLineShort]} />
        </View>
      </Animated.View>
      <Animated.View style={[styles.footer, { opacity: pulse }]}>
        <View style={[styles.skelBlock, styles.skelChip]} />
      </Animated.View>
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    card: {
      backgroundColor: theme.surfaceRaised,
      borderRadius: moderateWidthScale(14),
      borderWidth: 1,
      borderColor: theme.borderLight,
      shadowColor: theme.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.07,
      shadowRadius: 8,
      elevation: 2,
    },
    main: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: moderateWidthScale(12),
      padding: moderateWidthScale(12),
      paddingBottom: moderateHeightScale(10),
    },
    body: {
      flex: 1,
      gap: moderateHeightScale(5),
      // Room for the ⋮ button on the pill row
      paddingRight: moderateWidthScale(26),
      minHeight: THUMB,
    },
    title: {
      fontSize: fontSize.size16,
      lineHeight: fontSize.size16 * 1.3,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    footer: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: moderateWidthScale(8),
      minHeight: moderateHeightScale(44),
      paddingHorizontal: moderateWidthScale(12),
      paddingVertical: moderateHeightScale(6),
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.borderLight,
    },
    footerLeft: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      flexWrap: "wrap",
      gap: moderateWidthScale(8),
    },
    missingRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(4),
      flexShrink: 1,
    },
    missingText: {
      flexShrink: 1,
      fontSize: fontSize.size12,
      fontFamily: fonts.fontMedium,
      color: theme.orangeBrownText,
    },
    renewButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(4),
      minHeight: 36,
      paddingHorizontal: moderateWidthScale(12),
      borderRadius: moderateWidthScale(999),
      borderWidth: 1,
      borderColor: theme.orangeBrown,
      backgroundColor: theme.tilePeach,
    },
    renewText: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontBold,
      color: theme.orangeBrownText,
    },
    menuButton: {
      position: "absolute",
      top: moderateHeightScale(2),
      right: 0,
      width: MENU_HIT,
      height: MENU_HIT,
      alignItems: "center",
      justifyContent: "center",
    },

    // Skeleton
    skelBlock: {
      backgroundColor: theme.lightGreen07,
      borderRadius: moderateWidthScale(6),
    },
    skelThumb: {
      width: THUMB,
      height: THUMB,
      borderRadius: moderateWidthScale(10),
    },
    skelPill: {
      width: moderateWidthScale(84),
      height: moderateHeightScale(18),
      borderRadius: moderateWidthScale(999),
    },
    skelLineLong: {
      width: "85%",
      height: moderateHeightScale(16),
    },
    skelLineShort: {
      width: "55%",
      height: moderateHeightScale(13),
    },
    skelChip: {
      width: moderateWidthScale(110),
      height: moderateHeightScale(20),
      borderRadius: moderateWidthScale(999),
    },
  });
