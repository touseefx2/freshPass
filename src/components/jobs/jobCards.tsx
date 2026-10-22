import React, { useMemo, useState } from "react";
import {
  Linking,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import AppImage from "@/src/components/AppImage";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  heightScale,
  moderateHeightScale,
  moderateWidthScale,
  widthScale,
} from "@/src/theme/dimensions";
import type { JobApplication, JobPost } from "@/src/types/jobs";
import {
  formatJobAgo,
  formatJobDate,
  formatJobFacts,
  formatJobPay,
} from "@/src/utils/jobHelpers";
import { JobStatusBadge } from "./jobBadges";

type IconName = keyof typeof MaterialIcons.glyphMap;

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    card: {
      backgroundColor: theme.white,
      borderRadius: moderateWidthScale(20),
      borderWidth: 1,
      borderColor: theme.borderLight,
      shadowColor: theme.darkGreen,
      shadowOffset: { width: 0, height: moderateHeightScale(4) },
      shadowOpacity: 0.07,
      shadowRadius: moderateWidthScale(10),
      elevation: 2,
    },
    // ── Customer row (profile Jobs section)
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(12),
      paddingHorizontal: moderateWidthScale(16),
      paddingVertical: moderateHeightScale(16),
    },
    rowIcon: {
      width: widthScale(46),
      height: widthScale(46),
      borderRadius: moderateWidthScale(14),
      backgroundColor: theme.tileMint,
      alignItems: "center",
      justifyContent: "center",
    },
    rowText: { flex: 1, minWidth: 0, gap: moderateHeightScale(3) },
    rowTitle: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    rowMeta: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
    },
    rowPay: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontBold,
      color: theme.orangeBrownText,
      fontVariant: ["tabular-nums"],
    },
    // ── Owner post card
    ownerTop: {
      padding: moderateWidthScale(16),
      gap: moderateHeightScale(6),
    },
    ownerTitleRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: moderateWidthScale(10),
    },
    ownerTitle: {
      flex: 1,
      fontSize: fontSize.size18,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    ownerFoot: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(10),
      paddingHorizontal: moderateWidthScale(16),
      paddingVertical: moderateHeightScale(12),
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.borderNormal,
    },
    footItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(6),
    },
    footGrow: { flex: 1 },
    footText: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
      fontVariant: ["tabular-nums"],
    },
    footMuted: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
    },
    footDanger: {
      flex: 1,
      fontSize: fontSize.size13,
      fontFamily: fonts.fontMedium,
      color: theme.red,
    },
    // ── Customer application card
    appTop: {
      flexDirection: "row",
      gap: moderateWidthScale(12),
      padding: moderateWidthScale(16),
    },
    logo: {
      width: widthScale(52),
      height: widthScale(52),
      borderRadius: moderateWidthScale(14),
      backgroundColor: theme.emptyProfileImage,
      overflow: "hidden",
    },
    appText: { flex: 1, minWidth: 0, gap: moderateHeightScale(3) },
    appBusiness: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontMedium,
      color: theme.lightGreen,
    },
    appTitle: {
      fontSize: fontSize.size17,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    appAction: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(8),
      minHeight: heightScale(50),
      paddingHorizontal: moderateWidthScale(16),
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.borderNormal,
    },
    appActionText: {
      flex: 1,
      fontSize: fontSize.size15,
      fontFamily: fonts.fontBold,
      color: theme.buttonBack,
    },
    // ── Applicant card (owner)
    applicantTop: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(12),
      padding: moderateWidthScale(16),
      paddingBottom: moderateHeightScale(12),
    },
    avatar: {
      width: widthScale(48),
      height: widthScale(48),
      borderRadius: widthScale(24),
      backgroundColor: theme.emptyProfileImage,
      overflow: "hidden",
    },
    applicantName: {
      fontSize: fontSize.size17,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      textTransform: "capitalize",
    },
    messageBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(6),
      minHeight: heightScale(44),
      paddingHorizontal: moderateWidthScale(14),
      borderRadius: heightScale(22),
      backgroundColor: theme.darkGreen,
    },
    messageBtnText: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontBold,
      color: theme.white,
    },
    factRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: moderateWidthScale(8),
      paddingHorizontal: moderateWidthScale(16),
      paddingBottom: moderateHeightScale(12),
    },
    fact: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(5),
      minHeight: heightScale(30),
      paddingHorizontal: moderateWidthScale(10),
      borderRadius: moderateWidthScale(10),
      backgroundColor: theme.lightGreen05,
    },
    factText: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
    },
    toggle: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: moderateWidthScale(4),
      minHeight: heightScale(46),
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.borderNormal,
    },
    toggleText: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontBold,
      color: theme.buttonBack,
    },
    details: {
      paddingHorizontal: moderateWidthScale(16),
      paddingBottom: moderateHeightScale(8),
    },
    detailRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(12),
      minHeight: heightScale(52),
      paddingVertical: moderateHeightScale(8),
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.borderLight,
    },
    detailIcon: {
      width: widthScale(36),
      height: widthScale(36),
      borderRadius: widthScale(18),
      backgroundColor: theme.lightGreen07,
      alignItems: "center",
      justifyContent: "center",
    },
    detailText: { flex: 1, minWidth: 0, gap: moderateHeightScale(1) },
    detailLabel: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontMedium,
      color: theme.lightGreen,
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    detailValue: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
    },
    detailLink: {
      color: theme.buttonBack,
      textDecorationLine: "underline",
    },
    messageQuote: {
      marginTop: moderateHeightScale(4),
      marginBottom: moderateHeightScale(8),
      padding: moderateWidthScale(12),
      borderRadius: moderateWidthScale(14),
      backgroundColor: theme.upcomingCard,
      borderLeftWidth: 3,
      borderLeftColor: theme.orangeBrown,
    },
    messageQuoteText: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontRegular,
      color: theme.darkGreen,
      lineHeight: fontSize.size22,
    },
  });

