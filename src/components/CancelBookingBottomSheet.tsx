import React, { useMemo, useState, useEffect, useRef } from "react";
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

// Radio Button Icon SVG (filled circle)
const radioIconSvg = `
<svg width="{{WIDTH}}" height="{{HEIGHT}}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
<circle cx="12" cy="12" r="10" fill="{{COLOR}}"/>
</svg>
`;

const RadioIcon = ({ width = 20, height = 20, color = "#BC6C25" }) => {
  const svgXml = radioIconSvg
    .replace(/{{WIDTH}}/g, width.toString())
    .replace(/{{HEIGHT}}/g, height.toString())
    .replace(/{{COLOR}}/g, color);
  return <SvgXml xml={svgXml} />;
};

interface CancelBookingBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (reason: string) => void;
}

const cancellationReasons = [
  "Service provider verification",
  "Booked by mistake",
  "Service provider delayed or didn't show up",
  "Price was too high",
  "Issue with location or travel",
  "Not feeling well",
  "Poor communication from provider",
  "Incorrect booking details",
  "Other (please specify)",
];

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    reasonItem: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: moderateHeightScale(16),
      borderBottomWidth: 1,
      borderBottomColor: theme.borderLight,
    },
    radioContainer: {
      width: widthScale(20),
      height: heightScale(20),
      borderRadius: moderateWidthScale(10),
      borderWidth: moderateWidthScale(1.5),
      borderColor: theme.lightGreen2,
      alignItems: "center",
      justifyContent: "center",
      marginRight: moderateWidthScale(12),
    },
    radioContainerSelected: {
     borderColor: theme.lightGreen,
    },
     
    reasonText: {
      flex: 1,
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.darkGreen,
    },
  });

export default function CancelBookingBottomSheet({
  visible,
  onClose,
  onSubmit,
}: CancelBookingBottomSheetProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors as Theme), [colors]);
  const theme = colors as Theme;
  const [selectedReason, setSelectedReason] = useState<string>("");
  const prevVisibleRef = useRef(false);

  useEffect(() => {
    // Reset selection when sheet opens
    if (visible && !prevVisibleRef.current) {
      setSelectedReason("");
    }
    prevVisibleRef.current = visible;
  }, [visible]);

  const handleSelectReason = (reason: string) => {
    setSelectedReason(reason);
  };

  const handleSubmit = () => {
    if (selectedReason) {
      onSubmit(selectedReason);
      onClose();
    }
  };

  return (
    <ModalizeBottomSheet
      visible={visible}
      onClose={onClose}
      title="Reason to cancel"
      footerButtonTitle="Submit"
      onFooterButtonPress={handleSubmit}
      footerButtonDisabled={!selectedReason}
    >
      {cancellationReasons.map((reason, index) => (
        <TouchableOpacity
          key={index}
          onPress={() => handleSelectReason(reason)}
          activeOpacity={0.7}
          style={styles.reasonItem}
        >
          <View
            style={[
              styles.radioContainer,
              selectedReason === reason && styles.radioContainerSelected,
            ]}
          >
            {selectedReason === reason && (
              <RadioIcon
                width={moderateWidthScale(12)}
                height={moderateWidthScale(12)}
                color={theme.orangeBrown}
              />
            )}
          </View>
          <Text style={styles.reasonText}>{reason}</Text>
        </TouchableOpacity>
      ))}
    </ModalizeBottomSheet>
  );
}

