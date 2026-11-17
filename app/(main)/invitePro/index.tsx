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
import { LinearGradient } from "expo-linear-gradient";
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

  useFocusEffect(
    useCallback(() => {
      if (isGuest) return;
      void loadDetails();
    }, [isGuest, loadDetails]),
  );

  const handleShare = useCallback(async () => {
    if (!inviteLink) return;
    try {
      await Share.share({
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

  const balanceText =
    rewardBalance == null ? "—" : formatRewardMoney(rewardBalance);
  const balanceA11y =
    rewardBalance == null
      ? t("ipScreenBalanceUnknownA11y")
      : t("ipScreenBalanceA11y", { amount: balanceText });

  const linkReady = !!inviteLink;
  const showLoader = !linkReady && (loading || !loadFailed);
  const showError = !linkReady && !loading && loadFailed;

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
        {/* Green-to-cream gradient behind hero */}
        <LinearGradient
          colors={[
            "rgba(40, 54, 24, 0.12)",
            "rgba(40, 54, 24, 0.04)",
            "transparent",
          ]}
          style={styles.heroBg}
          pointerEvents="none"
        />

        {/* Hero text + paper plane */}
        <View style={styles.heroRow}>
          <View style={styles.heroTextCol}>
            <Text style={styles.heroLine1}>{t("ipHeroLine1")}</Text>
            <Text style={styles.heroLine2}>{t("ipHeroLine2")}</Text>
            <Text style={styles.heroSub}>{t("ipHeroSub")}</Text>
          </View>
          <View style={styles.planeMedallion}>
            <MaterialCommunityIcons
              name="send"
              size={iconScale(30)}
              color={theme.orangeBrown}
              style={styles.planeIcon}
            />
          </View>
        </View>

        {/* Stacked message preview card */}
        <View style={styles.cardStack}>
          {/* Back cards peeking from behind — cream deck layers */}
          <View style={[styles.deckCard, styles.deckCard3]} />
          <View style={[styles.deckCard, styles.deckCard2]} />

          {/* Main card — cream outer frame with white content inside */}
          <View style={styles.cardFrame}>
            <View style={styles.messageCard}>
              <View style={styles.readyBadge}>
                <Text style={styles.readyBadgeText}>
                  {t("ipReadyToShare")}
                </Text>
              </View>
              <Text style={styles.messageTitle}>{t("ipMessageTitle")}</Text>
              <Text style={styles.messageBody}>{t("ipMessageBody")}</Text>
              <View style={styles.messageDivider} />
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={handleCopy}
                style={styles.linkRow}
                accessibilityRole="button"
                accessibilityLabel={t("ipScreenCopy")}
                disabled={!linkReady}
              >
                <MaterialCommunityIcons
                  name="link-variant"
                  size={iconScale(18)}
                  color={theme.orangeBrown}
                />
                <Text style={styles.linkLabel} numberOfLines={1}>
                  {t("ipSignupLink")}
                </Text>
                <MaterialCommunityIcons
                  name="content-copy"
                  size={iconScale(18)}
                  color={theme.lightGreen}
                />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Audience line */}
        <View style={styles.audienceRow}>
          <MaterialCommunityIcons
            name="account-outline"
            size={iconScale(18)}
            color={theme.lightGreen}
          />
          <Text style={styles.audienceText}>{t("ipAudience")}</Text>
        </View>

        {/* Action buttons */}
        {showLoader ? (
          <View style={styles.stateBox}>
            <ActivityIndicator size="small" color={theme.darkGreen} />
            <Text style={styles.stateText}>{t("ipScreenLoadingLink")}</Text>
          </View>
        ) : showError ? (
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
        ) : (
          <>
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
            <Text style={styles.channelsHint}>{t("ipChannelsHint")}</Text>
          </>
        )}

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
      paddingTop: moderateHeightScale(20),
    },

    heroBg: {
      position: "absolute",
      top: 0,
      left: -moderateWidthScale(16),
      right: -moderateWidthScale(16),
      height: moderateHeightScale(160),
      borderBottomLeftRadius: moderateWidthScale(24),
      borderBottomRightRadius: moderateWidthScale(24),
    },

    // Hero text + paper plane
    heroRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: moderateHeightScale(24),
    },
    heroTextCol: {
      flex: 1,
      marginRight: moderateWidthScale(12),
    },
    heroLine1: {
      fontSize: fontSize.size26,
      fontFamily: fonts.fontExtraBold,
      color: theme.darkGreen,
      lineHeight: fontSize.size26 * 1.2,
    },
    heroLine2: {
      fontSize: fontSize.size26,
      fontFamily: fonts.fontExtraBold,
      color: theme.orangeBrown,
      lineHeight: fontSize.size26 * 1.2,
    },
    heroSub: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      marginTop: moderateHeightScale(6),
    },
    planeMedallion: {
      width: moderateWidthScale(68),
      height: moderateWidthScale(68),
      borderRadius: moderateWidthScale(34),
      backgroundColor: theme.noticeCream,
      alignItems: "center",
      justifyContent: "center",
    },
    planeIcon: {
      transform: [{ rotate: "-30deg" }],
    },

    // Stacked card — deck of cards effect
    cardStack: {
      marginBottom: moderateHeightScale(20),
    },
    deckCard: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: theme.noticeCream,
      borderRadius: moderateWidthScale(16),
      borderWidth: 1.2,
      borderColor: theme.goldBorder,
    },
    deckCard3: {
      transform: [
        { rotate: "2.5deg" },
        { translateX: 4 },
        { translateY: 8 },
      ],
      opacity: 0.45,
    },
    deckCard2: {
      transform: [
        { rotate: "1.2deg" },
        { translateX: 2 },
        { translateY: 4 },
      ],
      opacity: 0.7,
    },
    cardFrame: {
      backgroundColor: theme.noticeCream,
      borderRadius: moderateWidthScale(16),
      borderWidth: 1.2,
      borderColor: theme.goldBorder,
      padding: moderateWidthScale(6),
    },
    messageCard: {
      backgroundColor: theme.white,
      borderRadius: moderateWidthScale(12),
      padding: moderateWidthScale(16),
    },
    readyBadge: {
      alignSelf: "flex-start",
      backgroundColor: theme.noticeCream,
      paddingHorizontal: moderateWidthScale(12),
      paddingVertical: moderateHeightScale(5),
      borderRadius: moderateWidthScale(6),
      marginBottom: moderateHeightScale(12),
    },
    readyBadgeText: {
      fontSize: fontSize.size11,
      fontFamily: fonts.fontBold,
      color: theme.orangeBrownText,
      letterSpacing: 1,
      textTransform: "uppercase",
    },
    messageTitle: {
      fontSize: fontSize.size22,
      fontFamily: fonts.fontExtraBold,
      color: theme.darkGreen,
      lineHeight: fontSize.size22 * 1.2,
      marginBottom: moderateHeightScale(10),
    },
    messageBody: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontRegular,
      color: theme.textMuted ?? theme.lightGreen,
      lineHeight: fontSize.size15 * 1.5,
    },
    messageDivider: {
      height: 1,
      backgroundColor: theme.borderLight,
      marginVertical: moderateHeightScale(14),
    },
    linkRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(10),
      minHeight: 44,
    },
    linkLabel: {
      flex: 1,
      fontSize: fontSize.size14,
      fontFamily: fonts.fontMedium,
      color: theme.lightGreen,
    },

    // Audience
    audienceRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(8),
      marginBottom: moderateHeightScale(20),
      paddingHorizontal: moderateWidthScale(4),
    },
    audienceText: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
    },

    // Buttons
    primaryButton: {
      marginBottom: moderateHeightScale(10),
    },
    secondaryButton: {
      marginBottom: moderateHeightScale(12),
      borderWidth: 1.2,
      borderColor: theme.darkGreen,
    },
    channelsHint: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      textAlign: "center",
      marginBottom: moderateHeightScale(8),
    },

    // Loading / error
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

    // How it works
    sectionLabel: {
      marginTop: moderateHeightScale(22),
      marginBottom: moderateHeightScale(10),
    },
    card: {
      padding: moderateWidthScale(16),
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

    // Balance
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
