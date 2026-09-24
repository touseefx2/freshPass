import React, { useMemo, useState, useCallback } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Image,
} from "react-native";
import { useAppSelector, useTheme } from "@/src/hooks/hooks";
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
import Logger from "@/src/services/logger";
import { businessEndpoints } from "@/src/services/endpoints";
import SkeletonPlaceholder from "react-native-skeleton-placeholder";
import { resolveApiImageUrl } from "@/src/utils/media";
import {
  getDefaultBusinessLogo,
} from "@/src/services/remoteConfigService";

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
      marginBottom: moderateHeightScale(8),
      textAlign: "center",
    },
    sloganText: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      marginBottom: moderateHeightScale(24),
      textAlign: "center",
      paddingHorizontal: moderateWidthScale(12),
    },
    nameOnlySpacer: {
      marginBottom: moderateHeightScale(24),
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
    detailsSection: {
      width: "100%",
      marginTop: moderateHeightScale(28),
      borderTopWidth: 1,
      borderTopColor: theme.lightGreen015,
      paddingTop: moderateHeightScale(20),
    },
    detailRow: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: theme.white,
      borderRadius: moderateWidthScale(14),
      paddingHorizontal: moderateWidthScale(14),
      paddingVertical: moderateHeightScale(14),
      borderWidth: 1,
      borderColor: theme.lightGreen015,
      gap: moderateWidthScale(12),
    },
    categoryIconWrap: {
      width: widthScale(42),
      height: widthScale(42),
      borderRadius: moderateWidthScale(12),
      backgroundColor: theme.orangeBrown015,
      alignItems: "center",
      justifyContent: "center",
    },
    detailTextCol: {
      flex: 1,
      gap: moderateHeightScale(2),
    },
    detailLabel: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
    },
    detailValue: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
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
      marginBottom: moderateHeightScale(8),
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
    skeletonDetail: {
      height: moderateHeightScale(48),
      width: "100%",
      borderRadius: moderateWidthScale(12),
      marginTop: moderateHeightScale(28),
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
  const businessCategoryName = useAppSelector(
    (state) => state.user.businessStatus?.business_category?.name,
  );

  const [loading, setLoading] = useState(true);
  const [profileData, setProfileData] = useState<BusinessProfileData | null>(
    null,
  );

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
      Logger.error("Failed to fetch business profile:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchBusinessProfile();
    }, [fetchBusinessProfile]),
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
    return (
      resolveApiImageUrl(profileData?.logo_url) ??
      getDefaultBusinessLogo() ||
      "https://imgcdn.stablediffusionweb.com/2024/3/24/3b153c48-649f-4ee2-b1cc-3d45333db028.jpg"
    );
  };

  const slogan = profileData?.slogan?.trim() || "";
  const hasSlogan = !!slogan;
  const hasCategory = !!businessCategoryName;

  const renderSkeleton = () => (
    <SkeletonPlaceholder backgroundColor="#E8DFB8" highlightColor="#DCCF9E">
      <View style={styles.contentContainer}>
        <View style={styles.skeletonImage} />
        <View style={styles.skeletonTitle} />
        <View style={styles.skeletonSlogan} />
        <View style={styles.skeletonButton} />
        <View style={styles.skeletonNote} />
        <View style={styles.skeletonDetail} />
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

            {hasSlogan ? (
              <Text style={styles.sloganText}>{slogan}</Text>
            ) : (
              <View style={styles.nameOnlySpacer} />
            )}

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

            {hasCategory && (
              <View style={styles.detailsSection}>
                <View style={styles.detailRow}>
                  <View style={styles.categoryIconWrap}>
                    <MaterialIcons
                      name="storefront"
                      size={moderateWidthScale(22)}
                      color={theme.selectCard}
                    />
                  </View>
                  <View style={styles.detailTextCol}>
                    <Text style={styles.detailLabel}>Category</Text>
                    <Text style={styles.detailValue} numberOfLines={1}>
                      {businessCategoryName}
                    </Text>
                  </View>
                </View>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}
