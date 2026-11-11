import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Clipboard,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppDispatch, useAppSelector, useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  iconScale,
  moderateHeightScale,
  moderateWidthScale,
} from "@/src/theme/dimensions";
import StackHeader from "@/src/components/StackHeader";
import Button from "@/src/components/button";
import { FlowCard, SectionLabel } from "@/src/components/reelFlow/flowParts";
import { useNotificationContext } from "@/src/contexts/NotificationContext";
import { setGuestModeModalVisible } from "@/src/state/slices/generalSlice";
import { refreshOwnInviteRewardDetails } from "@/src/services/rewardsService";
import { formatRewardMoney } from "@/src/utils/rewardMath";
import Logger from "@/src/services/logger";

type CommunityIconName = React.ComponentProps<
  typeof MaterialCommunityIcons
>["name"];

/** Guide section 3: earning. */
const STEPS: { icon: CommunityIconName; titleKey: string; textKey: string }[] = [
  {
    icon: "share-variant",
    titleKey: "ipScreenStep1Title",
    textKey: "ipScreenStep1Text",
  },
  {
    icon: "store-plus-outline",
    titleKey: "ipScreenStep2Title",
    textKey: "ipScreenStep2Text",
  },
  {
    icon: "gift-outline",
    titleKey: "ipScreenStep3Title",
    textKey: "ipScreenStep3Text",
  },
];

/**
 * Invite a Pro (customer): share the personal link from own
 * /api/user/details (`invite_link`). A pro who signs up with it and pays the
 * first month earns the customer a $30 reward balance.
 */
