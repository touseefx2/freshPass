// Customer class detail (app/(main)/classes/detail.tsx): hero media,
// instructor row, info grid, location / online card and the loading skeleton.

import React, { useEffect, useMemo, useRef } from "react";
import {
  Alert,
  Animated,
  Linking,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
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
import AppImage from "@/src/components/AppImage";
import type { MasterClass } from "@/src/types/masterClass";
import {
  formatClassDate,
  formatClassTime,
  formatDuration,
  getBusinessCategoryName,
  getClassAddress,
  getFormatLabel,
  getInitials,
  getSeatsLeft,
  getSeatsLeftText,
  isVideoClass,
} from "@/src/utils/masterClassHelpers";
import { ClassMediaThumb, IoniconName, SectionCard } from "./parts";

/** Horizontal padding of the detail screen content. */
export const CLASS_DETAIL_GUTTER = moderateWidthScale(16);

const useStyles = () => {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);
  return { theme, styles };
};

// ── Hero ────────────────────────────────────────────────────────────

type HeroProps = {
  masterClass: MasterClass;
  /** Video classes: opens the full-screen player. */
  onPlay?: () => void;
};

/** 16:9 rounded media card; videos show a play button that opens the player. */
export function ClassDetailHero({ masterClass, onPlay }: HeroProps) {
  const { t } = useTranslation();
  const { styles } = useStyles();
  const { width } = useWindowDimensions();
  const heroWidth = width - CLASS_DETAIL_GUTTER * 2;
  const heroHeight = Math.round((heroWidth * 9) / 16);
  const video = isVideoClass(masterClass);
  const canPlay = video && !!masterClass.media?.url && !!onPlay;

  const thumb = (
    <ClassMediaThumb
      media={masterClass.media}
      width={heroWidth}
      height={heroHeight}
      radius={moderateWidthScale(16)}
      playSize={iconScale(26)}
    />
  );

  if (!canPlay) {
    return (
      <View
        style={styles.hero}
        accessible
        accessibilityRole="image"
        accessibilityLabel={masterClass.title}
      >
        {thumb}
      </View>
    );
  }
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPlay}
      style={styles.hero}
      accessibilityRole="button"
      accessibilityLabel={t("mcPlayClassVideo")}
    >
      {thumb}
    </TouchableOpacity>
  );
}

// ── Instructor ──────────────────────────────────────────────────────

type InstructorProps = {
  masterClass: MasterClass;
  onPress?: () => void;
};

/** Business logo + instructor name, business title and category. */
export function ClassDetailInstructor({ masterClass, onPress }: InstructorProps) {
  const { t } = useTranslation();
  const { theme, styles } = useStyles();
  const business = masterClass.business;
  if (!business) return null;

  const name = business.instructor_name || business.title;
  const category = getBusinessCategoryName(business.category);
  const secondary = [
    business.instructor_name ? business.title : "",
    category,
  ]
    .filter(Boolean)
    .join(" · ");

  const avatarFallback = (
    <View style={[styles.avatar, styles.avatarFallback]}>
      <Text style={styles.avatarInitials}>{getInitials(name)}</Text>
    </View>
  );

  const body = (
    <>
      <View style={styles.avatar}>
        <AppImage
          uri={business.image_url}
          style={styles.avatarImage}
          contentFit="cover"
          fallback={avatarFallback}
        />
      </View>
      <View style={styles.instructorBody}>
        <Text style={styles.instructorEyebrow}>{t("mcInstructor")}</Text>
        <Text style={styles.instructorName} numberOfLines={1}>
          {name}
        </Text>
        {secondary ? (
          <Text style={styles.instructorSecondary} numberOfLines={1}>
            {secondary}
          </Text>
        ) : null}
      </View>
      {onPress ? (
        <Ionicons
          name="chevron-forward"
          size={iconScale(20)}
          color={theme.lightGreen5}
        />
      ) : null}
    </>
  );

  const a11y = [t("mcInstructor"), name, secondary].filter(Boolean).join(", ");

  if (!onPress) {
    return (
      <View style={styles.instructorCard} accessible accessibilityLabel={a11y}>
        {body}
      </View>
    );
  }
  return (
    <TouchableOpacity
      activeOpacity={0.75}
      onPress={onPress}
      style={styles.instructorCard}
      accessibilityRole="button"
      accessibilityLabel={a11y}
      accessibilityHint={t("mcOpenBusinessProfile")}
    >
      {body}
    </TouchableOpacity>
  );
}

