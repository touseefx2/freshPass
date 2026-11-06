// Pieces of the "Pay $50 & Publish / Renew" screen (Design 4):
// promotion card, missing-fields card, and the full-screen
// confirming / pending / success states.

import React, { useMemo } from "react";
import {
  ActivityIndicator,
  StyleProp,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  iconScale,
  moderateHeightScale,
  moderateWidthScale,
} from "@/src/theme/dimensions";
import { formatClassPrice } from "@/src/utils/masterClassHelpers";
import { IoniconName, SectionCard } from "./parts";

const usePublishStyles = () => {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);
  return { theme, styles };
};

// ── Hero (graduation cap + title + subtitle) ───────────────────────

export function PublishHero({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  const { theme, styles } = usePublishStyles();
  return (
    <View style={styles.hero}>
      <View style={styles.heroIconWrap} accessible={false}>
        <MaterialCommunityIcons
          name="school-outline"
          size={iconScale(46)}
          color={theme.darkGreen}
        />
        {/* Small orange tassel accent */}
        <View style={styles.heroAccent}>
          <MaterialCommunityIcons
            name="star-four-points"
            size={iconScale(11)}
            color={theme.white}
          />
        </View>
      </View>
      <Text style={styles.heroTitle} accessibilityRole="header">
        {title}
      </Text>
      <Text style={styles.heroSubtitle}>{subtitle}</Text>
    </View>
  );
}

// ── Promotion card ($50 / 30 days + benefits) ──────────────────────

type PublishPromotionCardProps = {
  fee: number;
  days: number;
  /** Renew while still live: "Adds 30 days to your current end date (Dec 5)". */
  extendsFrom?: string | null;
  style?: StyleProp<ViewStyle>;
};

export function PublishPromotionCard({
  fee,
  days,
  extendsFrom,
  style,
}: PublishPromotionCardProps) {
  const { t } = useTranslation();
  const { theme, styles } = usePublishStyles();
  const feeText = formatClassPrice(fee);
  const benefits = [
    t("mcBenefitLiveDays", { days }),
    t("mcBenefitFeatured"),
    t("mcBenefitVisible"),
    t("mcBenefitGrow"),
  ];

  return (
    <SectionCard highlighted style={[styles.promoCard, style]}>
      <View style={styles.ribbon} accessibilityLabel={t("mcPromotionDays", { days })}>
        <Text style={styles.ribbonText}>{t("mcPromotionDays", { days })}</Text>
      </View>

      <View style={styles.promoHeader}>
        <View style={styles.promoIcon}>
          <Ionicons
            name="megaphone-outline"
            size={iconScale(22)}
            color={theme.orangeBrownText}
          />
        </View>
        <View style={styles.promoHeaderText}>
          <Text style={styles.promoName} accessibilityRole="header">
            {t("mcPromotionName")}
          </Text>
          <Text style={styles.promoDesc}>{t("mcPromotionDesc")}</Text>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.promoBody}>
        <View
          style={styles.feeCol}
          accessible
          accessibilityLabel={`${feeText}, ${t("mcOneTimeFee")}`}
        >
          <Text
            style={styles.feeText}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.6}
          >
            {feeText}
          </Text>
          <Text style={styles.feeCaption}>{t("mcOneTimeFee")}</Text>
        </View>
        <View style={styles.vDivider} />
        <View style={styles.benefits}>
          {benefits.map((text) => (
            <View key={text} style={styles.benefitRow}>
              <Ionicons
                name="checkmark-circle"
                size={iconScale(17)}
                color={theme.successGreen}
                style={styles.benefitIcon}
              />
              <Text style={styles.benefitText}>{text}</Text>
            </View>
          ))}
        </View>
      </View>

      {extendsFrom ? (
        <View style={styles.extendRow}>
          <Ionicons
            name="calendar-outline"
            size={iconScale(16)}
            color={theme.orangeBrownText}
          />
          <Text style={styles.extendText}>
            {t("mcRenewAddsDays", { days, date: extendsFrom })}
          </Text>
        </View>
      ) : null}
    </SectionCard>
  );
}