export default function InviteProScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);
  const insets = useSafeAreaInsets();
  const { showBanner } = useNotificationContext();

  const isGuest = useAppSelector((state) => !!state.user.isGuest);
  const inviteLink = useAppSelector((state) => state.user.invite_link);
  const inviteCode = useAppSelector((state) => state.user.invite_code);
  const rewardBalance = useAppSelector((state) => state.user.reward_balance);

  const [loading, setLoading] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const loadingRef = useRef(false);

  // Guests have no invite link: ask them to sign in and leave
  useEffect(() => {
    if (!isGuest) return;
    dispatch(setGuestModeModalVisible(true));
    if (router.canGoBack()) router.back();
  }, [dispatch, isGuest, router]);

  const loadDetails = useCallback(async () => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);
    setLoadFailed(false);
    const result = await refreshOwnInviteRewardDetails();
    loadingRef.current = false;
    setLoading(false);
    if (!result?.inviteLink) setLoadFailed(true);
  }, []);

  // Refresh on every focus so the balance stays current. The spinner and
  // error UI only show while a value is still missing.
  useFocusEffect(
    useCallback(() => {
      if (isGuest) return;
      void loadDetails();
    }, [isGuest, loadDetails]),
  );

  const handleShare = useCallback(async () => {
    if (!inviteLink) return;
    try {
      // The link only in `message`: iOS would add `url` a second time
      await Share.share({
        // Code as a backup if the app can't pick the invite up automatically
        message: inviteCode
          ? t("ipScreenShareMessageWithCode", { link: inviteLink, code: inviteCode })
          : t("ipScreenShareMessage", { link: inviteLink }),
        title: t("ipScreenShareTitle"),
      });
    } catch (error) {
      Logger.warn("Invite share failed:", error);
    }
  }, [inviteCode, inviteLink, t]);

  const handleCopy = useCallback(() => {
    if (!inviteLink) return;
    Clipboard.setString(inviteLink);
    showBanner(
      t("ipScreenLinkCopied"),
      t("ipScreenLinkCopiedMessage"),
      "success",
    );
  }, [inviteLink, showBanner, t]);

  const openHistory = useCallback(() => {
    router.push({
      pathname: "/(main)/rewards",
      params: { from: "invitePro" },
    } as any);
  }, [router]);

  if (isGuest) {
    return (
      <View style={styles.container}>
        <StackHeader title={t("ipScreenTitle")} />
      </View>
    );
  }

  // Unknown balance (not loaded yet / fetch failed) is "—", never "$0.00"
  const balanceText =
    rewardBalance == null ? "—" : formatRewardMoney(rewardBalance);
  const balanceA11y =
    rewardBalance == null
      ? t("ipScreenBalanceUnknownA11y")
      : t("ipScreenBalanceA11y", { amount: balanceText });

  return (
    <View style={styles.container}>
      <StackHeader title={t("ipScreenTitle")} />

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + moderateHeightScale(32) },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View style={styles.hero}>
          <View style={styles.heroEyebrowRow}>
            <MaterialCommunityIcons
              name="account-plus-outline"
              size={iconScale(15)}
              color={theme.orangeBrown}
            />
            <Text style={styles.heroEyebrow}>{t("ipScreenEyebrow")}</Text>
          </View>
          <Text style={styles.heroTitle} accessibilityRole="header">
            {t("ipScreenHeroTitle")}
          </Text>
          <Text style={styles.heroText}>{t("ipScreenHeroText")}</Text>
        </View>

        {/* Invite link + actions */}
        <SectionLabel
          label={t("ipScreenYourLink")}
          style={styles.sectionLabel}
        />
        <FlowCard style={styles.card}>
          {inviteLink ? (
            <>
              <View
                style={styles.linkBox}
                accessible
                accessibilityLabel={t("ipScreenLinkA11y", {
                  link: inviteLink,
                })}
              >
                <MaterialCommunityIcons
                  name="link-variant"
                  size={iconScale(18)}
                  color={theme.darkGreen}
                />
                <Text style={styles.linkText} selectable numberOfLines={2}>
                  {inviteLink}
                </Text>
              </View>
              {inviteCode ? (
                <Text style={styles.codeText}>
                  {t("ipScreenCode", { code: inviteCode })}
                </Text>
              ) : null}
              <Button
                title={t("ipScreenShare")}
                onPress={handleShare}
                leftIcon={
                  <MaterialCommunityIcons
                    name="share-variant"
                    size={iconScale(18)}
                    color={theme.buttonText}
                  />
                }
                containerStyle={styles.primaryButton}
              />
              <Button
                title={t("ipScreenCopy")}
                onPress={handleCopy}
                backgroundColor={theme.white}
                textColor={theme.darkGreen}
                leftIcon={
                  <MaterialCommunityIcons
                    name="content-copy"
                    size={iconScale(18)}
                    color={theme.darkGreen}
                  />
                }
                containerStyle={styles.secondaryButton}
              />
            </>
          ) : loading || !loadFailed ? (
            <View style={styles.stateBox}>
              <ActivityIndicator size="small" color={theme.darkGreen} />
              <Text style={styles.stateText}>{t("ipScreenLoadingLink")}</Text>
            </View>
          ) : (
            <View style={styles.stateBox} accessibilityRole="alert">
              <MaterialCommunityIcons
                name="cloud-off-outline"
                size={iconScale(26)}
                color={theme.darkGreen}
              />
              <Text style={styles.stateText}>{t("ipScreenLoadError")}</Text>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => void loadDetails()}
                style={styles.retryButton}
                accessibilityRole="button"
                accessibilityLabel={t("retry")}
              >
                <MaterialCommunityIcons
                  name="refresh"
                  size={iconScale(18)}
                  color={theme.white}
                />
                <Text style={styles.retryText}>{t("retry")}</Text>
              </TouchableOpacity>
            </View>
          )}
        </FlowCard>

        {/* How it works */}
        <SectionLabel
          label={t("ipScreenHowItWorks")}
          style={styles.sectionLabel}
        />
        <FlowCard style={styles.card}>
          {STEPS.map((step, index) => (
            <View
              key={step.titleKey}
              style={[styles.stepRow, index > 0 && styles.stepRowGap]}
              accessible
            >
              <View style={styles.stepIcon}>
                <MaterialCommunityIcons
                  name={step.icon}
                  size={iconScale(20)}
                  color={theme.orangeBrownText}
                />
              </View>
              <View style={styles.stepBody}>
                <Text style={styles.stepTitle}>{t(step.titleKey)}</Text>
                <Text style={styles.stepText}>{t(step.textKey)}</Text>
              </View>
            </View>
          ))}
        </FlowCard>

        {/* Reward balance */}
        <SectionLabel
          label={t("ipScreenBalanceLabel")}
          style={styles.sectionLabel}
        />
        <FlowCard style={[styles.card, styles.balanceCard]}>
          <View style={styles.balanceRow}>
            <View style={styles.balanceIcon}>
              <MaterialCommunityIcons
                name="gift-outline"
                size={iconScale(22)}
                color={theme.orangeBrownText}
              />
            </View>
            <View style={styles.balanceBody}>
              <Text style={styles.balanceCaption}>
                {t("ipScreenBalanceCaption")}
              </Text>
              {rewardBalance == null && loading ? (
                <ActivityIndicator
                  size="small"
                  color={theme.darkGreen}
                  style={styles.balanceLoader}
                />
              ) : (
                <Text
                  style={styles.balanceAmount}
                  accessibilityLabel={balanceA11y}
                >
                  {balanceText}
                </Text>
              )}
            </View>
          </View>
          <View style={styles.finePrint}>
            <FinePrintLine
              icon="calendar-clock-outline"
              text={t("ipScreenRuleExpiry")}
              styles={styles}
              color={theme.lightGreen}
            />
            <FinePrintLine
              icon="cash-remove"
              text={t("ipScreenRuleNoCash")}
              styles={styles}
              color={theme.lightGreen}
            />
            <FinePrintLine
              icon="tag-outline"
              text={t("ipScreenRuleUse")}
              styles={styles}
              color={theme.lightGreen}
            />
          </View>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={openHistory}
            style={styles.historyRow}
            accessibilityRole="button"
            accessibilityLabel={t("ipScreenViewHistory")}
          >
            <MaterialCommunityIcons
              name="history"
              size={iconScale(20)}
              color={theme.darkGreen}
            />
            <Text style={styles.historyText}>{t("ipScreenViewHistory")}</Text>
            <MaterialCommunityIcons
              name="chevron-right"
              size={iconScale(22)}
              color={theme.darkGreen}
            />
          </TouchableOpacity>
        </FlowCard>
      </ScrollView>
    </View>
  );
}

