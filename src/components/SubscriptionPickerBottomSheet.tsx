import React, { useMemo, useState, useEffect, useRef } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  heightScale,
  moderateHeightScale,
  moderateWidthScale,
  widthScale,
} from "@/src/theme/dimensions";
import ModalizeBottomSheet from "@/src/components/modalizeBottomSheet";

interface SubscriptionPlan {
  id: number;
  name: string;
  price: number | string;
  original_price?: number | string;
  visits: number;
  services?: Array<{
    id: number;
    name: string;
  }>;
}

interface SubscriptionPickerBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  subscriptions: SubscriptionPlan[];
  selectedSubscriptionId: number | null;
  onSelectSubscription: (subscription: SubscriptionPlan) => void;
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    subscriptionListItem: {
      backgroundColor: theme.white,
      marginBottom: moderateHeightScale(12),
      borderBottomWidth: moderateWidthScale(0.5),
      borderBottomColor: theme.darkGreen15,
    },
    subscriptionCardContent: {
      padding: moderateWidthScale(16),
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    radioButton: {
      width: moderateWidthScale(20),
      height: moderateWidthScale(20),
      borderRadius: moderateWidthScale(10),
      borderWidth: 2,
      borderColor: theme.lightGreen2,
      alignItems: "center",
      justifyContent: "center",
      marginRight: moderateWidthScale(12),
    },
    radioButtonSelected: {
      borderColor: theme.orangeBrown,
    },
    radioButtonInner: {
      width: moderateWidthScale(10),
      height: moderateWidthScale(10),
      borderRadius: moderateWidthScale(5),
      backgroundColor: theme.orangeBrown,
    },
    subscriptionCardLeft: {
      flex: 1,
    },
    subscriptionName: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
      marginBottom: moderateHeightScale(4),
      textTransform: "capitalize",
    },
    subscriptionVisits: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      marginBottom: moderateHeightScale(8),
    },
    subscriptionCardRight: {
      alignItems: "flex-end",
      justifyContent: "flex-start",
    },
    subscriptionPriceContainer: {
      flexDirection: "row",
      alignItems: "flex-end",
      gap: moderateWidthScale(8),
      marginBottom: moderateHeightScale(4),
    },
    subscriptionOriginalPrice: {
      fontSize: fontSize.size11,
      fontFamily: fonts.fontMedium,
      color: theme.lightGreen4,
      textDecorationLine: "line-through",
    },
    subscriptionPrice: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
  });

export default function SubscriptionPickerBottomSheet({
  visible,
  onClose,
  subscriptions,
  selectedSubscriptionId,
  onSelectSubscription,
}: SubscriptionPickerBottomSheetProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors as Theme), [colors]);
  const theme = colors as Theme;
  const [localSelectedId, setLocalSelectedId] = useState<number | null>(null);
  const prevVisibleRef = useRef(false);

  useEffect(() => {
    // Only sync when sheet opens (visible changes from false to true)
    if (visible && !prevVisibleRef.current) {
      // Sheet just opened - initialize with current selected subscription ID
      setLocalSelectedId(selectedSubscriptionId);
    }
    prevVisibleRef.current = visible;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const handleSelectSubscription = (subscription: SubscriptionPlan) => {
    // Only update local state - don't close sheet or update parent yet
    setLocalSelectedId(subscription.id);
  };

  const handleDone = () => {
    // Only apply selection when Done is pressed
    if (localSelectedId !== null) {
      const selectedSubscription = subscriptions.find(
        (sub) => sub.id === localSelectedId,
      );
      if (selectedSubscription) {
        onSelectSubscription(selectedSubscription);
      }
    }
    onClose();
  };

  return (
    <ModalizeBottomSheet
      visible={visible}
      onClose={onClose}
      title={t("changeSubscription")}
      footerButtonTitle="Done"
      onFooterButtonPress={handleDone}
    >
      {subscriptions.map((subscription) => {
        // Parse price to number (handle both string and number)
        const price =
          typeof subscription.price === "string"
            ? parseFloat(subscription.price)
            : subscription.price;

        // Parse original_price to number if it exists
        const originalPriceValue = subscription.original_price
          ? typeof subscription.original_price === "string"
            ? parseFloat(subscription.original_price)
            : subscription.original_price
          : price * 1.25;

        const isSelected = localSelectedId === subscription.id;

        return (
          <TouchableOpacity
            onPress={() => handleSelectSubscription(subscription)}
            activeOpacity={0.8}
            key={subscription.id}
            style={styles.subscriptionListItem}
          >
            <View style={styles.subscriptionCardContent}>
              <View
                style={[
                  styles.radioButton,
                  isSelected && styles.radioButtonSelected,
                ]}
              >
                {isSelected && <View style={styles.radioButtonInner} />}
              </View>
              <View style={styles.subscriptionCardLeft}>
                <Text style={styles.subscriptionName}>{subscription.name}</Text>
                <Text style={styles.subscriptionVisits}>
                  {subscription.visits} visit
                  {subscription.visits !== 1 ? "s" : ""} per month
                </Text>
              </View>
              <View style={styles.subscriptionCardRight}>
                <View style={styles.subscriptionPriceContainer}>
                  <Text style={styles.subscriptionOriginalPrice}>
                    ${originalPriceValue.toFixed(2)}
                  </Text>
                  <Text style={styles.subscriptionPrice}>
                    ${price.toFixed(2)} USD
                  </Text>
                </View>
              </View>
            </View>
          </TouchableOpacity>
        );
      })}
    </ModalizeBottomSheet>
  );
}
