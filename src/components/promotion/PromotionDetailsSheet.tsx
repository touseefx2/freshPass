import React, { useEffect, useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Button from "@/src/components/button";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import { moderateHeightScale, moderateWidthScale } from "@/src/theme/dimensions";
import type { Promotion } from "@/src/types/promotion";
import { savingsHeadline } from "@/src/utils/promotionDisplay";
import PromotionDetailsContent from "./PromotionDetailsContent";

type Props = {
  visible: boolean;
  promotions: Promotion[];
  /** Open straight on this offer (e.g. from the services banner). */
  initialPromotionId?: number | null;
  onClose: () => void;
  /** "View eligible services" for the shown offer. */
  onViewServices: (promotion: Promotion) => void;
  onSignIn?: () => void;
};

/**
 * Bottom sheet behind the profile offer chip. One offer → its details.
 * Several ("2 offers") → a short list first; tap one for its details.
 */
export default function PromotionDetailsSheet({
  visible,
  promotions,
  initialPromotionId,
  onClose,
  onViewServices,
  onSignIn,
}: Props) {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [selectedId, setSelectedId] = useState<number | null>(null);

  // Each open starts on the requested offer, the only offer, or the list
  useEffect(() => {
    if (!visible) return;
    if (initialPromotionId != null) setSelectedId(initialPromotionId);
    else if (promotions.length === 1) setSelectedId(promotions[0].id);
    else setSelectedId(null);
  }, [visible, initialPromotionId, promotions]);

  const selected =
    selectedId != null ? promotions.find((p) => p.id === selectedId) : undefined;
  const canGoBackToList = !!selected && promotions.length > 1;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.handle} />
          <View style={styles.header}>
            {canGoBackToList ? (
              <TouchableOpacity
                style={styles.headerButton}
                activeOpacity={0.7}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                onPress={() => setSelectedId(null)}
                accessibilityRole="button"
                accessibilityLabel={t("pcuAllOffers")}
              >
                <MaterialIcons
                  name="arrow-back"
                  size={moderateWidthScale(22)}
                  color={theme.darkGreen}
                />
              </TouchableOpacity>
            ) : null}
            <Text style={styles.headerTitle} accessibilityRole="header">
              {selected ? t("pcuOfferDetails") : t("pcuOffers")}
            </Text>
            <TouchableOpacity
              style={styles.headerButton}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel={t("close")}
            >
              <MaterialIcons
                name="close"
                size={moderateWidthScale(22)}
                color={theme.darkGreen}
              />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.body}
            contentContainerStyle={styles.bodyContent}
            showsVerticalScrollIndicator={false}
          >
            {selected ? (
              <PromotionDetailsContent promotion={selected} onSignIn={onSignIn} />
            ) : (
              promotions.map((promotion) => (
                <TouchableOpacity
                  key={promotion.id}
                  style={styles.offerCard}
                  activeOpacity={0.8}
                  onPress={() => setSelectedId(promotion.id)}
                  accessibilityRole="button"
                  accessibilityLabel={[promotion.savings_label, promotion.title]
                    .filter(Boolean)
                    .join(", ")}
                >
                  <View style={styles.offerIcon}>
                    <MaterialIcons
                      name="local-offer"
                      size={moderateWidthScale(18)}
                      color={theme.darkGreen}
                    />
                  </View>
                  <View style={styles.offerCardText}>
                    {!!promotion.savings_label && (
                      <Text style={styles.offerSavings}>
                        {savingsHeadline(promotion)}
                      </Text>
                    )}
                    <Text style={styles.offerTitle} numberOfLines={2}>
                      {promotion.title}
                    </Text>
                    {!!promotion.audience_label && (
                      <Text style={styles.offerAudience}>
                        {promotion.audience_label}
                      </Text>
                    )}
                  </View>
                  <MaterialIcons
                    name="chevron-right"
                    size={moderateWidthScale(22)}
                    color={theme.darkGreenLight}
                  />
                </TouchableOpacity>
              ))
            )}
          </ScrollView>

          {selected ? (
            <View
              style={[
                styles.footer,
                {
                  paddingBottom:
                    Math.max(insets.bottom, moderateHeightScale(12)) +
                    moderateHeightScale(8),
                },
              ]}
            >
              <Button
                title={t("pcuViewEligibleServices")}
                onPress={() => onViewServices(selected)}
              />
              <Text style={styles.footerNote}>{t("pcuAppliesAutomatically")}</Text>
            </View>
          ) : (
            <View
              style={{
                height: Math.max(insets.bottom, moderateHeightScale(12)),
              }}
            />
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      justifyContent: "flex-end",
    },
    sheet: {
      backgroundColor: theme.background,
      borderTopLeftRadius: moderateWidthScale(24),
      borderTopRightRadius: moderateWidthScale(24),
      paddingTop: moderateHeightScale(8),
      maxHeight: "88%",
    },
    handle: {
      alignSelf: "center",
      width: moderateWidthScale(40),
      height: moderateHeightScale(4),
      borderRadius: moderateWidthScale(2),
      backgroundColor: theme.lightGreen015,
      marginBottom: moderateHeightScale(10),
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: moderateWidthScale(20),
      paddingBottom: moderateHeightScale(10),
      gap: moderateWidthScale(8),
    },
    headerButton: {
      width: moderateWidthScale(36),
      height: moderateWidthScale(36),
      alignItems: "center",
      justifyContent: "center",
    },
    headerTitle: {
      flex: 1,
      fontSize: fontSize.size18,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    body: {
      flexGrow: 0,
    },
    bodyContent: {
      paddingHorizontal: moderateWidthScale(20),
      paddingBottom: moderateHeightScale(16),
    },
    offerCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(12),
      padding: moderateWidthScale(14),
      marginBottom: moderateHeightScale(10),
      borderRadius: moderateWidthScale(14),
      backgroundColor: theme.white,
      borderWidth: 1,
      borderColor: theme.goldBorder,
      minHeight: moderateHeightScale(64),
    },
    offerIcon: {
      width: moderateWidthScale(36),
      height: moderateWidthScale(36),
      borderRadius: moderateWidthScale(18),
      backgroundColor: theme.tileGoldCream,
      alignItems: "center",
      justifyContent: "center",
    },
    offerCardText: {
      flex: 1,
    },
    offerSavings: {
      fontSize: fontSize.size18,
      fontFamily: fonts.fontExtraBold,
      color: theme.darkGreen,
    },
    offerTitle: {
      marginTop: moderateHeightScale(2),
      fontSize: fontSize.size14,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
    },
    offerAudience: {
      marginTop: moderateHeightScale(2),
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
    },
    footer: {
      paddingHorizontal: moderateWidthScale(20),
      paddingTop: moderateHeightScale(12),
      borderTopWidth: 1,
      borderTopColor: theme.borderLight,
    },
    footerNote: {
      marginTop: moderateHeightScale(8),
      textAlign: "center",
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
    },
  });
