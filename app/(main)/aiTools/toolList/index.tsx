import React, { useMemo, useState, useRef, useEffect } from "react";
import {
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  Animated,
} from "react-native";
import { useTranslation } from "react-i18next";
import { useRouter } from "expo-router";
import { useAppSelector, useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { moderateWidthScale } from "@/src/theme/dimensions";
import { createStyles } from "./styles";
import StackHeader from "@/src/components/StackHeader";
import { LinearGradient } from "expo-linear-gradient";
import {
  GeneratePostIcon,
  GenerateCollageIcon,
  GenerateReelIcon,
  PersonScissorsIcon,
} from "@/assets/icons";

export default function ToolList() {
  const router = useRouter();
  const { colors } = useTheme();
  const { t } = useTranslation();
  const user = useAppSelector((state) => state.user);
  const userRole = user?.userRole;

  const isGuest = user.isGuest;

  const styles = useMemo(() => createStyles(colors as Theme), [colors]);
  const [isExpanded, setIsExpanded] = useState(false);

  // Animation values
  const headerTranslateY = useRef(new Animated.Value(0)).current;
  const boxesTranslateY = useRef(new Animated.Value(300)).current;
  const boxesOpacity = useRef(new Animated.Value(0)).current;

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
    if (isExpanded) {
      // Animate header up
      Animated.spring(headerTranslateY, {
        toValue: -100,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }).start();

      // Animate boxes coming from below with stagger
      Animated.parallel([
        Animated.spring(boxesTranslateY, {
          toValue: 0,
          useNativeDriver: true,
          tension: 80,
          friction: 8,
          delay: 100,
        }),
        Animated.timing(boxesOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
          delay: 100,
        }),
      ]).start();
    } else {
      // Reset animations
      Animated.parallel([
        Animated.spring(headerTranslateY, {
          toValue: 0,
          useNativeDriver: true,
          tension: 100,
          friction: 8,
        }),
        Animated.timing(boxesTranslateY, {
          toValue: 300,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(boxesOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isExpanded]);

  const handleHeaderPress = () => {
    setIsExpanded(!isExpanded);
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

      {!isGuest && (
        <TouchableOpacity
          style={styles.seeRequestsHistoryButton}
          activeOpacity={0.7}
          onPress={() => router.push("/aiRequests")}
        >
          <Text style={styles.seeRequestsHistoryText}>{t("aiRequests")}</Text>
        </TouchableOpacity>
      )}

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View
          style={[
            styles.headerContainer,
            {
              transform: [{ translateY: headerTranslateY }],
            },
          ]}
        >
          <TouchableOpacity
            onPress={handleHeaderPress}
            activeOpacity={0.7}
            style={styles.headerButton}
          >
            <LinearGradient
              colors={[
                (colors as Theme).darkGreenLight,
                (colors as Theme).darkGreen,
              ]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.headerGradient}
            >
              <Text style={styles.headerTitle}>{headerTitle}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>

        <Animated.View
          style={[
            styles.featuresContainer,
            {
              transform: [{ translateY: boxesTranslateY }],
              opacity: boxesOpacity,
            },
          ]}
        >
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
        </Animated.View>
      </ScrollView>
    </View>
  );
}