// ── Info grid ───────────────────────────────────────────────────────

type InfoTileProps = {
  icon: IoniconName;
  label: string;
  value: string;
  sub?: string;
  /** Value colour (e.g. "Full" in orange). */
  valueColor?: string;
};

function InfoTile({ icon, label, value, sub, valueColor }: InfoTileProps) {
  const { theme, styles } = useStyles();
  return (
    <View
      style={styles.tile}
      accessible
      accessibilityLabel={[label, value, sub].filter(Boolean).join(", ")}
    >
      <View style={styles.tileIcon}>
        <Ionicons name={icon} size={iconScale(17)} color={theme.darkGreen} />
      </View>
      <Text style={styles.tileLabel} numberOfLines={1}>
        {label}
      </Text>
      <Text
        style={[styles.tileValue, valueColor ? { color: valueColor } : null]}
        numberOfLines={2}
      >
        {value}
      </Text>
      {sub ? (
        <Text style={styles.tileSub} numberOfLines={1}>
          {sub}
        </Text>
      ) : null}
    </View>
  );
}

/** Date · Duration · Format · Seats left, two per row. */
export function ClassDetailInfoGrid({ masterClass }: { masterClass: MasterClass }) {
  const { t } = useTranslation();
  const { theme, styles } = useStyles();
  const seatsLeft = getSeatsLeft(masterClass);
  const full = seatsLeft === 0;
  const online = masterClass.format === "online";

  return (
    <View style={styles.grid}>
      <InfoTile
        icon="calendar-outline"
        label={t("mcDate")}
        value={formatClassDate(masterClass.date) || t("mcNoDateYet")}
        sub={formatClassTime(masterClass.time)}
      />
      <InfoTile
        icon="time-outline"
        label={t("mcDuration")}
        value={formatDuration(masterClass.duration_minutes) || "—"}
      />
      <InfoTile
        icon={online ? "videocam-outline" : "location-outline"}
        label={t("mcFormat")}
        value={getFormatLabel(masterClass.format)}
      />
      <InfoTile
        icon="people-outline"
        label={t("mcSeats")}
        value={getSeatsLeftText(masterClass) || "—"}
        valueColor={full ? theme.orangeBrownText : undefined}
      />
    </View>
  );
}

// ── Location / online ───────────────────────────────────────────────

async function openInMaps(address: string, lat: number | null, lng: number | null) {
  const query = encodeURIComponent(address);
  const hasCoords = lat != null && lng != null;
  const url =
    Platform.OS === "ios"
      ? `http://maps.apple.com/?q=${query}${hasCoords ? `&ll=${lat},${lng}` : ""}`
      : `https://www.google.com/maps/search/?api=1&query=${
          hasCoords ? `${lat},${lng}` : query
        }`;
  await Linking.openURL(url);
}

type LocationCardProps = {
  masterClass: MasterClass;
};

