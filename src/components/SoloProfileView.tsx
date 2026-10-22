import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useTranslation } from "react-i18next";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useAppSelector, useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  moderateHeightScale,
  moderateWidthScale,
} from "@/src/theme/dimensions";
import AppImage from "@/src/components/AppImage";
import Logger from "@/src/services/logger";
import { resolveApiImageUrl } from "@/src/utils/media";
import { isSoloSubscription } from "@/src/state/slices/userSlice";
import {
  fetchBusinessSummary,
  type StaffBusinessSummary,
} from "@/src/services/staffBusinessService";

export type SoloRowKey =
  | "personal"
  | "barberProfile"
  | "schedule"
  | "availableNow"
  | "services"
  | "portfolio"
  | "mediaLibrary"
  | "aiTools"
  | "businessProfile"
  | "appointments"
  | "products"
  | "orders"
  | "hiring"
  | "socialMedia"
  | "cancellationPolicy"
  | "team"
  | "publicProfile"
  | "language"
  | "notifications"
  | "rules"
  | "logout"
  | "delete";

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>["name"];

type SoloRow = {
  key: SoloRowKey;
  title: string;
  subtitle: string;
  icon: IconName;
  tileBg: string;
  iconColor: string;
};

const LANGUAGE_NAMES: Record<string, string> = {
  en: "English",
  fr: "Français",
  es: "Español",
  de: "Deutsch",
  ja: "日本語",
  ar: "العربية",
};

function RowItem({
  row,
  onPress,
  disabled,
  loading,
  isDelete,
  theme,
  styles,
}: {
  row: SoloRow;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  isDelete?: boolean;
  theme: Theme;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`${row.title}, ${row.subtitle}`}
      accessibilityState={{ disabled: !!disabled, busy: !!loading }}
      style={[styles.row, isDelete && styles.rowDelete]}
    >
      <View style={[styles.tile, { backgroundColor: row.tileBg }]}>
        {loading ? (
          <ActivityIndicator size="small" color={row.iconColor} />
        ) : (
          <MaterialCommunityIcons
            name={row.icon}
            size={moderateWidthScale(22)}
            color={row.iconColor}
          />
        )}
      </View>

      <View style={styles.rowText}>
        <Text
          style={[styles.rowTitle, isDelete && styles.rowTitleDelete]}
          numberOfLines={1}
        >
          {row.title}
        </Text>
        <Text style={styles.rowSubtitle} numberOfLines={1}>
          {row.subtitle}
        </Text>
      </View>

      <MaterialCommunityIcons
        name="chevron-right"
        size={moderateWidthScale(22)}
        color={isDelete ? theme.red : theme.darkGreen}
      />
    </TouchableOpacity>
  );
}

function Section({
  title,
  rows,
  onRowPress,
  theme,
  styles,
}: {
  title: string;
  rows: SoloRow[];
  onRowPress: (key: SoloRowKey) => void;
  theme: Theme;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle} accessibilityRole="header">
        {title}
      </Text>
      <View style={styles.sectionRows}>
        {rows.map((row) => (
          <RowItem
            key={row.key}
            row={row}
            onPress={() => onRowPress(row.key)}
            theme={theme}
            styles={styles}
          />
        ))}
      </View>
    </View>
  );
}

/**
 * Business owner on a Solo plan, or with no active plan: one flat Profile
 * page — the owner is the business.
 */
