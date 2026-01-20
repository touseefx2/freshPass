import React, {
  useMemo,
  useState,
  useEffect,
  useRef,
  useCallback,
} from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SvgXml } from "react-native-svg";
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

// Checkbox Icon SVG
const checkboxIconSvg = `
<svg width="{{WIDTH}}" height="{{HEIGHT}}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M9 16.17L4.83 12L3.41 13.41L9 19L21 7L19.59 5.59L9 16.17Z" fill="{{COLOR}}"/>
</svg>
`;

const CheckboxIcon = ({ width = 24, height = 24, color = "#283618" }) => {
  const svgXml = checkboxIconSvg
    .replace(/{{WIDTH}}/g, width.toString())
    .replace(/{{HEIGHT}}/g, height.toString())
    .replace(/{{COLOR}}/g, color);
  return <SvgXml xml={svgXml} />;
};

interface Service {
  id: number;
  name: string;
  description: string;
  price: number;
  originalPrice: number;
  duration: string;
  label?: string | null;
}

interface AddServiceBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  services: Service[];
  selectedServiceIds: number[];
  onUpdateServices: (services: Service[]) => void;
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    serviceListItem: {
      backgroundColor: theme.white,
      marginBottom: moderateHeightScale(12),
      borderBottomWidth: moderateWidthScale(0.5),
      borderBottomColor: theme.darkGreen15,
    },
    serviceCardContent: {
      padding: moderateWidthScale(16),
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    checkboxContainer: {
      width: widthScale(20),
      height: heightScale(18),
      borderRadius: moderateWidthScale(4),
      borderWidth: 1.5,
      borderColor: theme.lightGreen2,
      alignItems: "center",
      justifyContent: "center",
      marginRight: moderateWidthScale(12),
    },
    checkboxChecked: {
      backgroundColor: theme.orangeBrown,
      borderColor: theme.orangeBrown,
    },
    serviceCardLeft: {
      flex: 1,
    },
    serviceLabel: {
      alignSelf: "flex-start",
      backgroundColor: theme.darkGreenLight,
      paddingHorizontal: moderateWidthScale(7),
      paddingVertical: moderateHeightScale(3),
      borderRadius: moderateWidthScale(999),
      marginBottom: moderateHeightScale(8),
    },
    serviceLabelText: {
      fontSize: fontSize.size10,
      fontFamily: fonts.fontMedium,
      color: theme.white,
    },
    serviceName: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
      marginBottom: moderateHeightScale(4),
    },
    serviceDescription: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      marginBottom: moderateHeightScale(8),
    },
    serviceCardRight: {
      alignItems: "flex-end",
      justifyContent: "flex-start",
    },
    servicePriceContainer: {
      flexDirection: "row",
      alignItems: "flex-end",
      gap: moderateWidthScale(8),
      marginBottom: moderateHeightScale(4),
    },
    serviceOriginalPrice: {
      fontSize: fontSize.size11,
      fontFamily: fonts.fontMedium,
      color: theme.lightGreen4,
      textDecorationLine: "line-through",
    },
    servicePrice: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    serviceDuration: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      marginBottom: moderateHeightScale(8),
    },
  });

export default function AddServiceBottomSheet({
  visible,
  onClose,
  services,
  selectedServiceIds,
  onUpdateServices,
}: AddServiceBottomSheetProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors as Theme), [colors]);
  const theme = colors as Theme;
  const [localSelectedIds, setLocalSelectedIds] = useState<number[]>([]);
  const prevVisibleRef = useRef(false);

  useEffect(() => {
    // Only sync when sheet opens (visible changes from false to true)
    if (visible && !prevVisibleRef.current) {
      // Sheet just opened - initialize with current selected service IDs
      setLocalSelectedIds(selectedServiceIds);
    }
    prevVisibleRef.current = visible;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const handleToggleService = (serviceId: number) => {
    const newSelectedIds = localSelectedIds.includes(serviceId)
      ? localSelectedIds.filter((id) => id !== serviceId)
      : [...localSelectedIds, serviceId];

    setLocalSelectedIds(newSelectedIds);
    // Don't update parent immediately - only update when Done is pressed
  };

  const handleDone = () => {
    // Update parent with final selection when Done is pressed
    const selectedServices = services.filter((service) =>
      localSelectedIds.includes(service.id)
    );
    onUpdateServices(selectedServices);
    onClose();
  };

  return (
    <ModalizeBottomSheet
      visible={visible}
      onClose={onClose}
      title="Add another service"
      footerButtonTitle="Done"
      onFooterButtonPress={handleDone}
    >
      {services.map((service) => (
        <TouchableOpacity
        onPress={() => handleToggleService(service.id)}
        activeOpacity={0.8}
        key={service.id} style={styles.serviceListItem}>
          <View style={styles.serviceCardContent}>
            <View
              style={[
                styles.checkboxContainer,
                localSelectedIds.includes(service.id) && styles.checkboxChecked,
              ]}
           
            >
              {localSelectedIds.includes(service.id) && (
                <CheckboxIcon
                  width={widthScale(16)}
                  height={heightScale(16)}
                  color={theme.white}
                />
              )}
            </View>
            <View style={styles.serviceCardLeft}>
              {service.label && (
                <View style={styles.serviceLabel}>
                  <Text style={styles.serviceLabelText}>{service.label}</Text>
                </View>
              )}
              <Text style={styles.serviceName}>{service.name}</Text>
              <Text style={styles.serviceDescription}>
                {service.description}
              </Text>
            </View>
            <View style={styles.serviceCardRight}>
              <View style={styles.servicePriceContainer}>
                <Text style={styles.serviceOriginalPrice}>
                  ${service.originalPrice.toFixed(2)}
                </Text>
                <Text style={styles.servicePrice}>
                  ${service.price.toFixed(2)} USD
                </Text>
              </View>
              <Text style={styles.serviceDuration}>{service.duration}</Text>
            </View>
          </View>
        </TouchableOpacity>
      ))}
    </ModalizeBottomSheet>
  );
}
