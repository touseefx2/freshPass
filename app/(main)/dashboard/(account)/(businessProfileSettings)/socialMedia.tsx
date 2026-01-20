import React, { useMemo, useState, useEffect, useCallback } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TextInput,
  Keyboard,
  Pressable,
} from "react-native";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  moderateHeightScale,
  moderateWidthScale,
} from "@/src/theme/dimensions";
import StackHeader from "@/src/components/StackHeader";
import Button from "@/src/components/button";
import { SafeAreaView } from "react-native-safe-area-context";
import { ApiService } from "@/src/services/api";
import { businessEndpoints } from "@/src/services/endpoints";
import { useNotificationContext } from "@/src/contexts/NotificationContext";
import { useRouter } from "expo-router";
import SkeletonPlaceholder from "react-native-skeleton-placeholder";
import { CloseIcon } from "@/assets/icons";

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
    },
    titleSection: {
      marginBottom: moderateHeightScale(32),
    },
    title: {
      fontSize: fontSize.size24,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    subTitle: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontRegular,
      color: theme.darkGreen,
    },
    formGroup: {
      gap: moderateHeightScale(16),
    },
    field: {
      borderRadius: moderateWidthScale(8),
      borderWidth: 1,
      borderColor: theme.lightGreen2,
      backgroundColor: theme.white,
      paddingHorizontal: moderateWidthScale(12),
      paddingTop: moderateHeightScale(18),
      paddingBottom: moderateHeightScale(12),
    },
    label: {
      position: "absolute",
      left: moderateWidthScale(13),
      top: moderateHeightScale(4),
      color: theme.lightGreen,
      fontFamily: fonts.fontRegular,
      fontSize: fontSize.size11,
    },
    inputRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(4),
    },
    prefix: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontMedium,
      color: theme.lightGreen,
    },
    input: {
      flex: 1,
      fontSize: fontSize.size15,
      fontFamily: fonts.fontRegular,
      color: theme.darkGreen,
      paddingVertical: 0,
      textAlignVertical: "center",
      includeFontPadding: false,
    },
    clearButton: {
      padding: moderateWidthScale(4),
    },
    continueButtonContainer: {
      paddingHorizontal: moderateWidthScale(20),
      paddingBottom: moderateHeightScale(24),
      paddingTop: moderateHeightScale(16),
    },
    skeletonTitle: {
      height: moderateHeightScale(28),
      width: "70%",
      borderRadius: moderateWidthScale(4),
      marginBottom: moderateHeightScale(8),
    },
    skeletonSubtitle: {
      height: moderateHeightScale(18),
      width: "50%",
      borderRadius: moderateWidthScale(4),
      marginBottom: moderateHeightScale(32),
    },
    skeletonField: {
      height: moderateHeightScale(60),
      width: "100%",
      borderRadius: moderateWidthScale(8),
      marginBottom: moderateHeightScale(16),
    },
  });

interface SocialMediaData {
  social_media_links: {
    facebook?: string;
    instagram?: string;
    tiktok?: string;
  };
}

