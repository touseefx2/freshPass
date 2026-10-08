import React, { useMemo } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useAppSelector, useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  heightScale,
  moderateHeightScale,
  moderateWidthScale,
  widthScale,
} from "@/src/theme/dimensions";
import FlowHeader from "@/src/components/reelFlow/flowHeader";
import FlowFooter from "@/src/components/reelFlow/flowFooter";
import { InfoNote } from "@/src/components/reelFlow/flowParts";
import { useNotificationContext } from "@/src/contexts/NotificationContext";

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background },
    content: { flex: 1 },
    contentContainer: {
      flexGrow: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: moderateWidthScale(24),
      paddingVertical: moderateHeightScale(24),
      gap: moderateHeightScale(14),
    },
    ring: {
      width: widthScale(132),
      height: widthScale(132),
      borderRadius: widthScale(66),
      backgroundColor: theme.lightGreen07,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: moderateHeightScale(8),
    },
    iconWrap: {
      width: widthScale(92),
      height: widthScale(92),
      borderRadius: widthScale(46),
      backgroundColor: theme.buttonBack,
      alignItems: "center",
      justifyContent: "center",
    },
    title: {
      fontSize: fontSize.size24,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      textAlign: "center",
      lineHeight: fontSize.size30,
    },
    orderPill: {
      minHeight: heightScale(40),
      paddingHorizontal: moderateWidthScale(18),
      borderRadius: heightScale(20),
      backgroundColor: theme.white,
      borderWidth: 1,
      borderColor: theme.borderNormal,
      alignItems: "center",
      justifyContent: "center",
    },
    orderId: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      fontVariant: ["tabular-nums"],
    },
    note: {
      alignSelf: "stretch",
      marginTop: moderateHeightScale(10),
    },
  });

/** After payment: order placed. */
export default function OrderConfirmedScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { showBanner } = useNotificationContext();
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { orderId: paramOrderId } = useLocalSearchParams<{ orderId?: string }>();
  const lastOrderId = useAppSelector((s) => s.shopCart.lastOrderId);
  const orderId = paramOrderId || lastOrderId || "FP000000";

  const goHome = () => router.replace("/(main)/dashboard/(home)" as any);

  return (
    <View style={styles.container}>
      <FlowHeader title={t("shopFlowTitle")} onBack={goHome} backIcon="close" />
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.ring}>
          <View style={styles.iconWrap}>
            <MaterialIcons
              name="check"
              size={moderateWidthScale(48)}
              color={theme.white}
            />
          </View>
        </View>
        <Text style={styles.title} accessibilityRole="header">
          {t("orderConfirmedTitle")}
        </Text>
        <View style={styles.orderPill}>
          <Text style={styles.orderId}>
            {t("orderNumber", { id: `#${orderId}` })}
          </Text>
        </View>
        <InfoNote
          icon="notifications-none"
          text={t("shopConfirmedNote")}
          style={styles.note}
        />
      </ScrollView>
      <FlowFooter
        secondary={{
          label: t("viewOrder"),
          onPress: () =>
            paramOrderId || lastOrderId
              ? router.push({
                  pathname: "/(main)/shop/orderDetail" as any,
                  params: { orderId },
                })
              : showBanner(t("viewOrder"), t("paymentMockNote"), "info"),
          icon: "receipt-long",
        }}
        primary={{
          label: t("continueShopping"),
          onPress: goHome,
        }}
      />
    </View>
  );
}
