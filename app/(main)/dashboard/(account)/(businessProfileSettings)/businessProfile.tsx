import React, { useMemo, useState, useCallback } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Image,
} from "react-native";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  moderateHeightScale,
  moderateWidthScale,
  widthScale,
} from "@/src/theme/dimensions";
import StackHeader from "@/src/components/StackHeader";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import { ApiService } from "@/src/services/api";
import { businessEndpoints } from "@/src/services/endpoints";
import SkeletonPlaceholder from "react-native-skeleton-placeholder";

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    content: {
      flex: 1,
      paddingHorizontal: moderateWidthScale(20),
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
    },
    profileImage: {
      width: "100%",
      height: "100%",
      borderRadius: moderateWidthScale(12),
      overflow: "hidden",
    },
    businessNameText: {
      fontSize: fontSize.size24,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      marginBottom: moderateHeightScale(5),
      textAlign: "center",
    },
    sloganText: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      marginBottom: moderateHeightScale(24),
      textAlign: "center",
    },
    editButtonContainer: {
      width: "30%",
      marginBottom: moderateHeightScale(16),
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
    },
    skeletonImage: {
      width: widthScale(120),
      height: widthScale(120),
      borderRadius: moderateWidthScale(12),
      marginBottom: moderateHeightScale(16),
    },
    skeletonTitle: {
      height: moderateHeightScale(28),
      width: moderateWidthScale(200),
      borderRadius: moderateWidthScale(4),
      marginBottom: moderateHeightScale(5),
      alignSelf: "center",
    },
    skeletonSlogan: {
      height: moderateHeightScale(18),
      width: moderateWidthScale(150),
      borderRadius: moderateWidthScale(4),
      marginBottom: moderateHeightScale(24),
      alignSelf: "center",
    },
    skeletonButton: {
      height: moderateHeightScale(44),
      width: moderateWidthScale(100),
      borderRadius: moderateWidthScale(8),
      marginBottom: moderateHeightScale(16),
      alignSelf: "center",
    },
    skeletonNote: {
      height: moderateHeightScale(16),
      width: moderateWidthScale(250),
      borderRadius: moderateWidthScale(4),
      alignSelf: "center",
      marginTop: moderateHeightScale(8),
    },
  });

interface BusinessProfileData {
  title: string;
  slogan: string;
  logo_url: string | null;
  country_code?: string | null;
  phone?: string | null;
}

export default function BusinessProfileScreen() {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [profileData, setProfileData] = useState<BusinessProfileData | null>(null);

  const fetchBusinessProfile = useCallback(async () => {
    setLoading(true);
    try {
      const response = await ApiService.get<{
        success: boolean;
        message: string;
        data: BusinessProfileData;
      }>(businessEndpoints.moduleData("business-profile"));

      if (response.success && response.data) {
        setProfileData(response.data);
      }
    } catch (error: any) {
      console.error("Failed to fetch business profile:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchBusinessProfile();
    }, [fetchBusinessProfile])
  );

  const handleEditPress = () => {
    if (profileData) {
      router.push({
        pathname: "./editBusinessProfile",
        params: {
          title: profileData.title,
          slogan: profileData.slogan || "",
          logo_url: profileData.logo_url || "",
          country_code: profileData.country_code || "",
          phone: profileData.phone || "",
        },
      });
    } else {
      router.push("./editBusinessProfile");
    }
  };

  const getLogoUri = () => {
    if (!profileData?.logo_url) {
      return  "https://imgcdn.stablediffusionweb.com/2024/3/24/3b153c48-649f-4ee2-b1cc-3d45333db028.jpg"
    }
    const baseUrl = process.env.EXPO_PUBLIC_API_BASE_URL || "";
    return `${baseUrl}${profileData.logo_url}`;
  };

  const renderSkeleton = () => (
    <SkeletonPlaceholder backgroundColor="#E8DFB8" highlightColor="#DCCF9E">
      <View style={styles.contentContainer}>
        <View style={styles.skeletonImage} />
        <View style={styles.skeletonTitle} />
        <View style={styles.skeletonSlogan} />
        <View style={styles.skeletonButton} />
        <View style={styles.skeletonNote} />
      </View>
    </SkeletonPlaceholder>
  );

  return (
    <View style={styles.container}>
      <StackHeader title="Business profile" />
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          renderSkeleton()
        ) : (
          <>
            {getLogoUri() && (
              <View style={styles.profileImageContainer}>
                <Image
                  source={{
                    uri: getLogoUri()!,
                  }}
                  style={styles.profileImage}
                  resizeMode="cover"
                />
              </View>
            )}

            <Text style={styles.businessNameText}>
              {profileData?.title || ""}
            </Text>
            <Text style={styles.sloganText}>
              {profileData?.slogan || "Slogan will be here"}
            </Text>

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
              This photo is seen by others when they view your profile, messages
              and reviews.
            </Text>
          </>
        )}
      </ScrollView>
    </View>
  );
}