/** In person: address + Open in Maps. Online: link (paid seat) or "shared after enrolling". */
export function ClassDetailLocationCard({ masterClass }: LocationCardProps) {
  const { t } = useTranslation();
  const { theme, styles } = useStyles();
  const online = masterClass.format === "online";
  const address = getClassAddress(masterClass);

  const onMaps = async () => {
    if (!address) return;
    try {
      await openInMaps(
        address,
        masterClass.location?.latitude ?? null,
        masterClass.location?.longitude ?? null,
      );
    } catch {
      Alert.alert(t("error"), t("unableToOpenMaps"));
    }
  };

  const onJoin = async () => {
    const url = masterClass.meeting_url;
    if (!url) return;
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert(t("error"), t("mcSomethingWrong"));
    }
  };

  if (online) {
    const link = masterClass.meeting_url;
    return (
      <SectionCard title={t("mcFormatOnline")} icon="videocam-outline">
        {link ? (
          <>
            <Text style={styles.bodyMuted}>{t("mcMeetingLink")}</Text>
            <Text style={styles.linkText} numberOfLines={2} selectable>
              {link}
            </Text>
            <TouchableOpacity
              activeOpacity={0.75}
              onPress={onJoin}
              style={styles.outlineButton}
              accessibilityRole="link"
              accessibilityLabel={t("mcJoinClass")}
            >
              <Ionicons
                name="videocam-outline"
                size={iconScale(18)}
                color={theme.darkGreen}
              />
              <Text style={styles.outlineButtonText}>{t("mcJoinClass")}</Text>
            </TouchableOpacity>
          </>
        ) : (
          <View style={styles.inlineNote}>
            <Ionicons
              name="lock-closed-outline"
              size={iconScale(16)}
              color={theme.darkGreenLight}
            />
            <Text style={styles.inlineNoteText}>{t("mcOnlineLinkAfterEnroll")}</Text>
          </View>
        )}
      </SectionCard>
    );
  }

  if (!address) return null;
  return (
    <SectionCard title={t("mcLocation")} icon="location-outline">
      <Text style={styles.bodyText} selectable>
        {address}
      </Text>
      <TouchableOpacity
        activeOpacity={0.75}
        onPress={onMaps}
        style={styles.outlineButton}
        accessibilityRole="link"
        accessibilityLabel={`${t("mcOpenInMaps")}, ${address}`}
      >
        <Ionicons name="navigate-outline" size={iconScale(18)} color={theme.darkGreen} />
        <Text style={styles.outlineButtonText}>{t("mcOpenInMaps")}</Text>
      </TouchableOpacity>
    </SectionCard>
  );
}

// ── Text section ────────────────────────────────────────────────────

type TextSectionProps = {
  title: string;
  icon: IoniconName;
  text: string | null | undefined;
};

export function ClassDetailTextSection({ title, icon, text }: TextSectionProps) {
  const { styles } = useStyles();
  if (!text) return null;
  return (
    <SectionCard title={title} icon={icon}>
      <Text style={styles.bodyText}>{text}</Text>
    </SectionCard>
  );
}

// ── Skeleton ────────────────────────────────────────────────────────

