import React, { useMemo, useState, useEffect, useRef } from "react";
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SvgXml } from "react-native-svg";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  moderateHeightScale,
  moderateWidthScale,
  widthScale,
} from "@/src/theme/dimensions";
import ModalizeBottomSheet from "@/src/components/modalizeBottomSheet";

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
  feeNotice?: string | null;
  userRole?: "customer" | "business" | "staff";
}

const CUSTOMER_REASONS = [
  "Not feeling well",
  "Can't make it",
  "Bad weather",
  "Other",
];

const PRO_REASONS = ["Can't make it", "Had to leave", "Other"];

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    reasonItem: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: moderateHeightScale(14),
      borderBottomWidth: 1,
      borderBottomColor: theme.borderLight,
    },
    radioContainer: {
      width: widthScale(22),
      height: widthScale(22),
      borderRadius: widthScale(11),
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
    feeNoticeBox: {
      backgroundColor: theme.orangeBrown01,
      borderRadius: moderateWidthScale(10),
      borderWidth: 1,
      borderColor: theme.orangeBrown30,
      paddingHorizontal: moderateWidthScale(14),
      paddingVertical: moderateHeightScale(10),
      marginBottom: moderateHeightScale(12),
    },
    feeNoticeText: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
      lineHeight: fontSize.size20,
    },
    otherInput: {
      borderWidth: 1,
      borderColor: theme.borderLight,
      borderRadius: moderateWidthScale(8),
      paddingHorizontal: moderateWidthScale(12),
      paddingVertical: moderateHeightScale(10),
      marginTop: moderateHeightScale(8),
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.darkGreen,
      minHeight: moderateHeightScale(44),
      textAlignVertical: "top",
    },
  });

export default function CancelBookingBottomSheet({
  visible,
  onClose,
  onSubmit,
  feeNotice,
  userRole = "customer",
}: CancelBookingBottomSheetProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors as Theme), [colors]);
  const theme = colors as Theme;
  const [selectedReason, setSelectedReason] = useState<string>("");
  const [otherText, setOtherText] = useState("");
  const prevVisibleRef = useRef(false);

  const reasons =
    userRole === "customer" ? CUSTOMER_REASONS : PRO_REASONS;

  useEffect(() => {
    if (visible && !prevVisibleRef.current) {
      setSelectedReason("");
      setOtherText("");
    }
    prevVisibleRef.current = visible;
  }, [visible]);

  const handleSubmit = () => {
    if (!selectedReason) return;
    const reason =
      selectedReason === "Other" && otherText.trim()
        ? `Other: ${otherText.trim()}`
        : selectedReason;
    onSubmit(reason);
    onClose();
  };

  return (
    <ModalizeBottomSheet
      visible={visible}
      onClose={onClose}
      title={t("reasonToCancel")}
      footerButtonTitle={t("confirmCancellation")}
      onFooterButtonPress={handleSubmit}
      footerButtonDisabled={!selectedReason}
    >
      {feeNotice ? (
        <View style={styles.feeNoticeBox}>
          <Text style={styles.feeNoticeText}>{feeNotice}</Text>
        </View>
      ) : null}
      {reasons.map((reason) => (
        <TouchableOpacity
          key={reason}
          onPress={() => setSelectedReason(reason)}
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
      {selectedReason === "Other" ? (
        <TextInput
          style={styles.otherInput}
          placeholder={t("typeYourReason")}
          placeholderTextColor={theme.lightGreen2}
          value={otherText}
          onChangeText={setOtherText}
          maxLength={200}
          multiline
        />
      ) : null}
    </ModalizeBottomSheet>
  );
}
