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
import { validateDescription } from "@/src/services/validationService";
import Logger from "@/src/services/logger";
import { ApiService } from "@/src/services/api";
import { businessEndpoints } from "@/src/services/endpoints";
import { useNotificationContext } from "@/src/contexts/NotificationContext";
import { useRouter, useFocusEffect } from "expo-router";
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
      fontSize: fontSize.size28,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      marginBottom: moderateHeightScale(8),
    },
    subtitle: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontRegular,
      color: theme.darkGreen,
    },
    textInputContainer: {
      backgroundColor: theme.white,
      borderRadius: moderateWidthScale(12),
      borderWidth: 1,
      borderColor: theme.lightGreen2,
      paddingHorizontal: moderateWidthScale(16),
      paddingVertical: moderateHeightScale(16),
      minHeight: moderateHeightScale(200),
      marginBottom: moderateHeightScale(8),
      position: "relative",
    },
    textInput: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontRegular,
      color: theme.darkGreen,
      textAlignVertical: "top",
      minHeight: moderateHeightScale(200),
    },
    errorText: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.link,
      marginTop: moderateHeightScale(4),
      marginBottom: moderateHeightScale(4),
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
      width: "90%",
      borderRadius: moderateWidthScale(4),
    },
    skeletonTextInput: {
      height: moderateHeightScale(200),
      width: "100%",
      borderRadius: moderateWidthScale(12),
      marginBottom: moderateHeightScale(8),
    },
    clearButton: {
      position: "absolute",
      top: moderateHeightScale(12),
      right: moderateWidthScale(12),
      zIndex: 1,
    },
  });

interface DescriptionData {
  description: string | null;
}

export default function DescriptionScreen() {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);
  const router = useRouter();
  const { showBanner } = useNotificationContext();

  const [loading, setLoading] = useState(true);
  const [description, setDescription] = useState("");
  const [descriptionError, setDescriptionError] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  const fetchDescription = useCallback(async () => {
    setLoading(true);
    try {
      const response = await ApiService.get<{
        success: boolean;
        message: string;
        data: DescriptionData;
      }>(businessEndpoints.moduleData("description"));

      if (response.success && response.data) {
        setDescription(response.data.description || "");
      }
    } catch (error: any) {
      Logger.error("Failed to fetch description:", error);
    } finally {
      setLoading(false);
    }
  }, []);

   

  useEffect(()=>{
    fetchDescription();
  },[])

  // Validate description when it changes
  useEffect(() => {
    if (description.length > 0) {
      const validation = validateDescription(description);
      setDescriptionError(validation.error);
    } else {
      setDescriptionError(null);
    }
  }, [description]);

  const handleClearDescription = useCallback(() => {
    setDescription("");
    setDescriptionError(null);
  }, []);

  const handleContinue = async () => {
    // Validate only if description has content
    if (description.length > 0) {
      const validation = validateDescription(description);
      setDescriptionError(validation.error);

      if (!validation.isValid) {
        return;
      }
    } else {
      setDescriptionError(null);
    }

    Keyboard.dismiss();
    setIsUpdating(true);

    try {
      const formData = new FormData();
      formData.append("description", description.trim());

      const config = {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      };

      const response = await ApiService.post<{
        success: boolean;
        message: string;
        data?: any;
      }>(businessEndpoints.profile, formData, config);

      if (response.success) {
        showBanner(
          "Success",
          response.message || "Description updated successfully",
          "success",
          3000
        );

        router.back();
      } else {
        showBanner(
          "Error",
          response.message || "Failed to update description",
          "error",
          3000
        );
      }
    } catch (error: any) {
      Logger.error("Failed to update description:", error);
      showBanner(
        "Error",
        error.message || "Failed to update description. Please try again.",
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
      <View style={styles.skeletonTextInput} />
    </SkeletonPlaceholder>
  );

  return (
    <SafeAreaView edges={["bottom"]} style={styles.container}>
      <StackHeader title="Description" />
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
              <Text style={styles.title}>Describe about yourself</Text>
              <Text style={styles.subtitle}>
                Introduce yourself in your own words.
              </Text>
            </View>

            <View style={styles.textInputContainer}>
              <TextInput
                style={styles.textInput}
                value={description}
                onChangeText={setDescription}
                placeholder="If you have a ready-to-go description, you can paste it here."
                placeholderTextColor={theme.lightGreen2}
                multiline
                textAlignVertical="top"
                autoCapitalize="sentences"
                maxLength={1000}
              />
              {description.length > 0 && (
                <Pressable
                  onPress={handleClearDescription}
                  style={styles.clearButton}
                  hitSlop={moderateWidthScale(8)}
                >
                  <CloseIcon color={theme.darkGreen} />
                </Pressable>
              )}
            </View>
            {descriptionError && (
              <Text style={styles.errorText}>{descriptionError}</Text>
            )}
          </>
        )}
      </ScrollView>

      {!loading && (
        <View style={styles.continueButtonContainer}>
          <Button
            title="Update"
            onPress={handleContinue}
            disabled={isUpdating}
          />
        </View>
      )}
    </SafeAreaView>
  );
}