/** Same footprint as the loaded screen so nothing jumps when data lands. */
export function ClassDetailSkeleton() {
  const { t } = useTranslation();
  const { styles } = useStyles();
  const { width } = useWindowDimensions();
  const pulse = useRef(new Animated.Value(0.55)).current;
  const heroHeight = Math.round(((width - CLASS_DETAIL_GUTTER * 2) * 9) / 16);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.55, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return (
    <Animated.View
      style={[styles.skeleton, { opacity: pulse }]}
      accessibilityRole="progressbar"
      accessibilityLabel={t("loading")}
    >
      <View style={[styles.skBlock, { height: heroHeight, borderRadius: moderateWidthScale(16) }]} />
      <View style={[styles.skBlock, styles.skPill]} />
      <View style={[styles.skBlock, styles.skTitle]} />
      <View style={[styles.skBlock, styles.skTitleShort]} />
      <View style={[styles.skBlock, styles.skCard]} />
      <View style={styles.grid}>
        {[0, 1, 2, 3].map((i) => (
          <View key={i} style={[styles.skBlock, styles.skTile]} />
        ))}
      </View>
      <View style={[styles.skBlock, styles.skCardTall]} />
    </Animated.View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    hero: {
      borderRadius: moderateWidthScale(16),
      overflow: "hidden",
      backgroundColor: theme.lightGreen07,
    },

    // Instructor
    instructorCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(12),
      minHeight: moderateHeightScale(64),
      paddingHorizontal: moderateWidthScale(14),
      paddingVertical: moderateHeightScale(12),
      borderRadius: moderateWidthScale(14),
      borderWidth: 1,
      borderColor: theme.borderLight,
      backgroundColor: theme.surfaceRaised,
      shadowColor: theme.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 6,
      elevation: 1,
    },
    avatar: {
      width: moderateWidthScale(46),
      height: moderateWidthScale(46),
      borderRadius: moderateWidthScale(23),
      overflow: "hidden",
      backgroundColor: theme.lightGreen07,
    },
    avatarImage: {
      width: "100%",
      height: "100%",
    },
    avatarFallback: {
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.darkGreen,
    },
    avatarInitials: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontBold,
      color: theme.white,
    },
    instructorBody: {
      flex: 1,
      gap: moderateHeightScale(1),
    },
    instructorEyebrow: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontMedium,
      color: theme.lightGreen,
      textTransform: "uppercase",
      letterSpacing: 0.4,
    },
    instructorName: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    instructorSecondary: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: theme.textMuted,
    },

    // Info grid
    grid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: moderateWidthScale(10),
    },
    tile: {
      flexBasis: "46%",
      flexGrow: 1,
      minHeight: moderateHeightScale(96),
      padding: moderateWidthScale(12),
      borderRadius: moderateWidthScale(14),
      borderWidth: 1,
      borderColor: theme.borderLight,
      backgroundColor: theme.surfaceRaised,
      gap: moderateHeightScale(2),
    },
    tileIcon: {
      width: moderateWidthScale(32),
      height: moderateWidthScale(32),
      borderRadius: moderateWidthScale(10),
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.tileMint,
      marginBottom: moderateHeightScale(6),
    },
    tileLabel: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontMedium,
      color: theme.lightGreen,
    },
    tileValue: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    tileSub: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: theme.textMuted,
    },

    // Text bits
    bodyText: {
      fontSize: fontSize.size14,
      lineHeight: fontSize.size14 * 1.5,
      fontFamily: fonts.fontRegular,
      color: theme.darkGreen,
    },
    bodyMuted: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontMedium,
      color: theme.lightGreen,
    },
    linkText: {
      marginTop: moderateHeightScale(2),
      fontSize: fontSize.size14,
      fontFamily: fonts.fontMedium,
      color: theme.marketGreen,
      textDecorationLine: "underline",
    },
    inlineNote: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(8),
    },
    inlineNoteText: {
      flex: 1,
      fontSize: fontSize.size14,
      lineHeight: fontSize.size14 * 1.4,
      fontFamily: fonts.fontRegular,
      color: theme.textMuted,
    },
    outlineButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      alignSelf: "flex-start",
      gap: moderateWidthScale(6),
      minHeight: moderateHeightScale(44),
      marginTop: moderateHeightScale(12),
      paddingHorizontal: moderateWidthScale(16),
      borderRadius: moderateWidthScale(12),
      borderWidth: 1.5,
      borderColor: theme.darkGreen,
    },
    outlineButtonText: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },

    // Skeleton
    skeleton: {
      paddingHorizontal: CLASS_DETAIL_GUTTER,
      paddingTop: moderateHeightScale(16),
      gap: moderateHeightScale(12),
    },
    skBlock: {
      backgroundColor: theme.lightGreen07,
      borderRadius: moderateWidthScale(10),
    },
    skPill: {
      width: moderateWidthScale(110),
      height: moderateHeightScale(24),
      borderRadius: moderateWidthScale(999),
    },
    skTitle: {
      width: "88%",
      height: moderateHeightScale(24),
    },
    skTitleShort: {
      width: "55%",
      height: moderateHeightScale(18),
    },
    skCard: {
      height: moderateHeightScale(68),
      borderRadius: moderateWidthScale(14),
    },
    skTile: {
      flexBasis: "46%",
      flexGrow: 1,
      height: moderateHeightScale(96),
      borderRadius: moderateWidthScale(14),
    },
    skCardTall: {
      height: moderateHeightScale(120),
      borderRadius: moderateWidthScale(14),
    },
  });
