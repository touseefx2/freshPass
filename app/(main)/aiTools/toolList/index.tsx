import React, { useMemo, useEffect } from "react";
import { ScrollView, View, Text, TouchableOpacity } from "react-native";
import { useTranslation } from "react-i18next";
import { useRouter } from "expo-router";
import { useAppDispatch, useAppSelector, useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import {
  moderateHeightScale,
  moderateWidthScale,
} from "@/src/theme/dimensions";
import { createStyles } from "./styles";
import StackHeader from "@/src/components/StackHeader";
import Button from "@/src/components/button";
import { LinearGradient } from "expo-linear-gradient";
import {
  GeneratePostIcon,
  GenerateCollageIcon,
  GenerateReelIcon,
  PersonScissorsIcon,
} from "@/assets/icons";
import { ApiService } from "@/src/services/api";
import { userEndpoints } from "@/src/services/endpoints";
import { setUserDetails } from "@/src/state/slices/userSlice";

export default function ToolList() {
  const router = useRouter();
  const { colors } = useTheme();
  const { t } = useTranslation();
  const user = useAppSelector((state) => state.user);
  const userRole = user?.userRole;
  const dispatch = useAppDispatch();

  const isGuest = user.isGuest;
  const isCustomer = userRole === "customer";

  const styles = useMemo(() => createStyles(colors as Theme), [colors]);

  // Business features (paramTitle is passed to tools screen and must match expected values)
  const businessFeatures = [
    {
      id: "generatePost",
      titleKey: "generatePost" as const,
      paramTitle: "Generate Post",
      icon: GeneratePostIcon,
    },
    {
      id: "generateCollage",
      titleKey: "generateCollage" as const,
      paramTitle: "Generate Collage",
      icon: GenerateCollageIcon,
    },
    {
      id: "generateReel",
      titleKey: "generateReel" as const,
      paramTitle: "Generate Reel",
      icon: GenerateReelIcon,
    },
  ];

  // Customer features
  const customerFeatures = [
    {
      id: "hairTryon",
      titleKey: "hairTryon" as const,
      paramTitle: "Hair Tryon",
      icon: PersonScissorsIcon,
    },
  ];

  // Select features based on user role
  // Business users see social media tools, customers/staff/others see Hair Tryon
  const features =
    userRole === "business" ? businessFeatures : customerFeatures;

  // Header title based on role (localized)
  const headerTitle =
    userRole === "business" ? t("socialMediaAiTool") : t("aiTool");

  useEffect(() => {
    fetchQuota();
  }, []);

  const fetchQuota = async () => {
    try {
      const response = await ApiService.get<{
        success: boolean;
        data?: { ai_quota?: number };
      }>(userEndpoints.details);
      if (response?.success && response.data?.ai_quota !== undefined) {
        dispatch(setUserDetails({ ai_quota: response.data.ai_quota }));
      }
    } catch {}
  };

  const handleFeaturePress = (paramTitle: string) => {
    router.push({
      pathname: "/(main)/aiTools/tools",
      params: { toolType: paramTitle },
    });
  };

  return (
    <View style={styles.safeArea}>
      <StackHeader title={t("aiTools")} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {!isGuest && (
          <View style={styles.actionButtonsRow}>
            {isCustomer && (
              <View style={styles.actionButtonFlex}>
                <Button
                  title={t("myPurchases")}
                  onPress={() => router.push("/aiTransactions")}
                />
              </View>
            )}
            <View style={styles.actionButtonFlex}>
              <Button
                title={t("aiRequests")}
                onPress={() => router.push("/aiRequests")}
              />
            </View>
          </View>
        )}

        <View style={styles.featuresContainer}>
          {features.map((feature, index) => {
            const IconComponent = feature.icon;
            return (
              <TouchableOpacity
                key={feature.id}
                style={styles.featureBox}
                onPress={() => handleFeaturePress(feature.paramTitle)}
                activeOpacity={0.7}
              >
                <LinearGradient
                  colors={[
                    (colors as Theme).buttonBack,
                    (colors as Theme).darkGreen,
                  ]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.gradientContainer}
                >
                  <View style={styles.iconContainer}>
                    <IconComponent
                      width={moderateWidthScale(32)}
                      height={moderateWidthScale(32)}
                      color={(colors as Theme).white}
                    />
                  </View>
                  <Text style={styles.featureTitle}>{t(feature.titleKey)}</Text>
                </LinearGradient>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}
