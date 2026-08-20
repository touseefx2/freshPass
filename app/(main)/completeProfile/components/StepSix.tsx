import React, { useMemo } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  moderateHeightScale,
  moderateWidthScale,
} from "@/src/theme/dimensions";
import FloatingInput from "@/src/components/floatingInput";
import { Feather } from "@expo/vector-icons";

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      gap: moderateHeightScale(24),
      paddingHorizontal: moderateWidthScale(20),
    },
    titleSec: {
      marginTop: moderateHeightScale(8),
      gap: 5,
    },
    title: {
      fontSize: fontSize.size24,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    subtitle: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
    },
    inputSection: {
      gap: moderateHeightScale(4),
    },
    inputRowContainer: {
      flexDirection: "row",
      gap: moderateWidthScale(12),
    },
    inviteButton: {
      backgroundColor: theme.orangeBrown,
      borderRadius: moderateWidthScale(8),
      paddingHorizontal: moderateWidthScale(17),
      alignItems: "center",
      justifyContent: "center",
    },
    inviteButtonDisabled: {
      backgroundColor: theme.lightGreen2,
      opacity: 0.6,
    },
    inviteButtonText: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
    },
    inputSectionDisabled: {
      opacity: 0.45,
    },
    noticeCard: {
      backgroundColor: theme.white,
      borderRadius: moderateWidthScale(12),
      borderWidth: 1,
      borderColor: theme.borderLight,
      paddingHorizontal: moderateWidthScale(16),
      paddingVertical: moderateHeightScale(16),
      gap: moderateHeightScale(10),
    },
    noticeHeader: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: moderateWidthScale(12),
    },
    noticeIconWrap: {
      width: moderateWidthScale(36),
      height: moderateWidthScale(36),
      borderRadius: moderateWidthScale(18),
      backgroundColor: theme.orangeBrown30,
      alignItems: "center",
      justifyContent: "center",
    },
    noticeTitle: {
      flex: 1,
      fontSize: fontSize.size14,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    noticeText: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      lineHeight: fontSize.size20,
    },
  });

export default function StepSix() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors as Theme), [colors]);
  const theme = colors as Theme;

  return (
    <View style={styles.container}>
      <View style={styles.titleSec}>
        <Text style={styles.title}>Add staff members</Text>
        <Text style={styles.subtitle}>
          Invite your staff by email. They&apos;ll be able to manage their
          schedule and appointments.
        </Text>
      </View>

      <View
        style={[styles.inputSection, styles.inputSectionDisabled]}
        pointerEvents="none"
      >
        <View style={styles.inputRowContainer}>
          <FloatingInput
            label="Email"
            value=""
            onChangeText={() => {}}
            placeholder="Enter email"
            placeholderTextColor={theme.lightGreen2}
            keyboardType="email-address"
            autoCapitalize="none"
            editable={false}
            showClearButton={false}
            containerStyle={{ flex: 1 }}
          />
          <TouchableOpacity
            disabled
            style={[styles.inviteButton, styles.inviteButtonDisabled]}
            activeOpacity={1}
          >
            <Text style={styles.inviteButtonText}>Invite</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.noticeCard}>
        <View style={styles.noticeHeader}>
          <View style={styles.noticeIconWrap}>
            <Feather
              name="info"
              size={moderateWidthScale(18)}
              color={theme.darkGreen}
            />
          </View>
          <Text style={styles.noticeTitle}>You can&apos;t add staff yet</Text>
        </View>
        <Text style={styles.noticeText}>
          First tap Continue and complete onboarding. After that, connecting
          Stripe and choosing a business plan will decide whether you can add
          staff.
        </Text>
        <Text style={styles.noticeText}>For now, just tap Continue.</Text>
      </View>
    </View>
  );
}
