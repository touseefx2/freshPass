import React, { useMemo, useState } from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useAppDispatch, useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  moderateHeightScale,
  moderateWidthScale,
} from "@/src/theme/dimensions";
import {
  addSubscription,
  removeSubscription,
} from "@/src/state/slices/completeProfileSlice";
import ModalizeBottomSheet from "@/src/components/modalizeBottomSheet";

interface SubscriptionListBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  suggestions: Array<{
    id: string;
    packageName: string;
    servicesPerMonth: number;
    price: number;
    currency: string;
    serviceIds: string[];
  }>;
  selectedSubscriptionIds: string[];
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    sectionTitle: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontBold,
      color: theme.lightGreen4,
      marginBottom: moderateHeightScale(12),
    },
    subscriptionItem: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: moderateHeightScale(14),
      borderBottomWidth: 1,
      borderBottomColor: theme.borderLight,
    },
    subscriptionName: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
      flex: 1,
    },
    selectButton: {
      paddingHorizontal: moderateWidthScale(10),
      paddingVertical: moderateHeightScale(6),
      borderRadius: moderateWidthScale(6),
      borderWidth: 1,
      borderColor: theme.lightGreen2,
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(4),
    },
    selectButtonText: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
    },
    selectedButton: {
      backgroundColor: theme.orangeBrown,
      borderColor: theme.orangeBrown,
    },
    separator: {
      height: 1,
      width: "100%",
      backgroundColor: theme.borderLight,
      marginVertical: moderateHeightScale(12),
    },
  });

export default function SubscriptionListBottomSheet({
  visible,
  onClose,
  suggestions,
  selectedSubscriptionIds,
}: SubscriptionListBottomSheetProps) {
  const dispatch = useAppDispatch();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors as Theme), [colors]);
  const theme = colors as Theme;
  const [localSelectedIds, setLocalSelectedIds] =
    useState<string[]>(selectedSubscriptionIds);

  React.useEffect(() => {
    if (visible) {
      setLocalSelectedIds(selectedSubscriptionIds);
    }
  }, [visible, selectedSubscriptionIds]);

  const handleToggleSubscription = (subscriptionId: string) => {
    const isSelected = localSelectedIds.includes(subscriptionId);
    if (isSelected) {
      setLocalSelectedIds(
        localSelectedIds.filter((id) => id !== subscriptionId)
      );
    } else {
      setLocalSelectedIds([...localSelectedIds, subscriptionId]);
    }
  };

  const handleSelect = () => {
    // Add newly selected subscriptions
    const newlySelected = suggestions.filter(
      (s) =>
        localSelectedIds.includes(s.id) && !selectedSubscriptionIds.includes(s.id)
    );

    // Remove unselected subscriptions
    const toRemove = selectedSubscriptionIds.filter(
      (id) => !localSelectedIds.includes(id)
    );

    newlySelected.forEach((subscription) => {
      dispatch(addSubscription(subscription));
    });

    toRemove.forEach((id) => {
      dispatch(removeSubscription(id));
    });

    onClose();
  };

  const renderSubscriptionItem = (
    subscription: (typeof suggestions)[0],
    showBorder: boolean = true
  ) => {
    const isSelected = localSelectedIds.includes(subscription.id);
    return (
      <TouchableOpacity
        activeOpacity={0.7}
        key={subscription.id}
        style={[styles.subscriptionItem, !showBorder && { borderBottomWidth: 0 }]}
        onPress={() => handleToggleSubscription(subscription.id)}
      >
        <Text style={styles.subscriptionName}>{subscription.packageName}</Text>
        <View
          style={[styles.selectButton, isSelected && styles.selectedButton]}
        >
          {isSelected && (
            <Feather
              name="check"
              size={moderateWidthScale(14)}
              color={theme.darkGreen}
            />
          )}
          <Text style={[styles.selectButtonText]}>
            {isSelected ? "Selected" : "Select"}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  // Filter out selected subscriptions from the list
  const unselectedSuggestions = suggestions.filter(
    (s) => !localSelectedIds.includes(s.id)
  );

  return (
    <ModalizeBottomSheet
      visible={visible}
      onClose={onClose}
      title="Select subscription plans"
      footerButtonTitle="Select"
      onFooterButtonPress={handleSelect}
    >
      {/* Popular starting points section */}
      <Text style={styles.sectionTitle}>Popular starting points:</Text>
      {unselectedSuggestions.map((subscription) => renderSubscriptionItem(subscription))}
    </ModalizeBottomSheet>
  );
}