export default function SoloProfileView({
  onRowPress,
  deleteLoading,
}: {
  onRowPress: (key: SoloRowKey) => void;
  deleteLoading: boolean;
}) {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();
  const user = useAppSelector((state) => state.user);
  const language = useAppSelector((state) => state.general.language);
  const businessId = user.business_id ?? user.businessStatus?.business_id;

  const [summary, setSummary] = useState<StaffBusinessSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(!!businessId);

  useEffect(() => {
    if (!businessId) return;
    let active = true;
    setSummaryLoading(true);
    fetchBusinessSummary(businessId)
      .then((data) => {
        if (active) setSummary(data);
      })
      .catch((error) => {
        Logger.error("Failed to load solo business rating:", error);
      })
      .finally(() => {
        if (active) setSummaryLoading(false);
      });
    return () => {
      active = false;
    };
  }, [businessId]);

  const hasSoloPlan = isSoloSubscription(user.businessStatus);
  const planBadge = hasSoloPlan ? t("soloProfessional") : t("noActivePlan");
  const avatarUri = resolveApiImageUrl(user.profile_image_url);
  const displayName = user.name || summary?.name || user.business_name || "";
  const hasReviews = (summary?.ratingsCount ?? 0) > 0;
  const ratingText = hasReviews
    ? t("reviewsCount", {
        rating: summary!.averageRating.toFixed(1),
        count: summary!.ratingsCount,
      })
    : t("noReviewsYet");

  const dark = { tileBg: theme.darkGreen, iconColor: theme.white };

  const accountRows: SoloRow[] = [
    {
      key: "barberProfile",
      title: t("myBarberProfile"),
      subtitle: t("soloBarberProfileSub"),
      icon: "account",
      ...dark,
    },
    {
      key: "schedule",
      title: t("mySchedule"),
      subtitle: t("soloScheduleSub"),
      icon: "calendar-blank-outline",
      tileBg: theme.apptGoldBg,
      iconColor: theme.apptGoldAccent,
    },
    {
      key: "availableNow",
      title: t("availableNow"),
      subtitle: t("anCardSubtitle"),
      icon: "lightning-bolt-outline",
      tileBg: theme.mintTintStrong,
      iconColor: theme.apptMintAccent,
    },
    {
      key: "services",
      title: t("myServices"),
      subtitle: t("soloServicesSub"),
      icon: "content-cut",
      tileBg: theme.apptPeachBg,
      iconColor: theme.orangeBrownText,
    },
    {
      key: "portfolio",
      title: t("myPortfolio"),
      subtitle: t("soloPortfolioSub"),
      icon: "image-outline",
      tileBg: theme.mintTintStrong,
      iconColor: theme.apptMintAccent,
    },
    {
      key: "mediaLibrary",
      title: t("myReels"),
      subtitle: t("soloReelsSub"),
      icon: "play-box-outline",
      tileBg: theme.apptPinkBg,
      iconColor: theme.apptPinkAccent,
    },
    {
      key: "aiTools",
      title: t("aiTools"),
      subtitle: t("soloAiToolsSub"),
      icon: "creation",
      tileBg: theme.apptLavenderBg,
      iconColor: theme.apptLavenderAccent,
    },
  ];

  const businessRows: SoloRow[] = [
    {
      key: "businessProfile",
      title: t("businessProfileTitle"),
      subtitle: t("soloBusinessProfileSub"),
      icon: "storefront-outline",
      ...dark,
    },
    {
      key: "appointments",
      title: t("appointments"),
      subtitle: t("soloAppointmentsSub"),
      icon: "calendar-check-outline",
      tileBg: theme.apptBlueBg,
      iconColor: theme.apptBlueAccent,
    },
    {
      key: "products",
      title: t("productsTitle"),
      subtitle: t("soloProductsSub"),
      icon: "package-variant-closed",
      tileBg: theme.apptGoldBg,
      iconColor: theme.apptGoldAccent,
    },
    {
      key: "orders",
      title: t("ordersTitle"),
      subtitle: t("soloOrdersSub"),
      icon: "receipt-text-outline",
      tileBg: theme.apptPeachBg,
      iconColor: theme.orangeBrownText,
    },
    {
      key: "hiring",
      title: t("jobHiringTitle"),
      subtitle: t("soloHiringSub"),
      icon: "briefcase-outline",
      tileBg: theme.tileMint,
      iconColor: theme.successGreen,
    },
    {
      key: "socialMedia",
      title: t("socialMediaTitle"),
      subtitle: t("soloSocialMediaSub"),
      icon: "share-variant-outline",
      tileBg: theme.apptPinkBg,
      iconColor: theme.apptPinkAccent,
    },
    {
      key: "cancellationPolicy",
      title: t("cancellationPolicy"),
      subtitle: t("soloCancellationSub"),
      icon: "shield-check-outline",
      tileBg: theme.mintTintStrong,
      iconColor: theme.apptMintAccent,
    },
    {
      key: "team",
      title: t("manageTeamTitle"),
      subtitle: t("soloTeamSub"),
      icon: "account-group-outline",
      tileBg: theme.apptLavenderBg,
      iconColor: theme.apptLavenderAccent,
    },
    {
      key: "publicProfile",
      title: t("viewPublicProfile"),
      subtitle: t("soloPublicProfileSub"),
      icon: "eye-outline",
      tileBg: theme.apptBlueBg,
      iconColor: theme.apptBlueAccent,
    },
  ];

  const settingsRows: SoloRow[] = [
    {
      key: "language",
      title: t("language"),
      subtitle: LANGUAGE_NAMES[language] ?? LANGUAGE_NAMES.en,
      icon: "web",
      ...dark,
    },
    {
      key: "notifications",
      title: t("notificationSettings"),
      subtitle: t("notificationSettingsSub"),
      icon: "bell",
      tileBg: theme.selectCard,
      iconColor: theme.white,
    },
    {
      key: "rules",
      title: t("rulesAndTerms"),
      subtitle: t("rulesAndTermsSub"),
      icon: "file-document-outline",
      tileBg: theme.apptGoldBg,
      iconColor: theme.darkGreen,
    },
    {
      key: "logout",
      title: t("logOut"),
      subtitle: t("logOutSub"),
      icon: "logout",
      ...dark,
    },
  ];

  const deleteRow: SoloRow = {
    key: "delete",
    title: t("deleteAccount"),
    subtitle: t("deleteAccountSub"),
    icon: "trash-can-outline",
    tileBg: theme.lightRed,
    iconColor: theme.red,
  };

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Text style={styles.title} accessibilityRole="header">
          {t("profilePageTitle")}
        </Text>
        <Text style={styles.subtitle}>{t("soloProfileSubtitle")}</Text>
      </View>

      {/* Profile card */}
      <TouchableOpacity
        onPress={() => onRowPress("personal")}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel={[displayName, planBadge, ratingText]
          .filter(Boolean)
          .join(", ")}
        accessibilityHint={t("soloProfileCardHint")}
        style={styles.profileCard}
      >
        <View style={styles.avatarWrap}>
          <View style={styles.avatar}>
            {avatarUri ? (
              <AppImage uri={avatarUri} style={styles.avatarImage} />
            ) : (
              <Feather
                name="user"
                size={moderateWidthScale(30)}
                color={theme.lightGreen}
              />
            )}
          </View>
          <View style={styles.cameraBadge}>
            <MaterialCommunityIcons
              name="camera"
              size={moderateWidthScale(13)}
              color={theme.white}
            />
          </View>
        </View>

        <View style={styles.profileText}>
          <Text style={styles.profileName} numberOfLines={1}>
            {displayName}
          </Text>
          <View style={[styles.soloBadge, !hasSoloPlan && styles.noPlanBadge]}>
            <Text
              style={[
                styles.soloBadgeText,
                !hasSoloPlan && styles.noPlanBadgeText,
              ]}
            >
              {planBadge}
            </Text>
          </View>
          {summaryLoading && !summary ? (
            <View style={styles.ratingPlaceholder} />
          ) : (
            <View style={styles.ratingRow}>
              <MaterialCommunityIcons
                name={hasReviews ? "star" : "star-outline"}
                size={moderateWidthScale(16)}
                color={theme.orangeBrown}
              />
              <Text style={styles.ratingText} numberOfLines={1}>
                {ratingText}
              </Text>
            </View>
          )}
        </View>

        <MaterialCommunityIcons
          name="chevron-right"
          size={moderateWidthScale(24)}
          color={theme.darkGreen}
        />
      </TouchableOpacity>

      <Section
        title={t("profileSectionAccount")}
        rows={accountRows}
        onRowPress={onRowPress}
        theme={theme}
        styles={styles}
      />
      <Section
        title={t("profileSectionBusiness")}
        rows={businessRows}
        onRowPress={onRowPress}
        theme={theme}
        styles={styles}
      />
      <Section
        title={t("profileSectionSettings")}
        rows={settingsRows}
        onRowPress={onRowPress}
        theme={theme}
        styles={styles}
      />

      {/* Destructive action kept apart from the settings list */}
      <View style={styles.deleteBlock}>
        <RowItem
          row={deleteRow}
          onPress={() => onRowPress("delete")}
          disabled={deleteLoading}
          loading={deleteLoading}
          isDelete
          theme={theme}
          styles={styles}
        />
      </View>
    </ScrollView>
  );
}