function useJobCardStyles() {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  return { theme, styles };
}

/** One open position inside the profile's Jobs card (rows share one card). */
export function JobListRow({
  post,
  onPress,
}: {
  post: JobPost;
  onPress: () => void;
}) {
  const { t } = useTranslation();
  const { theme, styles } = useJobCardStyles();
  const pay = formatJobPay(post, t);
  const facts = formatJobFacts(post, t);
  return (
    <TouchableOpacity
      style={styles.row}
      onPress={onPress}
      activeOpacity={0.75}
      accessibilityRole="button"
      accessibilityLabel={[post.title, facts, pay].filter(Boolean).join(", ")}
      accessibilityHint={t("jobOpenDetailsHint")}
    >
      <View style={styles.rowIcon}>
        <MaterialIcons
          name="work-outline"
          size={moderateWidthScale(22)}
          color={theme.successGreen}
        />
      </View>
      <View style={styles.rowText}>
        <Text style={styles.rowTitle} numberOfLines={2}>
          {post.title}
        </Text>
        <Text style={styles.rowMeta} numberOfLines={2}>
          {facts}
        </Text>
        {pay ? <Text style={styles.rowPay}>{pay}</Text> : null}
      </View>
      <MaterialIcons
        name="chevron-right"
        size={moderateWidthScale(26)}
        color={theme.darkGreen}
      />
    </TouchableOpacity>
  );
}