// Helper function to extract username from URL
const extractUsername = (url: string, prefix: string): string => {
  if (!url) return "";
  // Remove https:// if present
  let cleanUrl = url.replace(/^https?:\/\//, "");
  if (cleanUrl.startsWith(prefix)) {
    return cleanUrl.substring(prefix.length);
  }
  return cleanUrl;
};

// Helper function to build full URL
const buildFullUrl = (username: string, prefix: string): string => {
  if (!username || username.trim() === "") return "";
  return prefix + username.trim();
};

export default function SocialMediaScreen() {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);
  const router = useRouter();
  const { showBanner } = useNotificationContext();

  const [loading, setLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  const TIKTOK_PREFIX = "www.tiktok.com/";
  const INSTAGRAM_PREFIX = "www.instagram.com/";
  const FACEBOOK_PREFIX = "www.facebook.com/";

  const [tiktokUsername, setTiktokUsername] = useState("");
  const [instagramUsername, setInstagramUsername] = useState("");
  const [facebookUsername, setFacebookUsername] = useState("");

  const fetchSocialMedia = useCallback(async () => {
    setLoading(true);
    try {
      const response = await ApiService.get<{
        success: boolean;
        message: string;
        data: SocialMediaData;
      }>(businessEndpoints.moduleData("social-media"));

      if (response.success && response.data?.social_media_links) {
        const links = response.data.social_media_links;
        setTiktokUsername(extractUsername(links.tiktok || "", TIKTOK_PREFIX));
        setInstagramUsername(
          extractUsername(links.instagram || "", INSTAGRAM_PREFIX)
        );
        setFacebookUsername(
          extractUsername(links.facebook || "", FACEBOOK_PREFIX)
        );
      }
    } catch (error: any) {
      console.error("Failed to fetch social media:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSocialMedia();
  }, []);

  const handleTiktokChange = (username: string) => {
    setTiktokUsername(username);
  };

  const handleInstagramChange = (username: string) => {
    setInstagramUsername(username);
  };

  const handleFacebookChange = (username: string) => {
    setFacebookUsername(username);
  };

  const handleClearTiktok = () => {
    setTiktokUsername("");
  };

  const handleClearInstagram = () => {
    setInstagramUsername("");
  };

  const handleClearFacebook = () => {
    setFacebookUsername("");
  };

  const handleUpdate = async () => {
    Keyboard.dismiss();
    setIsUpdating(true);

    try {
      const socialMediaLinks: {
        facebook?: string;
        instagram?: string;
        tiktok?: string;
      } = {};

      const tiktokUrl = buildFullUrl(tiktokUsername, TIKTOK_PREFIX);
      const instagramUrl = buildFullUrl(instagramUsername, INSTAGRAM_PREFIX);
      const facebookUrl = buildFullUrl(facebookUsername, FACEBOOK_PREFIX);

      if (facebookUrl && facebookUrl.trim() !== "") {
        socialMediaLinks.facebook = "https://" + facebookUrl.trim();
      }
      if (instagramUrl && instagramUrl.trim() !== "") {
        socialMediaLinks.instagram = "https://" + instagramUrl.trim();
      }
      if (tiktokUrl && tiktokUrl.trim() !== "") {
        socialMediaLinks.tiktok = "https://" + tiktokUrl.trim();
      }

      const requestBody = {
        step: "10",
        social_media_links: socialMediaLinks,
      };

      const response = await ApiService.post<{
        success: boolean;
        message: string;
        data?: any;
      }>(businessEndpoints.profile, requestBody);

      if (response.success) {
        showBanner(
          "Success",
          response.message || "Social media updated successfully",
          "success",
          3000
        );

        router.back();
      } else {
        showBanner(
          "Error",
          response.message || "Failed to update social media",
          "error",
          3000
        );
      }
    } catch (error: any) {
      console.error("Failed to update social media:", error);
      showBanner(
        "Error",
        error.message || "Failed to update social media. Please try again.",
        "error",
        3000
      );
    } finally {
      setIsUpdating(false);
    }
  };

  const renderSkeleton = () => (
    <SkeletonPlaceholder backgroundColor="#E8DFB8" highlightColor="#DCCF9E">
      <View style={styles.titleSection}>
        <View style={styles.skeletonTitle} />
        <View style={styles.skeletonSubtitle} />
      </View>
      <View style={styles.formGroup}>
        <View style={styles.skeletonField} />
        <View style={styles.skeletonField} />
        <View style={styles.skeletonField} />
      </View>
    </SkeletonPlaceholder>
  );

  return (
    <SafeAreaView edges={["bottom"]} style={styles.container}>
      <StackHeader title="Your social media" />
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {loading ? (
          renderSkeleton()
        ) : (
          <>
            <View style={styles.titleSection}>
              <Text style={styles.title}>
                Link your social media account
                <Text style={styles.subTitle}> (if any)</Text>
              </Text>
            </View>

            <View style={styles.formGroup}>
              <View style={styles.field}>
                <Text style={styles.label}>TikTok</Text>
                <View style={styles.inputRow}>
                  <Text style={styles.prefix}>{TIKTOK_PREFIX}</Text>
                  <TextInput
                    style={styles.input}
                    value={tiktokUsername}
                    onChangeText={handleTiktokChange}
                    placeholder="username"
                    placeholderTextColor={theme.lightGreen2}
                  />
                  {tiktokUsername && tiktokUsername.trim() !== "" && (
                    <Pressable
                      onPress={handleClearTiktok}
                      style={styles.clearButton}
                      hitSlop={moderateWidthScale(8)}
                    >
                      <CloseIcon color={theme.darkGreen} />
                    </Pressable>
                  )}
                </View>
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Instagram</Text>
                <View style={styles.inputRow}>
                  <Text style={styles.prefix}>{INSTAGRAM_PREFIX}</Text>
                  <TextInput
                    style={styles.input}
                    value={instagramUsername}
                    onChangeText={handleInstagramChange}
                    placeholder="username"
                    placeholderTextColor={theme.lightGreen2}
                  />
                  {instagramUsername && instagramUsername.trim() !== "" && (
                    <Pressable
                      onPress={handleClearInstagram}
                      style={styles.clearButton}
                      hitSlop={moderateWidthScale(8)}
                    >
                      <CloseIcon color={theme.darkGreen} />
                    </Pressable>
                  )}
                </View>
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Facebook</Text>
                <View style={styles.inputRow}>
                  <Text style={styles.prefix}>{FACEBOOK_PREFIX}</Text>
                  <TextInput
                    style={styles.input}
                    value={facebookUsername}
                    onChangeText={handleFacebookChange}
                    placeholder="username"
                    placeholderTextColor={theme.lightGreen2}
                  />
                  {facebookUsername && facebookUsername.trim() !== "" && (
                    <Pressable
                      onPress={handleClearFacebook}
                      style={styles.clearButton}
                      hitSlop={moderateWidthScale(8)}
                    >
                      <CloseIcon color={theme.darkGreen} />
                    </Pressable>
                  )}
                </View>
              </View>
            </View>
          </>
        )}
      </ScrollView>

      {!loading && (
        <View style={styles.continueButtonContainer}>
          <Button
            title="Update"
            onPress={handleUpdate}
            disabled={isUpdating}
          />
        </View>
      )}
    </SafeAreaView>
  );
}