const createStyles = (theme: Theme) => {
  const cardShadow = Platform.select({
    ios: {
      shadowColor: theme.darkGreen,
      shadowOffset: { width: 0, height: moderateHeightScale(2) },
      shadowOpacity: 0.08,
      shadowRadius: moderateWidthScale(6),
    },
    android: {
      elevation: 2,
      shadowColor: theme.darkGreen,
    },
    default: {
      shadowColor: theme.darkGreen,
      shadowOffset: { width: 0, height: moderateHeightScale(2) },
      shadowOpacity: 0.08,
      shadowRadius: moderateWidthScale(6),
    },
  });

  return StyleSheet.create({
    scroll: {
      flex: 1,
    },
    content: {
      paddingTop: moderateHeightScale(16),
      paddingHorizontal: moderateWidthScale(16),
      paddingBottom: moderateHeightScale(32),
    },
    header: {
      marginBottom: moderateHeightScale(14),
      paddingHorizontal: moderateWidthScale(2),
    },
    title: {
      fontSize: fontSize.size26,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      marginBottom: moderateHeightScale(4),
    },
    subtitle: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
    },

    /* ── Profile card ── */
    profileCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(14),
      paddingHorizontal: moderateWidthScale(16),
      paddingVertical: moderateHeightScale(16),
      borderRadius: moderateWidthScale(20),
      borderWidth: 1,
      borderColor: theme.lightGreen1,
      backgroundColor: theme.surfaceRaised,
      ...cardShadow,
    },
    avatarWrap: {
      width: moderateWidthScale(72),
      height: moderateWidthScale(72),
    },
    avatar: {
      width: "100%",
      height: "100%",
      borderRadius: moderateWidthScale(36),
      backgroundColor: theme.emptyProfileImage,
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
    },
    avatarImage: {
      width: "100%",
      height: "100%",
    },
    cameraBadge: {
      position: "absolute",
      right: -moderateWidthScale(2),
      bottom: -moderateWidthScale(2),
      width: moderateWidthScale(26),
      height: moderateWidthScale(26),
      borderRadius: moderateWidthScale(13),
      borderWidth: 2,
      borderColor: theme.surfaceRaised,
      backgroundColor: theme.darkGreen,
      alignItems: "center",
      justifyContent: "center",
    },
    profileText: {
      flex: 1,
      minWidth: 0,
      gap: moderateHeightScale(6),
    },
    profileName: {
      fontSize: fontSize.size20,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    soloBadge: {
      alignSelf: "flex-start",
      paddingHorizontal: moderateWidthScale(10),
      paddingVertical: moderateHeightScale(4),
      borderRadius: moderateWidthScale(8),
      backgroundColor: theme.orangeBrown30,
    },
    soloBadgeText: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    noPlanBadge: {
      backgroundColor: theme.lightRed,
    },
    noPlanBadgeText: {
      color: theme.red,
    },
    ratingRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(4),
    },
    ratingText: {
      flexShrink: 1,
      fontSize: fontSize.size14,
      fontFamily: fonts.fontMedium,
      color: theme.lightGreen,
    },
    ratingPlaceholder: {
      width: moderateWidthScale(110),
      height: moderateHeightScale(16),
      borderRadius: moderateWidthScale(6),
      backgroundColor: theme.lightGreen1,
    },

    /* ── Sections + rows ── */
    section: {
      marginTop: moderateHeightScale(24),
    },
    sectionTitle: {
      fontSize: fontSize.size18,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      marginBottom: moderateHeightScale(10),
      paddingHorizontal: moderateWidthScale(2),
    },
    sectionRows: {
      gap: moderateHeightScale(10),
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(14),
      minHeight: moderateHeightScale(68),
      paddingHorizontal: moderateWidthScale(14),
      paddingVertical: moderateHeightScale(11),
      borderRadius: moderateWidthScale(16),
      borderWidth: 1,
      borderColor: theme.lightGreen1,
      backgroundColor: theme.surfaceRaised,
      ...cardShadow,
    },
    rowDelete: {
      borderColor: theme.lightRed30,
    },
    tile: {
      width: moderateWidthScale(46),
      height: moderateWidthScale(46),
      borderRadius: moderateWidthScale(14),
      alignItems: "center",
      justifyContent: "center",
    },
    rowText: {
      flex: 1,
      minWidth: 0,
      gap: moderateHeightScale(2),
    },
    rowTitle: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    rowTitleDelete: {
      color: theme.red,
    },
    rowSubtitle: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
    },
    deleteBlock: {
      marginTop: moderateHeightScale(20),
    },
  });
};
