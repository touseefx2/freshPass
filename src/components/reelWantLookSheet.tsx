import React, { useCallback, useMemo } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  moderateHeightScale,
  moderateWidthScale,
} from "@/src/theme/dimensions";
import ModalizeBottomSheet from "@/src/components/modalizeBottomSheet";
import type { ReelLookResponse } from "@/src/types/reels";

type ActionKey = "tryOn" | "save" | "book";

interface ReelWantLookSheetProps {
  visible: boolean;
  onClose: () => void;
  loading: boolean;
  look: ReelLookResponse | null;
  lookTag?: string | null;
  saved?: boolean;
  onTryOn: () => void;
  onSave: () => void;
  onBook: () => void;
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    lookTag: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontMedium,
      color: theme.lightGreen,
      marginBottom: moderateHeightScale(12),
    },
    loadingWrap: {
      paddingVertical: moderateHeightScale(36),
      alignItems: "center",
      justifyContent: "center",
    },
    actionRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(14),
      paddingVertical: moderateHeightScale(14),
      borderBottomWidth: 1,
      borderBottomColor: theme.borderLight,
    },
    actionRowRecommended: {
      backgroundColor: theme.lightGreen2,
      marginHorizontal: -moderateWidthScale(4),
      paddingHorizontal: moderateWidthScale(14),
      borderRadius: moderateWidthScale(12),
      borderBottomWidth: 0,
      marginBottom: moderateHeightScale(8),
    },
    iconWrap: {
      width: moderateWidthScale(40),
      height: moderateWidthScale(40),
      borderRadius: moderateWidthScale(20),
      backgroundColor: theme.background,
      alignItems: "center",
      justifyContent: "center",
    },
    actionTextCol: {
      flex: 1,
      gap: moderateHeightScale(2),
    },
    actionTitle: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    actionSubtitle: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
    },
    badge: {
      paddingHorizontal: moderateWidthScale(8),
      paddingVertical: moderateHeightScale(3),
      borderRadius: moderateWidthScale(8),
      backgroundColor: theme.orangeBrown,
    },
    badgeText: {
      fontSize: fontSize.size10,
      fontFamily: fonts.fontMedium,
      color: theme.white,
    },
  });

export default function ReelWantLookSheet({
  visible,
  onClose,
  loading,
  look,
  lookTag,
  saved,
  onTryOn,
  onSave,
  onBook,
}: ReelWantLookSheetProps) {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);
  const { t } = useTranslation();

  const creditsRequired = look?.try_on?.credits_required ?? 1;
  const isSaved = saved ?? look?.save?.saved ?? false;
  const recommended = !!look?.try_on?.recommended;
  const tryOnReason = look?.try_on?.reason;
  const bookTitle =
    look?.book?.business_title ||
    look?.book?.service_name ||
    t("bookThisPro");

  const tryOnSubtitle = useMemo(() => {
    if (tryOnReason === "sign_in_required") {
      return t("signInToTryOnLook");
    }
    if (tryOnReason === "insufficient_credits") {
      return t("needCreditsToTryOn", { count: creditsRequired });
    }
    return t("tryOnCostsCredits", { count: creditsRequired });
  }, [creditsRequired, t, tryOnReason]);

  const handlePress = useCallback(
    (key: ActionKey) => {
      onClose();
      // Let Modalize close before stacking another sheet / navigation.
      setTimeout(() => {
        if (key === "tryOn") onTryOn();
        else if (key === "save") onSave();
        else onBook();
      }, 280);
    },
    [onBook, onClose, onSave, onTryOn],
  );

  const tagLabel = lookTag || look?.look_tag;

  return (
    <ModalizeBottomSheet
      visible={visible}
      onClose={onClose}
      title={t("iWantThisLook")}
      maxHeightPercent={0.72}
    >
      {loading || !look ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={theme.darkGreen} />
        </View>
      ) : (
        <View>
          {tagLabel ? (
            <Text style={styles.lookTag}>{tagLabel}</Text>
          ) : null}

          {look.try_on?.available !== false ? (
            <TouchableOpacity
              style={[
                styles.actionRow,
                recommended && styles.actionRowRecommended,
              ]}
              onPress={() => handlePress("tryOn")}
              activeOpacity={0.7}
            >
              <View style={styles.iconWrap}>
                <MaterialIcons
                  name="face-retouching-natural"
                  size={moderateWidthScale(22)}
                  color={theme.darkGreen}
                />
              </View>
              <View style={styles.actionTextCol}>
                <Text style={styles.actionTitle}>{t("tryItOnMe")}</Text>
                <Text style={styles.actionSubtitle}>{tryOnSubtitle}</Text>
              </View>
              {recommended ? (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{t("recommended")}</Text>
                </View>
              ) : (
                <MaterialIcons
                  name="chevron-right"
                  size={moderateWidthScale(22)}
                  color={theme.lightGreen}
                />
              )}
            </TouchableOpacity>
          ) : null}

          <TouchableOpacity
            style={styles.actionRow}
            onPress={() => handlePress("save")}
            activeOpacity={0.7}
          >
            <View style={styles.iconWrap}>
              <MaterialIcons
                name={isSaved ? "bookmark" : "bookmark-border"}
                size={moderateWidthScale(22)}
                color={theme.darkGreen}
              />
            </View>
            <View style={styles.actionTextCol}>
              <Text style={styles.actionTitle}>
                {isSaved ? t("savedToMyLooks") : t("saveToMyLooks")}
              </Text>
              <Text style={styles.actionSubtitle}>
                {isSaved ? t("tapToUnsaveLook") : t("saveLookForLater")}
              </Text>
            </View>
            <MaterialIcons
              name="chevron-right"
              size={moderateWidthScale(22)}
              color={theme.lightGreen}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionRow, { borderBottomWidth: 0 }]}
            onPress={() => handlePress("book")}
            activeOpacity={0.7}
          >
            <View style={styles.iconWrap}>
              <MaterialIcons
                name="event-available"
                size={moderateWidthScale(22)}
                color={theme.darkGreen}
              />
            </View>
            <View style={styles.actionTextCol}>
              <Text style={styles.actionTitle}>{t("bookThisPro")}</Text>
              <Text style={styles.actionSubtitle} numberOfLines={1}>
                {look.book?.service_name
                  ? `${look.book.service_name}${look.book.business_title ? ` · ${look.book.business_title}` : ""}`
                  : bookTitle}
              </Text>
            </View>
            <MaterialIcons
              name="chevron-right"
              size={moderateWidthScale(22)}
              color={theme.lightGreen}
            />
          </TouchableOpacity>
        </View>
      )}
    </ModalizeBottomSheet>
  );
}
