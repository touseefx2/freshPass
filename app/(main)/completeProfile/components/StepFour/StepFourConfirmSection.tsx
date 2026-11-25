import React, { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTheme } from "@/src/hooks/hooks";
import { useTranslation } from "react-i18next";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  moderateHeightScale,
  moderateWidthScale,
} from "@/src/theme/dimensions";
import FloatingInput from "@/src/components/floatingInput";

interface StepFourConfirmSectionProps {
  streetAddress: string;
  area: string;
  state: string;
  zipCode: string;
  onChangeStreet: (value: string) => void;
  onChangeArea: (value: string) => void;
  onChangeState: (value: string) => void;
  onChangeZip: (value: string) => void;
  onEditAddress: () => void;
  isFetchingDetails: boolean;
  notice?: string | null;
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      paddingHorizontal: moderateWidthScale(20),
    },
    main: {
      flex: 1,
      gap: moderateHeightScale(20),
     
    },
    labelRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom:4
    },
    label: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
    },
    changeButton: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
      textDecorationLine:"underline",
      textDecorationColor:theme.darkGreen
    },
    infoText: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
    },
  });

export default function StepFourConfirmSection({
  streetAddress,
  area,
  state,
  zipCode,
  onChangeStreet,
  onChangeArea,
  onChangeState,
  onChangeZip,
  onEditAddress,
  isFetchingDetails,
  notice,
}: StepFourConfirmSectionProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors as Theme), [colors]);
  const theme = colors as Theme;
  const placeholderColor = theme.lightGreen2;

  const handleClearStreet = () => {
    onChangeStreet("");
  };

  const handleClearArea = () => {
    onChangeArea("");
  };

  const handleClearState = () => {
    onChangeState("");
  };

  const handleClearZip = () => {
    onChangeZip("");
  };

  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <Text style={styles.label}></Text>
        <Pressable onPress={onEditAddress}>
          <Text style={styles.changeButton}>{t("searchLocation")}</Text>
        </Pressable>
      </View>

      <View style={styles.main}>
        <FloatingInput
          label={t("streetAddress")}
          value={streetAddress}
          onChangeText={onChangeStreet}
          placeholder={t("streetAddress")}
          placeholderTextColor={placeholderColor}
          onClear={handleClearStreet}
        />

        <FloatingInput
          label={t("areaCity")}
          value={area}
          onChangeText={onChangeArea}
          placeholder={t("areaCity")}
          placeholderTextColor={placeholderColor}
          onClear={handleClearArea}
        />

        <FloatingInput
          label={t("state")}
          value={state}
          onChangeText={onChangeState}
          placeholder={t("state")}
          placeholderTextColor={placeholderColor}
          onClear={handleClearState}
        />

        <FloatingInput
          label={t("custProfileZipCode")}
          value={zipCode}
          onChangeText={onChangeZip}
          placeholder={t("zipCodeOptional")}
          placeholderTextColor={placeholderColor}
          keyboardType="number-pad"
          onClear={handleClearZip}
        />

        {(isFetchingDetails || notice) && (
          <Text style={styles.infoText}>
            {notice ?? t("addrConfirmLoadingAddress")}
          </Text>
        )}
      </View>
    </View>
  );
}
