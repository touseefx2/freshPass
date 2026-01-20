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
  addService,
  removeService,
} from "@/src/state/slices/completeProfileSlice";
import ModalizeBottomSheet from "@/src/components/modalizeBottomSheet";

interface ServiceListBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  suggestions: Array<{
    id: string;
    name: string;
    hours: number;
    minutes: number;
    price: number;
    currency: string;
  }>;
  selectedServiceIds: string[];
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    sectionTitle: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontBold,
      color: theme.lightGreen4,
      marginBottom: moderateHeightScale(12),
    },
    serviceItem: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: moderateHeightScale(14),
      borderBottomWidth: 1,
      borderBottomColor: theme.borderLight,
    },
    serviceName: {
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

export default function ServiceListBottomSheet({
  visible,
  onClose,
  suggestions,
  selectedServiceIds,
}: ServiceListBottomSheetProps) {
  const dispatch = useAppDispatch();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors as Theme), [colors]);
  const theme = colors as Theme;
  const [localSelectedIds, setLocalSelectedIds] =
    useState<string[]>(selectedServiceIds);

  React.useEffect(() => {
    if (visible) {
      setLocalSelectedIds(selectedServiceIds);
    }
  }, [visible, selectedServiceIds]);

  // Get all service IDs (excluding "all-over" if it exists in suggestions)
  const allServiceIds = useMemo(
    () => suggestions.filter((s) => s.id !== "all-over").map((s) => s.id),
    [suggestions]
  );

  // Check if all services are selected
  const areAllServicesSelected = useMemo(() => {
    return (
      allServiceIds.length > 0 &&
      allServiceIds.every((id) => localSelectedIds.includes(id))
    );
  }, [allServiceIds, localSelectedIds]);

  const handleToggleAllOver = () => {
      if (areAllServicesSelected) {
        // Unselect all services
        setLocalSelectedIds([]);
      } else {
        // Select all services
        setLocalSelectedIds([...allServiceIds]);
      }
  };

  const handleToggleService = (serviceId: string) => {
      // Handle regular service toggle
      const isSelected = localSelectedIds.includes(serviceId);
      if (isSelected) {
        // Remove this service
        setLocalSelectedIds(localSelectedIds.filter((id) => id !== serviceId));
      } else {
        // Add this service
        setLocalSelectedIds([...localSelectedIds, serviceId]);
    }
  };

  const handleSelect = () => {
    // Add newly selected services
    const newlySelected = suggestions.filter(
      (s) =>
        localSelectedIds.includes(s.id) && !selectedServiceIds.includes(s.id)
    );

    // Remove unselected services
    const toRemove = selectedServiceIds.filter(
      (id) => !localSelectedIds.includes(id)
    );

    newlySelected.forEach((service) => {
      dispatch(addService(service));
    });

    toRemove.forEach((id) => {
      dispatch(removeService(id));
    });

    onClose();
  };

  const renderServiceItem = (
    service: (typeof suggestions)[0],
    showBorder: boolean = true
  ) => {
    const isSelected = localSelectedIds.includes(service.id);
    return (
      <TouchableOpacity
        activeOpacity={0.7}
        key={service.id}
        style={[styles.serviceItem, !showBorder && { borderBottomWidth: 0 }]}
        onPress={() => handleToggleService(service.id)}
      >
        <Text style={styles.serviceName}>{service.name}</Text>
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
            {isSelected ? "Selected" : "+  Select"}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  // Show "All over" only if there are services
  const showAllOver = suggestions.length > 0;

  return (
    <ModalizeBottomSheet
      visible={visible}
      onClose={onClose}
      title="Select services"
      footerButtonTitle="Select"
      onFooterButtonPress={handleSelect}
    >
      {/* All over - always show at top if services exist */}
      {showAllOver && (
        <>
          <TouchableOpacity
            activeOpacity={0.7}
            style={[styles.serviceItem, { borderBottomWidth: 0 }]}
            onPress={handleToggleAllOver}
          >
            <Text style={styles.serviceName}>All over</Text>
            <View
              style={[
                styles.selectButton,
                areAllServicesSelected && styles.selectedButton,
              ]}
            >
              {areAllServicesSelected && (
                <Feather
                  name="check"
                  size={moderateWidthScale(14)}
                  color={theme.darkGreen}
                />
              )}
              <Text style={[styles.selectButtonText]}>
                {areAllServicesSelected ? "Selected" : "+  Select"}
              </Text>
            </View>
          </TouchableOpacity>

      {/* Separator line */}
      <View style={styles.separator} />
        </>
      )}

      {/* Popular starting points section */}
      <Text style={styles.sectionTitle}>Popular starting points:</Text>
      {suggestions
        .filter((service) => service.id !== "all-over")
        .map((service) => renderServiceItem(service))}
    </ModalizeBottomSheet>
  );
}