// ── Missing fields card (422 / draft `missing`) ────────────────────

export function PublishMissingCard({
  messages,
  onBackToEdit,
}: {
  messages: string[];
  onBackToEdit: () => void;
}) {
  const { t } = useTranslation();
  const { theme, styles } = usePublishStyles();
  return (
    <View style={styles.missingCard} accessibilityRole="alert">
      <View style={styles.missingHeader}>
        <Ionicons
          name="alert-circle-outline"
          size={iconScale(22)}
          color={theme.orangeBrownText}
        />
        <Text style={styles.missingTitle} accessibilityRole="header">
          {t("mcMissingToPublishTitle")}
        </Text>
      </View>
      <Text style={styles.missingText}>{t("mcMissingToPublishText")}</Text>
      <View style={styles.missingList}>
        {messages.map((msg) => (
          <View key={msg} style={styles.missingRow}>
            <View style={styles.bullet} />
            <Text style={styles.missingItem}>{msg}</Text>
          </View>
        ))}
      </View>
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={onBackToEdit}
        style={styles.missingButton}
        accessibilityRole="button"
        accessibilityLabel={t("mcBackToEdit")}
      >
        <Ionicons name="create-outline" size={iconScale(18)} color={theme.darkGreen} />
        <Text style={styles.missingButtonText}>{t("mcBackToEdit")}</Text>
      </TouchableOpacity>
    </View>
  );
}

// ── Stripe Connect needed (422 `stripe`) ───────────────────────────

/** Connect isn't done (or was revoked): fixed in Stripe, not in the form. */
export function PublishStripeCard({
  message,
  onConnect,
}: {
  message?: string | null;
  onConnect: () => void;
}) {
  const { t } = useTranslation();
  const { theme, styles } = usePublishStyles();
  return (
    <View style={styles.missingCard} accessibilityRole="alert">
      <View style={styles.missingHeader}>
        <Ionicons name="card-outline" size={iconScale(22)} color={theme.orangeBrownText} />
        <Text style={styles.missingTitle} accessibilityRole="header">
          {t("mcConnectStripeTitle")}
        </Text>
      </View>
      <Text style={styles.missingText}>{message || t("mcConnectStripeText")}</Text>
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={onConnect}
        style={styles.missingButton}
        accessibilityRole="button"
        accessibilityLabel={t("mcConnectStripe")}
      >
        <Ionicons name="arrow-forward" size={iconScale(18)} color={theme.darkGreen} />
        <Text style={styles.missingButtonText}>{t("mcConnectStripe")}</Text>
      </TouchableOpacity>
    </View>
  );
}

// ── Inline error (payment couldn't start) ──────────────────────────

export function PublishErrorNotice({ message }: { message: string }) {
  const { theme, styles } = usePublishStyles();
  return (
    <View style={styles.errorBox} accessibilityRole="alert" accessibilityLiveRegion="polite">
      <Ionicons
        name="alert-circle"
        size={iconScale(18)}
        color={theme.red}
        style={styles.errorIcon}
      />
      <Text style={styles.errorText}>{message}</Text>
    </View>
  );
}

// ── Stripe footnote ────────────────────────────────────────────────

export function PublishSecureNote() {
  const { t } = useTranslation();
  const { theme, styles } = usePublishStyles();
  return (
    <View
      style={styles.secureRow}
      accessible
      accessibilityLabel={`${t("mcSecurePayment")} ${t("mcStripe")}`}
    >
      <Ionicons name="lock-closed" size={iconScale(13)} color={theme.textMuted} />
      <Text style={styles.secureText}>
        {t("mcSecurePayment")}{" "}
        <Text style={styles.stripeWord}>{t("mcStripe")}</Text>
      </Text>
    </View>
  );
}

// ── Buttons ────────────────────────────────────────────────────────