/** Owner's list: title, status, pay, applicants and closing date. */
export function OwnerJobCard({
  post,
  onPress,
  style,
}: {
  post: JobPost;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  const { t } = useTranslation();
  const { theme, styles } = useJobCardStyles();
  const pay = formatJobPay(post, t);
  const count = post.applicationsCount ?? 0;
  const dateLine =
    post.status === "open"
      ? t("jobClosesOn", { date: formatJobDate(post.expiresAt) })
      : post.status === "expired"
        ? t("jobExpiredOn", { date: formatJobDate(post.expiresAt) })
        : t("jobPostedOn", { date: formatJobDate(post.createdAt) });
  return (
    <TouchableOpacity
      style={[styles.card, style]}
      onPress={onPress}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityHint={t("jobManageHint")}
    >
      <View style={styles.ownerTop}>
        <View style={styles.ownerTitleRow}>
          <Text style={styles.ownerTitle} numberOfLines={2}>
            {post.title}
          </Text>
          <JobStatusBadge status={post.status} />
        </View>
        <Text style={styles.rowMeta} numberOfLines={2}>
          {formatJobFacts(post, t)}
        </Text>
        {pay ? <Text style={styles.rowPay}>{pay}</Text> : null}
      </View>
      <View style={styles.ownerFoot}>
        {post.status === "removed" ? (
          <>
            <MaterialIcons
              name="report-gmailerrorred"
              size={moderateWidthScale(18)}
              color={theme.red}
            />
            <Text style={styles.footDanger} numberOfLines={1}>
              {post.removedReason
                ? t("jobRemovedReasonShort", { reason: post.removedReason })
                : t("jobRemovedByFreshPass")}
            </Text>
          </>
        ) : (
          <>
            <View style={[styles.footItem, styles.footGrow]}>
              <MaterialIcons
                name="people-outline"
                size={moderateWidthScale(18)}
                color={theme.buttonBack}
              />
              <Text style={styles.footText}>
                {t("jobApplicantsCount", { count })}
              </Text>
            </View>
            <Text style={styles.footMuted} numberOfLines={1}>
              {dateLine}
            </Text>
          </>
        )}
        <MaterialIcons
          name="chevron-right"
          size={moderateWidthScale(22)}
          color={theme.darkGreen}
        />
      </View>
    </TouchableOpacity>
  );
}

/** Customer's "My job applications" card; the footer opens the chat. */
export function ApplicationCard({
  application,
  onMessage,
  onOpenPost,
}: {
  application: JobApplication;
  onMessage: (() => void) | null;
  onOpenPost: (() => void) | null;
}) {
  const { t } = useTranslation();
  const { theme, styles } = useJobCardStyles();
  const post = application.jobPost;
  const business = post?.business;
  const top = (
    <View style={styles.appTop}>
      <AppImage
        uri={business?.logoUrl}
        style={styles.logo}
        resizeMode="cover"
        iconSize={moderateWidthScale(20)}
      />
      <View style={styles.appText}>
        {business?.title ? (
          <Text style={styles.appBusiness} numberOfLines={1}>
            {business.title}
          </Text>
        ) : null}
        <Text style={styles.appTitle} numberOfLines={2}>
          {post?.title || t("jobUntitled")}
        </Text>
        <Text style={styles.rowMeta}>
          {t("jobAppliedOn", { date: formatJobDate(application.createdAt) })}
        </Text>
      </View>
      {post ? <JobStatusBadge status={post.status} /> : null}
    </View>
  );
  return (
    <View style={styles.card}>
      {onOpenPost ? (
        <TouchableOpacity
          onPress={onOpenPost}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityHint={t("jobOpenDetailsHint")}
        >
          {top}
        </TouchableOpacity>
      ) : (
        top
      )}
      {onMessage ? (
        <TouchableOpacity
          style={styles.appAction}
          onPress={onMessage}
          activeOpacity={0.75}
          accessibilityRole="button"
        >
          <MaterialIcons
            name="chat-bubble-outline"
            size={moderateWidthScale(20)}
            color={theme.buttonBack}
          />
          <Text style={styles.appActionText} numberOfLines={1}>
            {business?.title
              ? t("jobMessageBusiness", { name: business.title })
              : t("jobMessage")}
          </Text>
          <MaterialIcons
            name="chevron-right"
            size={moderateWidthScale(22)}
            color={theme.buttonBack}
          />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

function DetailRow({
  icon,
  label,
  value,
  onPress,
}: {
  icon: IconName;
  label: string;
  value: string;
  onPress?: () => void;
}) {
  const { theme, styles } = useJobCardStyles();
  const body = (
    <>
      <View style={styles.detailIcon}>
        <MaterialIcons
          name={icon}
          size={moderateWidthScale(18)}
          color={theme.buttonBack}
        />
      </View>
      <View style={styles.detailText}>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text
          style={[styles.detailValue, onPress && styles.detailLink]}
          numberOfLines={2}
        >
          {value}
        </Text>
      </View>
      {onPress ? (
        <MaterialIcons
          name="open-in-new"
          size={moderateWidthScale(18)}
          color={theme.lightGreen}
        />
      ) : null}
    </>
  );
  if (!onPress) return <View style={styles.detailRow}>{body}</View>;
  return (
    <TouchableOpacity
      style={styles.detailRow}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="link"
      accessibilityLabel={`${label}: ${value}`}
    >
      {body}
    </TouchableOpacity>
  );
}

const openUrl = (url: string) => {
  Linking.openURL(url).catch(() => {});
};

/** Owner's applicant: summary + Message, answers on demand. */
export function ApplicantCard({
  application,
  onMessage,
}: {
  application: JobApplication;
  onMessage: (() => void) | null;
}) {
  const { t } = useTranslation();
  const { theme, styles } = useJobCardStyles();
  const [open, setOpen] = useState(false);
  const name = application.applicant?.name || application.fullName;
  const years = application.yearsExperience;
  const portfolio = application.portfolioUrl;
  return (
    <View style={styles.card}>
      <View style={styles.applicantTop}>
        <AppImage
          uri={application.applicant?.avatar}
          style={styles.avatar}
          resizeMode="cover"
          iconSize={moderateWidthScale(20)}
        />
        <View style={styles.appText}>
          <Text style={styles.applicantName} numberOfLines={1}>
            {name}
          </Text>
          <Text style={styles.rowMeta}>
            {t("jobAppliedAgo", {
              when: formatJobAgo(application.createdAt, t),
            })}
          </Text>
        </View>
        {onMessage ? (
          <TouchableOpacity
            style={styles.messageBtn}
            onPress={onMessage}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={t("jobMessageBusiness", { name })}
          >
            <MaterialIcons
              name="chat-bubble-outline"
              size={moderateWidthScale(16)}
              color={theme.white}
            />
            <Text style={styles.messageBtnText}>{t("jobMessage")}</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <View style={styles.factRow}>
        <View style={styles.fact}>
          <MaterialIcons
            name="trending-up"
            size={moderateWidthScale(15)}
            color={theme.buttonBack}
          />
          <Text style={styles.factText}>
            {t("jobYearsExperience", { count: years })}
          </Text>
        </View>
        <View style={styles.fact}>
          <MaterialIcons
            name={application.hasLicense ? "verified" : "remove-circle-outline"}
            size={moderateWidthScale(15)}
            color={
              application.hasLicense ? theme.successGreen : theme.lightGreen
            }
          />
          <Text style={styles.factText}>
            {application.hasLicense ? t("jobLicensed") : t("jobNoLicense")}
          </Text>
        </View>
        {application.resume ? (
          <View style={styles.fact}>
            <MaterialIcons
              name="description"
              size={moderateWidthScale(15)}
              color={theme.buttonBack}
            />
            <Text style={styles.factText}>{t("jobResume")}</Text>
          </View>
        ) : null}
      </View>

      {open ? (
        <View style={styles.details}>
          {application.message ? (
            <View style={styles.messageQuote}>
              <Text style={styles.messageQuoteText}>{application.message}</Text>
            </View>
          ) : null}
          {application.phone ? (
            <DetailRow
              icon="phone"
              label={t("jobPhone")}
              value={application.phone}
              onPress={() =>
                openUrl(`tel:${application.phone.replace(/\s/g, "")}`)
              }
            />
          ) : null}
          {application.email ? (
            <DetailRow
              icon="mail-outline"
              label={t("jobEmail")}
              value={application.email}
              onPress={() => openUrl(`mailto:${application.email}`)}
            />
          ) : null}
          {application.hasLicense && application.licenseNumber ? (
            <DetailRow
              icon="badge"
              label={t("jobLicenseNumber")}
              value={application.licenseNumber}
            />
          ) : null}
          {portfolio ? (
            <DetailRow
              icon="link"
              label={t("jobPortfolio")}
              value={portfolio}
              onPress={() => openUrl(portfolio)}
            />
          ) : null}
          {application.resume ? (
            <DetailRow
              icon="description"
              label={t("jobResume")}
              value={application.resume.name}
              onPress={() => openUrl(application.resume!.path)}
            />
          ) : null}
        </View>
      ) : null}

      <TouchableOpacity
        style={styles.toggle}
        onPress={() => setOpen((v) => !v)}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
      >
        <Text style={styles.toggleText}>
          {open ? t("jobHideAnswers") : t("jobViewAnswers")}
        </Text>
        <MaterialIcons
          name={open ? "expand-less" : "expand-more"}
          size={moderateWidthScale(22)}
          color={theme.buttonBack}
        />
      </TouchableOpacity>
    </View>
  );
}

/** Rows inside one white card, divided — the profile Jobs card. */
export function JobRowsCard({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const { styles } = useJobCardStyles();
  return <View style={[styles.card, style]}>{children}</View>;
}
