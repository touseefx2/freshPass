import React, { useMemo, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useAppSelector, useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  moderateHeightScale,
  moderateWidthScale,
} from "@/src/theme/dimensions";
import ModalizeBottomSheet from "@/src/components/modalizeBottomSheet";

interface ServicePickerBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  selectedServiceIds: string[];
  onSelectServices: (serviceIds: string[]) => void;
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

export default function ServicePickerBottomSheet({
  visible,
  onClose,
  selectedServiceIds,
  onSelectServices,
}: ServicePickerBottomSheetProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors as Theme), [colors]);
  const theme = colors as Theme;
  const { businessServices } = useAppSelector((state) => state.completeProfile);
  const [localSelectedIds, setLocalSelectedIds] =
    useState<string[]>(selectedServiceIds);

  // Convert business services to service format
  // Use id (business service id) for API calls
  const availableServices = useMemo(() => {
    return businessServices.map((service) => ({
      id: service.id.toString(),
      name: service.name,
      hours: service.duration_hours,
      minutes: service.duration_minutes,
      price: parseFloat(service.price),
      currency: "USD",
    }));
  }, [businessServices]);

  React.useEffect(() => {
    if (visible) {
      setLocalSelectedIds(selectedServiceIds);
    }
  }, [visible, selectedServiceIds]);

  // Get all service IDs
  const allServiceIds = useMemo(
    () => availableServices.map((s) => s.id),
    [availableServices],
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
    // Handle service toggle
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
    onSelectServices(localSelectedIds);
    onClose();
  };

  const renderServiceItem = (
    service: (typeof availableServices)[0],
    showBorder: boolean = true,
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
  const showAllOver = availableServices.length > 0;

  return (
    <ModalizeBottomSheet
      visible={visible}
      onClose={onClose}
      title={t("selectServices")}
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
      {availableServices.map((service) => renderServiceItem(service))}
    </ModalizeBottomSheet>
  );
}
