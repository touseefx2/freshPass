import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useAppDispatch, useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  heightScale,
  moderateHeightScale,
  moderateWidthScale,
  widthScale,
} from "@/src/theme/dimensions";
import StackHeader from "@/src/components/StackHeader";
import EmptyState from "@/src/components/emptyState";
import AppImage from "@/src/components/AppImage";
import FlowFooter from "@/src/components/reelFlow/flowFooter";
import { InfoNote } from "@/src/components/reelFlow/flowParts";
import { JobFactChips } from "@/src/components/jobs/jobBadges";
import { setGuestModeModalVisible } from "@/src/state/slices/generalSlice";
import { useJobApplyAccess } from "@/src/hooks/useJobApplyAccess";
import { fetchJobPost } from "@/src/services/jobService";
import type { JobPost } from "@/src/types/jobs";
import {
  JOB_EXPERIENCE_LABEL_KEYS,
  formatJobAgo,
  formatJobDate,
  formatJobPay,
  getJobErrorMessage,
  getJobErrorStatus,
  jobChatParams,
} from "@/src/utils/jobHelpers";

/**
 * One open position (customer side): what the job is, pay, requirements,
 * and Apply. Already applied → Message the owner. 404 → no longer open.
 */

type IconName = keyof typeof MaterialIcons.glyphMap;

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background },
    loader: { flex: 1, alignItems: "center", justifyContent: "center" },
    content: {
      paddingHorizontal: moderateWidthScale(20),
      paddingTop: moderateHeightScale(16),
      paddingBottom: moderateHeightScale(24),
      gap: moderateHeightScale(16),
    },
    card: {
      backgroundColor: theme.white,
      borderRadius: moderateWidthScale(22),
      borderWidth: 1,
      borderColor: theme.borderLight,
      shadowColor: theme.darkGreen,
      shadowOffset: { width: 0, height: moderateHeightScale(4) },
      shadowOpacity: 0.07,
      shadowRadius: moderateWidthScale(12),
      elevation: 2,
    },
    hero: {
      padding: moderateWidthScale(18),
      gap: moderateHeightScale(14),
    },
    businessRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(12),
      minHeight: heightScale(44),
    },
    logo: {
      width: widthScale(44),
      height: widthScale(44),
      borderRadius: moderateWidthScale(12),
      backgroundColor: theme.emptyProfileImage,
      overflow: "hidden",
    },
    businessText: { flex: 1, minWidth: 0 },
    businessName: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    businessLink: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontMedium,
      color: theme.buttonBack,
    },
    hiringPill: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(4),
      paddingHorizontal: moderateWidthScale(10),
      paddingVertical: moderateHeightScale(4),
      borderRadius: moderateWidthScale(999),
      backgroundColor: theme.tileMint,
    },
    hiringPillText: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontBold,
      color: theme.successGreen,
      letterSpacing: 0.5,
    },
    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: theme.borderNormal,
    },
    titleBlock: { gap: moderateHeightScale(4) },
    title: {
      fontSize: fontSize.size24,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      lineHeight: fontSize.size30,
    },
    category: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
    },
    payBox: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(12),
      padding: moderateWidthScale(14),
      borderRadius: moderateWidthScale(16),
      backgroundColor: theme.upcomingCard,
      borderWidth: 1,
      borderColor: theme.orangeBrown30,
    },
    payIcon: {
      width: widthScale(40),
      height: widthScale(40),
      borderRadius: widthScale(20),
      backgroundColor: theme.white,
      alignItems: "center",
      justifyContent: "center",
    },
    payText: { flex: 1, minWidth: 0, gap: moderateHeightScale(2) },
    payLabel: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontMedium,
      color: theme.orangeBrownText,
      textTransform: "uppercase",
      letterSpacing: 0.6,
    },
    payValue: {
      fontSize: fontSize.size20,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      fontVariant: ["tabular-nums"],
    },
    payMuted: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontMedium,
      color: theme.lightGreen,
    },
    payNote: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.darkGreen,
      lineHeight: fontSize.size20,
    },
    infoRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(12),
      paddingHorizontal: moderateWidthScale(16),
      paddingVertical: moderateHeightScale(14),
    },
    infoRowBorder: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.borderLight,
    },
    infoIcon: {
      width: widthScale(38),
      height: widthScale(38),
      borderRadius: widthScale(19),
      backgroundColor: theme.lightGreen07,
      alignItems: "center",
      justifyContent: "center",
    },
    infoText: { flex: 1, minWidth: 0, gap: moderateHeightScale(2) },
    infoLabel: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontMedium,
      color: theme.lightGreen,
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    infoValue: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
      lineHeight: fontSize.size21,
    },
    section: { gap: moderateHeightScale(10) },
    sectionTitle: {
      fontSize: fontSize.size18,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    body: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontRegular,
      color: theme.darkGreen,
      lineHeight: fontSize.size23,
    },
    bodyCard: { padding: moderateWidthScale(16) },
  });