function FinePrintLine({
  icon,
  text,
  styles,
  color,
}: {
  icon: CommunityIconName;
  text: string;
  styles: ReturnType<typeof createStyles>;
  color: string;
}) {
  return (
    <View style={styles.finePrintRow}>
      <MaterialCommunityIcons name={icon} size={iconScale(16)} color={color} />
      <Text style={styles.finePrintText}>{text}</Text>
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    content: {
      paddingHorizontal: moderateWidthScale(16),
      paddingTop: moderateHeightScale(16),
    },
    hero: {
      backgroundColor: theme.darkGreen,
      borderRadius: moderateWidthScale(20),
      paddingHorizontal: moderateWidthScale(18),
      paddingVertical: moderateHeightScale(18),
      borderWidth: 1,
      borderColor: theme.goldBorder,
    },
    heroEyebrowRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(6),
      marginBottom: moderateHeightScale(8),
    },
    heroEyebrow: {
      fontSize: fontSize.size11,
      fontFamily: fonts.fontBold,
      color: theme.orangeBrown,
      letterSpacing: 1.2,
      textTransform: "uppercase",
    },
    heroTitle: {
      fontSize: fontSize.size22,
      lineHeight: fontSize.size22 * 1.25,
      fontFamily: fonts.fontBold,
      color: theme.white,
      marginBottom: moderateHeightScale(8),
    },
    heroText: {
      fontSize: fontSize.size14,
      lineHeight: fontSize.size14 * 1.45,
      fontFamily: fonts.fontRegular,
      color: theme.white85,
    },
    sectionLabel: {
      marginTop: moderateHeightScale(22),
      marginBottom: moderateHeightScale(10),
    },
    card: {
      padding: moderateWidthScale(16),
    },
    linkBox: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(10),
      minHeight: moderateHeightScale(48),
      paddingHorizontal: moderateWidthScale(12),
      paddingVertical: moderateHeightScale(10),
      borderRadius: moderateWidthScale(12),
      backgroundColor: theme.noticeCream,
      borderWidth: 1,
      borderColor: theme.borderLight,
    },
    linkText: {
      flex: 1,
      fontSize: fontSize.size14,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
    },
    codeText: {
      marginTop: moderateHeightScale(8),
      fontSize: fontSize.size13,
      fontFamily: fonts.fontMedium,
      color: theme.lightGreen,
      letterSpacing: 0.5,
    },
    primaryButton: {
      marginTop: moderateHeightScale(16),
    },
    secondaryButton: {
      marginTop: moderateHeightScale(10),
      borderWidth: 1.2,
      borderColor: theme.darkGreen,
    },
    stateBox: {
      alignItems: "center",
      justifyContent: "center",
      gap: moderateHeightScale(10),
      paddingVertical: moderateHeightScale(16),
    },
    stateText: {
      fontSize: fontSize.size14,
      lineHeight: fontSize.size14 * 1.4,
      fontFamily: fonts.fontMedium,
      color: theme.lightGreen,
      textAlign: "center",
    },
    retryButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(6),
      minHeight: 44,
      paddingHorizontal: moderateWidthScale(20),
      borderRadius: 999,
      backgroundColor: theme.buttonBack,
    },
    retryText: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontBold,
      color: theme.white,
    },
    stepRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: moderateWidthScale(12),
    },
    stepRowGap: {
      marginTop: moderateHeightScale(16),
    },
    stepIcon: {
      width: moderateWidthScale(38),
      height: moderateWidthScale(38),
      borderRadius: moderateWidthScale(19),
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.tileGoldCream,
    },
    stepBody: {
      flex: 1,
      gap: moderateHeightScale(3),
    },
    stepTitle: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    stepText: {
      fontSize: fontSize.size13,
      lineHeight: fontSize.size13 * 1.45,
      fontFamily: fonts.fontRegular,
      color: theme.textMuted,
    },
    balanceCard: {
      borderColor: theme.goldBorder,
      paddingBottom: moderateHeightScale(6),
    },
    balanceRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(12),
    },
    balanceIcon: {
      width: moderateWidthScale(44),
      height: moderateWidthScale(44),
      borderRadius: moderateWidthScale(22),
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.tileGoldCream,
    },
    balanceBody: {
      flex: 1,
    },
    balanceCaption: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontMedium,
      color: theme.lightGreen,
    },
    balanceAmount: {
      fontSize: fontSize.size28,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      fontVariant: ["tabular-nums"],
    },
    balanceLoader: {
      alignSelf: "flex-start",
      marginTop: moderateHeightScale(8),
    },
    finePrint: {
      marginTop: moderateHeightScale(14),
      gap: moderateHeightScale(8),
    },
    finePrintRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: moderateWidthScale(8),
    },
    finePrintText: {
      flex: 1,
      fontSize: fontSize.size13,
      lineHeight: fontSize.size13 * 1.4,
      fontFamily: fonts.fontRegular,
      color: theme.textMuted,
    },
    historyRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(10),
      minHeight: 48,
      marginTop: moderateHeightScale(12),
      borderTopWidth: 1,
      borderTopColor: theme.borderLight,
    },
    historyText: {
      flex: 1,
      fontSize: fontSize.size15,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
  });
