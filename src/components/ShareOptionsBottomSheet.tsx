import React, { useMemo } from "react";
import { StyleSheet, Text, TouchableOpacity } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useTheme } from "@/src/hooks/hooks";
import { useTranslation } from "react-i18next";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  moderateHeightScale,
  moderateWidthScale,
} from "@/src/theme/dimensions";
import ModalizeBottomSheet from "@/src/components/modalizeBottomSheet";

interface ShareOptionsBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  onSelectInAppUser: () => void;
  onSelectNativeShare: () => void;
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    optionItem: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: moderateHeightScale(16),
      borderBottomWidth: 1,
      borderBottomColor: theme.borderLight,
    },
    optionIcon: {
      marginRight: moderateWidthScale(16),
    },
    optionText: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontRegular,
      color: theme.darkGreen,
      flex: 1,
    },
  });

export default function ShareOptionsBottomSheet({
  visible,
  onClose,
  onSelectInAppUser,
  onSelectNativeShare,
}: ShareOptionsBottomSheetProps) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);

  const handleInAppUser = () => {
    onClose();
    onSelectInAppUser();
  };

  const handleNativeShare = () => {
    onClose();
    onSelectNativeShare();
  };

  return (
    <ModalizeBottomSheet
      visible={visible}
      onClose={onClose}
      title={t("shareOptions")}
    >
      <TouchableOpacity
        style={styles.optionItem}
        onPress={handleInAppUser}
        activeOpacity={0.7}
      >
        <MaterialIcons
          name="people"
          size={moderateWidthScale(24)}
          color={theme.darkGreen}
          style={styles.optionIcon}
        />
        <Text style={styles.optionText}>{t("shareWithInAppUser")}</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.optionItem}
        onPress={handleNativeShare}
        activeOpacity={0.7}
      >
        <MaterialIcons
          name="share"
          size={moderateWidthScale(24)}
          color={theme.darkGreen}
          style={styles.optionIcon}
        />
        <Text style={styles.optionText}>{t("shareViaPhoneApp")}</Text>
      </TouchableOpacity>
    </ModalizeBottomSheet>
  );
}