export default function JobDetailScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const params = useLocalSearchParams<{ id?: string }>();
  const jobId = params.id ?? "";

  const [post, setPost] = useState<JobPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [closed, setClosed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestRef = useRef(0);
  const postRef = useRef(post);
  postRef.current = post;

  const { access, canSwitch, switching, switchToCustomerMode } =
    useJobApplyAccess(post);

  const load = useCallback(
    async (mode: "initial" | "refresh" | "silent") => {
      if (!jobId) {
        setClosed(true);
        setLoading(false);
        return;
      }
      const request = ++requestRef.current;
      if (mode === "initial") setLoading(true);
      if (mode === "refresh") setRefreshing(true);
      setError(null);
      try {
        const next = await fetchJobPost(jobId);
        if (request !== requestRef.current) return;
        setPost(next);
        setClosed(false);
      } catch (err) {
        if (request !== requestRef.current) return;
        if (getJobErrorStatus(err) === 404) {
          setClosed(true);
        } else if (!postRef.current) {
          setError(getJobErrorMessage(err, t("somethingWentWrong")));
        }
      } finally {
        if (request === requestRef.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [jobId, t],
  );

  // First open, and back from Apply (has_applied flips) or a mode switch
  useFocusEffect(
    useCallback(() => {
      void load(postRef.current ? "silent" : "initial");
    }, [load]),
  );

  const business = post?.business ?? null;
  const businessName = business?.title || t("jobThisBusiness");

  const openChat = useCallback(() => {
    if (!business?.ownerId) return;
    router.push({
      pathname: "/(main)/chatBox",
      params: jobChatParams({
        id: business.ownerId,
        name: business.title,
        image: business.logoUrl,
      }),
    });
  }, [business, router]);

  const openBusiness = useCallback(() => {
    if (!post) return;
    router.push({
      pathname: "/(main)/businessDetail",
      params: { business_id: String(post.businessId) },
    } as any);
  }, [post, router]);

  const renderInfoRow = (
    icon: IconName,
    label: string,
    value: string,
    first = false,
  ) => (
    <View key={label} style={[styles.infoRow, !first && styles.infoRowBorder]}>
      <View style={styles.infoIcon}>
        <MaterialIcons
          name={icon}
          size={moderateWidthScale(19)}
          color={theme.buttonBack}
        />
      </View>
      <View style={styles.infoText}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );

  if (loading && !post) {
    return (
      <View style={styles.container}>
        <StackHeader title={t("jobDetailsTitle")} />
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={theme.darkGreen} />
        </View>
      </View>
    );
  }

  if (closed || (!post && error)) {
    return (
      <View style={styles.container}>
        <StackHeader title={t("jobDetailsTitle")} />
        {closed ? (
          <EmptyState
            icon="work-off"
            title={t("jobNoLongerOpenTitle")}
            subtitle={t("jobNoLongerOpenSubtitle")}
            actionTitle={t("goBack")}
            onActionPress={() => router.back()}
          />
        ) : (
          <EmptyState
            icon="error-outline"
            title={t("jobLoadFailed")}
            subtitle={error ?? undefined}
            actionTitle={t("orderRetry")}
            onActionPress={() => void load("initial")}
          />
        )}
      </View>
    );
  }

  if (!post) return null;

  const pay = formatJobPay(post, t);

  // ── Footer: one clear action for each case
  type FooterProps = React.ComponentProps<typeof FlowFooter>;
  let footer: FooterProps | null = null;
  if (access === "guest") {
    footer = {
      primary: {
        label: t("jobSignInToApply"),
        icon: "login",
        onPress: () => dispatch(setGuestModeModalVisible(true)),
      },
      hint: t("jobSignInHint"),
    };
  } else if (access === "business_mode") {
    footer = canSwitch
      ? {
          primary: {
            label: t("jobSwitchToApply"),
            icon: "swap-horiz",
            onPress: () => void switchToCustomerMode(),
            loading: switching,
          },
          hint: t("jobSwitchHint"),
        }
      : {
          primary: {
            label: t("jobApplyNow"),
            onPress: () => {},
            disabled: true,
          },
          hint: t("jobSwitchHint"),
        };
  } else if (access === "applied") {
    footer = {
      primary: {
        label: t("jobMessageBusiness", { name: businessName }),
        icon: "chat-bubble-outline",
        onPress: openChat,
        disabled: !business?.ownerId,
      },
      hint: t("jobAppliedHint"),
    };
  } else if (access === "can_apply") {
    footer = {
      primary: {
        label: t("jobApplyNow"),
        icon: "send",
        onPress: () =>
          router.push({
            pathname: "/(main)/jobs/apply" as any,
            params: { id: String(post.id) },
          }),
      },
    };
  }

  const licenseLine = post.licenseRequired
    ? post.licenseDetails
      ? t("jobLicenseRequiredWith", { details: post.licenseDetails })
      : t("jobLicenseRequired")
    : t("jobNoLicenseNeeded");

  return (
    <View style={styles.container}>
      <StackHeader title={t("jobDetailsTitle")} />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void load("refresh")}
            tintColor={theme.darkGreen}
            colors={[theme.darkGreen]}
          />
        }
      >
        {/* Hero: business, title, facts, pay */}
        <View style={[styles.card, styles.hero]}>
          <TouchableOpacity
            style={styles.businessRow}
            onPress={openBusiness}
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityLabel={`${businessName}, ${t("jobViewProfile")}`}
          >
            <AppImage
              uri={business?.logoUrl}
              style={styles.logo}
              resizeMode="cover"
              iconSize={moderateWidthScale(18)}
            />
            <View style={styles.businessText}>
              <Text style={styles.businessName} numberOfLines={1}>
                {businessName}
              </Text>
              <Text style={styles.businessLink}>{t("jobViewProfile")}</Text>
            </View>
            <View style={styles.hiringPill}>
              <MaterialIcons
                name="work"
                size={moderateWidthScale(12)}
                color={theme.successGreen}
              />
              <Text style={styles.hiringPillText}>{t("jobHiringBadge")}</Text>
            </View>
          </TouchableOpacity>

          <View style={styles.divider} />

          <View style={styles.titleBlock}>
            <Text style={styles.title} accessibilityRole="header">
              {post.title}
            </Text>
            {post.category?.name ? (
              <Text style={styles.category}>{post.category.name}</Text>
            ) : null}
          </View>

          <JobFactChips post={post} />

          <View style={styles.payBox}>
            <View style={styles.payIcon}>
              <MaterialIcons
                name="payments"
                size={moderateWidthScale(20)}
                color={theme.selectCard}
              />
            </View>
            <View style={styles.payText}>
              <Text style={styles.payLabel}>{t("jobPay")}</Text>
              {pay ? (
                <Text style={styles.payValue}>{pay}</Text>
              ) : (
                <Text style={styles.payMuted}>{t("jobPayNotListed")}</Text>
              )}
              {post.compensationNote ? (
                <Text style={styles.payNote}>{post.compensationNote}</Text>
              ) : null}
            </View>
          </View>
        </View>

        {access === "applied" ? (
          <InfoNote
            icon="check-circle"
            title={t("jobAppliedTitle")}
            text={t("jobAppliedBody", { name: businessName })}
          />
        ) : access === "own_business" ? (
          <InfoNote
            tone="warm"
            icon="storefront"
            title={t("jobOwnBusinessTitle")}
            text={t("jobOwnBusinessBody")}
          />
        ) : null}

        {/* Where / when */}
        <View style={styles.card}>
          {renderInfoRow(
            "place",
            t("jobLocation"),
            post.location || t("jobAtSalonAddress"),
            true,
          )}
          {renderInfoRow(
            "event",
            t("jobApplyBy"),
            formatJobDate(post.expiresAt) || t("jobNoClosingDate"),
          )}
          {renderInfoRow(
            "schedule",
            t("jobPosted"),
            formatJobAgo(post.createdAt, t),
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle} accessibilityRole="header">
            {t("jobAboutRole")}
          </Text>
          <View style={[styles.card, styles.bodyCard]}>
            <Text style={styles.body}>{post.description}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle} accessibilityRole="header">
            {t("jobRequirements")}
          </Text>
          <View style={styles.card}>
            {renderInfoRow(
              "trending-up",
              t("jobExperience"),
              t(JOB_EXPERIENCE_LABEL_KEYS[post.experienceLevel]),
              true,
            )}
            {renderInfoRow(
              post.licenseRequired ? "verified" : "remove-circle-outline",
              t("jobLicense"),
              licenseLine,
            )}
          </View>
        </View>

        {access === "can_apply" ? (
          <InfoNote
            icon="forum"
            title={t("jobHowApplyTitle")}
            text={t("jobHowApplyBody", { name: businessName })}
          />
        ) : null}
      </ScrollView>

      {footer ? <FlowFooter {...footer} /> : null}
    </View>
  );
}
