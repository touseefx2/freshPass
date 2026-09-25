import React, { useMemo } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppSelector, useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  moderateHeightScale,
  moderateWidthScale,
  widthScale,
} from "@/src/theme/dimensions";
import StackHeader from "@/src/components/StackHeader";
import Button from "@/src/components/button";
import { useNotificationContext } from "@/src/contexts/NotificationContext";

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background },
    content: { flex: 1 },
    contentContainer: {
      flexGrow: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: moderateWidthScale(28),
      gap: moderateHeightScale(14),
    },
    iconWrap: {
      width: widthScale(88),
      height: widthScale(88),
      borderRadius: widthScale(44),
      backgroundColor: theme.buttonBack,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: moderateHeightScale(8),
    },
    title: {
      fontSize: fontSize.size22,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      textAlign: "center",
      lineHeight: fontSize.size28,
    },
    orderId: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontMedium,
      color: theme.lightGreen5,
      textAlign: "center",
    },
    actions: {
      width: "100%",
      marginTop: moderateHeightScale(24),
      gap: moderateHeightScale(10),
    },
  });

export default function OrderConfirmedScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { showBanner } = useNotificationContext();
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);
  const insets = useSafeAreaInsets();
  const { orderId: paramOrderId } = useLocalSearchParams<{ orderId?: string }>();
  const lastOrderId = useAppSelector((s) => s.shopCart.lastOrderId);
  const orderId = paramOrderId || lastOrderId || "FP000000";

  return (
    <View style={styles.container}>
      <StackHeader title="" />
      <ScrollView
        style={styles.content}
        contentContainerStyle={[
          styles.contentContainer,
          { paddingBottom: insets.bottom + moderateHeightScale(24) },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.iconWrap}>
          <MaterialIcons
            name="check"
            size={moderateWidthScale(44)}
            color={theme.buttonText}
          />
        </View>
        <Text style={styles.title}>{t("orderConfirmedTitle")}</Text>
        <Text style={styles.orderId}>
          {t("orderNumber", { id: `#${orderId}` })}
        </Text>

        <View style={styles.actions}>
          <Button
            title={t("viewOrder")}
            onPress={() => {
              showBanner(t("viewOrder"), t("paymentMockNote"), "info");
            }}
          />
          <Button
            title={t("continueShopping")}
            onPress={() => {
              router.replace("/(main)/dashboard/(home)" as any);
            }}
            backgroundColor={theme.white}
            textColor={theme.darkGreen}
            containerStyle={{
              borderWidth: 1,
              borderColor: theme.buttonBack,
            }}
          />
        </View>
      </ScrollView>
    </View>
  );
}
