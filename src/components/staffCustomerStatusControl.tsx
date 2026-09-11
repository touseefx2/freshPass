import React, { useMemo, useCallback, useRef, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  iconScale,
  moderateHeightScale,
  moderateWidthScale,
  widthScale,
} from "@/src/theme/dimensions";
import CustomToggle from "@/src/components/customToggle";
import Button from "@/src/components/button";

interface StaffCustomerStatusControlProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
  loading?: boolean;
  disabled?: boolean;
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(6),
    },
    chip: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(6),
      paddingLeft: moderateWidthScale(8),
      paddingRight: moderateWidthScale(4),
      paddingVertical: moderateHeightScale(3),
      borderRadius: moderateWidthScale(20),
      backgroundColor: theme.white15,
    },
    dot: {
      width: moderateWidthScale(6),
      height: moderateWidthScale(6),
      borderRadius: moderateWidthScale(6) / 2,
    },
    dotOnline: {
      backgroundColor: theme.toggleActive,
    },
    dotOffline: {
      backgroundColor: theme.white50,
    },
    label: {
      fontSize: fontSize.size11,
      fontFamily: fonts.fontBold,
      color: theme.white,
    },
    infoButton: {
      width: moderateWidthScale(22),
      height: moderateWidthScale(22),
      borderRadius: moderateWidthScale(11),
      alignItems: "center",
      justifyContent: "center",
    },
    loader: {
      width: moderateWidthScale(45),
      height: moderateHeightScale(25),
      alignItems: "center",
      justifyContent: "center",
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: moderateWidthScale(24),
    },
    modalContainer: {
      backgroundColor: theme.white,
      borderRadius: moderateWidthScale(28),
      width: "100%",
      maxWidth: widthScale(340),
      paddingHorizontal: moderateWidthScale(24),
      paddingTop: moderateHeightScale(32),
      paddingBottom: moderateHeightScale(20),
      alignItems: "center",
      shadowColor: theme.shadow,
      shadowOffset: {
        width: 0,
        height: moderateHeightScale(8),
      },
      shadowOpacity: 0.15,
      shadowRadius: moderateWidthScale(20),
      elevation: 8,
    },
    iconWrap: {
      width: moderateWidthScale(100),
      height: moderateWidthScale(100),
      alignItems: "center",
      justifyContent: "center",
      marginBottom: moderateHeightScale(16),
    },
    iconHalo: {
      position: "absolute",
      width: moderateWidthScale(88),
      height: moderateWidthScale(88),
      borderRadius: moderateWidthScale(44),
      backgroundColor: theme.lightGreen05,
    },
    iconCircle: {
      width: moderateWidthScale(64),
      height: moderateWidthScale(64),
      borderRadius: moderateWidthScale(32),
      backgroundColor: theme.buttonBack,
      justifyContent: "center",
      alignItems: "center",
      zIndex: 1,
    },
    title: {
      fontSize: fontSize.size20,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      textAlign: "center",
      marginBottom: moderateHeightScale(10),
    },
    message: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      textAlign: "center",
      lineHeight: fontSize.size22,
      marginBottom: moderateHeightScale(24),
      paddingHorizontal: moderateWidthScale(4),
    },
    buttonContainer: {
      width: "100%",
    },
  });

export default function StaffCustomerStatusControl({
  value,
  onValueChange,
  loading = false,
  disabled = false,
}: StaffCustomerStatusControlProps) {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);
  const { t } = useTranslation();
  const lastValueRef = useRef(value);
  const [infoVisible, setInfoVisible] = useState(false);

  useEffect(() => {
    lastValueRef.current = value;
  }, [value]);

  const handleToggle = useCallback(
    (nextValue: boolean) => {
      if (disabled || loading) return;
      if (nextValue === lastValueRef.current) return;
      lastValueRef.current = nextValue;
      onValueChange(nextValue);
    },
    [disabled, loading, onValueChange],
  );

  const openInfo = useCallback(() => {
    setInfoVisible(true);
  }, []);

  const closeInfo = useCallback(() => {
    setInfoVisible(false);
  }, []);

  return (
    <View style={styles.row}>
      <View style={styles.chip}>
        <View
          style={[
            styles.dot,
            value ? styles.dotOnline : styles.dotOffline,
          ]}
        />
        <Text style={styles.label}>
          {value ? t("customerStatusOnline") : t("customerStatusOffline")}
        </Text>
        {loading ? (
          <View style={styles.loader}>
            <ActivityIndicator size="small" color={theme.white} />
          </View>
        ) : (
          <CustomToggle
            value={value}
            onValueChange={handleToggle}
            disabled={disabled}
            activeTrackColor={theme.toggleActive}
            inactiveTrackColor={theme.white50}
          />
        )}
      </View>

      <TouchableOpacity
        style={styles.infoButton}
        onPress={openInfo}
        activeOpacity={0.75}
        hitSlop={10}
        accessibilityLabel={t("customerStatusInfoTitle")}
      >
        <Feather
          name="info"
          size={moderateWidthScale(14)}
          color={theme.white70}
        />
      </TouchableOpacity>

      <Modal
        transparent
        visible={infoVisible}
        animationType="fade"
        statusBarTranslucent
        onRequestClose={closeInfo}
      >
        <Pressable style={styles.modalOverlay} onPress={closeInfo}>
          <Pressable
            style={styles.modalContainer}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.iconWrap}>
              <View style={styles.iconHalo} />
              <View style={styles.iconCircle}>
                <Feather
                  name="info"
                  size={iconScale(28)}
                  color={theme.white}
                />
              </View>
            </View>

            <Text style={styles.title}>{t("customerStatusInfoTitle")}</Text>
            <Text style={styles.message}>
              {t("customerStatusInfoMessage")}
            </Text>

            <View style={styles.buttonContainer}>
              <Button title={t("ok")} onPress={closeInfo} />
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
