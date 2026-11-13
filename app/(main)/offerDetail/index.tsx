import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import StackHeader from "@/src/components/StackHeader";
import Button from "@/src/components/button";
import RetryButton from "@/src/components/retryButton";
import PromotionDetailsContent from "@/src/components/promotion/PromotionDetailsContent";
import { useAppDispatch, useAppSelector, useTheme } from "@/src/hooks/hooks";
import Logger from "@/src/services/logger";
import { fetchPublicPromotion } from "@/src/services/promotionService";
import { setGuestModeModalVisible } from "@/src/state/slices/generalSlice";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import { moderateHeightScale, moderateWidthScale } from "@/src/theme/dimensions";
import type { Promotion, PromotionSource } from "@/src/types/promotion";
import { rememberPromotion } from "@/src/utils/promotionDisplay";

/**
 * One offer from a shared link (/offers/{id}), email or reel.
 * GET /api/promotions/{id}?source= counts a view; 404 = draft, suspended,
 * private or gone. A closed / used-up offer still loads with its message.
 */
export default function OfferDetailScreen() {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);
  const { t } = useTranslation();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id?: string; source?: string }>();
  const isGuest = useAppSelector((state: any) => state.user.isGuest);

  const source: PromotionSource =
    params.source === "reel" ||
    params.source === "email" ||
    params.source === "profile"
      ? params.source
      : "link";

  const [promotion, setPromotion] = useState<Promotion | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    const id = Number(params.id);
    if (!params.id || !Number.isFinite(id)) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(false);
    try {
      const offer = await fetchPublicPromotion(id, source);
      if (!offer) {
        setNotFound(true);
      } else {
        rememberPromotion(offer);
        setPromotion(offer);
        setNotFound(false);
      }
    } catch (err) {
      Logger.error("Failed to load offer:", err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [params.id, source]);

  // Reload after sign-in so eligibility is for this customer
  useEffect(() => {
    void load();
  }, [load, isGuest]);

  const reason = promotion?.eligibility?.reason;
  const isClosed = reason === "not_open" || reason === "limit_reached";

  const openBusiness = () => {
    if (!promotion?.business) return;
    router.push({
      pathname: "/(main)/businessDetail",
      params: {
        business_id: String(promotion.business.id),
        ...(isClosed
          ? {}
          : {
              promotion_id: String(promotion.id),
              promotion_source: source,
            }),
      },
    });
  };

  const renderBody = () => {
    if (loading) {
      return (
        <View style={styles.center}>
          <ActivityIndicator color={theme.darkGreen} />
        </View>
      );
    }
    if (error) {
      return (
        <View style={styles.center}>
          <Text style={styles.stateText}>{t("pcuLoadError")}</Text>
          <RetryButton onPress={() => void load()} />
        </View>
      );
    }
    if (notFound || !promotion) {
      return (
        <View style={styles.center}>
          <View style={styles.stateIcon}>
            <MaterialIcons
              name="local-offer"
              size={moderateWidthScale(26)}
              color={theme.darkGreenLight}
            />
          </View>
          <Text style={styles.stateTitle}>{t("pcuOfferUnavailableTitle")}</Text>
          <Text style={styles.stateText}>{t("pcuOfferUnavailableBody")}</Text>
        </View>
      );
    }
    return (
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {!!promotion.business?.title && (
          <Text style={styles.businessName}>{promotion.business.title}</Text>
        )}
        <PromotionDetailsContent
          promotion={promotion}
          onSignIn={
            isGuest ? () => dispatch(setGuestModeModalVisible(true)) : undefined
          }
        />
      </ScrollView>
    );
  };

  return (
    <View style={styles.container}>
      <StackHeader title={t("pcuOfferDetails")} />
      <View style={styles.flex}>{renderBody()}</View>
      {!loading && !!promotion?.business && (
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
            title={isClosed ? t("pcuViewBusiness") : t("pcuViewEligibleServices")}
            onPress={openBusiness}
          />
          {!isClosed && (
            <Text style={styles.footerNote}>{t("pcuAppliesAutomatically")}</Text>
          )}
        </View>
      )}
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    flex: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: moderateWidthScale(20),
      paddingTop: moderateHeightScale(20),
      paddingBottom: moderateHeightScale(24),
    },
    businessName: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontMedium,
      color: theme.lightGreen,
      marginBottom: moderateHeightScale(6),
    },
    center: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: moderateWidthScale(32),
      gap: moderateHeightScale(10),
    },
    stateIcon: {
      width: moderateWidthScale(56),
      height: moderateWidthScale(56),
      borderRadius: moderateWidthScale(28),
      backgroundColor: theme.lightGreen07,
      alignItems: "center",
      justifyContent: "center",
    },
    stateTitle: {
      fontSize: fontSize.size18,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      textAlign: "center",
    },
    stateText: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      textAlign: "center",
      lineHeight: fontSize.size14 * 1.45,
    },
    footer: {
      paddingHorizontal: moderateWidthScale(20),
      paddingTop: moderateHeightScale(12),
      borderTopWidth: 1,
      borderTopColor: theme.borderLight,
      backgroundColor: theme.background,
    },
    footerNote: {
      marginTop: moderateHeightScale(8),
      textAlign: "center",
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
    },
  });
