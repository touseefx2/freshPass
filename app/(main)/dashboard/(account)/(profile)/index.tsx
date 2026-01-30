import React, { use, useMemo } from "react";
import Logger from "@/src/services/logger";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Image,
} from "react-native";
import { useTheme, useAppSelector } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  moderateHeightScale,
  moderateWidthScale,
  widthScale,
} from "@/src/theme/dimensions";
import StackHeader from "@/src/components/StackHeader";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    content: {
      flex: 1,
    },
    contentContainer: {
      paddingVertical: moderateHeightScale(24),
      alignItems: "center",
    },
    profileImageContainer: {
      width: widthScale(120),
      height: widthScale(120),
      borderRadius: moderateWidthScale(12),
      overflow: "hidden",
      marginBottom: moderateHeightScale(16),
      borderWidth: 1,
      borderColor: theme.borderLight,
      marginHorizontal: moderateWidthScale(20),
    },
    profileImage: {
      width: "100%",
      height: "100%",
      borderRadius: moderateWidthScale(12),
      overflow: "hidden",
    },
    nameText: {
      fontSize: fontSize.size24,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      marginBottom: moderateHeightScale(5),
      marginHorizontal: moderateWidthScale(20),
      textAlign: "center",
    },
    emailText: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.darkGreen,
      marginBottom: moderateHeightScale(24),
      marginHorizontal: moderateWidthScale(20),
      textAlign: "center",
    },
    staffInfoCard: {
      width: "100%",
      backgroundColor: theme.lightGreen1,
      paddingHorizontal: moderateWidthScale(18),
      paddingVertical: moderateHeightScale(14),
      marginVertical: moderateHeightScale(16),
      borderTopWidth: 1,
      borderBottomWidth: 1,
      borderColor: theme.borderLight,
    },
    staffInfoText: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: theme.darkGreen,
      lineHeight: moderateHeightScale(22),
    },
    editButtonContainer: {
      width: "30%",
      marginBottom: moderateHeightScale(16),
      marginHorizontal: moderateWidthScale(20),
    },
    editButton: {
      backgroundColor: theme.darkGreen,
      borderRadius: moderateWidthScale(8),
      paddingVertical: moderateHeightScale(12),
      paddingHorizontal: moderateWidthScale(20),
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: moderateWidthScale(8),
    },
    editButtonText: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontMedium,
      color: theme.buttonText,
    },
    privacyNote: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      textAlign: "center",
      paddingHorizontal: moderateWidthScale(20),
      marginHorizontal: moderateWidthScale(20),
    },
    changePasswordRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      width: "100%",
      paddingHorizontal: moderateWidthScale(20),
    },
    changePasswordText: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontRegular,
      color: theme.darkGreen,
    },
    line: {
      height: 1,
      width: "100%",
      backgroundColor: theme.borderLight,
      marginVertical: moderateHeightScale(20),
      marginHorizontal: moderateWidthScale(20),
    },
  });

export default function ProfileScreen() {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);
  const router = useRouter();
  const user = useAppSelector((state) => state.user);

  const handleEditPress = () => {
    router.push("./editProfile");
  };

  const handleChangePasswordPress = () => {
    router.push("./changePassword");
  };

  const profileImageUri = user?.profile_image_url
    ? user.profile_image_url.startsWith("http://") ||
      user.profile_image_url.startsWith("https://")
      ? user.profile_image_url
      : process.env.EXPO_PUBLIC_API_BASE_URL + user.profile_image_url
    : "https://imgcdn.stablediffusionweb.com/2024/3/24/3b153c48-649f-4ee2-b1cc-3d45333db028.jpg";
  const userName = user.name || "";
  const userEmail = user.email || "";

  return (
    <View style={styles.container}>
      <StackHeader title="Profile" />
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.profileImageContainer}>
          <Image
            source={{
              uri: profileImageUri,
            }}
            style={styles.profileImage}
            resizeMode="cover"
          />
        </View>

        <Text style={styles.nameText}>{userName}</Text>
        <Text style={styles.emailText}>{userEmail}</Text>

        <View style={styles.editButtonContainer}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={handleEditPress}
            style={styles.editButton}
          >
            <MaterialIcons
              name="edit"
              size={moderateWidthScale(18)}
              color={theme.buttonText}
            />
            <Text style={styles.editButtonText}>Edit</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.privacyNote}>
          {user?.userRole === "staff"
            ? "This photo is seen by others when they view your profile."
            : "This photo is seen by others when they view your business profile, messages and reviews."}
        </Text>

        {user?.userRole === "staff" && (
          <View style={styles.staffInfoCard}>
            <Text style={styles.staffInfoText}>
              Staff details are optional, businesses can choose whether to list
              staff members in their profile. There is no separate availability
              calendar per staff member, they follow the business hours, and
              services are just linked to specific staff to highlight their
              expertise.
            </Text>
          </View>
        )}

        {user?.userRole !== "staff" && <View style={styles.line} />}

        <TouchableOpacity
          activeOpacity={0.7}
          onPress={handleChangePasswordPress}
          style={styles.changePasswordRow}
        >
          <Text style={styles.changePasswordText}>Change password</Text>
          <MaterialIcons
            name="keyboard-arrow-right"
            size={moderateWidthScale(18)}
            color={theme.darkGreen}
          />
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}
