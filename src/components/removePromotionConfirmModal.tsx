import React, { useMemo } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  TouchableOpacity,
} from "react-native";
import { useTheme } from "@/src/hooks/hooks";
import { useTranslation } from "react-i18next";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  moderateWidthScale,
  moderateHeightScale,
  widthScale,
  iconScale,
} from "@/src/theme/dimensions";
import { Feather } from "@expo/vector-icons";
import Button from "@/src/components/button";

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    modalOverlay: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: moderateWidthScale(24),
    },
    overlayFill: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: theme.black,
      opacity: 0.5,
    },
    modalContainer: {
      backgroundColor: theme.white,
      borderRadius: moderateWidthScale(28),
      width: "100%",
      maxWidth: widthScale(340),
      paddingHorizontal: moderateWidthScale(24),
      paddingTop: moderateHeightScale(32),
      paddingBottom: moderateHeightScale(20),
      alignItems: "center",
      shadowColor: theme.shadow,
      shadowOffset: {
        width: 0,
        height: moderateHeightScale(8),
      },
      shadowOpacity: 0.15,
      shadowRadius: moderateWidthScale(20),
      elevation: 8,
    },
    iconCircle: {
      width: moderateWidthScale(72),
      height: moderateWidthScale(72),
      borderRadius: moderateWidthScale(36),
      backgroundColor: theme.lightGreen05,
      justifyContent: "center",
      alignItems: "center",
      marginBottom: moderateHeightScale(20),
    },
    title: {
      fontSize: fontSize.size22,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      textAlign: "center",
      marginBottom: moderateHeightScale(10),
    },
    message: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      textAlign: "center",
      lineHeight: fontSize.size22,
      marginBottom: moderateHeightScale(28),
      paddingHorizontal: moderateWidthScale(4),
    },
    buttonContainer: {
      width: "100%",
      gap: moderateHeightScale(4),
    },
    secondaryButton: {
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: moderateHeightScale(14),
      minHeight: moderateHeightScale(44),
    },
    secondaryButtonText: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontMedium,
      color: theme.red,
      textAlign: "center",
    },
    neutralText: {
      color: theme.lightGreen,
    },
  });

interface RemovePromotionConfirmModalProps {
  visible: boolean;
  /** "promote" = add the promotion back (Stripe) */
  mode?: "remove" | "promote";
  /** promote: formatted add-on price, e.g. "$20" */
  promotionPrice?: string | null;
  /** promote: formatted monthly total with the promotion, e.g. "$80" */
  totalWithPromotion?: string | null;
  /** Already formatted, e.g. "November 23, 2026" */
  endDate: string;
  /** Already formatted base price, e.g. "$60.00" */
  basePrice: string;
  onClose: () => void;
  onConfirm: () => void;
}

/** Stripe only: Apple customers make this change in Apple's own sheet. */
export default function RemovePromotionConfirmModal({
  visible,
  mode = "remove",
  promotionPrice,
  totalWithPromotion,
  endDate,
  basePrice,
  onClose,
  onConfirm,
}: RemovePromotionConfirmModalProps) {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);
  const { t } = useTranslation();

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <Pressable style={styles.overlayFill} onPress={onClose} />
        <Pressable
          style={styles.modalContainer}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={styles.iconCircle}>
            <Feather
              name={mode === "promote" ? "trending-up" : "tag"}
              size={iconScale(30)}
              color={theme.darkGreen}
            />
          </View>

          {mode === "promote" ? (
            <>
              <Text style={styles.title}>{t("promoteConfirmTitle")}</Text>
              <Text style={styles.message}>
                {promotionPrice && totalWithPromotion
                  ? t("promoteConfirmMessage", {
                      price: promotionPrice,
                      total: totalWithPromotion,
                    })
                  : t("promoteConfirmMessageNoPrice")}
              </Text>
              <View style={styles.buttonContainer}>
                <Button
                  title={t("promoteMyBusiness")}
                  onPress={onConfirm}
                  backgroundColor={theme.bookNowButton}
                  textColor={theme.darkGreen}
                />
                <TouchableOpacity
                  style={styles.secondaryButton}
                  onPress={onClose}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                >
                  <Text style={[styles.secondaryButtonText, styles.neutralText]}>
                    {t("notNow")}
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <>
              <Text style={styles.title}>{t("removePromotionConfirmTitle")}</Text>

              <Text style={styles.message}>
                {t("removePromotionConfirmMessage", {
                  date: endDate,
                  price: basePrice,
                })}
              </Text>

              <View style={styles.buttonContainer}>
                <Button title={t("keepMyBusinessFeatured")} onPress={onClose} />
                <TouchableOpacity
                  style={styles.secondaryButton}
                  onPress={onConfirm}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                >
                  <Text style={styles.secondaryButtonText}>
                    {t("removePromotionAddOn")}
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </Pressable>
      </View>
    </Modal>
  );
}