type PublishButtonProps = {
  label: string;
  onPress: () => void;
  variant?: "primary" | "outline" | "text";
  icon?: IoniconName;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function PublishButton({
  label,
  onPress,
  variant = "primary",
  icon,
  loading = false,
  disabled = false,
  style,
}: PublishButtonProps) {
  const { theme, styles } = usePublishStyles();
  const fg = variant === "primary" ? theme.white : theme.darkGreen;
  const inactive = disabled || loading;
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      disabled={inactive}
      style={[
        styles.button,
        variant === "primary" && styles.buttonPrimary,
        variant === "outline" && styles.buttonOutline,
        variant === "text" && styles.buttonText,
        disabled && !loading && styles.buttonDisabled,
        style,
      ]}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: inactive, busy: loading }}
    >
      {loading ? (
        <ActivityIndicator size="small" color={fg} />
      ) : icon ? (
        <Ionicons name={icon} size={iconScale(19)} color={fg} />
      ) : null}
      <Text
        style={[styles.buttonLabel, { color: fg }, variant === "text" && styles.buttonLabelText]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

// ── Full-screen states ─────────────────────────────────────────────

type PublishStatusViewProps = {
  kind: "confirming" | "pending" | "success";
  title: string;
  message?: string;
  /** Extra line under the message (receipt note on success). */
  note?: string;
  noteIcon?: IoniconName;
  /** Preview of the class (success). */
  children?: React.ReactNode;
};

export function PublishStatusView({
  kind,
  title,
  message,
  note,
  noteIcon = "mail-outline",
  children,
}: PublishStatusViewProps) {
  const { theme, styles } = usePublishStyles();
  return (
    <View style={styles.status}>
      {kind === "confirming" ? (
        <View style={[styles.statusRing, styles.statusRingNeutral]}>
          <ActivityIndicator size="large" color={theme.darkGreen} />
        </View>
      ) : kind === "pending" ? (
        <View style={[styles.statusRing, styles.statusRingWarm]}>
          <View style={[styles.statusDisc, { backgroundColor: theme.orangeBrown }]}>
            <Ionicons name="time-outline" size={iconScale(40)} color={theme.white} />
          </View>
        </View>
      ) : (
        <View style={[styles.statusRing, styles.statusRingSuccess]}>
          <View style={[styles.statusDisc, { backgroundColor: theme.successGreen }]}>
            <Ionicons name="checkmark" size={iconScale(46)} color={theme.white} />
          </View>
        </View>
      )}
      <Text
        style={styles.statusTitle}
        accessibilityRole="header"
        accessibilityLiveRegion="polite"
      >
        {title}
      </Text>
      {message ? <Text style={styles.statusMessage}>{message}</Text> : null}
      {children ? <View style={styles.statusChildren}>{children}</View> : null}
      {note ? (
        <View style={styles.statusNote}>
          <Ionicons name={noteIcon} size={iconScale(15)} color={theme.textMuted} />
          <Text style={styles.statusNoteText}>{note}</Text>
        </View>
      ) : null}
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    // Hero
    hero: {
      alignItems: "center",
      paddingHorizontal: moderateWidthScale(8),
    },
    heroIconWrap: {
      width: moderateWidthScale(72),
      height: moderateWidthScale(72),
      borderRadius: moderateWidthScale(36),
      backgroundColor: theme.lightGreen07,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: moderateHeightScale(12),
    },
    heroAccent: {
      position: "absolute",
      right: moderateWidthScale(2),
      bottom: moderateWidthScale(4),
      width: moderateWidthScale(20),
      height: moderateWidthScale(20),
      borderRadius: moderateWidthScale(10),
      backgroundColor: theme.orangeBrown,
      borderWidth: 2,
      borderColor: theme.background,
      alignItems: "center",
      justifyContent: "center",
    },
    heroTitle: {
      fontSize: fontSize.size22,
      lineHeight: fontSize.size22 * 1.25,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      textAlign: "center",
    },
    heroSubtitle: {
      marginTop: moderateHeightScale(6),
      fontSize: fontSize.size14,
      lineHeight: fontSize.size14 * 1.45,
      fontFamily: fonts.fontRegular,
      color: theme.textMuted,
      textAlign: "center",
      maxWidth: moderateWidthScale(320),
    },

    // Promotion card
    promoCard: {
      paddingTop: moderateHeightScale(18),
    },
    ribbon: {
      position: "absolute",
      top: -1.5,
      right: -1.5,
      backgroundColor: theme.orangeBrown,
      paddingHorizontal: moderateWidthScale(12),
      paddingVertical: moderateHeightScale(5),
      borderTopRightRadius: moderateWidthScale(14),
      borderBottomLeftRadius: moderateWidthScale(12),
    },
    ribbonText: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    promoHeader: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: moderateWidthScale(12),
      paddingRight: moderateWidthScale(60),
    },
    promoIcon: {
      width: moderateWidthScale(42),
      height: moderateWidthScale(42),
      borderRadius: moderateWidthScale(21),
      backgroundColor: theme.tilePeach,
      alignItems: "center",
      justifyContent: "center",
    },
    promoHeaderText: {
      flex: 1,
      gap: moderateHeightScale(4),
    },
    promoName: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    promoDesc: {
      fontSize: fontSize.size13,
      lineHeight: fontSize.size13 * 1.4,
      fontFamily: fonts.fontRegular,
      color: theme.textMuted,
    },
    divider: {
      height: 1,
      backgroundColor: theme.borderLight,
      marginVertical: moderateHeightScale(14),
    },
    promoBody: {
      flexDirection: "row",
      alignItems: "center",
    },
    feeCol: {
      width: moderateWidthScale(92),
      alignItems: "center",
    },
    feeText: {
      fontSize: fontSize.size40,
      fontFamily: fonts.fontExtraBold,
      color: theme.darkGreen,
      fontVariant: ["tabular-nums"],
    },
    feeCaption: {
      marginTop: moderateHeightScale(2),
      fontSize: fontSize.size12,
      fontFamily: fonts.fontMedium,
      color: theme.textMuted,
      textAlign: "center",
    },
    vDivider: {
      width: 1,
      alignSelf: "stretch",
      backgroundColor: theme.borderLight,
      marginHorizontal: moderateWidthScale(12),
    },
    benefits: {
      flex: 1,
      gap: moderateHeightScale(8),
    },
    benefitRow: {
      flexDirection: "row",
      alignItems: "flex-start",
    },
    benefitIcon: {
      marginRight: moderateWidthScale(7),
      marginTop: moderateHeightScale(1),
    },
    benefitText: {
      flex: 1,
      fontSize: fontSize.size13,
      lineHeight: fontSize.size13 * 1.4,
      fontFamily: fonts.fontRegular,
      color: theme.darkGreen,
    },
    extendRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(8),
      marginTop: moderateHeightScale(14),
      paddingVertical: moderateHeightScale(10),
      paddingHorizontal: moderateWidthScale(12),
      borderRadius: moderateWidthScale(10),
      backgroundColor: theme.tilePeach,
    },
    extendText: {
      flex: 1,
      fontSize: fontSize.size13,
      lineHeight: fontSize.size13 * 1.4,
      fontFamily: fonts.fontMedium,
      color: theme.orangeBrownText,
    },

    // Missing card
    missingCard: {
      backgroundColor: theme.noticeCream,
      borderColor: theme.goldBorder,
      borderWidth: 1,
      borderRadius: moderateWidthScale(14),
      padding: moderateWidthScale(16),
    },
    missingHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(8),
    },
    missingTitle: {
      flex: 1,
      fontSize: fontSize.size16,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    missingText: {
      marginTop: moderateHeightScale(6),
      fontSize: fontSize.size13,
      lineHeight: fontSize.size13 * 1.4,
      fontFamily: fonts.fontRegular,
      color: theme.textMuted,
    },
    missingList: {
      marginTop: moderateHeightScale(10),
      gap: moderateHeightScale(6),
    },
    missingRow: {
      flexDirection: "row",
      alignItems: "flex-start",
    },
    bullet: {
      width: moderateWidthScale(6),
      height: moderateWidthScale(6),
      borderRadius: moderateWidthScale(3),
      backgroundColor: theme.orangeBrown,
      marginTop: moderateHeightScale(7),
      marginRight: moderateWidthScale(10),
    },
    missingItem: {
      flex: 1,
      fontSize: fontSize.size14,
      lineHeight: fontSize.size14 * 1.4,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
    },
    missingButton: {
      marginTop: moderateHeightScale(14),
      minHeight: moderateHeightScale(46),
      borderRadius: moderateWidthScale(12),
      borderWidth: 1.5,
      borderColor: theme.darkGreen,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: moderateWidthScale(8),
      backgroundColor: theme.surfaceRaised,
    },
    missingButtonText: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },

    // Error
    errorBox: {
      flexDirection: "row",
      alignItems: "flex-start",
      backgroundColor: theme.lightRed,
      borderColor: theme.lightRed30,
      borderWidth: 1,
      borderRadius: moderateWidthScale(12),
      padding: moderateWidthScale(12),
    },
    errorIcon: {
      marginRight: moderateWidthScale(8),
      marginTop: moderateHeightScale(1),
    },
    errorText: {
      flex: 1,
      fontSize: fontSize.size13,
      lineHeight: fontSize.size13 * 1.4,
      fontFamily: fonts.fontMedium,
      color: theme.red,
    },

    // Secure note
    secureRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: moderateWidthScale(6),
    },
    secureText: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.textMuted,
    },
    stripeWord: {
      fontFamily: fonts.fontBold,
      color: theme.stripePurple,
    },

    // Buttons
    button: {
      minHeight: moderateHeightScale(52),
      borderRadius: moderateWidthScale(14),
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: moderateWidthScale(8),
      paddingHorizontal: moderateWidthScale(16),
    },
    buttonPrimary: {
      backgroundColor: theme.darkGreen,
      shadowColor: theme.shadow,
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.12,
      shadowRadius: 6,
      elevation: 3,
    },
    buttonOutline: {
      backgroundColor: "transparent",
      borderWidth: 1.5,
      borderColor: theme.darkGreen,
    },
    buttonText: {
      minHeight: moderateHeightScale(44),
      backgroundColor: "transparent",
    },
    buttonDisabled: {
      opacity: 0.45,
    },
    buttonLabel: {
      flexShrink: 1,
      fontSize: fontSize.size16,
      fontFamily: fonts.fontBold,
    },
    buttonLabelText: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontMedium,
      textDecorationLine: "underline",
    },

    // Status
    status: {
      alignItems: "center",
      paddingHorizontal: moderateWidthScale(8),
    },
    statusRing: {
      width: moderateWidthScale(112),
      height: moderateWidthScale(112),
      borderRadius: moderateWidthScale(56),
      alignItems: "center",
      justifyContent: "center",
      marginBottom: moderateHeightScale(20),
    },
    statusRingNeutral: {
      backgroundColor: theme.lightGreen07,
    },
    statusRingWarm: {
      backgroundColor: theme.tilePeach,
    },
    statusRingSuccess: {
      backgroundColor: theme.tileMint,
    },
    statusDisc: {
      width: moderateWidthScale(80),
      height: moderateWidthScale(80),
      borderRadius: moderateWidthScale(40),
      alignItems: "center",
      justifyContent: "center",
    },
    statusTitle: {
      fontSize: fontSize.size24,
      lineHeight: fontSize.size24 * 1.25,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      textAlign: "center",
    },
    statusMessage: {
      marginTop: moderateHeightScale(8),
      fontSize: fontSize.size15,
      lineHeight: fontSize.size15 * 1.45,
      fontFamily: fonts.fontRegular,
      color: theme.textMuted,
      textAlign: "center",
      maxWidth: moderateWidthScale(320),
    },
    statusChildren: {
      alignSelf: "stretch",
      marginTop: moderateHeightScale(20),
    },
    statusNote: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(6),
      marginTop: moderateHeightScale(16),
      paddingHorizontal: moderateWidthScale(8),
    },
    statusNoteText: {
      flexShrink: 1,
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: theme.textMuted,
      textAlign: "center",
    },
  });
