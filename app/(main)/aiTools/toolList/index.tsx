import React, { useMemo, useEffect, useState } from "react";
import {
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { useTranslation } from "react-i18next";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useAppDispatch, useAppSelector, useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { moderateWidthScale } from "@/src/theme/dimensions";
import { createStyles } from "./styles";
import StackHeader from "@/src/components/StackHeader";
import MediaLibraryMyReelsTab from "@/src/components/mediaLibraryMyReelsTab";
import { canManageReels } from "@/src/utils/reelUploadGate";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialIcons } from "@expo/vector-icons";
import { useVideoPlayer, VideoView } from "expo-video";
import {
  GeneratePostIcon,
  GenerateCollageIcon,
  GenerateReelIcon,
  PersonScissorsIcon,
} from "@/assets/icons";
import { ApiService } from "@/src/services/api";
import { userEndpoints } from "@/src/services/endpoints";
import { setUserDetails } from "@/src/state/slices/userSlice";
import {
  getTutorialVideoTryonUri,
} from "@/src/services/remoteConfigService";


interface TutorialInlineVideoProps {}

function TutorialInlineVideo({}: TutorialInlineVideoProps) {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();

  const [isVideoReady, setIsVideoReady] = useState(false);

  const player = useVideoPlayer(getTutorialVideoTryonUri(), (p) => {
    p.loop = false;
  });

  return (
    <View style={styles.tutorialVideoRoot}>
      <View style={StyleSheet.absoluteFill}>
        <VideoView
          player={player}
          style={styles.tutorialVideo}
          contentFit="cover"
          nativeControls={true}
          onFirstFrameRender={async () => {
            if (!isVideoReady) {
              await player.play();
              setTimeout(() => {
                setIsVideoReady(true);
              }, 200);
            }
          }}
        />
      </View>

      {!isVideoReady && (
        <View
          style={{
            ...StyleSheet.absoluteFillObject,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <ActivityIndicator size="small" color={theme.white} />
          <Text style={styles.tutorialTimeText}>{t("loading")}</Text>
        </View>
      )}
    </View>
  );
}

export default function ToolList() {
  const router = useRouter();
  const { colors } = useTheme();
  const { t } = useTranslation();
  const user = useAppSelector((state) => state.user);
  const userRole = user?.userRole;
  const dispatch = useAppDispatch();
  const params = useLocalSearchParams<{
    mode?: string;
    tab?: string;
    highlightReelId?: string;
  }>();

  const isCustomer = userRole === "customer";
  const isBusiness = userRole === "business";
  const isStaff = userRole === "staff";
  // Owner and staff both manage the business's reels (staff within their monthly number)
  const canManageBusinessReels = canManageReels(userRole);
  const showAiTools =
    !canManageBusinessReels || params.mode === "aiTools" || isCustomer;

  const [tutorialVideoActive, setTutorialVideoActive] = useState(false);

  const styles = useMemo(() => createStyles(colors as Theme), [colors]);
  const theme = colors as Theme;

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

  const customerFeatures = [
    {
      id: "tutorial",
      titleKey: "tutorial" as const,
      paramTitle: "",
      icon: ({
        width,
        height,
        color,
      }: {
        width: number;
        height: number;
        color: string;
      }) => (
        <MaterialIcons name="play-circle-filled" size={width} color={color} />
      ),
      openTutorial: true,
    },
    {
      id: "hairTryon",
      titleKey: "hairTryon" as const,
      paramTitle: "Hair Tryon",
      icon: PersonScissorsIcon,
      openTutorial: false,
    },
  ];

  const features = isBusiness ? businessFeatures : customerFeatures;

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

  const handleFeaturePress = (featureId: string, paramTitle: string) => {
    // AI Auto Reels (raw video + template) replace the old AI generate-reel endpoint
    if (featureId === "generateReel") {
      router.push("/(main)/reelTemplates" as any);
      return;
    }
    router.push({
      pathname: "/(main)/aiTools/tools",
      params: { toolType: paramTitle },
    });
  };

  const renderShortcutsAndFeatures = (includeCustomerPurchases: boolean) => (
    <>
      <View style={styles.actionButtonsRow}>
        {includeCustomerPurchases && isCustomer && (
          <View style={styles.actionButtonShadow}>
            <TouchableOpacity
              style={styles.actionButtonCard}
              onPress={() => router.push("/aiTransactions")}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={[
                  theme.darkGreenLight,
                  theme.buttonBack,
                  theme.darkGreen,
                ]}
                locations={[0, 0.45, 1]}
                start={{ x: 0.15, y: 0 }}
                end={{ x: 0.85, y: 1 }}
                style={styles.actionButtonGradient}
              >
                <LinearGradient
                  colors={[theme.white15, "transparent"]}
                  start={{ x: 0.5, y: 0 }}
                  end={{ x: 0.5, y: 1 }}
                  style={styles.cardHighlight}
                  pointerEvents="none"
                />
                <View style={styles.actionButtonIconWrap}>
                  <MaterialIcons
                    name="shopping-bag"
                    size={moderateWidthScale(20)}
                    color={theme.white}
                  />
                </View>
                <Text style={styles.actionButtonLabel} numberOfLines={1}>
                  {t("myPurchases")}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}
        <View style={styles.actionButtonShadow}>
          <TouchableOpacity
            style={styles.actionButtonCard}
            onPress={() => router.push("/aiRequests")}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={[
                theme.darkGreenLight,
                theme.buttonBack,
                theme.darkGreen,
              ]}
              locations={[0, 0.45, 1]}
              start={{ x: 0.15, y: 0 }}
              end={{ x: 0.85, y: 1 }}
              style={styles.actionButtonGradient}
            >
              <LinearGradient
                colors={[theme.white15, "transparent"]}
                start={{ x: 0.5, y: 0 }}
                end={{ x: 0.5, y: 1 }}
                style={styles.cardHighlight}
                pointerEvents="none"
              />
              <View style={styles.actionButtonIconWrap}>
                <MaterialIcons
                  name="list-alt"
                  size={moderateWidthScale(20)}
                  color={theme.white}
                />
              </View>
              <Text style={styles.actionButtonLabel} numberOfLines={1}>
                {t("aiRequests")}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
        <View style={styles.actionButtonShadow}>
          <TouchableOpacity
            style={styles.actionButtonCard}
            onPress={() => router.push("/aiMemories")}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={[
                theme.darkGreenLight,
                theme.buttonBack,
                theme.darkGreen,
              ]}
              locations={[0, 0.45, 1]}
              start={{ x: 0.15, y: 0 }}
              end={{ x: 0.85, y: 1 }}
              style={styles.actionButtonGradient}
            >
              <LinearGradient
                colors={[theme.white15, "transparent"]}
                start={{ x: 0.5, y: 0 }}
                end={{ x: 0.5, y: 1 }}
                style={styles.cardHighlight}
                pointerEvents="none"
              />
              <View style={styles.actionButtonIconWrap}>
                <MaterialIcons
                  name="psychology"
                  size={moderateWidthScale(20)}
                  color={theme.white}
                />
              </View>
              <Text style={styles.actionButtonLabel} numberOfLines={1}>
                {t("memories")}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.featuresContainer}>
        {features.map((feature) => {
          const IconComponent = feature.icon;
          const openTutorial =
            "openTutorial" in feature && feature.openTutorial;
          const isTutorial = feature.id === "tutorial";
          const useLargeBox =
            userRole !== "business" &&
            (feature.id === "tutorial" || feature.id === "hairTryon");
          const shadowStyle = useLargeBox
            ? styles.featureShadowLarge
            : styles.featureShadow;
          const boxStyle = useLargeBox
            ? styles.featureBoxLarge
            : styles.featureBox;

          if (isTutorial && tutorialVideoActive) {
            return (
              <View key={feature.id} style={shadowStyle}>
                <View style={boxStyle}>
                  <TutorialInlineVideo />
                </View>
              </View>
            );
          }

          return (
            <View key={feature.id} style={shadowStyle}>
              <TouchableOpacity
                style={boxStyle}
                onPress={() => {
                  if (openTutorial) {
                    setTutorialVideoActive(true);
                  } else {
                    handleFeaturePress(feature.id, feature.paramTitle);
                  }
                }}
                activeOpacity={0.82}
              >
                <LinearGradient
                  colors={[
                    theme.darkGreenLight,
                    theme.buttonBack,
                    theme.darkGreen,
                  ]}
                  locations={[0, 0.4, 1]}
                  start={{ x: 0.1, y: 0 }}
                  end={{ x: 0.9, y: 1 }}
                  style={styles.gradientContainer}
                >
                  <LinearGradient
                    colors={[theme.white15, "transparent"]}
                    start={{ x: 0.5, y: 0 }}
                    end={{ x: 0.5, y: 1 }}
                    style={styles.cardHighlight}
                    pointerEvents="none"
                  />
                  <View style={styles.iconContainer}>
                    <IconComponent
                      width={moderateWidthScale(30)}
                      height={moderateWidthScale(30)}
                      color={theme.white}
                    />
                  </View>
                  <Text style={styles.featureTitle}>
                    {t(feature.titleKey)}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          );
        })}
      </View>
    </>
  );

  const renderStaffAiTools = () => (
    <>
      <View style={styles.actionButtonsRow}>
        <View style={styles.actionButtonShadow}>
          <TouchableOpacity
            style={styles.actionButtonCard}
            onPress={() =>
              router.push({
                pathname: "/(main)/aiRequests",
                params: { tab: "reels" },
              } as any)
            }
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={[
                theme.darkGreenLight,
                theme.buttonBack,
                theme.darkGreen,
              ]}
              locations={[0, 0.45, 1]}
              start={{ x: 0.15, y: 0 }}
              end={{ x: 0.85, y: 1 }}
              style={styles.actionButtonGradient}
            >
              <LinearGradient
                colors={[theme.white15, "transparent"]}
                start={{ x: 0.5, y: 0 }}
                end={{ x: 0.5, y: 1 }}
                style={styles.cardHighlight}
                pointerEvents="none"
              />
              <View style={styles.actionButtonIconWrap}>
                <MaterialIcons
                  name="list-alt"
                  size={moderateWidthScale(20)}
                  color={theme.white}
                />
              </View>
              <Text style={styles.actionButtonLabel} numberOfLines={1}>
                {t("aiRequests")}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.featuresContainer}>
        {/* Monthly reel limit is checked on Reel Templates (before Make my reel) */}
        <View style={styles.featureShadow}>
          <TouchableOpacity
            style={styles.featureBox}
            onPress={() => handleFeaturePress("generateReel", "Generate Reel")}
            activeOpacity={0.82}
            accessibilityRole="button"
          >
            <LinearGradient
              colors={[
                theme.darkGreenLight,
                theme.buttonBack,
                theme.darkGreen,
              ]}
              locations={[0, 0.4, 1]}
              start={{ x: 0.1, y: 0 }}
              end={{ x: 0.9, y: 1 }}
              style={styles.gradientContainer}
            >
              <LinearGradient
                colors={[theme.white15, "transparent"]}
                start={{ x: 0.5, y: 0 }}
                end={{ x: 0.5, y: 1 }}
                style={styles.cardHighlight}
                pointerEvents="none"
              />
              <View style={styles.iconContainer}>
                <GenerateReelIcon
                  width={moderateWidthScale(30)}
                  height={moderateWidthScale(30)}
                  color={theme.white}
                />
              </View>
              <Text style={styles.featureTitle}>{t("generateReel")}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </>
  );

  const headerTitle = showAiTools ? t("aiTools") : t("mediaLibrary");

  return (
    <View style={styles.safeArea}>
      <StackHeader title={headerTitle} />

      {canManageBusinessReels && !showAiTools ? (
        <MediaLibraryMyReelsTab highlightReelId={params.highlightReelId} />
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {isStaff
            ? renderStaffAiTools()
            : renderShortcutsAndFeatures(isCustomer)}
        </ScrollView>
      )}
    </View>
  );
}
