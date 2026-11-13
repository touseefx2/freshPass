// Owner Profile Promotions: shared pieces for the Offers list and detail.

import React, { useCallback, useMemo, useState } from "react";
import {
  StyleProp,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useAppDispatch, useAppSelector, useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  iconScale,
  moderateHeightScale,
  moderateWidthScale,
} from "@/src/theme/dimensions";
import BuyBusinessPlanModal from "@/src/components/BuyBusinessPlanModal";
import { setBusinessPlansModalVisible } from "@/src/state/slices/generalSlice";
import { isBusinessSubscriptionActive } from "@/src/state/slices/userSlice";
import { StatusChip, type IoniconName } from "@/src/components/masterClasses/parts";
import { promotionStatusMeta } from "@/src/utils/promotionHelpers";
import type { Promotion } from "@/src/types/promotion";

/**
 * Offers come with an active plan. `can_promote: false` from the list (or no
 * active plan here) → "Choose a plan" popup instead of the editor.
 */
export function usePromotionsPlanGate() {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const businessStatus = useAppSelector((state) => state.user.businessStatus);
  const [visible, setVisible] = useState(false);

  const ensureCanCreate = useCallback(
    (canPromote: boolean): boolean => {
      const planOk =
        !businessStatus || isBusinessSubscriptionActive(businessStatus);
      if (canPromote && planOk) return true;
      setVisible(true);
      return false;
    },
    [businessStatus],
  );

  const planModal = (
    <BuyBusinessPlanModal
      visible={visible}
      onClose={() => setVisible(false)}
      onViewPlans={() => {
        setVisible(false);
        dispatch(setBusinessPlansModalVisible(true));
      }}
      subtitle={t("proPlanSubtitle")}
      message={t("proPlanMessage")}
    />
  );

  return { ensureCanCreate, planModal };
}

const useStyles = () => {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);
  return { theme, styles };
};

/** Cream info box (included-in-plan note, audience hint …). */
export function PromotionInfoNote({
  text,
  icon = "information-circle-outline",
  tone = "info",
  style,
}: {
  text?: string | null;
  icon?: IoniconName;
  tone?: "info" | "danger";
  style?: StyleProp<ViewStyle>;
}) {
  const { theme, styles } = useStyles();
  if (!text) return null;
  const danger = tone === "danger";
  return (
    <View style={[styles.note, danger && styles.noteDanger, style]}>
      <Ionicons
        name={icon}
        size={iconScale(18)}
        color={danger ? theme.red : theme.goldTextDark}
      />
      <Text style={[styles.noteText, danger && { color: theme.red }]}>{text}</Text>
    </View>
  );
}

/** One offer in the owner list. Suspended offers can't be edited. */
export function PromotionOwnerCard({
  promotion,
  onPress,
}: {
  promotion: Promotion;
  onPress: () => void;
}) {
  const { t } = useTranslation();
  const { theme, styles } = useStyles();
  const status = promotionStatusMeta(promotion.status, t);
  const counts = [
    t("proCountReserved", { count: promotion.reserved_count }),
    t("proCountUsed", { count: promotion.used_count }),
    t("proCountViews", { count: promotion.views_count }),
  ].join(" · ");
  const sub = [promotion.savings_label, promotion.audience_label]
    .filter(Boolean)
    .join(" · ");

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={styles.card}
      accessibilityRole="button"
      accessibilityLabel={[promotion.title, sub, status.label, counts]
        .filter(Boolean)
        .join(", ")}
    >
      <View style={styles.cardIcon}>
        <Ionicons name="pricetag" size={iconScale(20)} color={theme.orangeBrown} />
      </View>
      <View style={styles.cardBody}>
        <View style={styles.cardTop}>
          <Text style={styles.cardTitle} numberOfLines={2}>
            {promotion.title}
          </Text>
          <StatusChip label={status.label} tone={status.tone} hideIcon />
        </View>
        {sub ? (
          <Text style={styles.cardSub} numberOfLines={1}>
            {sub}
          </Text>
        ) : null}
        {promotion.status === "suspended" ? (
          <Text style={styles.cardSuspended} numberOfLines={2}>
            {promotion.suspended_reason ?? t("proSuspendedFallback")}
          </Text>
        ) : (
          <Text style={styles.cardCounts} numberOfLines={1}>
            {counts}
          </Text>
        )}
      </View>
      <Ionicons
        name="chevron-forward"
        size={iconScale(18)}
        color={theme.lightGreen5}
      />
    </TouchableOpacity>
  );
}

/** Results tile: big number + small label. */
export function PromotionStatTile({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: IoniconName;
}) {
  const { theme, styles } = useStyles();
  return (
    <View
      style={styles.stat}
      accessible
      accessibilityLabel={`${label}: ${value}`}
    >
      <Ionicons name={icon} size={iconScale(18)} color={theme.orangeBrown} />
      <Text style={styles.statValue} numberOfLines={1}>
        {value}
      </Text>
      <Text style={styles.statLabel} numberOfLines={2}>
        {label}
      </Text>
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    note: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: moderateWidthScale(10),
      backgroundColor: theme.noticeCream,
      borderWidth: 1,
      borderColor: theme.goldBorder,
      borderRadius: moderateWidthScale(12),
      paddingHorizontal: moderateWidthScale(12),
      paddingVertical: moderateHeightScale(10),
    },
    noteDanger: {
      backgroundColor: theme.lightRed,
      borderColor: theme.lightRed30,
    },
    noteText: {
      flex: 1,
      fontSize: fontSize.size13,
      lineHeight: fontSize.size13 * 1.45,
      fontFamily: fonts.fontMedium,
      color: theme.goldTextDark,
    },
    card: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(12),
      backgroundColor: theme.white,
      borderRadius: moderateWidthScale(14),
      borderWidth: 1,
      borderColor: theme.lightGreen015,
      paddingHorizontal: moderateWidthScale(14),
      paddingVertical: moderateHeightScale(14),
    },
    cardIcon: {
      width: moderateWidthScale(42),
      height: moderateWidthScale(42),
      borderRadius: moderateWidthScale(21),
      backgroundColor: theme.tileGoldCream,
      alignItems: "center",
      justifyContent: "center",
    },
    cardBody: {
      flex: 1,
      gap: moderateHeightScale(4),
    },
    cardTop: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: moderateWidthScale(8),
    },
    cardTitle: {
      flex: 1,
      fontSize: fontSize.size15,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    cardSub: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontSemiBold,
      color: theme.orangeBrownText,
    },
    cardCounts: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.textMuted,
    },
    cardSuspended: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontMedium,
      color: theme.red,
    },
    stat: {
      flexBasis: "30%",
      flexGrow: 1,
      backgroundColor: theme.white,
      borderRadius: moderateWidthScale(12),
      borderWidth: 1,
      borderColor: theme.lightGreen015,
      paddingVertical: moderateHeightScale(12),
      paddingHorizontal: moderateWidthScale(10),
      alignItems: "center",
      gap: moderateHeightScale(4),
    },
    statValue: {
      fontSize: fontSize.size18,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    statLabel: {
      fontSize: fontSize.size11,
      fontFamily: fonts.fontMedium,
      color: theme.textMuted,
      textAlign: "center",
    },
  });
