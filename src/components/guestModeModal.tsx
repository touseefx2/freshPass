import React, { useMemo } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  TouchableOpacity,
} from "react-native";
import { useTheme, useAppSelector, useAppDispatch } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  moderateWidthScale,
  moderateHeightScale,
  widthScale,
  heightScale,
} from "@/src/theme/dimensions";
import { useRouter } from "expo-router";
import { MAIN_ROUTES } from "@/src/constant/routes";
import { setGuestModeModalVisible } from "@/src/state/slices/generalSlice";
import Button from "@/src/components/button";
import { Feather } from "@expo/vector-icons";
import { ApiService } from "../services/api";

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.6)",
      justifyContent: "center",
      alignItems: "center",
    },
    modalContainer: {
      backgroundColor: theme.background,
      borderRadius: moderateWidthScale(24),
      width: widthScale(340),
      maxWidth: "90%",
      paddingHorizontal: moderateWidthScale(28),
      paddingTop: moderateHeightScale(32),
      paddingBottom: moderateHeightScale(28),
      alignItems: "center",
      shadowColor: theme.shadow,
      shadowOffset: {
        width: 0,
        height: moderateHeightScale(8),
      },
      shadowOpacity: 0.4,
      shadowRadius: moderateWidthScale(16),
      elevation: 12,
    },

    iconContainer: {
      width: 70,
      height: 70,
      borderRadius: 70 / 2,
      backgroundColor: theme.orangeBrown30,
      justifyContent: "center",
      alignItems: "center",
      marginBottom: moderateHeightScale(20),
    },
    title: {
      fontSize: fontSize.size24,
      fontFamily: fonts.fontBold,
      color: theme.text,
      textAlign: "center",
      marginBottom: moderateHeightScale(16),
    },
    message: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontRegular,
      color: theme.text,
      textAlign: "center",
      lineHeight: moderateHeightScale(24),
      marginBottom: moderateHeightScale(32),
      paddingHorizontal: moderateWidthScale(8),
    },
    buttonContainer: {
      width: "100%",
      marginBottom: moderateHeightScale(20),
    },
    skipContainer: {
      marginTop: moderateHeightScale(8),
    },
    skipText: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontMedium,
      color: theme.link,
      textDecorationLine: "underline",
      textDecorationColor: theme.link,
      textAlign: "center",
    },
  });

export default function GuestModeModal() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors as Theme), [colors]);
  const theme = colors as Theme;
  const router = useRouter();
  const dispatch = useAppDispatch();
  const guestModeModalVisible = useAppSelector(
    (state) => state.general.guestModeModalVisible
  );

  const handleClose = () => {
    dispatch(setGuestModeModalVisible(false));
  };

  const handleSignIn = async() => {
    dispatch(setGuestModeModalVisible(false));
    await ApiService.logout();
  };

  const handleSkip = () => {
    dispatch(setGuestModeModalVisible(false));
  };

  return (
    <Modal
      transparent
      visible={guestModeModalVisible}
      animationType="slide"
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      <Pressable style={styles.modalOverlay} onPress={handleClose}>
        <Pressable
          style={styles.modalContainer}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={styles.iconContainer}>
            <Feather
              name="user"
              size={moderateWidthScale(36)}
              color={theme.darkGreen}
            />
          </View>

          <Text style={styles.title}>Guest Mode</Text>

          <Text style={styles.message}>
            You are currently browsing as a guest. To access all features and
            make bookings, please sign in to your account.
          </Text>

          <View style={styles.buttonContainer}>
            <Button title="Sign In" onPress={handleSignIn} />
          </View>

          <TouchableOpacity
            style={styles.skipContainer}
            onPress={handleSkip}
            activeOpacity={0.7}
          >
            <Text style={styles.skipText}>Skip now</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
