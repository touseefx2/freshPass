import React, { useMemo } from "react";
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  Image,
  StatusBar,
  TouchableOpacity,
  Alert,
} from "react-native";
import { useTheme, useAppSelector } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { useRouter, useLocalSearchParams, useFocusEffect } from "expo-router";
import { useTranslation } from "react-i18next";
import { useDispatch } from "react-redux";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  moderateHeightScale,
  moderateWidthScale,
  widthScale,
  heightScale,
} from "@/src/theme/dimensions";
import { MaterialIcons } from "@expo/vector-icons";
import StackHeader from "@/src/components/StackHeader";
import RetryButton from "@/src/components/retryButton";
import { ApiService } from "@/src/services/api";
import { staffEndpoints } from "@/src/services/endpoints";
import { setActionLoader } from "@/src/state/slices/generalSlice";
import { useNotificationContext } from "@/src/contexts/NotificationContext";
import { ChatIcon } from "@/assets/icons";

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    loaderContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
    },
    errorContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: moderateWidthScale(20),
    },
    errorText: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontRegular,
      color: theme.text,
      textAlign: "center",
      marginBottom: moderateHeightScale(16),
    },
    scrollContent: {
      paddingBottom: moderateHeightScale(40),
    },
    profileSection: {
      alignItems: "center",
      paddingVertical: moderateHeightScale(24),
      paddingHorizontal: moderateWidthScale(20),
    },
    avatar: {
      width: widthScale(100),
      height: widthScale(100),
      borderRadius: widthScale(100 / 2),
      borderWidth: 1,
      borderColor: theme.borderLight,
      // overflow: "hidden",
      marginBottom: moderateHeightScale(12),
      position: "relative",
    },
    avatarImage: {
      width: "100%",
      height: "100%",
      borderRadius: widthScale(100 / 2),
    },
    staffName: {
      fontSize: fontSize.size22,
      fontFamily: fonts.fontBold,
      color: theme.text,
      marginBottom: moderateHeightScale(4),
    },
    description: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      textAlign: "center",
    },
    card: {
      backgroundColor: theme.lightGreen1,
      marginHorizontal: moderateWidthScale(20),
      marginBottom: moderateHeightScale(16),
      padding: moderateWidthScale(16),
      borderRadius: moderateWidthScale(12),
    },
    headerRightIcons: {
      flexDirection: "row",
      alignItems: "center",
    },
    headerEditIcon: {
      marginLeft: moderateWidthScale(10),
    },
    messageRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: moderateWidthScale(8),
      paddingTop: moderateHeightScale(14),
      marginTop: moderateHeightScale(10),
      borderTopWidth: 1,
      borderTopColor: theme.borderLine,
    },
    messageRowText: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
      textTransform: "capitalize",
    },
    cardTitle: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      marginBottom: moderateHeightScale(8),
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: moderateHeightScale(6),
    },
    label: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontMedium,
      color: theme.text,
      width: widthScale(120),
    },
    value: {
      flex: 1,
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
    },
    workingDayRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: moderateHeightScale(8),
      borderBottomWidth: 1,
      borderBottomColor: theme.borderLine,
    },
    workingDayRowLast: {
      borderBottomWidth: 0,
    },
    dayText: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontMedium,
      color: theme.text,
    },
    timeText: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
    },
    closedText: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      fontStyle: "italic",
    },
    hoursScroll: {
      marginTop: moderateHeightScale(8),
    },
    hoursCardsContainer: {
      paddingVertical: moderateHeightScale(4),
      paddingHorizontal: moderateWidthScale(4),
      gap: moderateWidthScale(12),
    },
    hoursCard: {
      minWidth: widthScale(110),
      paddingHorizontal: moderateWidthScale(12),
      paddingVertical: moderateHeightScale(10),
      borderRadius: moderateWidthScale(10),
      backgroundColor: theme.background,
      borderWidth: 1,
      borderColor: theme.borderLine,
      justifyContent: "center",
      gap: moderateHeightScale(4),
    },
    hoursDay: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontMedium,
      color: theme.text,
      textTransform: "capitalize",
    },
    hoursTime: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
    },
    hoursBreak: {
      fontSize: fontSize.size11,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen5,
      marginTop: moderateHeightScale(4),
    },
    leaveCard: {
      minWidth: widthScale(100),
      minHeight: heightScale(72),
      paddingHorizontal: moderateWidthScale(12),
      paddingVertical: moderateHeightScale(12),
      borderRadius: moderateWidthScale(10),
      backgroundColor: theme.background,
      borderWidth: 1,
      borderColor: theme.borderLine,
      justifyContent: "center",
      gap: moderateHeightScale(4),
    },
    statusDot: {
      position: "absolute",
      right: 12,
      bottom: 5,
      width: widthScale(12),
      height: widthScale(12),
      borderRadius: widthScale(6),
      zIndex: 9999,
    },
    invitationStatus: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontMedium,
      color: theme.lightGreen,
      textAlign: "center",
      marginTop: moderateHeightScale(8),
      paddingHorizontal: moderateWidthScale(16),
    },
    invitationStatusPending: {
      color: theme.orangeBrown,
    },

    reinviteLink: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontMedium,
      color: theme.lightGreen,
      textDecorationLine: "underline",
      textDecorationColor: theme.lightGreen,
    },
  });

export default function CustomerDetail() {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);
  const router = useRouter();
  const dispatch = useDispatch();
  const { t } = useTranslation();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <StackHeader
        title={t("cusDetail")}
        rightIcon={
          isBusinessRole ? (
            <View style={styles.headerRightIcons}>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={confirmDeleteStaff}
              >
                <MaterialIcons
                  name="delete-outline"
                  size={moderateWidthScale(20)}
                  color={theme.white}
                />
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={handleEditPress}
                style={styles.headerEditIcon}
              >
                <MaterialIcons
                  name="edit"
                  size={moderateWidthScale(20)}
                  color={theme.white}
                />
              </TouchableOpacity>
            </View>
          ) : undefined
        }
      />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      ></ScrollView>
    </View>
  );
}
